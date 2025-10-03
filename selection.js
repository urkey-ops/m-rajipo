// selection.js

import { CONFIG, AppState, setPlaylist, setQuizMode, setLocalStorageEnabled, setPersonalPlaylists, stopAllTimers } from './state.js';
import { toggleClass, showToast, showModal } from './ui-helpers.js';
import { playCurrent } from './player.js'; // Need to call player functions

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- Helper Functions ---

/**
 * Ensures a single selection type (Track, Playlist, or Recent) is active.
 * @param {HTMLElement} target The checkbox element that was clicked.
 */
export function handleTrackSelection(target) {
  if (target.type !== 'checkbox') return;

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
      toggleClass(cb.closest('label'), 'selected', false);
    });
  }

  toggleClass(target.closest('label'), 'selected', target.checked);

  // Update dependent UI elements
  updateGroupButtonSelection();
  updateSavePlaylistButtonVisibility();
}

/**
 * Retrieves the currently active list of tracks based on the selection mode.
 */
function getActivePlaylist() {
  const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked'))
    .map(cb => parseInt(cb.dataset.trackId, 10))
    .sort((a, b) => a - b);
    
  if (selectedTracks.length > 0) {
    return selectedTracks;
  }
  
  // Placeholder for retrieving tracks from a selected Playlist or Recent item
  const selectedPlaylistBox = document.querySelector('.playlist-box:checked, .recent-box:checked');
  if (selectedPlaylistBox) {
    // This logic is missing, but for now we'll return a placeholder
    return [1, 2, 3]; // Return a placeholder list if a list type is selected
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
  // Always start at the first track of the new playlist
  AppState.currentIndex = 0; 

  // Toggle play/pause state if currently paused on the same list
  if (AppState.audioPlayer && !AppState.audioPlayer.paused) {
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
    toggleClass(btn, 'group-unselected', false);

    if (selectedCount === groupSize) {
      toggleClass(btn, 'group-selected', true);
    } else if (selectedCount > 0) {
      toggleClass(btn, 'group-partial', true);
    } else {
      toggleClass(btn, 'group-unselected', true);
    }
  });
}

/**
 * Toggles the selection state for all track boxes within a specific group.
 * @param {string} groupNumString The group number (e.g., '1' for tracks 1-10).
 */
export function toggleGroupSelection(groupNumString) { // <-- NEW FUNCTION FOR GROUP CLICK
  const groupNum = parseInt(groupNumString, 10);
  const start = (groupNum - 1) * 10 + 1;
  const end = Math.min(groupNum * 10, CONFIG.totalTracks);
  
  // 1. Determine the current state of the group
  let isGroupSelected = true;
  for (let i = start; i <= end; i++) {
    const checkbox = document.getElementById(`track-box-${i}`);
    if (checkbox && !checkbox.checked) {
      isGroupSelected = false; // Found an unchecked box, so we need to select all
      break;
    }
  }

  // 2. Set the new state
  const newState = !isGroupSelected; // If selected, newState is false (uncheck), otherwise true (check)
  
  // Clear other selections only if we are selecting track boxes
  if (newState) {
    document.querySelectorAll('.playlist-box:checked, .recent-box:checked').forEach(cb => {
      cb.checked = false;
      toggleClass(cb.closest('label'), 'selected', false);
    });
  }

  // 3. Iterate and apply new state
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
  // Logic to update the currently playing track number, quiz display, etc.
  // ... (implementation details omitted for brevity)
}

/**
 * Updates visibility of the "Save as Playlist" button.
 */
export function updateSavePlaylistButtonVisibility() {
  const selectedTracks = document.querySelectorAll('.trackBox:checked');
  const container = document.getElementById('save-playlist-container');
  if (container) {
    if (selectedTracks.length > 0) {
      toggleClass(container, 'hidden', false);
    } else {
      toggleClass(container, 'hidden', true);
    }
  }
}

/**
 * Renders the list of recently played selections.
 */
export function renderRecentSelections() {
  const recentsList = DOM.recentSelectionsList;
  if (!recentsList) return;
  
  // Assuming recentSelections are stored in localStorage
  const recentSelectionsStr = localStorage.getItem('recentSelections');
  const recentSelections = recentSelectionsStr ? JSON.parse(recentSelectionsStr) : [];
  
  recentsList.innerHTML = ''; // Clear existing list
  if (recentSelections.length === 0) {
    document.getElementById('recent-empty').classList.remove('hidden');
    return;
  }
  document.getElementById('recent-empty').classList.add('hidden');

  recentSelections.forEach((item, index) => {
    // Render list item for each recent selection
    const listItem = document.createElement('li');
    listItem.innerHTML = `...`; // Actual rendering HTML for recent item
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
 * Toggles between standard playback mode and quiz mode.
 */
export function toggleAppMode() {
    setQuizMode(!AppState.isQuizMode);
    // Logic to update the UI based on AppState.isQuizMode would go here
    showToast(AppState.isQuizMode ? 'Switched to Quiz Mode' : 'Switched to Standard Mode');
}

// --- Dynamic UI Generation (Handles Issue 2) ---

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
    
    // Placeholder logic for loading last selection
    // ...
    
  } catch (e) {
    setLocalStorageEnabled(false);
    console.warn("Local storage is not available or disabled.");
    showToast("Warning: Local storage is unavailable. Playlists and history cannot be saved.");
  }
}
