
import { useEffect, useState } from 'react';
import { socket } from '../socket';
import './Home.css';

export default function Home() {
  const [name, setName] = useState(localStorage.getItem('name') || '');
  const [code, setCode] = useState(new URLSearchParams(location.search).get('room') || '');
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState([]);
  const [isPrivate, setIsPrivate] = useState(false);

  const [s, setS] = useState({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hints: 2,
    wordMode: 'normal',
    customWords: ''
  });

  const loadRooms = () =>
    fetch('/api/rooms/public')
      .then(r => r.json())
      .then(setRooms)
      .catch(() => {});

  useEffect(() => {
    loadRooms();
  }, []);

  const needName = () => {
    if (!name.trim()) {
      setError('Please enter your player name first!');
      return true;
    }
    localStorage.setItem('name', name.trim());
    setError('');
    return false;
  };

  const done = res => setError(res?.error || '');

  const create = () => {
    if (needName()) return;

    const customWords = s.customWords
      .split(',')
      .map(w => w.trim())
      .filter(Boolean);

    socket.emit('create_room', {
      hostName: name,
      isPrivate,
      settings: { ...s, customWords }
    }, done);
  };

  const join = id => {
    if (needName()) return;
    socket.emit('join_room', {
      roomId: id,
      playerName: name
    }, done);
  };

  const set = k => e => setS({
    ...s,
    [k]: e.target.value
  });

  return (
    <div className="home-page">

      {/* HEADER */}
      <header className="home-header">
        <div className="brand-badge">✦ THE DRAWING GAME ✦</div>

        <h1 className="game-logo">
          🎨 SKRIBBL<span>.</span>
        </h1>

        <h2>Draw. Guess. Win.</h2>

        <p>
          Unleash your creativity, challenge your friends,
          and become the ultimate drawing champion!
        </p>
      </header>

      <main className="home-container">

        {/* PLAYER PROFILE */}
        <section className="profile-card">
          <div className="profile-avatar">👨‍🎨</div>

          <div className="profile-content">
            <h3>Ready to play?</h3>
            <p>Choose your player name to get started.</p>

            <input
              value={name}
              maxLength={16}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your player name..."
              className="name-input"
            />
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="home-grid">

          {/* JOIN ROOM */}
          <section className="game-card">
            <div className="card-icon">🚀</div>

            <h2>Join a Game</h2>
            <p className="card-description">
              Got a room code? Jump straight into the fun!
            </p>

            <div className="join-input-group">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER ROOM CODE"
              />

              <button
                className="primary-btn"
                onClick={() => join(code)}
              >
                Join Room →
              </button>
            </div>

            <div className="section-divider">
              <span>OR EXPLORE</span>
            </div>

            <div className="public-header">
              <div>
                <h3>🌍 Public Rooms</h3>
                <p>Find players around the world</p>
              </div>

              <button
                className="refresh-btn"
                onClick={loadRooms}
              >
                ↻ Refresh
              </button>
            </div>

            <div className="rooms-list">
              {rooms.length === 0 ? (
                <div className="empty-rooms">
                  <span>🎮</span>
                  <h4>No active rooms</h4>
                  <p>Be the first to create a game!</p>
                </div>
              ) : (
                rooms.map(r => (
                  <div key={r.id} className="room-item">
                    <div>
                      <strong>#{r.id}</strong>
                      <p>
                        👥 {r.players}/{r.maxPlayers} ·
                        {r.rounds} Rounds
                      </p>
                    </div>

                    <button
                      className="room-join-btn"
                      onClick={() => join(r.id)}
                    >
                      Join
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* CREATE ROOM */}
          <section className="game-card">
            <div className="card-icon">✨</div>

            <h2>Create a Game</h2>
            <p className="card-description">
              Set your own rules and invite your friends!
            </p>

            <div className="settings-grid">

              <label>
                Max Players
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={s.maxPlayers}
                  onChange={set('maxPlayers')}
                />
              </label>

              <label>
                Rounds
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={s.rounds}
                  onChange={set('rounds')}
                />
              </label>

              <label>
                Draw Time (sec)
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={s.drawTime}
                  onChange={set('drawTime')}
                />
              </label>

              <label>
                Word Choices
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={s.wordCount}
                  onChange={set('wordCount')}
                />
              </label>

              <label>
                Hints
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={s.hints}
                  onChange={set('hints')}
                />
              </label>

              <label>
                Word Mode
                <select
                  value={s.wordMode}
                  onChange={set('wordMode')}
                >
                  <option value="normal">Normal</option>
                  <option value="hidden">Hidden</option>
                </select>
              </label>

            </div>

            <div className="custom-words">
              <label>Custom Words (Optional)</label>
              <input
                value={s.customWords}
                onChange={set('customWords')}
                placeholder="rocket, samosa, cricket..."
              />
              <small>Separate words using commas.</small>
            </div>

            <label className="private-option">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
              />
              <div>
                <strong>🔒 Private Room</strong>
                <p>Only friends with an invite can join.</p>
              </div>
            </label>

            <button
              className="create-btn"
              onClick={create}
            >
              ✨ Create Game →
            </button>
          </section>
        </div>

        {error && (
          <div className="home-error">
            ⚠️ {error}
          </div>
        )}

      </main>

      <footer className="home-footer">
        Made for artists, guessers & everyone in between 🎨
      </footer>

    </div>
  );
}


































// import { useEffect, useState } from 'react';
// import { socket } from '../socket';

// export default function Home() {
//   const [name, setName] = useState(localStorage.getItem('name') || '');
//   const [code, setCode] = useState(new URLSearchParams(location.search).get('room') || '');
//   const [error, setError] = useState('');
//   const [rooms, setRooms] = useState([]);
//   const [isPrivate, setIsPrivate] = useState(false);
//   const [s, setS] = useState({ maxPlayers: 8, rounds: 3, drawTime: 80, wordCount: 3, hints: 2, wordMode: 'normal', customWords: '' });

//   const loadRooms = () =>
//     fetch('/api/rooms/public')
//       .then((r) => r.json())
//       .then(setRooms)
//       .catch(() => {});

//   useEffect(() => {
//     loadRooms();
//   }, []);

//   const needName = () => {
//     if (!name.trim()) {
//       setError('Enter your name first');
//       return true;
//     }
//     localStorage.setItem('name', name.trim());
//     return false;
//   };
//   const done = (res) => setError(res?.error || '');

//   const create = () => {
//     if (needName()) return;
//     const customWords = s.customWords.split(',').map((w) => w.trim()).filter(Boolean);
//     socket.emit('create_room', { hostName: name, isPrivate, settings: { ...s, customWords } }, done);
//   };
//   const join = (id) => {
//     if (needName()) return;
//     socket.emit('join_room', { roomId: id, playerName: name }, done);
//   };
//   const set = (k) => (e) => setS({ ...s, [k]: e.target.value });

//   return (
//     <div className="home">
//       <h1>🎨 Skribbl Clone</h1>
//       <div className="card">
//         <label>Your name</label>
//         <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="e.g. Shiva" />
//       </div>

//       <div className="card">
//         <h3>Join a room</h3>
//         <div className="row">
//           <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Room code" />
//           <button onClick={() => join(code)}>Join</button>
//         </div>
//         <div className="row spread">
//           <h4>Public rooms</h4>
//           <button className="small" onClick={loadRooms}>Refresh</button>
//         </div>
//         {rooms.length === 0 && <p className="muted">No public rooms right now. Create one!</p>}
//         {rooms.map((r) => (
//           <div key={r.id} className="row spread">
//             <span>{r.id} · {r.players}/{r.maxPlayers} players · {r.rounds} rounds</span>
//             <button className="small" onClick={() => join(r.id)}>Join</button>
//           </div>
//         ))}
//       </div>

//       <div className="card">
//         <h3>Create a room</h3>
//         <div className="grid">
//           <label>Max players (2–20)<input type="number" min="2" max="20" value={s.maxPlayers} onChange={set('maxPlayers')} /></label>
//           <label>Rounds (2–10)<input type="number" min="2" max="10" value={s.rounds} onChange={set('rounds')} /></label>
//           <label>Draw time (15–240s)<input type="number" min="15" max="240" value={s.drawTime} onChange={set('drawTime')} /></label>
//           <label>Words to choose (1–5)<input type="number" min="1" max="5" value={s.wordCount} onChange={set('wordCount')} /></label>
//           <label>Hints (0–5, 0 = off)<input type="number" min="0" max="5" value={s.hints} onChange={set('hints')} /></label>
//           <label>Word mode
//             <select value={s.wordMode} onChange={set('wordMode')}>
//               <option value="normal">Normal (blanks shown)</option>
//               <option value="hidden">Hidden (no blanks)</option>
//             </select>
//           </label>
//         </div>
//         <label>Custom words (comma separated, optional)
//           <input value={s.customWords} onChange={set('customWords')} placeholder="rocket, samosa, cricket" />
//         </label>
//         <label className="check"><input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private room (invite link only)</label>
//         <button onClick={create}>Create room</button>
//       </div>
//       {error && <p className="error">{error}</p>}
//     </div>
//   );
// }
