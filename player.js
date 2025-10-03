// player.js

import { CONFIG, AppState, setCurrentIndex, resetRepeatCounter, incrementRepeatCounter, setRepeatEach, setCurrentSpeed, setQuizMode, stopAllTimers } from './state.js';
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
    if (DOM.repeatPlaylist.checked) {
      setCurrentIndex(0);
      playCurrent(); // Recurse to play the first track
      return;
    } else {
      // Playlist finished
      DOM.audioPlayer.pause();
      DOM.audioPlayer.src = '';
      showToast('Playlist finished.');
      if (AppState.isQuizMode) {
        setQuizMode(false); // Exit quiz mode
        // Note: updateModeDisplay logic is in app.js/selection.js
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
    // Catch the 'NotAllowedError' when autoplay is blocked
    console.error("Autoplay failed:", e);
    showToast(`Autoplay failed for shloka ${shlokaNum}. Please click 'Play'.`);
  });
  
  // Note: updatePlayerDisplay logic is in selection.js
}

/**
 * Handles the logic when a track finishes playing.
 */
function handleTrackEnded() {
  if (DOM.repeatTrack.checked) {
    // 1. Repeat current track
    DOM.audioPlayer.currentTime = 0;
    DOM.audioPlayer.play();
  } else if (DOM.repeatEach.checked) {
    // 2. Repeat current track N times
    incrementRepeatCounter();
    if (AppState.repeatCounter < AppState.repeatEach) {
      DOM.audioPlayer.currentTime = 0;
      DOM.audioPlayer.play();
    } else {
      resetRepeatCounter();
      setCurrentIndex(AppState.currentIndex + 1);
      playCurrent();
    }
  } else if (AppState.isQuizMode) {
    // 3. Quiz Mode Logic: Auto-advance after a delay
    // Note: Quiz logic (countdown, pause) is handled by external calls from the quiz module (selection.js)
    // This is the simplest case: auto-advance to next track
    setCurrentIndex(AppState.currentIndex + 1);
    playCurrent();
  } else {
    // 4. Regular Mode: Advance to next track
    setCurrentIndex(AppState.currentIndex + 1);
    playCurrent();
  }
}

/**
 * Toggles the playback speed (1.0x, 1.25x, 1.5x, 2.0x).
 */
export function toggleSpeed() {
  let newSpeed;
  switch (AppState.currentSpeed) {
    case 1.0: newSpeed = 1.25; break;
    case 1.25: newSpeed = 1.5; break;
    case 1.5: newSpeed = 2.0; break;
    case 2.0: newSpeed = 1.0; break;
    default: newSpeed = 1.0; break;
  }
  setCurrentSpeed(newSpeed);
  DOM.audioPlayer.playbackRate = newSpeed;
  DOM.speedBtn.textContent = `${newSpeed.toFixed(2)}x`;
  showToast(`Playback speed set to ${newSpeed.toFixed(2)}x`);
}


// --- Player Event Listeners Setup ---

/**
 * Sets up all listeners for the core audio player element.
 */
export function setupPlayerEventListeners() {
  // Event: When current track finishes
  DOM.audioPlayer.addEventListener('ended', handleTrackEnded);
  
  // Event: Update the play/pause button icon
  DOM.audioPlayer.addEventListener('play', () => {
    DOM.playIcon.classList.remove('fa-play');
    DOM.playIcon.classList.add('fa-pause');
    DOM.playSelectedBtn.setAttribute('title', 'Pause Playback');
  });

  DOM.audioPlayer.addEventListener('pause', () => {
    DOM.playIcon.classList.remove('fa-pause');
    DOM.playIcon.classList.add('fa-play');
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

  // Event: Repeat N Times setting change (updates AppState)
  DOM.repeatEachInput.addEventListener('change', (e) => {
    const count = parseInt(e.target.value, 10);
    if (count > 0 && count <= 100) {
      setRepeatEach(count);
      showToast(`Repeat each track ${count} times.`);
    } else {
      showToast('Repeat count must be between 1 and 100.');
      e.target.value = AppState.repeatEach; // Revert to current state
    }
  });
}
