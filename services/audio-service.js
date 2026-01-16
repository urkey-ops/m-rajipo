// audio-service.js - FIXED VERSION

import { EventBus } from '../core/events.js';
import { EVENTS } from '../core/constants.js';

class AudioService {
  constructor() {
    this.audio = null;
    this.currentTrackNumber = null;
    this.playbackRate = 1.0;
  }

  initialize(audioElement) {
    if (!audioElement) throw new Error('Audio element not found');
    this.audio = audioElement;
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.setPlaybackRate(this.playbackRate);
    console.log('✅ AudioService initialized');
  }

  getAudioElement() {
    return this.audio;
  }

  async loadTrack(trackNumber) {
    if (!this.audio) throw new Error('Audio not initialized');
    if (!trackNumber) throw new Error('Invalid track number');

    this.currentTrackNumber = trackNumber;
    const url = this._getTrackUrl(trackNumber);

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        cleanup();
        resolve();
      };
      const onError = (e) => {
        cleanup();
        console.error('Audio error:', e);
        reject(e);
      };
      const cleanup = () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
      };

      this.audio.addEventListener('canplay', onCanPlay, { once: true });
      this.audio.addEventListener('error', onError, { once: true });
      this.audio.src = url;
      this.audio.load();
    });
  }

  _getTrackUrl(trackNumber) {
    if (!trackNumber || trackNumber < 1 || trackNumber > 315) {
      throw new Error(`Invalid track number: ${trackNumber}`);
    }

    const baseUrl = 'https://ia601703.us.archive.org/35/items/satsang_diksha/';
    const prefix = 'sanskrit_';
    const ext = '.mp3';
    const numStr = trackNumber.toString().padStart(3, '0');

    return `${baseUrl}${prefix}${numStr}${ext}`;
  }

  play() {
    if (!this.audio) return;
    return this.audio.play();
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  stop() {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
  }

  seek(time) {
    if (!this.audio) return;
    this.audio.currentTime = time;
  }

  getCurrentTime() {
    return this.audio ? this.audio.currentTime : 0;
  }

  getDuration() {
    return this.audio ? this.audio.duration : 0;
  }

  isPlaying() {
    return this.audio && !this.audio.paused && !this.audio.ended;
  }

  setPlaybackRate(rate) {
    this.playbackRate = rate;
    if (this.audio) this.audio.playbackRate = rate;
  }
}

export const audioService = new AudioService();
