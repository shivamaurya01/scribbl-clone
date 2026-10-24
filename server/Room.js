const Game = require('./Game');
const Player = require('./Player');

const clamp = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
};

class Room {
  constructor(io, id, settings, isPrivate, onEmpty) {
    this.io = io;
    this.id = id;
    this.settings = Room.cleanSettings(settings);
    this.isPrivate = !!isPrivate;
    this.onEmpty = onEmpty;
    this.players = new Map(); // socketId -> Player
    this.hostId = null;
    this.game = new Game(this);
  }

  // Never trust the client: clamp every setting to the allowed range.
  static cleanSettings(s = {}) {
    const custom = Array.isArray(s.customWords) ? s.customWords : [];
    return {
      maxPlayers: clamp(s.maxPlayers, 2, 20, 8),
      rounds: clamp(s.rounds, 2, 10, 3),
      drawTime: clamp(s.drawTime, 15, 240, 80),
      wordCount: clamp(s.wordCount, 1, 5, 3),
      hints: clamp(s.hints, 0, 5, 2), // 0 = hints disabled
      wordMode: s.wordMode === 'hidden' ? 'hidden' : 'normal',
      customWords: custom
        .map((w) => String(w).trim().toLowerCase().slice(0, 30))
        .filter(Boolean)
        .slice(0, 100),
    };
  }

  connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  scores() {
    return [...this.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));
  }

  emit(event, payload) {
    this.io.to(this.id).emit(event, payload);
  }

  addPlayer(socket, name) {
    if (this.connectedPlayers().length >= this.settings.maxPlayers) return 'Room is full';
    const player = new Player(socket.id, name);
    this.players.set(socket.id, player);
    if (!this.hostId) this.hostId = socket.id;
    socket.join(this.id);
    this.emit('chat_message', { system: true, text: `${name} joined` });
    this.sendState();
    // late joiners need the picture drawn so far
    socket.emit('canvas_redraw', { strokes: this.game.strokes });
    return null;
  }

  removePlayer(socketId) {
    const p = this.players.get(socketId);
    if (!p) return;
    const running = ['choosing', 'drawing', 'roundEnd'].includes(this.game.phase);
    if (running) p.connected = false; // keep their score for the leaderboard
    else this.players.delete(socketId);

    if (this.connectedPlayers().length === 0) {
      this.game.destroy();
      this.onEmpty(this.id);
      return;
    }
    if (this.hostId === socketId) this.hostId = this.connectedPlayers()[0].id;
    this.emit('chat_message', { system: true, text: `${p.name} left` });
    this.game.onPlayerLeft(socketId);
    this.sendState();
  }

  startGame(socketId) {
    if (socketId !== this.hostId) return 'Only the host can start';
    if (this.game.phase !== 'lobby') return 'Game already started';
    if (this.connectedPlayers().length < 2) return 'Need at least 2 players';
    this.game.start();
    return null;
  }

  backToLobby(socketId) {
    if (socketId !== this.hostId || this.game.phase !== 'gameOver') return;
    this.game.destroy();
    this.game = new Game(this);
    for (const [id, p] of this.players) {
      if (!p.connected) this.players.delete(id);
      else {
        p.score = 0;
        p.ready = false;
        p.hasGuessed = false;
      }
    }
    this.emit('canvas_clear');
    this.sendState();
  }

  // Each player gets their own version of the state (only the drawer sees the word).
  stateFor(player) {
    const g = this.game;
    const isDrawer = player.id === g.drawerId;
    const reveal = g.phase === 'roundEnd' || g.phase === 'gameOver';
    return {
      roomId: this.id,
      isPrivate: this.isPrivate,
      settings: this.settings,
      hostId: this.hostId,
      phase: g.phase,
      round: g.round,
      drawerId: g.drawerId,
      timeLeft: g.timeLeft,
      players: [...this.players.values()].map((p) => p.toJSON()),
      word: isDrawer || reveal ? g.word : null,
      hint: g.hintText(),
      wordOptions: isDrawer && g.phase === 'choosing' ? g.wordOptions : null,
    };
  }

  sendState() {
    for (const p of this.connectedPlayers()) {
      this.io.to(p.id).emit('game_state', this.stateFor(p));
    }
  }
}

module.exports = Room;
