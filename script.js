import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
// renderer.shadowMap.enabled = true; 
// renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
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
// stage.receiveShadow = true; 
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

// Create musician arrays to easily manage lava effects
const musicians = [];

// Create singer using textured plane
const createSinger = () => {
    const singerTexture = textureLoader.load('/singer.png');
    const singerMaterial = new THREE.MeshBasicMaterial({
        map: singerTexture,
        transparent: true,
        side: THREE.DoubleSide
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
    const texture = textureLoader.load(imagePath);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH * 0.9, MUSICIAN_PLANE_HEIGHT * 0.9); 
    const backupSinger = new THREE.Mesh(geometry, material);
    
    // Start backup singers off-stage, positioned further back
    // The X position will be updated during animation.
    // The Z position is set here relative to the main singer's plane.
    backupSinger.position.set(-15 + initialPosition[0], (MUSICIAN_PLANE_HEIGHT * 0.9) / 2, initialPosition[2] -1.5); 
    scene.add(backupSinger);
    musicians.push({ mesh: backupSinger, type: 'backup' });
    return backupSinger;
};

// Backup singers - initial positions are for their off-stage starting point.
// Their final animated positions will be further left/right.
// Original X positions were -1.5 and 1.5 relative to center. Let's keep initial relative X the same for the off-stage start.
const backupSinger1 = createBackupSinger('/backup_singer_female.png', [-3.5, 0, 1]); // More left
const backupSinger2 = createBackupSinger('/backup_singer_male.png', [3.5, 0, 1]);  // More right

// Generic function to create a musician plane
const createMusicianPlane = (imagePath, initialPosition, isPlaying = false) => {
    const texture = textureLoader.load(imagePath);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
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

// Function to create lava effect for a musician
const createMusicianLavaEffect = (musician, baseColor) => {
    // Create a group to hold all effect elements
    const effectGroup = new THREE.Group();
    effectGroup.position.copy(musician.position);
    scene.add(effectGroup);
    
    // Initialize particle systems for 3D effect
    const particleCount = 300;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const offsets = new Float32Array(particleCount);
    const scales = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);
    
    // Create particles that follow the outline of the musician silhouette
    const silhouetteWidth = MUSICIAN_PLANE_WIDTH;
    const silhouetteHeight = MUSICIAN_PLANE_HEIGHT;
    
    // Generate particles around the silhouette perimeter with some randomness
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Calculate position on the outline with slight randomization
        let theta;
        let radius;
        
        // Distribute particles along the outline - higher density at outline
        if (i < particleCount * 0.7) {
            // 70% of particles follow a humanoid outline shape
            theta = Math.random() * Math.PI * 2;
            
            // Create a more human-like silhouette shape
            let baseRadius;
            
            // Head region (top 25%)
            if (theta > Math.PI * 1.75 || theta < Math.PI * 0.25) {
                baseRadius = silhouetteWidth * 0.25;
            } 
            // Shoulders (upper sides)
            else if (theta < Math.PI * 0.6 || theta > Math.PI * 1.4) {
                baseRadius = silhouetteWidth * 0.4;
            }
            // Arms/torso (middle)
            else if (theta < Math.PI * 1.0) {
                baseRadius = silhouetteWidth * 0.3 - (Math.abs(theta - Math.PI * 0.8) * 0.2);
            }
            // Legs (bottom)
            else {
                baseRadius = silhouetteWidth * 0.3 - (Math.abs(theta - Math.PI * 1.2) * 0.2);
            }
            
            // Add some randomness to the radius
            const variation = Math.random() * 0.1 * baseRadius;
            radius = baseRadius + variation;
            
            // Adjust Y position based on theta to create humanoid shape
            const normalizedTheta = (theta / (Math.PI * 2));
            const yOffset = silhouetteHeight * 0.5 - silhouetteHeight * normalizedTheta;
            
            positions[i3] = Math.cos(theta) * radius;
            positions[i3 + 1] = yOffset;
            positions[i3 + 2] = Math.sin(theta) * radius * 0.3; // Add some depth
        } else {
            // Remaining particles are distributed throughout the volume with concentration near silhouette
            theta = Math.random() * Math.PI * 2;
            radius = (silhouetteWidth * 0.4) * Math.random();
            
            positions[i3] = Math.cos(theta) * radius;
            positions[i3 + 1] = (Math.random() - 0.5) * silhouetteHeight;
            positions[i3 + 2] = Math.sin(theta) * radius * 0.5; // More depth for volume particles
        }
        
        // Random offset for animation timing
        offsets[i] = Math.random();
        
        // Random scale for particle size variations
        scales[i] = 0.05 + Math.random() * 0.15;
        
        // Random angle for particle rotation
        angles[i] = Math.random() * Math.PI * 2;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('offset', new THREE.BufferAttribute(offsets, 1));
    particleGeometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));
    particleGeometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
    
    // Custom shader material for 3D lava particles
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(baseColor) },
            accentColor: { value: new THREE.Color(0xffffff) },
            audioIntensity: { value: 0.0 }
        },
        vertexShader: `
            uniform float time;
            uniform float audioIntensity;
            
            attribute float offset;
            attribute float scale;
            attribute float angle;
            
            varying vec3 vColor;
            varying float vIntensity;
            
            void main() {
                // Create the flowing effect
                vec3 pos = position;
                
                // Animation control - outward flow from silhouette
                float flowSpeed = 1.0 + audioIntensity * 2.0;
                float life = mod(time * flowSpeed + offset, 1.0);
                
                // Flowing outward from silhouette
                vec3 direction = normalize(position);
                float flowDistance = 1.0 + audioIntensity * 2.0;
                
                // Particles move outward and upward
                pos += direction * life * flowDistance;
                pos.y += life * (1.0 + audioIntensity) * 0.8;
                
                // Add some swirling motion
                float swirl = sin(time * 2.0 + offset * 6.28) * 0.1;
                pos.x += swirl * (1.0 + audioIntensity * 0.5);
                pos.z += cos(time * 2.0 + offset * 6.28) * 0.1 * (1.0 + audioIntensity * 0.5);
                
                // Calculate intensity based on life - fade out
                vIntensity = (1.0 - life) * (1.0 + audioIntensity);
                
                // Size calculation - particles grow then shrink
                float sizeMultiplier = scale * (1.0 - abs(life * 2.0 - 1.0)) * (1.0 + audioIntensity);
                
                // Position in scene
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                
                // Base point size but affected by audio intensity
                gl_PointSize = sizeMultiplier * 35.0 / -mvPosition.z;
                
                // Final position
                gl_Position = projectionMatrix * mvPosition;
                
                // Pass color intensity to fragment shader
                vColor = vec3(vIntensity);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 accentColor;
            uniform float audioIntensity;
            
            varying vec3 vColor;
            varying float vIntensity;
            
            void main() {
                // Create circular particle with soft edge
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(gl_PointCoord, center);
                
                // Discard pixels outside the circle
                if (dist > 0.5) discard;
                
                // Create soft edge
                float softness = 0.05;
                float alpha = smoothstep(0.5, 0.5 - softness, dist);
                
                // Add glow based on distance from center
                float glow = pow(1.0 - dist * 2.0, 2.0);
                
                // Mix colors based on intensity and audio reactivity
                vec3 glowColor = mix(baseColor, accentColor, glow * vIntensity * (1.0 + audioIntensity));
                
                // Make center brighter
                glowColor += accentColor * pow(glow, 3.0) * (1.0 + audioIntensity * 2.0);
                
                // Set final color with alpha
                gl_FragColor = vec4(glowColor, alpha * vIntensity);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    effectGroup.add(particles);
    
    // Create a secondary trailing effect with smaller particles
    const trailCount = 200;
    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    const trailOffsets = new Float32Array(trailCount);
    const trailScales = new Float32Array(trailCount);
    
    for (let i = 0; i < trailCount; i++) {
        const i3 = i * 3;
        const theta = Math.random() * Math.PI * 2;
        const radius = silhouetteWidth * 0.45 * Math.random();
        
        trailPositions[i3] = Math.cos(theta) * radius;
        trailPositions[i3 + 1] = (Math.random() - 0.5) * silhouetteHeight;
        trailPositions[i3 + 2] = Math.sin(theta) * radius * 0.4;
        
        trailOffsets[i] = Math.random();
        trailScales[i] = 0.03 + Math.random() * 0.07;
    }
    
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('offset', new THREE.BufferAttribute(trailOffsets, 1));
    trailGeometry.setAttribute('scale', new THREE.BufferAttribute(trailScales, 1));
    
    // Similar material but with different parameters for trails
    const trailMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(baseColor) },
            accentColor: { value: new THREE.Color(0xffffff) },
            audioIntensity: { value: 0.0 }
        },
        vertexShader: `
            uniform float time;
            uniform float audioIntensity;
            
            attribute float offset;
            attribute float scale;
            
            varying float vIntensity;
            
            void main() {
                // Create more chaotic trailing effect
                vec3 pos = position;
                
                // Animation with different timing
                float flowSpeed = 1.2 + audioIntensity * 1.5;
                float life = mod(time * flowSpeed + offset, 1.0);
                
                // More vertical movement and spread
                vec3 direction = normalize(position);
                float flowDistance = 1.5 + audioIntensity;
                
                pos += direction * life * flowDistance;
                pos.y += life * life * 2.0 * (1.0 + audioIntensity);
                
                // Add turbulence
                float turbulence = sin(time * 3.0 + offset * 10.0) * 0.2;
                pos.x += turbulence * life;
                pos.z += cos(time * 3.0 + offset * 10.0) * 0.2 * life;
                
                vIntensity = (1.0 - life) * (1.0 + audioIntensity * 0.5);
                
                // Size calculation - smaller trailing particles
                float sizeMultiplier = scale * (1.0 - life) * (1.0 + audioIntensity * 0.5);
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_PointSize = sizeMultiplier * 25.0 / -mvPosition.z;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform vec3 accentColor;
            uniform float audioIntensity;
            
            varying float vIntensity;
            
            void main() {
                vec2 center = vec2(0.5, 0.5);
                float dist = distance(gl_PointCoord, center);
                
                if (dist > 0.5) discard;
                
                float alpha = smoothstep(0.5, 0.2, dist) * vIntensity;
                
                // Trails are more base color dominant
                vec3 finalColor = mix(baseColor, accentColor, dist * vIntensity * 0.5);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    
    const trails = new THREE.Points(trailGeometry, trailMaterial);
    effectGroup.add(trails);
    
    // Create an outer glow effect
    const glowGeometry = new THREE.SphereGeometry(silhouetteWidth * 0.6, 16, 16);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            baseColor: { value: new THREE.Color(baseColor) },
            audioIntensity: { value: 0.0 }
        },
        vertexShader: `
            uniform float time;
            uniform float audioIntensity;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vPosition = position;
                vNormal = normal;
                
                // Apply subtle pulsing based on audio
                vec3 pos = position;
                float pulse = sin(time * 2.0) * 0.1 * (1.0 + audioIntensity);
                pos *= 1.0 + pulse;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform float audioIntensity;
            uniform float time;
            
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                // Calculate fresnel effect for edge glow
                vec3 viewDirection = normalize(-vPosition);
                float fresnel = 1.0 - max(0.0, dot(viewDirection, vNormal));
                fresnel = pow(fresnel, 3.0) * (1.0 + audioIntensity);
                
                // Pulsing color intensity
                float pulse = (sin(time * 1.5) * 0.5 + 0.5) * (1.0 + audioIntensity * 0.5);
                
                // Final color with fresnel edge highlighting
                vec3 glowColor = baseColor * 0.5 * pulse;
                float alpha = fresnel * 0.3 * (0.5 + audioIntensity * 0.5);
                
                gl_FragColor = vec4(glowColor, alpha * pulse);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        depthWrite: false
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    effectGroup.add(glow);
    
    return { 
        effectGroup, 
        particles, 
        trails, 
        glow, 
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
    analyser.fftSize = 256;
    
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
        
        // Move camera to focus on guitarist and bassist
        if (currentPlayTime < 10) {
            camera.position.lerp(new THREE.Vector3(0, 2, 6), 0.01);
            camera.lookAt(0, 1, 0);
        } else if (currentPlayTime < 20) {
            camera.position.lerp(new THREE.Vector3(3, 2, 4), 0.01);
            camera.lookAt(guitarist.position);
        } else {
            camera.position.lerp(new THREE.Vector3(-3, 2, 4), 0.01);
            camera.lookAt(bassist.position);
        }
    } else {
        // Return to default camera position after 25 seconds
        if (currentPlayTime < 27) {
            camera.position.lerp(new THREE.Vector3(0, 1.5, 5), 0.01);
            camera.lookAt(0, 1, 0);
        }
        
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
        
        // Get average of bass frequencies
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / 10 / 255;
        
        // Get average of mid frequencies
        let midSum = 0;
        for (let i = 10; i < 100; i++) {
            midSum += dataArray[i];
        }
        const midAvg = midSum / 90 / 255;
        
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

// Update lava animation function
function updateLavaEffects(delta, bassAvg, midAvg, highAvg) {
    for (let i = 0; i < lavaEffects.length; i++) {
        const effect = lavaEffects[i];
        const musician = musicians[i];
        
        if (!effect || !musician) continue;
        
        // Determine audio intensity based on musician type
        let audioIntensity = 0;
        
        if (musician.type === 'guitarist') {
            audioIntensity = midAvg * 2;
        } else if (musician.type === 'bassist') {
            audioIntensity = bassAvg * 2;
        } else if (musician.type === 'drummer') {
            audioIntensity = bassAvg * 3;
        } else if (musician.type === 'singer') {
            audioIntensity = highAvg * 2;
        } else {
            audioIntensity = midAvg * 1.5;
        }
        
        // Only show effects for musicians that are on stage
        const isOnStage = Math.abs(musician.mesh.position.x) < 10;
        
        // Update effect group position to follow musician
        effect.effectGroup.position.copy(musician.mesh.position);
        
        // Update shader uniforms for all components
        if (effect.particles) {
            effect.particles.material.uniforms.time.value = time;
            effect.particles.material.uniforms.audioIntensity.value = isOnStage ? audioIntensity : 0;
        }
        
        if (effect.trails) {
            effect.trails.material.uniforms.time.value = time;
            effect.trails.material.uniforms.audioIntensity.value = isOnStage ? audioIntensity : 0;
        }
        
        if (effect.glow) {
            effect.glow.material.uniforms.time.value = time;
            effect.glow.material.uniforms.audioIntensity.value = isOnStage ? audioIntensity : 0;
        }
        
        // Set visibility based on whether musician is on stage
        effect.effectGroup.visible = isOnStage;
    }
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
    if (dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        
        // Get average of bass frequencies
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / 10 / 255;
        
        // Get average of mid frequencies
        let midSum = 0;
        for (let i = 10; i < 100; i++) {
            midSum += dataArray[i];
        }
        const midAvg = midSum / 90 / 255;
        
        // Get average of high frequencies
        let highSum = 0;
        for (let i = 100; i < 200; i++) {
            highSum += dataArray[i];
        }
        const highAvg = highSum / 100 / 255;
        
        // Update lava effects with audio data
        updateLavaEffects(delta, bassAvg, midAvg, highAvg);
    }
    
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