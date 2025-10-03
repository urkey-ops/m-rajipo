// selection.js

import { CONFIG, AppState, setPlaylist, setQuizMode, setLocalStorageEnabled, setPersonalPlaylists, stopAllTimers } from './state.js';
import { toggleClass, showToast, showModal } from './ui-helpers.js';
import { playCurrent } from './player.js'; 

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- Helper Functions ---

/**
 * Ensures a single selection type (Track, Playlist, or Recent) is active.
 * @param {HTMLElement} target The checkbox element that was clicked.
 */
export function handleTrackSelection(target) {
  if (target.type !== 'checkbox') return;

  // The element to apply the 'selected' class to is always the closest label
  const label = target.closest('label');
  
  const selectorToUncheck = target.classList.contains('trackBox')
    ? '.playlist-box:checked, .recent-box:checked'
    : target.classList.contains('playlist-box')
      ? '.trackBox:checked, .recent-box:checked'
      : target.classList.contains('recent-box')
        ? '.trackBox:checked, .playlist-box:checked'
        : null;

  if (selectorToUncheck && target.checked) {
    document.querySelectorAll(selectorToUncheck).forEach(cb => {
      cb.checked = false;
      // Also remove the visual highlight on the unchecked item
      toggleClass(cb.closest('label'), 'selected', false); 
    });
  }

  // *** CRITICAL FIX: Applies the 'selected' class for the blue highlight ***
  toggleClass(label, 'selected', target.checked);

  // Update dependent UI elements
  updateGroupButtonSelection();
  updateSavePlaylistButtonVisibility();
  
  // If track selection changes, update the last selection in localStorage
  if (target.classList.contains('trackBox')) {
    const selectedTrackIds = getActivePlaylist(); // getActivePlaylist will return track IDs
    localStorage.setItem('lastSelection', JSON.stringify(selectedTrackIds));
  }
}

/**
 * Retrieves the currently active list of tracks based on the selection mode.
 */
function getActivePlaylist() {
  // If track boxes are checked, prioritize them
  const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked'))
    .map(cb => parseInt(cb.dataset.trackId, 10))
    .sort((a, b) => a - b);
    
  if (selectedTracks.length > 0) {
    return selectedTracks;
  }
  
  // Placeholder for retrieving tracks from a selected Playlist or Recent item
  const selectedPlaylistBox = document.querySelector('.playlist-box:checked, .recent-box:checked');
  if (selectedPlaylistBox) {
    // In a real app, you would retrieve the track list based on selectedPlaylistBox.dataset.id
    // For now, return a placeholder list
    showToast('Note: Retrieving track list from selected playlist/recent is a placeholder.');
    return [10, 20, 30]; 
  }

  return [];
}

/**
 * Starts playback based on the current selection.
 */
export function playSelected() {
  const newPlaylist = getActivePlaylist();
  
  if (newPlaylist.length === 0) {
    showToast('Please select at least one track, playlist, or recent item to play.');
    return;
  }

  setPlaylist(newPlaylist);
  AppState.currentIndex = 0; 

  // Toggle play/pause state if currently paused on the same list
  if (DOM.audioPlayer && !DOM.audioPlayer.paused) {
    DOM.audioPlayer.pause();
  } else {
    playCurrent();
  }
}

/**
 * Updates the group selection buttons' visual state (full, partial, unselected).
 */
export function updateGroupButtonSelection() {
  const groupButtons = document.querySelectorAll('#groups .group-btn');
  const checkedTrackIds = new Set(
    Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => cb.dataset.trackId)
  );

  groupButtons.forEach(btn => {
    const groupNum = parseInt(btn.dataset.group, 10);
    const start = (groupNum - 1) * 10 + 1;
    const end = Math.min(groupNum * 10, CONFIG.totalTracks);
    let selectedCount = 0;
    const groupSize = end - start + 1;

    for (let i = start; i <= end; i++) {
      if (checkedTrackIds.has(String(i))) {
        selectedCount++;
      }
    }

    // Reset classes
    toggleClass(btn, 'group-selected', false);
    toggleClass(btn, 'group-partial', false);
    toggleClass(btn, 'group-unselected', true); // Default state

    if (selectedCount === groupSize) {
      toggleClass(btn, 'group-unselected', false);
      toggleClass(btn, 'group-selected', true);
    } else if (selectedCount > 0) {
      toggleClass(btn, 'group-unselected', false);
      toggleClass(btn, 'group-partial', true);
    }
  });
}

/**
 * Toggles the selection state for all track boxes within a specific group.
 * @param {string} groupNumString The group number (e.g., '1' for tracks 1-10).
 */
export function toggleGroupSelection(groupNumString) { 
  const groupNum = parseInt(groupNumString, 10);
  const start = (groupNum - 1) * 10 + 1;
  const end = Math.min(groupNum * 10, CONFIG.totalTracks);
  
  let isGroupSelected = true;
  for (let i = start; i <= end; i++) {
    const checkbox = document.getElementById(`track-box-${i}`);
    if (checkbox && !checkbox.checked) {
      isGroupSelected = false; 
      break;
    }
  }

  const newState = !isGroupSelected; 
  
  // Clear other selections only if we are selecting track boxes
  if (newState) {
    document.querySelectorAll('.playlist-box:checked, .recent-box:checked').forEach(cb => {
      cb.checked = false;
      toggleClass(cb.closest('label'), 'selected', false);
    });
  }

  // Iterate and apply new state
  for (let i = start; i <= end; i++) {
    const checkbox = document.getElementById(`track-box-${i}`);
    if (checkbox && checkbox.checked !== newState) {
      checkbox.checked = newState;
      // Dispatch a change event to trigger handleTrackSelection logic
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}

// --- UI Display & Rendering ---

/**
 * Updates the display elements based on current player state.
 */
export function updatePlayerDisplay() {
  // CRITICAL FIX: Implement logic to update currently playing track display
  if (AppState.playlist.length > 0) {
    const currentTrack = AppState.playlist[AppState.currentIndex];
    // NOTE: Requires a DOM element to display this, e.g., DOM.currentTrackInfo
    // if (DOM.currentTrackInfo) {
    //   DOM.currentTrackInfo.textContent = `Playing Shloka ${currentTrack}`;
    // }
  }
}

/**
 * Updates visibility of the "Save as Playlist" button.
 */
export function updateSavePlaylistButtonVisibility() {
  const selectedTracks = document.querySelectorAll('.trackBox:checked');
  const container = document.getElementById('save-playlist-container');
  if (container) {
    toggleClass(container, 'hidden', selectedTracks.length === 0);
  }
}

/**
 * Renders the list of recently played selections.
 */
export function renderRecentSelections() {
  const recentsList = DOM.recentSelectionsList;
  if (!recentsList) return;
  
  const recentSelectionsStr = localStorage.getItem('recentSelections');
  const recentSelections = recentSelectionsStr ? JSON.parse(recentSelectionsStr) : [];
  
  recentsList.innerHTML = ''; 

  if (recentSelections.length === 0) {
    DOM.recentEmpty?.classList.remove('hidden');
    return;
  }
  DOM.recentEmpty?.classList.add('hidden');

  // *** CRITICAL FIX: Implement rendering loop ***
  recentSelections.forEach((item, index) => {
    const listItem = document.createElement('li');
    // Using a simple title and list of IDs for example
    const title = item.name || `Recent Selection #${index + 1}`; 
    const trackCount = item.tracks ? item.tracks.length : 0;
    
    // NOTE: This HTML structure must match your CSS/UI helpers
    listItem.innerHTML = `
      <label for="recent-box-${index}" class="track-label flex justify-between items-center p-3 rounded-lg cursor-pointer">
        <div class="flex items-center">
          <input type="checkbox" id="recent-box-${index}" class="recent-box sr-only" data-id="${item.id || index}" />
          <span class="custom-checkbox flex-shrink-0"></span>
          <span class="ml-3 text-white text-sm">${title}</span>
        </div>
        <span class="text-secondary-text text-xs">${trackCount} tracks</span>
      </label>
    `;
    recentsList.appendChild(listItem);
  });
}

/**
 * Confirms and clears the current track selection.
 */
export function confirmClearSelection() {
  document.querySelectorAll('.trackBox:checked, .playlist-box:checked, .recent-box:checked').forEach(cb => {
    cb.checked = false;
    toggleClass(cb.closest('label'), 'selected', false);
  });
  updateGroupButtonSelection();
  updateSavePlaylistButtonVisibility();
  showToast('Selection cleared.');
  localStorage.removeItem('lastSelection'); // Clear last selection on clear
}

/**
 * Confirms and clears the recent selections history from localStorage.
 */
export function confirmClearHistory() {
  showModal('Clear all saved recent selection history?', () => {
    localStorage.removeItem('recentSelections');
    renderRecentSelections();
    confirmClearSelection(); 
    showToast('Recent history cleared.');
  });
}

/**
 * Updates the visibility and styling of the application based on AppState.isQuizMode.
 */
export function updateQuizModeUI() {
    // 1. Update overall containers/controls
    if (DOM.mainControls) {
        // Toggle the visibility of the main controls section
        toggleClass(DOM.mainControls, 'hidden', AppState.isQuizMode);
    }
    
    // 2. Quiz Display elements (must be shown/hidden)
    if (DOM.quizDisplay) {
        // Toggle the visibility of the quiz mode display section
        toggleClass(DOM.quizDisplay, 'hidden', !AppState.isQuizMode);
    }
    
    // 3. Quiz Toggle Button Feedback (Visual State)
    if (DOM.quizToggle) {
        const icon = DOM.quizToggle.querySelector('i');
        const text = DOM.quizToggle.querySelector('span');
        
        // Use colors/classes consistent with the rest of the application
        if (AppState.isQuizMode) {
            toggleClass(DOM.quizToggle, 'btn-secondary', false);
            toggleClass(DOM.quizToggle, 'btn-green', true);
            if (icon) toggleClass(icon, 'fa-solid', true); 
            if (text) text.textContent = 'Quiz Mode: ON';
        } else {
            toggleClass(DOM.quizToggle, 'btn-green', false);
            toggleClass(DOM.quizToggle, 'btn-secondary', true);
            if (text) text.textContent = 'Quiz Mode: OFF';
        }
    }
}


/**
 * Toggles between standard playback mode and quiz mode (Graceful implementation).
 */
export function toggleAppMode() {
    setQuizMode(!AppState.isQuizMode);

    if (AppState.isQuizMode) {
        // Just switched INTO Quiz Mode: pause the audio immediately
        if (DOM.audioPlayer && !DOM.audioPlayer.paused) {
            DOM.audioPlayer.pause();
        }
    } else {
        // Just switched OUT OF Quiz Mode: clear any running quiz timers
        stopAllTimers(); 
    }

    // *** CRITICAL FIX: Update the UI to reflect the mode change ***
    updateQuizModeUI();

    showToast(AppState.isQuizMode ? 'Switched to Quiz Mode' : 'Switched to Standard Mode');
}

// --- Dynamic UI Generation ---

/**
 * Dynamically generates the list of shloka checkboxes (tracks).
 * @param {HTMLElement} container The <ul> element to append tracks to (DOM.trackList).
 */
export function generateTrackList(container) {
    if (!container) return;

    let html = '';
    for (let i = 1; i <= CONFIG.totalTracks; i++) {
        const trackId = `track-box-${i}`;
        html += `
            <li>
                <label for="${trackId}" class="track-label flex items-center p-3 rounded-lg cursor-pointer transition-colors duration-150">
                    <input type="checkbox" id="${trackId}" class="trackBox sr-only" data-track-id="${i}" />
                    <span class="custom-checkbox flex-shrink-0"></span>
                    <span class="ml-3 text-white text-sm">Shloka ${i}</span>
                </label>
            </li>
        `;
    }
    container.innerHTML = html;
}

/**
 * Dynamically generates the group selection buttons.
 * @param {HTMLElement} container The <div> element to append buttons to (DOM.groups).
 */
export function renderGroupButtons(container) {
    if (!container) return;

    const numGroups = Math.ceil(CONFIG.totalTracks / 10);
    let html = '';

    for (let i = 1; i <= numGroups; i++) {
        const start = (i - 1) * 10 + 1;
        const end = Math.min(i * 10, CONFIG.totalTracks);

        html += `
            <button 
                class="group-btn btn-rounded group-unselected" 
                data-group="${i}"
                title="Select tracks ${start} to ${end}"
            >
                ${start}-${end}
            </button>
        `;
    }
    container.innerHTML = html;
}


// --- Initialization ---

/**
 * Checks for localStorage availability and loads initial state.
 */
export function initializeLocalStorage() {
  try {
    const testKey = '__test_storage';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    setLocalStorageEnabled(true);
  } catch (e) {
    setLocalStorageEnabled(false);
    console.warn("Local storage is not available or disabled.");
    showToast("Warning: Local storage is unavailable. Playlists and history cannot be saved.");
  }
}
