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
  toggleGroupSelection,
  renderGroupButtons, 
  generateTrackList,
  updateQuizModeUI,
} from './selection.js'; 
import { toggleClass } from './ui-helpers.js';


// --- 1. DOM CACHE ---
window.DOM = {};

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
  
  window.DOM.repeatTrack = document.getElementById('repeatTrackCheckbox');
  window.DOM.repeatPlaylist = document.getElementById('repeatPlaylistCheckbox');
  window.DOM.repeatEach = document.getElementById('repeatEachCheckbox'); // Matches new HTML ID
  
  window.DOM.repeatEachInput = document.getElementById('repeat-each-input');
  window.DOM.speedBtn = document.getElementById('speed-btn');

  // Quiz Mode
  window.DOM.quizToggle = document.getElementById('quiz-toggle'); // Matches new HTML ID
  window.DOM.quizDisplay = document.getElementById('quiz-display');
  window.DOM.quizProgress = document.getElementById('quiz-progress-bar');
  window.DOM.quizProgressText = document.getElementById('quiz-progress-text');
  window.DOM.quizPauseBtn = document.getElementById('quiz-pause-btn'); // Matches new HTML ID
  window.DOM.mainControls = document.getElementById('mainControls');
  
  // Playlist Management
  window.DOM.savePlaylistBtn = document.getElementById('save-playlist-btn');
  window.DOM.playlistList = document.getElementById('playlist-list');
  window.DOM.recentSelectionsList = document.getElementById('recent-selections-list');
  window.DOM.clearHistoryBtn = document.getElementById('clear-history-btn');
  window.DOM.recentEmpty = document.getElementById('recent-empty');

  // Misc
  window.DOM.clearSelectionBtn = document.getElementById('clear-selection-btn');
  window.DOM.toggleGroupsBtn = document.getElementById('toggle-groups-btn');
}


// --- 2. DYNAMIC UI GENERATION ---
function generateTrackListAndGroups() {
  if (window.DOM.groups) {
    renderGroupButtons(window.DOM.groups); 
  }
  if (window.DOM.trackList) {
    generateTrackList(window.DOM.trackList);
  }
}


// --- 3. EVENT LISTENERS ---

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
  
  // Listener for selecting range
  window.DOM.selectRangeBtn?.addEventListener('click', () => {
    const start = parseInt(window.DOM.rangeStart.value, 10);
    const end = parseInt(window.DOM.rangeEnd.value, 10);
    const isValid = !isNaN(start) && !isNaN(end) && start > 0 && end <= 315 && start <= end;

    if (isValid) {
      confirmClearSelection(); 

      for (let i = start; i <= end; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox) {
          checkbox.checked = true;
          // Dispatch 'change' event to trigger selection.js logic (highlighting, group updates)
          checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
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
      e.target.value = AppState.repeatEach; 
    }
  });
  
  // Search/Clear Search listeners (Placeholder for full search logic)
  window.DOM.search?.addEventListener('input', () => {
    if (!window.DOM.search.value) {
      window.DOM.searchFeedback.textContent = '';
    }
  });
  window.DOM.clearSearch?.addEventListener('click', () => {
    window.DOM.search.value = '';
    window.DOM.searchFeedback.textContent = '';
  });

  // Clear Selection Button
  window.DOM.clearSelectionBtn?.addEventListener('click', confirmClearSelection);

  // Toggle Groups Button (Placeholder for collapse logic)
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


// --- 4. INIT FUNCTION ---

function init() {
  // CRITICAL STEP: Cache the DOM first
  cacheDOM();
  
  // Check for the absolute critical elements and log if missing
  if (!window.DOM.audioPlayer) {
     console.error('CRITICAL: Audio Player element (id="audio-player") is missing from HTML. Playback will fail.');
  }

  // Generate the track list and group buttons so they exist in the DOM
  generateTrackListAndGroups(); 
  
  // Initialize internal states and persistence
  initializeLocalStorage(); 

  // 2. Restore Last Selection
  const lastSelectionStr = localStorage.getItem('lastSelection');
  if (lastSelectionStr) {
    try {
      const lastSelection = JSON.parse(lastSelectionStr);
      lastSelection.forEach(trackId => {
        const checkbox = document.getElementById(`track-box-${trackId}`);
        if (checkbox) {
          checkbox.checked = true;
          // Dispatch 'change' to trigger selection.js logic (highlighting, group updates)
          checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
        }
      });
    } catch(e) {
      console.error("Failed to parse last selection from storage:", e);
      localStorage.removeItem('lastSelection'); 
    }
  }

  // 3. Render Recents
  renderRecentSelections(); 

  // Set up all listeners
  setupEventListeners(); 
  setupPlayerEventListeners(); // Now safe because it checks DOM.audioPlayer

  // Initial UI updates
  updateQuizModeUI(); 
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

export { 
  init, 
  generateTrackListAndGroups 
};
