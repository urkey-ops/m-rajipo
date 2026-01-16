// audio-service.js - FIXED VERSION

import { EventBus } from '../core/events.js';
import { EVENTS } from '../core/constants.js';

// audio-service.js - PATCHEd FOR AUTOMATIC TRACK URLS AND CORS

class AudioService {
  constructor() {
    this.audio = null;
    this.currentTrack = null;
  }

  initialize(audioElement) {
    if (!audioElement) throw new Error('Audio element not found');
    this.audio = audioElement;
    this.audio.crossOrigin = "anonymous"; // ✅ CORS
    this.audio.addEventListener('error', (e) => this._onError(e));
    console.log('✅ AudioService initialized');
  }

  _onError(e) {
    console.error('Audio error:', e);
    // Optionally emit an event to notify UI
  }

  // ✅ Automatically generates Archive.org URL for a given track number
  getTrackUrl(trackNum) {
    const padded = String(trackNum).padStart(3, '0'); // 1 -> 001
    return `https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_${padded}.mp3`;
  }

  async loadTrack(trackNum) {
    if (!this.audio) throw new Error('AudioService not initialized');
    this.currentTrack = trackNum;

    const url = this.getTrackUrl(trackNum);
    this.audio.src = url;

    return new Promise((resolve, reject) => {
      const onLoaded = () => {
        this.audio.removeEventListener('canplay', onLoaded);
        resolve();
      };
      const onError = (err) => {
        this.audio.removeEventListener('error', onError);
        reject(err);
      };
      this.audio.addEventListener('canplay', onLoaded);
      this.audio.addEventListener('error', onError);
      this.audio.load();
    });
  }

  play() {
    if (!this.audio) return Promise.reject('Audio not initialized');
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

  setPlaybackRate(rate) {
    if (!this.audio) return;
    this.audio.playbackRate = rate;
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

  getAudioElement() {
    return this.audio;
  }
}

export const audioService = new AudioService();
