// player.js

import { CONFIG, AppState, setCurrentIndex, resetRepeatCounter, incrementRepeatCounter, setCurrentSpeed, setQuizMode, stopAllTimers } from './state.js';
import { toggleClass, showToast, showModal } from './ui-helpers.js';

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- NEW HELPER FUNCTION FOR ZERO-PADDING ---

/**
 * Formats a shloka number to a three-digit string (e.g., 1 -> '001', 15 -> '015').
 * This is crucial for matching the audio file names in the archive.
 * @param {number} num The shloka number.
 * @returns {string} The zero-padded shloka number string.
 */
function formatShlokaNum(num) {
  return String(num).padStart(3, '0');
}

// --- Core Playback Functions ---

/**
 * Loads and plays the track at AppState.currentIndex from the current playlist.
 */
export function playCurrent() {
  if (AppState.playlist.length === 0) {
    showToast('Playlist is empty.');
    return;
  }
  
  // CRITICAL FIX: Check if player element exists
  if (!DOM.audioPlayer) {
    showToast('Player element missing from HTML. Cannot play.');
    return;
  }

  // 1. Check for playlist end
  if (AppState.currentIndex >= AppState.playlist.length) {
    // STABILITY CHECK: Ensure repeatPlaylist element is cached
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
        setQuizMode(false); // Exit quiz mode
      }
      return;
    }
  }

  // 2. Play the current track
  const shlokaNum = AppState.playlist[AppState.currentIndex];
  // CRITICAL FIX: Use the zero-padding helper
  const formattedShlokaNum = formatShlokaNum(shlokaNum); 
  const src = `${CONFIG.audioBaseUrl}${formattedShlokaNum}.mp3`;

  DOM.audioPlayer.src = src;
  // Use optional chaining for playbackRate to prevent errors if property is missing
  DOM.audioPlayer.playbackRate = AppState.currentSpeed;
  DOM.audioPlayer.play().catch(e => {
    console.error('Playback failed (possible autoplay block):', e);
    showToast('Playback requires user interaction or was blocked.');
  });
  
  resetRepeatCounter(); 
}

/**
 * Logic to run when the current audio track finishes.
 */
function handleTrackEnded() {
  if (!DOM.audioPlayer) return; // Robustness check

  // 1. Handle repeat single track logic
  if (DOM.repeatTrack && DOM.repeatTrack.checked) {
    DOM.audioPlayer.currentTime = 0;
    DOM.audioPlayer.play();
    return;
  } 
  
  // 2. Handle repeat N times logic
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
 * Toggles playback speed through common values.
 */
function toggleSpeed() {
  let newSpeed;
  switch (AppState.currentSpeed) {
    case 1.0:
      newSpeed = 1.25;
      break;
    case 1.25:
      newSpeed = 1.5;
      break;
    case 1.5:
      newSpeed = 2.0;
      break;
    default:
      newSpeed = 1.0;
      break;
  }

  setCurrentSpeed(newSpeed);
  if (DOM.audioPlayer) { // Robustness check
    DOM.audioPlayer.playbackRate = newSpeed;
  }
  
  if (DOM.speedBtn) { // Robustness check
    DOM.speedBtn.textContent = `${newSpeed.toFixed(2)}x`;
  }
  showToast(`Speed set to ${newSpeed.toFixed(2)}x`);
}


// --- Event Listener Setup ---

/**
 * Sets up all listeners specific to the <audio> element and player controls.
 * CRITICAL FIX: Added checks to prevent 'addEventListener' on undefined elements.
 */
export function setupPlayerEventListeners() {
  if (!DOM.audioPlayer) {
    console.warn("Audio Player element (id='audio-player') not found. Skipping player event setup.");
    return; 
  }

  // Audio Player Listeners
  DOM.audioPlayer.addEventListener('ended', handleTrackEnded);
  
  DOM.audioPlayer.addEventListener('play', () => {
    if (DOM.playIcon) toggleClass(DOM.playIcon, 'fa-play', false);
    if (DOM.playIcon) toggleClass(DOM.playIcon, 'fa-pause', true);
    if (DOM.playSelectedBtn) DOM.playSelectedBtn.setAttribute('title', 'Pause Playback');
  });

  DOM.audioPlayer.addEventListener('pause', () => {
    if (DOM.playIcon) toggleClass(DOM.playIcon, 'fa-pause', false);
    if (DOM.playIcon) toggleClass(DOM.playIcon, 'fa-play', true);
    if (DOM.playSelectedBtn) DOM.playSelectedBtn.setAttribute('title', 'Play Selected');
  });

  DOM.audioPlayer.addEventListener('error', (e) => {
    console.error("Audio playback error:", DOM.audioPlayer.error, e);
    showToast(`Error playing shloka ${AppState.playlist[AppState.currentIndex]}. Skipping to next.`);
    
    setCurrentIndex(AppState.currentIndex + 1);
    playCurrent();
  });

  // Control Listeners (now safely guarded)
  if (DOM.speedBtn) {
    DOM.speedBtn.addEventListener('click', toggleSpeed);
  } else {
    console.warn("Speed button (id='speed-btn') not found. Speed toggle disabled.");
  }
}
