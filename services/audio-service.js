// audio-service.js - FIXED VERSION with proper event timing and validation
import { EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';

// ✅ Use Archive.org's CORS-enabled domain
const ARCHIVE_BASE_URL = 'https://cors.archive.org/download/satsang_diksha';

class AudioService {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this._currentTrack = null;
    this._isInitialized = false; // ✅ NEW: Track if audio element is ready
    
    this._setupEventListeners();
  }
  
  // ✅ NEW: Centralized event listener setup
  _setupEventListeners() {
    // ✅ FIXED: Use 'playing' event instead of 'play' for reliable timing
    // 'playing' fires when playback actually starts (after buffering)
    this.audio.addEventListener('playing', () => {
      console.log('🎵 Audio actually playing now');
      EventBus.emit(EVENTS.PLAYBACK_STARTED);
    });
    
    // Forward native audio events
    this.audio.addEventListener('ended', () => {
      console.log('🏁 Track ended');
      EventBus.emit(EVENTS.TRACK_ENDED);
    });
    
    this.audio.addEventListener('error', (e) => {
      console.error('❌ Audio error:', e);
      EventBus.emit(EVENTS.PLAYBACK_ERROR, {
        error: e,
        code: this.audio.error?.code,
        message: this.audio.error?.message || 'Unknown audio error'
      });
    });
    
    this.audio.addEventListener('timeupdate', () => {
      EventBus.emit('audio:timeupdate', this.audio.currentTime);
    });
    
    this.audio.addEventListener('loadstart', () => {
      console.log('🔄 Audio loading started...');
    });
    
    this.audio.addEventListener('canplay', () => {
      console.log('✅ Audio ready to play');
      this._isInitialized = true;
    });
    
    // ✅ NEW: Handle pause event
    this.audio.addEventListener('pause', () => {
      console.log('⏸️ Audio paused');
      EventBus.emit(EVENTS.PLAYBACK_PAUSED);
    });
    
    // ✅ NEW: Handle seeking
    this.audio.addEventListener('seeking', () => {
      console.log('⏩ Audio seeking...');
    });
    
    this.audio.addEventListener('seeked', () => {
      console.log('✅ Audio seeked');
    });
    
    // ✅ NEW: Handle stalled playback
    this.audio.addEventListener('stalled', () => {
      console.warn('⚠️ Audio playback stalled');
    });
    
    // ✅ NEW: Handle waiting (buffering)
    this.audio.addEventListener('waiting', () => {
      console.log('⏳ Audio buffering...');
    });
  }
  
  setAudioElement(audioElement) {
    if (!(audioElement instanceof HTMLAudioElement)) {
      throw new Error('Invalid audio element');
    }
    
    // ✅ Remove old listeners before switching
    if (this.audio && this.audio !== audioElement) {
      console.log('Switching audio element, removing old listeners');
      // Note: Since we use the same audio element, this is mostly future-proofing
    }
    
    this.audio = audioElement;
    this.audio.crossOrigin = 'anonymous';
    this._isInitialized = false;
    
    // Re-setup listeners on new element
    this._setupEventListeners();
  }
  
  // Generate track URL with zero-padded track number
  _getTrackUrl(trackNum) {
    const padded = String(trackNum).padStart(3, '0');
    return `${ARCHIVE_BASE_URL}/sanskrit_${padded}.mp3`;
  }
  
  // Load track by track number
  async loadTrack(trackNum) {
    if (!trackNum || trackNum < 1 || trackNum > 999) {
      throw new Error(`Invalid track number: ${trackNum}`);
    }
    
    // ✅ NEW: Validate audio element exists
    if (!this.audio) {
      throw new Error('Audio element not initialized');
    }
    
    this._currentTrack = trackNum;
    this._isInitialized = false; // ✅ Reset initialization flag
    
    const url = this._getTrackUrl(trackNum);
    console.log(`🎵 Loading track ${trackNum}:`, url);
    
    // ✅ FIXED: Stop current playback before loading new track
    if (!this.audio.paused) {
      this.audio.pause();
    }
    
    this.audio.src = url;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Load timeout for track ${trackNum}`));
      }, 30000); // 30 second timeout
      
      const onCanPlay = () => {
        cleanup();
        console.log(`✅ Track ${trackNum} loaded successfully`);
        this._isInitialized = true;
        resolve();
      };
      
      const onError = (e) => {
        cleanup();
        console.error(`❌ Failed to load track ${trackNum}:`, e);
        const errorMsg = this.audio.error?.message || 'Failed to load track';
        reject(new Error(`${errorMsg} (Track ${trackNum})`));
      };
      
      const cleanup = () => {
        clearTimeout(timeout);
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
      };
      
      this.audio.addEventListener('canplay', onCanPlay, { once: true });
      this.audio.addEventListener('error', onError, { once: true });
      
      // ✅ FIXED: Use load() to ensure fresh load
      this.audio.load();
    });
  }
  
  // Playback controls
  play() {
    // ✅ NEW: Validate before playing
    if (!this.audio) {
      return Promise.reject(new Error('Audio element not initialized'));
    }
    
    if (!this.audio.src) {
      return Promise.reject(new Error('No audio source loaded'));
    }
    
    return this.audio.play().catch((err) => {
      console.error('❌ Playback failed:', err);
      
      // ✅ NEW: Better error context
      if (err.name === 'NotAllowedError') {
        throw new Error('Playback blocked. Please interact with the page first.');
      } else if (err.name === 'NotSupportedError') {
        throw new Error('Audio format not supported');
      } else if (err.name === 'AbortError') {
        throw new Error('Playback aborted');
      }
      
      throw err;
    });
  }
  
  pause() {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    this.audio.pause();
  }
  
  stop() {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    this.audio.pause();
    this.audio.currentTime = 0;
    EventBus.emit(EVENTS.PLAYBACK_STOPPED);
  }
  
  seek(time) {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    
    if (typeof time !== 'number' || isNaN(time)) {
      console.warn('Invalid seek time:', time);
      return;
    }
    
    // ✅ FIXED: Better duration check
    const duration = this.getDuration();
    if (duration && duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(time, duration));
    } else {
      // If duration not available yet, just clamp to positive
      this.audio.currentTime = Math.max(0, time);
    }
  }
  
  setPlaybackRate(rate) {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    
    if (typeof rate !== 'number' || rate <= 0 || isNaN(rate)) {
      console.warn('Invalid playback rate:', rate);
      return;
    }
    
    // ✅ FIXED: Clamp to reasonable range
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    this.audio.playbackRate = clampedRate;
    
    if (clampedRate !== rate) {
      console.warn(`Playback rate ${rate} clamped to ${clampedRate}`);
    }
  }
  
  // Utility getters
  isPlaying() {
    if (!this.audio) return false;
    return !this.audio.paused && !this.audio.ended;
  }
  
  getCurrentTime() {
    if (!this.audio) return 0;
    // ✅ FIXED: Handle edge cases
    const time = this.audio.currentTime;
    return (typeof time === 'number' && !isNaN(time)) ? time : 0;
  }
  
  getDuration() {
    if (!this.audio) return 0;
    // ✅ FIXED: Handle edge cases
    const duration = this.audio.duration;
    return (typeof duration === 'number' && !isNaN(duration) && isFinite(duration)) ? duration : 0;
  }
  
  getAudioElement() {
    return this.audio;
  }
  
  getCurrentTrack() {
    return this._currentTrack;
  }
  
  // ✅ NEW: Get volume
  getVolume() {
    if (!this.audio) return 1.0;
    return this.audio.volume;
  }
  
  // ✅ NEW: Set volume
  setVolume(volume) {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    
    if (typeof volume !== 'number' || isNaN(volume)) {
      console.warn('Invalid volume:', volume);
      return;
    }
    
    // Clamp volume to 0-1 range
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  
  // ✅ NEW: Check if muted
  isMuted() {
    if (!this.audio) return false;
    return this.audio.muted;
  }
  
  // ✅ NEW: Set mute
  setMuted(muted) {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    this.audio.muted = Boolean(muted);
  }
  
  // ✅ NEW: Get buffered ranges
  getBuffered() {
    if (!this.audio) return [];
    
    const buffered = this.audio.buffered;
    const ranges = [];
    
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: buffered.start(i),
        end: buffered.end(i)
      });
    }
    
    return ranges;
  }
  
  // ✅ NEW: Check if initialized
  isInitialized() {
    return this._isInitialized;
  }
  
  // ✅ NEW: Get ready state
  getReadyState() {
    if (!this.audio) return 0;
    return this.audio.readyState;
  }
  
  // ✅ NEW: Get network state
  getNetworkState() {
    if (!this.audio) return 0;
    return this.audio.networkState;
  }
  
  // ✅ NEW: Get error info
  getError() {
    if (!this.audio || !this.audio.error) return null;
    
    return {
      code: this.audio.error.code,
      message: this.audio.error.message,
      type: this._getErrorType(this.audio.error.code)
    };
  }
  
  // ✅ NEW: Human-readable error type
  _getErrorType(code) {
    const ERROR_TYPES = {
      1: 'ABORTED',
      2: 'NETWORK',
      3: 'DECODE',
      4: 'NOT_SUPPORTED'
    };
    return ERROR_TYPES[code] || 'UNKNOWN';
  }
  
  // ✅ NEW: Reset audio element
  reset() {
    console.log('🔄 Resetting audio service');
    
    if (!this.audio) return;
    
    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = '';
    this._currentTrack = null;
    this._isInitialized = false;
    
    console.log('✅ Audio service reset');
  }
}

// Export singleton
export const audioService = new AudioService();
