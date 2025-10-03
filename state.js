// state.js

/**
 * 1. CONFIG: Immutable Application Settings
 * NOTE: Using Object.freeze for immutability.
 * @type {Readonly<object>}
 */
export const CONFIG = Object.freeze({
  audioBaseUrl: 'https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_',
  totalTracks: 315,
  maxRecentSelections: 5,
  toastDuration: 4000,
  quizAutoPlayDelay: 1500,
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
};

/**
 * 3. State Setter Functions (Encapsulated Mutation)
 * These are the ONLY ways other modules should change AppState.
 */

export function setCurrentIndex(newIndex) {
  AppState.currentIndex = newIndex;
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

export function setRepeatEach(count) {
  AppState.repeatEach = count;
}

export function setCurrentSpeed(speed) {
  AppState.currentSpeed = speed;
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

export function setLocalStorageEnabled(enabled) {
  AppState.localStorageEnabled = enabled;
}

export function setPersonalPlaylists(playlists) {
  AppState.personalPlaylists = playlists;
}

export function setAutoPlayTimeout(timeoutId) {
  // Clear previous timeout to prevent unexpected side effects
  if (AppState.autoPlayTimeout) {
    clearTimeout(AppState.autoPlayTimeout);
  }
  AppState.autoPlayTimeout = timeoutId;
}

export function setCountdownInterval(intervalId) {
  // Clear previous interval
  if (AppState.countdownInterval) {
    clearInterval(AppState.countdownInterval);
  }
  AppState.countdownInterval = intervalId;
}

// Helper to safely stop all quiz-related timers
export function stopAllTimers() {
  setAutoPlayTimeout(null);
  setCountdownInterval(null);
}
