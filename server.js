const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const players = {};
let playerCount = 0;

io.on('connection', (socket) => {
  if (playerCount < 2) {
    players[socket.id] = {
      x: playerCount === 0 ? -5 : 5, // 3D X position
      y: 0, // Y (height)
      z: 0, // Z (depth)
      health: 100,
      fighter: playerCount === 0 ? 'Blaze' : 'Frost',
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

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      io.emit('updateGame', players);
    }
  });

  socket.on('attack', (targetId) => {
    if (players[targetId]) {
      const dist = Math.sqrt(
        Math.pow(players[socket.id].x - players[targetId].x, 2) +
        Math.pow(players[socket.id].y - players[targetId].y, 2) +
        Math.pow(players[socket.id].z - players[targetId].z, 2)
      );
      if (dist < 2) { // Attack range
        const damage = players[socket.id].fighter === 'Blaze' ? 15 : 10;
        players[targetId].health -= damage;
        if (players[targetId].health <= 0) {
          io.emit('gameOver', { winner: socket.id });
        }
        io.emit('updateGame', players);
      }
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    playerCount--;
    io.emit('updateGame', players);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
