import { useEffect, useState } from 'react';
import { socket } from './socket';
import Home from './components/Home.jsx';
import Lobby from './components/Lobby.jsx';
import GameScreen from './components/GameScreen.jsx';

export default function App() {
  const [game, setGame] = useState(null); // latest game_state from the server
  const [messages, setMessages] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const add = (m) => setMessages((prev) => [...prev.slice(-199), m]);
    const handlers = {
      game_state: (s) => {
        setGame(s);
        setTimeLeft(s.timeLeft);
      },
      tick: ({ timeLeft }) => setTimeLeft(timeLeft),
      chat_message: add,
      guess_result: (r) => r.correct && add({ system: true, kind: 'good', text: `${r.playerName} guessed the word! (+${r.points})` }),
      close_guess: () => add({ system: true, kind: 'warn', text: 'Your guess is very close!' }),
      round_end: (r) => add({ system: true, text: r.word ? `${r.reason} The word was "${r.word}"` : r.reason }),
      kicked: () => {
        setGame(null);
        setMessages([]);
        alert('You were kicked by the host');
      },
      disconnect: () => setGame(null),
    };
    Object.entries(handlers).forEach(([e, h]) => socket.on(e, h));
    return () => Object.entries(handlers).forEach(([e, h]) => socket.off(e, h));
  }, []);

  const leave = () => {
    socket.emit('leave_room');
    setGame(null);
    setMessages([]);
  };

  if (!game) return <Home />;
  if (game.phase === 'lobby') return <Lobby game={game} onLeave={leave} />;
  return <GameScreen game={game} timeLeft={timeLeft} messages={messages} onLeave={leave} />;
}
