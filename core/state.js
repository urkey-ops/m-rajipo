// state.js - Global application state - FIXED VERSION

import { EventBus } from './events.js';
import { EVENTS, MODES, DEFAULT_SETTINGS } from './constants.js';

class State {
  constructor() {
    this._state = {
      currentMode: MODES.REGULAR,
      isQuizMode: false,
      isMemoryMode: false,
      selectedTracks: [],
      currentTrack: null,
      isPlaying: false,
      playbackSpeed: 1.0,
      
      // Quiz mode state
      quizMode: {
        quizTime: DEFAULT_SETTINGS.QUIZ_TIME,
        quizDelay: DEFAULT_SETTINGS.QUIZ_DELAY,
        autoPlay: DEFAULT_SETTINGS.AUTO_PLAY,
        autoPlayFull: DEFAULT_SETTINGS.AUTO_PLAY_FULL,
        currentTrack: null,
        isPaused: false
      },
      
      // Memory mode state
      memoryMode: {
        currentTrack: null,
        startTime: DEFAULT_SETTINGS.MEMORY_START_TIME,
        endTime: DEFAULT_SETTINGS.MEMORY_END_TIME,
        gapDuration: DEFAULT_SETTINGS.MEMORY_GAP,
        speed: 1.0,
        isLooping: false,
        loopCount: 0
      },
      
      // ✅ FIXED: Regular mode state (was missing!)
      regularMode: {
        speed: DEFAULT_SETTINGS.SPEED,
        repeatCount: DEFAULT_SETTINGS.REPEAT_COUNT,
        shuffle: false,
        repeatPlaylist: false,
        gapDuration: DEFAULT_SETTINGS.REGULAR_GAP
      }
    };
  }

  get(key) {
    if (key.includes('.')) {
      const keys = key.split('.');
      let value = this._state;
      for (const k of keys) {
        value = value?.[k];
      }
      return value;
    }
    return this._state[key];
  }

  set(key, value) {
    if (key.includes('.')) {
      const keys = key.split('.');
      let obj = this._state;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
    } else {
      this._state[key] = value;
    }
    
    this._emitChange(key, value);
  }

  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  setMode(mode) {
    this._state.currentMode = mode;
    this._state.isQuizMode = mode === MODES.QUIZ;
    this._state.isMemoryMode = mode === MODES.MEMORY;
    
    EventBus.emit(EVENTS.MODE_CHANGED, { mode });
  }

  isQuizMode() {
    return this._state.isQuizMode;
  }

  isMemoryMode() {
    return this._state.isMemoryMode;
  }

  getAll() {
    return { ...this._state };
  }

  _emitChange(key, value) {
    EventBus.emit(EVENTS.STATE_CHANGED, { key, value });
  }
}

// Export singleton
export const state = new State();
