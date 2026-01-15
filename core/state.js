// state.js - Global application state

import { EventBus } from './events.js';
import { EVENTS, MODES } from './constants.js';

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
      quizSettings: {
        recitationTime: 20,
        audioDelay: 3,
        autoAdvance: false
      },
      
      // Memory mode state
      memoryMode: {
        currentTrack: null,
        startTime: 0,
        endTime: 20,
        gapDuration: 0,
        speed: 1.0,
        isLooping: false,
        loopCount: 0
      }
    };
  }

  get(key) {
    // Support nested keys like 'memoryMode.startTime'
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
    // Support nested keys
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
