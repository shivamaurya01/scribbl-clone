const { pickWords, normalize, isClose } = require('./words');

const CHOOSE_TIME = 15; // seconds the drawer has to pick a word
const ROUND_END_PAUSE = 5000; // ms to show the answer before next turn

// Game = the rules: turns, timers, hints, scoring, drawing strokes.
// Room = who is here + messaging. Game talks to players through its Room.
class Game {
  constructor(room) {
    this.room = room;
    this.phase = 'lobby'; // lobby -> choosing -> drawing -> roundEnd -> ... -> gameOver
    this.round = 0;
    this.turnQueue = []; // player ids who still have to draw this round
    this.drawerId = null;
    this.word = null;
    this.wordOptions = [];
    this.revealed = new Set(); // letter positions shown as hints
    this.hintThresholds = [];
    this.strokes = []; // every stroke of the current drawing (for undo + late joiners)
    this.timeLeft = 0;
    this.timer = null;
    this.pause = null;
    this.used = new Set();
  }

  // ---------- flow ----------
  start() {
    this.room.players.forEach((p) => (p.score = 0));
    this.round = 0;
    this.used.clear();
    this.startRound();
  }

  startRound() {
    this.round++;
    this.turnQueue = this.room.connectedPlayers().map((p) => p.id);
    this.nextTurn();
  }

  nextTurn() {
    while (this.turnQueue.length) {
      const id = this.turnQueue.shift();
      const p = this.room.players.get(id);
      if (p && p.connected) return this.beginChoosing(p);
    }
    if (this.round >= this.room.settings.rounds) return this.end();
    this.startRound();
  }

  beginChoosing(drawer) {
    this.clearTimers();
    this.phase = 'choosing';
    this.drawerId = drawer.id;
    this.word = null;
    this.revealed = new Set();
    this.strokes = [];
    this.room.players.forEach((p) => (p.hasGuessed = false));
    this.wordOptions = pickWords(this.room.settings.wordCount, this.room.settings.customWords, this.used);

    this.room.emit('canvas_clear');
    this.room.emit('round_start', { drawerId: drawer.id, drawTime: this.room.settings.drawTime });
    this.room.emit('chat_message', { system: true, text: `${drawer.name} is choosing a word...` });
    this.room.sendState();
    // if the drawer sleeps, pick for them
    this.runTimer(CHOOSE_TIME, () => this.chooseWord(this.drawerId, this.wordOptions[0], true));
  }

  chooseWord(playerId, word, auto = false) {
    if (this.phase !== 'choosing' || playerId !== this.drawerId) return;
    if (!auto && !this.wordOptions.includes(word)) return;
    this.word = word;
    this.used.add(word);
    this.startDrawing();
  }

  startDrawing() {
    const { drawTime, hints, wordMode } = this.room.settings;
    this.phase = 'drawing';
    const n = wordMode === 'hidden' ? 0 : hints;
    // hint i appears when this many seconds are left
    this.hintThresholds = [];
    for (let i = 1; i <= n; i++) {
      this.hintThresholds.push(Math.round(drawTime - (drawTime * i) / (n + 1)));
    }
    this.room.sendState();
    this.runTimer(drawTime, () => this.endTurn('Time is up!'));
  }

  endTurn(reason) {
    if (this.phase !== 'drawing' && this.phase !== 'choosing') return;
    this.clearTimers();
    this.phase = 'roundEnd';
    this.room.emit('round_end', {
      word: this.word,
      reason,
      scores: this.room.scores(),
      nextDrawer: this.turnQueue[0] || null,
    });
    this.room.sendState();
    this.pause = setTimeout(() => this.nextTurn(), ROUND_END_PAUSE);
  }

  end() {
    this.clearTimers();
    this.phase = 'gameOver';
    const leaderboard = this.room.scores();
    this.room.emit('game_over', { winner: leaderboard[0] || null, leaderboard });
    this.room.sendState();
  }

  // ---------- timers ----------
  runTimer(seconds, onEnd) {
    this.clearTimers();
    this.timeLeft = seconds;
    this.room.emit('tick', { timeLeft: this.timeLeft });
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.room.emit('tick', { timeLeft: this.timeLeft });
      if (this.phase === 'drawing') this.revealHint();
      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.timer = null;
        onEnd();
      }
    }, 1000);
  }

  clearTimers() {
    clearInterval(this.timer);
    clearTimeout(this.pause);
    this.timer = null;
    this.pause = null;
  }

  destroy() {
    this.clearTimers();
  }

  // ---------- hints ----------
  revealHint() {
    if (!this.hintThresholds.length || this.timeLeft > this.hintThresholds[0]) return;
    this.hintThresholds.shift();
    const hidden = [];
    this.word.split('').forEach((c, i) => {
      if (c !== ' ' && !this.revealed.has(i)) hidden.push(i);
    });
    if (hidden.length <= 1) return; // never reveal the whole word
    this.revealed.add(hidden[Math.floor(Math.random() * hidden.length)]);
    this.room.sendState();
  }

  // "_ i _ _ a" style hint. null in hidden mode.
  hintText() {
    if (!this.word || this.room.settings.wordMode === 'hidden') return null;
    return this.word
      .split('')
      .map((c, i) => (c === ' ' ? '/' : this.revealed.has(i) ? c : '_'))
      .join(' ');
  }

  // ---------- guessing & chat ----------
  handleGuess(player, rawText) {
    const text = String(rawText || '').trim().slice(0, 100);
    if (!text) return;
    const msg = { playerId: player.id, playerName: player.name, text };

    // not drawing time -> plain chat for everyone
    if (this.phase !== 'drawing') return this.room.emit('chat_message', msg);

    // drawer and people who already guessed chat privately (so they can't leak the word)
    if (player.id === this.drawerId || player.hasGuessed) {
      this.room.players.forEach((p) => {
        if (p.connected && (p.hasGuessed || p.id === this.drawerId)) {
          this.room.io.to(p.id).emit('chat_message', { ...msg, secret: true });
        }
      });
      return;
    }

    const guess = normalize(text);
    const answer = normalize(this.word);

    if (guess === answer) {
      const points = Math.round(100 + (400 * this.timeLeft) / this.room.settings.drawTime);
      player.hasGuessed = true;
      player.score += points;
      const drawer = this.room.players.get(this.drawerId);
      if (drawer) drawer.score += 50;
      this.room.emit('guess_result', { correct: true, playerId: player.id, playerName: player.name, points });
      this.room.sendState();
      if (this.allGuessed()) this.endTurn('Everyone guessed it!');
      return;
    }

    if (isClose(guess, answer)) this.room.io.to(player.id).emit('close_guess');
    this.room.emit('chat_message', msg);
  }

  allGuessed() {
    const guessers = this.room.connectedPlayers().filter((p) => p.id !== this.drawerId);
    return guessers.length > 0 && guessers.every((p) => p.hasGuessed);
  }

  onPlayerLeft(id) {
    if (this.phase === 'lobby' || this.phase === 'gameOver') return;
    if (this.room.connectedPlayers().length < 2) return this.end();
    if ((this.phase === 'choosing' || this.phase === 'drawing') && id === this.drawerId) {
      return this.endTurn('The drawer left.');
    }
    if (this.phase === 'drawing' && this.allGuessed()) this.endTurn('Everyone guessed it!');
  }

  // ---------- drawing ----------
  canDraw(playerId) {
    return this.phase === 'drawing' && playerId === this.drawerId;
  }

  // Coordinates are sent as 0..1 fractions so every screen size draws the same picture.
  drawStart({ x, y, color, size }) {
    const ok = [x, y].every((n) => typeof n === 'number' && n >= 0 && n <= 1);
    if (!ok || !/^#[0-9a-f]{6}$/i.test(color) || !(size >= 1 && size <= 40)) return null;
    this.strokes.push({ color, size, points: [{ x, y }] });
    return { type: 'start', x, y, color, size };
  }

  drawMove({ x, y }) {
    const stroke = this.strokes[this.strokes.length - 1];
    const ok = [x, y].every((n) => typeof n === 'number' && n >= 0 && n <= 1);
    if (!stroke || !ok) return null;
    stroke.points.push({ x, y });
    return { type: 'move', x, y };
  }

  undo() {
    this.strokes.pop();
    this.room.emit('canvas_redraw', { strokes: this.strokes });
  }

  clearCanvas() {
    this.strokes = [];
    this.room.emit('canvas_clear');
  }
}

module.exports = Game;
