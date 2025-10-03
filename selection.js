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
 * @param {'regular' | 'quiz'} mode
 * @returns {number[]} Array of unique shloka numbers.
 */
export function getActiveSelection(mode) {
  let finalSelection = [];

  // --- 1. Get Selected Tracks from Playlists ---
  const selectedPlaylists = Array.from(document.querySelectorAll('.playlist-box:checked'))
    .map(cb => AppState.personalPlaylists[cb.value])
    .filter(p => p && p.length); // Filter out empty/null playlists

  if (mode === 'regular') {
    // In regular mode, playlists override individual tracks.
    if (selectedPlaylists.length > 0) {
      finalSelection = selectedPlaylists.flat();
      return Array.from(new Set(finalSelection)); // Return unique tracks
    }
  }

  // --- 2. Get Selected Tracks from Individual Boxes and Recents ---
  
  // Get individual track selections
  const trackSelections = Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));

  // Get recent selections (already comma-separated strings)
  const recentSelections = Array.from(document.querySelectorAll('.recent-box:checked'))
    .map(cb => cb.value.split(',').map(s => parseInt(s, 10)))
    .flat();

  // Combine all sources
  let allSelections = [...selectedPlaylists.flat(), ...trackSelections, ...recentSelections];

  // If in quiz mode, we combine ALL selections (playlists, tracks, recents)
  if (mode === 'quiz') {
    return Array.from(new Set(allSelections));
  } 
  
  // If in regular mode and no playlists were selected, return individual/recent selections
  if (selectedPlaylists.length === 0) {
      return Array.from(new Set(allSelections));
  }
  
  // Final check: should return if selectedPlaylists > 0 was met above.
  return []; 
}

// --- UI Update Functions ---

/**
 * Updates the visibility of the "Save Playlist" button.
 */
export function updateSavePlaylistButtonVisibility() {
  const selectedCount = document.querySelectorAll('.trackBox:checked').length;
  toggleClass(DOM.savePlaylistBtn, 'hidden', selectedCount === 0);
}

/**
 * Updates the selection status of group buttons based on track boxes.
 */
export function updateGroupButtonSelection() {
  document.querySelectorAll('.group-btn').forEach(btn => {
    const start = parseInt(btn.dataset.start, 10);
    const end = parseInt(btn.dataset.end, 10);
    const selectedCount = Array.from(document.querySelectorAll('.trackBox:checked')).filter(cb => {
      const value = parseInt(cb.value, 10);
      return value >= start && value <= end;
    }).length;

    const totalInGroup = end - start + 1;
    let className = 'group-partial'; // Default to partial

    if (selectedCount === 0) {
      className = 'group-unselected';
    } else if (selectedCount === totalInGroup) {
      className = 'group-selected';
    }

    btn.className = `group-btn ${className}`;
  });

  // Also update global selection status
  const totalSelected = document.querySelectorAll('.trackBox:checked, .playlist-box:checked, .recent-box:checked').length;
  toggleClass(DOM.clearSelectionBtn, 'hidden', totalSelected === 0);
}

/**
 * Updates the player interface (track number, total, mode)
 */
export function updatePlayerDisplay() {
  if (AppState.playlist.length > 0) {
    const currentTrack = AppState.playlist[AppState.currentIndex] || 'N/A';
    DOM.currentTrackDisplay.textContent = currentTrack;
    DOM.totalTracksDisplay.textContent = AppState.playlist.length;
    DOM.playbackControls.classList.remove('hidden');
    
    // Update repeat display
    const repeatValue = DOM.repeatEach.checked ? ` (x${AppState.repeatEach})` : '';
    DOM.repeatEachDisplay.textContent = repeatValue;
  } else {
    DOM.currentTrackDisplay.textContent = '0';
    DOM.totalTracksDisplay.textContent = '0';
    DOM.playbackControls.classList.add('hidden');
  }

  // Update mode display
  DOM.modeDisplay.textContent = AppState.isQuizMode ? 'Quiz' : 'Regular';
  toggleClass(DOM.quizControls, 'hidden', !AppState.isQuizMode);
  toggleClass(DOM.regularControls, 'hidden', AppState.isQuizMode);
}

// --- Persistence and History ---

/**
 * Saves the current selection to localStorage as the last selection,
 * and adds it to the recent selections list.
 * @param {number[]} selection Array of shloka numbers.
 */
export function saveSelection(selection) {
  if (!AppState.localStorageEnabled || selection.length === 0) return;
  
  const selStr = selection.join(',');
  
  // 1. Save last selection
  localStorage.setItem('lastSelection', selStr);

  // 2. Add to recents
  let recents = [];
  try {
    recents = JSON.parse(localStorage.getItem('recentSelections')) || [];
  } catch (e) {
    console.error("Error parsing recentSelections from localStorage:", e);
    recents = [];
  }
  
  // Remove duplicates and prepend the new selection
  recents = recents.filter(s => s !== selStr);
  recents.unshift(selStr);
  
  // Enforce max list size
  recents = recents.slice(0, CONFIG.maxRecentSelections);

  try {
    localStorage.setItem('recentSelections', JSON.stringify(recents));
    renderRecentSelections();
  } catch (e) {
    console.error("Error saving recentSelections to localStorage:", e);
    showToast('Error saving selection history. Local storage may be full.');
  }
}

/**
 * Renders the saved recent selections list to the DOM.
 */
export function renderRecentSelections() {
  const recentsContainer = DOM.recentSelections;
  if (!recentsContainer) return;
  recentsContainer.innerHTML = '';
  
  let recents = [];
  try {
    recents = JSON.parse(localStorage.getItem('recentSelections')) || [];
  } catch (e) {
    recents = [];
  }

  if (recents.length === 0) {
    recentsContainer.innerHTML = '<p class="text-gray-500 italic">No recent selections.</p>';
    toggleClass(DOM.clearHistoryBtn, 'hidden', true);
    return;
  }

  recents.forEach((selectionStr, index) => {
    const selection = selectionStr.split(',').map(s => parseInt(s, 10));
    const rangeDisplay = selection.length > 1 
      ? `Shlokas ${selection[0]} to ${selection[selection.length - 1]} (${selection.length} tracks)`
      : `Shloka ${selection[0]}`;

    const label = document.createElement('label');
    label.className = 'flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer rounded';
    label.innerHTML = `
      <input type="checkbox" class="form-checkbox h-5 w-5 text-indigo-600 recent-box" value="${selectionStr}">
      <span>${index + 1}. ${rangeDisplay}</span>
    `;
    recentsContainer.appendChild(label);
  });
  
  toggleClass(DOM.clearHistoryBtn, 'hidden', false);
}

// --- Main Action Handlers ---

/**
 * Initiates playback based on the currently selected tracks.
 */
export function playSelected() {
  const mode = AppState.isQuizMode ? 'quiz' : 'regular';
  const selection = getActiveSelection(mode);

  if (selection.length === 0) {
    showToast('Please select at least one track or playlist.');
    return;
  }

  // 1. Pause if currently playing and the selection hasn't changed
  if (!DOM.audioPlayer.paused) {
    // A simplified check: if the playlist hasn't changed, pause/unpause
    // (A more robust check would involve comparing new selection with current playlist)
    if (selection.join(',') === AppState.playlist.join(',')) {
      DOM.audioPlayer.pause();
      return;
    }
  }

  // 2. Save and set new playlist
  saveSelection(selection);
  setPlaylist(selection);
  
  // 3. Shuffle (optional, depends on UI)
  if (DOM.shuffleCheckbox.checked) {
      // Fisher-Yates shuffle algorithm
      for (let i = AppState.playlist.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [AppState.playlist[i], AppState.playlist[j]] = [AppState.playlist[j], AppState.playlist[i]];
      }
  }

  // 4. Start playback
  setCurrentIndex(0);
  updatePlayerDisplay();
  playCurrent();
}

/**
 * Handles toggling the main application mode (Regular/Quiz).
 */
export function toggleAppMode() {
  const newMode = !AppState.isQuizMode;
  setQuizMode(newMode);
  updatePlayerDisplay();
  
  // Stop playback when mode changes to prevent errors
  DOM.audioPlayer.pause();
  stopAllTimers();
  
  // Show confirmation
  showToast(`Mode switched to: ${newMode ? 'Quiz' : 'Regular'}`);
}


// --- Confirmation/Clearing Functions ---

/**
 * Confirms and clears all current track and playlist selections.
 */
export function confirmClearSelection() {
  showModal('Clear all current selections (Tracks, Playlists, Recents)?', () => {
    clearSelection();
  });
}

/**
 * Clears all active selections from the UI.
 */
export function clearSelection() {
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
    clearSelection(); // Also clear any currently selected recent item
    showToast('Recent history cleared.');
  });
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
    
    // Load last selection or empty array for startup
    const lastSelectionStr = localStorage.getItem('lastSelection');
    if (lastSelectionStr) {
      // This is a placeholder; actual re-checking of track boxes based on lastSelection
      // needs to happen in app.js after the DOM is generated.
    }
    
  } catch (e) {
    setLocalStorageEnabled(false);
    console.warn("Local storage is not available or disabled.");
    showToast("Warning: Local storage is unavailable. Playlists and history cannot be saved.");
  }
}
