// player.js

import { CONFIG, AppState, setCurrentIndex, resetRepeatCounter, incrementRepeatCounter, setCurrentSpeed, setQuizMode, stopAllTimers } from './state.js';
import { toggleClass, showToast, showModal } from './ui-helpers.js';

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- Core Playback Functions ---

/**
 * Loads and plays the track at AppState.currentIndex from the current playlist.
 */
export function playCurrent() {
  if (AppState.playlist.length === 0) {
    showToast('Playlist is empty.');
    return;
  }

  // 1. Check for playlist end
  if (AppState.currentIndex >= AppState.playlist.length) {
    // *** STABILITY FIX: Add null check for DOM.repeatPlaylist ***
    if (DOM.repeatPlaylist && DOM.repeatPlaylist.checked) { 
      setCurrentIndex(0);
      playCurrent(); // Recurse to play the first track
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
  const src = `${CONFIG.audioBaseUrl}${shlokaNum}.mp3`;

  DOM.audioPlayer.src = src;
  DOM.audioPlayer.playbackRate = AppState.currentSpeed;
  DOM.audioPlayer.play().catch(e => {
    // Autoplay blocked handling
    console.error('Playback failed (possible autoplay block):', e);
    showToast('Playback requires user interaction or was blocked.');
  });
  
  resetRepeatCounter(); // Reset counter for the new track
  // Note: UI updates for current track (highlighting, display) would happen here
}

/**
 * Logic to run when the current audio track finishes.
 */
function handleTrackEnded() {
  // 1. Handle repeat single track logic
  // *** STABILITY FIX: Add null check for DOM.repeatTrack ***
  if (DOM.repeatTrack && DOM.repeatTrack.checked) {
    DOM.audioPlayer.currentTime = 0;
    DOM.audioPlayer.play();
    return;
  } 
  
  // 2. Handle repeat N times logic
  // *** STABILITY FIX: Add null check for DOM.repeatEach ***
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
    // Logic for quiz mode
    DOM.audioPlayer.pause();
    stopAllTimers(); 
    showToast('Time for the next question!'); // Placeholder
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
  DOM.audioPlayer.playbackRate = newSpeed;
  DOM.speedBtn.textContent = `${newSpeed.toFixed(2)}x`;
  showToast(`Speed set to ${newSpeed.toFixed(2)}x`);
}


// --- Event Listener Setup ---

/**
 * Sets up all listeners specific to the <audio> element and player controls.
 */
export function setupPlayerEventListeners() {
  // Event: When current track finishes
  DOM.audioPlayer.addEventListener('ended', handleTrackEnded);
  
  // Event: Update the play/pause button icon
  DOM.audioPlayer.addEventListener('play', () => {
    toggleClass(DOM.playIcon, 'fa-play', false);
    toggleClass(DOM.playIcon, 'fa-pause', true);
    DOM.playSelectedBtn.setAttribute('title', 'Pause Playback');
  });

  DOM.audioPlayer.addEventListener('pause', () => {
    toggleClass(DOM.playIcon, 'fa-pause', false);
    toggleClass(DOM.playIcon, 'fa-play', true);
    DOM.playSelectedBtn.setAttribute('title', 'Play Selected');
  });

  // Event: Error handling
  DOM.audioPlayer.addEventListener('error', (e) => {
    console.error("Audio playback error:", DOM.audioPlayer.error, e);
    showToast(`Error playing shloka ${AppState.playlist[AppState.currentIndex]}. Skipping to next.`);
    
    // Attempt to skip to the next track on error
    setCurrentIndex(AppState.currentIndex + 1);
    playCurrent();
  });

  // Event: Speed button click
  DOM.speedBtn.addEventListener('click', toggleSpeed);
}
