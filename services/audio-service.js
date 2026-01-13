// audio-service.js - Core audio playback functionality
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
  }
  
  // Initialize audio element
  initialize(audioElement) {
    if (this._isInitialized) {
      console.warn('Audio service already initialized');
      return;
    }
    
    if (!audioElement) {
      throw new Error('Audio element is required');
    }
    
    this._audioElement = audioElement;
    this._setupEventListeners();
    this._setupMediaSession();
    this._isInitialized = true;
    
    console.log('✅ Audio service initialized');
  }
  
  // Setup audio element event listeners
  _setupEventListeners() {
    const audio = this._audioElement;
    
    // Playback events
    audio.addEventListener('loadstart', () => {
      console.log('Audio: Loading...');
    });
    
    audio.addEventListener('loadedmetadata', () => {
      console.log('Audio: Metadata loaded');
    });
    
    audio.addEventListener('canplay', () => {
      console.log('Audio: Can play');
    });
    
    audio.addEventListener('playing', () => {
      console.log('Audio: Playing');
      EventBus.emit(EVENTS.PLAYBACK_STARTED, {
        track: this._currentTrack,
        time: audio.currentTime
      });
    });
    
    audio.addEventListener('pause', () => {
      console.log('Audio: Paused');
      EventBus.emit(EVENTS.PLAYBACK_PAUSED, {
        track: this._currentTrack,
        time: audio.currentTime
      });
    });
    
    audio.addEventListener('ended', () => {
      console.log('Audio: Ended');
      EventBus.emit(EVENTS.TRACK_ENDED, {
        track: this._currentTrack
      });
    });
    
    audio.addEventListener('timeupdate', () => {
      // Emit periodically for progress updates
      if (audio.currentTime % 1 < 0.1) { // ~every second
        EventBus.emit('audio:timeupdate', {
          currentTime: audio.currentTime,
          duration: audio.duration
        });
      }
    });
    
    audio.addEventListener('error', (e) => {
      const error = audio.error;
      console.error('Audio error:', error);
      
      errorHandler.handle(error, {
        type: 'audio',
        track: this._currentTrack,
        code: error?.code,
        message: error?.message
      });
      
      EventBus.emit(EVENTS.PLAYBACK_ERROR, {
        track: this._currentTrack,
        error: error
      });
    });
    
    audio.addEventListener('waiting', () => {
      console.log('Audio: Buffering...');
    });
    
    audio.addEventListener('stalled', () => {
      console.warn('Audio: Stalled');
    });
  }
  
  // Setup Media Session API for mobile controls
  _setupMediaSession() {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not supported');
      return;
    }
    
    navigator.mediaSession.setActionHandler('play', () => {
      this.play().catch(console.error);
    });
    
    navigator.mediaSession.setActionHandler('pause', () => {
      this.pause();
    });
    
    navigator.mediaSession.setActionHandler('stop', () => {
      this.stop();
    });
    
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.seek(Math.max(0, this._audioElement.currentTime - skipTime));
    });
    
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const skipTime = details.seekOffset || 10;
      this.seek(Math.min(this._audioElement.duration, this._audioElement.currentTime + skipTime));
    });
    
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.fastSeek && 'fastSeek' in this._audioElement) {
        this._audioElement.fastSeek(details.seekTime);
      } else {
        this.seek(details.seekTime);
      }
    });
    
    // Next/previous handled by playback manager
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      EventBus.emit('audio:previous-requested');
    });
    
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      EventBus.emit('audio:next-requested');
    });
  }
  
  // Update Media Session metadata
  _updateMediaSession(trackNum) {
    if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) {
      return;
    }
    
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Shloka ${trackNum}`,
        artist: 'Mission Rajipo',
        album: 'Satsang Diksha',
        artwork: [
          { src: 'icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    } catch (error) {
      console.warn('Failed to update media session:', error);
    }
  }
  
  // Load track
  async loadTrack(trackNum) {
    // Validate track number
    const validation = validateTrackNumber(trackNum);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Abort previous load if any
    if (this._loadAbortController) {
      this._loadAbortController.abort();
    }
    
    this._loadAbortController = new AbortController();
    this._currentTrack = validation.value;
    
    const url = this._getAudioUrl(validation.value);
    console.log(`Loading track ${validation.value}: ${url}`);
    
    this._audioElement.src = url;
    this._updateMediaSession(validation.value);
    
    EventBus.emit(EVENTS.TRACK_CHANGED, {
      track: validation.value,
      url: url
    });
  }
  
  // Play audio with retry logic
  async play() {
    if (!this._isInitialized) {
      throw new Error('Audio service not initialized');
    }
    
    try {
      await networkService.retryWithBackoff(
        async (attempt) => {
          console.log(`Play attempt ${attempt + 1}`);
          await this._audioElement.play();
        },
        {
          maxRetries: TIMING.MAX_RETRIES,
          baseDelay: TIMING.RETRY_DELAY_MS,
          onRetry: (current, max, delay) => {
            EventBus.emit(EVENTS.TOAST_SHOW, {
              message: `Connection issue. Retrying ${current}/${max}...`,
              type: 'info'
            });
          }
        }
      );
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        // User interaction required
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Please tap the play button to start playback.',
          type: 'info'
        });
      }
      throw error;
    }
  }
  
  // Pause audio
  pause() {
    if (!this._isInitialized) return;
    this._audioElement.pause();
  }
  
  // Stop audio (pause and reset)
  stop() {
    if (!this._isInitialized) return;
    this._audioElement.pause();
    this._audioElement.currentTime = 0;
    EventBus.emit(EVENTS.PLAYBACK_STOPPED);
  }
  
  // Seek to time
  seek(time) {
    if (!this._isInitialized) return;
    this._audioElement.currentTime = time;
  }
  
  // Set playback rate
  setPlaybackRate(rate) {
    if (!this._isInitialized) return;
    this._audioElement.playbackRate = rate;
  }
  
  // Get current time
  getCurrentTime() {
    return this._audioElement?.currentTime || 0;
  }
  
  // Get duration
  getDuration() {
    return this._audioElement?.duration || 0;
  }
  
  // Get current track
  getCurrentTrack() {
    return this._currentTrack;
  }
  
  // Check if playing
  isPlaying() {
    return this._audioElement && !this._audioElement.paused;
  }
  
  // Check if paused
  isPaused() {
    return this._audioElement && this._audioElement.paused;
  }
  
  // Get audio element (for direct access if needed)
  getAudioElement() {
    return this._audioElement;
  }
  
  // Generate audio URL
  _getAudioUrl(trackNum) {
    const paddedNum = String(trackNum).padStart(3, '0');
    return `${AUDIO_BASE_URL}/sanskrit_${paddedNum}.mp3`;
  }
  
  // Cleanup
  destroy() {
    if (this._loadAbortController) {
      this._loadAbortController.abort();
    }
    
    if (this._audioElement) {
      this._audioElement.pause();
      this._audioElement.src = '';
    }
    
    this._isInitialized = false;
    console.log('Audio service destroyed');
  }
}

// Export singleton
export const audioService = new AudioService();
