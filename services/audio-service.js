// audio-service.js - FIXED VERSION

import { EventBus } from '../core/events.js';
import { EVENTS } from '../core/constants.js';

class AudioService {
  constructor() {
    this._audio = null;
    this._isPlaying = false;
  }

  initialize(audioElement) {
    if (!audioElement) throw new Error('Audio element not provided');

    this._audio = audioElement;
    this._audio.preload = 'auto';

    // ✅ Setup event listeners
    this._audio.addEventListener('ended', () => {
      this._isPlaying = false;
      EventBus.emit(EVENTS.AUDIO_ENDED);
    });

    this._audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      EventBus.emit(EVENTS.AUDIO_ERROR, e);
    });

    // ✅ Optional Media Session support
    this._setupMediaSession();

    console.log('✅ AudioService initialized');
  }

  // Optional: integrates with OS-level media controls
  _setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Shloka Player',
        artist: '',
        album: '',
        artwork: []
      });

      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => this.seek(this.getCurrentTime() - 10));
      navigator.mediaSession.setActionHandler('seekforward', () => this.seek(this.getCurrentTime() + 10));
      navigator.mediaSession.setActionHandler('stop', () => this.stop());
    }
  }

  async loadTrack(trackNumber) {
    if (!this._audio) throw new Error('AudioService not initialized');

    // Assume you have a method to get track URL from track number
    const url = this._getTrackUrl(trackNumber);
    this._audio.src = url;

    return new Promise((resolve, reject) => {
      this._audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      this._audio.addEventListener('error', reject, { once: true });
    });
  }

  play() {
    if (!this._audio) return;
    this._audio.play().then(() => {
      this._isPlaying = true;
    }).catch(console.error);
  }

  pause() {
    if (!this._audio) return;
    this._audio.pause();
    this._isPlaying = false;
  }

  stop() {
    if (!this._audio) return;
    this._audio.pause();
    this._audio.currentTime = 0;
    this._isPlaying = false;
  }

  seek(time) {
    if (!this._audio) return;
    this._audio.currentTime = Math.max(0, Math.min(time, this.getDuration()));
  }

  setPlaybackRate(rate) {
    if (!this._audio) return;
    this._audio.playbackRate = rate;
  }

  getAudioElement() {
    return this._audio;
  }

  getCurrentTime() {
    return this._audio ? this._audio.currentTime : 0;
  }

  getDuration() {
    return this._audio ? this._audio.duration || 0 : 0;
  }

  isPlaying() {
    return this._isPlaying;
  }

  // Dummy method: replace with your actual track URL logic
  _getTrackUrl(trackNumber) {
    return `tracks/track_${trackNumber}.mp3`;
  }
}

export const audioService = new AudioService();
