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
} from './selection.js'; 
import { toggleClass } from './ui-helpers.js';


// --- 1. DOM CACHE ---
// Expose DOM object globally for use by other modules
window.DOM = {};

/**
 * Caches all necessary DOM elements.
 * CRITICAL FIX: Ensures all IDs match the HTML.
 */
function cacheDOM() {
  // Main Player & Lists
  window.DOM.audioPlayer = document.getElementById('audio-player'); // FIX: Core element
  window.DOM.trackList = document.getElementById('track-list'); // FIX: Core element
  window.DOM.groups = document.getElementById('groups');
  
  // Modal & Toast (CRITICAL FIXES for ui-helpers errors)
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
  
  // Checkbox IDs
  window.DOM.repeatTrack = document.getElementById('repeatTrackCheckbox');
  window.DOM.repeatPlaylist = document.getElementById('repeatPlaylistCheckbox');
  window.DOM.repeatEach = document.getElementById('repeatEachCheckbox');
  
  window.DOM.repeatEachInput = document.getElementById('repeat-each-input');
  window.DOM.speedBtn = document.getElementById('speed-btn');

  // Quiz Mode (CRITICAL FIXES for toggle failure)
  window.DOM.quizToggle = document.getElementById('quiz-toggle');
  window.DOM.quizDisplay = document.getElementById('quiz-display');
  window.DOM.regularControls = document.getElementById('playbackControls'); // Matches <section id="playbackControls">
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
  // Global listener for selection changes
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
  
  // Listener for selecting range (Logic remains the same)
  window.DOM.selectRangeBtn?.addEventListener('click', () => {
    const start = parseInt(window.DOM.rangeStart.value, 10);
    const end = parseInt(window.DOM.rangeEnd.value, 10);
    
    const isValid = !isNaN(start) && !isNaN(end) && 
                    start > 0 && end <= CONFIG.totalTracks && start <= end;

    if (isValid) {
      confirmClearSelection(); 

      for (let i = start; i <= end; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
        }
      }
      window.DOM.rangeStart.value = '';
      window.DOM.rangeEnd.value = '';
      updateGroupButtonSelection();
    } else {
      alert(`Invalid range. Please enter numbers between 1 and ${CONFIG.totalTracks}, with Start <= End.`);
    }
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
  
  // Search/Clear Search listeners
  window.DOM.search?.addEventListener('input', () => {
    if (!window.DOM.search.value && window.DOM.searchFeedback) {
      window.DOM.searchFeedback.textContent = '';
    }
    // Search filter logic placeholder
  });
  window.DOM.clearSearch?.addEventListener('click', () => {
    if (window.DOM.search) window.DOM.search.value = '';
    if (window.DOM.searchFeedback) window.DOM.searchFeedback.textContent = '';
  });

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

  // 2. CRITICAL UI GENERATION (Must run AFTER cacheDOM)
  // This generates the track boxes and group buttons that were missing.
  generateTrackListAndGroups(); 
  
  // 3. Initialize internal states and persistence
  initializeLocalStorage(); 

  // 4. Restore Last Selection (Must run AFTER track boxes are generated in step 2)
  const lastSelectionStr = localStorage.getItem('lastSelection');
  if (lastSelectionStr) {
    try {
      const lastSelection = JSON.parse(lastSelectionStr);
      lastSelection.forEach(trackId => {
        const checkbox = document.getElementById(`track-box-${trackId}`);
        if (checkbox) {
          checkbox.checked = true;
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

  // 6. Set up all listeners (Now runs without failing due to missing DOM elements)
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
