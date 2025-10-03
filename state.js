// state.js (Patched)

/**
 * 1. CONFIG: Immutable Application Settings
 * NOTE: Using Object.freeze for immutability and constants for magic numbers.
 * @type {Readonly<object>}
 */
export const CONFIG = Object.freeze({
  audioBaseUrl: 'https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_',
  totalTracks: 315,
  maxRecentSelections: 5,
  toastDuration: 4000,
  quizAutoPlayDelay: 1500,
  // New: Defined speeds for player.js
  speeds: [1.0, 1.25, 1.5, 2.0], 
});

/**
 * 2. AppState: Mutable Runtime State
 * NOTE: This is the single source of truth for all application status.
 * @type {object}
 */
export const AppState = {
  playlist: [],
  currentIndex: 0,
  repeatEach: 1,
  repeatCounter: 0,
  currentSpeed: 1.0,
  isQuizMode: false,
  hasQuizPaused: false,
  autoPlay: false,
  autoPlayTimeout: null,
  countdownInterval: null,
  currentQuizTime: 20,
  currentQuizDelay: 3,
  localStorageEnabled: false,
  personalPlaylists: {},
  // New: Added to prevent infinite error loops in player.js
  errorCount: 0, 
  maxErrorSkip: 3,
};

// --- State Setter Functions (Encapsulated Mutation with Validation) ---

export function setCurrentIndex(newIndex) {
  AppState.currentIndex = newIndex;
  // Reset error count on successful index change
  if (newIndex < AppState.playlist.length) {
    AppState.errorCount = 0;
  }
}

export function setPlaylist(newPlaylist) {
  AppState.playlist = newPlaylist;
}

export function incrementRepeatCounter() {
  AppState.repeatCounter += 1;
}

export function resetRepeatCounter() {
  AppState.repeatCounter = 0;
}

/**
 * Sets repeat count with validation.
 */
export function setRepeatEach(count) {
  const num = parseInt(count, 10);
  if (num > 0 && num <= 100) {
    AppState.repeatEach = num;
  } else {
    console.warn(`Attempted to set invalid repeat count: ${count}`);
  }
}

/**
 * Sets playback speed with validation against CONFIG.speeds.
 */
export function setCurrentSpeed(speed) {
  if (CONFIG.speeds.includes(speed)) {
    AppState.currentSpeed = speed;
  } else {
    console.warn(`Attempted to set invalid speed: ${speed}`);
  }
}

export function setQuizMode(mode) {
  AppState.isQuizMode = mode;
}

export function setQuizPaused(paused) {
  AppState.hasQuizPaused = paused;
}

export function setAutoPlay(mode) {
  AppState.autoPlay = mode;
}

// CRITICAL FIX: Use explicit null check to correctly clear ID 0.
export function setAutoPlayTimeout(timeoutId) {
  if (AppState.autoPlayTimeout != null) {
    clearTimeout(AppState.autoPlayTimeout);
  }
  AppState.autoPlayTimeout = timeoutId;
}

// CRITICAL FIX: Use explicit null check to correctly clear ID 0.
export function setCountdownInterval(intervalId) {
  if (AppState.countdownInterval != null) {
    clearInterval(AppState.countdownInterval);
  }
  AppState.countdownInterval = intervalId;
}

// Helper to safely stop all quiz-related timers
export function stopAllTimers() {
  setAutoPlayTimeout(null);
  setCountdownInterval(null);
}

export function setLocalStorageEnabled(enabled) {
  AppState.localStorageEnabled = enabled;
}

export function setPersonalPlaylists(playlists) {
  AppState.personalPlaylists = playlists;
}

// New helper for error tracking
export function incrementErrorCount() {
    AppState.errorCount += 1;
}
