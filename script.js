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
const textureLoader = new THREE.TextureLoader();
const stageTexture = textureLoader.load('/stage_floor.png');
stageTexture.wrapS = THREE.RepeatWrapping;
stageTexture.wrapT = THREE.RepeatWrapping;
stageTexture.repeat.set(4, 3);
const stageMaterial = new THREE.MeshPhongMaterial({ map: stageTexture });
const stage = new THREE.Mesh(stageGeometry, stageMaterial);
stage.position.y = -0.25;
stage.receiveShadow = true;
scene.add(stage);

// Back wall with lighting effects
const backWallGeometry = new THREE.BoxGeometry(14, 8, 0.5);
const lightingTexture = textureLoader.load('/stage_lights.png');
const backWallMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x222222, 
    emissive: 0x111111,
    map: lightingTexture,
    emissiveMap: lightingTexture
});
const backWall = new THREE.Mesh(backWallGeometry, backWallMaterial);
backWall.position.set(0, 4, -4);
scene.add(backWall);

const MUSICIAN_PLANE_WIDTH = 1.8;
const MUSICIAN_PLANE_HEIGHT = 3;

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
    
    // Create microphone
    const micStandGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 8);
    const micStandMaterial = new THREE.MeshPhongMaterial({ color: 0xaaaaaa });
    const micStand = new THREE.Mesh(micStandGeometry, micStandMaterial);
    micStand.position.set(0.4, 0, 0.1); // Relative to singer's plane center
    singerMesh.add(micStand);

    const micHeadGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const micHeadMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const micHead = new THREE.Mesh(micHeadGeometry, micHeadMaterial);
    micHead.position.set(0.4, 0.75, 0.1); // Relative to singer's plane center
    singerMesh.add(micHead);
    
    // Start singer off-stage (will come in at 27.5 seconds)
    singerMesh.position.x = -15;
    
    scene.add(singerMesh);
    return singerMesh;
};

const singer = createSinger();

// Create backup singers
const createBackupSinger = (position, color) => {
    const singerGeometry = new THREE.CapsuleGeometry(0.25, 1.2, 4, 8); // Capsule height 1.2 + 0.25*2 = 1.7
    const singerMaterial = new THREE.MeshPhongMaterial({ color });
    const backupSinger = new THREE.Mesh(singerGeometry, singerMaterial);
    
    // Start backup singers off-stage
    backupSinger.position.set(-15 + position[0], 1.7 / 2, position[2]); // Position Y is half height for feet on ground
    scene.add(backupSinger);
    return backupSinger;
};

const backupSinger1 = createBackupSinger([-1, 0, 1], 0xff69b4); // Position interpreted as (x, 0 on stage, z)
const backupSinger2 = createBackupSinger([1, 0, 1], 0xda70d6);  // Position interpreted as (x, 0 on stage, z)


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
    return musician;
};

// Guitarist - on-stage from the start and actively playing
const guitarist = createMusicianPlane('/guitarist.png', [2, 0, -1], true);

// Bassist - on-stage from the start and actively playing
const bassist = createMusicianPlane('/bassist.png', [-2, 0, 0], true);

// Drummer - starts off-stage
const drummer = createMusicianPlane('/drummer.png', [-15, 0, -2], false);


// Create a drum set (simplified)
const createDrumSet = () => {
    const drumSet = new THREE.Group();
    
    // Bass drum
    const bassDrumGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.5, 16);
    bassDrumGeometry.rotateX(Math.PI / 2);
    const bassDrumMaterial = new THREE.MeshPhongMaterial({ color: 0x8b0000 });
    const bassDrum = new THREE.Mesh(bassDrumGeometry, bassDrumMaterial);
    bassDrum.position.set(0, 0.4, 0);
    drumSet.add(bassDrum);
    
    // Snare
    const snareGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.2, 16);
    const snareMaterial = new THREE.MeshPhongMaterial({ color: 0xdcdcdc });
    const snare = new THREE.Mesh(snareGeometry, snareMaterial);
    snare.position.set(0.3, 0.8, 0.3);
    drumSet.add(snare);
    
    // Cymbal
    const cymbalGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.01, 16);
    const cymbalMaterial = new THREE.MeshPhongMaterial({ color: 0xffd700 });
    const cymbal = new THREE.Mesh(cymbalGeometry, cymbalMaterial);
    cymbal.position.set(-0.3, 1.2, 0.3);
    drumSet.add(cymbal);
    
    // Position the entire drum set off-stage initially
    drumSet.position.set(-15, 0, -2); // Base of drumset on stage floor
    
    scene.add(drumSet);
    return drumSet;
};

const drumSet = createDrumSet();

// Create guitars with more detail
const createGuitar = (color, position, scale = 1) => {
    const guitar = new THREE.Group();
    
    // Body with more detailed shape
    const bodyGeometry = new THREE.BoxGeometry(0.25, 0.5, 0.1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    guitar.add(body);
    
    // Neck
    const neckGeometry = new THREE.BoxGeometry(0.05, 0.7, 0.05);
    const neckMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });
    const neck = new THREE.Mesh(neckGeometry, neckMaterial);
    neck.position.y = 0.6;
    guitar.add(neck);
    
    // Headstock
    const headstockGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.05);
    const headstock = new THREE.Mesh(headstockGeometry, neckMaterial);
    headstock.position.y = 1.0;
    guitar.add(headstock);
    
    // Strings
    for (let i = 0; i < 4; i++) {
        const stringGeometry = new THREE.BoxGeometry(0.01, 1.2, 0.01);
        const stringMaterial = new THREE.MeshBasicMaterial({ color: 0xdddddd });
        const string = new THREE.Mesh(stringGeometry, stringMaterial);
        string.position.x = -0.035 + i * 0.025;
        string.position.y = 0.5;
        guitar.add(string);
    }
    
    guitar.scale.set(scale, scale, scale);
    guitar.position.set(...position); // position is absolute world coords
    scene.add(guitar);
    return guitar;
};

// Guitar positions might need fine-tuning relative to the new musician planes.
// Original musician capsule centers were at y=0.85. New plane centers at y=1.5.
// Guitars are positioned independently.
const guitar = createGuitar(0xdc143c, [2, 1, -0.85], 1.2); // Adjusted z slightly forward
guitar.rotation.z = Math.PI / 4;

const bass = createGuitar(0x000080, [-2, 1, -0.15], 1.3); // Adjusted z slightly forward
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
let currentPlayTime = 0;

// Band members entrance flags - to prevent multiple triggers
let singerEntered = false;
let drummerEntered = false;

// Animation for band member entrances
function animateBandEntrances() {
    currentPlayTime = audioElement.currentTime;
    
    // Lead singer and backup singers enter at 27.5 seconds
    if (currentPlayTime >= 27.5 && !singerEntered) {
        singerEntered = true;
        
        // Animate singer coming in from off-stage
        new TWEEN.Tween(singer.position)
            .to({ x: 0 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Animate backup singers
        new TWEEN.Tween(backupSinger1.position)
            .to({ x: -1 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSinger2.position)
            .to({ x: 1 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
    
    // Drummer enters at 55 seconds
    if (currentPlayTime >= 55 && !drummerEntered) {
        drummerEntered = true;
        
        // Animate drummer coming in
        new TWEEN.Tween(drummer.position)
            .to({ x: -2 }, 1500) // Drummer plane target X
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        // Animate drum set coming in
        new TWEEN.Tween(drumSet.position)
            .to({ x: -2 }, 1500) // Drum set target X, should align with drummer
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
}

// Specialized animation function for guitarist and bassist in first 25 seconds
function animateMusiciansFirstSegment(time, bassAvg, midAvg) {
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; // Base y position for plane centers

    // More energetic movements for guitarist and bassist in the first 25 seconds
    if (currentPlayTime < 25) {
        // Guitarist energetic playing
        guitarist.position.y = musicianBaseY + Math.sin(time * 5) * 0.15 * midAvg;
        guitarist.rotation.x = Math.sin(time * 4) * 0.1 * midAvg;
        guitar.rotation.z = Math.PI / 4 + Math.sin(time * 6) * 0.2 * midAvg;
        
        // Bassist movement timed with bass notes
        bassist.position.y = musicianBaseY + Math.sin(time * 3) * 0.12 * bassAvg;
        bassist.rotation.x = Math.sin(time * 2.5) * 0.08 * bassAvg;
        bass.rotation.z = Math.PI / 4 + Math.sin(time * 3.5) * 0.15 * bassAvg;
        
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

// Light animation
function animateLights(delta) {
    time += delta;
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; // Base y position for plane centers
    const backupSingerBaseY = 1.7 / 2; // Base y for backup singer capsules

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
        
        // Animate musicians based on timeline
        animateMusiciansFirstSegment(time, bassAvg, midAvg);
        
        // Make singer move slightly with music (only if they're on stage)
        if (singerEntered) {
            singer.position.y = musicianBaseY + Math.sin(time * 3) * 0.1 * midAvg;
            singer.rotation.z = Math.sin(time * 2) * 0.05 * midAvg;
            
            // Backup singers movement
            backupSinger1.position.y = backupSingerBaseY + Math.sin(time * 3 + 0.5) * 0.1 * midAvg;
            backupSinger2.position.y = backupSingerBaseY + Math.sin(time * 3 + 1) * 0.1 * midAvg;
        }
        
        // Drummer movement (only if on stage)
        if (drummerEntered) {
            drummer.position.y = musicianBaseY + Math.sin(time * 8) * 0.15 * bassAvg;
            // Add a bit of rotation for the drummer for more dynamism
            drummer.rotation.y = Math.sin(time * 0.5) * 0.1; // Gentle sway
        }
    }
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    // Update controls
    controls.update();
    
    // Update TWEEN animations
    TWEEN.update();
    
    // Animate band entrances based on song time
    if (isPlaying) {
        animateBandEntrances();
    }
    
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
            if (media.complete || media.readyState >= 2 || media.tagName !== 'IMG' && media.tagName !== 'AUDIO' && media.tagName !== 'VIDEO') { // Check if already loaded or not a type we explicitly check
                loadedCount++;
                if (loadedCount === totalMedia) hideLoadingScreen();
            } else {
                media.addEventListener('loadeddata', checkAllLoaded); // For audio/video
                media.addEventListener('load', checkAllLoaded);       // For images
                media.addEventListener('error', checkAllLoaded);      // Also count errors as "done loading"
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


    }, 500); // Initial small delay
});

function hideLoadingScreen() {
    if (loading.style.opacity !== "0") { // prevent multiple calls
        loading.style.opacity = 0;
        setTimeout(() => {
            loading.style.display = 'none';
        }, 1000); // Match CSS transition
    }
}


// Start animation
animate();