const express = require('express');
const http = require('http');
const cors = require('cors');
// const path = require('path');
const { Server } = require('socket.io');
const Room = require('./Room');


const app = express();

// Enable CORS for frontend API requests
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const rooms = new Map(); // roomId -> Room

const makeCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
};
const cleanName = (n) => String(n || '').trim().slice(0, 16) || 'Player';

// ---------- plain HTTP ----------
app.get('/health', (req, res) => res.send('ok'));

app.get('/api/rooms/public', (req, res) => {
  const list = [...rooms.values()]
    .filter((r) => !r.isPrivate && r.game.phase === 'lobby' && r.connectedPlayers().length < r.settings.maxPlayers)
    .map((r) => ({ id: r.id, players: r.connectedPlayers().length, maxPlayers: r.settings.maxPlayers, rounds: r.settings.rounds }));
  res.json(list);
});

// serve the built React app (production)
// const dist = path.join(__dirname, '..', 'client', 'dist');
// app.use(express.static(dist));
// app.use((req, res) => res.sendFile(path.join(dist, 'index.html')));
app.get('/', (req, res) => {
  res.send('Skribbl Clone Backend is Running!');
});
// ---------- WebSockets ----------
io.on('connection', (socket) => {
  const getRoom = () => rooms.get(socket.data.roomId);

  const leave = () => {
    const room = getRoom();
    if (room) {
      socket.leave(room.id);
      room.removePlayer(socket.id);
    }
    socket.data.roomId = null;
  };

  socket.on('create_room', ({ hostName, settings, isPrivate } = {}, cb = () => {}) => {
    const id = makeCode();
    const room = new Room(io, id, settings, isPrivate, (rid) => rooms.delete(rid));
    rooms.set(id, room);
    socket.data.roomId = id;
    const err = room.addPlayer(socket, cleanName(hostName));
    if (err) return cb({ error: err });
    cb({ ok: true, roomId: id });
  });

  socket.on('join_room', ({ roomId, playerName } = {}, cb = () => {}) => {
    const room = rooms.get(String(roomId || '').trim().toUpperCase());
    if (!room) return cb({ error: 'Room not found' });
    if (socket.data.roomId) leave();
    socket.data.roomId = room.id;
    const err = room.addPlayer(socket, cleanName(playerName));
    if (err) {
      socket.data.roomId = null;
      return cb({ error: err });
    }
    cb({ ok: true, roomId: room.id });
  });

  socket.on('leave_room', leave);
  socket.on('disconnect', leave);

  socket.on('toggle_ready', () => {
    const room = getRoom();
    const p = room && room.players.get(socket.id);
    if (!p || room.game.phase !== 'lobby') return;
    p.ready = !p.ready;
    room.sendState();
  });

  socket.on('start_game', (_, cb = () => {}) => {
    const room = getRoom();
    if (!room) return;
    const err = room.startGame(socket.id);
    cb(err ? { error: err } : { ok: true });
  });

  socket.on('back_to_lobby', () => getRoom()?.backToLobby(socket.id));

  socket.on('kick_player', ({ playerId } = {}) => {
    const room = getRoom();
    if (!room || room.hostId !== socket.id || playerId === socket.id) return;
    const target = io.sockets.sockets.get(playerId);
    if (!target || target.data.roomId !== room.id) return;
    target.emit('kicked');
    target.leave(room.id);
    target.data.roomId = null;
    room.removePlayer(playerId);
  });

  socket.on('word_chosen', ({ word } = {}) => getRoom()?.game.chooseWord(socket.id, word));

  // drawing: validate on the server, store the stroke, forward to everyone else
  socket.on('draw_start', (data = {}) => {
    const room = getRoom();
    if (!room || !room.game.canDraw(socket.id)) return;
    const out = room.game.drawStart(data);
    if (out) socket.to(room.id).emit('draw_data', out);
  });
  socket.on('draw_move', (data = {}) => {
    const room = getRoom();
    if (!room || !room.game.canDraw(socket.id)) return;
    const out = room.game.drawMove(data);
    if (out) socket.to(room.id).emit('draw_data', out);
  });
  socket.on('draw_end', () => {
    const room = getRoom();
    if (room && room.game.canDraw(socket.id)) socket.to(room.id).emit('draw_data', { type: 'end' });
  });
  socket.on('draw_undo', () => {
    const room = getRoom();
    if (room && room.game.canDraw(socket.id)) room.game.undo();
  });
  socket.on('canvas_clear', () => {
    const room = getRoom();
    if (room && room.game.canDraw(socket.id)) room.game.clearCanvas();
  });

  // one input box: server decides if it's a guess or just chat
  socket.on('guess', ({ text } = {}) => {
    const room = getRoom();
    const player = room && room.players.get(socket.id);
    if (player) room.game.handleGuess(player, text);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

