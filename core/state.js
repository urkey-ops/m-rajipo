// state.js - FIXED: B1, B2, B3, B4
import { EventBus } from './events.js';
import { EVENTS, MODES, DEFAULT_SETTINGS } from './constants.js';

// B2: valid mode values for guard in setMode()
const VALID_MODES = new Set(Object.values(MODES));

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
      quizMode: {
        quizTime: DEFAULT_SETTINGS.QUIZ_TIME,
        quizDelay: DEFAULT_SETTINGS.QUIZ_DELAY,
        autoPlay: DEFAULT_SETTINGS.AUTO_PLAY,
        autoPlayFull: DEFAULT_SETTINGS.AUTO_PLAY_FULL,
        currentTrack: null,
        isPaused: false
      },
      memoryMode: {
        currentTrack: null,
        startTime: DEFAULT_SETTINGS.MEMORY_START_TIME,
        endTime: DEFAULT_SETTINGS.MEMORY_END_TIME,
        gapDuration: DEFAULT_SETTINGS.MEMORY_GAP,
        speed: 1.0,
        isLooping: false,
        loopCount: 0
      },
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
        // B1: only create a plain object if the slot is missing or not an object
        // never clobber arrays, numbers, booleans, strings
        if (obj[keys[i]] === null || typeof obj[keys[i]] !== 'object') {
          obj[keys[i]] = {};
        }
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
    // B2: reject unknown mode values early
    if (!VALID_MODES.has(mode)) {
      console.warn(`[State] setMode called with unknown mode: "${mode}". Ignoring.`);
      return;
    }
    // B4: skip redundant event if mode hasn't actually changed
    if (this._state.currentMode === mode) return;

    this._state.currentMode = mode;
    this._state.isQuizMode = mode === MODES.QUIZ;
    this._state.isMemoryMode = mode === MODES.MEMORY;
    EventBus.emit(EVENTS.MODE_CHANGED, { mode });
  }

  // NOTE: these are properties, not methods — keep as getters to avoid
  // name collision with the boolean flags stored in _state
  get isQuizMode() { return this._state.isQuizMode; }
  get isMemoryMode() { return this._state.isMemoryMode; }

  getAll() {
    // B3: safe deep clone; guard against circular references
    try {
      return structuredClone(this._state);
    } catch {
      // fallback for environments without structuredClone
      try {
        return JSON.parse(JSON.stringify(this._state));
      } catch (e) {
        console.error('[State] getAll() deep clone failed (possible circular ref):', e);
        return { ...this._state }; // last-resort shallow copy
      }
    }
  }

  _emitChange(key, value) {
    EventBus.emit(EVENTS.STATE_CHANGED, { key, value });
  }
}

export const state = new State();
