// playback-manager.js - Orchestrates audio playback with playlists
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
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // Listen to track ended event
    EventBus.on(EVENTS.TRACK_ENDED, () => {
      this._handleTrackEnded();
    });
    
    // Listen to playback errors
    EventBus.on(EVENTS.PLAYBACK_ERROR, (data) => {
      this._handlePlaybackError(data);
    });
    
    // Listen to next/previous requests from media controls
    EventBus.on('audio:next-requested', () => {
      this.next();
    });
    
    EventBus.on('audio:previous-requested', () => {
      this.previous();
    });
    
    // Listen to skip requests from error recovery
    EventBus.on('playback:skip', () => {
      this.next();
    });
  }
  
  // Start playback with options
  async startPlayback(tracks, options = {}) {
    if (!tracks || tracks.length === 0) {
      throw new Error('No tracks provided');
    }
    
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
    
    // Update state
    state.update({
      'playlist.tracks': playlist,
      'playlist.currentIndex': this._currentIndex,
      'playlist.repeatEach': this._repeatEach,
      'playlist.repeatCounter': 0,
      'playlist.repeatPlaylist': repeatPlaylist,
      'playlist.shuffled': this._shuffled
    });
    
    // Save to history
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
    
    try {
      await audioService.loadTrack(trackNum);
      
      // Set speed AFTER loading track
      audioService.setPlaybackRate(this._speed);
      
      await audioService.play();
      
      this._isPlaying = true;
      this._currentIndex = index;
      
      // Update state
      state.update({
        'audio.currentTrack': trackNum,
        'audio.isPlaying': true,
        'audio.speed': this._speed,
        'playlist.currentIndex': index
      });
      
      console.log(`▶️ Playing track ${trackNum} at index ${index}/${this._currentPlaylist.length - 1}, speed: ${this._speed}×`);
      
    } catch (error) {
      console.error('Failed to play track:', error);
      throw error;
    }
  }
  
  // Handle track ended
  _handleTrackEnded() {
    console.log('Track ended, determining next action...');
    
    // Check current mode
    if (state.isQuizMode()) {
      console.log('Quiz mode: waiting for manual advance');
      return;
    }
    
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
    console.error('Playback error:', data);
    
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
    if (!this._currentPlaylist || this._currentPlaylist.length === 0) {
      throw new Error('No playlist loaded');
    }
    
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
  
  // Pause playback
  pause() {
    audioService.pause();
    this._isPlaying = false;
    state.set('audio.isPlaying', false);
  }
  
  // Resume playback
  async resume() {
    await audioService.play();
    this._isPlaying = true;
    state.set('audio.isPlaying', true);
  }
  
  // Stop playback
  stop() {
    audioService.stop();
    this._isPlaying = false;
    
    state.update({
      'audio.isPlaying': false,
      'audio.currentTrack': null
    });
  }
  
  // Seek to position
  seek(time) {
    audioService.seek(time);
  }
  
  // Change speed
  changeSpeed(speed) {
    this._speed = speed;
    audioService.setPlaybackRate(speed);
    state.set('audio.speed', speed);
  }
  
  // Get current state
  getState() {
    return {
      isPlaying: this._isPlaying,
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
