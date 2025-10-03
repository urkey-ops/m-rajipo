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
} from './selection.js'; 
import { toggleClass } from './ui-helpers.js';


// --- 1. DOM CACHE ---
// Expose DOM object globally for use by other modules (e.g., player.js, ui-helpers.js)
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
  
  // Controls & Buttons
  window.DOM.toggleGroupsBtn = document.getElementById('toggle-groups-btn');
  window.DOM.groupToggleIcon = document.getElementById('group-toggle-icon');
  window.DOM.toggleModeBtn = document.getElementById('toggle-mode-btn');
  
  // Regular Mode Controls
  window.DOM.playSelectedBtn = document.getElementById('play-selected-btn');
  window.DOM.playIcon = document.getElementById('play-icon');
  window.DOM.clearSelectionBtn = document.getElementById('clear-selection-btn');
  window.DOM.savePlaylistBtn = document.getElementById('save-playlist-btn');
  window.DOM.speedBtn = document.getElementById('speed-btn');
  
  // Quiz Mode Controls
  window.DOM.quizControls = document.getElementById('quiz-controls');
  window.DOM.regularControls = document.getElementById('regular-controls');
  window.DOM.playNextQuizBtn = document.getElementById('play-next-quiz-btn'); // FIX: Added wiring for this button
  window.DOM.autoplayToggleBtn = document.getElementById('autoplay-toggle-btn');
  window.DOM.playFullBtn = document.getElementById('play-full-btn');
  
  // Quiz Displays and Inputs (Partial - as required by AppState/UI)
  window.DOM.currentShlokQuiz = document.getElementById('current-shlok-quiz');
  window.DOM.countdownBar = document.getElementById('countdown-bar');
  window.DOM.quizTimeSlider = document.getElementById('quiz-time-slider');
  window.DOM.quizTimeDisplay = document.getElementById('quiz-time-display');
  
  // Playback States
  window.DOM.currentTrackDisplay = document.getElementById('current-track-display'); // Note: This ID needs to be added to the HTML for regular playback display
  window.DOM.totalTracksDisplay = document.getElementById('total-tracks-display'); // Note: This ID needs to be added to the HTML
  window.DOM.modeDisplay = document.getElementById('mode-display'); // Note: This ID needs to be added to the HTML
  
  // Checkboxes & Inputs
  window.DOM.repeatTrack = document.getElementById('repeat-track-checkbox'); // Note: This ID needs to be added to the HTML
  window.DOM.repeatPlaylist = document.getElementById('repeat-playlist-checkbox');
  window.DOM.repeatEach = document.getElementById('repeat-each-checkbox');
  window.DOM.repeatEachInput = document.getElementById('repeat-each-input');
  window.DOM.shuffleCheckbox = document.getElementById('shuffle-checkbox');
  
  // History & Playlists
  window.DOM.recentSelections = document.getElementById('recent-selections-list');
  window.DOM.clearHistoryBtn = document.getElementById('clear-history-btn');
  window.DOM.playlistList = document.getElementById('playlist-list');
}


// --- 2. DYNAMIC RENDERING (Placeholder for UI Generation) ---

/**
 * Generates the track list and group buttons based on CONFIG.totalTracks.
 * This is crucial as listeners depend on these elements existing.
 */
function generateTrackListAndGroups() {
    // 1. Generate Track List (1 to 315)
    if (window.DOM.trackList) {
        window.DOM.trackList.innerHTML = '';
        for (let i = 1; i <= 315; i++) {
            const label = document.createElement('label');
            // Assuming 'selectable-item' is the correct class from style.css
            label.className = 'selectable-item text-center'; 
            label.innerHTML = `
                <input type="checkbox" id="track-box-${i}" class="trackBox" value="${i}">
                <span>Shloka ${i}</span>
            `;
            window.DOM.trackList.appendChild(label);
        }
    }

    // 2. Generate Group Buttons (e.g., 1-25, 26-50, etc.)
    if (window.DOM.groups) {
        window.DOM.groups.innerHTML = '';
        const groupSizes = [10, 20, 25, 50, 100]; // Example sizes
        let start = 1;

        groupSizes.forEach(size => {
            if (start > 315) return;
            const end = Math.min(start + size - 1, 315);
            
            const btn = document.createElement('button');
            btn.className = 'group-btn group-unselected';
            btn.dataset.start = start;
            btn.dataset.end = end;
            btn.textContent = `${start}-${end}`;
            
            window.DOM.groups.appendChild(btn);
            start = end + 1;
        });
    }
}


// --- 3. EVENT LISTENERS ---

function setupEventListeners() {
  // Main Action Buttons
  // Use playSelected for Regular mode play/pause
  window.DOM.playSelectedBtn.addEventListener('click', playSelected);
  
  // FIX: Wire up the Quiz Mode button to also call playSelected()
  window.DOM.playNextQuizBtn.addEventListener('click', playSelected);

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

  // Toggle Groups Visibility
  window.DOM.toggleGroupsBtn.addEventListener('click', () => {
      toggleClass(window.DOM.groups, 'hidden');
      const isHidden = window.DOM.groups.classList.contains('hidden');
      window.DOM.groupToggleIcon.classList.toggle('fa-chevron-down', isHidden);
      window.DOM.groupToggleIcon.classList.toggle('fa-chevron-up', !isHidden);
  });

  // Repeat Mode Mutually Exclusive Logic
  const repeatModes = [window.DOM.repeatEach, window.DOM.repeatTrack, window.DOM.repeatPlaylist];
  repeatModes.forEach(modeCheckbox => {
      if (modeCheckbox) {
          modeCheckbox.addEventListener('change', (e) => {
              if (e.target.checked) {
                  repeatModes.forEach(otherCheckbox => {
                      if (otherCheckbox !== e.target) {
                          otherCheckbox.checked = false;
                      }
                  });
              }
          });
      }
  });
  
  // Initialize repeat each count
  if (window.DOM.repeatEachInput) {
      setRepeatEach(parseInt(window.DOM.repeatEachInput.value, 10) || 1);
  }

  // Group Buttons Delegation
  window.DOM.groups.addEventListener('click', (e) => {
    const btn = e.target.closest('.group-btn');
    if (btn) {
      const start = parseInt(btn.dataset.start, 10);
      const end = parseInt(btn.dataset.end, 10);
      const isSelected = btn.classList.contains('group-selected');
      
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

  // Search/Filter logic would be implemented here
  // ...
}


// --- 4. INIT FUNCTION ---

function init() {
  cacheDOM();
  
  if (!window.DOM.audioPlayer || !window.DOM.trackList) {
    console.error('Core DOM elements missing. Cannot initialize application.');
    // Attempt to generate missing dynamic UI for listeners to work
    generateTrackListAndGroups(); 
  }
  
  // Initialize internal states and persistence
  initializeLocalStorage(); 
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


// --- 5. KICK OFF THE APP ---
document.addEventListener('DOMContentLoaded', init);
