// regular-mode.js - CLEANED UP VERSION
import { EVENTS, MODES, DEFAULT_SETTINGS, STORAGE_KEYS } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { state } from '../core/state.js';
import { playbackManager } from '../managers/playback-manager.js';
import { selectionManager } from '../managers/selection-manager.js';
import { storageService } from '../services/storage-service.js';
import { validateSpeed, validateRepeatCount } from '../utils/validation.js';
import { audioService } from '../services/audio-service.js';
import { networkService } from '../services/network-service.js';

class RegularMode {
  constructor() {
    this._isActive = false;
    this._settings = {
      speed: DEFAULT_SETTINGS.SPEED,
      repeatCount: DEFAULT_SETTINGS.REPEAT_COUNT,
      shuffle: false,
      repeatPlaylist: false,
      gapDuration: DEFAULT_SETTINGS.REGULAR_GAP
    };
  }

  initialize() {
    if (this._isActive) {
      console.warn('Regular mode already active');
      return;
    }

    console.log('🎵 Initializing Regular Mode');

    const savedSettings = storageService.load(STORAGE_KEYS.REGULAR_SETTINGS);
    if (savedSettings) {
      this._settings = {
        ...this._settings,
        ...savedSettings,
        gapDuration: savedSettings.gapDuration ?? DEFAULT_SETTINGS.REGULAR_GAP
      };
    }

    this._isActive = true;

    state.setMode(MODES.REGULAR);

    state.update({
      'regularMode.speed': this._settings.speed,
      'regularMode.repeatCount': this._settings.repeatCount,
      'regularMode.shuffle': this._settings.shuffle,
      'regularMode.repeatPlaylist': this._settings.repeatPlaylist,
      'regularMode.gapDuration': this._settings.gapDuration
    });

    audioService.setPlaybackRate(this._settings.speed);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_INITIALIZED, this._settings);

    console.log('✅ Regular mode initialized', this._settings);
  }

  cleanup() {
    if (!this._isActive) return;

    console.log('🧹 Cleaning up Regular Mode');

    if (playbackManager.isPlaying()) {
      playbackManager.stop();
    }

    this._isActive = false;

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_CLEANUP);

    console.log('✅ Regular mode cleaned up');
  }

   async startPlayback() {
    if (!this._isActive) {
      throw new Error('Regular mode not initialized');
    }

    // ✅ Verified readiness checks
    if (!audioService.isInitialized()) {
      throw new Error('Audio service is not ready');
    }

    if (audioService.getReadyState() < 3) {
      throw new Error('Audio not ready to play (readyState < 3)');
    }

    if (!networkService._isOnline) {
      throw new Error('Network is offline');
    }

    const selectedTracks = selectionManager.getSelection();

    if (selectedTracks.length === 0) {
      throw new Error('No tracks selected');
    }

    const options = {
      startIndex: 0,
      repeatEach: this._settings.repeatCount,
      repeatPlaylist: this._settings.repeatPlaylist,
      shuffle: this._settings.shuffle,
      speed: this._settings.speed,
      gapDuration: this._settings.gapDuration
    };

    console.log('Starting regular playback:', options);

    await playbackManager.startPlayback(selectedTracks, options);

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

  updateSpeed(speed) {
    const validation = validateSpeed(speed);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this._settings.speed = validation.value;
    state.set('regularMode.speed', validation.value);
    this._saveSettings();

    if (playbackManager.isPlaying()) {
      playbackManager.changeSpeed(validation.value);
    }

    console.log(`Speed updated: ${validation.value}×`);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_SPEED_CHANGED, validation.value);
  }

  updateRepeatCount(count) {
    const validation = validateRepeatCount(count);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    this._settings.repeatCount = validation.value;
    state.set('regularMode.repeatCount', validation.value);
    this._saveSettings();

    console.log(`Repeat count updated: ${validation.value}`);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_REPEAT_CHANGED, validation.value);
  }

  updateGapDuration(seconds) {
    const gap = parseInt(seconds);

    if (isNaN(gap)) {
      throw new Error('Gap duration must be a number');
    }

    if (gap < DEFAULT_SETTINGS.MIN_REGULAR_GAP || gap > DEFAULT_SETTINGS.MAX_REGULAR_GAP) {
      throw new Error(`Gap must be between ${DEFAULT_SETTINGS.MIN_REGULAR_GAP}s and ${DEFAULT_SETTINGS.MAX_REGULAR_GAP}s`);
    }

    this._settings.gapDuration = gap;
    state.set('regularMode.gapDuration', gap);
    this._saveSettings();

    console.log(`Gap duration updated: ${gap}s`);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_GAP_CHANGED, gap);
  }

  toggleShuffle() {
    this._settings.shuffle = !this._settings.shuffle;
    state.set('regularMode.shuffle', this._settings.shuffle);
    this._saveSettings();

    console.log(`Shuffle: ${this._settings.shuffle}`);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_SHUFFLE_CHANGED, this._settings.shuffle);

    return this._settings.shuffle;
  }

  toggleRepeatPlaylist() {
    this._settings.repeatPlaylist = !this._settings.repeatPlaylist;
    state.set('regularMode.repeatPlaylist', this._settings.repeatPlaylist);
    this._saveSettings();

    console.log(`Repeat playlist: ${this._settings.repeatPlaylist}`);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_REPEAT_PLAYLIST_CHANGED, this._settings.repeatPlaylist);

    return this._settings.repeatPlaylist;
  }

  updateSettings(settings) {
    if (settings.speed !== undefined) this.updateSpeed(settings.speed);
    if (settings.repeatCount !== undefined) this.updateRepeatCount(settings.repeatCount);

    if (settings.shuffle !== undefined) {
      this._settings.shuffle = settings.shuffle;
      state.set('regularMode.shuffle', settings.shuffle);
    }

    if (settings.repeatPlaylist !== undefined) {
      this._settings.repeatPlaylist = settings.repeatPlaylist;
      state.set('regularMode.repeatPlaylist', settings.repeatPlaylist);
    }

    if (settings.gapDuration !== undefined) this.updateGapDuration(settings.gapDuration);

    this._saveSettings();

    console.log('Settings updated:', this._settings);

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_SETTINGS_CHANGED, this._settings);
  }

  _saveSettings() {
    storageService.save(STORAGE_KEYS.REGULAR_SETTINGS, this._settings);
  }

  getSettings() { return { ...this._settings }; }

  isActive() { return this._isActive; }

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

  reset() {
    this._settings = {
      speed: DEFAULT_SETTINGS.SPEED,
      repeatCount: DEFAULT_SETTINGS.REPEAT_COUNT,
      shuffle: false,
      repeatPlaylist: false,
      gapDuration: DEFAULT_SETTINGS.REGULAR_GAP
    };

    state.update({
      'regularMode.speed': DEFAULT_SETTINGS.SPEED,
      'regularMode.repeatCount': DEFAULT_SETTINGS.REPEAT_COUNT,
      'regularMode.shuffle': false,
      'regularMode.repeatPlaylist': false,
      'regularMode.gapDuration': DEFAULT_SETTINGS.REGULAR_GAP
    });

    this._saveSettings();

    console.log('Regular mode reset to defaults');

    // ✅ Uses EVENTS constant
    EventBus.emit(EVENTS.REGULAR_MODE_RESET);
  }
}

export const regularMode = new RegularMode();
