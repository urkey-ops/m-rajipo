// audio-service.js - Centralized audio handling with CORS proxy
import { EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';

const ARCHIVE_BASE_URL = 'https://ia601703.us.archive.org/35/items/satsang_diksha';

// CORS Proxy options (choose one or fallback between them)
const CORS_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest='
];

class AudioService {
  constructor() {
    this.audio = new Audio();
    this._currentTrack = null;
    this._currentProxyIndex = 0; // Track which proxy we're using
    
    // Track native events and forward via EventBus
    this.audio.addEventListener('ended', () => EventBus.emit(EVENTS.TRACK_ENDED));
    this.audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      EventBus.emit(EVENTS.PLAYBACK_ERROR, e);
    });
    this.audio.addEventListener('timeupdate', () => 
      EventBus.emit('audio:timeupdate', this.audio.currentTime)
    );
  }

  setAudioElement(audioElement) {
    if (!(audioElement instanceof HTMLAudioElement)) {
      throw new Error('Invalid audio element');
    }
    this.audio = audioElement;
  }

  // Generate track URL with CORS proxy
  _getTrackUrl(trackNum, proxyIndex = this._currentProxyIndex) {
    const padded = String(trackNum).padStart(3, '0'); // 1 -> 001
    const originalUrl = `${ARCHIVE_BASE_URL}/sanskrit_${padded}.mp3`;
    
    // Use proxy to bypass CORS
    const proxy = CORS_PROXIES[proxyIndex];
    return `${proxy}${encodeURIComponent(originalUrl)}`;
  }

  // Load track by track number with proxy fallback
  async loadTrack(trackNum) {
    if (!trackNum) throw new Error('Invalid track number');
    
    this._currentTrack = trackNum;
    
    // Try current proxy first
    return this._loadWithProxy(trackNum, this._currentProxyIndex)
      .catch(async (err) => {
        console.warn(`Proxy ${this._currentProxyIndex} failed, trying fallback...`);
        
        // Try next proxy
        this._currentProxyIndex = (this._currentProxyIndex + 1) % CORS_PROXIES.length;
        return this._loadWithProxy(trackNum, this._currentProxyIndex);
      });
  }

  // Helper to load with specific proxy
  _loadWithProxy(trackNum, proxyIndex) {
    const url = this._getTrackUrl(trackNum, proxyIndex);
    console.log(`Loading track ${trackNum} via proxy ${proxyIndex}:`, url);
    
    this.audio.src = url;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Load timeout'));
      }, 15000); // 15 second timeout

      const onCanPlay = () => {
        cleanup();
        console.log(`✅ Track ${trackNum} loaded successfully`);
        resolve();
      };

      const onError = (e) => {
        cleanup();
        reject(e);
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
      };

      this.audio.addEventListener('canplay', onCanPlay);
      this.audio.addEventListener('error', onError);
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
