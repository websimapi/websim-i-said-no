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

void main() {
    vUv = uv;
    vColor = customColor;
    
    // Calculate position with enhanced movement based on audio
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Make particles animate more with the music
    float sizeModulation = audioIntensity * 0.6 + 0.4 + sin(time * 4.0) * 0.15 * beatActive;
    
    // Add some extra movement based on beat detection
    if (beatActive > 0.5) {
        mvPosition.xyz += normalize(mvPosition.xyz) * sin(time * 10.0) * 0.02 * beatActive;
    }
    
    gl_PointSize = size * sizeModulation * (280.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment shader for musician outline glow effect
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
varying vec2 vUv;
varying vec3 vColor;

// Function to generate a smooth noise-like distortion
float noise(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
    vec4 texColor = texture2D(map, vUv);
    
    // Discard fully transparent pixels immediately
    if (texColor.a < 0.01) {
        discard;
    }
    
    // Calculate distance to edge using alpha channel gradient
    float distanceToEdge = 0.0;
    if (texColor.a > 0.1 && texColor.a < 0.99) {
        distanceToEdge = 1.0 - abs(0.5 - texColor.a) * 2.0;
    }
    
    // Animate outline width with audio and time
    float animatedWidth = outlineWidth * (1.0 + sin(time * 3.0) * 0.2 * bassIntensity);
    
    // Create a more dynamic, animated glowing outline effect
    float glowStrength = smoothstep(0.0, animatedWidth, distanceToEdge) * outlineIntensity;
    
    // Make the glow pulse more dramatically with the audio
    float pulseFactor = 1.0 + sin(time * 4.0) * 0.3 * audioIntensity 
                       + sin(time * 8.0) * 0.2 * beatActive;
    glowStrength *= pulseFactor;
    
    // Create a wave-like distortion in the outline for more animation
    float waveDistortion = sin(vUv.y * 10.0 + time * 2.0) * 0.05 * beatActive;
    glowStrength *= (1.0 + waveDistortion);
    
    // Color shift based on audio frequencies - more dynamic color changes
    float colorShift = sin(time * 0.5) * 0.3 * midIntensity;
    vec3 shiftedColor = baseColor;
    
    // Shift the hue slightly based on different audio bands
    shiftedColor.r = baseColor.r * (1.0 + sin(time) * 0.15 * bassIntensity);
    shiftedColor.g = baseColor.g * (1.0 + cos(time * 1.2) * 0.15 * midIntensity);
    shiftedColor.b = baseColor.b * (1.0 + sin(time * 0.7) * 0.15 * highIntensity);
    
    // On beat, add a flash of brightness
    if (beatActive > 0.5) {
        shiftedColor = mix(shiftedColor, vec3(1.0), beatActive * 0.3);
    }
    
    // Mix the texture color with the animated outline glow
    vec4 finalColor = texColor;
    
    // Add the dynamic glow around the edges
    if (glowStrength > 0.0) {
        finalColor = mix(finalColor, vec4(shiftedColor, texColor.a), glowStrength);
    }
    
    gl_FragColor = finalColor;
}
`;

// Particle fragment shader with enhanced effects
const particleFragmentShader = `
uniform vec3 baseColor;
uniform float time;
uniform float audioIntensity;
uniform float beatActive;
uniform float bassIntensity;
uniform float midIntensity;
uniform float highIntensity;
varying vec3 vColor;

void main() {
    // Calculate distance from center of point
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard; // Make particles round
    
    // Create a more dynamic, animated soft edge
    float softFactor = 0.25 + 0.05 * sin(time * 3.0 + vColor.r * 10.0) * bassIntensity;
    float alpha = smoothstep(softFactor, 0.5, 0.5 - dist);
    
    // Create a pulsing effect based on time and audio - more responsive
    float pulse = 0.7 + 0.3 * sin(time * 5.0 + vColor.g * 8.0);
    pulse *= (0.6 + 0.4 * audioIntensity);
    
    // Add extra brightness on beats
    float beatBoost = max(0.0, beatActive * 0.4);
    
    // Shift colors based on audio frequency bands
    vec3 dynamicColor = vColor;
    dynamicColor.r *= 1.0 + sin(time * 0.7) * 0.2 * bassIntensity;
    dynamicColor.g *= 1.0 + cos(time * 0.9) * 0.2 * midIntensity;
    dynamicColor.b *= 1.0 + sin(time * 1.1) * 0.2 * highIntensity;
    
    // Brighten on beats
    dynamicColor = mix(dynamicColor, dynamicColor * 1.5, beatBoost);
    
    // Add some subtle color variation for more dynamic effect
    float colorVariation = sin(time * 2.0 + gl_PointCoord.x * 10.0) * 0.1;
    dynamicColor = mix(dynamicColor, baseColor, colorVariation);
    
    // More dynamic opacity modulation based on audio
    float dynamicAlpha = alpha * pulse * (0.6 + bassIntensity * 0.2 + midIntensity * 0.2);
    
    // Final color with enhanced audio reactivity
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
            beatDetected: false
        };
        
        this.init();
    }
    
    init() {
        // Create the outline glow material with enhanced uniforms
        this.outlineShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.musician.material.map },
                baseColor: { value: this.baseColor },
                outlineWidth: { value: 0.08 },
                outlineIntensity: { value: 0.6 },
                time: { value: 0 },
                audioIntensity: { value: 0 },
                beatActive: { value: 0 },
                bassIntensity: { value: 0 },
                midIntensity: { value: 0 },
                highIntensity: { value: 0 }
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
        
        // Create particles behind the musician
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        const particleCount = 400; 
        const particleGeometry = new THREE.BufferGeometry();
        
        // Get musician dimensions
        const width = this.musician.geometry.parameters.width;
        const height = this.musician.geometry.parameters.height;
        
        // Create initial empty positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Set initial values - position particles behind the musician 
        for (let i = 0; i < particleCount; i++) {
            // Position particles more around the outline for a radiating effect
            const angle = Math.random() * Math.PI * 2;
            
            // Use a mix of particles - some near center, more around edges
            let radius;
            if (Math.random() < 0.7) {
                // Position more particles near the edge for a radiating effect
                radius = width * 0.3 + Math.random() * width * 0.15;
            } else {
                // Some particles more central
                radius = Math.random() * width * 0.3;
            }
            
            const x = Math.cos(angle) * radius;
            const y = (Math.random() - 0.5) * height * 0.8;
            
            // Position relative to the musician's center, slightly behind
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = -0.15; // Position particles BEHIND the musician plane
            
            // More varied color based on base color
            colors[i * 3] = this.baseColor.r + (Math.random() * 0.2 - 0.1);
            colors[i * 3 + 1] = this.baseColor.g + (Math.random() * 0.2 - 0.1);
            colors[i * 3 + 2] = this.baseColor.b + (Math.random() * 0.2 - 0.1);
            
            // More varied sizes for more dynamic effect
            sizes[i] = Math.random() * 4 + 1.5;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Enhanced particle material with more uniforms
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                baseColor: { value: this.baseColor },
                time: { value: 0 },
                audioIntensity: { value: 0 },
                beatActive: { value: 0 },
                bassIntensity: { value: 0 },
                midIntensity: { value: 0 },
                highIntensity: { value: 0 }
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
            particleEnergies: new Float32Array(particleCount)  
        };
        
        // Set initial velocities, lifetimes, and energies
        for (let i = 0; i < particleCount; i++) {
            // More varied velocities for more dynamic movement
            this.particleSystem.userData.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
            this.particleSystem.userData.particleVelocities[i * 3 + 1] = Math.random() * 0.04 + 0.01;
            this.particleSystem.userData.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
            
            // Varied lifetimes for more natural flow
            this.particleSystem.userData.particleLifetimes[i] = Math.random() * 2 + 0.5;
            
            // Energy level - for particle animation
            this.particleSystem.userData.particleEnergies[i] = Math.random();
        }
        
        // Add particle system as a child of the musician to inherit its position and orientation
        this.musician.add(this.particleSystem);
    }
    
    update(time, audioData) {
        // Update audio data
        this.audioData = audioData;
        
        // Update outline shader uniforms with enhanced audio reactivity
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.uniforms.time.value = time;
            this.outlineShaderMaterial.uniforms.audioIntensity.value = audioData.intensity;
            this.outlineShaderMaterial.uniforms.beatActive.value = audioData.beatDetected ? 1.0 : 0.0;
            this.outlineShaderMaterial.uniforms.bassIntensity.value = audioData.bassIntensity;
            this.outlineShaderMaterial.uniforms.midIntensity.value = audioData.midIntensity;
            this.outlineShaderMaterial.uniforms.highIntensity.value = audioData.highIntensity;
            
            // Make outline more dynamic
            if (audioData.beatDetected) {
                this.outlineShaderMaterial.uniforms.outlineIntensity.value = 0.85; 
                this.outlineShaderMaterial.uniforms.outlineWidth.value = 0.09; 
            } else {
                this.outlineShaderMaterial.uniforms.outlineIntensity.value = 
                    0.6 + audioData.bassIntensity * 0.4; 
                this.outlineShaderMaterial.uniforms.outlineWidth.value = 
                    0.07 + audioData.midIntensity * 0.04; 
            }
        }
        
        // Update particle system with enhanced audio reactivity
        if (this.particleSystem) {
            // Update uniforms
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.material.uniforms.audioIntensity.value = audioData.intensity;
            this.particleSystem.material.uniforms.beatActive.value = audioData.beatDetected ? 1.0 : 0.0;
            this.particleSystem.material.uniforms.bassIntensity.value = audioData.bassIntensity;
            this.particleSystem.material.uniforms.midIntensity.value = audioData.midIntensity;
            this.particleSystem.material.uniforms.highIntensity.value = audioData.highIntensity;
            
            // Update particle positions and lifetimes
            const positions = this.particleSystem.geometry.attributes.position.array;
            const sizes = this.particleSystem.geometry.attributes.size.array;
            const colors = this.particleSystem.geometry.attributes.customColor.array;
            const velocities = this.particleSystem.userData.particleVelocities;
            const lifetimes = this.particleSystem.userData.particleLifetimes;
            const energies = this.particleSystem.userData.particleEnergies;
            
            // Get musician dimensions for respawning particles
            const width = this.musician.geometry.parameters.width;
            const height = this.musician.geometry.parameters.height;
            
            for (let i = 0; i < positions.length / 3; i++) {
                // Update lifetime with audio-reactive decay
                lifetimes[i] -= 0.016 * (1.0 + audioData.intensity * 0.2); 
                
                // If particle died, respawn it near the outline
                if (lifetimes[i] <= 0) {
                    // Generate points more around the outline for a radiating effect
                    const angle = Math.random() * Math.PI * 2;
                    
                    // More particles around the edge of the musician
                    let radius;
                    if (Math.random() < 0.7) {
                        // Position more particles near the edge for a radiating effect
                        radius = width * 0.3 + Math.random() * width * 0.15;
                    } else {
                        // Some particles more central
                        radius = Math.random() * width * 0.3;
                    }
                    
                    const x = Math.cos(angle) * radius;
                    const y = (Math.random() - 0.5) * height * 0.8;
                    
                    // Set new position
                    positions[i * 3] = x;
                    positions[i * 3 + 1] = y;
                    positions[i * 3 + 2] = -0.15; // Behind musician
                    
                    // Dynamic new velocity influenced by audio intensity
                    const velocityMultiplier = 1.0 + audioData.intensity * 0.8;
                    velocities[i * 3] = (Math.random() - 0.5) * 0.03 * velocityMultiplier;
                    velocities[i * 3 + 1] = (Math.random() * 0.05 + 0.02) * velocityMultiplier;
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03 * velocityMultiplier;
                    
                    // Reset lifetime - longer for more persistent particles
                    lifetimes[i] = Math.random() * 2 + 1;
                    
                    // Particle size based on audio intensity
                    sizes[i] = (Math.random() * 3 + 2) * (1.0 + audioData.intensity * 0.6);
                    
                    // Energy level - for particle animation
                    energies[i] = Math.random();
                    
                    // Color variation based on audio frequency
                    colors[i * 3] = this.baseColor.r + (Math.random() * 0.2 - 0.1) + audioData.bassIntensity * 0.2;
                    colors[i * 3 + 1] = this.baseColor.g + (Math.random() * 0.2 - 0.1) + audioData.midIntensity * 0.2;
                    colors[i * 3 + 2] = this.baseColor.b + (Math.random() * 0.2 - 0.1) + audioData.highIntensity * 0.2;
                } else {
                    // Update existing particle position with more dynamic movement
                    positions[i * 3] += velocities[i * 3] * (1.0 + energies[i] * 0.5);
                    positions[i * 3 + 1] += velocities[i * 3 + 1] * (1.0 + energies[i] * 0.5);
                    positions[i * 3 + 2] += velocities[i * 3 + 2] * (1.0 + energies[i] * 0.5);
                    
                    // Apply some swirling effect based on particle position and music
                    const swirl = 0.002 * audioData.midIntensity;
                    const distance = Math.sqrt(positions[i * 3] * positions[i * 3] + positions[i * 3 + 1] * positions[i * 3 + 1]);
                    if (distance > 0.2) {
                        velocities[i * 3] += -positions[i * 3 + 1] * swirl / distance;
                        velocities[i * 3 + 1] += positions[i * 3] * swirl / distance;
                    }
                    
                    // Apply some "gravity" effect - gentle floating upward
                    velocities[i * 3 + 1] += 0.0005;
                    
                    // Dampen horizontal movement
                    velocities[i * 3] *= 0.99;
                    velocities[i * 3 + 2] *= 0.99;
                    
                    // Add extra movement on beats - more energetic
                    if (audioData.beatDetected) {
                        velocities[i * 3] += (Math.random() - 0.5) * 0.015 * energies[i];
                        velocities[i * 3 + 1] += Math.random() * 0.025 * energies[i];
                        velocities[i * 3 + 2] += (Math.random() - 0.5) * 0.015 * energies[i];
                        
                        // Slightly increase size on beat
                        sizes[i] *= 1.05;
                    }
                    
                    // Gradually reduce size as particle ages for dissipation effect
                    const lifeFactor = lifetimes[i] / 3.0; 
                    sizes[i] *= 0.995; 
                    
                    // Color shift based on age and audio
                    const colorShift = 0.005 * audioData.intensity;
                    colors[i * 3] += (Math.random() * 2 - 1) * colorShift;
                    colors[i * 3 + 1] += (Math.random() * 2 - 1) * colorShift;
                    colors[i * 3 + 2] += (Math.random() * 2 - 1) * colorShift;
                    
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