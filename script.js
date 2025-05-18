import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Define the shader for the musician glow effect - optimized version
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
    uniform float glowRange;
    
    varying vec2 vUv;
    
    // Optimized hash function
    vec2 hash22(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195));
        p3 += dot(p3, p3.yzx + 19.19);
        return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
    }
    
    // Optimized noise function
    float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f*f*(3.0-2.0*f); // Smoother interpolation
        
        float n = mix(
            mix(dot(hash22(i), f),
                dot(hash22(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), f.x),
            mix(dot(hash22(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                dot(hash22(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), f.x),
            f.y);
        
        return 0.5 + 0.5 * n;
    }
    
    // Simplified FBM with fewer octaves
    float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        
        // Reduced from 5 to 3 octaves
        for (int i = 0; i < 3; i++) {
            value += amplitude * noise(p * frequency);
            frequency *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }
    
    // Optimized lava blob effect
    float lavaBlobEffect(vec2 uv, float t, float bassInt, float midInt) {
        // Simplified calculation with fewer layers
        vec2 p = uv;
        p.y -= t * 0.12 * (1.0 + bassInt);
        
        float distortion = fbm(p * 2.5 + vec2(0.0, t * 0.15));
        
        // Add music reactivity
        distortion *= (0.5 + bassInt * 0.6 + midInt * 0.3);
        
        return distortion;
    }
    
    void main() {
        // Sample original texture
        vec4 texColor = texture2D(map, vUv);
        
        // Get music intensity values
        float musicPower = bassIntensity * 0.7 + midIntensity * 0.4 + trebleIntensity * 0.2;
        
        // Expand the range significantly for more 3D-like extension
        float expandedRange = glowRange * (1.0 + musicPower * 4.0);
        
        // Create lava lamp blob effect
        vec2 scaledUV = vUv * vec2(1.0, 1.5);
        float lavaDistortion = lavaBlobEffect(scaledUV, time, bassIntensity, midIntensity);
        
        // Dynamic flowing colors
        vec3 finalGlowColor = glowColor;
        finalGlowColor += vec3(
            sin(lavaDistortion * 3.0 + time) * 0.2, 
            sin(lavaDistortion * 2.5 + time * 1.2) * 0.2, 
            sin(lavaDistortion * 2.0 + time * 0.8) * 0.2
        ) * musicPower;
        
        // Detect semi-transparent pixels (outlines)
        bool isEdge = texColor.a > 0.01 && texColor.a < 0.99;
        
        if (isEdge) {
            // Enhanced edge effect
            texColor.rgb = mix(texColor.rgb, finalGlowColor * 1.5, 0.7);
            texColor.a = min(texColor.a + 0.1, 0.95);
        }
        
        // Calculate extended 3D lava effect
        if (texColor.a < 0.95) {
            // Calculate distance from nearest edge (optimization: fixed sampling pattern instead of loops)
            float totalLavaEffect = 0.0;
            vec2 pixelSize = vec2(1.0) / vec2(textureSize(map, 0));
            
            // Extended 3D projection parameters
            float depth = 1.0 + musicPower * 2.0;
            float verticalBias = 1.5 + bassIntensity * 1.0;
            
            // Use 8 fixed sampling points instead of nested loops (major optimization)
            vec2 offsets[8];
            offsets[0] = vec2(-1.0, -1.0) * expandedRange;
            offsets[1] = vec2(1.0, -1.0) * expandedRange;
            offsets[2] = vec2(-1.0, 1.0) * expandedRange;
            offsets[3] = vec2(1.0, 1.0) * expandedRange;
            offsets[4] = vec2(0.0, -verticalBias) * expandedRange;
            offsets[5] = vec2(-verticalBias, 0.0) * expandedRange;
            offsets[6] = vec2(verticalBias, 0.0) * expandedRange;
            offsets[7] = vec2(0.0, verticalBias * 0.5) * expandedRange;
            
            for (int i = 0; i < 8; i++) {
                // Apply 3D-like depth projection to sampling offsets
                vec2 offset = offsets[i];
                // Make offset magnitude depend on music for 3D pulsing
                offset *= (1.0 + musicPower * 0.5);
                
                // Sample with 3D projection effect
                vec2 sampleUV = vUv + offset * pixelSize * depth;
                
                // Add lava displacement that extends further out
                float bubbleEffect = lavaBlobEffect(sampleUV, time, bassIntensity, midIntensity);
                sampleUV += vec2(
                    sin(bubbleEffect * 6.28 + time) * 0.015 * musicPower,
                    (bubbleEffect * 0.03 + 0.01) * musicPower  // Stronger upward flow
                ) * expandedRange;
                
                vec4 sampleColor = texture2D(map, sampleUV);
                
                // If we hit an edge or semi-transparent area
                if(sampleColor.a > 0.01 && sampleColor.a < 0.99) {
                    // Calculate 3D-like effect with stronger vertical bias
                    float distanceFactor = length(offset) / expandedRange;
                    float falloff = smoothstep(1.0, 0.0, distanceFactor);
                    
                    // Create vertical bias for 3D lava lamp effect
                    float upwardFlow = smoothstep(0.0, 1.0, (offset.y + expandedRange) / (expandedRange * 2.0));
                    upwardFlow = pow(upwardFlow, 0.7); // Less harsh falloff
                    
                    // 3D blob shape that extends further out
                    float blobShape = sin(bubbleEffect * 6.28) * 0.5 + 0.5;
                    blobShape *= bubbleEffect * falloff * upwardFlow;
                    
                    // Add bubble's contribution with 3D depth feeling
                    totalLavaEffect += falloff * blobShape * (0.5 + musicPower);
                }
            }
            
            // Extend the effect further outside with music intensity
            totalLavaEffect = min(totalLavaEffect * (1.0 + musicPower * 1.5), 1.0);
            
            // Create flowing color variation with 3D depth perception
            float colorShift = lavaDistortion * 3.0 + vUv.y * 3.0 - time * 0.5;
            vec3 lavaColor = finalGlowColor + vec3(
                sin(colorShift) * 0.3, 
                sin(colorShift + 2.1) * 0.3, 
                sin(colorShift + 4.2) * 0.3
            ) * musicPower;
            
            // Only apply lava effect to transparent/semi-transparent areas
            if (texColor.a < 0.95) {
                // Enhanced 3D lava effect with stronger intensity
                vec3 lavaColorWithIntensity = lavaColor * (totalLavaEffect * 1.5);
                
                if (isEdge) {
                    texColor.rgb = mix(texColor.rgb, lavaColorWithIntensity, 0.7);
                    texColor.a = min(texColor.a + totalLavaEffect * 0.5, 0.95);
                } else if (totalLavaEffect > 0.05) {
                    // For fully transparent areas with lava effect
                    texColor.rgb = lavaColorWithIntensity;
                    texColor.a = totalLavaEffect * 0.9; // Stronger alpha for better visibility
                }
            }
        }
        
        gl_FragColor = texColor;
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

// Create musician with shader
const createMusicianWithShader = (imagePath, initialPosition, glowColor = new THREE.Color(0xff0000), isPlaying = false) => {
    const texture = textureLoader.load(imagePath);
    
    // Create custom shader material
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            map: { value: texture },
            time: { value: 0.0 },
            bassIntensity: { value: 0.0 },
            midIntensity: { value: 0.0 },
            trebleIntensity: { value: 0.0 },
            glowColor: { value: glowColor },
            glowRange: { value: 1.0 }
        },
        vertexShader: musicianVertexShader,
        fragmentShader: musicianFragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    const geometry = new THREE.PlaneGeometry(MUSICIAN_PLANE_WIDTH, MUSICIAN_PLANE_HEIGHT);
    const musician = new THREE.Mesh(geometry, shaderMaterial);
    musician.position.set(initialPosition[0], MUSICIAN_PLANE_HEIGHT / 2, initialPosition[2]);
    musician.userData.isPlaying = isPlaying;
    scene.add(musician);
    return musician;
};

// Replace the existing musician creation functions with new shader versions
const createSinger = () => {
    const singerMesh = createMusicianWithShader('/singer.png', [0, 0, 0], new THREE.Color(0xffffff));
    // Start singer off-stage
    singerMesh.position.x = -15;
    return singerMesh;
};

const singer = createSinger();

// Create backup singers
const createBackupSinger = (imagePath, initialPosition, glowColor) => {
    const backupSinger = createMusicianWithShader(
        imagePath, 
        [-15 + initialPosition[0], 0, initialPosition[2] -1.5], 
        glowColor,
        false
    );
    // Adjust scale for backup singers
    backupSinger.scale.set(0.9, 0.9, 0.9);
    return backupSinger;
};

// Backup singers with unique glow colors
const backupSinger1 = createBackupSinger('/backup_singer_female.png', [-3.5, 0, 1], new THREE.Color(0xff6699));
const backupSinger2 = createBackupSinger('/backup_singer_male.png', [3.5, 0, 1], new THREE.Color(0x66ff99));

// Create main band members with their specific glow colors
const guitarist = createMusicianWithShader('/guitarist.png', [2, 0, -1], new THREE.Color(0xff9900), true);
const bassist = createMusicianWithShader('/bassist.png', [-2, 0, 0], new THREE.Color(0x0099ff), true);
const drummer = createMusicianWithShader('/drummer.png', [-15, 0, -2], new THREE.Color(0x9900ff), false);

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

// Light animation with spotlight focus
function animateLights(delta) {
    time += delta;
    const musicianBaseY = MUSICIAN_PLANE_HEIGHT / 2; 
    const backupSingerBaseY = (MUSICIAN_PLANE_HEIGHT * 0.9) / 2; 

    // Update spotlight targets and other existing code...
    // Update spotlight targets
    if (isPlaying) {
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
        
        // Get average of bass frequencies (0-10)
        let bassSum = 0;
        for (let i = 0; i < 10; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / 10 / 255;
        
        // Get average of mid frequencies (10-100)
        let midSum = 0;
        for (let i = 10; i < 100; i++) {
            midSum += dataArray[i];
        }
        const midAvg = midSum / 90 / 255;
        
        // Get average of treble frequencies (100-255)
        let trebleSum = 0;
        for (let i = 100; i < dataArray.length; i++) {
            trebleSum += dataArray[i];
        }
        const trebleAvg = trebleSum / (dataArray.length - 100) / 255;
        
        // Update shader uniforms for all musicians
        updateMusicianShader(singer.material, bassAvg, midAvg, trebleAvg);
        updateMusicianShader(guitarist.material, bassAvg, midAvg, trebleAvg);
        updateMusicianShader(bassist.material, bassAvg, midAvg, trebleAvg);
        updateMusicianShader(drummer.material, bassAvg, midAvg, trebleAvg);
        updateMusicianShader(backupSinger1.material, bassAvg, midAvg, trebleAvg);
        updateMusicianShader(backupSinger2.material, bassAvg, midAvg, trebleAvg);
        
        // Adjust shader glow range based on current focus
        if (currentPlayTime < 27.5) {
            // First section: guitarist and bassist highlighted
            guitarist.material.uniforms.glowRange.value = 3.0 + midAvg * 3.0;
            bassist.material.uniforms.glowRange.value = 3.0 + bassAvg * 3.0;
            singer.material.uniforms.glowRange.value = 0.5;
            drummer.material.uniforms.glowRange.value = 0.5;
            backupSinger1.material.uniforms.glowRange.value = 0.5;
            backupSinger2.material.uniforms.glowRange.value = 0.5;
        } else if (currentPlayTime < 55) {
            // Second section: singer and backup singers highlighted
            guitarist.material.uniforms.glowRange.value = 1.5;
            bassist.material.uniforms.glowRange.value = 1.5;
            singer.material.uniforms.glowRange.value = 3.0 + midAvg * 3.0;
            drummer.material.uniforms.glowRange.value = 0.5;
            backupSinger1.material.uniforms.glowRange.value = 2.5 + midAvg * 2.5;
            backupSinger2.material.uniforms.glowRange.value = 2.5 + midAvg * 2.5;
        } else {
            // After drummer enters - cycle highlighting based on focus
            const timePhase = ((currentPlayTime - 55) % 40) / 40; // 0 to 1 phase over 40 seconds
            
            if (timePhase < 0.25) {
                // Drummer focus
                drummer.material.uniforms.glowRange.value = 3.0 + bassAvg * 3.0;
                guitarist.material.uniforms.glowRange.value = 1.5;
                bassist.material.uniforms.glowRange.value = 1.5;
                singer.material.uniforms.glowRange.value = 1.5;
                backupSinger1.material.uniforms.glowRange.value = 1.0;
                backupSinger2.material.uniforms.glowRange.value = 1.0;
            } else if (timePhase < 0.5) {
                // Singer focus
                drummer.material.uniforms.glowRange.value = 1.5;
                guitarist.material.uniforms.glowRange.value = 1.5;
                bassist.material.uniforms.glowRange.value = 1.5;
                singer.material.uniforms.glowRange.value = 3.0 + midAvg * 3.0;
                backupSinger1.material.uniforms.glowRange.value = 2.5 + midAvg * 2.0;
                backupSinger2.material.uniforms.glowRange.value = 2.5 + midAvg * 2.0;
            } else if (timePhase < 0.75) {
                // Guitarist focus
                drummer.material.uniforms.glowRange.value = 1.5;
                guitarist.material.uniforms.glowRange.value = 3.0 + midAvg * 3.0;
                bassist.material.uniforms.glowRange.value = 1.5;
                singer.material.uniforms.glowRange.value = 1.5;
                backupSinger1.material.uniforms.glowRange.value = 1.0;
                backupSinger2.material.uniforms.glowRange.value = 1.0;
            } else {
                // Bassist focus
                drummer.material.uniforms.glowRange.value = 1.5;
                guitarist.material.uniforms.glowRange.value = 1.5;
                bassist.material.uniforms.glowRange.value = 3.0 + bassAvg * 3.0;
                singer.material.uniforms.glowRange.value = 1.5;
                backupSinger1.material.uniforms.glowRange.value = 1.0;
                backupSinger2.material.uniforms.glowRange.value = 1.0;
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

// Helper function to update musician shader uniforms
function updateMusicianShader(material, bassAvg, midAvg, trebleAvg) {
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