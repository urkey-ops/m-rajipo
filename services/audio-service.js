// audio-service.js - Centralized audio handling with Archive.org CORS support
import { EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';

// ✅ Use Archive.org's CORS-enabled domain
const ARCHIVE_BASE_URL = 'https://cors.archive.org/download/satsang_diksha';

class AudioService {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous'; // Required for CORS requests
    this._currentTrack = null;
    
    // Track native events and forward via EventBus
    this.audio.addEventListener('ended', () => EventBus.emit(EVENTS.TRACK_ENDED));
    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      EventBus.emit(EVENTS.PLAYBACK_ERROR, e);
    });
    this.audio.addEventListener('timeupdate', () => 
      EventBus.emit('audio:timeupdate', this.audio.currentTime)
    );
    this.audio.addEventListener('loadstart', () => {
      console.log('🔄 Audio loading started...');
    });
    this.audio.addEventListener('canplay', () => {
      console.log('✅ Audio ready to play');
    });
  }

  setAudioElement(audioElement) {
    if (!(audioElement instanceof HTMLAudioElement)) {
      throw new Error('Invalid audio element');
    }
    this.audio = audioElement;
    this.audio.crossOrigin = 'anonymous';
  }

  // Generate track URL with zero-padded track number
  _getTrackUrl(trackNum) {
    const padded = String(trackNum).padStart(3, '0'); // 1 -> 001
    return `${ARCHIVE_BASE_URL}/sanskrit_${padded}.mp3`;
  }

  // Load track by track number
  async loadTrack(trackNum) {
    if (!trackNum) throw new Error('Invalid track number');
    
    this._currentTrack = trackNum;
    const url = this._getTrackUrl(trackNum);
    
    console.log(`🎵 Loading track ${trackNum}:`, url);
    
    this.audio.src = url;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Load timeout for track ${trackNum}`));
      }, 30000); // 30 second timeout

      const onCanPlay = () => {
        cleanup();
        console.log(`✅ Track ${trackNum} loaded successfully`);
        resolve();
      };

      const onError = (e) => {
        cleanup();
        console.error(`❌ Failed to load track ${trackNum}:`, e);
        reject(new Error(`Failed to load track ${trackNum}`));
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

  // Playback controls
  play() {
    return this.audio.play().catch((err) => {
      console.error('Playback failed:', err);
      throw err;
    });
  }

  pause() {
    this.audio.pause();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time) {
    if (typeof time === 'number' && !isNaN(time)) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
    }
  }

  setPlaybackRate(rate) {
    if (typeof rate === 'number' && rate > 0) {
      this.audio.playbackRate = rate;
    }
  }

  // Utility getters
  isPlaying() {
    return !this.audio.paused;
  }

  getCurrentTime() {
    return this.audio.currentTime || 0;
  }

  getDuration() {
    return this.audio.duration || 0;
  }

  getAudioElement() {
    return this.audio;
  }

  getCurrentTrack() {
    return this._currentTrack;
  }
}

// Export singleton
export const audioService = new AudioService();
