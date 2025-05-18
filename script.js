import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 10, 50);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI / 2;

// Lights
const ambientLight = new THREE.AmbientLight(0x222222); // Dimmer ambient light
scene.add(ambientLight);

// Stage Lighting
const createSpotlight = (color, intensity, position, target) => {
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(...position);
    light.angle = Math.PI / 6;
    light.penumbra = 0.3;
    light.decay = 2;
    light.distance = 30;
    
    if (target) {
        light.target.position.set(...target);
        scene.add(light.target);
    }
    
    scene.add(light);
    return light;
};

// Main spotlights
const spotLights = [
    createSpotlight(0xff0000, 2, [-4, 5, 2], [0, 0, 0]),  
    createSpotlight(0x0000ff, 2, [4, 5, 2], [0, 0, 0]),   
    createSpotlight(0xffffff, 1.5, [0, 5, -2], [0, 0, 0]),  
];

// Musician-specific spotlights
const guitaristSpot = createSpotlight(0xff9900, 3, [3, 5, 0], [2, 0, -1]);
const bassistSpot = createSpotlight(0x0099ff, 3, [-3, 5, 0], [-2, 0, 0]);
const singerSpot = createSpotlight(0xffffff, 0, [0, 5, 1], [0, 1, 0]);
const drummerSpot = createSpotlight(0x9900ff, 0, [-2, 5, -1], [-2, 1, -2]);
const backupSpot1 = createSpotlight(0xff6699, 0, [-4, 5, 0], [-3.5, 1, 1]);
const backupSpot2 = createSpotlight(0x66ff99, 0, [4, 5, 0], [3.5, 1, 1]);

// Moving lights
const movingLights = [];
for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x = Math.cos(angle) * 5;
    const z = Math.sin(angle) * 5;
    
    const light = createSpotlight(
        new THREE.Color().setHSL(i / 8, 1, 0.5).getHex(),
        1.5,
        [x, 4, z],
        [0, 0, 0]
    );
    movingLights.push(light);
}

// Create stage
const stageGeometry = new THREE.BoxGeometry(12, 0.5, 8);
const textureLoader = new THREE.TextureLoader();
const stageTexture = textureLoader.load('/stage_floor.png');
stageTexture.wrapS = THREE.RepeatWrapping;
stageTexture.wrapT = THREE.RepeatWrapping;
stageTexture.repeat.set(4, 3);
const stageMaterial = new THREE.MeshPhongMaterial({ map: stageTexture }); 
const stage = new THREE.Mesh(stageGeometry, stageMaterial);
stage.position.y = -0.25;
scene.add(stage);

// Back wall with lighting effects and curtains
const backWallGeometry = new THREE.BoxGeometry(14, 8, 0.5);
const backdropTexture = textureLoader.load('/stage_backdrop.png');
const backWallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, 
    map: backdropTexture,
    emissive: 0x333333,
    emissiveMap: backdropTexture
});
const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWall.position.set(0, 4, -4);
scene.add(backWall);

const MUSICIAN_PLANE_WIDTH = 1.8;
const MUSICIAN_PLANE_HEIGHT = 3;

// Create musician arrays to easily manage effects
const musicians = [];

// Create singer using textured plane
const createSinger = () => {
    const singerTexture = textureLoader.load('/singer.png', (texture) => {
        texture.premultiplyAlpha = false; // Important for proper transparency
    });
    const singerMaterial = new THREE.MeshBasicMaterial({
        map: singerTexture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1 // Helps with transparency edge issues
    });
    const singerGeometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH, MUSICIAN_PLANE_HEIGHT);
    const singerMesh = new THREE.Mesh(singerGeometry, singerMaterial);
    singerMesh.position.set(0, MUSICIAN_PLANE_HEIGHT / 2, 0);
    
    // Start singer off-stage (will come in at 27.5 seconds)
    singerMesh.position.x = -15;
    
    scene.add(singerMesh);
    musicians.push({ mesh: singerMesh, type: 'singer' });
    return singerMesh;
};

const singer = createSinger();

// Create backup singers
const createBackupSinger = (imagePath, initialPosition) => {
    const texture = textureLoader.load(imagePath, (texture) => {
        texture.premultiplyAlpha = false; // Important for proper transparency
    });
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1 // Helps with transparency edge issues
    });
    const geometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH * 0.9, MUSICIAN_PLANE_HEIGHT * 0.9); 
    const backupSinger = new THREE.Mesh(geometry, material);
    
    // Start backup singers off-stage, positioned further back
    backupSinger.position.set(-15 + initialPosition[0], (MUSICIAN_PLANE_HEIGHT * 0.9) / 2, initialPosition[2] -1.5); 
    scene.add(backupSinger);
    musicians.push({ mesh: backupSinger, type: 'backup' });
    return backupSinger;
};

// Backup singers - initial positions are for their off-stage starting point.
const backupSinger1 = createBackupSinger('/backup_singer_female.png', [-3.5, 0, 1]); // More left
const backupSinger2 = createBackupSinger('/backup_singer_male.png', [3.5, 0, 1]);  // More right

// Generic function to create a musician plane
const createMusicianPlane = (imagePath, initialPosition, isPlaying = false) => {
    const texture = textureLoader.load(imagePath, (texture) => {
        texture.premultiplyAlpha = false; // Important for proper transparency
    });
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        alphaTest: 0.1 // Helps with transparency edge issues
    });
    const geometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH, MUSICIAN_PLANE_HEIGHT);
    const musician = new THREE.Mesh(geometry, material);
    musician.position.set(initialPosition[0], MUSICIAN_PLANE_HEIGHT / 2, initialPosition[2]);
    musician.userData.isPlaying = isPlaying;
    scene.add(musician);
    musicians.push({ mesh: musician, type: imagePath.includes('guitarist') ? 'guitarist' : 
                          imagePath.includes('bassist') ? 'bassist' : 'drummer' });
    return musician;
};

// Guitarist - on-stage from the start and actively playing
const guitarist = createMusicianPlane('/guitarist.png', [2, 0, -1], true);

// Bassist - on-stage from the start and actively playing
const bassist = createMusicianPlane('/bassist.png', [-2, 0, 0], true);

// Drummer - starts off-stage
const drummer = createMusicianPlane('/drummer.png', [-15, 0, -2], false);

// Function to create the edge-based lava effect for a musician
const createMusicianLavaEffect = (musician, baseColor) => {
    // Create a group to hold the effect
    const effectGroup = new THREE.Group();
    effectGroup.position.copy(musician.position);
    scene.add(effectGroup);
    
    const width = MUSICIAN_PLANE_WIDTH;
    const height = MUSICIAN_PLANE_HEIGHT;
    
    // Edge detection parameters
    const edgeCount = 80; // Number of edge points to detect
    const particlesPerEdge = 60; // Number of particles per edge point
    
    // Create an array to store edge points
    const edgePoints = [];
    
    // Generate edge points around musician silhouette
    for (let i = 0; i < edgeCount; i++) {
        const angle = (i / edgeCount) * Math.PI * 2;
        
        // Create human-like silhouette shape
        let radius;
        
        // Head (top)
        if (angle > Math.PI * 1.75 || angle < Math.PI * 0.25) {
            radius = width * 0.25;
        } 
        // Shoulders (upper sides)
        else if (angle < Math.PI * 0.6 || angle > Math.PI * 1.4) {
            radius = width * 0.4;
        }
        // Arms/torso (middle)
        else if (angle < Math.PI * 1.0) {
            radius = width * 0.3 - (Math.abs(angle - Math.PI * 0.8) * 0.2);
        }
        // Legs (bottom)
        else {
            radius = width * 0.3 - (Math.abs(angle - Math.PI * 1.2) * 0.2);
        }
        
        // Adjust Y position based on angle to create humanoid shape
        const normalizedAngle = (angle / (Math.PI * 2));
        const yOffset = height * 0.5 - height * normalizedAngle;
        
        // Store edge point
        edgePoints.push({
            x: Math.cos(angle) * radius,
            y: yOffset,
            z: Math.sin(angle) * radius * 0.2,
            angle: angle
        });
    }
    
    // Create particle geometry for edge-based effect
    const particleCount = edgeCount * particlesPerEdge;
    const particleGeometry = new THREE.BufferGeometry();
    
    // Create arrays for particles
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);
    const offsets = new Float32Array(particleCount);
    const edgeIndices = new Float32Array(particleCount);
    
    // Create particles starting from each edge point
    for (let i = 0; i < edgeCount; i++) {
        const edgePoint = edgePoints[i];
        
        for (let j = 0; j < particlesPerEdge; j++) {
            const idx = (i * particlesPerEdge + j);
            const i3 = idx * 3;
            
            // Start positions at edge points
            positions[i3] = edgePoint.x; 
            positions[i3 + 1] = edgePoint.y;
            positions[i3 + 2] = edgePoint.z;
            
            // Convert base color to RGB
            const color = new THREE.Color(baseColor);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            // Random sizes
            sizes[idx] = 0.05 + Math.random() * 0.15;
            
            // Random angles
            angles[idx] = Math.random() * Math.PI * 2;
            
            // Offset for animation timing
            offsets[idx] = Math.random();
            
            // Store edge index for animation
            edgeIndices[idx] = i;
        }
    }
    
    // Set attributes
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
    particleGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
    particleGeometry.setAttribute('edgeIndex', new THREE.BufferAttribute(edgeIndices, 1));
    
    // Edge lava shader
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(baseColor) },
            accentColor: { value: new THREE.Color(0xffffff) },
            audioLow: { value: 0.0 },
            audioMid: { value: 0.0 },
            audioHigh: { value: 0.0 },
            edgeCount: { value: edgeCount }
        },
        vertexShader: `
            uniform float time;
            uniform float audioLow;
            uniform float audioMid;
            uniform float audioHigh;
            uniform int edgeCount;
            
            attribute float size;
            attribute float angle;
            attribute float offset;
            attribute float edgeIndex;
            attribute vec3 color;
            
            varying vec3 vColor;
            varying float vAlpha;
            
            // Noise function for realistic flowing
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
            
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                
                // First corner
                vec3 i  = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                
                // Other corners
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                
                // Permutations
                i = mod289(i);
                vec4 p = permute(permute(permute(
                           i.z + vec4(0.0, i1.z, i2.z, 1.0))
                         + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                         + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                
                // Gradients
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
                
                vec3 p0 = vec3(a0.xy, h.x);
                vec3 p1 = vec3(a0.zw, h.y);
                vec3 p2 = vec3(a1.xy, h.z);
                vec3 p3 = vec3(a1.zw, h.w);
                
                // Normalise gradients
                vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;
                
                // Mix final noise value
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
            
            void main() {
                // Use edge index to maintain coherence along silhouette
                float edgePos = edgeIndex / float(edgeCount);
                
                // Create flowing effect parameters
                float flowSpeed = 0.8 + audioLow * 1.5;
                float life = mod(time * flowSpeed + offset, 1.0);
                
                // Get the original edge position
                vec3 pos = position;
                
                // Calculate main flow direction - outward from silhouette edge
                float edgeAngle = edgePos * 3.14159265 * 2.0;
                vec3 flowDir = vec3(cos(edgeAngle), sin(edgeAngle) * 0.8, sin(edgeAngle) * 0.2);
                
                // Add flowing noise
                float noiseTime = time * 0.5;
                float noiseX = snoise(vec3(edgePos * 8.0, life * 2.0, noiseTime)) * 0.3;
                float noiseY = snoise(vec3(edgePos * 8.0 + 100.0, life * 2.0, noiseTime)) * 0.3;
                float noiseZ = snoise(vec3(edgePos * 8.0 + 200.0, life * 2.0, noiseTime)) * 0.1;
                
                // Apply audio reactivity
                float flowDistance = 1.2 + audioMid * 2.0 + audioLow * 1.0;
                float flowTurbulence = 0.3 + audioHigh * 0.8;
                
                // Final position calculation
                pos += flowDir * life * flowDistance;
                pos.x += noiseX * flowTurbulence * (1.0 + audioMid * 2.0);
                pos.y += life * 1.2 + noiseY * flowTurbulence * (1.0 + audioLow * 2.0); // More upward flow
                pos.z += noiseZ * flowTurbulence * (1.0 + audioHigh * 1.0);
                
                // Alpha based on life cycle
                vAlpha = smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.5, 1.0, life));
                
                // Color calculation
                float hueShift = audioHigh * 0.2 + audioMid * 0.1;
                vColor = color;
                if (hueShift > 0.0) {
                    // Simple hue shift approximation
                    float angle = hueShift * 3.14159265 * 2.0;
                    float s = sin(angle);
                    float c = cos(angle);
                    vec3 weights = vec3(0.3333, 0.3333, 0.3333);
                    float A = weights.x + weights.y + weights.z;
                    mat3 rotMat = mat3(
                        weights.x + c * (1.0 - weights.x) + s * 0.0,
                        weights.x + c * (0.0 - weights.x) + s * -weights.z,
                        weights.x + c * (0.0 - weights.x) + s * weights.y,
                        weights.y + c * (0.0 - weights.y) + s * weights.z,
                        weights.y + c * (1.0 - weights.y) + s * 0.0,
                        weights.y + c * (0.0 - weights.y) + s * -weights.x,
                        weights.z + c * (0.0 - weights.z) + s * -weights.y,
                        weights.z + c * (0.0 - weights.z) + s * weights.x,
                        weights.z + c * (1.0 - weights.z) + s * 0.0
                    );
                    vColor = rotMat * color;
                }
                
                // Size calculation - particles grow then shrink with audio reactivity
                float sizeFactor = size * (1.0 + audioMid * 2.0 + audioLow * 1.0);
                float sizeMultiplier = sizeFactor * (1.0 - abs(life * 2.0 - 1.0) * 0.8);
                
                // Final position
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = sizeMultiplier * 40.0 / -mvPosition.z;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 accentColor;
            uniform float audioLow;
            uniform float audioMid;
            uniform float audioHigh;
            
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                // Create circular particle with soft edge
                vec2 uv = gl_PointCoord.xy - 0.5;
                float dist = length(uv);
                
                if (dist > 0.5) discard;
                
                // Soft edge
                float edge = smoothstep(0.5, 0.4, dist);
                
                // Add inner glow based on distance from center
                float glow = pow(1.0 - dist * 2.0, 2.0);
                
                // Audio-reactive glow
                float audioGlow = audioLow * 0.5 + audioMid * 0.3 + audioHigh * 0.2;
                
                // Mix colors based on audio
                vec3 innerColor = mix(vColor, accentColor, glow * (0.7 + audioGlow));
                
                // More intense core based on audio
                innerColor += vec3(1.0, 1.0, 1.0) * pow(glow, 5.0) * (1.0 + audioHigh * 3.0);
                
                // Final alpha
                float alpha = edge * vAlpha * (0.8 + audioGlow * 0.5);
                
                gl_FragColor = vec4(innerColor, alpha);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    effectGroup.add(particles);
    
    return {
        effectGroup,
        particles,
        baseColor
    };
};

// Initialize lava effects for all musicians
const lavaEffects = [];

function initializeLavaEffects() {
    // Clear any existing effects first
    for (const effect of lavaEffects) {
        if (effect.effectGroup) scene.remove(effect.effectGroup);
    }
    lavaEffects.length = 0;
    
    // Create unique colors for each musician type
    const colorMap = {
        'guitarist': 0xff3300,    // Orange-red
        'bassist': 0x0099ff,      // Blue
        'singer': 0xffff00,       // Yellow
        'backup': 0xff00ff,       // Magenta
        'drummer': 0x00ff66       // Green
    };
    
    // Add lava effect to each musician
    for (const musician of musicians) {
        const baseColor = colorMap[musician.type];
        const effect = createMusicianLavaEffect(musician.mesh, baseColor);
        lavaEffects.push(effect);
    }
}

// Audio setup
const audioElement = document.getElementById('music');
let analyser, dataArray;

function setupAudio() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioElement);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024; // Higher resolution for better frequency data
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
}

// Animation variables
let isPlaying = false;
let time = 0;
let currentPlayTime = 0;

// Band members entrance flags - to prevent multiple triggers
let singerEntered = false;
let drummerEntered = false;

// Camera animation sequences
const cameraSequences = [
    { startTime: 0, endTime: 10, position: new THREE.Vector3(0, 2, 6), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 },
    { startTime: 10, endTime: 17, position: new THREE.Vector3(3, 2, 4), lookAt: new THREE.Vector3(2, 1, -1), easing: 0.01 }, // Guitar focus
    { startTime: 17, endTime: 25, position: new THREE.Vector3(-3, 2, 4), lookAt: new THREE.Vector3(-2, 1, 0), easing: 0.01 }, // Bass focus
    { startTime: 25, endTime: 27.5, position: new THREE.Vector3(0, 1.5, 5), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, // Wide shot
    { startTime: 27.5, endTime: 40, position: new THREE.Vector3(2, 2, 5), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.005 }, // Singer entrance
    { startTime: 40, endTime: 47, position: new THREE.Vector3(-4, 2, 3), lookAt: new THREE.Vector3(-3.5, 1, 1), easing: 0.01 }, // Backup singer 1
    { startTime: 47, endTime: 55, position: new THREE.Vector3(4, 2, 3), lookAt: new THREE.Vector3(3.5, 1, 1), easing: 0.01 }, // Backup singer 2
    { startTime: 55, endTime: 70, position: new THREE.Vector3(-3, 3, 1), lookAt: new THREE.Vector3(-2, 1, -2), easing: 0.005 }, // Drummer entrance
    { startTime: 70, endTime: 80, position: new THREE.Vector3(0, 3, 6), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, // Full band
    { startTime: 80, endTime: 90, position: new THREE.Vector3(4, 2, 3), lookAt: new THREE.Vector3(2, 1, -1), easing: 0.01 }, // Guitar solo
    { startTime: 90, endTime: 100, position: new THREE.Vector3(-4, 2, 3), lookAt: new THREE.Vector3(-2, 1, 0), easing: 0.01 }, // Bass solo
    { startTime: 100, endTime: 110, position: new THREE.Vector3(1, 2, 4), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, // Singer close-up
    { startTime: 110, endTime: 120, position: new THREE.Vector3(-3, 3, 0), lookAt: new THREE.Vector3(-2, 1, -2), easing: 0.01 }, // Drummer solo
    // Continue cycling through band members after 120 seconds
];

// Animation for band member entrances
function animateBandEntrances() {
    currentPlayTime = audioElement.currentTime;
    
    // Lead singer and backup singers enter at 27.5 seconds
    if (currentPlayTime >= 27.5 && !singerEntered) {
        singerEntered = true;
        
        // Fade in singer spotlight
        new TWEEN.Tween(singerSpot)
            .to({ intensity: 4 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Fade in backup singer spotlights
        new TWEEN.Tween(backupSpot1)
            .to({ intensity: 2 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSpot2)
            .to({ intensity: 2 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        // Animate singer coming in from off-stage
        new TWEEN.Tween(singer.position)
            .to({ x: 0 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Animate backup singers to their new wider positions
        new TWEEN.Tween(backupSinger1.position)
            .to({ x: -3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSinger2.position)
            .to({ x: 3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
    
    // Drummer enters at 55 seconds
    if (currentPlayTime >= 55 && !drummerEntered) {
        drummerEntered = true;
        
        // Fade in drummer spotlight
        new TWEEN.Tween(drummerSpot)
            .to({ intensity: 3.5 }, 1500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        // Animate drummer coming in
        new TWEEN.Tween(drummer.position)
            .to({ x: -2 }, 1500) 
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
}

// Specialized animation function for guitarist and bassist in first 25 seconds
function animateMusiciansFirstSegment(time, bassAvg, midAvg) {
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; 

    // More energetic movements for guitarist and bassist in the first 25 seconds
    if (currentPlayTime < 25) {
        // Guitarist energetic playing
        guitarist.position.y = musicianBaseY + Math.sin(time * 5) * 0.15 * midAvg;
        guitarist.rotation.x = Math.sin(time * 4) * 0.1 * midAvg;
        
        // Bassist movement timed with bass notes
        bassist.position.y = musicianBaseY + Math.sin(time * 3) * 0.12 * bassAvg;
        bassist.rotation.x = Math.sin(time * 2.5) * 0.08 * bassAvg;
    } else {
        // Regular musician animations after 25 seconds
        guitarist.position.y = musicianBaseY + Math.sin(time * 2) * 0.1 * midAvg;
        bassist.position.y = musicianBaseY + Math.sin(time * 4) * 0.1 * bassAvg;
    }
}

// Camera movement based on current time
function updateCameraPosition() {
    if (!isPlaying) return;
    
    // Find the current sequence based on playback time
    const currentSequence = cameraSequences.find(seq => 
        currentPlayTime >= seq.startTime && currentPlayTime < seq.endTime
    );
    
    // If we've gone past all defined sequences, cycle through band members
    if (!currentSequence && currentPlayTime >= 120) {
        const cycleTime = ((currentPlayTime - 120) % 40); // 10 seconds per band member
        
        if (cycleTime < 10) {
            // Singer
            camera.position.lerp(new THREE.Vector3(0, 2, 4), 0.01);
            camera.lookAt(singer.position);
        } else if (cycleTime < 20) {
            // Guitarist
            camera.position.lerp(new THREE.Vector3(3, 2, 3), 0.01);
            camera.lookAt(guitarist.position);
        } else if (cycleTime < 30) {
            // Bassist
            camera.position.lerp(new THREE.Vector3(-3, 2, 3), 0.01);
            camera.lookAt(bassist.position);
        } else {
            // Drummer
            camera.position.lerp(new THREE.Vector3(-2, 3, 1), 0.01);
            camera.lookAt(drummer.position);
        }
        return;
    }
    
    // Apply camera sequence if found
    if (currentSequence) {
        camera.position.lerp(currentSequence.position, currentSequence.easing);
        camera.lookAt(currentSequence.lookAt);
    }
}

// Light animation with spotlight focus
function animateLights(delta) {
    time += delta;
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; 
    const backupSingerBaseY = (MUSICIAN_PLANE_HEIGHT * 0.9) / 2; 

    // Update spotlight targets to follow musicians
    if (isPlaying) {
        // Update spotlight targets
        guitaristSpot.target.position.copy(guitarist.position);
        bassistSpot.target.position.copy(bassist.position);
        
        if (singerEntered) {
            singerSpot.target.position.copy(singer.position);
            backupSpot1.target.position.copy(backupSinger1.position);
            backupSpot2.target.position.copy(backupSinger2.position);
        }
        
        if (drummerEntered) {
            drummerSpot.target.position.copy(drummer.position);
        }
        
        // Strobe effect for moving lights
        if (currentPlayTime > 55) { // After drummer comes in
            movingLights.forEach((light, i) => {
                // More energetic pattern after drummer
                const pulseRate = 0.5 + Math.sin(time * 2) * 0.3;
                light.intensity = 1 + Math.sin(time * 10 + i * 0.5) * pulseRate;
            });
        }
    }

    // Animate moving lights
    movingLights.forEach((light, i) => {
        const angle = time * 0.5 + (i / movingLights.length) * Math.PI * 2;
        const x = Math.cos(angle) * 6;
        const z = Math.sin(angle) * 6;
        light.position.set(x, 4 + Math.sin(time * 2 + i) * 0.5, z);
    });
    
    // Pulse main lights with bass
    if (dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        
        // Get average of bass frequencies (0-100Hz)
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / 10 / 255;
        
        // Get average of mid frequencies (100-2000Hz)
        let midSum = 0;
        for (let i = 10; i < 100; i++) {
            midSum += dataArray[i];
        }
        const midAvg = midSum / 90 / 255;
        
        // Get average of high frequencies (2000Hz+)
        let highSum = 0;
        for (let i = 100; i < 200; i++) {
            highSum += dataArray[i];
        }
        const highAvg = highSum / 100 / 255;
        
        // Adjust spotlight intensities based on music and current focus
        spotLights[0].intensity = 2 + bassAvg * 5;
        spotLights[1].intensity = 2 + midAvg * 5;
        
        // Enhancement for musician-specific spotlights
        if (currentPlayTime < 27.5) {
            // First section: focus on guitarist and bassist
            guitaristSpot.intensity = 3 + midAvg * 3;
            bassistSpot.intensity = 3 + bassAvg * 3;
        } else if (currentPlayTime < 55) {
            // Second section: focus on singer and backup singers
            guitaristSpot.intensity = 2 + midAvg * 2;
            bassistSpot.intensity = 2 + bassAvg * 2;
            if (singerEntered) {
                singerSpot.intensity = 4 + midAvg * 4;
                backupSpot1.intensity = 2 + midAvg * 2;
                backupSpot2.intensity = 2 + midAvg * 2;
            }
        } else {
            // After drummer enters
            const timePhase = ((currentPlayTime - 55) % 40) / 40; // 0 to 1 phase over 40 seconds
            
            // Cycle spotlight intensities based on who's in focus
            if (timePhase < 0.25) {
                // Drummer focus
                drummerSpot.intensity = 3.5 + bassAvg * 3;
                guitaristSpot.intensity = 1.5 + midAvg;
                bassistSpot.intensity = 1.5 + bassAvg;
                singerSpot.intensity = 2 + midAvg;
                backupSpot1.intensity = 1 + midAvg * 0.5;
                backupSpot2.intensity = 1 + midAvg * 0.5;
            } else if (timePhase < 0.5) {
                // Singer focus
                drummerSpot.intensity = 2 + bassAvg;
                guitaristSpot.intensity = 2 + midAvg;
                bassistSpot.intensity = 2 + bassAvg;
                singerSpot.intensity = 4 + midAvg * 4;
                backupSpot1.intensity = 2 + midAvg * 1.5;
                backupSpot2.intensity = 2 + midAvg * 1.5;
            } else if (timePhase < 0.75) {
                // Guitarist focus
                drummerSpot.intensity = 2 + bassAvg;
                guitaristSpot.intensity = 3.5 + midAvg * 3;
                bassistSpot.intensity = 1.5 + bassAvg;
                singerSpot.intensity = 2 + midAvg;
                backupSpot1.intensity = 1 + midAvg * 0.5;
                backupSpot2.intensity = 1 + midAvg * 0.5;
            } else {
                // Bassist focus
                drummerSpot.intensity = 2 + bassAvg;
                guitaristSpot.intensity = 1.5 + midAvg;
                bassistSpot.intensity = 3.5 + bassAvg * 3;
                singerSpot.intensity = 2 + midAvg;
                backupSpot1.intensity = 1 + midAvg * 0.5;
                backupSpot2.intensity = 1 + midAvg * 0.5;
            }
        }
        
        // Animate musicians based on timeline
        animateMusiciansFirstSegment(time, bassAvg, midAvg);
        
        // Make singer move slightly with music (only if they're on stage)
        if (singerEntered) {
            singer.position.y = musicianBaseY + Math.sin(time * 3) * 0.1 * midAvg;
            singer.rotation.z = Math.sin(time * 2) * 0.05 * midAvg;
            
            // Backup singers movement
            backupSinger1.position.y = backupSingerBaseY + Math.sin(time * 3 + 0.5) * 0.08 * midAvg; 
            backupSinger1.rotation.z = Math.sin(time * 2 + 0.5) * 0.03 * midAvg;
            backupSinger2.position.y = backupSingerBaseY + Math.sin(time * 3 + 1) * 0.08 * midAvg; 
            backupSinger2.rotation.z = Math.sin(time * 2 + 1) * 0.03 * midAvg;
        }
        
        // Drummer movement (only if on stage)
        if (drummerEntered) {
            drummer.position.y = musicianBaseY + Math.sin(time * 8) * 0.15 * bassAvg;
            // Add a bit of rotation for the drummer for more dynamism
            drummer.rotation.y = Math.sin(time * 0.5) * 0.1; 
        }
    }
}

// Update lava effects with audio data
function updateLavaEffects() {
    if (!dataArray || !isPlaying) return;
    
    // Get audio frequency data
    analyser.getByteFrequencyData(dataArray);
    
    // Process frequency bands
    const bassAvg = getAverageFrequencyInRange(0, 10) / 255;
    const lowMidAvg = getAverageFrequencyInRange(10, 40) / 255;
    const midAvg = getAverageFrequencyInRange(40, 80) / 255;
    const highMidAvg = getAverageFrequencyInRange(80, 120) / 255;
    const highAvg = getAverageFrequencyInRange(120, 200) / 255;
    
    // Update each musician's lava effect
    for (let i = 0; i < lavaEffects.length; i++) {
        const effect = lavaEffects[i];
        const musician = musicians[i];
        
        if (!effect || !musician) continue;
        
        // Only show effects for musicians that are on stage
        const isOnStage = Math.abs(musician.mesh.position.x) < 10;
        if (!isOnStage) {
            effect.effectGroup.visible = false;
            continue;
        }
        
        effect.effectGroup.visible = true;
        
        // Update effect group position to follow musician
        effect.effectGroup.position.copy(musician.mesh.position);
        
        // Determine audio intensity based on musician type
        let audioLowValue = 0;
        let audioMidValue = 0;
        let audioHighValue = 0;
        
        if (musician.type === 'guitarist') {
            audioLowValue = lowMidAvg;
            audioMidValue = midAvg * 1.5;
            audioHighValue = highMidAvg;
        } else if (musician.type === 'bassist') {
            audioLowValue = bassAvg * 1.8;
            audioMidValue = lowMidAvg;
            audioHighValue = midAvg * 0.5;
        } else if (musician.type === 'drummer') {
            audioLowValue = bassAvg * 1.5;
            audioMidValue = lowMidAvg;
            audioHighValue = highAvg * 0.7;
        } else if (musician.type === 'singer') {
            audioLowValue = lowMidAvg * 0.7;
            audioMidValue = midAvg;
            audioHighValue = highAvg * 1.5;
        } else {
            // Backup singers
            audioLowValue = lowMidAvg * 0.6;
            audioMidValue = midAvg * 0.8;
            audioHighValue = highAvg;
        }
        
        // Update shader uniforms
        if (effect.particles) {
            effect.particles.material.uniforms.time.value = time;
            effect.particles.material.uniforms.audioLow.value = audioLowValue;
            effect.particles.material.uniforms.audioMid.value = audioMidValue;
            effect.particles.material.uniforms.audioHigh.value = audioHighValue;
        }
    }
}

// Helper function to get average frequency in a range
function getAverageFrequencyInRange(start, end) {
    let sum = 0;
    for (let i = start; i < end; i++) {
        sum += dataArray[i];
    }
    return sum / (end - start);
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update controls - disable controls when music is playing for choreographed camera moves
    if (!isPlaying) {
        controls.update();
    }
    
    // Update TWEEN animations
    TWEEN.update();
    
    // Animate band entrances based on song time
    if (isPlaying) {
        animateBandEntrances();
        updateCameraPosition();
    }
    
    // Animate scene elements
    animateLights(delta);
    
    // Update lava effects with audio data
    updateLavaEffects();
    
    // Render scene
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Play button event
document.getElementById('playBtn').addEventListener('click', () => {
    if (!isPlaying) {
        if (!analyser) {
            setupAudio();
        }
        audioElement.play();
        isPlaying = true;
        document.getElementById('playBtn').textContent = '❚❚ PAUSE';
        
        // Disable orbit controls when playing for choreographed camera moves
        controls.enabled = false;
        
        // Initialize lava effects when play starts
        if (lavaEffects.length === 0) {
            initializeLavaEffects();
        }
    } else {
        audioElement.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ PLAY MUSIC VIDEO';
        
        // Re-enable orbit controls when paused
        controls.enabled = true;
    }
});

// Initialize
const loading = document.getElementById('loading');

// Hide loading screen when everything is ready
window.addEventListener('load', () => {
    // A small delay to ensure all assets might be starting to load
    setTimeout(() => {
        const allMedia = Array.from(document.querySelectorAll('audio, video, img'));
        let loadedCount = 0;
        const totalMedia = allMedia.length;

        if (totalMedia === 0) {
            hideLoadingScreen();
            return;
        }

        allMedia.forEach(media => {
            if (media.complete || media.readyState >= 2 || media.tagName !== 'IMG' && media.tagName !== 'AUDIO' && media.tagName !== 'VIDEO') { 
                loadedCount++;
                if (loadedCount === totalMedia) hideLoadingScreen();
            } else {
                media.addEventListener('loadeddata', checkAllLoaded); 
                media.addEventListener('load', checkAllLoaded);       
                media.addEventListener('error', checkAllLoaded);      
            }
        });

        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount === totalMedia) {
                hideLoadingScreen();
            }
        }
        
        // Fallback timeout in case some events don't fire
        setTimeout(hideLoadingScreen, 5000);
    }, 500); 
});

function hideLoadingScreen() {
    if (loading.style.opacity !== "0") { 
        loading.style.opacity = 0;
        setTimeout(() => {
            loading.style.display = 'none';
        }, 1000); 
    }
}

// Start animation
animate();