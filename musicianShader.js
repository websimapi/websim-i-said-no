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

void main() {
    vUv = uv;
    vColor = customColor;
    
    // Calculate position with some movement based on audio
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    
    gl_PointSize = size * (audioIntensity * 0.5 + 0.5) * (300.0 / -mvPosition.z);
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
varying vec2 vUv;
varying vec3 vColor;

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
    
    // Create the glowing outline effect
    float glowStrength = smoothstep(0.0, outlineWidth, distanceToEdge) * outlineIntensity;
    
    // Make the glow pulse with the audio
    glowStrength *= (1.0 + sin(time * 5.0) * 0.3 * audioIntensity);
    
    // Mix the texture color with the outline glow
    vec3 glowColor = mix(baseColor, baseColor * (1.0 + audioIntensity), 0.5);
    vec4 finalColor = texColor;
    
    // Add the glow around the edges
    if (glowStrength > 0.0) {
        finalColor = mix(finalColor, vec4(glowColor, texColor.a), glowStrength);
    }
    
    gl_FragColor = finalColor;
}
`;

// Particle fragment shader
const particleFragmentShader = `
uniform vec3 baseColor;
uniform float time;
uniform float audioIntensity;
varying vec3 vColor;

void main() {
    // Calculate distance from center of point
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard; // Make particles round
    
    // Fade out towards edges for soft particles
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    // Create a pulsing effect based on time and audio
    float pulse = 0.8 + 0.2 * sin(time * 5.0 + vColor.r * 10.0);
    pulse *= (0.8 + 0.4 * audioIntensity);
    
    // Final color with pulsing alpha
    gl_FragColor = vec4(vColor * pulse, alpha * pulse);
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
        // Create the outline glow material
        this.outlineShaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                map: { value: this.musician.material.map },
                baseColor: { value: this.baseColor },
                outlineWidth: { value: 0.1 },
                outlineIntensity: { value: 0.8 },
                time: { value: 0 },
                audioIntensity: { value: 0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.01 // Improve transparency handling
        });
        
        // Store original material
        this.originalMaterial = this.musician.material;
        
        // Apply the shader material
        this.musician.material = this.outlineShaderMaterial;
        
        // Create particles emanating from the musician outline
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        const particleCount = 500;
        const particleGeometry = new THREE.BufferGeometry();
        
        // Get musician dimensions
        const width = this.musician.geometry.parameters.width;
        const height = this.musician.geometry.parameters.height;
        
        // Create initial empty positions
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Set initial values - position particles around the outline of the musician
        for (let i = 0; i < particleCount; i++) {
            // Choose edge distribution: top, right, bottom, left
            const edge = Math.random();
            let x, y;
            
            if (edge < 0.25) {
                // Top edge
                x = (Math.random() - 0.5) * width * 0.8;
                y = height / 2 * 0.9;
            } else if (edge < 0.5) {
                // Right edge
                x = width / 2 * 0.8;
                y = (Math.random() - 0.5) * height * 0.9;
            } else if (edge < 0.75) {
                // Bottom edge
                x = (Math.random() - 0.5) * width * 0.8;
                y = -height / 2 * 0.9;
            } else {
                // Left edge
                x = -width / 2 * 0.8;
                y = (Math.random() - 0.5) * height * 0.9;
            }
            
            // Position relative to the musician's center
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = 0.1; // Slightly in front of the musician plane
            
            // Color variation based on base color
            colors[i * 3] = this.baseColor.r + (Math.random() * 0.2 - 0.1);
            colors[i * 3 + 1] = this.baseColor.g + (Math.random() * 0.2 - 0.1);
            colors[i * 3 + 2] = this.baseColor.b + (Math.random() * 0.2 - 0.1);
            
            // Random sizes
            sizes[i] = Math.random() * 5 + 5;
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Particle material
        const particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                baseColor: { value: this.baseColor },
                time: { value: 0 },
                audioIntensity: { value: 0 }
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
            particleLifetimes: new Float32Array(particleCount)
        };
        
        // Set initial velocities and lifetimes
        for (let i = 0; i < particleCount; i++) {
            this.particleSystem.userData.particleVelocities[i * 3] = (Math.random() - 0.5) * 0.02;
            this.particleSystem.userData.particleVelocities[i * 3 + 1] = Math.random() * 0.05 + 0.01;
            this.particleSystem.userData.particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
            this.particleSystem.userData.particleLifetimes[i] = Math.random() * 2;
        }
        
        // Add particle system as a child of the musician to inherit its position and orientation
        this.musician.add(this.particleSystem);
    }
    
    update(time, audioData) {
        // Update audio data
        this.audioData = audioData;
        
        // Update outline shader uniforms
        if (this.outlineShaderMaterial) {
            this.outlineShaderMaterial.uniforms.time.value = time;
            this.outlineShaderMaterial.uniforms.audioIntensity.value = audioData.intensity;
            
            // Make outline more intense on beats
            if (audioData.beatDetected) {
                this.outlineShaderMaterial.uniforms.outlineIntensity.value = 1.2;
            } else {
                this.outlineShaderMaterial.uniforms.outlineIntensity.value = 
                    0.8 + audioData.bassIntensity * 0.4;
            }
        }
        
        // Update particle system
        if (this.particleSystem) {
            // Update uniforms
            this.particleSystem.material.uniforms.time.value = time;
            this.particleSystem.material.uniforms.audioIntensity.value = audioData.intensity;
            
            // Update particle positions and lifetimes
            const positions = this.particleSystem.geometry.attributes.position.array;
            const sizes = this.particleSystem.geometry.attributes.size.array;
            const velocities = this.particleSystem.userData.particleVelocities;
            const lifetimes = this.particleSystem.userData.particleLifetimes;
            
            // Get musician dimensions for respawning particles
            const width = this.musician.geometry.parameters.width;
            const height = this.musician.geometry.parameters.height;
            
            for (let i = 0; i < positions.length / 3; i++) {
                // Update lifetime
                lifetimes[i] -= 0.016; // Roughly based on 60fps
                
                // If particle died, respawn it at the musician's silhouette
                if (lifetimes[i] <= 0) {
                    // Generate points along the silhouette
                    const edge = Math.random();
                    let x, y;
                    
                    if (edge < 0.25) {
                        // Top edge
                        x = (Math.random() - 0.5) * width * 0.8;
                        y = height / 2 * 0.9;
                    } else if (edge < 0.5) {
                        // Right edge
                        x = width / 2 * 0.8;
                        y = (Math.random() - 0.5) * height * 0.9;
                    } else if (edge < 0.75) {
                        // Bottom edge
                        x = (Math.random() - 0.5) * width * 0.8;
                        y = -height / 2 * 0.9;
                    } else {
                        // Left edge
                        x = -width / 2 * 0.8;
                        y = (Math.random() - 0.5) * height * 0.9;
                    }
                    
                    // Set new position
                    positions[i * 3] = x;
                    positions[i * 3 + 1] = y;
                    positions[i * 3 + 2] = 0.1; // Slightly in front of musician
                    
                    // Random new velocity influenced by audio intensity
                    velocities[i * 3] = (Math.random() - 0.5) * 0.04 * (1 + audioData.intensity);
                    velocities[i * 3 + 1] = (Math.random() * 0.08 + 0.02) * (1 + audioData.intensity);
                    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.04;
                    
                    // Reset lifetime
                    lifetimes[i] = Math.random() * 2 + 1;
                    
                    // Particle size based on audio
                    sizes[i] = (Math.random() * 5 + 5) * (1 + audioData.intensity * 0.5);
                } else {
                    // Update existing particle position
                    positions[i * 3] += velocities[i * 3];
                    positions[i * 3 + 1] += velocities[i * 3 + 1];
                    positions[i * 3 + 2] += velocities[i * 3 + 2];
                    
                    // Apply some "gravity" effect
                    velocities[i * 3 + 1] -= 0.0005;
                    
                    // Dampen horizontal movement
                    velocities[i * 3] *= 0.99;
                    velocities[i * 3 + 2] *= 0.99;
                    
                    // Add some random movement based on audio beat
                    if (audioData.beatDetected) {
                        velocities[i * 3] += (Math.random() - 0.5) * 0.02;
                        velocities[i * 3 + 1] += Math.random() * 0.03;
                        velocities[i * 3 + 2] += (Math.random() - 0.5) * 0.02;
                    }
                }
            }
            
            // Update the geometry
            this.particleSystem.geometry.attributes.position.needsUpdate = true;
            this.particleSystem.geometry.attributes.size.needsUpdate = true;
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