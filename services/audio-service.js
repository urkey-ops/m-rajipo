// audio-service.js - FIXED VERSION with proper event timing
import { EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';

const ARCHIVE_BASE_URL = 'https://cors.archive.org/download/satsang_diksha';

class AudioService {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this._currentTrack = null;
    this._isInitialized = false;
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // ✅ CRITICAL FIX: Emit PLAYBACK_STARTED on 'play' event instead of 'playing'
    // This allows modes to start timers immediately when play() is called
    this.audio.addEventListener('play', () => {
      console.log('🎵 Audio play initiated');
      EventBus.emit(EVENTS.PLAYBACK_STARTED);
    });
    
    // Keep 'playing' event for additional confirmation (optional logging)
    this.audio.addEventListener('playing', () => {
      console.log('🎵 Audio actually playing now (buffering complete)');
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
    
    this.audio.addEventListener('pause', () => {
      console.log('⏸️ Audio paused');
      EventBus.emit(EVENTS.PLAYBACK_PAUSED);
    });
    
    this.audio.addEventListener('seeking', () => {
      console.log('⏩ Audio seeking...');
    });
    
    this.audio.addEventListener('seeked', () => {
      console.log('✅ Audio seeked');
    });
    
    this.audio.addEventListener('stalled', () => {
      console.warn('⚠️ Audio playback stalled');
    });
    
    this.audio.addEventListener('waiting', () => {
      console.log('⏳ Audio buffering...');
    });
  }
  
  setAudioElement(audioElement) {
    if (!(audioElement instanceof HTMLAudioElement)) {
      throw new Error('Invalid audio element');
    }
    
    if (this.audio && this.audio !== audioElement) {
      console.log('Switching audio element, removing old listeners');
    }
    
    this.audio = audioElement;
    this.audio.crossOrigin = 'anonymous';
    this._isInitialized = false;
    
    this._setupEventListeners();
  }
  
  _getTrackUrl(trackNum) {
    const padded = String(trackNum).padStart(3, '0');
    return `${ARCHIVE_BASE_URL}/sanskrit_${padded}.mp3`;
  }
  
  async loadTrack(trackNum) {
    if (!trackNum || trackNum < 1 || trackNum > 999) {
      throw new Error(`Invalid track number: ${trackNum}`);
    }
    
    if (!this.audio) {
      throw new Error('Audio element not initialized');
    }
    
    this._currentTrack = trackNum;
    this._isInitialized = false;
    
    const url = this._getTrackUrl(trackNum);
    console.log(`🎵 Loading track ${trackNum}:`, url);
    
    if (!this.audio.paused) {
      this.audio.pause();
    }
    
    this.audio.src = url;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Load timeout for track ${trackNum}`));
      }, 30000);
      
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
      
      this.audio.load();
    });
  }
  
  play() {
    if (!this.audio) {
      return Promise.reject(new Error('Audio element not initialized'));
    }
    
    if (!this.audio.src) {
      return Promise.reject(new Error('No audio source loaded'));
    }
    
    return this.audio.play().catch((err) => {
      console.error('❌ Playback failed:', err);
      
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
    
    const duration = this.getDuration();
    if (duration && duration > 0) {
      this.audio.currentTime = Math.max(0, Math.min(time, duration));
    } else {
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
    
    const clampedRate = Math.max(0.25, Math.min(4.0, rate));
    this.audio.playbackRate = clampedRate;
    
    if (clampedRate !== rate) {
      console.warn(`Playback rate ${rate} clamped to ${clampedRate}`);
    }
  }
  
  isPlaying() {
    if (!this.audio) return false;
    return !this.audio.paused && !this.audio.ended;
  }
  
  getCurrentTime() {
    if (!this.audio) return 0;
    const time = this.audio.currentTime;
    return (typeof time === 'number' && !isNaN(time)) ? time : 0;
  }
  
  getDuration() {
    if (!this.audio) return 0;
    const duration = this.audio.duration;
    return (typeof duration === 'number' && !isNaN(duration) && isFinite(duration)) ? duration : 0;
  }
  
  getAudioElement() {
    return this.audio;
  }
  
  getCurrentTrack() {
    return this._currentTrack;
  }
  
  getVolume() {
    if (!this.audio) return 1.0;
    return this.audio.volume;
  }
  
  setVolume(volume) {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    
    if (typeof volume !== 'number' || isNaN(volume)) {
      console.warn('Invalid volume:', volume);
      return;
    }
    
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
  
  isMuted() {
    if (!this.audio) return false;
    return this.audio.muted;
  }
  
  setMuted(muted) {
    if (!this.audio) {
      console.warn('Audio element not initialized');
      return;
    }
    this.audio.muted = Boolean(muted);
  }
  
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
  
  isInitialized() {
    return this._isInitialized;
  }
  
  getReadyState() {
    if (!this.audio) return 0;
    return this.audio.readyState;
  }
  
  getNetworkState() {
    if (!this.audio) return 0;
    return this.audio.networkState;
  }
  
  getError() {
    if (!this.audio || !this.audio.error) return null;
    
    return {
      code: this.audio.error.code,
      message: this.audio.error.message,
      type: this._getErrorType(this.audio.error.code)
    };
  }
  
  _getErrorType(code) {
    const ERROR_TYPES = {
      1: 'ABORTED',
      2: 'NETWORK',
      3: 'DECODE',
      4: 'NOT_SUPPORTED'
    };
    return ERROR_TYPES[code] || 'UNKNOWN';
  }
  
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

export const audioService = new AudioService();
