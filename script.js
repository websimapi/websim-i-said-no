import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- SIMPLIFIED MUSICIAN SHADER ---
const musicianVertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const musicianFragmentShader = `
    uniform sampler2D map;
    uniform float time;
    uniform float bassIntensity;
    uniform float midIntensity;
    uniform float trebleIntensity;
    uniform vec3 glowColor;

    varying vec2 vUv;

    void main() {
        vec4 texColor = texture2D(map, vUv);

        if (texColor.a < 0.05) { // If transparent, discard
            discard;
        }

        float musicPower = (bassIntensity + midIntensity + trebleIntensity) / 3.0;
        musicPower = pow(musicPower, 1.5); // Emphasize peaks

        // Pulsating brightness based on bass
        float brightnessPulse = 1.0 + sin(time * 6.0 + bassIntensity * 5.0) * 0.4 * bassIntensity;
        brightnessPulse = mix(1.0, brightnessPulse, musicPower * 0.8);

        // Tint musician's color towards glowColor based on overall music power
        vec3 finalColor = texColor.rgb;
        finalColor = mix(finalColor, glowColor, musicPower * 0.4);
        finalColor *= brightnessPulse;

        // Subtle edge highlight based on mid frequencies
        float edgeHighlightIntensity = 0.0;
        if (texColor.a > 0.05 && texColor.a < 0.95) { // On semi-transparent edges
            edgeHighlightIntensity = midIntensity * 0.6 * (0.5 + sin(time * 10.0) * 0.5);
        }
        finalColor += glowColor * edgeHighlightIntensity;
        finalColor = clamp(finalColor, 0.0, 1.0); // Ensure colors stay valid

        gl_FragColor = vec4(finalColor, texColor.a);
    }
`;

// --- PARTICLE SHADERS ---
const particleVertexShader = `
    uniform float bassIntensity;
    uniform float midIntensity;
    uniform float trebleIntensity;

    attribute float lifetime;
    attribute float initialLifetime;
    attribute vec3 customColor;
    attribute float initialSize;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        vColor = customColor;

        if (lifetime <= 0.0 || initialLifetime <= 0.0) {
            gl_PointSize = 0.0;
            vAlpha = 0.0;
        } else {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

            float musicPower = (bassIntensity + midIntensity + trebleIntensity) / 3.0;
            float sizeFactor = 0.3 + musicPower * 1.5; 
            sizeFactor = max(0.1, sizeFactor);

            float lifetimeRatio = lifetime / initialLifetime;
            gl_PointSize = initialSize * sizeFactor * lifetimeRatio;
            gl_PointSize = max(1.0, gl_PointSize); // Minimum pixel size

            // Alpha fades in quickly and fades out over lifetime
            vAlpha = smoothstep(0.0, 0.2, lifetimeRatio) * smoothstep(1.0, 0.5, lifetimeRatio);
        }
    }
`;

const particleFragmentShader = `
    uniform sampler2D particleTexture;

    varying vec3 vColor;
    varying float vAlpha;

    void main() {
        if (vAlpha < 0.01) discard;

        vec4 texColor = texture2D(particleTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard; 

        gl_FragColor = vec4(vColor, vAlpha * texColor.a);
    }
`;

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
const ambientLight = new THREE.AmbientLight(0x333333); // Slightly brighter ambient
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

// Back wall
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
const MAX_PARTICLES_PER_MUSICIAN = 300; 
const particleTexture = textureLoader.load('/particle_dot.png');

let allMusiciansData = []; 

// Create musician with shader and particle system
const createMusicianWithParticles = (imagePath, initialPosition, glowColor = new THREE.Color(0xff0000), isPlaying = false) => {
    const musicianGroup = new THREE.Group();
    musicianGroup.position.set(initialPosition[0], MUSICIAN_PLANE_HEIGHT / 2, initialPosition[2]);

    // Musician Plane
    const texture = textureLoader.load(imagePath);
    const planeShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: texture },
            time: { value: 0.0 },
            bassIntensity: { value: 0.0 },
            midIntensity: { value: 0.0 },
            trebleIntensity: { value: 0.0 },
            glowColor: { value: glowColor },
        },
        vertexShader: musicianVertexShader,
        fragmentShader: musicianFragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    const planeGeometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH, MUSICIAN_PLANE_HEIGHT);
    const musicianPlane = new THREE.Mesh(planeGeometry, planeShaderMaterial);
    musicianPlane.position.y = 0; 
    musicianGroup.add(musicianPlane);

    // Particle System
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES_PER_MUSICIAN * 3);
    const velocities = new Float32Array(MAX_PARTICLES_PER_MUSICIAN * 3);
    const colors = new Float32Array(MAX_PARTICLES_PER_MUSICIAN * 3);
    const lifetimes = new Float32Array(MAX_PARTICLES_PER_MUSICIAN);
    const initialLifetimes = new Float32Array(MAX_PARTICLES_PER_MUSICIAN);
    const initialSizes = new Float32Array(MAX_PARTICLES_PER_MUSICIAN);

    for (let i = 0; i < MAX_PARTICLES_PER_MUSICIAN; i++) {
        lifetimes[i] = 0; 
        initialLifetimes[i] = Math.random() * 2 + 1; 
        initialSizes[i] = Math.random() * 20 + 10; 
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    particleGeometry.setAttribute('initialLifetime', new THREE.BufferAttribute(initialLifetimes, 1));
    particleGeometry.setAttribute('initialSize', new THREE.BufferAttribute(initialSizes, 1));

    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            particleTexture: { value: particleTexture },
            bassIntensity: { value: 0.0 },
            midIntensity: { value: 0.0 },
            trebleIntensity: { value: 0.0 },
        },
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false, 
        blending: THREE.AdditiveBlending 
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    musicianGroup.add(particleSystem);
    
    scene.add(musicianGroup);

    const musicianData = {
        group: musicianGroup,
        planeMesh: musicianPlane,
        particleSystem: particleSystem,
        particleAttributes: {
            positions: particleGeometry.getAttribute('position'),
            velocities: particleGeometry.getAttribute('velocity'),
            colors: particleGeometry.getAttribute('customColor'),
            lifetimes: particleGeometry.getAttribute('lifetime'),
            initialLifetimes: particleGeometry.getAttribute('initialLifetime'),
            initialSizes: particleGeometry.getAttribute('initialSize')
        },
        glowColor: glowColor,
        isPlaying: isPlaying 
    };
    allMusiciansData.push(musicianData);
    return musicianData; 
};

// Create singer
const createSinger = () => {
    const singerData = createMusicianWithParticles('/singer.png', [0, 0, 0], new THREE.Color(0xffffff));
    singerData.group.position.x = -15; 
    return singerData;
};
const singerData = createSinger();
const singer = singerData.group; 

// Create backup singers
const createBackupSinger = (imagePath, initialPosition, glowColor) => {
    const backupSingerData = createMusicianWithParticles(
        imagePath, 
        [-15 + initialPosition[0], 0, initialPosition[2] -1.5], 
        glowColor,
        false
    );
    backupSingerData.group.scale.set(0.9, 0.9, 0.9);
    return backupSingerData;
};

const backupSinger1Data = createBackupSinger('/backup_singer_female.png', [-3.5, 0, 1], new THREE.Color(0xff6699));
const backupSinger2Data = createBackupSinger('/backup_singer_male.png', [3.5, 0, 1], new THREE.Color(0x66ff99));
const backupSinger1 = backupSinger1Data.group;
const backupSinger2 = backupSinger2Data.group;

// Create main band members
const guitaristData = createMusicianWithParticles('/guitarist.png', [2, 0, -1], new THREE.Color(0xff9900), true);
const bassistData = createMusicianWithParticles('/bassist.png', [-2, 0, 0], new THREE.Color(0x0099ff), true);
const drummerData = createMusicianWithParticles('/drummer.png', [-15, 0, -2], new THREE.Color(0x9900ff), false);

const guitarist = guitaristData.group;
const bassist = bassistData.group;
const drummer = drummerData.group;

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

let singerEntered = false;
let drummerEntered = false;

// Camera animation sequences
const cameraSequences = [
    { startTime: 0, endTime: 10, position: new THREE.Vector3(0, 2, 6), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 },
    { startTime: 10, endTime: 17, position: new THREE.Vector3(3, 2, 4), lookAt: new THREE.Vector3(2, 1, -1), easing: 0.01 }, 
    { startTime: 17, endTime: 25, position: new THREE.Vector3(-3, 2, 4), lookAt: new THREE.Vector3(-2, 1, 0), easing: 0.01 }, 
    { startTime: 25, endTime: 27.5, position: new THREE.Vector3(0, 1.5, 5), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, 
    { startTime: 27.5, endTime: 40, position: new THREE.Vector3(2, 2, 5), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.005 }, 
    { startTime: 40, endTime: 47, position: new THREE.Vector3(-4, 2, 3), lookAt: new THREE.Vector3(-3.5, 1, 1), easing: 0.01 }, 
    { startTime: 47, endTime: 55, position: new THREE.Vector3(4, 2, 3), lookAt: new THREE.Vector3(3.5, 1, 1), easing: 0.01 }, 
    { startTime: 55, endTime: 70, position: new THREE.Vector3(-3, 3, 1), lookAt: new THREE.Vector3(-2, 1, -2), easing: 0.005 }, 
    { startTime: 70, endTime: 80, position: new THREE.Vector3(0, 3, 6), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, 
    { startTime: 80, endTime: 90, position: new THREE.Vector3(4, 2, 3), lookAt: new THREE.Vector3(2, 1, -1), easing: 0.01 }, 
    { startTime: 90, endTime: 100, position: new THREE.Vector3(-4, 2, 3), lookAt: new THREE.Vector3(-2, 1, 0), easing: 0.01 }, 
    { startTime: 100, endTime: 110, position: new THREE.Vector3(1, 2, 4), lookAt: new THREE.Vector3(0, 1, 0), easing: 0.01 }, 
    { startTime: 110, endTime: 120, position: new THREE.Vector3(-3, 3, 0), lookAt: new THREE.Vector3(-2, 1, -2), easing: 0.01 }, 
];

// Animation for band member entrances
function animateBandEntrances() {
    currentPlayTime = audioElement.currentTime;
    
    if (currentPlayTime >= 27.5 && !singerEntered) {
        singerEntered = true;
        
        new TWEEN.Tween(singerSpot)
            .to({ intensity: 4 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        new TWEEN.Tween(backupSpot1)
            .to({ intensity: 2 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        new TWEEN.Tween(backupSpot2)
            .to({ intensity: 2 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        new TWEEN.Tween(singerData.group.position) 
            .to({ x: 0 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        new TWEEN.Tween(backupSinger1Data.group.position) 
            .to({ x: -3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        new TWEEN.Tween(backupSinger2Data.group.position) 
            .to({ x: 3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
    
    if (currentPlayTime >= 55 && !drummerEntered) {
        drummerEntered = true;
        new TWEEN.Tween(drummerSpot)
            .to({ intensity: 3.5 }, 1500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        new TWEEN.Tween(drummerData.group.position) 
            .to({ x: -2 }, 1500) 
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
}

// Camera movement
function updateCameraPosition() {
    if (!isPlaying) return;
    
    const currentSequence = cameraSequences.find(seq => 
        currentPlayTime >= seq.startTime && currentPlayTime < seq.endTime
    );
    
    if (!currentSequence && currentPlayTime >= 120) {
        const cycleTime = ((currentPlayTime - 120) % 40); 
        
        if (cycleTime < 10) {
            camera.position.lerp(new THREE.Vector3(0, 2, 4), 0.01);
            camera.lookAt(singerData.group.position);
        } else if (cycleTime < 20) {
            camera.position.lerp(new THREE.Vector3(3, 2, 3), 0.01);
            camera.lookAt(guitaristData.group.position);
        } else if (cycleTime < 30) {
            camera.position.lerp(new THREE.Vector3(-3, 2, 3), 0.01);
            camera.lookAt(bassistData.group.position);
        } else {
            camera.position.lerp(new THREE.Vector3(-2, 3, 1), 0.01);
            camera.lookAt(drummerData.group.position);
        }
        return;
    }
    
    if (currentSequence) {
        camera.position.lerp(currentSequence.position, currentSequence.easing);
        camera.lookAt(currentSequence.lookAt); 
    }
}

// Musician animation
function animateMusiciansFirstSegment(time, bassAvg, midAvg) {
    const musicianBaseY = 0; 

    if (currentPlayTime < 25) {
        guitaristData.group.position.y = MUSICIAN_PLANE_HEIGHT/2 + Math.sin(time * 5) * 0.15 * midAvg;
        guitaristData.group.rotation.x = Math.sin(time * 4) * 0.1 * midAvg;
        
        bassistData.group.position.y = MUSICIAN_PLANE_HEIGHT/2 + Math.sin(time * 3) * 0.12 * bassAvg;
        bassistData.group.rotation.x = Math.sin(time * 2.5) * 0.08 * bassAvg;
    } else {
        guitaristData.group.position.y = MUSICIAN_PLANE_HEIGHT/2 + Math.sin(time * 2) * 0.1 * midAvg;
        bassistData.group.position.y = MUSICIAN_PLANE_HEIGHT/2 + Math.sin(time * 4) * 0.1 * bassAvg;
    }
}

// --- PARTICLE UPDATE LOGIC ---
function updateParticles(deltaTime, bassAvg, midAvg, trebleAvg) {
    allMusiciansData.forEach(musician => {
        if (!musician.isPlaying && !(musician === singerData && singerEntered) && !(musician === drummerData && drummerEntered) && musician !== guitaristData && musician !== bassistData && !(musician === backupSinger1Data && singerEntered) && !(musician === backupSinger2Data && singerEntered)) {
             // A simplified check: if not explicitly playing or entered, reduce particle activity
            if (Math.random() > 0.95) { 
                 // Allow a few particles even if not "active" for a subtle effect, or none
            } else {
                for (let i = 0; i < MAX_PARTICLES_PER_MUSICIAN; i++) {
                    if (musician.particleAttributes.lifetimes.array[i] > 0) {
                         musician.particleAttributes.lifetimes.array[i] -= deltaTime * 5; 
                    }
                }
            }
        }

        const pa = musician.particleAttributes; 
        const emissionRate = 0.1 + (bassAvg + midAvg) * 0.8; 

        for (let i = 0; i < MAX_PARTICLES_PER_MUSICIAN; i++) {
            pa.lifetimes.array[i] -= deltaTime;

            if (pa.lifetimes.array[i] <= 0 && Math.random() < emissionRate) { 
                pa.positions.array[i * 3] = (Math.random() - 0.5) * MUSICIAN_PLANE_WIDTH * 1.2;
                pa.positions.array[i * 3 + 1] = (Math.random() - 0.5) * MUSICIAN_PLANE_HEIGHT * 1.2;
                pa.positions.array[i * 3 + 2] = (Math.random() - 0.5) * 0.5; 

                pa.velocities.array[i * 3] = (Math.random() - 0.5) * 0.5; 
                pa.velocities.array[i * 3 + 1] = Math.random() * 0.5 + 0.2 + bassAvg * 1.5; 
                pa.velocities.array[i * 3 + 2] = (Math.random() - 0.5) * 0.5; 

                pa.colors.array[i * 3] = musician.glowColor.r;
                pa.colors.array[i * 3 + 1] = musician.glowColor.g;
                pa.colors.array[i * 3 + 2] = musician.glowColor.b;

                pa.lifetimes.array[i] = pa.initialLifetimes.array[i] * (0.5 + trebleAvg * 0.5); 
                pa.initialSizes.array[i] = Math.random() * 15 + 10 + midAvg * 20; 
            } else if (pa.lifetimes.array[i] > 0) { 
                pa.positions.array[i * 3] += pa.velocities.array[i * 3] * deltaTime;
                pa.positions.array[i * 3 + 1] += pa.velocities.array[i * 3 + 1] * deltaTime;
                pa.positions.array[i * 3 + 2] += pa.velocities.array[i * 3 + 2] * deltaTime;

                pa.velocities.array[i * 3 + 1] -= 0.1 * deltaTime; 

                const turbulenceStrength = trebleAvg * 0.8;
                pa.velocities.array[i*3] += (Math.random() - 0.5) * turbulenceStrength * deltaTime;
                pa.velocities.array[i*3+2] += (Math.random() - 0.5) * turbulenceStrength * deltaTime;
            }
        }

        pa.positions.needsUpdate = true;
        pa.velocities.needsUpdate = true;
        pa.colors.needsUpdate = true;
        pa.lifetimes.needsUpdate = true;
        pa.initialSizes.needsUpdate = true; 

        musician.particleSystem.material.uniforms.bassIntensity.value = bassAvg;
        musician.particleSystem.material.uniforms.midIntensity.value = midAvg;
        musician.particleSystem.material.uniforms.trebleIntensity.value = trebleAvg;
    });
}

// Light animation, musician animation, and general updates
function animateSceneLogic(delta) { 
    time += delta;
    
    if (isPlaying) {
        guitaristSpot.target.position.copy(guitaristData.group.position);
        bassistSpot.target.position.copy(bassistData.group.position);
        
        if (singerEntered) {
            singerSpot.target.position.copy(singerData.group.position);
            backupSpot1.target.position.copy(backupSinger1Data.group.position);
            backupSpot2.target.position.copy(backupSinger2Data.group.position);
        }
        
        if (drummerEntered) {
            drummerSpot.target.position.copy(drummerData.group.position);
        }
        
        if (currentPlayTime > 55) { 
            movingLights.forEach((light, i) => {
                const pulseRate = 0.5 + Math.sin(time * 2) * 0.3;
                light.intensity = 1 + Math.sin(time * 10 + i * 0.5) * pulseRate;
            });
        }
    }

    movingLights.forEach((light, i) => {
        const angle = time * 0.5 + (i / movingLights.length) * Math.PI * 2;
        const x = Math.cos(angle) * 6;
        const z = Math.sin(angle) * 6;
        light.position.set(x, 4 + Math.sin(time * 2 + i) * 0.5, z);
    });
    
    if (dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        
        let bassSum = 0; 
        for (let i = 0; i < 10; i++) bassSum += dataArray[i];
        const bassAvg = bassSum / 10 / 255;
        
        let midSum = 0; 
        for (let i = 10; i < 100; i++) midSum += dataArray[i];
        const midAvg = midSum / 90 / 255;
        
        let trebleSum = 0; 
        for (let i = 100; i < dataArray.length; i++) trebleSum += dataArray[i];
        const trebleAvg = trebleSum / (dataArray.length - 100) / 255;
        
        allMusiciansData.forEach(musician => {
            updateMusicianPlaneShader(musician.planeMesh.material, bassAvg, midAvg, trebleAvg);
            musician.isPlaying = 
                (musician === guitaristData || musician === bassistData) ||
                (musician === singerData && singerEntered) ||
                (musician === drummerData && drummerEntered) ||
                ((musician === backupSinger1Data || musician === backupSinger2Data) && singerEntered);
        });
        
        updateParticles(delta, bassAvg, midAvg, trebleAvg);

        animateMusiciansFirstSegment(time, bassAvg, midAvg); 
        
        const basePlaneY = MUSICIAN_PLANE_HEIGHT / 2;
        const backupBasePlaneY = (MUSICIAN_PLANE_HEIGHT * 0.9) / 2;

        if (singerEntered) {
            singerData.group.position.y = basePlaneY + Math.sin(time * 3) * 0.1 * midAvg;
            singerData.group.rotation.z = Math.sin(time * 2) * 0.05 * midAvg;
            
            backupSinger1Data.group.position.y = backupBasePlaneY + Math.sin(time * 3 + 0.5) * 0.08 * midAvg; 
            backupSinger1Data.group.rotation.z = Math.sin(time * 2 + 0.5) * 0.03 * midAvg;
            backupSinger2Data.group.position.y = backupBasePlaneY + Math.sin(time * 3 + 1) * 0.08 * midAvg; 
            backupSinger2Data.group.rotation.z = Math.sin(time * 2 + 1) * 0.03 * midAvg;
        }
        
        if (drummerEntered) {
            drummerData.group.position.y = basePlaneY + Math.sin(time * 8) * 0.15 * bassAvg;
            drummerData.group.rotation.y = Math.sin(time * 0.5) * 0.1; 
        }
    }
}

// Helper function to update musician plane shader uniforms
function updateMusicianPlaneShader(material, bassAvg, midAvg, trebleAvg) {
    if (material && material.uniforms) {
        material.uniforms.time.value = time;
        material.uniforms.bassIntensity.value = bassAvg;
        material.uniforms.midIntensity.value = midAvg;
        material.uniforms.trebleIntensity.value = trebleAvg;
    }
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (!isPlaying) controls.update();
    TWEEN.update();
    
    if (isPlaying) {
        animateBandEntrances();
        updateCameraPosition();
    }
    
    animateSceneLogic(delta); 
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
        controls.enabled = false;
    } else {
        audioElement.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ PLAY MUSIC VIDEO';
        controls.enabled = true;
    }
});

// Initialize & Loading screen
const loading = document.getElementById('loading');
window.addEventListener('load', () => {
    setTimeout(() => {
        const allMedia = Array.from(document.querySelectorAll('audio, video, img')).filter(m => m.src && m.src !== window.location.href); 
        let loadedCount = 0;
        const totalMedia = allMedia.length;

        if (totalMedia === 0) {
            hideLoadingScreen();
            return;
        }
        
        let fallbackTimeout = setTimeout(hideLoadingScreen, 7000); 

        allMedia.forEach(media => {
            if (media.tagName === 'AUDIO' && media.readyState >=2 || media.tagName === 'IMG' && media.complete) {
                loadedCount++;
                if (loadedCount === totalMedia) {
                    clearTimeout(fallbackTimeout);
                    hideLoadingScreen();
                }
            } else {
                const loadListener = () => {
                    loadedCount++;
                    if (loadedCount === totalMedia) {
                        clearTimeout(fallbackTimeout);
                        hideLoadingScreen();
                    }
                    media.removeEventListener('loadeddata', loadListener);
                    media.removeEventListener('load', loadListener);
                    media.removeEventListener('error', errorListener);
                };
                const errorListener = () => {
                    console.warn("Error loading media:", media.src);
                    loadedCount++; 
                     if (loadedCount === totalMedia) {
                        clearTimeout(fallbackTimeout);
                        hideLoadingScreen();
                    }
                    media.removeEventListener('loadeddata', loadListener);
                    media.removeEventListener('load', loadListener);
                    media.removeEventListener('error', errorListener);
                };
                media.addEventListener('loadeddata', loadListener); 
                media.addEventListener('load', loadListener);       
                media.addEventListener('error', errorListener);      
            }
        });
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