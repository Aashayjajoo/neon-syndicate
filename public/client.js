const socket = io();
const container = document.getElementById('gameCanvas');
const player1HealthDiv = document.getElementById('player1Health');
const player2HealthDiv = document.getElementById('player2Health');
const statusDiv = document.getElementById('status');

let player = null;
const gameState = {};
let jumping = false;

// Three.js Setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(800, 600);
container.appendChild(renderer.domElement);

// Arena Platform
const platformGeometry = new THREE.BoxGeometry(20, 0.2, 20);
const platformMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
scene.add(platform);

// Fighters
const fighters = {};
function createFighter(id, color) {
  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const material = new THREE.MeshBasicMaterial({ color });
  const fighter = new THREE.Mesh(geometry, material);
  scene.add(fighter);
  fighters[id] = fighter;
}

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Camera Position
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

socket.on('playerAssignment', (data) => {
  player = data;
  statusDiv.textContent = `You are ${player.fighter}`;
  createFighter(player.id, player.fighter === 'Blaze' ? 0xff4500 : 0x00b7eb);
});

socket.on('gameFull', () => {
  statusDiv.textContent = 'Arena is full! Try later.';
});

socket.on('updateGame', (serverState) => {
  Object.assign(gameState, serverState);
  for (let id in gameState) {
    if (!fighters[id]) {
      createFighter(id, gameState[id].fighter === 'Blaze' ? 0xff4500 : 0x00b7eb);
    }
    fighters[id].position.set(gameState[id].x, gameState[id].y + 1, gameState[id].z);
  }
  updateHUD();
});

socket.on('gameOver', (data) => {
  statusDiv.textContent = `Winner: ${data.winner === player.id ? player.fighter : gameState[data.winner === player.id ? Object.keys(gameState).find(id => id !== player.id) : player.id].fighter}`;
});

document.addEventListener('keydown', (e) => {
  if (!player) return;

  const speed = player.fighter === 'Frost' ? 0.2 : 0.15; // Frost moves faster
  switch (e.key) {
    case 'ArrowLeft': player.x -= speed; break;
    case 'ArrowRight': player.x += speed; break;
    case 'ArrowUp': player.z -= speed; break;
    case 'ArrowDown': player.z += speed; break;
    case ' ': // Jump
      if (!jumping) {
        jumping = true;
        let jumpHeight = 0;
        const jump = setInterval(() => {
          if (jumpHeight < 2) {
            player.y += 0.2;
            jumpHeight += 0.2;
          } else {
            clearInterval(jump);
            const fall = setInterval(() => {
              if (player.y > 0) {
                player.y -= 0.2;
              } else {
                player.y = 0;
                jumping = false;
                clearInterval(fall);
              }
              socket.emit('move', { x: player.x, y: player.y, z: player.z });
            }, 20);
          }
          socket.emit('move', { x: player.x, y: player.y, z: player.z });
        }, 20);
      }
      break;
    case 'a': // Attack
      for (let id in gameState) {
        if (id !== player.id) socket.emit('attack', id);
      }
      break;
  }
  player.x = Math.max(-10, Math.min(10, player.x));
  player.z = Math.max(-10, Math.min(10, player.z));
  socket.emit('move', { x: player.x, y: player.y, z: player.z });
});

function updateHUD() {
  for (let id in gameState) {
    if (gameState[id].playerNum === 1) {
      player1HealthDiv.textContent = `Blaze: ${gameState[id].health} HP`;
    } else {
      player2HealthDiv.textContent = `Frost: ${gameState[id].health} HP`;
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
