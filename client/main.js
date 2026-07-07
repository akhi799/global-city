const socket = io('https://global-city.onrender.com');

// --- 3D SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky Blue
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

// Ground (The City Floor)
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: 0x555555 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grid Helper for visual movement reference
const gridHelper = new THREE.GridHelper(1000, 100, 0x00ff00, 0x444444);
gridHelper.position.y = 0.01; // slightly above ground to prevent z-fighting
scene.add(gridHelper);

// Dummy Building (Placeholder for Monuments)
function createBuilding(x, z, height, color) {
    const geo = new THREE.BoxGeometry(5, height, 5);
    const mat = new THREE.MeshStandardMaterial({ color: color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height/2, z);
    scene.add(mesh);
}
createBuilding(10, 10, 20, 0xcccccc); // Eiffel Tower placeholder
createBuilding(-10, -20, 40, 0xaa0000); // Empire State placeholder

// --- PLAYER LOGIC ---
let playerPos = { x: 0, y: 1, z: 0, rotation: 0 };
let isFlying = false;
let velocityY = 0;
const gravity = -0.01;
const speed = 0.2;
const otherPlayers = {};

const myMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x00ff00 })
);
const myVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
);
myVisor.position.set(0, 0.4, -0.4);
myMesh.add(myVisor);
scene.add(myMesh);

const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);
window.addEventListener('keydown', (e) => { if(e.code === 'KeyF') isFlying = !isFlying; });

// --- MULTIPLAYER LOGIC ---
socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach(id => {
        if (id !== socket.id) addOtherPlayer(id, players[id]);
    });
});

socket.on('newPlayer', (data) => addOtherPlayer(data.id, data.pos));

socket.on('playerMoved', (data) => {
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].position.set(data.pos.x, data.pos.y, data.pos.z);
        otherPlayers[data.id].rotation.y = data.pos.rotation;
    }
});

socket.on('playerDisconnected', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
});

function addOtherPlayer(id, pos) {
    const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5, 1, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    visor.position.set(0, 0.4, -0.4);
    mesh.add(visor);
    mesh.position.set(pos.x, pos.y, pos.z);
    scene.add(mesh);
    otherPlayers[id] = mesh;
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Rotation and Movement logic
    const rotationSpeed = 0.05;
    if (keys['KeyA']) {
        playerPos.rotation += rotationSpeed;
    }
    if (keys['KeyD']) {
        playerPos.rotation -= rotationSpeed;
    }
    if (keys['KeyW']) {
        playerPos.x -= Math.sin(playerPos.rotation) * speed;
        playerPos.z -= Math.cos(playerPos.rotation) * speed;
    }
    if (keys['KeyS']) {
        playerPos.x += Math.sin(playerPos.rotation) * speed;
        playerPos.z += Math.cos(playerPos.rotation) * speed;
    }

    if (isFlying) {
        if (keys['Space']) playerPos.y += speed;
        if (keys['ShiftLeft']) playerPos.y -= speed;
    } else {
        // Jump and Gravity
        if (keys['Space'] && playerPos.y <= 1) velocityY = 0.2;
        playerPos.y += velocityY;
        if (playerPos.y > 1) velocityY += gravity;
        else { playerPos.y = 1; velocityY = 0; }
    }

    myMesh.position.set(playerPos.x, playerPos.y, playerPos.z);
    myMesh.rotation.y = playerPos.rotation;

    // Camera follows behind player with smooth interpolation (lerping)
    const cameraDistance = 10;
    const cameraHeight = 5;
    const targetCameraX = playerPos.x + Math.sin(playerPos.rotation) * cameraDistance;
    const targetCameraZ = playerPos.z + Math.cos(playerPos.rotation) * cameraDistance;
    const targetCameraY = playerPos.y + cameraHeight;

    // Smooth camera lag/lerp
    camera.position.x += (targetCameraX - camera.position.x) * 0.1;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.1;
    camera.position.y += (targetCameraY - camera.position.y) * 0.1;
    camera.lookAt(playerPos.x, playerPos.y, playerPos.z);

    // Sync to server
    socket.emit('playerMovement', playerPos);

    renderer.render(scene, camera);
}
animate();