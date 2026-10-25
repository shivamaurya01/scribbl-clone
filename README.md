# 🎨 Skribbl Clone

### Real-Time Multiplayer Drawing & Guessing Game

A full-stack multiplayer drawing and guessing game inspired by Skribbl.io, developed as part of the **Web3Task Full Stack Intern – Round 2 Technical Assignment**.

The application allows multiple players to join rooms, draw on a shared canvas, guess words in real time, earn points and compete on a live leaderboard.

Built using React.js, Node.js, Express.js, Socket.IO and HTML5 Canvas.

### 🌐 Live Application

**[Play Skribbl Clone](https://scribbl-clone-ashen.vercel.app/)**

The application is deployed using:
- Frontend: Vercel
- Backend: Render
- Real-time Communication: Socket.IO (WebSockets)

---

## ✨ Features

### 1. Multiplayer Rooms
- Create public or private rooms.
- Join existing rooms using a room code or invitation link.
- Real-time player list.
- Host-controlled game settings.
- Player ready/unready functionality.
- Host can start the game and manage players.

### 2. Real-Time Drawing
- Interactive drawing canvas using HTML5 Canvas API.
- Real-time stroke synchronization using Socket.IO.
- Multiple brush colors and sizes.
- Eraser functionality.
- Undo last stroke.
- Clear entire canvas.
- Drawing permissions restricted to the current drawer.

### 3. Game Mechanics
- Turn-based drawing system.
- Randomized word selection.
- Configurable rounds and drawing time.
- Word hints during gameplay.
- Automatic turn rotation.
- Round countdown timer.
- Game-over screen with final leaderboard.

### 4. Guessing and Scoring
- Real-time guessing through chat.
- Case-insensitive word matching.
- Feedback for nearly correct guesses.
- Time-based scoring.
- Bonus points for the drawer.
- Live leaderboard updates.

### 5. Room Customization
- Maximum player count.
- Number of rounds.
- Drawing duration.
- Number of word choices.
- Hint configuration.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend user interface |
| Vite | Frontend development and build |
| JavaScript | Application logic |
| HTML5 Canvas | Interactive drawing |
| Node.js | Backend runtime |
| Express.js | Backend server |
| Socket.IO | Real-time bidirectional communication |
| Vercel | Frontend deployment |
| Render | Backend deployment |

---

## 🏗️ System Architecture

The application follows a client-server architecture using WebSockets for real-time communication.

```text
                 CLIENT SIDE
              React.js + Vite
                      |
        +-------------+-------------+
        |             |             |
       Home         Lobby       GameScreen
                                    |
                              DrawingCanvas
                                    |
                                    |
                           Socket.IO Client
                                    |
                                    |
                          WebSocket Connection
                                    |
                                    |
                           Socket.IO Server
                                    |
                             Node + Express
                                    |
                      +-------------+-------------+
                      |             |             |
                    Room.js       Game.js      Player.js
                      |             |             |
                   Players       Rounds       Player Data
                   Settings      Scoring
                   Host          Timer
                                 Drawing
                                 Hints
```

### Architecture Explanation

**Server-authoritative game state**

The server acts as the single source of truth. Clients send actions such as drawing, guessing and selecting words. The server validates these actions, updates the game state and broadcasts the appropriate changes.

**Real-time synchronization**

Socket.IO handles bidirectional communication between the server and connected players.

**Canvas synchronization**

Drawing coordinates are normalized between 0 and 1, allowing strokes to be synchronized across clients.

**Game state management**

The backend manages player turns, round transitions, word selection, scoring, hints and countdown timers.

---

## 📁 Project Structure

```text
skribbl-clone/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── socket.js
│   │   └── ...
│   ├── package.json
│   └── ...
│
├── server/
│   ├── index.js
│   ├── Room.js
│   ├── Game.js
│   ├── Player.js
│   ├── words.js
│   └── package.json
│
├── package.json
├── README.md
└── .gitignore
```

*The structure above highlights the main application modules.*

---

## ⚙️ Installation and Local Setup

### Prerequisites

Ensure the following are installed:

- Node.js
- npm
- Git

### Step 1: Clone the repository

```bash
git clone <https://github.com/shivamaurya01/scribbl-clone>
cd skribbl-clone
```

### Step 2: Install dependencies

Run the following command from the root directory:

```bash
npm run install:all
```

This installs the required dependencies for both the client and server.

### Step 3: Start the backend

Open a terminal and run:

```bash
npm run dev:server
```

Backend runs at:

```text
http://localhost:3001
```

### Step 4: Start the frontend

Open another terminal and run:

```bash
npm run dev:client
```

Frontend runs at:

```text
http://localhost:5173
```

### Step 5: Test multiplayer functionality

Open the frontend URL in two separate browser windows.

1. Create a room in the first window.
2. Join the same room from the second window.
3. Start the game.
4. Select a word and begin drawing.
5. Guess the word from the second window.
6. Observe real-time drawing synchronization and score updates.

You can use a normal browser window and an incognito window to simulate different players.

---

## 🔄 How the Game Works

```text
Create / Join Room
       |
       v
   Game Lobby
       |
       v
  Host Starts Game
       |
       v
  Drawer Selection
       |
       v
   Word Selection
       |
       v
  Drawing + Guessing
       |
       v
   Score Calculation
       |
       v
     Round End
       |
       v
    Next Player
       |
       v
   Final Leaderboard
```

The game continues until all configured rounds are completed.

---

## 🔌 Socket.IO Events

The application uses event-driven communication for multiplayer synchronization.

| Event | Direction | Description |
|---|---|---|
| create_room | Client → Server | Create a new room |
| join_room | Client → Server | Join an existing room |
| toggle_ready | Client → Server | Update player readiness |
| start_game | Client → Server | Start the game |
| back_to_lobby | Client → Server | Return to lobby |
| kick_player | Client → Server | Host removes a player |
| word_chosen | Client → Server | Select a drawing word |
| draw_start | Client → Server | Begin drawing |
| draw_move | Client → Server | Send drawing coordinates |
| draw_end | Client → Server | Finish a stroke |
| draw_undo | Client → Server | Undo the previous stroke |
| canvas_clear | Client → Server | Clear the drawing canvas |
| guess | Client → Server | Submit a guess |
| game_state | Server → Client | Synchronize game state |
| round_start | Server → Clients | Start a new round |
| round_end | Server → Clients | End the current round |
| game_over | Server → Clients | Announce final results |
| tick | Server → Clients | Update countdown |
| draw_data | Server → Clients | Synchronize drawing |
| canvas_redraw | Server → Clients | Redraw stored strokes |
| guess_result | Server → Client(s) | Notify guessing result |
| chat_message | Server → Clients | Broadcast chat |
| close_guess | Server → Client | Notify a nearly correct guess |

---

## 🧠 Core Implementation Details

### Drawing Synchronization

1. The drawer interacts with the HTML5 Canvas.
2. Pointer coordinates are normalized.
3. Drawing events are emitted through Socket.IO.
4. The server validates and stores the strokes.
5. Stroke data is broadcast to connected players.
6. Each client's canvas renders the received strokes.

Stored strokes also support undo functionality and canvas synchronization for late joiners.

### Word Matching

Submitted guesses are normalized using:

- Whitespace trimming.
- Lowercase conversion.
- Collapsing consecutive spaces.

The normalized guess is compared against the selected word using exact matching.

A guess one letter away triggers a private close-guess notification.

### Scoring System

The score awarded to a correct guesser depends on the remaining drawing time.

```text
Guesser Score = 100 + 400 × (timeLeft / drawTime)
```

The drawer receives 50 points for each correct guesser.

This encourages players to guess quickly while rewarding successful drawing.

### Game State Management

After game-state changes, the server sends updated information to connected players.

The drawer receives the selected word, while other players receive the appropriate hints.

A `tick` event updates the countdown every second.

---

## 🚀 Deployment

The application uses separate frontend and backend deployments.

### Frontend – Vercel

The React application is built using Vite and deployed on Vercel.

**Live URL:**

https://scribbl-clone-ashen.vercel.app/

### Backend – Render

The Node.js and Express backend is hosted on Render, which supports persistent WebSocket connections required by Socket.IO.

The frontend connects to the deployed backend to enable real-time multiplayer gameplay.

---

## ⚠️ Known Limitations

- Refreshing the page creates a new Socket.IO connection, requiring the player to rejoin.
- Event rate limiting is not currently implemented.
- Combination word mode is not implemented.
- Spectator mode and drawing replay are not implemented.

These features can be considered for future improvements.

---

## 🔮 Future Enhancements

- Player session recovery after refresh.
- Spectator mode.
- Drawing replay functionality.
- Custom word lists.
- Additional word modes.
- Improved event rate limiting.
- Additional multiplayer game settings.

---

## 👨‍💻 Developer

**Shiva Maurya**

Full Stack Developer

Developed as part of the Web3Task Full Stack Intern Technical Evaluation – Round 2.

---

## 📌 Assignment Information

**Organization:** Web3Task  
**Position:** Full Stack Intern  
**Evaluation:** Round 2 – Technical Assignment  
**Project:** Skribbl.io Clone

This project demonstrates full-stack development, real-time communication, multiplayer game-state management and deployment using modern web technologies.
