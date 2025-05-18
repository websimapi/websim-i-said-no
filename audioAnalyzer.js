// Advanced audio analyzer with beat detection
class AudioAnalyzer {
    constructor(audioElement, fftSize = 512) {
        this.audioElement = audioElement;
        this.fftSize = fftSize;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.initialized = false;
        
        // Beat detection properties
        this.beatDetector = {
            threshold: 0.15,
            decay: 0.98,
            frameCount: 0,
            currentVolume: 0,
            lastVolume: 0,
            beatCutOff: 0,
            beatDetected: false
        };
        
        // Band energy levels
        this.energyBands = {
            bass: { min: 0, max: 10, value: 0 },    // Low frequencies
            mid: { min: 10, max: 100, value: 0 },   // Mid frequencies
            high: { min: 100, max: 255, value: 0 }  // High frequencies
        };
    }
    
    init() {
        if (this.initialized) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaElementSource(this.audioElement);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        this.initialized = true;
    }
    
    update() {
        if (!this.initialized || !this.audioElement.played.length) {
            return {
                intensity: 0,
                bassIntensity: 0,
                midIntensity: 0,
                highIntensity: 0,
                beatDetected: false,
                frequencyBinCount: new Uint8Array(0)
            };
        }
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Process bass, mid, and high frequency bands
        this._processBands();
        
        // Detect beats
        this._detectBeats();
        
        // Calculate overall intensity from all bands
        const overallIntensity = (
            this.energyBands.bass.value * 0.4 + 
            this.energyBands.mid.value * 0.4 + 
            this.energyBands.high.value * 0.2
        );
        
        return {
            intensity: overallIntensity,
            bassIntensity: this.energyBands.bass.value,
            midIntensity: this.energyBands.mid.value,
            highIntensity: this.energyBands.high.value,
            beatDetected: this.beatDetector.beatDetected,
            frequencyBinCount: this.dataArray
        };
    }
    
    _processBands() {
        // Process each frequency band
        for (const band in this.energyBands) {
            const bandData = this.energyBands[band];
            let sum = 0;
            
            // Sum up energy in the band range
            for (let i = bandData.min; i < bandData.max; i++) {
                sum += this.dataArray[i];
            }
            
            // Normalize to 0-1 range
            const count = bandData.max - bandData.min;
            bandData.value = count > 0 ? sum / (count * 255) : 0;
        }
    }
    
    _detectBeats() {
        this.beatDetector.frameCount++;
        
        // Calculate current volume from bass frequencies (more sensitive to beats)
        let sum = 0;
        for (let i = this.energyBands.bass.min; i < this.energyBands.bass.max; i++) {
            sum += this.dataArray[i];
        }
        const count = this.energyBands.bass.max - this.energyBands.bass.min;
        this.beatDetector.currentVolume = count > 0 ? sum / (count * 255) : 0;
        
        // Beat detection algorithm
        this.beatDetector.beatDetected = false;
        
        // Adjust beat cutoff value
        if (this.beatDetector.currentVolume > this.beatDetector.beatCutOff && 
            this.beatDetector.currentVolume > this.beatDetector.threshold) {
            // Beat detected
            this.beatDetector.beatDetected = true;
            this.beatDetector.beatCutOff = this.beatDetector.currentVolume * 1.1;
            this.beatDetector.frameCount = 0;
        } else {
            // No beat, decay the cutoff
            if (this.beatDetector.frameCount > 20) {
                this.beatDetector.beatCutOff *= this.beatDetector.decay;
                this.beatDetector.beatCutOff = Math.max(this.beatDetector.beatCutOff, this.beatDetector.threshold);
            }
        }
        
        this.beatDetector.lastVolume = this.beatDetector.currentVolume;
    }
}

export { AudioAnalyzer };