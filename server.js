const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle root route explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const players = {};
let playerCount = 0;

io.on('connection', (socket) => {
  if (playerCount < 2) {
    players[socket.id] = {
      x: playerCount === 0 ? 100 : 600,
      y: 300,
      hqX: playerCount === 0 ? 50 : 650,
      hqY: 300,
      hqHealth: 100,
      creds: 10,
      id: socket.id,
      playerNum: playerCount + 1
    };
    playerCount++;
    socket.emit('playerAssignment', players[socket.id]);
  } else {
    socket.emit('gameFull');
    socket.disconnect();
    return;
  }

  io.emit('updateGame', players);

  socket.on('moveFighter', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit('updateGame', players);
    }
  });

  socket.on('upgradeHQ', () => {
    if (players[socket.id] && players[socket.id].creds >= 10) {
      players[socket.id].creds -= 10;
      players[socket.id].hqHealth += 20;
      io.emit('updateGame', players);
    }
  });

  socket.on('attack', (targetId) => {
    if (players[targetId] && Math.abs(players[socket.id].x - players[targetId].hqX) < 50 && Math.abs(players[socket.id].y - players[targetId].hqY) < 50) {
      players[targetId].hqHealth -= 10;
      if (players[targetId].hqHealth <= 0) {
        players[socket.id].creds += 20;
        io.emit('gameOver', { winner: socket.id });
      }
      io.emit('updateGame', players);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    playerCount--;
    io.emit('updateGame', players);
  });

  setInterval(() => {
    for (let id in players) {
      players[id].hqHealth = Math.max(0, players[id].hqHealth - 5);
    }
    io.emit('updateGame', players);
    io.emit('cyberStorm');
  }, 30000);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
