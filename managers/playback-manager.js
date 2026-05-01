// playback-manager.js - UPDATED VERSION (with 503 retry, no skip cascade)
import { EVENTS, MODES } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { state } from '../core/state.js';
import { audioService } from '../services/audio-service.js';
import { playlistService } from '../services/playlist-service.js';
import { storageService } from '../services/storage-service.js';
import { timerManager } from './timer-manager.js';

class PlaybackManager {
  constructor() {
    this._isPlaying = false;
    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._repeatEach = 1;
    this._repeatCounter = 0;
    this._repeatPlaylist = false;
    this._shuffled = false;
    this._speed = 1.0;
    this._isActive = false;

    this._gapDuration = 0;
    this._isInGap = false;
    this._gapTimerId = null;

    this._eventCleanupFunctions = [];
    this._errorCount = 0;

    this._setupEventListeners();
  }

  _setupEventListeners() {
    // ✅ All string literals replaced with EVENTS constants
    const trackEndedCleanup = EventBus.on(EVENTS.TRACK_ENDED, () => {
      this._handleTrackEnded();
    });
    this._eventCleanupFunctions.push(trackEndedCleanup);

    const errorCleanup = EventBus.on(EVENTS.PLAYBACK_ERROR, (data) => {
      this._handlePlaybackError(data);
    });
    this._eventCleanupFunctions.push(errorCleanup);

    const nextCleanup = EventBus.on(EVENTS.AUDIO_NEXT_REQUESTED, () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(nextCleanup);

    const prevCleanup = EventBus.on(EVENTS.AUDIO_PREVIOUS_REQUESTED, () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.previous();
      }
    });
    this._eventCleanupFunctions.push(prevCleanup);

    const skipCleanup = EventBus.on(EVENTS.PLAYBACK_SKIP, () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(skipCleanup);
  }

  cleanup() {
    if (!this._isActive) return;

    console.log('🧹 Cleaning up Playback Manager');

    // Execute and clear all stored event cleanup functions
    if (Array.isArray(this._eventCleanupFunctions)) {
      this._eventCleanupFunctions.forEach(cleanupFn => {
        if (typeof cleanupFn === 'function') {
          cleanupFn();
        }
      });
      this._eventCleanupFunctions = [];
    }

    if (this._isPlaying) {
      this.stop();
    }

    this._clearGapTimer();

    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._repeatEach = 1;
    this._repeatCounter = 0;
    this._repeatPlaylist = false;
    this._shuffled = false;
    this._speed = 1.0;
    this._isPlaying = false;
    this._isActive = false;
    this._gapDuration = 0;
    this._isInGap = false;
    this._errorCount = 0;

    console.log('✅ Playback Manager cleaned up');
  }

  initialize() {
    if (this._isActive) {
      console.warn('Playback Manager already active');
      return;
    }

    console.log('🎵 Initializing Playback Manager');
    this._isActive = true;
  }

  async startPlayback(tracks, options = {}) {
    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks provided');
    }

    if (this._isPlaying) {
      console.warn('Already playing, stopping previous playback');
      this.stop();
    }

    const currentMode = state.get('currentMode');
    const isRegularMode = currentMode === MODES.REGULAR;

    const {
      startIndex = 0,
      repeatEach = 1,
      repeatPlaylist = false,
      shuffle = false,
      speed = 1.0,
      gapDuration = 0
    } = options;

    const validation = playlistService.validatePlaylist(tracks);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let playlist = [...tracks];
    if (shuffle) {
      playlist = playlistService.shufflePlaylist(playlist);
      this._shuffled = true;
    } else {
      this._shuffled = false;
    }

    this._currentPlaylist = playlist;
    this._currentIndex = Math.max(0, Math.min(startIndex, playlist.length - 1));
    this._repeatEach = Math.max(1, repeatEach);
    this._repeatCounter = 0;
    this._repeatPlaylist = repeatPlaylist;
    this._speed = speed;
    this._gapDuration = Math.max(0, gapDuration);
    this._isActive = true;

    if (isRegularMode) {
      state.update({
        'playlist.tracks': playlist,
        'playlist.currentIndex': this._currentIndex,
        'playlist.repeatEach': this._repeatEach,
        'playlist.repeatCounter': 0,
        'playlist.repeatPlaylist': repeatPlaylist,
        'playlist.shuffled': this._shuffled,
        'playlist.gapDuration': this._gapDuration
      });
    }

    storageService.saveToHistory(tracks);

    await this._playTrackAtIndex(this._currentIndex);

    const gapInfo = this._gapDuration > 0 ? `, gap: ${this._gapDuration}s` : '';
    console.log(`📋 Playback started: ${playlist.length} tracks, repeat: ${repeatEach}×, loop: ${repeatPlaylist}, shuffle: ${shuffle}, speed: ${speed}×${gapInfo}`);
  }

  async _playTrackAtIndex(index) {
    if (index < 0 || index >= this._currentPlaylist.length) {
      throw new Error('Invalid track index');
    }

    const trackNum = this._currentPlaylist[index];
    const currentMode = state.get('currentMode');
    const isRegularMode = currentMode === MODES.REGULAR;

    try {
      await audioService.loadTrack(trackNum);

      audioService.setPlaybackRate(this._speed);

      await audioService.play();

      this._isPlaying = true;
      this._currentIndex = index;
      this._errorCount = 0;

      if (isRegularMode) {
        state.update({
          'audio.currentTrack': trackNum,
          'audio.isPlaying': true,
          'audio.speed': this._speed,
          'playlist.currentIndex': index
        });
      }

      EventBus.emit(EVENTS.TRACK_CHANGED, { track: trackNum });

      console.log(`▶️ Playing track ${trackNum} at index ${index}/${this._currentPlaylist.length - 1}, speed: ${this._speed}×`);

    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }

  _handleTrackEnded() {
    if (!this._isActive) {
      console.log('Playback manager not active, ignoring track ended');
      return;
    }

    const currentMode = state.get('currentMode');

    if (currentMode !== MODES.REGULAR) {
      console.log(`${currentMode} mode active, playback manager ignoring track ended`);
      return;
    }

    console.log(`Track ${this._currentPlaylist[this._currentIndex]} ended. Repeat: ${this._repeatCounter + 1}/${this._repeatEach}`);

    this._repeatCounter++;

    if (this._repeatCounter < this._repeatEach) {
      console.log(`⟳ Repeating track ${this._currentPlaylist[this._currentIndex]} (${this._repeatCounter}/${this._repeatEach})`);
      state.set('playlist.repeatCounter', this._repeatCounter);

      if (this._gapDuration > 0) {
        this._startGap('repeat');
      } else {
        setTimeout(() => {
          this._playTrackAtIndex(this._currentIndex).catch(console.error);
        }, 100);
      }
      return;
    }

    console.log(`✓ Finished track ${this._currentPlaylist[this._currentIndex]} after ${this._repeatCounter} plays`);
    this._repeatCounter = 0;
    state.set('playlist.repeatCounter', 0);

    this._currentIndex++;

    if (this._currentIndex >= this._currentPlaylist.length) {
      if (this._repeatPlaylist) {
        console.log('🔄 Looping playlist from start');
        this._currentIndex = 0;

        if (this._gapDuration > 0) {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: `Gap before repeating playlist (${this._gapDuration}s)`,
            type: 'info'
          });
          this._startGap('loop');
        } else {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: 'Repeating playlist',
            type: 'info'
          });
          setTimeout(() => {
            this._playTrackAtIndex(this._currentIndex).catch(console.error);
          }, 100);
        }
      } else {
        console.log('✅ Playlist complete');
        this.stop();
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Playlist complete',
          type: 'success'
        });
      }
      return;
    }

    console.log(`▶ Next: track ${this._currentPlaylist[this._currentIndex]}`);

    if (this._gapDuration > 0) {
      this._startGap('next');
    } else {
      this._playTrackAtIndex(this._currentIndex).catch(console.error);
    }
  }

  _startGap(reason = 'next') {
    console.log(`⏸️ Starting ${this._gapDuration}s gap (${reason})`);

    this._isInGap = true;
    state.set('playlist.isInGap', true);

    EventBus.emit(EVENTS.REGULAR_GAP_STARTED, {
      duration: this._gapDuration,
      reason,
      nextTrack: this._currentPlaylist[this._currentIndex]
    });

    this._gapTimerId = timerManager.startCountdown(
      this._gapDuration,
      {
        onTick: (remaining, total) => {
          EventBus.emit(EVENTS.REGULAR_GAP_TICK, {
            remaining,
            total,
            nextTrack: this._currentPlaylist[this._currentIndex]
          });
        },
        onComplete: () => {
          console.log('✓ Gap complete, playing next track');
          this._endGap();
        }
      }
    );
  }

  _endGap() {
    this._isInGap = false;
    this._gapTimerId = null;
    state.set('playlist.isInGap', false);

    EventBus.emit(EVENTS.REGULAR_GAP_ENDED);

    this._playTrackAtIndex(this._currentIndex).catch(console.error);
  }

  _clearGapTimer() {
    if (this._gapTimerId) {
      timerManager.stopTimer(this._gapTimerId);
      this._gapTimerId = null;
      console.log('🛑 Gap timer cleared');
    }

    if (this._isInGap) {
      this._isInGap = false;
      state.set('playlist.isInGap', false);
    }
  }

  skipGap() {
    if (!this._isInGap) {
      console.warn('No gap active to skip');
      return false;
    }

    console.log('⏩ Skipping gap');
    this._clearGapTimer();
    this._playTrackAtIndex(this._currentIndex).catch(console.error);

    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: 'Gap skipped',
      type: 'info'
    });

    return true;
  }

  _handlePlaybackError(data) {
    if (!this._isActive || state.get('currentMode') !== MODES.REGULAR) {
      return;
    }

    console.error('Playback error:', data);

    // NEW: detect retryable 503 / network error
    const isRetryable = data.retryable === true;

    if (!this._errorCount) this._errorCount = 0;
    this._errorCount++;

    if (this._errorCount > 3) {
      console.error('Too many consecutive errors, stopping playback');
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Multiple playback errors. Stopping.',
        type: 'error'
      });
      this.stop();
      this._errorCount = 0;
      return;
    }

    if (isRetryable) {
      // 503 / network → retry same track with backoff
      console.log('🔄 Temporary 503 / network error, retrying same track...');

      const wait = Math.min(1000 * this._errorCount, 5000); // 1s, 2s, 3s, 5s cap

      setTimeout(async () => {
        try {
          await this._playTrackAtIndex(this._currentIndex);
        } catch (err) {
          console.error('Retry failed:', err);
          this._handlePlaybackError(err);
        }
      }, wait);

      return;
    }

    // Hard error → skip if there is a next track
    if (this._currentPlaylist.length > 1 && this._currentIndex < this._currentPlaylist.length - 1) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Skipping problematic track...',
        type: 'warning'
      });

      setTimeout(() => {
        this.next().catch(console.error);
      }, 1000);
    }
  }

  async next() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }

    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }

    this._clearGapTimer();
    this._errorCount = 0;

    this._currentIndex++;

    if (this._currentIndex >= this._currentPlaylist.length) {
      if (this._repeatPlaylist) {
        this._currentIndex = 0;
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Looping to start',
          type: 'info'
        });
      } else {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'End of playlist',
          type: 'info'
        });
        return;
      }
    }

    this._repeatCounter = 0;

    await this._playTrackAtIndex(this._currentIndex);
  }

  async previous() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }

    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }

    this._clearGapTimer();
    this._errorCount = 0;

    this._currentIndex--;

    if (this._currentIndex < 0) {
      this._currentIndex = 0;
    }

    this._repeatCounter = 0;

    await this._playTrackAtIndex(this._currentIndex);
  }

  pause() {
    audioService.pause();
    this._isPlaying = false;

    if (this._isInGap && this._gapTimerId) {
      timerManager.pauseCountdown(this._gapTimerId);
      console.log('⏸️ Gap timer paused');
    }

    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', false);
    }
  }

  async resume() {
    await audioService.play();
    this._isPlaying = true;

    if (this._isInGap && this._gapTimerId) {
      const onTick = (remaining, total) => {
        EventBus.emit(EVENTS.REGULAR_GAP_TICK, {
          remaining,
          total,
          nextTrack: this._currentPlaylist[this._currentIndex]
        });
      };

      const onComplete = () => {
        console.log('✓ Gap complete, playing next track');
        this._endGap();
      };

      timerManager.resumeCountdown(this._gapTimerId, onTick, onComplete);
      console.log('▶️ Gap timer resumed');
    }

    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', true);
    }
  }

  stop() {
    audioService.stop();
    this._isPlaying = false;
    this._errorCount = 0;

    this._clearGapTimer();

    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.update({
        'audio.isPlaying': false,
        'audio.currentTrack': null
      });
    }
  }

  seek(time) {
    audioService.seek(time);
  }

  changeSpeed(speed) {
    const validSpeed = Math.max(0.5, Math.min(2.0, speed));
    this._speed = validSpeed;
    audioService.setPlaybackRate(validSpeed);

    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.speed', validSpeed);
    }
  }

  getState() {
    return {
      isPlaying: this._isPlaying,
      isActive: this._isActive,
      isInGap: this._isInGap,
      gapDuration: this._gapDuration,
      playlist: [...this._currentPlaylist],
      currentIndex: this._currentIndex,
      currentTrack: this._currentPlaylist[this._currentIndex] || null,
      repeatEach: this._repeatEach,
      repeatCounter: this._repeatCounter,
      repeatPlaylist: this._repeatPlaylist,
      shuffled: this._shuffled,
      speed: this._speed
    };
  }

  isPlaying() { return this._isPlaying; }
  isActive() { return this._isActive; }
  isInGap() { return this._isInGap; }
  getCurrentPlaylist() { return [...this._currentPlaylist]; }
  getCurrentTrack() { return this._currentPlaylist[this._currentIndex] || null; }
  getCurrentIndex() { return this._currentIndex; }
}

export const playbackManager = new PlaybackManager();
