// app.js

import { AppState, setRepeatEach, CONFIG } from './state.js';
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
  toggleGroupSelection,
  generateTrackListAndGroups,
  updateQuizModeUI,
  // NEW: Functions to implement the logic extracted from app.js
  handleRangeSelection, // Assumed to handle validation, selection, and UI updates
  handleSearchInput,    // Assumed to handle filtering/feedback logic
  handleClearSearch,    // Assumed to clear selection/filter/feedback
} from './selection.js'; 
import { toggleClass } from './ui-helpers.js';


// --- 1. DOM CACHE ---
/**
 * CRITICAL NOTE: window.DOM is used for cross-module access (e.g., in player.js) 
 * but represents a global scope pollution issue. For full clean-up, other modules 
 * should be refactored to import DOM elements from this module instead of using window.
 */
window.DOM = {};

/**
 * Caches all necessary DOM elements.
 * This is robust against the previous ID mismatch errors.
 */
function cacheDOM() {
  // Main Player & Lists
  window.DOM.audioPlayer = document.getElementById('audio-player');
  window.DOM.trackList = document.getElementById('track-list');
  window.DOM.groups = document.getElementById('groups');
  
  // Modal & Toast
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
  window.DOM.repeatTrack = document.getElementById('repeatTrackCheckbox');
  window.DOM.repeatPlaylist = document.getElementById('repeatPlaylistCheckbox');
  window.DOM.repeatEach = document.getElementById('repeatEachCheckbox');
  window.DOM.repeatEachInput = document.getElementById('repeat-each-input');
  window.DOM.speedBtn = document.getElementById('speed-btn');

  // Quiz Mode
  window.DOM.quizToggle = document.getElementById('quiz-toggle');
  window.DOM.quizDisplay = document.getElementById('quiz-display');
  window.DOM.regularControls = document.getElementById('playbackControls');
  window.DOM.quizPauseBtn = document.getElementById('quiz-pause-btn');
  window.DOM.playNextQuizBtn = document.getElementById('play-next-quiz-btn');
  window.DOM.autoplayToggleBtn = document.getElementById('autoplay-toggle-btn');
  window.DOM.currentShlokQuiz = document.getElementById('current-shlok-quiz');
  window.DOM.quizStatus = document.getElementById('quiz-status'); 
  window.DOM.quizProgress = document.getElementById('quiz-progress-bar');
  window.DOM.quizProgressText = document.getElementById('quiz-progress-text');
  
  // Playlist Management
  window.DOM.savePlaylistBtn = document.getElementById('save-playlist-btn');
  window.DOM.playlistList = document.getElementById('playlist-list');
  window.DOM.recentSelectionsList = document.getElementById('recent-selections-list');
  window.DOM.clearHistoryBtn = document.getElementById('clear-history-btn');
  window.DOM.recentEmpty = document.getElementById('recent-empty');

  // Misc
  window.DOM.clearSelectionBtn = document.getElementById('clear-selection-btn');
  window.DOM.toggleGroupsBtn = document.getElementById('toggle-groups-btn');
  window.DOM.shuffleCheckbox = document.getElementById('shuffle-checkbox');
}


// --- 2. EVENT LISTENERS ---

function setupEventListeners() {
  // Global listener for selection changes (Event Delegation)
  document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && (e.target.classList.contains('trackBox') || e.target.classList.contains('playlist-box') || e.target.classList.contains('recent-box'))) {
      handleTrackSelection(e.target);
    }
  });

  // Listener for play button
  window.DOM.playSelectedBtn?.addEventListener('click', playSelected);
  
  // Listener for group selection buttons
  window.DOM.groups?.addEventListener('click', (e) => {
    const target = e.target.closest('.group-btn');
    if (target && target.dataset.group) {
      toggleGroupSelection(target.dataset.group);
      updateGroupButtonSelection(); 
    }
  });
  
  // CRITIQUE FIX 1: Extracted range selection logic to selection.js
  window.DOM.selectRangeBtn?.addEventListener('click', () => {
    const start = parseInt(window.DOM.rangeStart.value, 10);
    const end = parseInt(window.DOM.rangeEnd.value, 10);
    
    // Call dedicated handler
    handleRangeSelection(start, end);

    // Clear the inputs
    window.DOM.rangeStart.value = '';
    window.DOM.rangeEnd.value = '';
  });

  // Quiz mode toggle
  window.DOM.quizToggle?.addEventListener('click', toggleAppMode);

  // Clear history button
  window.DOM.clearHistoryBtn?.addEventListener('click', confirmClearHistory);
  
  // Repeat Each input change
  window.DOM.repeatEachInput?.addEventListener('change', (e) => {
    const count = parseInt(e.target.value, 10);
    setRepeatEach(count);
  });
  
  // CRITIQUE FIX 2: Extracted search/clear logic to selection.js
  window.DOM.search?.addEventListener('input', (e) => {
    handleSearchInput(e.target.value);
  });

  window.DOM.clearSearch?.addEventListener('click', handleClearSearch);

  // Clear Selection Button
  window.DOM.clearSelectionBtn?.addEventListener('click', confirmClearSelection);

  // Toggle Groups Button
  window.DOM.toggleGroupsBtn?.addEventListener('click', () => {
    if (window.DOM.groups) {
        toggleClass(window.DOM.groups, 'hidden');
        const icon = document.getElementById('group-toggle-icon');
        if (icon) {
            toggleClass(icon, 'fa-chevron-down', window.DOM.groups.classList.contains('hidden'));
            toggleClass(icon, 'fa-chevron-up', !window.DOM.groups.classList.contains('hidden'));
        }
    }
  });
}


// --- 3. INIT FUNCTION ---

/**
 * Initializes the application: DOM caching, state loading, listeners, and UI rendering.
 */
function init() {
  // 1. Cache the DOM
  cacheDOM();

  // 2. CRITICAL UI GENERATION (Fix for missing tracks/groups)
  generateTrackListAndGroups(); 
  
  // 3. Initialize internal states and persistence
  initializeLocalStorage(); 

  // 4. Restore Last Selection (Must run AFTER track boxes are generated in step 2)
  const lastSelectionStr = localStorage.getItem('lastSelection');
  if (lastSelectionStr) {
    try {
      const lastSelection = JSON.parse(lastSelectionStr);
      lastSelection.forEach(trackId => {
        // NOTE: This hardcoded ID pattern is marked for improvement in the critique.
        const checkbox = document.getElementById(`track-box-${trackId}`); 
        if (checkbox) {
          checkbox.checked = true;
          // Dispatch 'change' event to trigger selection.js logic
          checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
        }
      });
    } catch(e) {
      console.error("Failed to parse last selection from storage:", e);
      localStorage.removeItem('lastSelection'); 
    }
  }

  // 5. Render Recents
  renderRecentSelections(); 

  // 6. Set up all listeners
  setupEventListeners(); 
  setupPlayerEventListeners(); 

  // 7. Initial UI updates
  updateQuizModeUI(); 
  updatePlayerDisplay(); 
  updateGroupButtonSelection(); 
  updateSavePlaylistButtonVisibility(); 
  
  // Set initial speed display
  if (window.DOM.speedBtn) {
    window.DOM.speedBtn.textContent = `${AppState.currentSpeed.toFixed(2)}x`;
  }
}


// --- 4. KICK OFF THE APPLICATION ---
window.addEventListener('DOMContentLoaded', init);
