const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const socket = io(isLocal ? 'http://localhost:8080' : 'https://global-city.onrender.com');

// --- 3D SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020206); // Extremely Dark Space Background
scene.fog = new THREE.FogExp2(0x020206, 0.004); // Atmospheric Fog

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Cyberpunk/Synthwave Lights
const ambientLight = new THREE.AmbientLight(0x070714, 0.6);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x353560, 0x020208, 0.5);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0x80a0ff, 0.9);
dirLight.position.set(100, 200, 50);
scene.add(dirLight);

// Procedural grass texture generator (Circuit/Grass Hybrid)
function createGrassTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Dark emerald green background
    ctx.fillStyle = '#06130b';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw cyber grass blades/micro-circuitry
    ctx.fillStyle = '#0f3c1f';
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const len = 3 + Math.random() * 5;
        ctx.fillRect(x, y, 1.2, len);
    }
    
    // Draw subtle neon green grid lines
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100); // Tile it across the 1000x1000 ground
    return texture;
}

// Ground (The City Floor)
const groundMat = new THREE.MeshStandardMaterial({ 
    map: createGrassTexture(),
    roughness: 0.95, 
    metalness: 0.1 
});
const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    groundMat
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// Grid Helper (Neon Grid Lines) - snapped to 10 units
const gridHelper = new THREE.GridHelper(1000, 100, 0x00ffcc, 0x0e0e1a);
gridHelper.position.y = 0.005;
scene.add(gridHelper);

// --- STATIC CITY ENVIRONMENT ---
const roadWidth = 12; // Widen road to allow multi-lanes (extends from -6 to +6)
const blockSize = 40;
const cityLimit = 200;

// Reusable Zebra Crosswalk Textures
function createCrosswalkTexture(horizontal = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    const stripeCount = 10;
    const stripeSize = 128 / stripeCount;
    for (let i = 0; i < stripeCount; i += 2) {
        if (horizontal) {
            ctx.fillRect(0, i * stripeSize, 128, stripeSize - 4);
        } else {
            ctx.fillRect(i * stripeSize, 0, stripeSize - 4, 128);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

const crosswalkMatV = new THREE.MeshBasicMaterial({ map: createCrosswalkTexture(false), transparent: true, opacity: 0.8 });
const crosswalkMatH = new THREE.MeshBasicMaterial({ map: createCrosswalkTexture(true), transparent: true, opacity: 0.8 });

// Reusable assets
const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x11121d, roughness: 0.7, metalness: 0.5 });
const yellowLineMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const dashLineMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

// Draw default grid roads, sidewalks, and crosswalks
for (let coord = -cityLimit; coord <= cityLimit; coord += blockSize) {
    // --- ROAD ALONG Z-AXIS ---
    const roadZ = new THREE.Mesh(
        new THREE.PlaneGeometry(roadWidth, cityLimit * 2 + roadWidth),
        new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.9 })
    );
    roadZ.rotation.x = -Math.PI / 2;
    roadZ.position.set(coord, 0.01, 0);
    scene.add(roadZ);

    // Sidewalks Left and Right for Z-road
    const sidewalkZL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, cityLimit * 2 + roadWidth), sidewalkMat);
    sidewalkZL.position.set(coord - 6.75, 0.08, 0);
    scene.add(sidewalkZL);

    const sidewalkZR = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, cityLimit * 2 + roadWidth), sidewalkMat);
    sidewalkZR.position.set(coord + 6.75, 0.08, 0);
    scene.add(sidewalkZR);

    // Multi-lane dividers for Z-road (Double yellow center line)
    const centerYellow1 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, cityLimit * 2 + roadWidth), yellowLineMat);
    centerYellow1.rotation.x = -Math.PI / 2;
    centerYellow1.position.set(coord - 0.12, 0.015, 0);
    scene.add(centerYellow1);

    const centerYellow2 = new THREE.Mesh(new THREE.PlaneGeometry(0.1, cityLimit * 2 + roadWidth), yellowLineMat);
    centerYellow2.rotation.x = -Math.PI / 2;
    centerYellow2.position.set(coord + 0.12, 0.015, 0);
    scene.add(centerYellow2);

    // Dashed lane lines (Left & Right lanes)
    for (let dashZ = -cityLimit; dashZ <= cityLimit; dashZ += 12) {
        const dashL = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4), dashLineMat);
        dashL.rotation.x = -Math.PI / 2;
        dashL.position.set(coord - 3, 0.015, dashZ);
        scene.add(dashL);

        const dashR = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4), dashLineMat);
        dashR.rotation.x = -Math.PI / 2;
        dashR.position.set(coord + 3, 0.015, dashZ);
        scene.add(dashR);
    }

    // --- ROAD ALONG X-AXIS ---
    const roadX = new THREE.Mesh(
        new THREE.PlaneGeometry(cityLimit * 2 + roadWidth, roadWidth),
        new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.9 })
    );
    roadX.rotation.x = -Math.PI / 2;
    roadX.position.set(0, 0.01, coord);
    scene.add(roadX);

    // Sidewalks Left and Right for X-road
    const sidewalkXL = new THREE.Mesh(new THREE.BoxGeometry(cityLimit * 2 + roadWidth, 0.16, 1.5), sidewalkMat);
    sidewalkXL.position.set(0, 0.08, coord - 6.75);
    scene.add(sidewalkXL);

    const sidewalkXR = new THREE.Mesh(new THREE.BoxGeometry(cityLimit * 2 + roadWidth, 0.16, 1.5), sidewalkMat);
    sidewalkXR.position.set(0, 0.08, coord + 6.75);
    scene.add(sidewalkXR);

    // Multi-lane dividers for X-road (Double yellow center line)
    const centerYellowX1 = new THREE.Mesh(new THREE.PlaneGeometry(cityLimit * 2 + roadWidth, 0.1), yellowLineMat);
    centerYellowX1.rotation.x = -Math.PI / 2;
    centerYellowX1.position.set(0, 0.015, coord - 0.12);
    scene.add(centerYellowX1);

    const centerYellowX2 = new THREE.Mesh(new THREE.PlaneGeometry(cityLimit * 2 + roadWidth, 0.1), yellowLineMat);
    centerYellowX2.rotation.x = -Math.PI / 2;
    centerYellowX2.position.set(0, 0.015, coord + 0.12);
    scene.add(centerYellowX2);

    // Dashed lane lines for X-road
    for (let dashX = -cityLimit; dashX <= cityLimit; dashX += 12) {
        if (Math.abs(dashX - coord) < 1) continue; // skip intersections
        const dashL = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.12), dashLineMat);
        dashL.rotation.x = -Math.PI / 2;
        dashL.position.set(dashX, 0.015, coord - 3);
        scene.add(dashL);

        const dashR = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.12), dashLineMat);
        dashR.rotation.x = -Math.PI / 2;
        dashR.position.set(dashX, 0.015, coord + 3);
        scene.add(dashR);
    }
}

// Draw Zebra Crosswalks around all intersections
for (let cx = -cityLimit; cx <= cityLimit; cx += blockSize) {
    for (let cz = -cityLimit; cz <= cityLimit; cz += blockSize) {
        const crossN = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.5), crosswalkMatV);
        crossN.rotation.x = -Math.PI / 2;
        crossN.position.set(cx, 0.016, cz - 7.5);
        scene.add(crossN);

        const crossS = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 2.5), crosswalkMatV);
        crossS.rotation.x = -Math.PI / 2;
        crossS.position.set(cx, 0.016, cz + 7.5);
        scene.add(crossS);

        const crossE = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 10.5), crosswalkMatH);
        crossE.rotation.x = -Math.PI / 2;
        crossE.position.set(cx + 7.5, 0.016, cz);
        scene.add(crossE);

        const crossW = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 10.5), crosswalkMatH);
        crossW.rotation.x = -Math.PI / 2;
        crossW.position.set(cx - 7.5, 0.016, cz);
        scene.add(crossW);
    }
}

// Central Plaza & Monument at (0, 0)
const plazaGeo = new THREE.RingGeometry(12, 18, 32);
const plazaMat = new THREE.MeshStandardMaterial({ color: 0xff007f, side: THREE.DoubleSide, emissive: 0x33001a, roughness: 0.2 });
const plaza = new THREE.Mesh(plazaGeo, plazaMat);
plaza.rotation.x = -Math.PI / 2;
plaza.position.set(0, 0.02, 0);
scene.add(plaza);

const monumentGeo = new THREE.ConeGeometry(2.5, 25, 4);
const monumentMat = new THREE.MeshStandardMaterial({ 
    color: 0x050510, 
    roughness: 0.05, 
    metalness: 0.95, 
    emissive: 0x00ffcc,
    emissiveIntensity: 0.4
});
const monument = new THREE.Mesh(monumentGeo, monumentMat);
monument.position.set(0, 12.5, 0);
scene.add(monument);

const crystalGeo = new THREE.OctahedronGeometry(1.6);
const crystalMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
const crystal = new THREE.Mesh(crystalGeo, crystalMat);
crystal.position.set(0, 26, 0);
scene.add(crystal);

// --- SANDBOX BUILD STATE & MODELS ---
let activeTool = 'move'; 
let currentBuildRotation = 0; 
const placedObjects = {}; 
const occupiedGrid = {}; // Unified grid map for collision detection (both startup and player-placed)
const animatingPlacements = []; 
const rotatingRings = []; 
const billboardTextures = []; 
const neonColors = [0x00ffcc, 0xff00ff, 0x00ffff, 0xffaa00, 0xff0055];
const adTexts = ["FUJIYA", "NEO-TOKYO", "SONY", "ACTIVE", "GRID 2.0", "GRID-CORE", "CYBERNETIC"];

// Helper to create glowing label sprites for players
function createTextSprite(text, isSelf = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 0, 0, 0)'; 
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 26px Outfit, sans-serif';
    ctx.fillStyle = isSelf ? '#00ffcc' : '#ff00ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = isSelf ? 'rgba(0, 255, 204, 0.8)' : 'rgba(255, 0, 127, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, 128, 32);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4.5, 1.1, 1);
    return sprite;
}

// Create glowing window grid texture
function createWindowTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#070712';
    ctx.fillRect(0, 0, 128, 256);
    
    const cols = 6;
    const rows = 14;
    const w = 10;
    const h = 12;
    const gapX = 8;
    const gapY = 5;
    
    for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
            const x = 12 + c * (w + gapX);
            const y = 10 + r * (h + gapY);
            if (Math.random() > 0.45) {
                // Random neon lit windows
                ctx.fillStyle = Math.random() > 0.4 ? '#ffdd88' : colorHex;
            } else {
                ctx.fillStyle = '#121225';
            }
            ctx.fillRect(x, y, w, h);
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Create animated Tokyo-style advertising billboard canvas texture
function createBillboardTexture(text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#050512';
    ctx.fillRect(0, 0, 128, 256);
    
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 122, 250);
    ctx.strokeRect(10, 10, 108, 236);

    ctx.font = 'bold 24px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 14;

    const chars = text.split('');
    chars.forEach((char, idx) => {
        ctx.fillText(char, 64, 42 + idx * 30);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    billboardTextures.push({
        texture: texture,
        speed: 0.002 + Math.random() * 0.003
    });

    return texture;
}

// Procedural building generator returning groups
function createModel(type, colorCode) {
    const group = new THREE.Group();
    const color = new THREE.Color(colorCode);
    const hexString = "#" + color.getHexString();

    if (type === 'hospital') {
        const winTex = createWindowTexture('#00ffcc'); // Cyan glowing windows
        const bodyGeo = new THREE.BoxGeometry(6, 16, 6);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            map: winTex,
            emissiveMap: winTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            roughness: 0.4 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 8;
        group.add(body);

        // Glowing red health cross sign on top
        const crossGroup = new THREE.Group();
        const hPart = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
        const vPart = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xff0055 }));
        crossGroup.add(hPart);
        crossGroup.add(vPart);
        crossGroup.position.set(0, 17.5, 0);
        group.add(crossGroup);
        rotatingRings.push(crossGroup); // Slow rotation for the health cross

        // Cyan glowing stripes down corners
        const stripeGeo = new THREE.BoxGeometry(0.2, 16, 0.2);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        [[-3.01, 3.01], [3.01, 3.01], [-3.01, -3.01], [3.01, -3.01]].forEach(([ox, oz]) => {
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(ox, 8, oz);
            group.add(stripe);
        });
    }
    else if (type === 'hotel') {
        const height = 24;
        const bodyGeo = new THREE.BoxGeometry(5.5, height, 5.5);
        const winTex = createWindowTexture("#ffaa00"); // Golden windows
        const bodyMat = new THREE.MeshStandardMaterial({ map: winTex, emissiveMap: winTex, emissive: 0xffffff, emissiveIntensity: 0.9 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        group.add(body);

        // Rooftop pool / terrace
        const poolGeo = new THREE.BoxGeometry(4.5, 0.2, 4.5);
        const poolMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 });
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.position.set(0, height + 0.1, 0);
        group.add(pool);
        
        const canopyGeo = new THREE.BoxGeometry(2, 2, 2);
        const canopyMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.set(0, height + 1, 0);
        group.add(canopy);
    }
    else if (type === 'cafe') {
        const winTex = createWindowTexture('#ffaa00'); // Golden glowing windows
        const bodyGeo = new THREE.BoxGeometry(6, 6, 6);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            map: winTex,
            emissiveMap: winTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            roughness: 0.8 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 3;
        group.add(body);

        // Glowing Cafe awning
        const awningGeo = new THREE.BoxGeometry(6.2, 0.4, 1.5);
        const awningMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const awning = new THREE.Mesh(awningGeo, awningMat);
        awning.position.set(0, 3.5, 2.3);
        group.add(awning);

        // Top seating umbrella
        const umbrellaGeo = new THREE.ConeGeometry(1.8, 1, 8);
        const umbrellaMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        const umbrella = new THREE.Mesh(umbrellaGeo, umbrellaMat);
        umbrella.position.set(0, 7.5, 0);
        group.add(umbrella);
        
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.5), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
        pole.position.set(0, 6.75, 0);
        group.add(pole);
    }
    else if (type === 'store') {
        const winTex = createWindowTexture('#ff00ff'); // Magenta glowing windows
        const bodyGeo = new THREE.BoxGeometry(6, 5, 6);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            map: winTex,
            emissiveMap: winTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            roughness: 0.5 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 2.5;
        group.add(body);

        // Front glass neon showcase
        const showGeo = new THREE.PlaneGeometry(4.5, 3.2);
        const showMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
        const showcase = new THREE.Mesh(showGeo, showMat);
        showcase.position.set(0, 2.2, 3.01);
        group.add(showcase);
        
        // Glowing sign board
        const signGeo = new THREE.BoxGeometry(4.8, 0.8, 0.4);
        const sign = new THREE.Mesh(signGeo, new THREE.MeshBasicMaterial({ color: 0xff00ff }));
        sign.position.set(0, 4.4, 2.9);
        group.add(sign);
    }
    else if (type === 'parking') {
        const levelGeo = new THREE.BoxGeometry(7, 0.25, 7);
        const lvlMat = new THREE.MeshStandardMaterial({ color: 0x22222b, roughness: 0.9 });
        
        for (let i = 0; i < 3; i++) {
            const lvl = new THREE.Mesh(levelGeo, lvlMat);
            lvl.position.y = i * 4 + 0.12;
            group.add(lvl);
        }
        
        // Concrete support pillars
        const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 12, 6);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x111116 });
        [[-3.2, 3.2], [3.2, 3.2], [-3.2, -3.2], [3.2, -3.2]].forEach(([px, pz]) => {
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(px, 6, pz);
            group.add(pillar);
        });

        // Glowing neon internal ramps
        const rampGeo = new THREE.PlaneGeometry(2, 5.6);
        const rampMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide });
        const ramp = new THREE.Mesh(rampGeo, rampMat);
        ramp.rotation.x = Math.PI / 7;
        ramp.position.set(-1.8, 2.2, 0);
        group.add(ramp);
    }
    else if (type === 'office') {
        const height = 28;
        const bodyGeo = new THREE.BoxGeometry(6, height, 6);
        const winTex = createWindowTexture("#00ffff"); // Blue office windows
        const bodyMat = new THREE.MeshStandardMaterial({ map: winTex, emissiveMap: winTex, emissive: 0xffffff, emissiveIntensity: 1.0 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        group.add(body);
        
        // Glowing top spire
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 8), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
        spire.position.set(0, height + 4, 0);
        group.add(spire);
    }
    else if (type === 'club') {
        const bodyGeo = new THREE.BoxGeometry(6.5, 9, 6.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x080812, roughness: 0.2, metalness: 0.9 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 4.5;
        group.add(body);

        // Roof spotlights (rotating)
        const spotsGroup = new THREE.Group();
        spotsGroup.position.set(0, 9.1, 0);
        group.add(spotsGroup);
        
        const beamGeo = new THREE.CylinderGeometry(0.15, 2.2, 40, 8);
        const beamMat1 = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.3 });
        const beam1 = new THREE.Mesh(beamGeo, beamMat1);
        beam1.position.y = 20;
        beam1.rotation.z = Math.PI / 6;
        spotsGroup.add(beam1);

        const beamMat2 = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
        const beam2 = new THREE.Mesh(beamGeo, beamMat2);
        beam2.position.y = 20;
        beam2.rotation.z = -Math.PI / 6;
        spotsGroup.add(beam2);

        rotatingRings.push(spotsGroup); // spotlight spin
    }
    else if (type === 'mall') {
        const baseGeo = new THREE.BoxGeometry(8, 7, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x1c1c24, roughness: 0.3 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 3.5;
        group.add(base);

        // Glass arch dome (glowing)
        const domeGeo = new THREE.SphereGeometry(3.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.5, wireframe: true });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.set(0, 7, 0);
        group.add(dome);
    }
    else if (type === 'school') {
        const winTex = createWindowTexture('#ffbb55'); // Orange glowing windows
        const baseGeo = new THREE.BoxGeometry(7, 8, 5.5);
        const baseMat = new THREE.MeshStandardMaterial({ 
            map: winTex,
            emissiveMap: winTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.7,
            roughness: 0.7 
        });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 4;
        group.add(base);

        // Clock tower
        const towerGeo = new THREE.BoxGeometry(2, 14, 2);
        const tower = new THREE.Mesh(towerGeo, baseMat);
        tower.position.set(-2, 7, 1.25);
        group.add(tower);

        // Glowing clock face
        const clockGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.2, 12);
        const clockMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const clockFace = new THREE.Mesh(clockGeo, clockMat);
        clockFace.rotation.x = Math.PI / 2;
        clockFace.position.set(-2, 11, 2.31);
        group.add(clockFace);
    }
    else if (type === 'firestation') {
        const winTex = createWindowTexture('#ff3300'); // Red/orange glowing windows
        const bodyGeo = new THREE.BoxGeometry(6.5, 8, 6.5);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            map: winTex,
            emissiveMap: winTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            roughness: 0.6 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 4;
        group.add(body);

        // Red garage doors
        const doorGeo = new THREE.PlaneGeometry(2.2, 4.5);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xff0022, roughness: 0.4 });
        
        const d1 = new THREE.Mesh(doorGeo, doorMat);
        d1.position.set(-1.5, 2.25, 3.26);
        group.add(d1);

        const d2 = new THREE.Mesh(doorGeo, doorMat);
        d2.position.set(1.5, 2.25, 3.26);
        group.add(d2);

        // Yellow flashing roof light
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        light.position.set(0, 8.35, 0);
        group.add(light);
    }
    else if (type === 'police_station') {
        const winTex = createWindowTexture('#00aaff'); // Cyan/blue glowing windows
        const bodyGeo = new THREE.BoxGeometry(6.5, 9, 6.5);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            map: winTex,
            emissiveMap: winTex,
            emissive: 0xffffff,
            emissiveIntensity: 0.8,
            roughness: 0.4 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 4.5;
        group.add(body);

        // Glowing "POLICE" sign board on the front
        const signGeo = new THREE.BoxGeometry(4.5, 1.2, 0.4);
        const signMat = new THREE.MeshStandardMaterial({
            color: 0x0088ff,
            emissive: 0x0088ff,
            emissiveIntensity: 1.5
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 6, 3.26);
        group.add(sign);

        // Alternating red/blue neon corner stripes
        const stripeGeo = new THREE.BoxGeometry(0.2, 9, 0.2);
        const stripeMatBlue = new THREE.MeshBasicMaterial({ color: 0x0088ff });
        const stripeMatRed = new THREE.MeshBasicMaterial({ color: 0xff0055 });
        [[-3.26, 3.26], [3.26, -3.26]].forEach(([ox, oz]) => {
            const stripe = new THREE.Mesh(stripeGeo, stripeMatBlue);
            stripe.position.set(ox, 4.5, oz);
            group.add(stripe);
        });
        [[-3.26, -3.26], [3.26, 3.26]].forEach(([ox, oz]) => {
            const stripe = new THREE.Mesh(stripeGeo, stripeMatRed);
            stripe.position.set(ox, 4.5, oz);
            group.add(stripe);
        });

        // Alternating red/blue sirens on top
        const sirenGroup = new THREE.Group();
        sirenGroup.position.set(0, 9.35, 0);
        group.add(sirenGroup);
        
        const sRed = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        sRed.position.set(-1, 0, 0);
        sirenGroup.add(sRed);

        const sBlue = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0x0000ff }));
        sBlue.position.set(1, 0, 0);
        sirenGroup.add(sBlue);
        
        rotatingRings.push(sirenGroup); // flashing rotation effect
    }
    else if (type === 'home') {
        const baseGeo = new THREE.BoxGeometry(4, 2.5, 4);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x181825, roughness: 0.6 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 1.25;
        group.add(base);
        
        const roofGeo = new THREE.ConeGeometry(3.5, 2.2, 4);
        const roofMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            emissive: color,
            emissiveIntensity: 1.0 
        });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.y = Math.PI / 4; 
        roof.position.y = 2.5 + 1.1;
        group.add(roof);
        
        const doorGeo = new THREE.PlaneGeometry(0.9, 1.6);
        const doorMat = new THREE.MeshBasicMaterial({ color: color });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 0.8, 2.01);
        group.add(door);
    }
    else if (type === 'skyscraper') {
        const height = 22 + Math.random() * 18;
        const mainGeo = new THREE.BoxGeometry(6, height, 6);
        const windowTexture = createWindowTexture(hexString);
        const mainMat = new THREE.MeshStandardMaterial({
            map: windowTexture,
            emissiveMap: windowTexture,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 0.8, // Glowing window lights!
            roughness: 0.3,
            metalness: 0.7
        });
        const buildingMesh = new THREE.Mesh(mainGeo, mainMat);
        buildingMesh.position.y = height / 2;
        group.add(buildingMesh);

        // Neon corners
        const stripeGeo = new THREE.BoxGeometry(0.18, height, 0.18);
        const stripeMat = new THREE.MeshBasicMaterial({ color: color });
        const offsets = [[-3, 3], [3, 3], [-3, -3], [3, -3]];
        offsets.forEach(([ox, oz]) => {
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(ox, height / 2, oz);
            group.add(stripe);
        });

        // Double ad Billboards on opposite sides so they are always visible!
        const adText = adTexts[Math.floor(Math.random() * adTexts.length)];
        const faceX = Math.random() > 0.5;

        // Billboard 1
        const billboardGeo1 = new THREE.BoxGeometry(0.2, 14, 3.2);
        const adTexture1 = createBillboardTexture(adText, hexString);
        const billboardMat1 = new THREE.MeshStandardMaterial({
            map: adTexture1,
            emissiveMap: adTexture1,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 2.2, // Boosted glow
            roughness: 0.1,
            metalness: 0.9
        });
        const billboard1 = new THREE.Mesh(billboardGeo1, billboardMat1);

        // Billboard 2 (Opposite Face)
        const billboardGeo2 = new THREE.BoxGeometry(0.2, 14, 3.2);
        const adTexture2 = createBillboardTexture(adText, hexString);
        const billboardMat2 = new THREE.MeshStandardMaterial({
            map: adTexture2,
            emissiveMap: adTexture2,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 2.2,
            roughness: 0.1,
            metalness: 0.9
        });
        const billboard2 = new THREE.Mesh(billboardGeo2, billboardMat2);

        if (faceX) {
            billboard1.position.set(3.02, height - 9, 0);
            billboard2.position.set(-3.02, height - 9, 0);
        } else {
            billboard1.rotation.y = Math.PI / 2;
            billboard2.rotation.y = Math.PI / 2;
            billboard1.position.set(0, height - 9, 3.02);
            billboard2.position.set(0, height - 9, -3.02);
        }

        group.add(billboard1);
        group.add(billboard2);
    } 
    else if (type === 'cybertower') {
        const baseGeo = new THREE.CylinderGeometry(2.2, 3.2, 6, 8);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x101020, roughness: 0.2, metalness: 0.8 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 3;
        group.add(base);

        const needleGeo = new THREE.CylinderGeometry(0.3, 1.0, 22, 6);
        const needleMat = new THREE.MeshStandardMaterial({ color: 0x080814, roughness: 0.1, metalness: 0.9 });
        const needle = new THREE.Mesh(needleGeo, needleMat);
        needle.position.y = 14;
        group.add(needle);

        // Vertical glowing light stripe running down needle
        const stripeGeo = new THREE.CylinderGeometry(0.06, 0.06, 22, 4);
        const stripeMat = new THREE.MeshBasicMaterial({ color: color });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(0, 14, 1.02);
        group.add(stripe);

        const ringGeo = new THREE.TorusGeometry(3.2, 0.22, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: color });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 16;
        group.add(ring);
        rotatingRings.push(ring); 

        const beaconGeo = new THREE.SphereGeometry(0.7, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: color });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 25;
        group.add(beacon);

        const beamGeo = new THREE.CylinderGeometry(0.1, 0.1, 150, 4);
        const beamMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.25 });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 100;
        group.add(beam);
    } 
    else if (type === 'hovercarpad') {
        const deckGeo = new THREE.BoxGeometry(7, 0.6, 7);
        const deckMat = new THREE.MeshStandardMaterial({ color: 0x121225, roughness: 0.3, metalness: 0.7 });
        const deck = new THREE.Mesh(deckGeo, deckMat);
        deck.position.y = 0.3;
        group.add(deck);

        const lineGeo = new THREE.PlaneGeometry(4.5, 4.5);
        const arrowTexture = createArrowCanvasTexture(colorCode);
        const lineMat = new THREE.MeshBasicMaterial({ map: arrowTexture, transparent: true, side: THREE.DoubleSide });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.61, 0);
        group.add(line);

        const poleGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.5, 4);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x05050f });
        const lightGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const lightMat = new THREE.MeshBasicMaterial({ color: color });

        [[-3.3, 3.3], [3.3, 3.3], [-3.3, -3.3], [3.3, -3.3]].forEach(([ox, oz]) => {
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(ox, 1.25, oz);
            group.add(pole);

            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(ox, 2.6, oz);
            group.add(light);
        });
    } 
    else if (type === 'park') {
        const floorGeo = new THREE.BoxGeometry(8.0, 0.2, 8.0);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x080e1a, roughness: 0.9 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.y = 0.1;
        group.add(floor);

        // Glowing neon park border
        const borderGeo = new THREE.BoxGeometry(8.2, 0.1, 8.2);
        const borderMat = new THREE.MeshBasicMaterial({ color: color });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.y = 0.05;
        group.add(border);

        const fountainGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 8);
        const fountainMat = new THREE.MeshStandardMaterial({ color: 0x101020 });
        const fountain = new THREE.Mesh(fountainGeo, fountainMat);
        fountain.position.set(0, 0.5, 0);
        group.add(fountain);

        const waterGeo = new THREE.SphereGeometry(1.0, 12, 12);
        const waterMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5, wireframe: true });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.set(0, 1.2, 0);
        group.add(water);

        const trunkGeo = new THREE.CylinderGeometry(0.12, 0.25, 4.5, 5);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x04040e, metalness: 0.9 });
        const foliageGeo = new THREE.IcosahedronGeometry(1.6, 1);
        const foliageMat = new THREE.MeshBasicMaterial({ color: color, wireframe: true });

        [[-2.2, -2.2], [2.2, 2.2], [-2.2, 2.2], [2.2, -2.2]].forEach(([ox, oz]) => {
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.set(ox, 2.25, oz);
            group.add(trunk);

            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.set(ox, 4.7, oz);
            group.add(foliage);
            rotatingRings.push(foliage); 
        });
    } 
    else if (type === 'road') {
        const roadGeo = new THREE.PlaneGeometry(10, 10);
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x050508, roughness: 0.9 });
        const road = new THREE.Mesh(roadGeo, roadMat);
        road.rotation.x = -Math.PI / 2;
        road.position.y = 0.021;
        group.add(road);

        const stripeL = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 10), new THREE.MeshBasicMaterial({ color: color }));
        stripeL.rotation.x = -Math.PI / 2;
        stripeL.position.set(-4.8, 0.022, 0);
        group.add(stripeL);

        const stripeR = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 10), new THREE.MeshBasicMaterial({ color: color }));
        stripeR.rotation.x = -Math.PI / 2;
        stripeR.position.set(4.8, 0.022, 0);
        group.add(stripeR);

        const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        centerLine.rotation.x = -Math.PI / 2;
        centerLine.position.set(0, 0.022, -2.5);
        group.add(centerLine);
        
        const centerLine2 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        centerLine2.rotation.x = -Math.PI / 2;
        centerLine2.position.set(0, 0.022, 2.5);
        group.add(centerLine2);
    }

    return group;
}

// Canvas generator for spawner arrows
function createArrowCanvasTexture(colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,128,128);
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 6;
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    ctx.arc(64, 64, 45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(64, 25);
    ctx.lineTo(64, 103);
    ctx.moveTo(25, 64);
    ctx.lineTo(103, 64);
    ctx.stroke();

    return new THREE.CanvasTexture(canvas);
}

// --- GENERATE INITIAL CITY BUILDINGS (Tokyo-style grid blocks) ---
for (let bx = -cityLimit + blockSize/2; bx < cityLimit; bx += blockSize) {
    for (let bz = -cityLimit + blockSize/2; bz < cityLimit; bz += blockSize) {
        const subcoords = [
            [-10, -10], [10, -10],
            [-10, 10], [10, 10]
        ];

        subcoords.forEach(([ox, oz]) => {
            const posX = bx + ox;
            const posZ = bz + oz;
            
            // Only skip buildings inside the central plaza circle (radius 22)
            const distToCenter = Math.sqrt(posX*posX + posZ*posZ);
            if (distToCenter < 22) return;

            if (Math.random() > 0.25) { // Spawn rate
                const neonColor = neonColors[Math.floor(Math.random() * neonColors.length)];
                
                let type;
                if (distToCenter > 115) {
                    type = 'home'; // Outer suburban houses
                } else {
                    const cityTypes = [
                        'hospital', 'hotel', 'cafe', 'store', 'parking', 
                        'office', 'club', 'mall', 'school', 'firestation', 
                        'police_station', 'skyscraper', 'cybertower'
                    ];
                    type = cityTypes[Math.floor(Math.random() * cityTypes.length)];
                }
                
                const group = createModel(type, neonColor);
                group.position.set(posX, 0, posZ);
                scene.add(group);
                occupiedGrid[`${posX},${posZ}`] = { type: type };
            }
        });
    }
}

// --- HOLOGRAM BUILD PREVIEW ---
const hologramGroup = new THREE.Group();
scene.add(hologramGroup);

const holoMaterialFree = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.35, wireframe: true });
const holoMaterialOccupied = new THREE.MeshBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.45, wireframe: true });

function updateHologram(x, z, blocked) {
    hologramGroup.clear();
    if (activeTool === 'move') return;

    hologramGroup.position.set(x, 0, z);
    hologramGroup.rotation.y = currentBuildRotation;

    let visual = null;
    const mat = blocked ? holoMaterialOccupied : holoMaterialFree;

    if (activeTool === 'demolish') {
        const box = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 8), mat);
        box.position.y = 3;
        hologramGroup.add(box);
    } else {
        if (activeTool === 'skyscraper') {
            visual = new THREE.Mesh(new THREE.BoxGeometry(6, 25, 6), mat);
            visual.position.y = 12.5;
        } else if (activeTool === 'cybertower') {
            visual = new THREE.Mesh(new THREE.CylinderGeometry(2, 3.2, 25, 8), mat);
            visual.position.y = 12.5;
        } else if (activeTool === 'hovercarpad') {
            visual = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 7), mat);
            visual.position.y = 0.3;
        } else if (activeTool === 'park') {
            visual = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.2, 8.0), mat);
            visual.position.y = 0.1;
        } else if (activeTool === 'road') {
            visual = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), mat);
            visual.rotation.x = -Math.PI / 2;
            visual.position.y = 0.03;
        }
        if (visual) hologramGroup.add(visual);
    }
}

// Raycast to Ground Snapping
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-999, -999);
let snappedCoords = { x: 0, z: 0 };
let buildBlocked = false;

window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    
    const path = e.composedPath();
    const overUI = path.some(el => el.id === 'right-sidebar' || el.id === 'toolbar' || el.id === 'top-bar' || el.id === 'instructions-panel');
    if (overUI) {
        hologramGroup.visible = false;
        return;
    }

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(ground);
    
    if (intersects.length > 0) {
        hologramGroup.visible = true;
        const point = intersects[0].point;
        snappedCoords.x = Math.round(point.x / 10) * 10;
        snappedCoords.z = Math.round(point.z / 10) * 10;

        const inPlaza = Math.abs(snappedCoords.x) < 20 && Math.abs(snappedCoords.z) < 20;
        const exists = placedObjects[`${snappedCoords.x},${snappedCoords.z}`] !== undefined;

        if (activeTool === 'demolish') {
            buildBlocked = !exists;
        } else {
            buildBlocked = inPlaza || exists || Math.abs(snappedCoords.x) > cityLimit + 10 || Math.abs(snappedCoords.z) > cityLimit + 10;
        }

        updateHologram(snappedCoords.x, snappedCoords.z, buildBlocked);
    } else {
        hologramGroup.visible = false;
    }
});

window.addEventListener('click', (e) => {
    if (activeTool === 'move') return;

    const path = e.composedPath();
    const overUI = path.some(el => el.id === 'right-sidebar' || el.id === 'toolbar' || el.id === 'top-bar' || el.id === 'instructions-panel');
    if (overUI) return;

    if (hologramGroup.visible && !buildBlocked) {
        if (activeTool === 'demolish') {
            socket.emit('deleteObject', snappedCoords);
        } else {
            const placementData = {
                x: snappedCoords.x,
                z: snappedCoords.z,
                type: activeTool,
                rotation: currentBuildRotation,
                color: neonColors[Math.floor(Math.random() * neonColors.length)]
            };
            socket.emit('placeObject', placementData);
        }
    }
});

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && activeTool !== 'move') {
        currentBuildRotation = (currentBuildRotation + Math.PI / 2) % (Math.PI * 2);
        updateHologram(snappedCoords.x, snappedCoords.z, buildBlocked);
    }
});

function addObjectToScene(x, z, type, rotation, color, animate = true) {
    const key = `${x},${z}`;
    
    if (placedObjects[key]) {
        scene.remove(placedObjects[key]);
        delete placedObjects[key];
    }
    occupiedGrid[key] = { type: type };

    const group = createModel(type, color);
    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    scene.add(group);
    placedObjects[key] = group;

    if (animate) {
        group.scale.set(0.001, 0.001, 0.001);
        animatingPlacements.push({
            mesh: group,
            progress: 0,
            speed: 0.04
        });

        const ringGeo = new THREE.RingGeometry(0.1, 5, 32);
        const ringMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.1, z);
        scene.add(ring);

        const ringAnim = {
            mesh: ring,
            scale: 0.1,
            maxScale: 2.2,
            opacity: 0.8
        };
        
        function animateRing() {
            ringAnim.scale += 0.08;
            ringAnim.opacity -= 0.035;
            ring.scale.set(ringAnim.scale, ringAnim.scale, 1);
            ring.material.opacity = ringAnim.opacity;
            
            if (ringAnim.opacity > 0) {
                requestAnimationFrame(animateRing);
            } else {
                scene.remove(ring);
                ring.geometry.dispose();
                ring.material.dispose();
            }
        }
        animateRing();
    }
    
    if (type === 'hovercarpad') {
        spawnCarAt(x, z, rotation);
    }

    updateTelemetryCount();
}

function updateTelemetryCount() {
    const total = Object.keys(placedObjects).length;
    document.getElementById('cityObjectsCount').innerText = total;
}

// --- PLAYER CONTROLS & PHYSICS ---
let playerPos = { x: 0, y: 1, z: 20, rotation: 0 };
let isFlying = false;
let velocityY = 0;
const gravity = -0.008;
const speed = 0.22;
const otherPlayers = {};

const myMesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.45, 0.9, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x00ffcc, roughness: 0.2, metalness: 0.8, emissive: 0x004422 })
);
const myVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.18, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.1, metalness: 0.9 })
);
myVisor.position.set(0, 0.4, -0.38);
myMesh.add(myVisor);

const selfTag = createTextSprite("You", true);
selfTag.position.set(0, 1.6, 0);
myMesh.add(selfTag);

scene.add(myMesh);

const jetpackParticles = [];
const jetpackGeo = new THREE.SphereGeometry(0.08, 4, 4);
const jetpackMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.8 });

function emitJetpackFlame() {
    if (!isFlying && velocityY <= 0) return;
    const offsetLeft = new THREE.Vector3(-0.2, -0.5, 0.18).applyMatrix4(myMesh.matrixWorld);
    const offsetRight = new THREE.Vector3(0.2, -0.5, 0.18).applyMatrix4(myMesh.matrixWorld);
    
    [offsetLeft, offsetRight].forEach(pos => {
        const particle = new THREE.Mesh(jetpackGeo, jetpackMat.clone());
        particle.position.copy(pos);
        scene.add(particle);
        jetpackParticles.push({
            mesh: particle,
            life: 1.0,
            decay: 0.05,
            dir: new THREE.Vector3(Math.random()*0.04-0.02, -0.12, Math.random()*0.04-0.02)
        });
    });
}

function updateJetpackParticles() {
    for (let i = jetpackParticles.length - 1; i >= 0; i--) {
        const p = jetpackParticles[i];
        p.life -= p.decay;
        p.mesh.position.add(p.dir);
        p.mesh.scale.setScalar(p.life);
        p.mesh.material.opacity = p.life * 0.8;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            jetpackParticles.splice(i, 1);
        }
    }
}

const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

window.addEventListener('keydown', (e) => { 
    if (e.code === 'KeyF') {
        isFlying = !isFlying;
        const btn = document.getElementById('flight-toggle');
        const status = document.getElementById('flight-status');
        if (isFlying) {
            btn.classList.add('active');
            status.innerText = "FLYING";
        } else {
            btn.classList.remove('active');
            status.innerText = "WALKING";
        }
    }
    if (e.code === 'KeyB') {
        if (activeTool === 'move') {
            selectTool('skyscraper');
        } else {
            selectTool('move');
        }
    }
    if (e.code === 'Escape') {
        selectTool('move');
    }
});

// --- MULTIPLAYER LOGIC ---
let latencyTimer = Date.now();
setInterval(() => {
    latencyTimer = Date.now();
    socket.emit('ping_request');
}, 3000);

socket.on('pong_response', () => {
    const lat = Date.now() - latencyTimer;
    document.getElementById('ping').innerText = `${lat} ms`;
});

socket.on('currentPlayers', (players) => {
    Object.keys(players).forEach(id => {
        if (id !== socket.id) addOtherPlayer(id, players[id]);
    });
    updateBuildersUIList();
});

socket.on('newPlayer', (data) => {
    addOtherPlayer(data.id, data.pos);
    updateBuildersUIList();
});

socket.on('playerMoved', (data) => {
    if (otherPlayers[data.id]) {
        otherPlayers[data.id].position.set(data.pos.x, data.pos.y, data.pos.z);
        otherPlayers[data.id].rotation.y = data.pos.rotation;
        otherPlayers[data.id].userData.coords = `${Math.round(data.pos.x)}, ${Math.round(data.pos.z)}`;
        updateBuildersUIList();
    }
});

socket.on('playerDisconnected', (id) => {
    if (otherPlayers[id]) {
        scene.remove(otherPlayers[id]);
        delete otherPlayers[id];
    }
    updateBuildersUIList();
});

socket.on('initialCityState', (state) => {
    Object.keys(state).forEach(key => {
        const item = state[key];
        addObjectToScene(item.x, item.z, item.type, item.rotation, item.color, false);
    });
});

socket.on('objectPlaced', (data) => {
    addObjectToScene(data.x, data.z, data.type, data.rotation, data.color, true);
});

socket.on('objectDeleted', (data) => {
    const key = `${data.x},${data.z}`;
    if (placedObjects[key]) {
        scene.remove(placedObjects[key]);
        delete placedObjects[key];
        delete occupiedGrid[key];
        updateTelemetryCount();
    }
});

function addOtherPlayer(id, pos) {
    const group = new THREE.Group();
    
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 0.9, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0xff007f, roughness: 0.2, metalness: 0.8, emissive: 0x440011 })
    );
    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.18, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x050510, roughness: 0.1, metalness: 0.9 })
    );
    visor.position.set(0, 0.45, -0.42);
    body.add(visor);
    group.add(body);

    const shortId = `Builder_${id.slice(0, 4)}`;
    const textSprite = createTextSprite(shortId, false);
    textSprite.position.set(0, 1.8, 0);
    group.add(textSprite);

    group.position.set(pos.x, pos.y, pos.z);
    scene.add(group);
    
    otherPlayers[id] = group;
    otherPlayers[id].userData = { name: shortId, coords: `${Math.round(pos.x)}, ${Math.round(pos.z)}` };
}

function updateBuildersUIList() {
    const container = document.getElementById('builders-list');
    container.innerHTML = '';

    const selfItem = document.createElement('div');
    selfItem.className = 'player-item';
    selfItem.innerHTML = `
        <div class="player-name">
            <span class="player-dot self"></span>
            <span>You (Builder)</span>
        </div>
        <span class="player-coords">${Math.round(playerPos.x)}, ${Math.round(playerPos.z)}</span>
    `;
    container.appendChild(selfItem);

    Object.keys(otherPlayers).forEach(id => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <div class="player-name">
                <span class="player-dot"></span>
                <span>${otherPlayers[id].userData.name}</span>
            </div>
            <span class="player-coords">${otherPlayers[id].userData.coords}</span>
        `;
        container.appendChild(item);
    });

    document.getElementById('playerCount').innerText = Object.keys(otherPlayers).length + 1;
}

// --- AUTONOMOUS HOVER CAR TRAFFIC ---
const hoverCars = [];
const carLightGeo = new THREE.SphereGeometry(0.18, 4, 4);

class HoverCar {
    constructor(x, y, z, directionVector) {
        this.pos = new THREE.Vector3(x, y, z);
        this.dir = directionVector.clone().normalize();
        this.speed = 0.45 + Math.random() * 0.25; 
        this.history = [];
        this.trailLength = 32; 

        this.group = new THREE.Group();
        this.group.position.copy(this.pos);
        
        const chassisColor = neonColors[Math.floor(Math.random() * neonColors.length)];
        
        // 1. Aerodynamic capsule body
        const bodyGeo = new THREE.BoxGeometry(1.3, 0.25, 2.3);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x11111e, 
            roughness: 0.1, 
            metalness: 0.9,
            emissive: chassisColor,
            emissiveIntensity: 0.4
        });
        const mainBody = new THREE.Mesh(bodyGeo, bodyMat);
        mainBody.position.y = 0.12;
        this.group.add(mainBody);

        // 2. Cockpit glass cabin
        const cabinGeo = new THREE.BoxGeometry(0.8, 0.25, 1.1);
        const cabinMat = new THREE.MeshStandardMaterial({ 
            color: 0x00ffff, 
            emissive: 0x00aaff, 
            emissiveIntensity: 0.8, 
            transparent: true, 
            opacity: 0.85 
        });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 0.35, -0.15);
        this.group.add(cabin);

        // 3. Four corner thruster pads (cylinders flats, glowing!)
        const thrusterGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.15, 8);
        const thrusterMat = new THREE.MeshStandardMaterial({ 
            color: chassisColor, 
            emissive: chassisColor, 
            emissiveIntensity: 2.0 
        });
        const thrusterPositions = [
            [-0.7, 0.05, 0.9],
            [0.7, 0.05, 0.9],
            [-0.7, 0.05, -0.9],
            [0.7, 0.05, -0.9]
        ];
        thrusterPositions.forEach(([tx, ty, tz]) => {
            const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
            thruster.rotation.x = Math.PI / 2;
            thruster.position.set(tx, ty, tz);
            this.group.add(thruster);
        });

        // 4. Rear wing / spoiler
        const spoilerGeo = new THREE.BoxGeometry(1.4, 0.08, 0.35);
        const spoiler = new THREE.Mesh(spoilerGeo, bodyMat);
        spoiler.position.set(0, 0.4, 1.05);
        this.group.add(spoiler);
        
        const spoilerFinGeo = new THREE.BoxGeometry(0.08, 0.3, 0.25);
        const leftFin = new THREE.Mesh(spoilerFinGeo, bodyMat);
        leftFin.position.set(-0.6, 0.25, 1.05);
        const rightFin = new THREE.Mesh(spoilerFinGeo, bodyMat);
        rightFin.position.set(0.6, 0.25, 1.05);
        this.group.add(leftFin);
        this.group.add(rightFin);

        // Headlights (glowing white)
        const headlightMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 2.0
        });
        const leftLight = new THREE.Mesh(carLightGeo, headlightMat);
        leftLight.position.set(-0.45, 0.2, -1.16);
        const rightLight = new THREE.Mesh(carLightGeo, headlightMat);
        rightLight.position.set(0.45, 0.2, -1.16);
        this.group.add(leftLight);
        this.group.add(rightLight);

        // Taillights (glowing pink)
        const taillightMat = new THREE.MeshStandardMaterial({ 
            color: 0xff0055,
            emissive: 0xff0055,
            emissiveIntensity: 2.0
        });
        const leftTail = new THREE.Mesh(carLightGeo, taillightMat);
        leftTail.position.set(-0.45, 0.2, 1.16);
        const rightTail = new THREE.Mesh(carLightGeo, taillightMat);
        rightTail.position.set(0.45, 0.2, 1.16);
        this.group.add(leftTail);
        this.group.add(rightTail);

        this.alignMesh();
        scene.add(this.group);

        const rearTrailMat = new THREE.LineBasicMaterial({ 
            color: 0xff0055, 
            transparent: true, 
            opacity: 0.95, 
            blending: THREE.AdditiveBlending, 
            linewidth: 2.5 
        });
        
        const frontTrailMat = new THREE.LineBasicMaterial({ 
            color: 0x00ffff, 
            transparent: true, 
            opacity: 0.95, 
            blending: THREE.AdditiveBlending, 
            linewidth: 2.5 
        });
        
        this.leftTrailGeo = new THREE.BufferGeometry();
        this.rightTrailGeo = new THREE.BufferGeometry();
        this.leftFrontTrailGeo = new THREE.BufferGeometry();
        this.rightFrontTrailGeo = new THREE.BufferGeometry();
        
        this.leftTrail = new THREE.Line(this.leftTrailGeo, rearTrailMat);
        this.rightTrail = new THREE.Line(this.rightTrailGeo, rearTrailMat);
        this.leftFrontTrail = new THREE.Line(this.leftFrontTrailGeo, frontTrailMat);
        this.rightFrontTrail = new THREE.Line(this.rightFrontTrailGeo, frontTrailMat);
        
        scene.add(this.leftTrail);
        scene.add(this.rightTrail);
        scene.add(this.leftFrontTrail);
        scene.add(this.rightFrontTrail);

        for (let i = 0; i < this.trailLength; i++) {
            this.history.push(this.pos.clone());
        }
    }

    alignMesh() {
        const angle = Math.atan2(-this.dir.z, this.dir.x) + Math.PI / 2;
        this.group.rotation.y = angle;
    }

    update() {
        this.history.push(this.pos.clone());
        if (this.history.length > this.trailLength) {
            this.history.shift();
        }

        const nextPos = this.pos.clone().addScaledVector(this.dir, this.speed);

        // 1. Pedestrian collision check with local player (self)
        const distToSelf = nextPos.distanceTo(new THREE.Vector3(playerPos.x, this.pos.y, playerPos.z));
        if (distToSelf < 2.0) {
            return; // Wait for player to cross the street
        }

        // 2. Pedestrian collision check with other network players
        for (let id of Object.keys(otherPlayers)) {
            const op = otherPlayers[id];
            const distToOther = nextPos.distanceTo(new THREE.Vector3(op.position.x, this.pos.y, op.position.z));
            if (distToOther < 2.0) {
                return; // Wait for network player to cross
            }
        }

        // 3. Traffic collision check with other hovercars (safe following distance)
        for (let other of hoverCars) {
            if (other === this) continue;
            const dist = nextPos.distanceTo(other.pos);
            if (dist < 3.2) {
                return; // Stop and wait in queue
            }
        }

        // 4. Collision lookahead check for hovercars against building blocks
        if (isColliding(nextPos.x, nextPos.z, nextPos.y)) {
            // Blocked! Try left/right/reverse steer directions
            const turnLeftDir = new THREE.Vector3(this.dir.z, 0, -this.dir.x);
            const turnRightDir = new THREE.Vector3(-this.dir.z, 0, this.dir.x);
            const reverseDir = this.dir.clone().negate();
            
            let solved = false;
            for (let testDir of [turnLeftDir, turnRightDir, reverseDir]) {
                const testPos = this.pos.clone().addScaledVector(testDir, this.speed * 2.5);
                if (!isColliding(testPos.x, testPos.z, testPos.y)) {
                    this.dir.copy(testDir);
                    this.alignMesh();
                    solved = true;
                    break;
                }
            }
            if (!solved) {
                return; // Stop vehicle entirely to prevent clipping
            }
        }

        this.pos.addScaledVector(this.dir, this.speed);
        this.group.position.copy(this.pos);

        const nearIntersectionX = Math.round(this.pos.x / blockSize) * blockSize;
        const nearIntersectionZ = Math.round(this.pos.z / blockSize) * blockSize;
        const distToIntersection = this.pos.distanceTo(new THREE.Vector3(nearIntersectionX, this.pos.y, nearIntersectionZ));

        if (distToIntersection < this.speed * 0.65) {
            if (Math.random() < 0.45 && !this.justTurned) {
                this.pos.set(nearIntersectionX, this.pos.y, nearIntersectionZ);
                
                const offsetAmount = Math.random() > 0.5 ? 3 : -3;
                if (Math.abs(this.dir.x) > 0.5) {
                    this.dir.set(0, 0, Math.random() > 0.5 ? 1 : -1);
                    this.pos.x += offsetAmount;
                } else {
                    this.dir.set(Math.random() > 0.5 ? 1 : -1, 0, 0);
                    this.pos.z += offsetAmount;
                }
                this.alignMesh();
                this.justTurned = true; 
            }
        } else {
            this.justTurned = false;
        }

        if (Math.abs(this.pos.x) > cityLimit + 30 || Math.abs(this.pos.z) > cityLimit + 30) {
            this.pos.set(-this.pos.x * 0.95, this.pos.y, -this.pos.z * 0.95);
            // Clear trail history to prevent trail stretching across the entire map
            this.history = [];
            for (let i = 0; i < this.trailLength; i++) {
                this.history.push(this.pos.clone());
            }
        }

        this.updateTrails();
    }

    updateTrails() {
        const leftPoints = [];
        const rightPoints = [];
        const leftFrontPoints = [];
        const rightFrontPoints = [];

        const leftOffset = new THREE.Vector3(-0.45, 0, 1.3);
        const rightOffset = new THREE.Vector3(0.45, 0, 1.3);
        const leftFrontOffset = new THREE.Vector3(-0.45, 0, -1.3);
        const rightFrontOffset = new THREE.Vector3(0.45, 0, -1.3);

        this.history.forEach((historyPos, index) => {
            const rotMatrix = new THREE.Matrix4().makeRotationY(this.group.rotation.y);
            
            const lOffsetRotated = leftOffset.clone().applyMatrix4(rotMatrix);
            const rOffsetRotated = rightOffset.clone().applyMatrix4(rotMatrix);
            const lfOffsetRotated = leftFrontOffset.clone().applyMatrix4(rotMatrix);
            const rfOffsetRotated = rightFrontOffset.clone().applyMatrix4(rotMatrix);
            
            leftPoints.push(historyPos.clone().add(lOffsetRotated));
            rightPoints.push(historyPos.clone().add(rOffsetRotated));
            leftFrontPoints.push(historyPos.clone().add(lfOffsetRotated));
            rightFrontPoints.push(historyPos.clone().add(rfOffsetRotated));
        });

        this.leftTrailGeo.setFromPoints(leftPoints);
        this.rightTrailGeo.setFromPoints(rightPoints);
        this.leftFrontTrailGeo.setFromPoints(leftFrontPoints);
        this.rightFrontTrailGeo.setFromPoints(rightFrontPoints);
    }

    destroy() {
        scene.remove(this.group);
        scene.remove(this.leftTrail);
        scene.remove(this.rightTrail);
        scene.remove(this.leftFrontTrail);
        scene.remove(this.rightFrontTrail);
        this.leftTrailGeo.dispose();
        this.rightTrailGeo.dispose();
        this.leftFrontTrailGeo.dispose();
        this.rightFrontTrailGeo.dispose();
    }
}

for (let i = 0; i < 32; i++) {
    const isXRoad = Math.random() > 0.5;
    const gridIndex = Math.floor(Math.random() * (cityLimit * 2 / blockSize)) * blockSize - cityLimit;
    const startOffset = Math.random() * cityLimit * 2 - cityLimit;
    const laneOffset = Math.random() > 0.5 ? 3 : -3;

    let x = isXRoad ? startOffset : gridIndex + laneOffset;
    let z = isXRoad ? gridIndex + laneOffset : startOffset;
    let dx = isXRoad ? (Math.random() > 0.5 ? 1 : -1) : 0;
    let dz = isXRoad ? 0 : (Math.random() > 0.5 ? 1 : -1);

    hoverCars.push(new HoverCar(x, 1.5, z, new THREE.Vector3(dx, 0, dz)));
}

function spawnCarAt(px, pz, r) {
    if (hoverCars.length > 60) {
        const oldCar = hoverCars.shift();
        oldCar.destroy();
    }
    
    const dir = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), r);
    hoverCars.push(new HoverCar(px, 1.5, pz, dir));
}

// --- FLOATING NEON PARTICLES ---
const particleCount = 600;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);
const particleSpeeds = [];

for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() * 2 - 1) * cityLimit * 1.2;     
    particlePositions[i * 3 + 1] = Math.random() * 100;                      
    particlePositions[i * 3 + 2] = (Math.random() * 2 - 1) * cityLimit * 1.2; 
    
    particleSpeeds.push({
        ySpeed: 0.08 + Math.random() * 0.12,
        swingSpeed: 0.5 + Math.random() * 1.5,
        swingWidth: 0.1 + Math.random() * 0.3,
        seed: Math.random() * 100
    });
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMaterial = new THREE.PointsMaterial({
    color: 0x00ffcc,
    size: 0.6,
    transparent: true,
    opacity: 0.5,
    sizeAttenuation: true
});

const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particleSystem);

function updateParticles() {
    const positions = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
        const speed = particleSpeeds[i];
        positions[i * 3 + 1] += speed.ySpeed;
        speed.seed += 0.01;
        positions[i * 3] += Math.sin(speed.seed * speed.swingSpeed) * speed.swingWidth;

        if (positions[i * 3 + 1] > 100) {
            positions[i * 3 + 1] = 0;
            positions[i * 3] = (Math.random() * 2 - 1) * cityLimit * 1.2;
            positions[i * 3 + 2] = (Math.random() * 2 - 1) * cityLimit * 1.2;
        }
    }
    particleGeometry.attributes.position.needsUpdate = true;
}

// --- SYNTHWAVE AUDIO SYNTHESIZER ---
class SynthwaveAudio {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.tempo = 105; 
        this.beatInterval = null;
        this.bar = 0;
        this.chordIndex = 0;
        
        this.chords = [
            [130.81, 155.56, 196.00, 261.63], 
            [103.83, 130.81, 155.56, 207.65], 
            [87.31, 103.83, 130.81, 174.61],  
            [116.54, 146.83, 174.61, 233.08]  
        ];
        this.bassNotes = [65.41, 51.91, 43.65, 58.27]; 
    }

    start() {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContextClass();
        this.isPlaying = true;
        
        this.mainGain = this.ctx.createGain();
        this.mainGain.gain.value = 0.22; 
        this.mainGain.connect(this.ctx.destination);
        
        const stepTime = 60 / this.tempo / 2; 
        let scheduleTime = this.ctx.currentTime + 0.1;
        
        const scheduleNext = () => {
            if (!this.isPlaying) return;
            
            const tick = this.bar % 8;
            
            if (tick === 0 || tick === 4) {
                this.playKick(scheduleTime);
            }
            if (tick === 2 || tick === 6) {
                this.playSnare(scheduleTime);
            }
            
            this.playBass(this.bassNotes[this.chordIndex], scheduleTime);
            
            if (tick === 0) {
                this.playChord(this.chords[this.chordIndex], scheduleTime);
                this.chordIndex = (this.chordIndex + 1) % this.chords.length;
            }
            
            this.bar++;
            scheduleTime += stepTime;
            
            const lookahead = 200; 
            const delay = (scheduleTime - this.ctx.currentTime) * 1000 - lookahead;
            this.beatInterval = setTimeout(scheduleNext, Math.max(0, delay));
        };
        
        scheduleNext();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.beatInterval);
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
    }
    
    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.mainGain);
        
        osc.frequency.setValueAtTime(110, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        gain.gain.setValueAtTime(0.65, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        
        osc.start(time);
        osc.stop(time + 0.25);
    }
    
    playSnare(time) {
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, time);
        
        const gain = this.ctx.createGain();
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.mainGain);
        
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.005, time + 0.12);
        
        noise.start(time);
        noise.stop(time + 0.12);
    }
    
    playBass(freq, time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, time);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.mainGain);
        
        gain.gain.setValueAtTime(0.16, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);
        
        osc.start(time);
        osc.stop(time + 0.22);
    }
    
    playChord(chordFreqs, time) {
        const duration = 2.3;
        chordFreqs.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(120, time);
            filter.frequency.exponentialRampToValueAtTime(750, time + duration/2);
            filter.frequency.exponentialRampToValueAtTime(180, time + duration);
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.mainGain);
            
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.09, time + 0.4);
            gain.gain.linearRampToValueAtTime(0.06, time + duration - 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
            
            osc.start(time);
            osc.stop(time + duration);
        });
    }
}

const synthMusic = new SynthwaveAudio();

const musicBtn = document.getElementById('music-toggle');
musicBtn.addEventListener('click', () => {
    if (synthMusic.isPlaying) {
        synthMusic.stop();
        musicBtn.classList.remove('active');
        document.getElementById('music-status').innerText = "MUTED";
    } else {
        synthMusic.start();
        musicBtn.classList.add('active');
        document.getElementById('music-status').innerText = "PLAYING";
    }
});

// --- DYNAMIC DAY & NIGHT LIGHTING ---
let dayTime = 1.5; 
let cycleSpeed = 1.0;

const cycleSpeedSlider = document.getElementById('cycle-speed');
cycleSpeedSlider.addEventListener('input', (e) => {
    cycleSpeed = parseFloat(e.target.value);
    document.getElementById('cycle-speed-val').innerText = `${cycleSpeed.toFixed(1)}x`;
});

function updateDayNightCycle() {
    dayTime += 0.0015 * cycleSpeed;
    
    dirLight.position.x = Math.cos(dayTime) * 200;
    dirLight.position.y = Math.sin(dayTime) * 160;
    
    const isNight = dirLight.position.y < 0;
    dirLight.position.y = Math.max(15, dirLight.position.y);

    const sunRatio = Math.max(0.1, Math.min(1.0, dirLight.position.y / 160));
    scene.fog.density = 0.004 + (1.0 - sunRatio) * 0.001; // Maintain visibility even at night

    const baseFog = new THREE.Color(0x020206);
    const nightFog = new THREE.Color(0x000002);
    
    const targetFogColor = baseFog.clone().lerp(nightFog, 1.0 - sunRatio);
    scene.background = targetFogColor;
    scene.fog.color = targetFogColor;

    dirLight.intensity = 0.9 * sunRatio;
    ambientLight.color.setHex(isNight ? 0x03030d : 0x070714);
}

// --- MINI-MAP CANVAS VISUALIZER ---
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');

function setupMinimap() {
    minimapCanvas.width = 300;
    minimapCanvas.height = 300;
}
setupMinimap();

function drawMinimap() {
    minimapCtx.fillStyle = 'rgba(2, 2, 6, 0.5)';
    minimapCtx.fillRect(0, 0, 300, 300);

    minimapCtx.strokeStyle = 'rgba(255, 0, 127, 0.2)';
    minimapCtx.lineWidth = 1;
    minimapCtx.beginPath();
    minimapCtx.arc(150, 150, 12, 0, Math.PI * 2);
    ctxStrokeLine(150, 0, 150, 300);
    ctxStrokeLine(0, 150, 300, 150);
    minimapCtx.stroke();

    const scale = 250 / (cityLimit * 2); 
    const translate = 150;

    function getMapPos(x, z) {
        return {
            mx: x * scale + translate,
            my: z * scale + translate
        };
    }

    minimapCtx.strokeStyle = 'rgba(0, 255, 204, 0.12)';
    minimapCtx.lineWidth = 4;
    minimapCtx.beginPath();
    for (let coord = -cityLimit; coord <= cityLimit; coord += blockSize) {
        const road1 = getMapPos(coord, -cityLimit);
        const road2 = getMapPos(coord, cityLimit);
        ctxStrokeLine(road1.mx, road1.my, road2.mx, road2.my);

        const roadX1 = getMapPos(-cityLimit, coord);
        const roadX2 = getMapPos(cityLimit, coord);
        ctxStrokeLine(roadX1.mx, roadX1.my, roadX2.mx, roadX2.my);
    }
    minimapCtx.stroke();

    Object.keys(placedObjects).forEach(key => {
        const group = placedObjects[key];
        const { mx, my } = getMapPos(group.position.x, group.position.z);
        minimapCtx.fillStyle = '#00ffcc';
        minimapCtx.fillRect(mx - 2.5, my - 2.5, 5, 5);
    });

    minimapCtx.fillStyle = '#ffaa00';
    hoverCars.forEach(car => {
        const { mx, my } = getMapPos(car.pos.x, car.pos.z);
        minimapCtx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    });

    minimapCtx.fillStyle = '#ff007f';
    Object.keys(otherPlayers).forEach(id => {
        const p = otherPlayers[id];
        const { mx, my } = getMapPos(p.position.x, p.position.z);
        minimapCtx.beginPath();
        minimapCtx.arc(mx, my, 3.5, 0, Math.PI * 2);
        minimapCtx.fill();
    });

    const selfPos = getMapPos(playerPos.x, playerPos.z);
    minimapCtx.fillStyle = '#ffffff';
    minimapCtx.strokeStyle = '#00ffcc';
    minimapCtx.lineWidth = 1.5;
    
    minimapCtx.beginPath();
    minimapCtx.arc(selfPos.mx, selfPos.my, 4.5, 0, Math.PI * 2);
    minimapCtx.fill();
    minimapCtx.stroke();

    const angleX = selfPos.mx - Math.sin(playerPos.rotation) * 12;
    const angleY = selfPos.my - Math.cos(playerPos.rotation) * 12;
    minimapCtx.beginPath();
    ctxStrokeLine(selfPos.mx, selfPos.my, angleX, angleY);
    minimapCtx.strokeStyle = '#00ffcc';
    minimapCtx.stroke();
}

function ctxStrokeLine(x1, y1, x2, y2) {
    minimapCtx.moveTo(x1, y1);
    minimapCtx.lineTo(x2, y2);
}

function selectTool(toolId) {
    activeTool = toolId;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeBtn = document.getElementById(`tool-${toolId}`);
    if (activeBtn) activeBtn.classList.add('active');

    const rotHelper = document.getElementById('rotation-helper');
    if (activeTool !== 'move' && activeTool !== 'demolish') {
        rotHelper.style.display = 'flex';
    } else {
        rotHelper.style.display = 'none';
    }

    updateHologram(snappedCoords.x, snappedCoords.z, buildBlocked);
}

document.getElementById('tool-move').addEventListener('click', () => selectTool('move'));
document.getElementById('tool-skyscraper').addEventListener('click', () => selectTool('skyscraper'));
document.getElementById('tool-cybertower').addEventListener('click', () => selectTool('cybertower'));
document.getElementById('tool-hovercarpad').addEventListener('click', () => selectTool('hovercarpad'));
document.getElementById('tool-park').addEventListener('click', () => selectTool('park'));
document.getElementById('tool-road').addEventListener('click', () => selectTool('road'));
document.getElementById('tool-demolish').addEventListener('click', () => selectTool('demolish'));

document.getElementById('flight-toggle').addEventListener('click', () => {
    isFlying = !isFlying;
    const btn = document.getElementById('flight-toggle');
    const status = document.getElementById('flight-status');
    if (isFlying) {
        btn.classList.add('active');
        status.innerText = "FLYING";
    } else {
        btn.classList.remove('active');
        status.innerText = "WALKING";
    }
});

// --- COLLISION PHYSICS ENGINE ---
function isColliding(px, pz, py) {
    // Check central monument cone collision
    const distToCenter = Math.sqrt(px * px + pz * pz);
    if (distToCenter < 2.95 && py < 25) {
        return true;
    }

    // Grid lookups for surrounding cells
    const minX = Math.floor((px - 10) / 10) * 10;
    const maxX = Math.ceil((px + 10) / 10) * 10;
    const minZ = Math.floor((pz - 10) / 10) * 10;
    const maxZ = Math.ceil((pz + 10) / 10) * 10;
    
    for (let gx = minX; gx <= maxX; gx += 10) {
        for (let gz = minZ; gz <= maxZ; gz += 10) {
            const key = `${gx},${gz}`;
            const building = occupiedGrid[key];
            if (building) {
                const dx = Math.abs(px - gx);
                const dz = Math.abs(pz - gz);
                
                let collisionRadius = 3.45; // Default for skyscraper (3 + 0.45 player radius)
                let maxCollisionHeight = 40; 
                
                if (building.type === 'cybertower') {
                    collisionRadius = 3.65; // Base radius 3.2 + 0.45
                    maxCollisionHeight = 25;
                } else if (building.type === 'hovercarpad') {
                    collisionRadius = 3.95; // Deck 3.5 + 0.45
                    maxCollisionHeight = 3.0;
                } else if (building.type === 'park') {
                    collisionRadius = 4.45; // Floor 4.0 + 0.45
                    maxCollisionHeight = 8.0; // Trees
                } else if (building.type === 'home') {
                    collisionRadius = 2.45; // Small house (2.0 + 0.45 player radius)
                    maxCollisionHeight = 4.0;
                } else if (building.type === 'cafe' || building.type === 'store') {
                    collisionRadius = 3.45;
                    maxCollisionHeight = 7.0;
                } else if (building.type === 'club' || building.type === 'school' || building.type === 'firestation' || building.type === 'police_station' || building.type === 'mall') {
                    collisionRadius = 3.75;
                    maxCollisionHeight = 10.0;
                } else if (building.type === 'hospital') {
                    collisionRadius = 3.45;
                    maxCollisionHeight = 18.0;
                } else if (building.type === 'hotel') {
                    collisionRadius = 3.45;
                    maxCollisionHeight = 26.0;
                } else if (building.type === 'office') {
                    collisionRadius = 3.45;
                    maxCollisionHeight = 30.0;
                } else if (building.type === 'road') {
                    continue;
                }
                
                if (dx < collisionRadius && dz < collisionRadius) {
                    if (py < maxCollisionHeight) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const rotationSpeed = 0.045;
    if (keys['KeyA']) {
        playerPos.rotation += rotationSpeed;
    }
    if (keys['KeyD']) {
        playerPos.rotation -= rotationSpeed;
    }

    let nextX = playerPos.x;
    let nextZ = playerPos.z;

    if (keys['KeyW']) {
        nextX -= Math.sin(playerPos.rotation) * speed;
        nextZ -= Math.cos(playerPos.rotation) * speed;
    }
    if (keys['KeyS']) {
        nextX += Math.sin(playerPos.rotation) * speed;
        nextZ += Math.cos(playerPos.rotation) * speed;
    }

    // Attempt sliding physics on X and Z axes independently
    if (!isColliding(nextX, playerPos.z, playerPos.y)) {
        playerPos.x = nextX;
    }
    if (!isColliding(playerPos.x, nextZ, playerPos.y)) {
        playerPos.z = nextZ;
    }

    let nextY = playerPos.y;
    if (isFlying) {
        if (keys['Space']) nextY += speed;
        if (keys['ShiftLeft']) nextY -= speed;
    } else {
        if (keys['Space'] && playerPos.y <= 1.0) velocityY = 0.18;
        nextY += velocityY;
        if (nextY > 1.0) velocityY += gravity;
        else { nextY = 1.0; velocityY = 0; }
    }

    if (!isColliding(playerPos.x, playerPos.z, nextY)) {
        playerPos.y = nextY;
    } else {
        velocityY = 0; // stop vertical speed on collision
    }

    myMesh.position.set(playerPos.x, playerPos.y, playerPos.z);
    myMesh.rotation.y = playerPos.rotation;

    emitJetpackFlame();
    updateJetpackParticles();

    const cameraDistance = 12;
    const cameraHeight = 5.5;
    const targetCameraX = playerPos.x + Math.sin(playerPos.rotation) * cameraDistance;
    const targetCameraZ = playerPos.z + Math.cos(playerPos.rotation) * cameraDistance;
    const targetCameraY = playerPos.y + cameraHeight;

    camera.position.x += (targetCameraX - camera.position.x) * 0.085;
    camera.position.z += (targetCameraZ - camera.position.z) * 0.085;
    camera.position.y += (targetCameraY - camera.position.y) * 0.085;
    camera.lookAt(playerPos.x, playerPos.y + 0.5, playerPos.z);

    socket.emit('playerMovement', playerPos);

    for (let i = animatingPlacements.length - 1; i >= 0; i--) {
        const anim = animatingPlacements[i];
        anim.progress += anim.speed;
        if (anim.progress >= 1.0) {
            anim.mesh.scale.set(1, 1, 1);
            animatingPlacements.splice(i, 1);
        } else {
            const ease = Math.sin(anim.progress * Math.PI / 2);
            anim.mesh.scale.set(ease, ease, ease);
        }
    }

    const timeSec = clock.getElapsedTime();
    rotatingRings.forEach(mesh => {
        mesh.rotation.z = timeSec * 0.9;
    });

    billboardTextures.forEach(item => {
        item.texture.offset.y += item.speed;
    });

    crystal.position.y = 26 + Math.sin(timeSec * 2.0) * 0.6;
    crystal.rotation.y = timeSec * 0.7;

    hoverCars.forEach(car => car.update());

    updateParticles();

    updateDayNightCycle();

    drawMinimap();

    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});