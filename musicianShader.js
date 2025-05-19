// Musician outline and particle effect shader
import * as THREE from 'three';

// Vertex shader for outline and particles
const vertexShader = `
varying vec2 vUv;
attribute float size;
attribute vec3 customColor;
varying vec3 vColor;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float beatPhase;
uniform float rhythmConsistency;
uniform float beatStrength;

void main() {
    vUv = uv;
    vColor = customColor;
    
    // Calculate position with smoother movement based on audio
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Modulate size based on comprehensive audio parameters
    float beatPulse = smoothstep(0.0, 0.4, beatActive) * sin(beatPhase * 3.14159 * 2.0) * 0.5 + 0.5;
    float sizeModulation = audioIntensity * 0.5 + 0.6 + 
                         beatPulse * 0.3 * beatStrength +
                         sin(time * (2.0 + rhythmConsistency)) * 0.2 * bassIntensity;
    
    // Add synchronized rhythmic movement
    if (beatActive > 0.5) {
        // Pulse outward on beat with audio-reactive intensity
        float beatIntensity = beatActive * beatStrength;
        mvPosition.xyz += normalize(mvPosition.xyz) * sin(beatPhase * 3.14159 * 2.0) * 0.05 * beatIntensity;
    }
    
    // Add swaying motion synchronized to BPM
    mvPosition.x += sin(time * 1.5 + beatPhase * 6.28) * 0.01 * rhythmConsistency;
    
    gl_PointSize = size * sizeModulation * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for musician electric outline effect - updated for electric look
const fragmentShader = `
uniform sampler2D map;
uniform vec3 baseColor;
uniform float outlineWidth;
uniform float outlineIntensity;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float highIntensity;
uniform float beatPhase;
uniform float rhythmConsistency;
uniform float beatStrength;
varying vec2 vUv;
varying vec3 vColor;

// Hash function for electric noise
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// Improved noise function for electric patterns
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Improved smoothing for sharper transitions
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Lightning noise for electric effect
float lightning(vec2 p, float time) {
    // Create fast, sharp noise patterns
    float n1 = noise(p * 5.0 + time * 10.0);
    float n2 = noise(p * 15.0 - time * 15.0);
    float n3 = noise(p * 25.0 + time * 5.0);
    
    // Combine different frequencies for a lightning-like pattern
    float lightning = pow(n1 * n2 * n3, 3.0) * 5.0;
    
    // Make it more jagged and electric-looking
    lightning = smoothstep(0.5, 1.0, lightning) * smoothstep(0.8, 0.0, lightning);
    
    return lightning;
}

// Electric arc pattern
float electricArc(vec2 uv, float time, float intensity) {
    // Create electric arc patterns along the edge
    float noise1 = noise(uv * 10.0 + time * 5.0) * 2.0 - 1.0;
    float noise2 = noise(uv * 20.0 - time * 7.0) * 2.0 - 1.0;
    float noise3 = noise(uv * 30.0 + time * 9.0) * 2.0 - 1.0;
    
    // Combine different noise scales for fractal-like patterns
    float electricPattern = (noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2) * intensity;
    
    // Make pattern more jagged
    electricPattern = pow(abs(electricPattern), 0.5) * sign(electricPattern);
    
    return electricPattern;
}

void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // Discard fully transparent pixels immediately
    if (texColor.a < 0.01) {
        discard;
    }
    
    // Calculate distance to edge using alpha channel gradient
    float distanceToEdge = 0.0;
    if (texColor.a > 0.05 && texColor.a < 0.99) {
        distanceToEdge = 1.0 - abs(0.5 - texColor.a) * 2.0;
    }
    
    // Animate outline width with audio and rhythm metrics
    float beatPulse = smoothstep(0.0, 0.3, beatActive) * 
                     (sin(beatPhase * 3.14159 * 2.0) * 0.5 + 0.5);
                     
    // Electric effect width modulation - thinner, sharper outlines
    float animatedWidth = outlineWidth * (
        1.2 + 
        sin(time * (3.0 + rhythmConsistency)) * 0.2 * bassIntensity +
        beatPulse * 0.4 * beatStrength
    );
    
    // Create electric edge effect with varying intensity based on audio
    float electricEdgeIntensity = smoothstep(0.0, animatedWidth, distanceToEdge) * (outlineIntensity * 0.7);
    
    // Add beat-synchronized flickering and pulsing for electric feel
    float flickerSpeed = 15.0 + beatStrength * 10.0 + bassIntensity * 5.0;
    float flicker = 0.7 + 0.3 * sin(time * flickerSpeed);
    flicker *= (0.95 + 0.05 * sin(time * 30.0)); // Fast micro-flickers
    
    // Add powerful pulses on beats
    float beatFlash = 0.0;
    if (beatActive > 0.5) {
        beatFlash = beatActive * beatStrength * (1.0 - beatPhase * 1.5) * 0.3;
    }
    
    // Generate electric arc pattern at the edge
    float electricPattern = electricArc(vUv, time, 0.5 + audioIntensity * 0.5);
    
    // Generate lightning pattern that intensifies with beats
    float lightningEffect = lightning(vUv, time) * (0.4 + beatActive * 0.6) * electricEdgeIntensity;
    
    // Combine effects for final electric intensity
    float finalElectricIntensity = electricEdgeIntensity * flicker + lightningEffect + beatFlash;
    
    // Electric color transitions based on audio frequencies
    vec3 baseElectricColor = baseColor;
    
    // Shift color to electric blue-white spectrum
    vec3 electricBlue = vec3(0.3, 0.7, 1.0); // Base electric blue
    vec3 electricPurple = vec3(0.7, 0.3, 1.0); // Electric purple
    vec3 electricWhite = vec3(1.0, 1.0, 1.0); // Bright center
    
    // Mix colors based on audio and rhythm
    float bassShift = sin(time * 1.5 + beatPhase * 6.28) * bassIntensity * 0.5;
    float midShift = cos(time * 2.2 + beatPhase * 3.14) * midIntensity * 0.5;
    float highShift = sin(time * 3.0 + beatPhase * 9.42) * highIntensity * 0.5;
    
    // Create dynamic electric color based on frequency bands
    vec3 dynamicElectricColor = mix(
        electricBlue,
        electricPurple,
        (0.5 + bassShift + sin(time * 2.0) * 0.2)
    );
    
    // Add flashes of white at the highest intensity points
    dynamicElectricColor = mix(
        dynamicElectricColor,
        electricWhite,
        pow(lightningEffect, 2.0) * 0.8
    );
    
    // Add dynamic pattern to electricity
    float patternIntensity = electricPattern * finalElectricIntensity;
    vec3 patternColor = mix(dynamicElectricColor, electricWhite, patternIntensity * 0.7);
    
    // Final electric outline color
    vec3 electricOutlineColor = mix(
        dynamicElectricColor,
        patternColor,
        patternIntensity
    );
    
    // Mix the texture color with the electric outline effect
    vec4 finalColor = texColor;
    
    // Add the electric glow around the edges
    if (finalElectricIntensity > 0.0) {
        // Create a sharper transition for more electric feel
        finalColor = mix(
            finalColor, 
            vec4(electricOutlineColor, texColor.a), 
            min(1.0, finalElectricIntensity * (1.0 + patternIntensity))
        );
    }
    
    gl_FragColor = finalColor;
}
`;

// Particle fragment shader with more fluid effects and better dissipation
const particleFragmentShader = `
uniform vec3 baseColor;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float highIntensity;
uniform float beatPhase;
uniform float rhythmConsistency;
uniform float beatStrength;
varying vec3 vColor;

// Improved noise function for organic particle variation
float noise(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    // Calculate distance from center of point
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard; // Make particles round
    
    // Create a softer edge for better dissipation that responds to rhythm
    float softFactor = 0.25 + 
                     0.1 * sin(time * (1.5 + rhythmConsistency) + vColor.r * 8.0) * bassIntensity +
                     0.05 * sin(beatPhase * 6.28) * beatStrength;
    
    float alpha = smoothstep(softFactor, 0.5, 0.5 - dist);
    
    // Lower opacity for better transparency and wider spread
    alpha *= 0.4; 
    
    // Create a pulsing effect synchronized to the beat phase
    float beatSyncedPulse = 0.5 + 0.5 * sin(beatPhase * 6.28);
    float pulse = 0.6 + 
                0.25 * sin(time * (2.0 + rhythmConsistency) + vColor.g * 6.0) +
                0.15 * beatSyncedPulse * beatStrength;
    
    pulse *= (0.3 + 0.5 * audioIntensity); // More fluid audio influence with reduced intensity
    
    // Add brightness that peaks precisely on beats
    float beatBoost = max(0.0, beatActive * (1.0 - beatPhase * 2.0) * beatStrength);
    
    // Shift colors based on audio frequency bands synchronized to rhythm
    vec3 dynamicColor = vColor;
    
    // Use beat phase for smooth, synchronized color transitions
    float rhythmicColorShift1 = sin(time * 0.4 + beatPhase * 6.28);
    float rhythmicColorShift2 = cos(time * 0.6 + beatPhase * 3.14);
    float rhythmicColorShift3 = sin(time * 0.5 + beatPhase * 9.42);
    
    dynamicColor.r *= 1.0 + rhythmicColorShift1 * 0.3 * bassIntensity;
    dynamicColor.g *= 1.0 + rhythmicColorShift2 * 0.3 * midIntensity;
    dynamicColor.b *= 1.0 + rhythmicColorShift3 * 0.3 * highIntensity;
    
    // Gentler brightening on beats that follows rhythm
    dynamicColor = mix(dynamicColor, dynamicColor * 1.4, beatBoost * 0.5);
    
    // Add subtle color variation based on noise and rhythm consistency
    float noiseValue = noise(gl_PointCoord * 5.0 + time * rhythmConsistency);
    float colorVariation = sin(time * 1.0 + noiseValue * 6.28) * 0.15;
    dynamicColor = mix(dynamicColor, baseColor, colorVariation);
    
    // Make opacity respond to rhythm and beat phase
    float dynamicAlpha = alpha * pulse * (
        0.4 + 
        bassIntensity * 0.15 + 
        midIntensity * 0.15 +
        beatSyncedPulse * beatStrength * 0.2
    );
    
    // Final color with smoother audio reactivity
    gl_FragColor = vec4(dynamicColor * pulse, dynamicAlpha);
}
`;

class MusicianEffect {
    constructor(musician, baseColor, audioAnalyzer) {
        this.musician = musician;
        this.baseColor = new THREE.Color(baseColor);
        this.audioAnalyzer = audioAnalyzer;
        this.outlineShaderMaterial = null;
        this.particleSystem = null;
        this.audioData = { 
            intensity: 0,
            bassIntensity: 0,
            midIntensity: 0,
            highIntensity: 0,
            beatDetected: false,
            beatPhase: 0,
            rhythmConsistency: 0,
            beatStrength: 0
        };
        
        this.init();
    }
    
    init() {
        // Create the electric outline glow material
        this.outlineShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.musician.material.map },
                baseColor: { value: this.baseColor },
                outlineWidth: { value: 0.12 }, // Thinner outline for electric look
                outlineIntensity: { value: 0.5 }, // Higher intensity for electric effect
                time: { value: 0 },
                audioIntensity: { value: 0 },
                beatActive: { value: 0 },
                bassIntensity: { value: 0 },
                midIntensity: { value: 0 },
                highIntensity: { value: 0 },
                beatPhase: { value: 0 },
                rhythmConsistency: { value: 0 },
                beatStrength: { value: 0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.01
        });
        
        // Store original material
        this.originalMaterial = this.musician.material;
        
        // Apply the shader material
        this.musician.material = this.outlineShaderMaterial;
        
        // Create particles behind the musician (lava effect)
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        // More particles for a wider spread effect
        const particleCount = 1500;
        const particleGeometry = new THREE.BufferGeometry();
        
        // Get musician dimensions
        const width = this.musician.geometry.parameters.width;
        const height = this.musician.geometry.parameters.height;
        
        // Create initial empty positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Distribution parameters for better surrounding effect - increase spread
        const edgeEmitProbability = 0.7;  // 70% of particles from edges
        const centralEmitProbability = 0.3; // 30% from center area
        
        // Set initial values - position particles further behind the musician 
        for (let i = 0; i < particleCount; i++) {
            // Determine if this particle emits from edge or center
            const isEdgeParticle = Math.random() < edgeEmitProbability;
            
            let x, y;
            
            if (isEdgeParticle) {
                // Position around the outline with wider distribution
                const angle = Math.random() * Math.PI * 2;
                
                // More varied distance from edge for wider spread
                const radius = width * (0.4 + Math.random() * 0.25);
                
                x = Math.cos(angle) * radius;
                y = Math.sin(angle) * radius * (height / width); // Adjust for height
                
                // Adjust y to be more within the height bounds
                y = Math.max(-height/2, Math.min(height/2, y));
            } else {
                // Some particles throughout the musician's body
                x = (Math.random() - 0.5) * width * 0.8;
                y = (Math.random() - 0.5) * height * 0.8;
            }
            
            // Position relative to the musician's center, much further behind for better depth effect
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = -0.6 - Math.random() * 0.3; // Much further behind for better separation
            
            // More subtle color variation based on position
            const positionFactor = Math.sqrt(x*x + y*y) / (width/2);
            colors[i * 3] = this.baseColor.r * (0.85 + positionFactor * 0.15);
            colors[i * 3 + 1] = this.baseColor.g * (0.85 + positionFactor * 0.15);
            colors[i * 3 + 2] = this.baseColor.b * (0.85 + positionFactor * 0.15);
            
            // Smaller particle sizes for a more subtle, distributed effect
            sizes[i] = Math.random() * 2.5 + 0.8;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Enhanced particle material with rhythm-reactive uniforms
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                baseColor: { value: this.baseColor },
                time: { value: 0 },
                audioIntensity: { value: 0 },
                beatActive: { value: 0 },
                bassIntensity: { value: 0 },
                midIntensity: { value: 0 },
                highIntensity: { value: 0 },
                beatPhase: { value: 0 },
                rhythmConsistency: { value: 0 },
                beatStrength: { value: 0 }
            },
            vertexShader: vertexShader,
            fragmentShader: particleFragmentShader,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create the particle system
        this.particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.particleSystem.userData = { 
            particleVelocities: new Float32Array(particleCount * 3),
            particleLifetimes: new Float32Array(particleCount),
            particleEnergies: new Float32Array(particleCount),
            emitPositions: new Float32Array(particleCount * 3), // Original emitter points
            particlePhases: new Float32Array(particleCount),    // Unique phase for each particle
            beatSyncFactors: new Float32Array(particleCount)    // How much each particle syncs to beat
        };
        
        // Set initial velocities, lifetimes, and other parameters
        for (let i = 0; i < particleCount; i++) {
            // Store original position as emission point
            this.particleSystem.userData.emitPositions[i * 3] = positions[i * 3];
            this.particleSystem.userData.emitPositions[i * 3 + 1] = positions[i * 3 + 1];
            this.particleSystem.userData.emitPositions[i * 3 + 2] = positions[i * 3 + 2];
            
            // More gentle but varied velocities for fluid movement
            // Radiate outward from the musician
            const dx = positions[i * 3];
            const dy = positions[i * 3 + 1];
            const distFromCenter = Math.sqrt(dx*dx + dy*dy);
            
            if (distFromCenter > 0) {
                // Normalize direction vector
                const dirX = dx / distFromCenter;
                const dirY = dy / distFromCenter;
                
                // Faster outward movement for wider spread
                this.particleSystem.userData.particleVelocities[i * 3] = dirX * 0.03 * (0.5 + Math.random() * 0.7);
                this.particleSystem.userData.particleVelocities[i * 3 + 1] = dirY * 0.03 * (0.5 + Math.random() * 0.7);
            } else {
                // Random direction for central particles
                const angle = Math.random() * Math.PI * 2;
                this.particleSystem.userData.particleVelocities[i * 3] = Math.cos(angle) * 0.03;
                this.particleSystem.userData.particleVelocities[i * 3 + 1] = Math.sin(angle) * 0.03;
            }
            
            // Add slight upward drift
            this.particleSystem.userData.particleVelocities[i * 3 + 1] += 0.01 + Math.random() * 0.01;
            
            // Z velocity (away from musician)
            this.particleSystem.userData.particleVelocities[i * 3 + 2] = -0.015 - Math.random() * 0.01;
            
            // Longer lifetimes for wider spread
            this.particleSystem.userData.particleLifetimes[i] = Math.random() * 4 + 3.0;
            
            // Energy level - for particle animation
            this.particleSystem.userData.particleEnergies[i] = Math.random();
            
            // Unique phase offset for each particle
            this.particleSystem.userData.particlePhases[i] = Math.random() * Math.PI * 2;
            
            // How much this particle syncs to the beat (0-1)
            this.particleSystem.userData.beatSyncFactors[i] = Math.random() * 0.8 + 0.2;
        }
        
        // Add particle system as a child of the musician to inherit its position and orientation
        this.musician.add(this.particleSystem);
    }
    
    update(time, audioData) {
        // Update audio data with enhanced rhythm metrics
        this.audioData = audioData;
        
        // Smooth audio response for more fluid effects
        const smoothedAudio = {
            intensity: audioData.intensity * 1.2,
            bassIntensity: audioData.bassIntensity * 1.2,
            midIntensity: audioData.midIntensity * 1.2,
            highIntensity: audioData.highIntensity * 1.2,
            beatDetected: audioData.beatDetected,
            beatConfidence: audioData.beatConfidence || 0,
            beatPhase: audioData.beatPhase || 0,
            rhythmConsistency: audioData.rhythmConsistency || 0.5,
            beatStrength: audioData.beatStrength || 0
        };
        
        // Update outline shader uniforms with rhythm-synchronized values
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.uniforms.time.value = time;
            this.outlineShaderMaterial.uniforms.audioIntensity.value = smoothedAudio.intensity;
            this.outlineShaderMaterial.uniforms.beatActive.value = smoothedAudio.beatDetected ? 
                smoothedAudio.beatConfidence : 0.0;
            this.outlineShaderMaterial.uniforms.bassIntensity.value = smoothedAudio.bassIntensity;
            this.outlineShaderMaterial.uniforms.midIntensity.value = smoothedAudio.midIntensity;
            this.outlineShaderMaterial.uniforms.highIntensity.value = smoothedAudio.highIntensity;
            this.outlineShaderMaterial.uniforms.beatPhase.value = smoothedAudio.beatPhase;
            this.outlineShaderMaterial.uniforms.rhythmConsistency.value = smoothedAudio.rhythmConsistency;
            this.outlineShaderMaterial.uniforms.beatStrength.value = smoothedAudio.beatStrength;
            
            // Dynamic outline properties that react to the rhythm
            const beatFactor = smoothedAudio.beatDetected ? 
                smoothedAudio.beatConfidence * (1.0 - smoothedAudio.beatPhase * 1.5) : 0;
            
            // Electric effect intensity increases on beats
            this.outlineShaderMaterial.uniforms.outlineIntensity.value = 
                0.5 + smoothedAudio.bassIntensity * 0.3 + beatFactor * 0.4;
                
            // Keep electric outline thin but expands slightly with beat
            this.outlineShaderMaterial.uniforms.outlineWidth.value = 
                0.12 + smoothedAudio.midIntensity * 0.06 + beatFactor * 0.08;
        }
        
        // Update particle system (lava effect) - keeps existing fluid behavior
        if (this.particleSystem) {
            // Update uniforms with rhythm-aware audio data
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.material.uniforms.audioIntensity.value = smoothedAudio.intensity;
            this.particleSystem.material.uniforms.beatActive.value = smoothedAudio.beatDetected ? 
                smoothedAudio.beatConfidence : 0.0;
            this.particleSystem.material.uniforms.bassIntensity.value = smoothedAudio.bassIntensity;
            this.particleSystem.material.uniforms.midIntensity.value = smoothedAudio.midIntensity;
            this.particleSystem.material.uniforms.highIntensity.value = smoothedAudio.highIntensity;
            this.particleSystem.material.uniforms.beatPhase.value = smoothedAudio.beatPhase;
            this.particleSystem.material.uniforms.rhythmConsistency.value = smoothedAudio.rhythmConsistency;
            this.particleSystem.material.uniforms.beatStrength.value = smoothedAudio.beatStrength;
            
            // Update particle positions and lifetimes with rhythm-aware behaviors
            const positions = this.particleSystem.geometry.attributes.position.array;
            const sizes = this.particleSystem.geometry.attributes.size.array;
            const colors = this.particleSystem.geometry.attributes.customColor.array;
            const velocities = this.particleSystem.userData.particleVelocities;
            const lifetimes = this.particleSystem.userData.particleLifetimes;
            const energies = this.particleSystem.userData.particleEnergies;
            const emitPositions = this.particleSystem.userData.emitPositions;
            const particlePhases = this.particleSystem.userData.particlePhases;
            const beatSyncFactors = this.particleSystem.userData.beatSyncFactors;
            
            // Get musician dimensions for respawning particles
            const width = this.musician.geometry.parameters.width;
            const height = this.musician.geometry.parameters.height;
            
            // Calculate BPM-aware decay rate
            const bpmDecayMultiplier = smoothedAudio.rhythmConsistency > 0.1 ? 
                1.0 + (smoothedAudio.beatPhase * 0.5) : 1.0;
            
            for (let i = 0; i < positions.length / 3; i++) {
                // Update lifetime with rhythm-aware decay - slower decay for wider spread
                const lifetimeDecay = 0.008 * (1.0 + smoothedAudio.intensity * 0.2) * bpmDecayMultiplier; 
                
                // If particle died or moved too far, respawn it
                const dx = positions[i * 3] - emitPositions[i * 3];
                const dy = positions[i * 3 + 1] - emitPositions[i * 3 + 1];
                const dz = positions[i * 3 + 2] - emitPositions[i * 3 + 2];
                const distFromEmit = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (lifetimes[i] <= 0 || distFromEmit > width * 2.5) { // Increased distance threshold
                    // Determine when to emit - more emissions on beat
                    let shouldEmit = true;
                    if (smoothedAudio.rhythmConsistency > 0.4) {
                        // With consistent rhythm, time emissions to the beat
                        shouldEmit = Math.random() < (0.05 + 
                            smoothedAudio.beatPhase < 0.2 ? 0.2 : 0.05);
                    }
                    
                    if (shouldEmit) {
                        // Return to original emit position with some variation for better spread
                        positions[i * 3] = emitPositions[i * 3] + (Math.random() - 0.5) * 0.2;
                        positions[i * 3 + 1] = emitPositions[i * 3 + 1] + (Math.random() - 0.5) * 0.2;
                        positions[i * 3 + 2] = emitPositions[i * 3 + 2] - Math.random() * 0.2; // More depth variation
                        
                        // Reset with rhythm-aware velocity
                        const emitSpeedMultiplier = 1.0 + 
                            smoothedAudio.intensity * 0.5 + 
                            (smoothedAudio.beatDetected ? 
                                smoothedAudio.beatConfidence * 0.5 : 0);
                        
                        // Calculate movement direction away from center
                        const dx = positions[i * 3];
                        const dy = positions[i * 3 + 1];
                        const distFromCenter = Math.sqrt(dx*dx + dy*dy);
                        
                        if (distFromCenter > 0) {
                            // Normalized direction vector
                            const dirX = dx / distFromCenter;
                            const dirY = dy / distFromCenter;
                            
                            // Faster base velocity for wider spread
                            velocities[i * 3] = dirX * 0.03 * emitSpeedMultiplier;
                            velocities[i * 3 + 1] = dirY * 0.03 * emitSpeedMultiplier;
                        } else {
                            // Random direction for central particles
                            const angle = Math.random() * Math.PI * 2;
                            velocities[i * 3] = Math.cos(angle) * 0.03 * emitSpeedMultiplier;
                            velocities[i * 3 + 1] = Math.sin(angle) * 0.03 * emitSpeedMultiplier;
                        }
                        
                        // Add slight upward drift
                        velocities[i * 3 + 1] += 0.01 * emitSpeedMultiplier;
                        
                        // Z velocity (away from musician) - faster for wider spread
                        velocities[i * 3 + 2] = -0.015 * emitSpeedMultiplier;
                        
                        // Longer lifetime for particles for further travel
                        const lifetimeMultiplier = 1.0 + 
                            (smoothedAudio.beatDetected ? smoothedAudio.beatConfidence : 0.0);
                        lifetimes[i] = (3.0 + Math.random() * 2.0) * lifetimeMultiplier;
                        
                        // Smaller particles for less concentration of brightness
                        const sizeMultiplier = 0.8 + 
                            smoothedAudio.intensity * 0.3 + 
                            (smoothedAudio.beatDetected ? smoothedAudio.beatConfidence * 0.5 : 0.0);
                        sizes[i] = (0.8 + Math.random() * 1.8) * sizeMultiplier;
                        
                        // Energy level - for particle animation
                        energies[i] = 0.2 + Math.random() * 0.8;
                        
                        // Refresh phase offset
                        particlePhases[i] = Math.random() * Math.PI * 2;
                        
                        // How much this particle syncs to the beat
                        beatSyncFactors[i] = Math.random() * 0.8 + 0.2;
                        
                        // Color with slight variation - more subdued
                        const colorIntensity = 0.9 + (smoothedAudio.beatDetected ? 
                            smoothedAudio.beatConfidence * 0.2 : 0.0);
                        colors[i * 3] = this.baseColor.r * (0.85 + Math.random() * 0.15) * colorIntensity;
                        colors[i * 3 + 1] = this.baseColor.g * (0.85 + Math.random() * 0.15) * colorIntensity;
                        colors[i * 3 + 2] = this.baseColor.b * (0.85 + Math.random() * 0.15) * colorIntensity;
                    }
                } else {
                    // Update existing particle with rhythm-aware movement
                    
                    // Base movement - faster for wider spread
                    positions[i * 3] += velocities[i * 3] * (1.0 + energies[i] * 0.5);
                    positions[i * 3 + 1] += velocities[i * 3 + 1] * (1.0 + energies[i] * 0.5);
                    positions[i * 3 + 2] += velocities[i * 3 + 2] * (1.0 + energies[i] * 0.5);
                    
                    // Add rhythm-synchronized swirl
                    const swirlingBeatFactor = smoothedAudio.rhythmConsistency > 0.3 ?
                        0.3 + Math.sin(smoothedAudio.beatPhase * Math.PI * 2 + particlePhases[i]) * 0.2 : 0.3;
                    
                    const swirl = 0.002 * smoothedAudio.midIntensity * swirlingBeatFactor; // Reduced swirl
                    const distance = Math.sqrt(positions[i * 3] * positions[i * 3] + 
                                            positions[i * 3 + 1] * positions[i * 3 + 1]);
                    
                    if (distance > 0.2) {
                        velocities[i * 3] += -positions[i * 3 + 1] * swirl / distance;
                        velocities[i * 3 + 1] += positions[i * 3] * swirl / distance;
                    }
                    
                    // Apply gentle floating upward (add beat-synchronized pulses)
                    const beatPulse = smoothedAudio.beatDetected ? 
                        Math.max(0, 1.0 - smoothedAudio.beatPhase * 2.0) * 
                        smoothedAudio.beatConfidence * 0.02 * beatSyncFactors[i] : 0;
                    
                    velocities[i * 3 + 1] += 0.001 + beatPulse; // Increased upward drift
                    
                    // Add more z-distance over time for better depth
                    velocities[i * 3 + 2] -= 0.0005 * (1.0 + smoothedAudio.bassIntensity * 0.5);
                    
                    // Improved radial dispersion - particles spread more with rhythm
                    const outwardForceFactor = 0.0006 * (1.0 + 
                        smoothedAudio.bassIntensity * 0.5 + 
                        (smoothedAudio.beatDetected ? smoothedAudio.beatConfidence * 0.5 : 0));
                    
                    if (distance < width * 0.8) {
                        // Push particles outward proportional to distance - increased force
                        const pushForce = outwardForceFactor * (0.9 - distance/(width * 0.8));
                        
                        if (positions[i * 3] !== 0) {
                            const dirX = positions[i * 3] / Math.abs(positions[i * 3]);
                            velocities[i * 3] += dirX * pushForce;
                        }
                        
                        if (positions[i * 3 + 1] !== 0) {
                            const dirY = positions[i * 3 + 1] / Math.abs(positions[i * 3 + 1]);
                            velocities[i * 3 + 1] += dirY * pushForce;
                        }
                    }
                    
                    // Slower velocity damping for longer travel distance
                    velocities[i * 3] *= 0.996;
                    velocities[i * 3 + 1] *= 0.996;
                    velocities[i * 3 + 2] *= 0.996;
                    
                    // Add beat-synchronized bursts of movement
                    if (smoothedAudio.beatDetected) {
                        const beatImpulse = smoothedAudio.beatConfidence * beatSyncFactors[i];
                        const beatPhaseImpulse = Math.max(0, 0.5 - smoothedAudio.beatPhase);
                        
                        velocities[i * 3] += (Math.random() - 0.5) * 0.02 * beatImpulse * beatPhaseImpulse;
                        velocities[i * 3 + 1] += Math.random() * 0.025 * beatImpulse * beatPhaseImpulse;
                        velocities[i * 3 + 2] += (Math.random() - 0.5) * 0.015 * beatImpulse * beatPhaseImpulse;
                        
                        // Subtle size pulse on beat
                        sizes[i] *= 1.0 + 0.08 * beatImpulse * beatPhaseImpulse; // Reduced size pulse
                    }
                    
                    // Size reduction based on lifetime and distance - slower reduction
                    const lifeProgress = 1.0 - (lifetimes[i] / 5.0); // Assumes max lifetime is around 5
                    sizes[i] *= 0.998 - lifeProgress * 0.0008;
                    
                    // Fade out particles as they get further from musician and age - slower fade at greater distances
                    const distanceFadeThreshold = width * 1.2; // Increased threshold
                    if (distance > distanceFadeThreshold) {
                        const fadeRatio = (distance - distanceFadeThreshold) / (width * 1.0);
                        lifetimes[i] -= 0.007 * fadeRatio * (1.0 + smoothedAudio.intensity * 0.3);
                    }
                    
                    // Apply z-distance-based fadeout - slower for longer visible distance
                    const zDistance = Math.abs(positions[i * 3 + 2] - emitPositions[i * 3 + 2]);
                    if (zDistance > 1.5) { // Increased threshold
                        lifetimes[i] -= 0.006 * ((zDistance - 1.5) / 1.5);
                    }
                    
                    // Color shift with rhythm
                    if (smoothedAudio.rhythmConsistency > 0.3) {
                        // Smoother color transitions when rhythm is consistent
                        const rhythmicFactor = 0.004 * smoothedAudio.intensity; // Reduced factor
                        
                        colors[i * 3] += Math.sin(time + particlePhases[i] + 
                                                smoothedAudio.beatPhase * 6.28) * 
                                        rhythmicFactor * smoothedAudio.bassIntensity;
                        
                        colors[i * 3 + 1] += Math.sin(time * 1.1 + particlePhases[i] + 
                                                    smoothedAudio.beatPhase * 3.14) * 
                                            rhythmicFactor * smoothedAudio.midIntensity;
                        
                        colors[i * 3 + 2] += Math.sin(time * 0.9 + particlePhases[i] + 
                                                    smoothedAudio.beatPhase * 9.42) * 
                                            rhythmicFactor * smoothedAudio.highIntensity;
                    } else {
                        // More random color shifts when rhythm is less defined
                        const randomFactor = 0.002 * smoothedAudio.intensity; // Reduced factor
                        colors[i * 3] += (Math.random() * 2 - 1) * randomFactor;
                        colors[i * 3 + 1] += (Math.random() * 2 - 1) * randomFactor;
                        colors[i * 3 + 2] += (Math.random() * 2 - 1) * randomFactor;
                    }
                    
                    // Keep colors within reasonable range
                    colors[i * 3] = Math.max(0, Math.min(1, colors[i * 3]));
                    colors[i * 3 + 1] = Math.max(0, Math.min(1, colors[i * 3 + 1]));
                    colors[i * 3 + 2] = Math.max(0, Math.min(1, colors[i * 3 + 2]));
                }
            }
            
            // Update the geometry
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.geometry.attributes.size.needsUpdate = true;
            this.particleSystem.geometry.attributes.customColor.needsUpdate = true;
        }
    }
    
    // Clean up resources
    dispose() {
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.dispose();
        }
        
        if (this.particleSystem) {
            this.musician.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
        }
        
        // Restore original material
        if (this.originalMaterial) {
            this.musician.material = this.originalMaterial;
        }
    }
}

export { MusicianEffect };