const io = require('socket.io')(process.env.PORT || 8080, {
  cors: { origin: "*" } 
});

let players = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Initialize new player
  players[socket.id] = { x: 0, y: 1, z: 0, rotation: 0 };

  // Send existing players to the new arrival
  socket.emit('currentPlayers', players);

  // Notify everyone that a new player joined
  socket.broadcast.emit('newPlayer', { id: socket.id, pos: players[socket.id] });

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

console.log("Server is running on port " + (process.env.PORT || 8080));