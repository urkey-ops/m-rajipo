// app.js

import { AppState, setRepeatEach } from './state.js';
import { toggleClass } from './ui-helpers.js';
import { setupPlayerEventListeners, playCurrent } from './player.js';
import { 
  handleTrackSelection, 
  updateGroupButtonSelection, 
  updatePlayerDisplay, 
  renderRecentSelections,
  initializeLocalStorage,
  playSelected,
  toggleAppMode,
  confirmClearSelection,
  confirmClearHistory,
  updateSavePlaylistButtonVisibility,
  // NOTE: savePlaylist is placeholder for future feature
} from './selection.js'; 


// --- 1. DOM CACHE ---
// The global window.DOM object is used here to make it accessible to other modules
// (like player.js and selection.js) without passing it as an argument everywhere.
window.DOM = {};

function cacheDOM() {
  window.DOM.audioPlayer = document.getElementById('audio-player');
  window.DOM.toast = document.getElementById('toast-notification');
  window.DOM.modalContainer = document.getElementById('modal-container');
  window.DOM.trackList = document.getElementById('track-list');
  window.DOM.groups = document.getElementById('groups-container');
  
  // Controls & Buttons
  window.DOM.playSelectedBtn = document.getElementById('play-selected-btn');
  window.DOM.playIcon = document.getElementById('play-icon');
  window.DOM.clearSelectionBtn = document.getElementById('clear-selection-btn');
  window.DOM.clearHistoryBtn = document.getElementById('clear-history-btn');
  window.DOM.toggleModeBtn = document.getElementById('toggle-mode-btn');
  window.DOM.savePlaylistBtn = document.getElementById('save-playlist-btn');
  window.DOM.speedBtn = document.getElementById('speed-btn');
  
  // Displays
  window.DOM.currentTrackDisplay = document.getElementById('current-track-display');
  window.DOM.totalTracksDisplay = document.getElementById('total-tracks-display');
  window.DOM.modeDisplay = document.getElementById('mode-display');
  
  // Containers
  window.DOM.quizControls = document.getElementById('quiz-controls');
  window.DOM.regularControls = document.getElementById('regular-controls');
  window.DOM.playbackControls = document.getElementById('playback-controls');
  window.DOM.recentSelections = document.getElementById('recent-selections-list');
  
  // Checkboxes & Inputs
  window.DOM.repeatTrack = document.getElementById('repeat-track-checkbox');
  window.DOM.repeatPlaylist = document.getElementById('repeat-playlist-checkbox');
  window.DOM.repeatEach = document.getElementById('repeat-each-checkbox');
  window.DOM.repeatEachInput = document.getElementById('repeat-each-input');
  window.DOM.shuffleCheckbox = document.getElementById('shuffle-checkbox');

  // Search/Range
  window.DOM.search = document.getElementById('search-input');
  window.DOM.clearSearch = document.getElementById('clear-search-btn');
  window.DOM.rangeStart = document.getElementById('range-start');
  window.DOM.rangeEnd = document.getElementById('range-end');
  window.DOM.selectRangeBtn = document.getElementById('select-range-btn');
  
  // Dynamic UI Elements (e.g., in v2.js)
  window.DOM.toggleGroupsBtn = document.getElementById('toggle-groups-btn');
  window.DOM.groupToggleIcon = document.getElementById('group-toggle-icon');
  
  // NOTE: Add specific elements for personal playlists as needed
}


// --- 2. EVENT LISTENERS ---

function setupEventListeners() {
  // Main Action Buttons
  window.DOM.playSelectedBtn.addEventListener('click', playSelected);
  window.DOM.toggleModeBtn.addEventListener('click', toggleAppMode);
  window.DOM.clearSelectionBtn.addEventListener('click', confirmClearSelection);
  window.DOM.clearHistoryBtn.addEventListener('click', confirmClearHistory);
  // window.DOM.savePlaylistBtn.addEventListener('click', savePlaylist); // Feature placeholder

  // Delegation for Track/Playlist/Recent selection changes
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('trackBox') || 
        e.target.classList.contains('playlist-box') || 
        e.target.classList.contains('recent-box')) {
      handleTrackSelection(e.target);
    }
  });

  // Repeat/Shuffle Inputs
  window.DOM.repeatEach.addEventListener('change', (e) => {
    // Only one 'repeat' mode can be active
    if (e.target.checked) {
      window.DOM.repeatTrack.checked = false;
      window.DOM.repeatPlaylist.checked = false;
    }
  });

  window.DOM.repeatTrack.addEventListener('change', (e) => {
    if (e.target.checked) {
      window.DOM.repeatEach.checked = false;
      window.DOM.repeatPlaylist.checked = false;
    }
  });

  window.DOM.repeatPlaylist.addEventListener('change', (e) => {
    if (e.target.checked) {
      window.DOM.repeatTrack.checked = false;
      window.DOM.repeatEach.checked = false;
    }
  });

  // Repeat N Input validation (already handled in player.js setup, but initialize here)
  setRepeatEach(parseInt(window.DOM.repeatEachInput.value, 10) || 1);


  // Group Buttons Delegation
  window.DOM.groups.addEventListener('click', (e) => {
    const btn = e.target.closest('.group-btn');
    if (btn) {
      const start = parseInt(btn.dataset.start, 10);
      const end = parseInt(btn.dataset.end, 10);
      const isSelected = btn.classList.contains('group-selected');
      
      // Toggle all checkboxes in the range
      for (let i = start; i <= end; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox) {
          checkbox.checked = !isSelected;
          // Trigger the handleTrackSelection logic to enforce mutual exclusion
          checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
        }
      }
      updateGroupButtonSelection();
      updateSavePlaylistButtonVisibility();
    }
  });
  
  // Range Selection Button
  window.DOM.selectRangeBtn.addEventListener('click', () => {
    const start = parseInt(window.DOM.rangeStart.value, 10);
    const end = parseInt(window.DOM.rangeEnd.value, 10);
    
    if (start && end && start <= end && start >= 1 && end <= 315) {
      for (let i = 1; i <= 315; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox) {
          const shouldBeChecked = i >= start && i <= end;
          if (checkbox.checked !== shouldBeChecked) {
            checkbox.checked = shouldBeChecked;
            // Trigger logic for mutual exclusion
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
      // Clear range inputs after selection
      window.DOM.rangeStart.value = '';
      window.DOM.rangeEnd.value = '';
      updateGroupButtonSelection();
    } else {
      // Clear inputs and show error if range is invalid
      window.DOM.rangeStart.value = '';
      window.DOM.rangeEnd.value = '';
      alert('Invalid range. Please enter numbers between 1 and 315, with Start <= End.');
    }
  });

  // Search/Filter logic would be implemented here, affecting trackList display
  // ...
}


// --- 3. INIT FUNCTION ---

function init() {
  cacheDOM();
  
  // Check that core DOM elements exist before proceeding
  if (!window.DOM.audioPlayer || !window.DOM.trackList) {
    console.error('Core DOM elements missing. Cannot initialize application.');
    return;
  }
  
  // Initialize internal states and persistence
  initializeLocalStorage(); // From selection.js
  renderRecentSelections(); // From selection.js

  // Set up all listeners
  setupEventListeners(); // Current module listeners
  setupPlayerEventListeners(); // From player.js listeners
  
  // Initial UI updates
  updatePlayerDisplay(); // From selection.js
  updateGroupButtonSelection(); // From selection.js
  updateSavePlaylistButtonVisibility(); // From selection.js
  
  // Set initial speed display
  window.DOM.speedBtn.textContent = `${AppState.currentSpeed.toFixed(2)}x`;
  
  // Load and check last selection (requires generating track list first, often done server-side or in a separate rendering module)
  // For now, we assume a track list exists and manually check the UI state.
}


// --- 4. KICK OFF THE APP ---
document.addEventListener('DOMContentLoaded', init);


// --- 5. GLOBAL EXPOSURE (FOR HTML CALLS) ---
// If the HTML needs to call specific JS functions (e.g., from an inline onclick attribute), 
// we expose them on the window object. This is less common in pure modules 
// but necessary if existing HTML relies on global functions.

// window.loadPlaylistGlobal = loadPlaylistFromID; // Placeholder for future feature
// window.confirmDeletePlaylistGlobal = confirmDeletePlaylist; // Placeholder for future feature
