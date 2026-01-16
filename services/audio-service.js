// audio-service.js - Patched for Memory Mode start time & playback isolation
import { AUDIO_BASE_URL, EVENTS, TIMING } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { errorHandler } from '../utils/error-handler.js';
import { networkService } from './network-service.js';
import { validateTrackNumber } from '../utils/validation.js';

class AudioService {
  constructor() {
    this._audioElement = null;
    this._currentTrack = null;
    this._isInitialized = false;
    this._loadAbortController = null;
    this._pendingSeekResolve = null;
  }

  initialize(audioElement) {
    if (this._isInitialized) return;
    if (!audioElement) throw new Error('Audio element is required');
    this._audioElement = audioElement;
    this._setupEventListeners();
    this._setupMediaSession();
    this._isInitialized = true;
    console.log('✅ Audio service initialized');
  }

  _setupEventListeners() {
    const audio = this._audioElement;
    audio.addEventListener('loadstart', () => console.log('Audio: Loading...'));
    audio.addEventListener('loadedmetadata', () => console.log('Audio: Metadata loaded'));
    audio.addEventListener('canplay', () => console.log('Audio: Can play'));
    audio.addEventListener('playing', () => {
      console.log('Audio: Playing');
      EventBus.emit(EVENTS.PLAYBACK_STARTED, { track: this._currentTrack, time: audio.currentTime });
    });
    audio.addEventListener('pause', () => {
      console.log('Audio: Paused');
      EventBus.emit(EVENTS.PLAYBACK_PAUSED, { track: this._currentTrack, time: audio.currentTime });
    });
    audio.addEventListener('ended', () => {
      console.log('Audio: Ended');
      EventBus.emit(EVENTS.TRACK_ENDED, { track: this._currentTrack });
    });

    // Memory Mode precise seek handling
    audio.addEventListener('seeked', () => {
      if (this._pendingSeekResolve) {
        this._pendingSeekResolve();
        this._pendingSeekResolve = null;
      }
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', audio.error);
      errorHandler.handle(audio.error, { type: 'audio', track: this._currentTrack });
      EventBus.emit(EVENTS.PLAYBACK_ERROR, { track: this._currentTrack, error: audio.error });
    });
    audio.addEventListener('waiting', () => console.log('Audio: Buffering...'));
    audio.addEventListener('stalled', () => console.warn('Audio: Stalled'));
  }

  async loadTrack(trackNum) {
    const validation = validateTrackNumber(trackNum);
    if (!validation.valid) throw new Error(validation.error);

    if (this._loadAbortController) this._loadAbortController.abort();
    this._loadAbortController = new AbortController();
    const { signal } = this._loadAbortController;

    this._currentTrack = validation.value;
    const url = this._getAudioUrl(validation.value);
    const audio = this._audioElement;

    await new Promise((resolve, reject) => {
      const onLoadedMetadata = () => cleanup() || resolve();
      const onError = () => cleanup() || reject(new Error('Failed to load audio metadata'));
      const onAbort = () => cleanup() || reject(new DOMException('Audio load aborted', 'AbortError'));
      const cleanup = () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('error', onError);
        signal.removeEventListener('abort', onAbort);
      };
      audio.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
      audio.addEventListener('error', onError, { once: true });
      signal.addEventListener('abort', onAbort, { once: true });

      audio.src = url;
      audio.load();

      this._updateMediaSession(validation.value);
      EventBus.emit(EVENTS.TRACK_CHANGED, { track: validation.value, url });
    });
  }

  async play() {
    if (!this._isInitialized) throw new Error('Audio service not initialized');

    try {
      await networkService.retryWithBackoff(
        async (attempt) => {
          console.log(`Play attempt ${attempt + 1}`);
          await this._audioElement.play();
        },
        { maxRetries: TIMING.MAX_RETRIES, baseDelay: TIMING.RETRY_DELAY_MS }
      );
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Please tap play button to start playback.',
          type: 'info'
        });
      }
      throw error;
    }
  }

  pause() {
    if (!this._isInitialized) return;
    this._audioElement.pause();
  }

  stop() {
    if (!this._isInitialized) return;
    this._audioElement.pause();
    this._audioElement.currentTime = 0;
    EventBus.emit(EVENTS.PLAYBACK_STOPPED);
  }

  /** ✅ Patched seek: Returns promise that resolves when seek completes */
  seek(time) {
    if (!this._isInitialized) return Promise.resolve();
    return new Promise((resolve) => {
      this._pendingSeekResolve = resolve;
      this._audioElement.currentTime = time;
    });
  }

  setPlaybackRate(rate) {
    if (!this._isInitialized) return;
    this._audioElement.playbackRate = rate;
  }

  getCurrentTime() { return this._audioElement?.currentTime || 0; }
  getDuration() { return this._audioElement?.duration || 0; }
  getCurrentTrack() { return this._currentTrack; }
  isPlaying() { return this._audioElement && !this._audioElement.paused; }
  isPaused() { return this._audioElement && this._audioElement.paused; }
  getAudioElement() { return this._audioElement; }

  _getAudioUrl(trackNum) {
    const paddedNum = String(trackNum).padStart(3, '0');
    return `${AUDIO_BASE_URL}/sanskrit_${paddedNum}.mp3`;
  }

  destroy() {
    if (this._loadAbortController) this._loadAbortController.abort();
    if (this._audioElement) { this._audioElement.pause(); this._audioElement.src = ''; }
    this._isInitialized = false;
    console.log('Audio service destroyed');
  }
}

export const audioService = new AudioService();
