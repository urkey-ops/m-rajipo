// app.js

import { AppState, setRepeatEach } from './state.js';
import { setupPlayerEventListeners } from './player.js';
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
  toggleGroupSelection, // <-- NEW IMPORT
} from './selection.js'; 
import { toggleClass } from './ui-helpers.js';
// Assuming UI generation helpers (like renderGroupButtons, generateTrackList) are now in selection.js
import { renderGroupButtons, generateTrackList } from './selection.js'; 


// --- 1. DOM CACHE ---
// Expose DOM object globally for use by other modules (e.g., player.js, ui-helpers.js)
window.DOM = {};

/**
 * Caches all necessary DOM elements for global access.
 * FIX: Updated playback control IDs to match index.html's camelCase IDs.
 */
function cacheDOM() {
  // Main Player & Lists
  window.DOM.audioPlayer = document.getElementById('audio-player');
  window.DOM.trackList = document.getElementById('track-list');
  window.DOM.groups = document.getElementById('groups');
  window.DOM.modalContainer = document.getElementById('modal-container');
  window.DOM.toast = document.getElementById('toast-notification');
  
  // Search & Range
  window.DOM.search = document.getElementById('search-input');
  window.DOM.clearSearch = document.getElementById('clear-search-btn');
  window.DOM.searchFeedback = document.getElementById('search-feedback');
  window.DOM.rangeStart = document.getElementById('range-start');
  window.DOM.rangeEnd = document.getElementById('range-end');
  window.DOM.selectRangeBtn = document.getElementById('select-range-btn');
  
  // Controls & Playback Settings
  window.DOM.playSelectedBtn = document.getElementById('play-selected-btn');
  window.DOM.playIcon = document.getElementById('play-icon');
  
  // *** CRITICAL FIX: Update IDs to match 'index.html' camelCase ***
  window.DOM.repeatTrack = document.getElementById('repeatTrackCheckbox');
  window.DOM.repeatPlaylist = document.getElementById('repeatPlaylistCheckbox');
  window.DOM.repeatEach = document.getElementById('repeatEachCheckbox');
  
  window.DOM.repeatEachInput = document.getElementById('repeat-each-input');
  window.DOM.speedBtn = document.getElementById('speed-btn');

  // Quiz Mode
  window.DOM.quizToggle = document.getElementById('quiz-toggle');
  window.DOM.quizDisplay = document.getElementById('quiz-display');
  window.DOM.quizProgress = document.getElementById('quiz-progress-bar');
  window.DOM.quizProgressText = document.getElementById('quiz-progress-text');
  window.DOM.quizPauseBtn = document.getElementById('quiz-pause-btn');

  // Playlist Management
  window.DOM.savePlaylistBtn = document.getElementById('save-playlist-btn');
  window.DOM.playlistList = document.getElementById('playlist-list');
  window.DOM.recentSelectionsList = document.getElementById('recent-selections-list');
  window.DOM.clearHistoryBtn = document.getElementById('clear-history-btn');
}


// --- 2. DYNAMIC UI GENERATION ---
// Helper to generate dynamic content after DOM cache
function generateTrackListAndGroups() {
  if (window.DOM.groups) {
    // Renders group buttons based on CONFIG.totalTracks
    renderGroupButtons(window.DOM.groups); 
  }
  if (window.DOM.trackList) {
    // Generates the list of shloka checkboxes
    generateTrackList(window.DOM.trackList);
  }
}


// --- 3. EVENT LISTENERS ---

function setupEventListeners() {
  // Global listener for track/playlist/recent selection
  document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && (e.target.classList.contains('trackBox') || e.target.classList.contains('playlist-box') || e.target.classList.contains('recent-box'))) {
      handleTrackSelection(e.target);
    }
  });

  // Listener for play button
  window.DOM.playSelectedBtn?.addEventListener('click', playSelected);
  
  // Listener for search input (with debounce not implemented here)
  window.DOM.search?.addEventListener('input', () => {
    // Search/filter logic would be called here
    if (!window.DOM.search.value) {
      window.DOM.searchFeedback.textContent = '';
    }
  });

  // Listener for clearing search
  window.DOM.clearSearch?.addEventListener('click', () => {
    window.DOM.search.value = '';
    // Call search/filter logic here to reset the view
    window.DOM.searchFeedback.textContent = '';
  });

  // Listener for group selection buttons (delegation)
  window.DOM.groups?.addEventListener('click', (e) => {
    const target = e.target.closest('.group-btn');
    if (target && target.dataset.group) {
      // *** FIX: Call the newly implemented group selection function ***
      toggleGroupSelection(target.dataset.group);
      updateGroupButtonSelection(); 
    }
  });
  
  // Listener for selecting range
  window.DOM.selectRangeBtn?.addEventListener('click', () => {
    const start = parseInt(window.DOM.rangeStart.value, 10);
    const end = parseInt(window.DOM.rangeEnd.value, 10);
    
    // NOTE: Hardcoded 315 limit assumes CONFIG.totalTracks is 315.
    const isValid = !isNaN(start) && !isNaN(end) && start > 0 && end <= 315 && start <= end;

    if (isValid) {
      confirmClearSelection(); 

      for (let i = start; i <= end; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox) {
          const shouldBeChecked = i >= start && i <= end;
          if (checkbox.checked !== shouldBeChecked) {
            checkbox.checked = shouldBeChecked;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
      window.DOM.rangeStart.value = '';
      window.DOM.rangeEnd.value = '';
      updateGroupButtonSelection();
    } else {
      alert('Invalid range. Please enter numbers between 1 and 315, with Start <= End.');
    }
  });

  // Quiz mode toggle
  window.DOM.quizToggle?.addEventListener('click', toggleAppMode);

  // Clear history button
  window.DOM.clearHistoryBtn?.addEventListener('click', confirmClearHistory);
  
  // Repeat Each input change
  window.DOM.repeatEachInput?.addEventListener('change', (e) => {
    const count = parseInt(e.target.value, 10);
    if (count > 0 && count <= 100) {
      setRepeatEach(count);
    } else {
      alert('Repeat count must be between 1 and 100.');
      e.target.value = AppState.repeatEach; // Revert to current state
    }
  });
}


// --- 4. INIT FUNCTION ---

function init() {
  cacheDOM();
  
  // Safety check for core elements
  if (!window.DOM.audioPlayer || !window.DOM.trackList) {
    console.error('Core DOM elements missing. Cannot initialize application.');
    return;
  }
  
  // Initialize internal states and persistence
  initializeLocalStorage(); 
  
  // *** FIX: Generate UI here so elements exist before listeners are set up ***
  generateTrackListAndGroups(); 
  
  renderRecentSelections(); 

  // Set up all listeners
  setupEventListeners(); 
  setupPlayerEventListeners(); 
  
  // Initial UI updates
  updatePlayerDisplay(); 
  updateGroupButtonSelection(); 
  updateSavePlaylistButtonVisibility(); 
  
  // Set initial speed display
  if (window.DOM.speedBtn) {
    window.DOM.speedBtn.textContent = `${AppState.currentSpeed.toFixed(2)}x`;
  }
}


// --- 5. KICK OFF THE APPLICATION ---
window.addEventListener('DOMContentLoaded', init);

// Export utility functions needed by other modules (if any)
export { 
  init, 
  generateTrackListAndGroups 
};
