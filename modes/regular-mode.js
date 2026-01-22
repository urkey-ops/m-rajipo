// regular-mode.js - UPDATED with gap duration support
import { EVENTS, MODES, DEFAULT_SETTINGS, STORAGE_KEYS } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { state } from '../core/state.js';
import { playbackManager } from '../managers/playback-manager.js';
import { selectionManager } from '../managers/selection-manager.js';
import { storageService } from '../services/storage-service.js';
import { validateSpeed, validateRepeatCount } from '../utils/validation.js';
import { audioService } from '../services/audio-service.js'; // ✅ ADD THIS


class RegularMode {
  constructor() {
    this._isActive = false;
    this._settings = {
      speed: DEFAULT_SETTINGS.SPEED,
      repeatCount: DEFAULT_SETTINGS.REPEAT_COUNT,
      shuffle: false,
      repeatPlaylist: false,
      gapDuration: DEFAULT_SETTINGS.REGULAR_GAP // ✅ NEW: Gap between tracks
    };
  }
  
  // Initialize regular mode
  initialize() {
    if (this._isActive) {
      console.warn('Regular mode already active');
      return;
    }
    
    console.log('🎵 Initializing Regular Mode');
    
    // ✅ UPDATED: Load settings from storage
    const savedSettings = storageService.load(STORAGE_KEYS.REGULAR_SETTINGS);
    if (savedSettings) {
      this._settings = { 
        ...this._settings, 
        ...savedSettings,
        // ✅ Ensure gap exists in loaded settings
        gapDuration: savedSettings.gapDuration ?? DEFAULT_SETTINGS.REGULAR_GAP
      };
    }
    
    this._isActive = true;
    
    // Set mode in state
    state.setMode(MODES.REGULAR);
    
    // ✅ UPDATED: Update state with gap
    state.update({
      'regularMode.speed': this._settings.speed,
      'regularMode.repeatCount': this._settings.repeatCount,
      'regularMode.shuffle': this._settings.shuffle,
      'regularMode.repeatPlaylist': this._settings.repeatPlaylist,
      'regularMode.gapDuration': this._settings.gapDuration
    });

    
// 🔹 Sync audio playback rate with restored speed
audioService.setPlaybackRate(this._settings.speed);
    
    // Emit initialization event
    EventBus.emit('regular-mode:initialized', this._settings);
    
    console.log('✅ Regular mode initialized', this._settings);
  }
  
  // Cleanup regular mode
  cleanup() {
    if (!this._isActive) return;
    
    console.log('🧹 Cleaning up Regular Mode');
    
    // Stop any active playback
    if (playbackManager.isPlaying()) {
      playbackManager.stop();
    }
    
    this._isActive = false;
    
    EventBus.emit('regular-mode:cleanup');
    
    console.log('✅ Regular mode cleaned up');
  }
  
  // Start playback
  async startPlayback() {
    if (!this._isActive) {
      throw new Error('Regular mode not initialized');
    }
    
    // Get selected tracks
    const selectedTracks = selectionManager.getSelection();
    
    if (selectedTracks.length === 0) {
      throw new Error('No tracks selected');
    }
    
    // ✅ UPDATED: Include gapDuration in playback options
    const options = {
      startIndex: 0,
      repeatEach: this._settings.repeatCount,
      repeatPlaylist: this._settings.repeatPlaylist,
      shuffle: this._settings.shuffle,
      speed: this._settings.speed,
      gapDuration: this._settings.gapDuration // ✅ NEW: Pass gap to playback manager
    };
    
    console.log('Starting regular playback:', options);
    
    // Start playback through playback manager
    await playbackManager.startPlayback(selectedTracks, options);
    
    // Show toast
    const gapInfo = this._settings.gapDuration > 0 
      ? ` (${this._settings.gapDuration}s gap)` 
      : '';
    
    const message = selectedTracks.length === 1
      ? `Playing shloka ${selectedTracks[0]}${gapInfo}`
      : `Playing ${selectedTracks.length} shlokas${this._settings.shuffle ? ' (shuffled)' : ''}${gapInfo}`;
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message,
      type: 'success'
    });
  }
  
  // Update speed
  updateSpeed(speed) {
    const validation = validateSpeed(speed);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    this._settings.speed = validation.value;
    
    // Update state
    state.set('regularMode.speed', validation.value);
    
    // ✅ Save settings
    this._saveSettings();
    
    // Update playback if playing
    if (playbackManager.isPlaying()) {
      playbackManager.changeSpeed(validation.value);
    }
    
    console.log(`Speed updated: ${validation.value}×`);
    
    // Emit speed change event for UI updates
    EventBus.emit('regular-mode:speed-changed', validation.value);
  }
  
  // Update repeat count
  updateRepeatCount(count) {
    const validation = validateRepeatCount(count);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    this._settings.repeatCount = validation.value;
    
    // Update state
    state.set('regularMode.repeatCount', validation.value);
    
    // ✅ Save settings
    this._saveSettings();
    
    console.log(`Repeat count updated: ${validation.value}`);
    
    EventBus.emit('regular-mode:repeat-changed', validation.value);
  }
  
  // ✅ NEW: Update gap duration
  updateGapDuration(seconds) {
    // Validate gap duration
    const gap = parseInt(seconds);
    
    if (isNaN(gap)) {
      throw new Error('Gap duration must be a number');
    }
    
    if (gap < DEFAULT_SETTINGS.MIN_REGULAR_GAP || gap > DEFAULT_SETTINGS.MAX_REGULAR_GAP) {
      throw new Error(`Gap must be between ${DEFAULT_SETTINGS.MIN_REGULAR_GAP}s and ${DEFAULT_SETTINGS.MAX_REGULAR_GAP}s`);
    }
    
    this._settings.gapDuration = gap;
    
    // Update state
    state.set('regularMode.gapDuration', gap);
    
    // Save settings
    this._saveSettings();
    
    console.log(`Gap duration updated: ${gap}s`);
    
    EventBus.emit('regular-mode:gap-changed', gap);
  }
  
  // Toggle shuffle
  toggleShuffle() {
    this._settings.shuffle = !this._settings.shuffle;
    
    // Update state
    state.set('regularMode.shuffle', this._settings.shuffle);
    
    // ✅ Save settings
    this._saveSettings();
    
    console.log(`Shuffle: ${this._settings.shuffle}`);
    
    EventBus.emit('regular-mode:shuffle-changed', this._settings.shuffle);
    
    return this._settings.shuffle;
  }
  
  // Toggle repeat playlist
  toggleRepeatPlaylist() {
    this._settings.repeatPlaylist = !this._settings.repeatPlaylist;
    
    // Update state
    state.set('regularMode.repeatPlaylist', this._settings.repeatPlaylist);
    
    // ✅ Save settings
    this._saveSettings();
    
    console.log(`Repeat playlist: ${this._settings.repeatPlaylist}`);
    
    EventBus.emit('regular-mode:repeat-playlist-changed', this._settings.repeatPlaylist);
    
    return this._settings.repeatPlaylist;
  }
  
  // Update all settings at once
  updateSettings(settings) {
    if (settings.speed !== undefined) {
      this.updateSpeed(settings.speed);
    }
    
    if (settings.repeatCount !== undefined) {
      this.updateRepeatCount(settings.repeatCount);
    }
    
    if (settings.shuffle !== undefined) {
      this._settings.shuffle = settings.shuffle;
      state.set('regularMode.shuffle', settings.shuffle);
    }
    
    if (settings.repeatPlaylist !== undefined) {
      this._settings.repeatPlaylist = settings.repeatPlaylist;
      state.set('regularMode.repeatPlaylist', settings.repeatPlaylist);
    }
    
    // ✅ NEW: Handle gap duration updates
    if (settings.gapDuration !== undefined) {
      this.updateGapDuration(settings.gapDuration);
    }
    
    // ✅ Save after bulk update
    this._saveSettings();
    
    console.log('Settings updated:', this._settings);
    
    EventBus.emit('regular-mode:settings-changed', this._settings);
  }
  
  // ✅ NEW: Save settings to storage
  _saveSettings() {
    storageService.save(STORAGE_KEYS.REGULAR_SETTINGS, this._settings);
  }
  
  // Get current settings
  getSettings() {
    return { ...this._settings };
  }
  
  // Check if mode is active
  isActive() {
    return this._isActive;
  }
  
  // Validate if playback can start
  validate() {
    if (!this._isActive) {
      return { valid: false, error: 'Regular mode not initialized' };
    }
    
    const selectedCount = selectionManager.getCount();
    if (selectedCount === 0) {
      return { valid: false, error: 'No tracks selected' };
    }
    
    return { valid: true };
  }
  
  // Reset to defaults
  reset() {
    this._settings = {
      speed: DEFAULT_SETTINGS.SPEED,
      repeatCount: DEFAULT_SETTINGS.REPEAT_COUNT,
      shuffle: false,
      repeatPlaylist: false,
      gapDuration: DEFAULT_SETTINGS.REGULAR_GAP // ✅ NEW: Reset gap
    };
    
    // Update state
    state.update({
      'regularMode.speed': DEFAULT_SETTINGS.SPEED,
      'regularMode.repeatCount': DEFAULT_SETTINGS.REPEAT_COUNT,
      'regularMode.shuffle': false,
      'regularMode.repeatPlaylist': false,
      'regularMode.gapDuration': DEFAULT_SETTINGS.REGULAR_GAP // ✅ NEW
    });
    
    // ✅ Save reset settings
    this._saveSettings();
    
    console.log('Regular mode reset to defaults');
    
    EventBus.emit('regular-mode:reset');
  }
}

// Export singleton
export const regularMode = new RegularMode();
