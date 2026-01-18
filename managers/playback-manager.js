// playback-manager.js - FIXED VERSION with cleanup and speed timing fix
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
    this._eventCleanupFunctions = [];
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // ✅ Store cleanup functions for later removal
    
    const trackEndedCleanup = EventBus.on(EVENTS.TRACK_ENDED, () => {
      this._handleTrackEnded();
    });
    this._eventCleanupFunctions.push(trackEndedCleanup);
    
    const errorCleanup = EventBus.on(EVENTS.PLAYBACK_ERROR, (data) => {
      this._handlePlaybackError(data);
    });
    this._eventCleanupFunctions.push(errorCleanup);
    
    const nextCleanup = EventBus.on('audio:next-requested', () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(nextCleanup);
    
    const prevCleanup = EventBus.on('audio:previous-requested', () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.previous();
      }
    });
    this._eventCleanupFunctions.push(prevCleanup);
    
    const skipCleanup = EventBus.on('playback:skip', () => {
      if (this._isActive && state.get('currentMode') === MODES.REGULAR) {
        this.next();
      }
    });
    this._eventCleanupFunctions.push(skipCleanup);
  }
  
  // ✅ FIXED: Now properly removes event listeners
  cleanup() {
    if (!this._isActive) return;
    
    console.log('🧹 Cleaning up Playback Manager');
    
    if (this._isPlaying) {
      this.stop();
    }
    
    // ✅ CRITICAL FIX: Call all cleanup functions
    this._eventCleanupFunctions.forEach(cleanup => cleanup());
    this._eventCleanupFunctions = [];
    
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
      speed = 1.0
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
    this._isActive = true;
    
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
    
    storageService.saveToHistory(tracks);
    
    await this._playTrackAtIndex(this._currentIndex);
    
    console.log(`📋 Playback started: ${playlist.length} tracks, repeat: ${repeatEach}×, loop: ${repeatPlaylist}, shuffle: ${shuffle}, speed: ${speed}×`);
  }
  
  // ✅ FIXED: Set speed BEFORE playing
  async _playTrackAtIndex(index) {
    if (index < 0 || index >= this._currentPlaylist.length) {
      throw new Error('Invalid track index');
    }
    
    const trackNum = this._currentPlaylist[index];
    const currentMode = state.get('currentMode');
    const isRegularMode = currentMode === MODES.REGULAR;
    
    try {
      await audioService.loadTrack(trackNum);
      
      // ✅ CRITICAL FIX: Set speed BEFORE playing to prevent brief wrong-speed playback
      audioService.setPlaybackRate(this._speed);
      
      await audioService.play();
      
      this._isPlaying = true;
      this._currentIndex = index;
      
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
      
      setTimeout(() => {
        if (!this._isActive) return; // ✅ Safety check
        this._playTrackAtIndex(this._currentIndex).catch(console.error);
      }, 100);
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
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Repeating playlist',
          type: 'info'
        });
      } else {
        console.log('✅ Playlist complete');
        this.stop();
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Playlist complete',
          type: 'success'
        });
        return;
      }
    }
    
    console.log(`▶ Playing next track: ${this._currentPlaylist[this._currentIndex]}`);
    this._playTrackAtIndex(this._currentIndex).catch(console.error);
  }

  _handlePlaybackError(data) {
    if (!this._isActive) return;
    
    const currentMode = state.get('currentMode');
    if (currentMode !== MODES.REGULAR) return;
    
    console.error('Playback error:', data);
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: 'Playback error. Skipping to next track...',
      type: 'error'
    });
    
    setTimeout(() => {
      if (!this._isActive) return; // ✅ Safety check
      this.next().catch(console.error);
    }, 1000);
  }

  async next() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }
    
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
    const nextResult = playlistService.getNextTrack(
      this._currentIndex,
      this._currentPlaylist,
      {
        repeatEach: this._repeatEach,
        repeatCounter: this._repeatCounter,
        repeatPlaylist: this._repeatPlaylist
      }
    );
    
    if (nextResult.isEnd && !this._repeatPlaylist) {
      console.log('End of playlist reached');
      this.stop();
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Playlist complete',
        type: 'success'
      });
      return;
    }
    
    this._repeatCounter = nextResult.repeatCounter;
    this._currentIndex = nextResult.index;
    
    await this._playTrackAtIndex(this._currentIndex);
  }

  async previous() {
    if (!this._isActive) {
      throw new Error('Playback manager not active');
    }
    
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
    const prevResult = playlistService.getPreviousTrack(
      this._currentIndex,
      this._currentPlaylist
    );
    
    this._repeatCounter = 0;
    this._currentIndex = prevResult.index;
    
    await this._playTrackAtIndex(this._currentIndex);
  }
  
  pause() {
    audioService.pause();
    this._isPlaying = false;
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', false);
    }
  }
  
  async resume() {
    await audioService.play();
    this._isPlaying = true;
    
    const currentMode = state.get('currentMode');
    if (currentMode === MODES.REGULAR) {
      state.set('audio.isPlaying', true);
    }
  }
  
  stop() {
    audioService.stop();
    this._isPlaying = false;
    
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
  
  isPlaying() {
    return this._isPlaying;
  }
  
  isActive() {
    return this._isActive;
  }
  
  getCurrentPlaylist() {
    return [...this._currentPlaylist];
  }
  
  getCurrentTrack() {
    return this._currentPlaylist[this._currentIndex] || null;
  }
  
  getCurrentIndex() {
    return this._currentIndex;
  }
}

export const playbackManager = new PlaybackManager();
