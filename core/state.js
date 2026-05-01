import { EventBus } from './events.js';
import { EVENTS, MODES, DEFAULT_SETTINGS } from './constants.js';

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
        const part = keys[i];
        if (obj[part] === null || typeof obj[part] !== 'object') {
          obj[part] = {};
        }
        obj = obj[part];
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
    if (!VALID_MODES.has(mode)) {
      console.warn(`[State] setMode called with unknown mode: "${mode}". Ignoring.`);
      return;
    }

    if (this._state.currentMode === mode) return;

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
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(this._state);
      }
      return JSON.parse(JSON.stringify(this._state));
    } catch (e) {
      console.error('[State] getAll() deep clone failed:', e);
      return {
        ...this._state,
        quizMode: { ...this._state.quizMode },
        memoryMode: { ...this._state.memoryMode },
        regularMode: { ...this._state.regularMode },
        selectedTracks: [...this._state.selectedTracks]
      };
    }
  }

  _emitChange(key, value) {
    EventBus.emit(EVENTS.STATE_CHANGED, { key, value });
  }
}

export const state = new State();
