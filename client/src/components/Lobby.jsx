
import { useState } from 'react';
import { socket } from '../socket';
import './Lobby.css';

export default function Lobby({ game, onLeave }) {
  const me = socket.id;
  const isHost = game.hostId === me;

  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const link = `${location.origin}/?room=${game.roomId}`;
  const st = game.settings;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Unable to copy link. Please copy it manually.');
    }
  };

  const start = () => {
    setError('');
    socket.emit('start_game', {}, res => {
      setError(res?.error || '');
    });
  };

  const myself = game.players.find(p => p.id === me);

  return (
    <div className="lobby-page">

      {/* HEADER */}
      <header className="lobby-header">
        <div className="lobby-badge">
          🎨 MULTIPLAYER LOBBY
        </div>

        <h1>
          Game <span>Lobby</span>
        </h1>

        <p>
          Gather your friends, get ready, and let the
          drawing battle begin!
        </p>
      </header>

      <main className="lobby-container">

        {/* ROOM INFORMATION */}
        <section className="lobby-room-card">

          <div className="room-top">
            <div>
              <p className="room-label">YOUR ROOM CODE</p>

              <h2 className="room-code">
                {game.roomId}
              </h2>
            </div>

            <span className="room-type">
              {game.isPrivate ? '🔒 Private Room' : '🌍 Public Room'}
            </span>
          </div>

          <div className="invite-section">
            <div>
              <h3>🔗 Invite Your Friends</h3>
              <p>
                Share this link to invite players into your game.
              </p>
            </div>

            <div className="invite-box">
              <input
                value={link}
                readOnly
                aria-label="Room invitation link"
                onFocus={e => e.target.select()}
              />

              <button onClick={copy} className="copy-btn">
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

        </section>

        {/* MAIN CONTENT */}
        <div className="lobby-grid">

          {/* PLAYERS */}
          <section className="lobby-card">

            <div className="lobby-card-header">
              <div>
                <h2>👥 Players</h2>
                <p>Waiting for everyone to join</p>
              </div>

              <span className="player-count">
                {game.players.length}/{st.maxPlayers}
              </span>
            </div>

            <div className="player-list">

              {game.players.map((p, index) => (
                <div
                  key={p.id}
                  className={`lobby-player ${p.id === me ? 'my-player' : ''}`}
                >

                  <div className="player-avatar">
                    {['🎨', '😎', '🦊', '🐼', '👾', '🐸', '🐱', '🚀'][index % 8]}
                  </div>

                  <div className="player-info">
                    <div className="player-name">
                      {p.name}

                      {p.id === me && (
                        <span className="you-tag">YOU</span>
                      )}

                      {p.id === game.hostId && (
                        <span title="Room Host">👑</span>
                      )}
                    </div>

                    <span className={`player-status ${p.ready ? 'status-ready' : ''}`}>
                      {p.ready ? '● Ready to play' : '● Not ready'}
                    </span>
                  </div>

                  {isHost && p.id !== me && (
                    <button
                      className="kick-btn"
                      title="Remove player"
                      onClick={() =>
                        socket.emit('kick_player', {
                          playerId: p.id
                        })
                      }
                    >
                      Kick
                    </button>
                  )}

                </div>
              ))}

              {/* EMPTY PLAYER SLOTS */}
              {Array.from({
                length: Math.max(0, Math.min(st.maxPlayers - game.players.length, 3))
              }).map((_, i) => (
                <div className="empty-player" key={i}>
                  <div className="empty-avatar">+</div>
                  <span>Waiting for player...</span>
                </div>
              ))}

            </div>
          </section>

          {/* GAME SETTINGS */}
          <section className="lobby-card">

            <div className="lobby-card-header">
              <div>
                <h2>⚙️ Game Settings</h2>
                <p>Rules for this drawing battle</p>
              </div>
            </div>

            <div className="lobby-settings">

              <div className="setting-item">
                <span>🔄 Rounds</span>
                <strong>{st.rounds}</strong>
              </div>

              <div className="setting-item">
                <span>⏱️ Draw Time</span>
                <strong>{st.drawTime} sec</strong>
              </div>

              <div className="setting-item">
                <span>📝 Word Choices</span>
                <strong>{st.wordCount}</strong>
              </div>

              <div className="setting-item">
                <span>💡 Hints</span>
                <strong>{st.hints || 'Off'}</strong>
              </div>

              <div className="setting-item">
                <span>🎯 Word Mode</span>
                <strong>
                  {st.wordMode === 'normal' ? 'Normal' : 'Hidden'}
                </strong>
              </div>

              <div className="setting-item">
                <span>👥 Max Players</span>
                <strong>{st.maxPlayers}</strong>
              </div>

              <div className="setting-item">
                <span>🔐 Privacy</span>
                <strong>
                  {game.isPrivate ? 'Private' : 'Public'}
                </strong>
              </div>

            </div>

            <div className="lobby-tip">
              💡 <span>
                Tip: Guess words quickly to earn more points!
              </span>
            </div>

          </section>
        </div>

        {/* ACTIONS */}
        <section className="lobby-actions">

          <div className="lobby-actions-info">
            <span className="waiting-indicator">●</span>

            <div>
              <strong>
                {isHost ? 'You are the room host' : 'Waiting for host'}
              </strong>

              <p>
                {isHost
                  ? 'Start the game when everyone is ready!'
                  : 'The host will start the game shortly.'}
              </p>
            </div>
          </div>

          <div className="lobby-buttons">

            <button
              className={`ready-btn ${myself?.ready ? 'is-ready' : ''}`}
              onClick={() => socket.emit('toggle_ready')}
            >
              {myself?.ready ? '✓ Ready!' : '✓ I am Ready'}
            </button>

            {isHost && (
              <button
                className="start-btn"
                onClick={start}
              >
                ▶ Start Game
              </button>
            )}

            <button
              className="leave-btn"
              onClick={onLeave}
            >
              Leave Room
            </button>

          </div>

        </section>

        {error && (
          <div className="lobby-error">
            ⚠️ {error}
          </div>
        )}

      </main>

      <footer className="lobby-footer">
        🎨 Get ready to draw something amazing!
      </footer>

    </div>
  );
}


































// import { useState } from 'react';
// import { socket } from '../socket';

// export default function Lobby({ game, onLeave }) {
//   const me = socket.id;
//   const isHost = game.hostId === me;
//   const [error, setError] = useState('');
//   const [copied, setCopied] = useState(false);
//   const link = `${location.origin}/?room=${game.roomId}`;
//   const st = game.settings;

//   const copy = () => {
//     navigator.clipboard?.writeText(link);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 1500);
//   };
//   const start = () => socket.emit('start_game', {}, (res) => setError(res?.error || ''));
//   const myself = game.players.find((p) => p.id === me);

//   return (
//     <div className="home">
//       <h1>Lobby · {game.roomId}</h1>
//       <div className="card">
//         <p>Share this link: <b>{link}</b> <button className="small" onClick={copy}>{copied ? 'Copied!' : 'Copy'}</button></p>
//         <p className="muted">
//           {game.isPrivate ? 'Private room' : 'Public room'} · {st.rounds} rounds · {st.drawTime}s to draw · {st.wordCount} word choices ·
//           {st.hints ? ` ${st.hints} hints` : ' no hints'} · {st.wordMode} mode · max {st.maxPlayers} players
//         </p>
//       </div>

//       <div className="card">
//         <h3>Players ({game.players.length})</h3>
//         {game.players.map((p) => (
//           <div key={p.id} className="row spread">
//             <span>
//               {p.id === game.hostId ? '👑 ' : ''}{p.name}{p.id === me ? ' (you)' : ''} {p.ready ? '✅ ready' : ''}
//             </span>
//             {isHost && p.id !== me && <button className="small danger" onClick={() => socket.emit('kick_player', { playerId: p.id })}>Kick</button>}
//           </div>
//         ))}
//       </div>

//       <div className="row">
//         <button onClick={() => socket.emit('toggle_ready')}>{myself?.ready ? 'Not ready' : 'Ready'}</button>
//         {isHost && <button onClick={start}>Start game</button>}
//         <button className="danger" onClick={onLeave}>Leave</button>
//       </div>
//       {!isHost && <p className="muted">Waiting for the host to start...</p>}
//       {error && <p className="error">{error}</p>}
//     </div>
//   );
// }
