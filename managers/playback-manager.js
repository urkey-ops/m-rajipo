// playback-manager.js - FIXED VERSION with cleanup and mode awareness
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
    this._isActive = false; // ✅ NEW: Track if manager is active
    
    // ✅ NEW: Track event listener cleanup functions
    this._eventCleanupFunctions = [];
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // ✅ FIXED: Store cleanup functions for later removal
    
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
      // ✅ Only allow in regular mode
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(nextCleanup);
    
    const prevCleanup = EventBus.on('audio:previous-requested', () => {
      // ✅ Only allow in regular mode
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
  
  // ✅ NEW: Cleanup method
  cleanup() {
    if (!this._isActive) return;
    
    console.log('🧹 Cleaning up Playback Manager');
    
    // Stop any active playback
    if (this._isPlaying) {
      this.stop();
    }
    
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
    
    console.log('✅ Playback Manager cleaned up');
  }
  
  // ✅ NEW: Initialize for active use
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
    
    // ✅ NEW: Check if already playing and stop first
    if (this._isPlaying) {
      console.warn('Already playing, stopping previous playback');
      this.stop();
    }
    
    // ✅ NEW: Only update state if in regular mode
    const currentMode = state.get('currentMode');
    const isRegularMode = currentMode === MODES.REGULAR;
    
    const {
      startIndex = 0,
      repeatEach = 1,
      repeatPlaylist = false,
      shuffle = false,
      speed = 1.0
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
    this._isActive = true; // ✅ Mark as active
    
    // ✅ FIXED: Only update playlist state in regular mode
    if (isRegularMode) {
      state.update({
        'playlist.tracks': playlist,
        'playlist.currentIndex': this._currentIndex,
        'playlist.repeatEach': this._repeatEach,
        'playlist.repeatCounter': 0,
        'playlist.repeatPlaylist': repeatPlaylist,
        'playlist.shuffled': this._shuffled
      });
    }
    
    // Save to history (save original tracks, not shuffled)
    storageService.saveToHistory(tracks);
    
    // Load and play first track
    await this._playTrackAtIndex(this._currentIndex);
    
    console.log(`📋 Playback started: ${playlist.length} tracks, repeat: ${repeatEach}×, loop: ${repeatPlaylist}, shuffle: ${shuffle}, speed: ${speed}×`);
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
      
      // ✅ FIXED: Set speed BEFORE playing (using Promise.resolve to ensure order)
      await Promise.resolve();
      audioService.setPlaybackRate(this._speed);
      
      await audioService.play();
      
      this._isPlaying = true;
      this._currentIndex = index;
      
      // ✅ FIXED: Only update state in regular mode
      if (isRegularMode) {
        state.update({
          'audio.currentTrack': trackNum,
          'audio.isPlaying': true,
          'audio.speed': this._speed,
          'playlist.currentIndex': index
        });
      }
      
      console.log(`▶️ Playing track ${trackNum} at index ${index}/${this._currentPlaylist.length - 1}, speed: ${this._speed}×`);
      
    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }
  
  // Handle track ended
  _handleTrackEnded() {
    // ✅ FIXED: Check if this manager is active and in regular mode
    if (!this._isActive) {
      console.log('Playback manager not active, ignoring track ended');
      return;
    }
    
    const currentMode = state.get('currentMode');
    
    // ✅ FIXED: Only handle if in regular mode
    if (currentMode !== MODES.REGULAR) {
      console.log(`${currentMode} mode active, playback manager ignoring track ended`);
      return;
    }
    
    console.log('Track ended, determining next action...');
    
    // Increment repeat counter
    this._repeatCounter++;
    console.log(`Repeat counter: ${this._repeatCounter}/${this._repeatEach}`);
    
    // Check if we need to repeat current track
    if (this._repeatCounter < this._repeatEach) {
      console.log('Repeating current track');
      state.set('playlist.repeatCounter', this._repeatCounter);
      this._playTrackAtIndex(this._currentIndex).catch(console.error);
      return;
    }
    
    // Reset counter and move to next track
    this._repeatCounter = 0;
    state.set('playlist.repeatCounter', 0);
    
    const nextResult = playlistService.getNextTrack(
      this._currentIndex,
      this._currentPlaylist,
      {
        repeatEach: this._repeatEach,
        repeatCounter: 0,
        repeatPlaylist: this._repeatPlaylist
      }
    );
    
    if (nextResult.isEnd) {
      console.log('✅ Playlist complete');
      this.stop();
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Playlist complete',
        type: 'success'
      });
      return;
    }
    
    if (nextResult.isLooping) {
      console.log('🔄 Looping playlist from start');
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Repeating playlist',
        type: 'info'
      });
    }
    
    this._currentIndex = nextResult.index;
    this._playTrackAtIndex(this._currentIndex).catch(console.error);
  }
  
  // Handle playback error
  _handlePlaybackError(data) {
    // ✅ Only handle if active and in regular mode
    if (!this._isActive || state.get('currentMode') !== MODES.REGULAR) {
      return;
    }
    
    console.error('Playback error:', data);
    
    // ✅ FIXED: Add error counter to prevent infinite loops
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
  
  // Play next track
  async next() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }
    
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
    // ✅ Reset error counter on successful manual skip
    this._errorCount = 0;
    
    const nextResult = playlistService.getNextTrack(
      this._currentIndex,
      this._currentPlaylist,
      {
        repeatEach: 1, // Don't repeat when manually skipping
        repeatCounter: 0,
        repeatPlaylist: this._repeatPlaylist
      }
    );
    
    if (nextResult.isEnd && !this._repeatPlaylist) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'End of playlist',
        type: 'info'
      });
      return;
    }
    
    this._repeatCounter = 0;
    this._currentIndex = nextResult.index;
    
    await this._playTrackAtIndex(this._currentIndex);
  }
  
  // Play previous track
  async previous() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }
    
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
    // ✅ Reset error counter
    this._errorCount = 0;
    
    const prevResult = playlistService.getPreviousTrack(
      this._currentIndex,
      this._currentPlaylist
    );
    
    this._repeatCounter = 0;
    this._currentIndex = prevResult.index;
    
    await this._playTrackAtIndex(this._currentIndex);
  }
  
  // Pause playback
  pause() {
    audioService.pause();
    this._isPlaying = false;
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', false);
    }
  }
  
  // Resume playback
  async resume() {
    await audioService.play();
    this._isPlaying = true;
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', true);
    }
  }
  
  // Stop playback
  stop() {
    audioService.stop();
    this._isPlaying = false;
    this._errorCount = 0; // ✅ Reset error counter
    
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
    // ✅ FIXED: Validate speed
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
  
  // ✅ NEW: Check if active
  isActive() {
    return this._isActive;
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
