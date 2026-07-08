const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Create HTTP server to serve static files from the client folder
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]; // Strip query parameters like ?v=4
  let filePath = urlPath === '/' || urlPath === '/index.html' 
    ? path.join(__dirname, '../client/index.html') 
    : path.join(__dirname, '../client', urlPath);

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';
  else if (ext === '.json') contentType = 'application/json';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg') contentType = 'image/jpeg';
  else if (ext === '.svg') contentType = 'image/svg+xml';
  else if (ext === '.ico') contentType = 'image/x-icon';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const io = require('socket.io')(server, {
  cors: { origin: "*" } 
});

let players = {};
const DATA_FILE = path.join(__dirname, 'cityState.json');
let cityObjects = {};

// Load saved city state from disk if it exists
if (fs.existsSync(DATA_FILE)) {
  try {
    cityObjects = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log("Loaded saved city state from disk.");
  } catch (err) {
    console.error("Error reading city state file:", err);
  }
}

// Save city state to disk helper
function saveCityState() {
  fs.writeFile(DATA_FILE, JSON.stringify(cityObjects, null, 2), 'utf8', (err) => {
    if (err) {
      console.error("Error saving city state to disk:", err);
    }
  });
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Initialize new player
  players[socket.id] = { x: 0, y: 1, z: 20, rotation: 0 };

  // Send existing players and city state to the new arrival
  socket.emit('currentPlayers', players);
  socket.emit('initialCityState', cityObjects);

  // Notify everyone that a new player joined
  socket.broadcast.emit('newPlayer', { id: socket.id, pos: players[socket.id] });

  // Handle object placement
  socket.on('placeObject', (data) => {
    const key = `${data.x},${data.z}`;
    cityObjects[key] = data;
    io.emit('objectPlaced', data);
    saveCityState();
  });

  // Handle object deletion
  socket.on('deleteObject', (data) => {
    const key = `${data.x},${data.z}`;
    if (cityObjects[key]) {
      delete cityObjects[key];
      io.emit('objectDeleted', data);
      saveCityState();
    }
  });

  // Handle player latency ping
  socket.on('ping_request', () => {
    socket.emit('pong_response');
  });

  // Handle movement updates
  socket.on('playerMovement', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].rotation = data.rotation;
      socket.broadcast.emit('playerMoved', { id: socket.id, pos: players[socket.id] });
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});