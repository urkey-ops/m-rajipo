// selection.js

import { CONFIG, AppState, setPlaylist, setCurrentIndex, setQuizMode, setLocalStorageEnabled, 
  setPersonalPlaylists, stopAllTimers, setAutoPlay } from './state.js';
import { toggleClass, showToast, showModal, escapeHtml } from './ui-helpers.js';
import { playCurrent } from './player.js'; 
import { startQuizRound, toggleQuizPause, playNextQuizTrack } from './quiz.js'; 

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- Core Selection and Playback Functions ---

/**
 * Ensures a single selection type (Track, Playlist, or Recent) is active.
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

  updateGroupButtonSelection();
  updateSavePlaylistButtonVisibility();
}

/**
 * Retrieves the currently active list of tracks based on the selection mode.
 */
export function getActivePlaylist() {
  const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked'))
    .map(cb => parseInt(cb.dataset.track, 10))
    .sort((a, b) => a - b);

  if (selectedTracks.length > 0) {
    return selectedTracks;
  }
  
  const playlistSelection = document.querySelector('.playlist-box:checked');
  if (playlistSelection && AppState.personalPlaylists[playlistSelection.dataset.name]) {
    return AppState.personalPlaylists[playlistSelection.dataset.name].tracks;
  }

  const recentSelection = document.querySelector('.recent-box:checked');
  if (recentSelection) {
    try {
        return JSON.parse(recentSelection.dataset.tracks).sort((a, b) => a - b);
    } catch (e) {
        console.error("Failed to parse recent selection tracks:", e);
        return [];
    }
  }

  return []; 
}

/**
 * Executes playback for the currently selected playlist.
 */
export function playSelected() {
  if (AppState.isQuizMode) {
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

  let finalPlaylist = [...playlist];
  if (DOM.shuffleCheckbox?.checked) {
      finalPlaylist = finalPlaylist.sort(() => Math.random() - 0.5);
  }

  setPlaylist(finalPlaylist);
  setCurrentIndex(0);
  // NOTE: saveToRecentSelections is assumed to be called elsewhere, or here once implemented
  
  if (DOM.audioPlayer && DOM.audioPlayer.paused && DOM.audioPlayer.src) {
    DOM.audioPlayer.play().catch(e => console.error("Play failed:", e));
  } else {
    playCurrent();
  }
  
  updatePlayerDisplay();
}

/**
 * Updates the display in the player bar.
 */
export function updatePlayerDisplay() {
  // Logic here is minimal, placeholder for a shloka number display
}

/**
 * Toggles the application between Regular and Quiz mode.
 */
export function toggleAppMode() {
  if (!DOM.quizDisplay || !DOM.regularControls || !DOM.quizToggle) {
    console.error("Missing critical Quiz or Regular control elements for mode switch.");
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
  DOM.audioPlayer?.pause();

  // 3. Start/Stop Quiz-specific logic
  if (newMode) {
    showToast('Entered Quiz Mode.');
    updateGroupButtonSelection(); 
    // Assumes startQuizRound() is in quiz.js
    // startQuizRound(); 
  } else {
    showToast('Exited Quiz Mode.');
  }
  
  updateQuizModeUI(); 
}

/**
 * Updates the text and icon of the Quiz Mode toggle button.
 */
export function updateQuizModeUI() {
    if (!DOM.quizToggle) return;

    const inQuiz = AppState.isQuizMode;
    DOM.quizToggle.innerHTML = inQuiz 
        ? `<i class="fa-solid fa-toggle-on"></i> Exit Quiz Mode`
        : `<i class="fa-solid fa-toggle-off"></i> Toggle to Quiz Mode`;
    toggleClass(DOM.quizToggle, 'btn-primary', inQuiz);
    toggleClass(DOM.quizToggle, 'btn-secondary', !inQuiz);
    
    // Autoplay button logic (needs setAutoPlay from state.js)
    if (DOM.autoplayToggleBtn) {
        DOM.autoplayToggleBtn.innerHTML = AppState.autoPlay 
            ? `<i class="fa-solid fa-toggle-on"></i> Auto-Play: ON`
            : `<i class="fa-solid fa-toggle-off"></i> Auto-Play: OFF`;
        DOM.autoplayToggleBtn.onclick = () => {
            // setAutoPlay is assumed to be exported from state.js
            // setAutoPlay(!AppState.autoPlay); 
            updateQuizModeUI();
            showToast(`Auto-Play ${AppState.autoPlay ? 'enabled' : 'disabled'}.`);
        };
    }
}


// --- Group and Track Generation (UI Generation) ---

/**
 * Generates the track list and group buttons based on CONFIG.totalTracks.
 */
export function generateTrackListAndGroups() {
    if (!CONFIG.totalTracks) {
        console.error("CONFIG.totalTracks is undefined. Cannot generate UI.");
        return;
    }
    const totalTracks = CONFIG.totalTracks;
    
    // 1. Generate Group Buttons
    if (DOM.groups) {
        DOM.groups.innerHTML = '';
        const groups = [];
        // Dynamically create groups of 10
        for (let i = 1; i <= totalTracks; i += 10) {
            const start = i;
            const end = Math.min(i + 9, totalTracks);
            groups.push({ name: `Grp ${Math.ceil(i/10)}`, start, end });
        }
        // Add the 'All' button at the start
        groups.unshift({ name: "All", start: 1, end: totalTracks });


        groups.forEach(group => {
            const button = document.createElement('button');
            button.className = 'group-btn group-unselected';
            button.textContent = group.name;
            button.dataset.group = group.name;
            button.dataset.start = group.start;
            button.dataset.end = group.end;
            DOM.groups.appendChild(button);
        });
    } else {
        console.warn("DOM.groups element not found. Group buttons not generated.");
    }

    // 2. Generate Track List Checkboxes
    if (DOM.trackList) {
        DOM.trackList.innerHTML = '';
        for (let i = 1; i <= totalTracks; i++) {
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
    } else {
        console.warn("DOM.trackList element not found. Track list not generated.");
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
 */
export function toggleGroupSelection(groupName) {
    if (!DOM.groups) return;

    const button = DOM.groups.querySelector(`[data-group="${groupName}"]`);
    if (!button) return;

    const start = parseInt(button.dataset.start, 10);
    const end = parseInt(button.dataset.end, 10);
    
    const isSelected = button.classList.contains('group-selected');
    const isPartial = button.classList.contains('group-partial');
    const shouldCheck = !(isSelected || isPartial); 

    for (let i = start; i <= end; i++) {
        const checkbox = document.getElementById(`track-box-${i}`);
        if (checkbox && checkbox.checked !== shouldCheck) {
            checkbox.checked = shouldCheck;
            checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
        }
    }
}


// --- NEW COMPATIBILITY FUNCTIONS (CRITICAL FIXES) ---

/**
 * Handles the Range Selection logic, extracted from app.js setupEventListeners.
 * @param {number} start The start shloka number.
 * @param {number} end The end shloka number.
 */
export function handleRangeSelection(start, end) {
    const totalTracks = CONFIG.totalTracks;
    
    // 1. Validation
    const isValid = !isNaN(start) && !isNaN(end) && 
                    start > 0 && end <= totalTracks && start <= end;

    if (!isValid) {
        showModal(`Invalid range. Please enter numbers between 1 and ${totalTracks}, with Start <= End.`, null);
        return;
    }

    // 2. Clear current selection and apply new range
    confirmClearSelection(() => {
        for (let i = start; i <= end; i++) {
            const checkbox = document.getElementById(`track-box-${i}`);
            if (checkbox) {
                checkbox.checked = true;
                // Dispatch 'change' event to trigger selection.js handleTrackSelection logic
                checkbox.dispatchEvent(new Event('change', { bubbles: true })); 
            }
        }
        
        // 3. Update UI
        updateGroupButtonSelection();
        showToast(`Shlokas ${start} to ${end} selected.`);
    });
}

/**
 * Handles input change in the search field, filtering the track list.
 * @param {string} query The current search query.
 */
export function handleSearchInput(query) {
    if (!DOM.trackList || !DOM.searchFeedback) return;

    const queryTrimmed = query.trim();

    if (queryTrimmed === '') {
        // Show all tracks and clear feedback
        DOM.searchFeedback.textContent = '';
        DOM.trackList.querySelectorAll('li').forEach(li => toggleClass(li, 'hidden', false));
        return;
    }
    
    const num = parseInt(queryTrimmed, 10);
    let foundCount = 0;
    
    DOM.trackList.querySelectorAll('li').forEach(li => {
        const trackBox = li.querySelector('.trackBox');
        const trackNum = trackBox ? parseInt(trackBox.dataset.track, 10) : null;
        
        // Check if the input is a number and matches exactly
        const isMatch = !isNaN(num) && trackNum === num;
        
        if (isMatch) {
            foundCount++;
        }
        toggleClass(li, 'hidden', !isMatch);
    });

    if (foundCount > 0) {
        DOM.searchFeedback.textContent = `${foundCount} result${foundCount > 1 ? 's' : ''} found.`;
    } else {
        DOM.searchFeedback.textContent = `No results found for "${queryTrimmed}".`;
    }
}

/**
 * Handles clearing the search input and resetting the track list filter.
 */
export function handleClearSearch() {
    if (DOM.search) DOM.search.value = '';
    
    // Reset the filter and clear feedback by calling handleSearchInput with an empty query
    handleSearchInput('');
}


// --- Playlist Management ---

export function updateSavePlaylistButtonVisibility() {
  if (!DOM.savePlaylistBtn) return;
  
  const hasTrackSelection = document.querySelectorAll('.trackBox:checked').length > 0;
  toggleClass(DOM.savePlaylistBtn.parentElement, 'hidden', !hasTrackSelection);
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
            const safeLabel = escapeHtml(recent.label || 'Unnamed Selection'); 
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

/**
 * Confirms and clears the current track selection.
 * @param {function} [onConfirmCallback] A function to execute after confirmation.
 */
export function confirmClearSelection(onConfirmCallback) {
  const isSelectionActive = document.querySelectorAll('.trackBox:checked, .playlist-box:checked, .recent-box:checked').length > 0;
  if (!isSelectionActive) {
      if (onConfirmCallback) onConfirmCallback(); 
      return;
  }

  showModal('Are you sure you want to clear the current selection?', () => {
    clearSelection();
    if (onConfirmCallback) onConfirmCallback();
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
    clearSelection(); 
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
    // setLocalStorageEnabled is assumed to be exported from state.js
    // setLocalStorageEnabled(true);
    
    // Load Personal Playlists
    const playlistsStr = localStorage.getItem('personalPlaylists');
    if (playlistsStr) {
        try {
            // setPersonalPlaylists is assumed to be exported from state.js
            // setPersonalPlaylists(JSON.parse(playlistsStr));
        } catch(e) {
            console.error("Failed to parse personal playlists:", e);
            localStorage.removeItem('personalPlaylists');
        }
    }
    
  } catch (e) {
    // setLocalStorageEnabled is assumed to be exported from state.js
    // setLocalStorageEnabled(false);
    console.warn("Local storage is not available or disabled.");
    showToast("Warning: Local storage is unavailable. Playlists and history cannot be saved.");
  }
}
