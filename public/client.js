const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const credsDiv = document.getElementById('creds');
const hqHealthDiv = document.getElementById('hqHealth');
const statusDiv = document.getElementById('status');
const upgradeBtn = document.getElementById('upgradeBtn');

let player = null;
const gameState = {};

socket.on('playerAssignment', (data) => {
  player = data;
  statusDiv.textContent = `Gang ${player.playerNum} - Ready to Fight`;
});

socket.on('gameFull', () => {
  statusDiv.textContent = 'City’s too crowded! Try later.';
});

socket.on('updateGame', (serverState) => {
  Object.assign(gameState, serverState);
  if (player) {
    credsDiv.textContent = `Creds: ${gameState[player.id].creds}`;
    hqHealthDiv.textContent = `HQ Health: ${gameState[player.id].hqHealth}`;
  }
  render();
});

socket.on('cyberStorm', () => {
  statusDiv.textContent = 'Cyber-storm hits! HQ damaged!';
  setTimeout(() => {
    if (player) statusDiv.textContent = `Gang ${player.playerNum} - Ready to Fight`;
  }, 3000);
});

socket.on('gameOver', (data) => {
  statusDiv.textContent = `Game Over! Winner: Gang ${data.winner === player.id ? player.playerNum : (3 - player.playerNum)}`;
});

document.addEventListener('keydown', (e) => {
  if (!player) return;

  const speed = 5;
  switch (e.key) {
    case 'ArrowLeft': player.x -= speed; break;
    case 'ArrowRight': player.x += speed; break;
    case 'ArrowUp': player.y -= speed; break;
    case 'ArrowDown': player.y += speed; break;
    case ' ': // Spacebar to attack
      for (let id in gameState) {
        if (id !== player.id) socket.emit('attack', id);
      }
      break;
  }
  player.x = Math.max(0, Math.min(canvas.width - 20, player.x));
  player.y = Math.max(0, Math.min(canvas.height - 20, player.y));
  socket.emit('moveFighter', { x: player.x, y: player.y });
});

upgradeBtn.addEventListener('click', () => {
  socket.emit('upgradeHQ');
});

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let id in gameState) {
    const p = gameState[id];
    // Draw HQ
    ctx.fillStyle = p.id === player?.id ? '#00ffcc' : '#ff00ff';
    ctx.fillRect(p.hqX, p.hqY, 40, 40);
    // Draw Fighter
    ctx.fillStyle = p.id === player?.id ? '#00ccff' : '#ff33cc';
    ctx.fillRect(p.x, p.y, 20, 20);
    // Labels
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Gang ${p.playerNum}`, p.hqX, p.hqY - 10);
  }
}

render();
