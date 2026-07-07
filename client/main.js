const socket = io('https://global-city.onrender.com');

// --- 3D SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05050c); // Dark Space Background
scene.fog = new THREE.FogExp2(0x05050c, 0.012); // Atmospheric Fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cyberpunk/Synthwave Lights
const ambientLight = new THREE.AmbientLight(0x0e0e1a, 0.5);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x505080, 0x111122, 0.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0x8090ff, 0.6);
dirLight.position.set(100, 200, 50);
scene.add(dirLight);

// Ground (The City Floor)
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.8, metalness: 0.5 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grid Helper (Neon Grid Lines)
const gridHelper = new THREE.GridHelper(1000, 100, 0xff00aa, 0x181830);
gridHelper.position.y = 0.01; // slightly above ground to prevent z-fighting
scene.add(gridHelper);

// --- CITY GENERATION ---
const roadWidth = 8;
const blockSize = 40;
const cityLimit = 200; // Generate city within -200 to +200 area

// Create roads with dashed lines
for (let coord = -cityLimit; coord <= cityLimit; coord += blockSize) {
    // Road along Z-axis
    const roadZ = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, cityLimit * 2 + roadWidth),
        new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 })
    );
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(coord, 0.02, 0);
    scene.add(roadZ);

    // Dashes along Z-road
    for (let dashZ = -cityLimit; dashZ <= cityLimit; dashZ += 10) {
        const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(0.25, 3),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(coord, 0.03, dashZ);
        scene.add(dash);
    }

    // Road along X-axis
    const roadX = new THREE.Mesh(
        new THREE.PlaneGeometry(cityLimit * 2 + roadWidth, roadWidth),
        new THREE.MeshStandardMaterial({ color: 0x111115, roughness: 0.9 })
    );
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0.02, coord);
    scene.add(roadX);

    // Dashes along X-road
    for (let dashX = -cityLimit; dashX <= cityLimit; dashX += 10) {
        if (Math.abs(dashX - coord) < 1) continue; // skip intersections
        const dash = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 0.25),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(dashX, 0.03, coord);
        scene.add(dash);
    }
}

// Glowing Central Plaza & Monument at (0, 0)
const plazaGeo = new THREE.RingGeometry(8, 12, 32);
const plazaMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, side: THREE.DoubleSide, emissive: 0x005555 });
const plaza = new THREE.Mesh(plazaGeo, plazaMat);
plaza.rotation.x = -Math.PI / 2;
plaza.position.set(0, 0.03, 0);
scene.add(plaza);

const monumentGeo = new THREE.ConeGeometry(2, 25, 4);
const monumentMat = new THREE.MeshStandardMaterial({ 
    color: 0x111122, 
    roughness: 0.1, 
    metalness: 0.9, 
    emissive: 0xff007f,
    emissiveIntensity: 0.5 
});
const monument = new THREE.Mesh(monumentGeo, monumentMat);
monument.position.set(0, 12.5, 0);
scene.add(monument);

const crystalGeo = new THREE.OctahedronGeometry(1.5);
const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
const crystal = new THREE.Mesh(crystalGeo, crystalMat);
crystal.position.set(0, 26, 0);
scene.add(crystal);

// Procedural Building Generator with Corner Neon Stripes
function createBuilding(x, z, w, d, h, color, emissiveColor) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ 
        color: color, 
        roughness: 0.2, 
        metalness: 0.8,
        emissive: 0x070710
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h/2, z);
    scene.add(mesh);

    // Glowing Neon Stripes on the building corners
    const stripeWidth = 0.2;
    const stripeGeo = new THREE.BoxGeometry(stripeWidth, h, stripeWidth);
    const stripeMat = new THREE.MeshBasicMaterial({ color: emissiveColor });

    const offsets = [
        [-w/2, d/2],
        [w/2, d/2],
        [-w/2, -d/2],
        [w/2, -d/2]
    ];
    offsets.forEach(([ox, oz]) => {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(ox, 0, oz);
        mesh.add(stripe);
    });
}

// Generate buildings block-by-block
const neonColors = [0x00ffcc, 0xff00ff, 0x00ffff, 0xffaa00, 0xff0055];
for (let bx = -cityLimit + blockSize/2; bx < cityLimit; bx += blockSize) {
    for (let bz = -cityLimit + blockSize/2; bz < cityLimit; bz += blockSize) {
        // Leave central block empty for the Plaza
        if (Math.abs(bx) < 25 && Math.abs(bz) < 25) continue;

        const subcoords = [
            [-10, -10], [10, -10],
            [-10, 10], [10, 10]
        ];

        subcoords.forEach(([ox, oz]) => {
            if (Math.random() > 0.3) {
                const w = 8 + Math.random() * 4;
                const d = 8 + Math.random() * 4;
                const h = 15 + Math.random() * 35; // tall skylines
                const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
                createBuilding(bx + ox, bz + oz, w, d, h, 0x1f1f2e, neonColor);
            }
        });
    }
}

// --- PLAYER LOGIC ---
let playerPos = { x: 0, y: 1, z: 0, rotation: 0 };
let isFlying = false;
let velocityY = 0;
const gravity = -0.01;
const speed = 0.2;
const otherPlayers = {};

const myMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.5, 1, 4, 8),
    new THREE.MeshStandardMaterial({ 
        color: 0x00ff88, 
        roughness: 0.2, 
        metalness: 0.8,
        emissive: 0x004422 
    })
);
const myVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 })
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
        new THREE.MeshStandardMaterial({ 
            color: 0xff0055, 
            roughness: 0.2, 
            metalness: 0.8,
            emissive: 0x440011 
        })
    );
    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.2, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 })
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