// constants.js - All application constants

export const TOTAL_TRACKS = 315;

export const AUDIO_BASE_URL = 'https://ia601703.us.archive.org/35/items/satsang_diksha';

export const TIMING = {
  MS_PER_SECOND: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,
  TOAST_DURATION: 3000,
  ERROR_TOAST_DURATION: 5000,
  DEBOUNCE_DELAY: 300,
  COUNTDOWN_INTERVAL: 250
};

export const STORAGE_KEYS = {
  PLAYLISTS: 'personalPlaylists',
  RECENT: 'recentSelections',
  QUIZ_SETTINGS: 'quizSettings',
  LAST_SELECTION: 'lastSelection',
  MEMORY_SETTINGS: 'memorySettings'
};

export const MAX_RECENT_ITEMS = 5;

export const DEFAULT_SETTINGS = {
  SPEED: 1.0,
  MIN_SPEED: 0.5,
  MAX_SPEED: 2.0,
  SPEED_STEP: 0.1,
  REPEAT_COUNT: 1,
  MIN_REPEAT: 1,
  MAX_REPEAT: 10,
  QUIZ_TIME: 20,
  MIN_QUIZ_TIME: 5,
  MAX_QUIZ_TIME: 60,
  QUIZ_TIME_STEP: 5,
  QUIZ_DELAY: 3,
  MIN_QUIZ_DELAY: 1,
  MAX_QUIZ_DELAY: 10,
  AUTO_PLAY: false,
  // Memory Mode settings
  MEMORY_START_TIME: 0,
  MEMORY_END_TIME: 20,
  MEMORY_GAP: 0,
  MIN_MEMORY_GAP: 0,
  MAX_MEMORY_GAP: 60
};

export const AUDIO_ERRORS = {
  ABORTED: 1,
  NETWORK: 2,
  DECODE: 3,
  NOT_SUPPORTED: 4
};

export const MODES = {
  REGULAR: 'regular',
  QUIZ: 'quiz',
  MEMORY: 'memory'
};

export const EVENTS = {
  // Playback events
  PLAYBACK_STARTED: 'playback:started',
  PLAYBACK_PAUSED: 'playback:paused',
  PLAYBACK_STOPPED: 'playback:stopped',
  PLAYBACK_ERROR: 'playback:error',
  TRACK_CHANGED: 'track:changed',
  TRACK_ENDED: 'track:ended',
  
  // Selection events
  SELECTION_CHANGED: 'selection:changed',
  SELECTION_CLEARED: 'selection:cleared',
  
  // Mode events
  MODE_CHANGED: 'mode:changed',
  
  // State events
  STATE_CHANGED: 'state:changed',
  SETTINGS_CHANGED: 'settings:changed',
  
  // UI events
  UI_READY: 'ui:ready',
  TOAST_SHOW: 'toast:show',
  MODAL_SHOW: 'modal:show',
  
  // Quiz events
  QUIZ_STARTED: 'quiz:started',
  QUIZ_COUNTDOWN_TICK: 'quiz:countdown:tick',
  QUIZ_COUNTDOWN_COMPLETE: 'quiz:countdown:complete',
  
  // Memory events
  MEMORY_LOOP_STARTED: 'memory:loop:started',
  MEMORY_LOOP_COMPLETED: 'memory:loop:completed',
  MEMORY_GAP_STARTED: 'memory:gap:started',
  MEMORY_SEGMENT_UPDATED: 'memory:segment:updated',
  
  // Network events
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline',
  
  // Storage events
  PLAYLIST_SAVED: 'playlist:saved',
  PLAYLIST_DELETED: 'playlist:deleted',
  HISTORY_CLEARED: 'history:cleared'
};

export const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning'
};
