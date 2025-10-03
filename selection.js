// selection.js

import { 
  CONFIG, AppState, setPlaylist, setCurrentIndex, setQuizMode, setLocalStorageEnabled, 
  setPersonalPlaylists, stopAllTimers, setAutoPlay 
} from './state.js';
import { toggleClass, showToast, showModal, escapeHtml } from './ui-helpers.js';
import { playCurrent } from './player.js'; 
import { startQuizRound, toggleQuizPause, playNextQuizTrack } from './quiz.js'; 

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
 * CRITICAL FIX: Fallback returns an empty array, not hardcoded tracks.
 * @returns {number[]} Array of shloka numbers.
 */
export function getActivePlaylist() {
  // Priority 1: Individual track selections
  const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked'))
    .map(cb => parseInt(cb.dataset.track, 10))
    .sort((a, b) => a - b);

  if (selectedTracks.length > 0) {
    return selectedTracks;
  }
  
  // Priority 2: Playlist selections (assuming only one can be checked)
  const playlistSelection = document.querySelector('.playlist-box:checked');
  if (playlistSelection && AppState.personalPlaylists[playlistSelection.dataset.name]) {
    return AppState.personalPlaylists[playlistSelection.dataset.name].tracks;
  }

  // Priority 3: Recent selections (assuming only one can be checked)
  const recentSelection = document.querySelector('.recent-box:checked');
  if (recentSelection) {
    // Recent selection stores JSON string of tracks
    try {
        return JSON.parse(recentSelection.dataset.tracks).sort((a, b) => a - b);
    } catch (e) {
        console.error("Failed to parse recent selection tracks:", e);
        return [];
    }
  }

  // Fallback: No selection
  return []; 
}

/**
 * Executes playback for the currently selected playlist.
 */
export function playSelected() {
  if (AppState.isQuizMode) {
      // In Quiz Mode, the "Play" button should either pause/resume or play the next track.
      if (DOM.audioPlayer && DOM.audioPlayer.paused) {
          playNextQuizTrack();
      } else if (DOM.audioPlayer) {
          DOM.audioPlayer.pause();
          stopAllTimers();
      }
      return;
  }
  
  const playlist = getActivePlaylist();
  if (playlist.length === 0) {
    showToast('Please select shlokas or a playlist to begin.');
    return;
  }

  // 1. Apply shuffle if checked
  let finalPlaylist = [...playlist];
  if (DOM.shuffleCheckbox?.checked) {
      finalPlaylist = finalPlaylist.sort(() => Math.random() - 0.5);
  }

  // 2. Save the active selection to AppState
  setPlaylist(finalPlaylist);
  setCurrentIndex(0);

  // 3. Save to recent history (the selection before shuffling)
  saveToRecentSelections(playlist);
  
  // 4. Start playback
  if (DOM.audioPlayer && DOM.audioPlayer.paused && DOM.audioPlayer.src) {
    // If the player is paused and has a source, unpause it
    DOM.audioPlayer.play().catch(e => console.error("Play failed:", e));
  } else {
    // Otherwise, start from the first track
    playCurrent();
  }
  
  // 5. Update UI
  updatePlayerDisplay();
}

/**
 * Updates the display in the player bar (shloka number and playback status).
 */
export function updatePlayerDisplay() {
  if (AppState.playlist.length > 0) {
    const currentTrackNum = AppState.playlist[AppState.currentIndex];
    // This is a placeholder for the actual display element, assuming one exists
    // for standard mode, but for now we only need it for Quiz Mode.
  }
  // The player icon is updated in player.js
}

/**
 * Toggles the application between Regular and Quiz mode.
 * CRITICAL FIX: Added robustness and correct quiz flow initiation.
 */
export function toggleAppMode() {
  // CRITICAL FIX: Guard against missing quiz elements before proceeding
  if (!DOM.quizDisplay || !DOM.regularControls || !DOM.quizToggle) {
    console.error("Missing Quiz or Regular control elements.");
    showToast("Error: Missing UI elements for mode switch.");
    return;
  }
  
  const newMode = !AppState.isQuizMode;
  setQuizMode(newMode);
  stopAllTimers();

  // 1. Swap UI with fade effects
  toggleClass(DOM.quizDisplay, 'fade-in', newMode);
  toggleClass(DOM.quizDisplay, 'fade-out', !newMode);
  toggleClass(DOM.quizDisplay, 'hidden', !newMode);

  toggleClass(DOM.regularControls, 'fade-in', !newMode);
  toggleClass(DOM.regularControls, 'fade-out', newMode);
  toggleClass(DOM.regularControls, 'hidden', newMode);
  
  // 2. Stop Playback
  if (DOM.audioPlayer) {
      DOM.audioPlayer.pause();
  }

  // 3. Start/Stop Quiz-specific logic
  if (newMode) {
    showToast('Entered Quiz Mode.');
    // If switching to Quiz, ensure the playlist is fresh and start the round
    updateGroupButtonSelection(); 
    startQuizRound(); 
  } else {
    showToast('Exited Quiz Mode.');
  }
  
  updateQuizModeUI(); 
}

/**
 * Updates the text and icon of the Quiz Mode toggle button.
 */
export function updateQuizModeUI() {
    if (!DOM.quizToggle || !DOM.quizDisplay) return;

    const inQuiz = AppState.isQuizMode;
    DOM.quizToggle.innerHTML = inQuiz 
        ? `<i class="fa-solid fa-toggle-on"></i> Exit Quiz Mode`
        : `<i class="fa-solid fa-toggle-off"></i> Toggle to Quiz Mode`;
    toggleClass(DOM.quizToggle, 'btn-primary', inQuiz);
    toggleClass(DOM.quizToggle, 'btn-secondary', !inQuiz);

    // Update Quiz Controls Visibility (Quiz-specific buttons)
    if (DOM.quizPauseBtn) {
        toggleClass(DOM.quizPauseBtn, 'hidden', !inQuiz);
        DOM.quizPauseBtn.onclick = toggleQuizPause;
    }
    if (DOM.playNextQuizBtn) {
        DOM.playNextQuizBtn.onclick = playNextQuizTrack;
    }

    // Set auto-play button state
    if (DOM.autoplayToggleBtn) {
        DOM.autoplayToggleBtn.innerHTML = AppState.autoPlay 
            ? `<i class="fa-solid fa-toggle-on"></i> Auto-Play: ON`
            : `<i class="fa-solid fa-toggle-off"></i> Auto-Play: OFF`;
        DOM.autoplayToggleBtn.onclick = () => {
            setAutoPlay(!AppState.autoPlay);
            updateQuizModeUI();
            showToast(`Auto-Play ${AppState.autoPlay ? 'enabled' : 'disabled'}.`);
        };
    }
}


// --- Group and Track Generation ---

/**
 * Generates the track list and group buttons based on CONFIG.totalTracks.
 * CRITICAL: Combined generateTracks and renderGroupButtons into one export.
 */
export function generateTrackListAndGroups() {
    // 1. Generate Group Buttons
    if (DOM.groups) {
        DOM.groups.innerHTML = '';
        const groups = [
            { name: "All", start: 1, end: CONFIG.totalTracks },
            { name: "Grp 1", start: 1, end: 10 },
            { name: "Grp 2", start: 11, end: 20 },
            // ... (Add your remaining groups here)
            { name: "Last", start: CONFIG.totalTracks - 9, end: CONFIG.totalTracks } // Example
        ];

        groups.forEach(group => {
            const button = document.createElement('button');
            button.className = 'group-btn group-unselected';
            button.textContent = group.name;
            button.dataset.group = group.name;
            button.dataset.start = group.start;
            button.dataset.end = group.end;
            DOM.groups.appendChild(button);
        });
    }

    // 2. Generate Track List Checkboxes
    if (DOM.trackList) {
        DOM.trackList.innerHTML = '';
        for (let i = 1; i <= CONFIG.totalTracks; i++) {
            const listItem = document.createElement('li');
            const shlokaLabel = `Shloka ${i}`;
            listItem.innerHTML = `
                <label class="flex items-center space-x-2 p-2 rounded-lg cursor-pointer">
                    <input type="checkbox" id="track-box-${i}" data-track="${i}" class="trackBox h-4 w-4 rounded text-blue-600 bg-gray-800 border-gray-600" />
                    <span>${shlokaLabel}</span>
                </label>
            `;
            DOM.trackList.appendChild(listItem);
        }
    }
}

/**
 * Updates the visual state (selected/partial/unselected) of all group buttons.
 */
export function updateGroupButtonSelection() {
    if (!DOM.groups) return;

    const allCheckedTracks = Array.from(document.querySelectorAll('.trackBox:checked'))
        .map(cb => parseInt(cb.dataset.track, 10));

    DOM.groups.querySelectorAll('.group-btn').forEach(button => {
        const start = parseInt(button.dataset.start, 10);
        const end = parseInt(button.dataset.end, 10);
        let checkedCount = 0;
        const totalCount = end - start + 1;

        for (let i = start; i <= end; i++) {
            if (allCheckedTracks.includes(i)) {
                checkedCount++;
            }
        }

        toggleClass(button, 'group-selected', checkedCount === totalCount);
        toggleClass(button, 'group-partial', checkedCount > 0 && checkedCount < totalCount);
        toggleClass(button, 'group-unselected', checkedCount === 0);
    });
}

/**
 * Toggles selection of a shloka group.
 * @param {string} groupName The name of the group.
 */
export function toggleGroupSelection(groupName) {
    if (!DOM.groups) return;

    const button = DOM.groups.querySelector(`[data-group="${groupName}"]`);
    if (!button) return;

    const start = parseInt(button.dataset.start, 10);
    const end = parseInt(button.dataset.end, 10);
    
    // Determine the desired state: If currently selected or partial, unselect. Otherwise, select.
    const isSelected = button.classList.contains('group-selected');
    const isPartial = button.classList.contains('group-partial');
    const shouldCheck = !(isSelected || isPartial); // Check if it's unselected or partial

    for (let i = start; i <= end; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox && checkbox.checked !== shouldCheck) {
            checkbox.checked = shouldCheck;
            // Dispatch event to trigger handleTrackSelection and highlighting
            checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
        }
    }
}


// --- Playlist Management ---

/**
 * Hides or shows the "Save as Playlist" button.
 */
export function updateSavePlaylistButtonVisibility() {
  if (!DOM.savePlaylistBtn) return;
  
  const hasTrackSelection = document.querySelectorAll('.trackBox:checked').length > 0;
  toggleClass(DOM.savePlaylistBtn.parentElement, 'hidden', !hasTrackSelection);
}


// --- Recent History ---

/**
 * Saves the current selection to recent history if tracks are playing.
 * @param {number[]} selection The array of shloka numbers to save.
 */
function saveToRecentSelections(selection) {
    if (!AppState.localStorageEnabled || selection.length === 0) return;

    try {
        let recents = JSON.parse(localStorage.getItem('recentSelections') || '[]');
        const selectionStr = JSON.stringify(selection.sort((a,b) => a-b));

        // Find and remove duplicates
        recents = recents.filter(r => JSON.stringify(r.tracks.sort((a,b) => a-b)) !== selectionStr);
        
        // Add new selection to the front
        recents.unshift({ 
            timestamp: Date.now(), 
            tracks: selection,
            label: selection.length === 1 ? `Shloka ${selection[0]}` : `${selection[0]}-${selection[selection.length - 1]} (${selection.length})`
        });

        // Truncate to max size
        recents = recents.slice(0, CONFIG.maxRecentSelections);
        
        localStorage.setItem('recentSelections', JSON.stringify(recents));
        renderRecentSelections();
    } catch(e) {
        console.error("Failed to save recent selection to storage:", e);
    }
}

/**
 * Renders the recent selections list from localStorage.
 */
export function renderRecentSelections() {
    if (!DOM.recentSelectionsList || !DOM.recentEmpty || !AppState.localStorageEnabled) return;

    try {
        const recents = JSON.parse(localStorage.getItem('recentSelections') || '[]');
        
        DOM.recentSelectionsList.innerHTML = '';
        toggleClass(DOM.recentEmpty, 'hidden', recents.length > 0);

        recents.forEach(recent => {
            const listItem = document.createElement('li');
            const tracksStr = JSON.stringify(recent.tracks);
            // CRITICAL FIX: Use escapeHtml for dynamic label content
            const safeLabel = escapeHtml(recent.label); 
            listItem.innerHTML = `
                <label class="flex items-center space-x-2 p-2 rounded-lg cursor-pointer">
                    <input type="checkbox" data-tracks='${tracksStr}' data-label="${safeLabel}" class="recent-box h-4 w-4 rounded text-blue-600 bg-gray-800 border-gray-600" />
                    <span>${safeLabel}</span>
                    <span class="text-xs text-gray-400">(${recent.tracks.length} tracks)</span>
                </label>
            `;
            DOM.recentSelectionsList.appendChild(listItem);
        });
    } catch(e) {
        console.error("Failed to render recent selections:", e);
        DOM.recentEmpty.textContent = 'Error loading history.';
    }
}


// --- Clearing and History ---

/**
 * Confirms and clears the current track selection.
 */
export function confirmClearSelection() {
  const isSelectionActive = document.querySelectorAll('.trackBox:checked, .playlist-box:checked, .recent-box:checked').length > 0;
  if (!isSelectionActive) return;

  showModal('Are you sure you want to clear the current selection?', () => {
    clearSelection();
  });
}

/**
 * Clears all current track and playlist selections in the UI.
 */
function clearSelection() {
  document.querySelectorAll('.trackBox, .playlist-box, .recent-box').forEach(cb => {
    cb.checked = false;
    toggleClass(cb.closest('label'), 'selected', false);
  });
  updateGroupButtonSelection();
  updateSavePlaylistButtonVisibility();
  showToast('Selection cleared.');
  localStorage.removeItem('lastSelection');
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
 * CRITICAL FIX: Robust validation on JSON parsing.
 */
export function initializeLocalStorage() {
  try {
    const testKey = '__test_storage';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    setLocalStorageEnabled(true);
    
    // Load Personal Playlists
    const playlistsStr = localStorage.getItem('personalPlaylists');
    if (playlistsStr) {
        try {
            setPersonalPlaylists(JSON.parse(playlistsStr));
        } catch(e) {
            console.error("Failed to parse personal playlists:", e);
            localStorage.removeItem('personalPlaylists');
        }
    }
    
  } catch (e) {
    setLocalStorageEnabled(false);
    console.warn("Local storage is not available or disabled.");
    showToast("Warning: Local storage is unavailable. Playlists and history cannot be saved.");
  }
}
