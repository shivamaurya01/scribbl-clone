
import { useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import DrawingCanvas from "./DrawingCanvas.jsx";
import "./GameScreen.css";

export default function GameScreen({
  game,
  timeLeft,
  messages,
  onLeave,
}) {
  const me = socket.id;
  const [text, setText] = useState("");
  const chatEnd = useRef(null);

  const isDrawer = game.drawerId === me;
  const isHost = game.hostId === me;

  const drawer = game.players.find(
    (p) => p.id === game.drawerId
  );

  const sorted = [...game.players].sort(
    (a, b) => b.score - a.score
  );

  const choosing = game.phase === "choosing";
  const drawing = game.phase === "drawing";
  const roundEnd = game.phase === "roundEnd";
  const gameOver = game.phase === "gameOver";

  useEffect(() => {
    chatEnd.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  const send = (e) => {
    e.preventDefault();

    if (!text.trim()) return;

    socket.emit("guess", { text: text.trim() });
    setText("");
  };

  let banner = "";

  if (choosing) {
    banner = isDrawer
      ? "Choose your word!"
      : `${drawer?.name || "Player"} is choosing...`;
  } else if (drawing) {
    banner = isDrawer
      ? `Draw: ${game.word}`
      : game.hint || "Guess the word!";
  } else {
    banner = game.word || "Get ready!";
  }

  return (
    <div className="game-screen">

      {/* HEADER */}
      <header className="gs-header">

        <div className="gs-header-content">

          <div className="gs-brand">
            <span className="gs-badge">
              MULTIPLAYER DRAWING GAME
            </span>

            <h1>
              Draw<span> & </span>Guess
            </h1>

            <p>
              Draw together. Guess faster. Win together.
            </p>
          </div>

          <button
            className="gs-leave-btn"
            onClick={onLeave}
          >
            ← Leave Game
          </button>

        </div>

      </header>

      <main className="gs-container">

        {/* GAME STATUS */}
        <div className="gs-status-bar">

          <div className="gs-status-item">
            <small>CURRENT ROUND</small>
            <strong>
              {Math.min(game.round, game.settings.rounds)}
              <span> / {game.settings.rounds}</span>
            </strong>
          </div>

          <div className="gs-word-box">
            <small>
              {isDrawer ? "YOUR WORD" : "WORD TO GUESS"}
            </small>

            <strong>{banner}</strong>
          </div>

          <div className={`gs-timer ${timeLeft <= 10 ? "urgent" : ""}`}>
            <small>TIME LEFT</small>
            <strong>
              ⏱ {Math.max(timeLeft, 0)}s
            </strong>
          </div>

        </div>

        {/* MAIN GAME GRID */}
        <div className="gs-layout">

          {/* LEADERBOARD */}
          <aside className="gs-panel gs-players">

            <div className="gs-panel-header">
              <div>
                <h2>🏆 Leaderboard</h2>
                <p>Live player rankings</p>
              </div>

              <span className="gs-count">
                {game.players.length}
              </span>
            </div>

            <div className="gs-player-list">

              {sorted.map((p, i) => (
                <div
                  key={p.id}
                  className={`gs-player ${
                    p.id === me ? "gs-me" : ""
                  } ${!p.connected ? "gs-offline" : ""}`}
                >

                  <div className="gs-rank">
                    {i === 0 ? "🥇" :
                     i === 1 ? "🥈" :
                     i === 2 ? "🥉" : `#${i + 1}`}
                  </div>

                  <div className="gs-avatar">
                    {p.name?.charAt(0).toUpperCase()}
                  </div>

                  <div className="gs-player-info">

                    <div className="gs-player-name">
                      {p.name}

                      {p.id === me && (
                        <span className="gs-you">YOU</span>
                      )}
                    </div>

                    <small className={
                      p.hasGuessed ? "gs-success" : ""
                    }>
                      {!p.connected
                        ? "Disconnected"
                        : p.id === game.drawerId
                        ? "✏️ Drawing"
                        : p.hasGuessed
                        ? "✓ Guessed correctly"
                        : "Playing"}
                    </small>

                  </div>

                  <strong className="gs-score">
                    {p.score}
                  </strong>

                </div>
              ))}

            </div>

            <div className="gs-panel-footer">
              <span className="gs-online-dot" />
              {game.players.filter(p => p.connected).length}
              {" "}Players Online
            </div>

          </aside>

          {/* DRAWING SECTION */}
          <section className="gs-panel gs-drawing">

            <div className="gs-panel-header">

              <div>
                <h2>🎨 Drawing Board</h2>
                <p>
                  {drawing
                    ? isDrawer
                      ? "It's your turn! Draw the word."
                      : `${drawer?.name || "Player"} is drawing`
                    : choosing
                    ? "Getting ready for the next turn"
                    : "Game in progress"}
                </p>
              </div>

              <span className="gs-role">
                {isDrawer ? "✏️ ARTIST" : "👀 GUESSER"}
              </span>

            </div>

            <div className="gs-canvas-area">

              <DrawingCanvas
                canDraw={drawing && isDrawer}
              />

              {/* WORD CHOOSING */}
              {choosing && (
                <div className="gs-overlay">
                  <div className="gs-overlay-card">

                    {isDrawer ? (
                      <>
                        <div className="gs-overlay-icon">🎯</div>

                        <h2>Choose a Word</h2>

                        <p>
                          Select a word you want to draw.
                        </p>

                        <div className="gs-word-options">
                          {game.wordOptions?.map((w) => (
                            <button
                              key={w}
                              onClick={() =>
                                socket.emit("word_chosen", {
                                  word: w,
                                })
                              }
                            >
                              {w}
                            </button>
                          ))}
                        </div>

                        <small>
                          ⏱ {Math.max(timeLeft, 0)} seconds remaining
                        </small>
                      </>
                    ) : (
                      <>
                        <div className="gs-overlay-icon">🎨</div>

                        <h2>Get Ready!</h2>

                        <p>
                          {drawer?.name || "The artist"} is choosing
                          a word...
                        </p>

                        <div className="gs-loading">
                          <span />
                          <span />
                          <span />
                        </div>
                      </>
                    )}

                  </div>
                </div>
              )}

              {/* ROUND RESULTS */}
              {roundEnd && (
                <div className="gs-overlay">
                  <div className="gs-overlay-card">

                    <div className="gs-overlay-icon">🎉</div>

                    <h2>Round Complete!</h2>

                    <p>The correct word was</p>

                    <div className="gs-revealed-word">
                      {game.word || "Turn over"}
                    </div>

                    <div className="gs-results">
                      {sorted.map((p, i) => (
                        <div key={p.id}>
                          <span>#{i + 1} {p.name}</span>
                          <strong>{p.score} pts</strong>
                        </div>
                      ))}
                    </div>

                    <p>Next round starting soon...</p>

                  </div>
                </div>
              )}

              {/* GAME OVER */}
              {gameOver && (
                <div className="gs-overlay">
                  <div className="gs-overlay-card">

                    <div className="gs-overlay-icon">🏆</div>

                    <h2>Game Over!</h2>

                    <p>Congratulations to our winner</p>

                    <h1 className="gs-winner">
                      {sorted[0]?.name || "No winner"}
                    </h1>

                    <div className="gs-results">
                      {sorted.map((p, i) => (
                        <div key={p.id}>
                          <span>
                            {i === 0 ? "🥇" :
                             i === 1 ? "🥈" :
                             i === 2 ? "🥉" : `#${i + 1}`}
                            {" "}{p.name}
                          </span>

                          <strong>{p.score} pts</strong>
                        </div>
                      ))}
                    </div>

                    <div className="gs-result-actions">

                      {isHost && (
                        <button
                          className="gs-primary-btn"
                          onClick={() =>
                            socket.emit("back_to_lobby")
                          }
                        >
                          Play Again →
                        </button>
                      )}

                      <button
                        className="gs-leave-btn"
                        onClick={onLeave}
                      >
                        Leave Game
                      </button>

                    </div>

                    {!isHost && (
                      <p>
                        Waiting for host to play again...
                      </p>
                    )}

                  </div>
                </div>
              )}

            </div>

            <div className="gs-canvas-footer">
              <span>
                {isDrawer
                  ? "✏️ Draw creatively, but don't write the answer!"
                  : "💡 Look carefully and guess the drawing!"}
              </span>
            </div>

          </section>

          {/* CHAT */}
          <aside className="gs-panel gs-chat">

            <div className="gs-panel-header">

              <div>
                <h2>💬 Game Chat</h2>
                <p>Chat and guess with friends</p>
              </div>

              <span className="gs-live">
                ● LIVE
              </span>

            </div>

            <div className="gs-messages">

              {messages.length === 0 && (
                <div className="gs-empty-chat">
                  <span>💬</span>
                  <h3>No messages yet</h3>
                  <p>Start guessing to join the fun!</p>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`gs-message ${
                    m.system ? "gs-system" : ""
                  } ${m.kind || ""} ${
                    m.secret ? "gs-secret" : ""
                  }`}
                >

                  {m.system ? (
                    <span>{m.text}</span>
                  ) : (
                    <>
                      <strong>{m.playerName}</strong>
                      <span>{m.text}</span>
                    </>
                  )}

                </div>
              ))}

              <div ref={chatEnd} />

            </div>

            <form
              className="gs-chat-form"
              onSubmit={send}
            >

              <div className="gs-input-group">

                <input
                  value={text}
                  onChange={(e) =>
                    setText(e.target.value)
                  }
                  placeholder={
                    isDrawer
                      ? "Chat with players..."
                      : "Type your guess..."
                  }
                  maxLength={100}
                  aria-label="Message or guess"
                />

                <button
                  type="submit"
                  disabled={!text.trim()}
                  aria-label="Send message"
                >
                  ➤
                </button>

              </div>

              <small>
                {isDrawer
                  ? "Don't reveal the word!"
                  : "Press Enter to send your guess"}
              </small>

            </form>

          </aside>

        </div>

        <footer className="gs-footer">
          Made for fun • Draw together • Guess together 🎨
        </footer>

      </main>

    </div>
  );
}
