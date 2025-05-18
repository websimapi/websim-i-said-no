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
renderer.outputEncoding = THREE.sRGBEncoding;
document.getElementById('container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI / 2;
controls.enabled = false;

// Lights
const ambientLight = new THREE.AmbientLight(0x555555); 
scene.add(ambientLight);

// Enhanced Stage Lighting
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
    
    singerMesh.position.x = -15;
    
    scene.add(singerMesh);
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
    
    backupSinger.position.set(-15 + initialPosition[0], (MUSICIAN_PLANE_HEIGHT * 0.9) / 2, initialPosition[2] -1.5); 
    scene.add(backupSinger);
    return backupSinger;
};

const backupSinger1 = createBackupSinger('/backup_singer_female.png', [-3.5, 0, 1]); 
const backupSinger2 = createBackupSinger('/backup_singer_male.png', [3.5, 0, 1]);  

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
guitarist.position.set(2, MUSICIAN_PLANE_HEIGHT / 2, -1);
guitarist.visible = true;

// Bassist - on-stage from the start and actively playing
const bassist = createMusicianPlane('/bassist.png', [-2, 0, 0], true);

// Drummer - starts off-stage
const drummer = createMusicianPlane('/drummer.png', [-15, 0, -2], false);

// Define spotlight targets for each musician
const createTargetedLights = () => {
    const guitaristLight = createSpotlight(0xff9900, 2.5, [2, 6, 1], [2, 1, -1]);
    guitaristLight.angle = Math.PI / 8;
    guitaristLight.penumbra = 0.5;
    
    const bassistLight = createSpotlight(0x66ccff, 2.5, [-2, 6, 1], [-2, 1, 0]);
    bassistLight.angle = Math.PI / 8;
    bassistLight.penumbra = 0.5;
    
    const singerLight = createSpotlight(0xffffff, 3, [0, 6, 1], [0, 1, 0]);
    singerLight.angle = Math.PI / 7;
    singerLight.penumbra = 0.4;
    
    const drummerLight = createSpotlight(0x9933ff, 2.5, [-2, 6, -1], [-2, 1, -2]);
    drummerLight.angle = Math.PI / 8;
    drummerLight.penumbra = 0.5;
    
    const backupSinger1Light = createSpotlight(0xff66cc, 1.8, [-3.5, 5.5, 1.5], [-3.5, 1, 1]);
    backupSinger1Light.angle = Math.PI / 9;
    backupSinger1Light.penumbra = 0.6;
    
    const backupSinger2Light = createSpotlight(0x33cc99, 1.8, [3.5, 5.5, 1.5], [3.5, 1, 1]);
    backupSinger2Light.angle = Math.PI / 9;
    backupSinger2Light.penumbra = 0.6;
    
    return {
        guitarist: guitaristLight,
        bassist: bassistLight,
        singer: singerLight,
        drummer: drummerLight,
        backupSinger1: backupSinger1Light,
        backupSinger2: backupSinger2Light
    };
};

const targetLights = createTargetedLights();

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

// Camera animation variables
let currentCameraTarget = "intro"; 
let cameraTransitioning = false;
let transitionStartTime = 0;
const TRANSITION_DURATION = 2.0; 

// Define camera positions and targets for each focus area
const cameraPositions = {
    intro: { position: new THREE.Vector3(0, 2.5, 8), target: new THREE.Vector3(0, 1, 0) },
    guitarist: { position: new THREE.Vector3(4, 2, 4), target: new THREE.Vector3(2, 1, -1) },
    bassist: { position: new THREE.Vector3(-4, 2, 4), target: new THREE.Vector3(-2, 1, 0) },
    singer: { position: new THREE.Vector3(0, 2.2, 3.5), target: new THREE.Vector3(0, 1.5, 0) },
    singerWide: { position: new THREE.Vector3(0, 2.5, 6), target: new THREE.Vector3(0, 1, 0) },
    drummer: { position: new THREE.Vector3(-3.5, 2.5, 0), target: new THREE.Vector3(-2, 1, -2) },
    all: { position: new THREE.Vector3(0, 3, 7), target: new THREE.Vector3(0, 1, -1) }
};

// Function to smoothly transition camera to new position
function transitionCamera(newTarget) {
    if (currentCameraTarget !== newTarget && !cameraTransitioning) {
        currentCameraTarget = newTarget;
        cameraTransitioning = true;
        transitionStartTime = time;
    }
}

// Function to update camera position
function updateCameraPosition() {
    if (cameraTransitioning) {
        const timeSinceTransition = time - transitionStartTime;
        const t = Math.min(timeSinceTransition / TRANSITION_DURATION, 1.0);
        
        if (t >= 1.0) {
            cameraTransitioning = false;
        }
        
        const easedT = 1 - Math.pow(1 - t, 3);
        
        const target = cameraPositions[currentCameraTarget];
        
        camera.position.lerp(target.position, easedT * 0.05);
        
        const lookTarget = new THREE.Vector3();
        lookTarget.lerp(target.target, easedT * 0.05);
        camera.lookAt(lookTarget);
    } else {
        const target = cameraPositions[currentCameraTarget];
        camera.position.lerp(target.position, 0.02);
        camera.lookAt(target.target);
    }
}

// Animation for band member entrances
function animateBandEntrances() {
    currentPlayTime = audioElement.currentTime;
    
    if (guitarist.position.x < -10 || guitarist.position.x > 10 || 
        guitarist.position.z < -10 || guitarist.position.z > 10) {
        guitarist.position.set(2, MUSICIAN_PLANE_HEIGHT / 2, -1);
    }
    
    if (currentPlayTime < 10) {
        if (currentCameraTarget !== "guitarist" && currentPlayTime > 2) {
            transitionCamera("guitarist");
            targetLights.guitarist.intensity = 3.5;
            targetLights.bassist.intensity = 2;
        }
    } else if (currentPlayTime < 20) {
        if (currentCameraTarget !== "bassist" && currentPlayTime > 12) {
            transitionCamera("bassist");
            targetLights.guitarist.intensity = 2;
            targetLights.bassist.intensity = 3.5;
        }
    } else if (currentPlayTime < 25) {
        if (currentCameraTarget !== "guitarist") {
            transitionCamera("guitarist");
            targetLights.guitarist.intensity = 3.5;
            targetLights.bassist.intensity = 2;
        }
    }
    
    if (currentPlayTime >= 27 && !singerEntered) {
        singerEntered = true;
        
        new TWEEN.Tween(singer.position)
            .to({ x: 0 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSinger1.position)
            .to({ x: -3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        new TWEEN.Tween(backupSinger2.position)
            .to({ x: 3.5 }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
            
        transitionCamera("singerWide");
        
        targetLights.singer.intensity = 4;
        targetLights.backupSinger1.intensity = 2.5;
        targetLights.backupSinger2.intensity = 2.5;
        targetLights.guitarist.intensity = 1.5;
        targetLights.bassist.intensity = 1.5;
    }
    
    if (currentPlayTime >= 35 && currentPlayTime < 45 && currentCameraTarget !== "singer") {
        transitionCamera("singer");
    }
    
    if (currentPlayTime >= 45 && currentPlayTime < 55 && currentCameraTarget !== "singerWide") {
        transitionCamera("singerWide");
    }
    
    if (currentPlayTime >= 54 && !drummerEntered) {
        drummerEntered = true;
        
        new TWEEN.Tween(drummer.position)
            .to({ x: -2 }, 1500) 
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
        
        transitionCamera("drummer");
        
        targetLights.drummer.intensity = 4;
        targetLights.singer.intensity = 2.5;
        targetLights.backupSinger1.intensity = 1.5;
        targetLights.backupSinger2.intensity = 1.5;
        targetLights.guitarist.intensity = 1.5;
        targetLights.bassist.intensity = 1.5;
    }
    
    if (currentPlayTime >= 65) {
        const cycleTime = 5; 
        const cyclePhase = (currentPlayTime - 65) % (cycleTime * 5); 
        
        if (cyclePhase < cycleTime) {
            if (currentCameraTarget !== "all") {
                transitionCamera("all");
                
                targetLights.drummer.intensity = 2.5;
                targetLights.singer.intensity = 3;
                targetLights.backupSinger1.intensity = 2;
                targetLights.backupSinger2.intensity = 2;
                targetLights.guitarist.intensity = 2.5;
                targetLights.bassist.intensity = 2.5;
            }
        } else if (cyclePhase < cycleTime * 2) {
            if (currentCameraTarget !== "guitarist") {
                transitionCamera("guitarist");
                targetLights.guitarist.intensity = 3.5;
                targetLights.bassist.intensity = 1.5;
                targetLights.singer.intensity = 2;
                targetLights.drummer.intensity = 1.5;
            }
        } else if (cyclePhase < cycleTime * 3) {
            if (currentCameraTarget !== "bassist") {
                transitionCamera("bassist");
                targetLights.bassist.intensity = 3.5;
                targetLights.guitarist.intensity = 1.5;
                targetLights.singer.intensity = 2;
                targetLights.drummer.intensity = 1.5;
            }
        } else if (cyclePhase < cycleTime * 4) {
            if (currentCameraTarget !== "singer") {
                transitionCamera("singer");
                targetLights.singer.intensity = 4;
                targetLights.backupSinger1.intensity = 2.5;
                targetLights.backupSinger2.intensity = 2.5;
                targetLights.guitarist.intensity = 1.5;
                targetLights.bassist.intensity = 1.5;
                targetLights.drummer.intensity = 1.5;
            }
        } else {
            if (currentCameraTarget !== "drummer") {
                transitionCamera("drummer");
                targetLights.drummer.intensity = 3.5;
                targetLights.singer.intensity = 2;
                targetLights.guitarist.intensity = 1.5;
                targetLights.bassist.intensity = 1.5;
            }
        }
    }
}

// Light animation with enhanced music reactivity
function animateLights(delta) {
    time += delta;
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; 
    const backupSingerBaseY = (MUSICIAN_PLANE_HEIGHT * 0.9) / 2; 

    movingLights.forEach((light, i) => {
        const angle = time * 0.5 + (i / movingLights.length) * Math.PI * 2;
        const x = Math.cos(angle) * 6;
        const z = Math.sin(angle) * 6;
        light.position.set(x, 4 + Math.sin(time * 2 + i) * 0.5, z);
    });
    
    updateCameraPosition();
    
    if (dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / 10 / 255;
        
        let midSum = 0;
        for (let i = 10; i < 100; i++) {
            midSum += dataArray[i];
        }
        const midAvg = midSum / 90 / 255;
        
        let highSum = 0;
        for (let i = 100; i < 200; i++) {
            highSum += dataArray[i];
        }
        const highAvg = highSum / 100 / 255;
        
        spotLights[0].intensity = 2 + bassAvg * 5;
        spotLights[1].intensity = 2 + midAvg * 5;
        
        const limitedMidAvg = Math.min(midAvg, 0.8);
        const limitedHighAvg = Math.min(highAvg, 0.8);
        
        guitarist.position.y = musicianBaseY + Math.sin(time * 5) * 0.15 * limitedMidAvg;
        guitarist.rotation.x = Math.sin(time * 4) * 0.1 * limitedMidAvg;
        guitarist.rotation.z = Math.cos(time * 2) * 0.05 * limitedHighAvg;
        
        guitarist.position.x = 2 + Math.sin(time * 1.5) * 0.1 * limitedMidAvg;
        guitarist.position.z = -1;
        
        bassist.position.y = musicianBaseY + Math.sin(time * 3) * 0.12 * bassAvg;
        bassist.rotation.x = Math.sin(time * 2.5) * 0.08 * bassAvg;
        bassist.rotation.z = Math.cos(time * 1.5) * 0.04 * bassAvg;
        
        if (singerEntered) {
            singer.position.y = musicianBaseY + Math.sin(time * 3) * 0.1 * midAvg;
            singer.rotation.z = Math.sin(time * 2) * 0.05 * midAvg;
            
            singer.position.x = Math.sin(time * 1.2) * 0.1 * midAvg;
            
            backupSinger1.position.y = backupSingerBaseY + Math.sin(time * 3 + 0.5) * 0.08 * midAvg; 
            backupSinger1.rotation.z = Math.sin(time * 2 + 0.5) * 0.03 * midAvg;
            
            backupSinger2.position.y = backupSingerBaseY + Math.sin(time * 3 + 1) * 0.08 * midAvg; 
            backupSinger2.rotation.z = Math.sin(time * 2 + 1) * 0.03 * midAvg;
        }
        
        if (drummerEntered) {
            drummer.position.y = musicianBaseY + Math.sin(time * 8) * 0.2 * bassAvg;
            drummer.rotation.y = Math.sin(time * 0.5) * 0.1;
            drummer.rotation.x = Math.sin(time * 5) * 0.15 * bassAvg;
        }
    }
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (controls.enabled) {
        controls.update();
    }
    
    TWEEN.update();
    
    if (isPlaying) {
        animateBandEntrances();
    }
    
    animateLights(delta);
    
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

window.addEventListener('load', () => {
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

animate();