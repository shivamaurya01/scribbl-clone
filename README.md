# 🎨 Skribbl Clone

Multiplayer drawing & guessing game. React + Vite (client), Node + Express + Socket.IO (server).

**Live URL:** _add your deployed URL here (e.g. https://your-skribbl-clone.onrender.com)_

## Run locally

```bash
npm run install:all      # installs server + client packages
npm run dev:server       # terminal 1 -> http://localhost:3001
npm run dev:client       # terminal 2 -> http://localhost:5173
```
Open http://localhost:5173 in two browser windows (one normal, one incognito) to test with 2 players.

## Deploy on Render (one service, WebSockets work)

1. Push this folder to GitHub.
2. Render → New → **Web Service** → pick the repo.
3. Build command: `npm run build`   Start command: `npm start`
4. Deploy, then paste the URL above. (Free tier sleeps when idle, so first load can take ~30s.)

The Node server serves the built React app **and** the WebSocket, so there is nothing else to configure.
Vercel/Netlify can't host a long-running WebSocket server, which is why we use Render.

## Architecture

```
Browser (React)  <--- Socket.IO (WebSocket) --->  Node server
  Home / Lobby / GameScreen                        index.js  -> routes socket events
  DrawingCanvas (HTML5 canvas)                     Room.js   -> players, host, settings, broadcasting
                                                   Game.js   -> turns, timer, hints, scoring, strokes
                                                   Player.js -> one player's data
                                                   words.js  -> word list + matching helpers
```

* **Server is the source of truth.** Clients only send *intentions* (draw, guess, choose word). The server checks
  who is allowed to do what, updates the state, then broadcasts it.
* **Game state:** after every change the server sends each player a `game_state` (the drawer's copy contains the word, others get only hints).
  A `tick` event is sent every second for the countdown.
* **Drawing:** pointer events -> normalized points (0..1) -> `draw_start/draw_move/draw_end` -> server stores the stroke
  and forwards `draw_data` to everyone else -> their canvas paints the new line segment.
  The server keeps all strokes so **undo** (`canvas_redraw`) and **late joiners** work.
* **Word matching:** `trim + lowercase + collapse spaces`, exact comparison. A guess 1 letter away gets a private "close!" message.
* **Scoring:** guesser gets `100 + 400 × timeLeft/drawTime`; drawer gets 50 per correct guesser.

## Socket events

| Event | Direction | Payload |
|---|---|---|
| create_room / join_room | client → server | `{hostName, settings, isPrivate}` / `{roomId, playerName}` |
| toggle_ready, start_game, back_to_lobby, kick_player | client → server | |
| word_chosen | client → server | `{word}` |
| draw_start / draw_move / draw_end | client → server | `{x,y,color,size}` / `{x,y}` / `{}` |
| draw_undo, canvas_clear | client → server | `{}` |
| guess | client → server | `{text}` (wrong guesses become chat) |
| game_state | server → client | phase, round, drawerId, word, hint, players... |
| round_start, round_end, game_over, tick | server → clients | |
| draw_data, canvas_clear, canvas_redraw | server → clients | stroke data |
| guess_result, chat_message, close_guess | server → client(s) | |

## Known limitations
* If a player refreshes the page they get a new socket id, so they re-join as a new player.
* No rate limiting on events (fine for a demo).
* "Combination" word mode and spectator/replay are not implemented.
