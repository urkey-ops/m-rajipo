// constants.js - CLEANED UP VERSION
export const TOTAL_TRACKS = 315;
export const AUDIO_BASE_URL = 'https://cors.archive.org/download/satsang_diksha';
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
  MEMORY_SETTINGS: 'memorySettings',
  REGULAR_SETTINGS: 'regularSettings'
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

  REGULAR_GAP: 0,
  MIN_REGULAR_GAP: 0,
  MAX_REGULAR_GAP: 60,

  QUIZ_TIME: 20,
  MIN_QUIZ_TIME: 5,
  MAX_QUIZ_TIME: 60,
  QUIZ_TIME_STEP: 5,

  QUIZ_DELAY: 3,
  MIN_QUIZ_DELAY: 1,
  MAX_QUIZ_DELAY: 10,

  AUTO_PLAY: true,
  AUTO_PLAY_FULL: true,

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

  // Regular mode gap events
  REGULAR_GAP_STARTED: 'regular:gap:started',
  REGULAR_GAP_TICK: 'regular:gap:tick',
  REGULAR_GAP_ENDED: 'regular:gap:ended',

  // Network events
  NETWORK_ONLINE: 'network:online',
  NETWORK_OFFLINE: 'network:offline',

  // Storage / playlist events
  PLAYLIST_SAVED: 'playlist:saved',
  PLAYLIST_DELETED: 'playlist:deleted',
  HISTORY_CLEARED: 'history:cleared',
  HISTORY_UPDATED: 'history:updated',       // ✅ NEW: replaces fragile setTimeout in playlists-bar

  // Audio navigation events (replaces string literals)
  AUDIO_NEXT_REQUESTED: 'audio:next-requested',
  AUDIO_PREVIOUS_REQUESTED: 'audio:previous-requested',
  PLAYBACK_SKIP: 'playback:skip',

  // Regular mode internal events (replaces string literals)
  REGULAR_MODE_INITIALIZED: 'regular-mode:initialized',
  REGULAR_MODE_CLEANUP: 'regular-mode:cleanup',
  REGULAR_MODE_SPEED_CHANGED: 'regular-mode:speed-changed',
  REGULAR_MODE_GAP_CHANGED: 'regular-mode:gap-changed',
  REGULAR_MODE_REPEAT_CHANGED: 'regular-mode:repeat-changed',
  REGULAR_MODE_SHUFFLE_CHANGED: 'regular-mode:shuffle-changed',
  REGULAR_MODE_REPEAT_PLAYLIST_CHANGED: 'regular-mode:repeat-playlist-changed',
  REGULAR_MODE_SETTINGS_CHANGED: 'regular-mode:settings-changed',
  REGULAR_MODE_RESET: 'regular-mode:reset',

  // Quiz mode internal events (replaces string literals)
  QUIZ_MODE_INITIALIZED: 'quiz-mode:initialized',
  QUIZ_MODE_CLEANUP: 'quiz-mode:cleanup',
  QUIZ_MODE_TRACK_STARTED: 'quiz-mode:track-started',
  QUIZ_MODE_PAUSED: 'quiz-mode:paused-for-recitation',
  QUIZ_MODE_PLAYING_FULL: 'quiz-mode:playing-full',
  QUIZ_MODE_TIME_CHANGED: 'quiz-mode:time-changed',
  QUIZ_MODE_DELAY_CHANGED: 'quiz-mode:delay-changed',
  QUIZ_MODE_AUTOPLAY_CHANGED: 'quiz-mode:autoplay-changed',
  QUIZ_MODE_AUTOPLAYFULL_CHANGED: 'quiz-mode:autoplayfull-changed',

  // Memory mode internal events (replaces string literals)
  MEMORY_MODE_CLEANUP: 'memory-mode:cleanup',
  MEMORY_PROGRESS: 'memory:progress',

  // Search events (replaces string literals)
  SEARCH_CLEARED: 'search:cleared'
};
export const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning'
};
