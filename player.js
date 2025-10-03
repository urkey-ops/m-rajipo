// player.js (Patched)

import { 
  CONFIG, AppState, setCurrentIndex, resetRepeatCounter, incrementRepeatCounter, 
  setCurrentSpeed, setQuizMode, stopAllTimers, incrementErrorCount 
} from './state.js';
import { toggleClass, showToast } from './ui-helpers.js';

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- Helper Functions ---

/**
 * Formats a shloka number to a three-digit string.
 * @param {number} num The shloka number.
 * @returns {string} The zero-padded shloka number string.
 */
function formatShlokaNum(num) {
  return String(num).padStart(3, '0');
}

/**
 * A helper to toggle the play/pause icon on the control button.
 * @param {boolean} isPlaying True to show pause icon, false to show play icon.
 */
function togglePlayIcon(isPlaying) {
  if (!DOM.playIcon || !DOM.playSelectedBtn) return;
  
  if (isPlaying) {
    toggleClass(DOM.playIcon, 'fa-play', false);
    toggleClass(DOM.playIcon, 'fa-pause', true);
    DOM.playSelectedBtn.setAttribute('title', 'Pause Playback');
  } else {
    toggleClass(DOM.playIcon, 'fa-pause', false);
    toggleClass(DOM.playIcon, 'fa-play', true);
    DOM.playSelectedBtn.setAttribute('title', 'Play Selected');
  }
}

// --- Core Playback Functions ---

/**
 * Loads and plays the track at AppState.currentIndex from the current playlist.
 */
export function playCurrent() {
  // CRITICAL FIX: Check if player element exists and playlist is not empty
  if (!DOM.audioPlayer) {
    console.error("CRITICAL: Player element missing. Cannot play.");
    showToast('Player element missing from HTML. Cannot play.');
    return;
  }
  if (AppState.playlist.length === 0) {
    showToast('Playlist is empty.');
    return;
  }
  
  // 1. Check for playlist end
  if (AppState.currentIndex >= AppState.playlist.length) {
    // Robustness check for DOM element
    if (DOM.repeatPlaylist && DOM.repeatPlaylist.checked) { 
      setCurrentIndex(0);
      playCurrent(); 
      return;
    } else {
      // Playlist finished
      DOM.audioPlayer.pause();
      DOM.audioPlayer.src = '';
      showToast('Playlist finished.');
      if (AppState.isQuizMode) {
        setQuizMode(false); 
      }
      return;
    }
  }

  // 2. Play the current track
  const shlokaNum = AppState.playlist[AppState.currentIndex];
  const formattedShlokaNum = formatShlokaNum(shlokaNum); 
  const src = `${CONFIG.audioBaseUrl}${formattedShlokaNum}.mp3`;

  DOM.audioPlayer.src = src;
  DOM.audioPlayer.playbackRate = AppState.currentSpeed;
  
  // Use try/catch to handle potential browser autoplay blocks
  DOM.audioPlayer.play().catch(e => {
    console.error('Playback failed (possible autoplay block or invalid file):', e);
    showToast('Playback failed. Please interact with the page or check the file source.');
  });
  
  resetRepeatCounter(); 
}

/**
 * Logic to run when the current audio track finishes.
 */
function handleTrackEnded() {
  if (!DOM.audioPlayer) return; 

  // CRITICAL FIX: Ensure playlist is valid before continuing
  if (AppState.playlist.length === 0) return;

  // 1. Handle repeat single track logic
  if (DOM.repeatTrack && DOM.repeatTrack.checked) {
    DOM.audioPlayer.currentTime = 0;
    DOM.audioPlayer.play();
    return;
  } 
  
  // 2. Handle repeat N times logic (using DOM.repeatEach which is the checkbox)
  if (DOM.repeatEach && DOM.repeatEach.checked) {
    incrementRepeatCounter();
    if (AppState.repeatCounter < AppState.repeatEach) {
      DOM.audioPlayer.currentTime = 0;
      DOM.audioPlayer.play();
      return;
    }
  }
  
  // 3. Move to the next track
  setCurrentIndex(AppState.currentIndex + 1);

  // 4. Handle Quiz Mode vs. Standard Playback
  if (AppState.isQuizMode) {
    DOM.audioPlayer.pause();
    stopAllTimers(); 
    showToast('Time for the next question!');
  } else {
    // Standard auto-advance
    playCurrent();
  }
}

/**
 * Toggles playback speed through common values defined in CONFIG.
 */
function toggleSpeed() {
  const speeds = CONFIG.speeds;
  const currentIndex = speeds.indexOf(AppState.currentSpeed);
  // Cycle to the next speed, wrapping around if at the end
  const nextIndex = (currentIndex + 1) % speeds.length; 
  const newSpeed = speeds[nextIndex];

  setCurrentSpeed(newSpeed); // Updates AppState and runs validation
  
  if (DOM.audioPlayer) {
    DOM.audioPlayer.playbackRate = newSpeed;
  }
  
  if (DOM.speedBtn) {
    DOM.speedBtn.textContent = `${newSpeed.toFixed(2)}x`;
  }
  showToast(`Speed set to ${newSpeed.toFixed(2)}x`);
}


// --- Event Listener Setup ---

/**
 * Sets up all listeners specific to the <audio> element and player controls.
 */
export function setupPlayerEventListeners() {
  if (!DOM.audioPlayer) {
    console.warn("Audio Player element (id='audio-player') not found. Skipping player event setup.");
    return; 
  }

  // Audio Player Listeners
  DOM.audioPlayer.addEventListener('ended', handleTrackEnded);
  
  // Refactored to use helper
  DOM.audioPlayer.addEventListener('play', () => togglePlayIcon(true));
  DOM.audioPlayer.addEventListener('pause', () => togglePlayIcon(false));

  // CRITICAL FIX: Infinite loop prevention logic
  DOM.audioPlayer.addEventListener('error', (e) => {
    console.error("Audio playback error:", DOM.audioPlayer.error, e);
    
    incrementErrorCount();

    if (AppState.errorCount >= AppState.maxErrorSkip) {
      console.error(`Max errors (${AppState.maxErrorSkip}) reached. Stopping playback.`);
      DOM.audioPlayer.pause();
      showToast('Too many tracks failed to load. Playback stopped.');
      setCurrentIndex(AppState.playlist.length); // Force end of playlist logic
      return;
    }

    showToast(`Error playing shloka ${AppState.playlist[AppState.currentIndex]}. Skipping to next.`);
    
    // Attempt to skip to the next track on error
    setCurrentIndex(AppState.currentIndex + 1);
    playCurrent();
  });

  // Control Listeners (safely guarded)
  if (DOM.speedBtn) {
    DOM.speedBtn.addEventListener('click', toggleSpeed);
  }
}
