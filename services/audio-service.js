// audio-service.js - Centralized audio handling with CORS support
import { EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';

const ARCHIVE_BASE_URL = 'https://ia601703.us.archive.org/35/items/satsang_diksha';

class AudioService {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous'; // ✅ ensure CORS-safe playback
    this._currentTrack = null;

    // Track native events and forward via EventBus
    this.audio.addEventListener('ended', () => EventBus.emit(EVENTS.TRACK_ENDED));
    this.audio.addEventListener('error', (e) => EventBus.emit(EVENTS.PLAYBACK_ERROR, e));
    this.audio.addEventListener('timeupdate', () => EventBus.emit('audio:timeupdate', this.audio.currentTime));
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

    this.audio.src = url;

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        resolve();
      };
      const onError = (e) => {
        this.audio.removeEventListener('error', onError);
        reject(e);
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
