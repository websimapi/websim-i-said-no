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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

// Stage Lighting
const createSpotlight = (color, intensity, position, target) => {
    const light = new THREE.SpotLight(color, intensity);
    light.position.set(...position);
    light.angle = Math.PI / 6;
    light.penumbra = 0.3;
    light.decay = 2;
    light.distance = 30;
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    
    if (target) {
        light.target.position.set(...target);
        scene.add(light.target);
    }
    
    scene.add(light);
    return light;
};

// Main spotlights
const spotLights = [
    createSpotlight(0xff0000, 2, [-4, 5, 2], [0, 0, 0]),  // Red spotlight from left
    createSpotlight(0x0000ff, 2, [4, 5, 2], [0, 0, 0]),   // Blue spotlight from right
    createSpotlight(0xffffff, 3, [0, 5, -2], [0, 0, 0]),  // White spotlight from behind
];

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
const stageMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const stage = new THREE.Mesh(stageGeometry, stageMaterial);
stage.position.y = -0.25;
stage.receiveShadow = true;
scene.add(stage);

// Back wall
const backWallGeometry = new THREE.BoxGeometry(14, 8, 0.5);
const backWallMaterial = new THREE.MeshPhongMaterial({ color: 0x111111 });
const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWall.position.set(0, 4, -4);
scene.add(backWall);

// Create singer placeholder
const singerGeometry = new THREE.CapsuleGeometry(0.3, 1.4, 4, 8);
const singerMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
const singer = new THREE.Group();
const singerBody = new THREE.Mesh(singerGeometry, singerMaterial);
singerBody.position.y = 1;
singer.add(singerBody);

// Create microphone
const micStandGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
const micStandMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
const micStand = new THREE.Mesh(micStandGeometry, micStandMaterial);
micStand.position.set(0.5, 0.75, 0);
singer.add(micStand);

const micHeadGeometry = new THREE.SphereGeometry(0.08, 16, 16);
const micHeadMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const micHead = new THREE.Mesh(micHeadGeometry, micHeadMaterial);
micHead.position.set(0.5, 1.5, 0);
singer.add(micHead);

scene.add(singer);

// Create band members (simplified)
const createBandMember = (color, position) => {
    const memberGeometry = new THREE.CapsuleGeometry(0.25, 1.2, 4, 8);
    const memberMaterial = new THREE.MeshPhongMaterial({ color });
    const member = new THREE.Mesh(memberGeometry, memberMaterial);
    member.position.set(...position);
    member.position.y += 0.85;
    scene.add(member);
    return member;
};

const drummer = createBandMember(0xff6347, [-2, 0, -2]);
const guitarist = createBandMember(0x4169e1, [2, 0, -1]);
const bassist = createBandMember(0x32cd32, [-2, 0, 0]);

// Create a drum set (simplified)
const createDrumSet = () => {
    const drumSet = new THREE.Group();
    
    // Bass drum
    const bassDrumGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16);
    bassDrumGeometry.rotateX(Math.PI / 2);
    const bassDrumMaterial = new THREE.MeshPhongMaterial({ color: 0x8b0000 });
    const bassDrum = new THREE.Mesh(bassDrumGeometry, bassDrumMaterial);
    bassDrum.position.set(-2, 0.4, -2);
    drumSet.add(bassDrum);
    
    // Snare
    const snareGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16);
    const snareMaterial = new THREE.MeshPhongMaterial({ color: 0xdcdcdc });
    const snare = new THREE.Mesh(snareGeometry, snareMaterial);
    snare.position.set(-1.7, 0.8, -1.7);
    drumSet.add(snare);
    
    // Cymbal
    const cymbalGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.01, 16);
    const cymbalMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const cymbal = new THREE.Mesh(cymbalGeometry, cymbalMaterial);
    cymbal.position.set(-2.3, 1.2, -1.7);
    drumSet.add(cymbal);
    
    scene.add(drumSet);
    return drumSet;
};

const drumSet = createDrumSet();

// Create guitars (simplified)
const createGuitar = (color, position) => {
    const guitar = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.5, 0.1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    guitar.add(body);
    
    // Neck
    const neckGeometry = new THREE.BoxGeometry(0.05, 0.7, 0.05);
    const neckMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = 0.6;
    guitar.add(neck);
    
    guitar.position.set(...position);
    scene.add(guitar);
    return guitar;
};

const guitar = createGuitar(0xdc143c, [2, 1, -1]);
guitar.rotation.z = Math.PI / 4;

const bass = createGuitar(0x000080, [-2, 1, 0]);
bass.rotation.z = Math.PI / 4;

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

// Light animation
function animateLights(delta) {
    time += delta;
    
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
        
        // Adjust spotlight intensities based on music
        spotLights[0].intensity = 2 + bassAvg * 5;
        spotLights[1].intensity = 2 + midAvg * 5;
        
        // Make singer move slightly with music
        singer.position.y = Math.sin(time * 3) * 0.05 * midAvg;
        singerBody.rotation.z = Math.sin(time * 2) * 0.1 * midAvg;
        
        // Band members movement
        drummer.position.y = 0.85 + Math.sin(time * 8) * 0.1 * bassAvg;
        guitarist.position.y = 0.85 + Math.sin(time * 2) * 0.1 * midAvg;
        bassist.position.y = 0.85 + Math.sin(time * 4) * 0.1 * bassAvg;
    }
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update controls
    controls.update();
    
    // Animate scene elements
    animateLights(delta);
    
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
    } else {
        audioElement.pause();
        isPlaying = false;
        document.getElementById('playBtn').textContent = '▶ PLAY MUSIC VIDEO';
    }
});

// Initialize
const loading = document.getElementById('loading');

// Hide loading screen when everything is ready
window.addEventListener('load', () => {
    setTimeout(() => {
        loading.style.opacity = 0;
        setTimeout(() => {
            loading.style.display = 'none';
        }, 1000);
    }, 1000);
});

// Start animation
animate();

