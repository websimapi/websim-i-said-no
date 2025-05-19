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
    
    // Calculate position with smoother movement based on audio
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Make particles animate more fluidly with the music
    float sizeModulation = audioIntensity * 0.8 + 0.5 + sin(time * 3.0) * 0.2 * beatActive;
    
    // Add some smoother movement based on beat detection
    if (beatActive > 0.5) {
        mvPosition.xyz += normalize(mvPosition.xyz) * sin(time * 8.0) * 0.03 * beatActive;
    }
    
    gl_PointSize = size * sizeModulation * (300.0 / -mvPosition.z);
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
    
    // Calculate distance to edge using alpha channel gradient - IMPROVED EDGE DETECTION
    float distanceToEdge = 0.0;
    if (texColor.a > 0.05 && texColor.a < 0.99) {
        distanceToEdge = 1.0 - abs(0.5 - texColor.a) * 2.0;
    }
    
    // Animate outline width with audio and time - more subtle animation
    float animatedWidth = outlineWidth * (1.0 + sin(time * 2.5) * 0.3 * bassIntensity);
    
    // Create a more dynamic, animated glowing outline effect - more subtle
    float glowStrength = smoothstep(0.0, animatedWidth, distanceToEdge) * outlineIntensity;
    
    // Make the glow pulse more fluidly with the audio
    float pulseFactor = 1.0 + sin(time * 3.5) * 0.4 * audioIntensity 
                       + sin(time * 7.0) * 0.3 * beatActive;
    glowStrength *= pulseFactor;
    
    // Create a smoother wave-like distortion in the outline
    float waveDistortion = sin(vUv.y * 10.0 + time * 2.5) * 0.08 * beatActive;
    glowStrength *= (1.0 + waveDistortion);
    
    // Color shift based on audio frequencies - smoother transitions
    float colorShift = sin(time * 0.4) * 0.4 * midIntensity;
    vec3 shiftedColor = baseColor;
    
    // Smoother hue shifts based on different audio bands
    shiftedColor.r = baseColor.r * (1.0 + sin(time * 0.8) * 0.25 * bassIntensity);
    shiftedColor.g = baseColor.g * (1.0 + cos(time * 1.0) * 0.25 * midIntensity);
    shiftedColor.b = baseColor.b * (1.0 + sin(time * 0.6) * 0.25 * highIntensity);
    
    // On beat, add a more subtle flash
    if (beatActive > 0.5) {
        shiftedColor = mix(shiftedColor, vec3(1.0), beatActive * 0.4);
    }
    
    // Mix the texture color with the animated outline glow
    vec4 finalColor = texColor;
    
    // Add the dynamic glow around the edges - more subtle
    if (glowStrength > 0.0) {
        finalColor = mix(finalColor, vec4(shiftedColor, texColor.a), glowStrength);
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
varying vec3 vColor;

void main() {
    // Calculate distance from center of point
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard; // Make particles round
    
    // Create a softer edge for better dissipation
    float softFactor = 0.25 + 0.08 * sin(time * 2.5 + vColor.r * 8.0) * bassIntensity;
    float alpha = smoothstep(softFactor, 0.5, 0.5 - dist);
    
    // Lower base opacity for better transparency
    alpha *= 0.7;
    
    // Create a smoother pulsing effect
    float pulse = 0.6 + 0.4 * sin(time * 4.0 + vColor.g * 6.0);
    pulse *= (0.4 + 0.6 * audioIntensity); // More fluid audio influence
    
    // Add subtle brightness on beats
    float beatBoost = max(0.0, beatActive * 0.5);
    
    // Shift colors based on audio frequency bands - smoother transitions
    vec3 dynamicColor = vColor;
    dynamicColor.r *= 1.0 + sin(time * 0.6) * 0.3 * bassIntensity;
    dynamicColor.g *= 1.0 + cos(time * 0.7) * 0.3 * midIntensity;
    dynamicColor.b *= 1.0 + sin(time * 0.9) * 0.3 * highIntensity;
    
    // Gentler brightening on beats
    dynamicColor = mix(dynamicColor, dynamicColor * 1.6, beatBoost);
    
    // Add subtle color variation for more fluid effect
    float colorVariation = sin(time * 1.5 + gl_PointCoord.x * 8.0) * 0.12;
    dynamicColor = mix(dynamicColor, baseColor, colorVariation);
    
    // Lower opacity for better visibility of musicians
    float dynamicAlpha = alpha * pulse * (0.5 + bassIntensity * 0.2 + midIntensity * 0.2);
    
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
            beatDetected: false
        };
        
        this.init();
    }
    
    init() {
        // Create the outline glow material with more subtle uniforms
        this.outlineShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.musician.material.map },
                baseColor: { value: this.baseColor },
                outlineWidth: { value: 0.1 }, // Narrower outline
                outlineIntensity: { value: 0.6 }, // Less intense
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
        // More particles but lower opacity for fluid effect
        const particleCount = 800;
        const particleGeometry = new THREE.BufferGeometry();
        
        // Get musician dimensions
        const width = this.musician.geometry.parameters.width;
        const height = this.musician.geometry.parameters.height;
        
        // Create initial empty positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Set initial values - position particles further behind the musician 
        for (let i = 0; i < particleCount; i++) {
            // Position particles with a wider dispersal
            const angle = Math.random() * Math.PI * 2;
            
            // Use a mix of particles - some near center, more around edges and further out
            let radius;
            if (Math.random() < 0.6) {
                // Position more particles near the edge for a radiating effect
                radius = width * 0.35 + Math.random() * width * 0.3; // Wider radius
            } else {
                // Some particles more central
                radius = Math.random() * width * 0.35;
            }
            
            const x = Math.cos(angle) * radius;
            const y = (Math.random() - 0.5) * height * 1.1; // More height coverage
            
            // Position relative to the musician's center, further behind
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = -0.3; // Further behind for better separation
            
            // Subtle color variation based on base color
            colors[i * 3] = this.baseColor.r + (Math.random() * 0.2 - 0.1);
            colors[i * 3 + 1] = this.baseColor.g + (Math.random() * 0.2 - 0.1);
            colors[i * 3 + 2] = this.baseColor.b + (Math.random() * 0.2 - 0.1);
            
            // Smaller particles for less visual obstruction
            sizes[i] = Math.random() * 3.5 + 1.5;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Enhanced particle material with more transparency
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
            // More gentle velocities for more fluid movement
            this.particleSystem.userData.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.03;
            this.particleSystem.userData.particleVelocities[i * 3 + 1] = Math.random() * 0.04 + 0.01;
            this.particleSystem.userData.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
            
            // Longer lifetimes for more fluid movement
            this.particleSystem.userData.particleLifetimes[i] = Math.random() * 4 + 2.0;
            
            // Energy level - for particle animation
            this.particleSystem.userData.particleEnergies[i] = Math.random();
        }
        
        // Add particle system as a child of the musician to inherit its position and orientation
        this.musician.add(this.particleSystem);
    }
    
    update(time, audioData) {
        // Update audio data
        this.audioData = audioData;
        
        // Smooth audio response for more fluid effects
        const smoothedAudio = {
            intensity: audioData.intensity * 1.2,
            bassIntensity: audioData.bassIntensity * 1.2,
            midIntensity: audioData.midIntensity * 1.2,
            highIntensity: audioData.highIntensity * 1.2,
            beatDetected: audioData.beatDetected
        };
        
        // Update outline shader uniforms with smoother transitions
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.uniforms.time.value = time;
            this.outlineShaderMaterial.uniforms.audioIntensity.value = smoothedAudio.intensity;
            this.outlineShaderMaterial.uniforms.beatActive.value = smoothedAudio.beatDetected ? 1.0 : 0.0;
            this.outlineShaderMaterial.uniforms.bassIntensity.value = smoothedAudio.bassIntensity;
            this.outlineShaderMaterial.uniforms.midIntensity.value = smoothedAudio.midIntensity;
            this.outlineShaderMaterial.uniforms.highIntensity.value = smoothedAudio.highIntensity;
            
            // Smoother outline dynamics
            if (smoothedAudio.beatDetected) {
                this.outlineShaderMaterial.uniforms.outlineIntensity.value = 0.9; // Less bright on beat
                this.outlineShaderMaterial.uniforms.outlineWidth.value = 0.12; // Less wide on beat
            } else {
                this.outlineShaderMaterial.uniforms.outlineIntensity.value = 
                    0.6 + smoothedAudio.bassIntensity * 0.4; // Subtler bass influence
                this.outlineShaderMaterial.uniforms.outlineWidth.value = 
                    0.08 + smoothedAudio.midIntensity * 0.06; // Subtler width variation
            }
        }
        
        // Update particle system with smoother transitions
        if (this.particleSystem) {
            // Update uniforms with smoothed audio data
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.material.uniforms.audioIntensity.value = smoothedAudio.intensity;
            this.particleSystem.material.uniforms.beatActive.value = smoothedAudio.beatDetected ? 1.0 : 0.0;
            this.particleSystem.material.uniforms.bassIntensity.value = smoothedAudio.bassIntensity;
            this.particleSystem.material.uniforms.midIntensity.value = smoothedAudio.midIntensity;
            this.particleSystem.material.uniforms.highIntensity.value = smoothedAudio.highIntensity;
            
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
                // Update lifetime with gentler decay
                lifetimes[i] -= 0.012 * (1.0 + smoothedAudio.intensity * 0.2); 
                
                // If particle died, respawn it near the outline
                if (lifetimes[i] <= 0) {
                    // Generate points more around the outline for a radiating effect
                    const angle = Math.random() * Math.PI * 2;
                    
                    // More particles around the edge of the musician with wider distribution
                    let radius;
                    if (Math.random() < 0.65) {
                        // Position more particles near the edge for a radiating effect
                        radius = width * 0.35 + Math.random() * width * 0.3;
                    } else {
                        // Some particles more central
                        radius = Math.random() * width * 0.35;
                    }
                    
                    const x = Math.cos(angle) * radius;
                    const y = (Math.random() - 0.5) * height * 1.1;
                    
                    // Set new position
                    positions[i * 3] = x;
                    positions[i * 3 + 1] = y;
                    positions[i * 3 + 2] = -0.3; // Further behind for better separation
                    
                    // Smoother new velocity influenced by audio intensity
                    const velocityMultiplier = 1.0 + smoothedAudio.intensity * 0.8;
                    velocities[i * 3] = (Math.random() - 0.5) * 0.03 * velocityMultiplier;
                    velocities[i * 3 + 1] = (Math.random() * 0.05 + 0.02) * velocityMultiplier;
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.03 * velocityMultiplier;
                    
                    // Longer lifetime for more fluid animation
                    lifetimes[i] = Math.random() * 3 + 2.0 - (smoothedAudio.intensity * 0.3);
                    
                    // Smaller particles for less obstructed view
                    sizes[i] = (Math.random() * 3 + 1.5) * (1.0 + smoothedAudio.intensity * 0.6);
                    
                    // Energy level - for particle animation
                    energies[i] = Math.random();
                    
                    // Subtler color variation
                    colors[i * 3] = this.baseColor.r + (Math.random() * 0.2 - 0.1) + smoothedAudio.bassIntensity * 0.2;
                    colors[i * 3 + 1] = this.baseColor.g + (Math.random() * 0.2 - 0.1) + smoothedAudio.midIntensity * 0.2;
                    colors[i * 3 + 2] = this.baseColor.b + (Math.random() * 0.2 - 0.1) + smoothedAudio.highIntensity * 0.2;
                } else {
                    // Update existing particle position with smoother movement
                    positions[i * 3] += velocities[i * 3] * (1.0 + energies[i] * 0.6);
                    positions[i * 3 + 1] += velocities[i * 3 + 1] * (1.0 + energies[i] * 0.6);
                    positions[i * 3 + 2] += velocities[i * 3 + 2] * (1.0 + energies[i] * 0.6);
                    
                    // Apply gentler swirling effect for more fluid movement
                    const swirl = 0.002 * smoothedAudio.midIntensity;
                    const distance = Math.sqrt(positions[i * 3] * positions[i * 3] + positions[i * 3 + 1] * positions[i * 3 + 1]);
                    if (distance > 0.3) {
                        velocities[i * 3] += -positions[i * 3 + 1] * swirl / distance;
                        velocities[i * 3 + 1] += positions[i * 3] * swirl / distance;
                    }
                    
                    // Apply some gravity effect - smoother floating upward
                    velocities[i * 3 + 1] += 0.0008;
                    
                    // Increase dispersion range - particles travel further
                    // Reduce forces closer to the musician, increase them further away
                    if (distance < width * 0.5) {
                        // Gentler pushing outward for particles close to musician
                        const pushForce = 0.0005 * (1.0 - distance/(width * 0.5));
                        velocities[i * 3] += positions[i * 3] > 0 ? pushForce : -pushForce;
                        velocities[i * 3 + 1] += positions[i * 3 + 1] > 0 ? pushForce : -pushForce;
                    }
                    
                    // Dampen horizontal movement less for wider dispersal
                    velocities[i * 3] *= 0.992;
                    velocities[i * 3 + 2] *= 0.992;
                    
                    // Add gentler movement on beats
                    if (smoothedAudio.beatDetected) {
                        velocities[i * 3] += (Math.random() - 0.5) * 0.02 * energies[i];
                        velocities[i * 3 + 1] += Math.random() * 0.025 * energies[i];
                        velocities[i * 3 + 2] += (Math.random() - 0.5) * 0.02 * energies[i];
                        
                        // Subtle size increase on beat
                        sizes[i] *= 1.1;
                    }
                    
                    // Gradually reduce size as particle ages for better dissipation
                    const lifeFactor = lifetimes[i] / 3.0;
                    sizes[i] *= 0.997;
                    
                    // Smoothly fade out particles as they get further from musician
                    if (distance > width * 0.6) {
                        // More rapid fadeout for distant particles
                        lifetimes[i] -= 0.01 * (distance / (width * 0.6));
                    }
                    
                    // Smoother color shift
                    const colorShift = 0.005 * smoothedAudio.intensity;
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