// playback-manager.js - UPDATED with gap timer support between tracks
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
    
    // ✅ NEW: Gap timer state
    this._gapDuration = 0;
    this._isInGap = false;
    this._gapTimerId = null;
    
    // Track event listener cleanup functions
    this._eventCleanupFunctions = [];
    this._errorCount = 0;
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // Listen to track ended event
    const trackEndedCleanup = EventBus.on(EVENTS.TRACK_ENDED, () => {
      this._handleTrackEnded();
    });
    this._eventCleanupFunctions.push(trackEndedCleanup);
    
    // Listen to playback errors
    const errorCleanup = EventBus.on(EVENTS.PLAYBACK_ERROR, (data) => {
      this._handlePlaybackError(data);
    });
    this._eventCleanupFunctions.push(errorCleanup);
    
    // Listen to next/previous requests from media controls
    const nextCleanup = EventBus.on('audio:next-requested', () => {
      // Only allow in regular mode
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(nextCleanup);
    
    const prevCleanup = EventBus.on('audio:previous-requested', () => {
      // Only allow in regular mode
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.previous();
      }
    });
    this._eventCleanupFunctions.push(prevCleanup);
    
    // Listen to skip requests from error recovery
    const skipCleanup = EventBus.on('playback:skip', () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(skipCleanup);
  }
  
  // Cleanup method
  cleanup() {
    if (!this._isActive) return;
    
    console.log('🧹 Cleaning up Playback Manager');
    
    // Stop any active playback
    if (this._isPlaying) {
      this.stop();
    }
    
    // ✅ NEW: Clear gap timer
    this._clearGapTimer();
    
    // Reset all state
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
  
  // Initialize for active use
  initialize() {
    if (this._isActive) {
      console.warn('Playback Manager already active');
      return;
    }
    
    console.log('🎵 Initializing Playback Manager');
    this._isActive = true;
  }
  
  // Start playback with options
  async startPlayback(tracks, options = {}) {
    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks provided');
    }
    
    // Check if already playing and stop first
    if (this._isPlaying) {
      console.warn('Already playing, stopping previous playback');
      this.stop();
    }
    
    // Only update state if in regular mode
    const currentMode = state.get('currentMode');
    const isRegularMode = currentMode === MODES.REGULAR;
    
    const {
      startIndex = 0,
      repeatEach = 1,
      repeatPlaylist = false,
      shuffle = false,
      speed = 1.0,
      gapDuration = 0 // ✅ NEW: Gap duration in seconds
    } = options;
    
    // Validate and prepare playlist
    const validation = playlistService.validatePlaylist(tracks);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Apply shuffle if requested
    let playlist = [...tracks];
    if (shuffle) {
      playlist = playlistService.shufflePlaylist(playlist);
      this._shuffled = true;
    } else {
      this._shuffled = false;
    }
    
    // Set playlist state
    this._currentPlaylist = playlist;
    this._currentIndex = Math.max(0, Math.min(startIndex, playlist.length - 1));
    this._repeatEach = Math.max(1, repeatEach);
    this._repeatCounter = 0;
    this._repeatPlaylist = repeatPlaylist;
    this._speed = speed;
    this._gapDuration = Math.max(0, gapDuration); // ✅ NEW: Store gap duration
    this._isActive = true;
    
    // FIXED: Only update playlist state in regular mode
    if (isRegularMode) {
      state.update({
        'playlist.tracks': playlist,
        'playlist.currentIndex': this._currentIndex,
        'playlist.repeatEach': this._repeatEach,
        'playlist.repeatCounter': 0,
        'playlist.repeatPlaylist': repeatPlaylist,
        'playlist.shuffled': this._shuffled,
        'playlist.gapDuration': this._gapDuration // ✅ NEW
      });
    }
    
    // Save to history (save original tracks, not shuffled)
    storageService.saveToHistory(tracks);
    
    // Load and play first track
    await this._playTrackAtIndex(this._currentIndex);
    
    const gapInfo = this._gapDuration > 0 ? `, gap: ${this._gapDuration}s` : '';
    console.log(`📋 Playback started: ${playlist.length} tracks, repeat: ${repeatEach}×, loop: ${repeatPlaylist}, shuffle: ${shuffle}, speed: ${speed}×${gapInfo}`);
  }
  
  // Play track at specific index
  async _playTrackAtIndex(index) {
    if (index < 0 || index >= this._currentPlaylist.length) {
      throw new Error('Invalid track index');
    }
    
    const trackNum = this._currentPlaylist[index];
    const currentMode = state.get('currentMode');
    const isRegularMode = currentMode === MODES.REGULAR;
    
    try {
      await audioService.loadTrack(trackNum);
      
      // Set speed BEFORE playing
      await Promise.resolve();
      audioService.setPlaybackRate(this._speed);
      
      await audioService.play();
      
      this._isPlaying = true;
      this._currentIndex = index;
      this._errorCount = 0; // Reset error count on successful play
      
      // FIXED: Only update state in regular mode
      if (isRegularMode) {
        state.update({
          'audio.currentTrack': trackNum,
          'audio.isPlaying': true,
          'audio.speed': this._speed,
          'playlist.currentIndex': index
        });
      }
      
      // ✅ FIX BUG #1: Emit track changed event for UI updates
      EventBus.emit(EVENTS.TRACK_CHANGED, { track: trackNum });
      
      console.log(`▶️ Playing track ${trackNum} at index ${index}/${this._currentPlaylist.length - 1}, speed: ${this._speed}×`);
      
    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }
  
  // ✅ UPDATED: Handle track ended with gap support
  _handleTrackEnded() {
    // Check if this manager is active and in regular mode
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
    
    // Increment repeat counter
    this._repeatCounter++;
    
    // Check if we need to repeat current track
    if (this._repeatCounter < this._repeatEach) {
      console.log(`⟳ Repeating track ${this._currentPlaylist[this._currentIndex]} (${this._repeatCounter}/${this._repeatEach})`);
      state.set('playlist.repeatCounter', this._repeatCounter);
      
      // ✅ NEW: Check if gap should be applied between repeats
      if (this._gapDuration > 0) {
        this._startGap('repeat');
      } else {
        // No gap - replay immediately
        setTimeout(() => {
          this._playTrackAtIndex(this._currentIndex).catch(console.error);
        }, 100);
      }
      return;
    }
    
    // Finished repeating current track, move to next
    console.log(`✓ Finished track ${this._currentPlaylist[this._currentIndex]} after ${this._repeatCounter} plays`);
    this._repeatCounter = 0;
    state.set('playlist.repeatCounter', 0);
    
    // Move to next track
    this._currentIndex++;
    
    // Check if end of playlist
    if (this._currentIndex >= this._currentPlaylist.length) {
      if (this._repeatPlaylist) {
        console.log('🔄 Looping playlist from start');
        this._currentIndex = 0;
        
        // ✅ NEW: Apply gap before looping
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
    
    // Play next track
    console.log(`▶ Next: track ${this._currentPlaylist[this._currentIndex]}`);
    
    // ✅ NEW: Apply gap before next track
    if (this._gapDuration > 0) {
      this._startGap('next');
    } else {
      // No gap - play immediately
      this._playTrackAtIndex(this._currentIndex).catch(console.error);
    }
  }
  
  // ✅ NEW: Start gap timer
  _startGap(reason = 'next') {
    console.log(`⏸️ Starting ${this._gapDuration}s gap (${reason})`);
    
    this._isInGap = true;
    state.set('playlist.isInGap', true);
    
    // Emit gap started event
    EventBus.emit(EVENTS.REGULAR_GAP_STARTED, {
      duration: this._gapDuration,
      reason: reason, // 'next', 'repeat', 'loop'
      nextTrack: this._currentPlaylist[this._currentIndex]
    });
    
    // Start countdown timer
    this._gapTimerId = timerManager.startCountdown(
      this._gapDuration,
      {
        onTick: (remaining, total) => {
          // Emit tick for UI updates (countdown display)
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
  
  // ✅ NEW: End gap and play next track
  _endGap() {
    this._isInGap = false;
    this._gapTimerId = null;
    state.set('playlist.isInGap', false);
    
    // Emit gap ended event
    EventBus.emit(EVENTS.REGULAR_GAP_ENDED);
    
    // Play the next track
    this._playTrackAtIndex(this._currentIndex).catch(console.error);
  }
  
  // ✅ NEW: Clear gap timer
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
  
  // ✅ NEW: Skip gap (public method for manual skip)
  skipGap() {
    if (!this._isInGap) {
      console.warn('No gap active to skip');
      return false;
    }
    
    console.log('⏩ Skipping gap');
    
    // Clear gap timer
    this._clearGapTimer();
    
    // Play next track immediately
    this._playTrackAtIndex(this._currentIndex).catch(console.error);
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: 'Gap skipped',
      type: 'info'
    });
    
    return true;
  }
  
  // Handle playback error
  _handlePlaybackError(data) {
    // Only handle if active and in regular mode
    if (!this._isActive || state.get('currentMode') !== MODES.REGULAR) {
      return;
    }
    
    console.error('Playback error:', data);
    
    // Add error counter to prevent infinite loops
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
    
    // Check if we can skip to next track
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
  
  // ✅ UPDATED: Play next track (cancel gap if active)
  async next() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }
    
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
    // ✅ NEW: Cancel gap if active
    this._clearGapTimer();
    
    // Reset error counter on successful manual skip
    this._errorCount = 0;
    
    // Move to next track
    this._currentIndex++;
    
    // Check if end of playlist
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
  
  // ✅ UPDATED: Play previous track (cancel gap if active)
  async previous() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }
    
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
    // ✅ NEW: Cancel gap if active
    this._clearGapTimer();
    
    // Reset error counter
    this._errorCount = 0;
    
    // Move to previous track
    this._currentIndex--;
    
    if (this._currentIndex < 0) {
      this._currentIndex = 0;
    }
    
    this._repeatCounter = 0;
    
    await this._playTrackAtIndex(this._currentIndex);
  }
  
  // Pause playback
  pause() {
    audioService.pause();
    this._isPlaying = false;
    
    // ✅ FIX BUG #2: Pause gap timer if in gap
    if (this._isInGap && this._gapTimerId) {
      timerManager.pauseCountdown(this._gapTimerId);
      console.log('⏸️ Gap timer paused');
    }
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', false);
    }
  }
  
  // Resume playback
  async resume() {
    await audioService.play();
    this._isPlaying = true;
    
    // ✅ FIX BUG #2: Resume gap timer if in gap
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
  
  // ✅ UPDATED: Stop playback (clear gap timer)
  stop() {
    audioService.stop();
    this._isPlaying = false;
    this._errorCount = 0;
    
    // ✅ NEW: Clear gap timer
    this._clearGapTimer();
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.update({
        'audio.isPlaying': false,
        'audio.currentTrack': null
      });
    }
  }
  
  // Seek to position
  seek(time) {
    audioService.seek(time);
  }
  
  // Change speed
  changeSpeed(speed) {
    // Validate speed
    const validSpeed = Math.max(0.5, Math.min(2.0, speed));
    
    this._speed = validSpeed;
    audioService.setPlaybackRate(validSpeed);
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.speed', validSpeed);
    }
  }
  
  // Get current state
  getState() {
    return {
      isPlaying: this._isPlaying,
      isActive: this._isActive,
      isInGap: this._isInGap, // ✅ NEW
      gapDuration: this._gapDuration, // ✅ NEW
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
  
  // Check if playing
  isPlaying() {
    return this._isPlaying;
  }
  
  // Check if active
  isActive() {
    return this._isActive;
  }
  
  // ✅ NEW: Check if in gap
  isInGap() {
    return this._isInGap;
  }
  
  // Get current playlist
  getCurrentPlaylist() {
    return [...this._currentPlaylist];
  }
  
  // Get current track
  getCurrentTrack() {
    return this._currentPlaylist[this._currentIndex] || null;
  }
  
  // Get current index
  getCurrentIndex() {
    return this._currentIndex;
  }
}

// Export singleton
export const playbackManager = new PlaybackManager();
