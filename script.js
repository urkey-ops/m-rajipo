document.addEventListener('DOMContentLoaded', () => {
  // --- 1. CONFIG & STATE ---
  const CONFIG = {
    audioBaseUrl: 'https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_',
    totalTracks: 315,
    maxRecentSelections: 5,
    toastDuration: 4000,
    quizAutoPlayDelay: 1500,
  };

  const AppState = {
    playlist: [],
    currentIndex: 0,
    repeatEach: 1,
    repeatCounter: 0,
    currentSpeed: 1.0,
    isQuizMode: false,
    hasQuizPaused: false,
    autoPlay: false,
    autoPlayTimeout: null,
    countdownInterval: null,
    currentQuizTime: 20,
    currentQuizDelay: 3,
    localStorageEnabled: false,
    personalPlaylists: {},
  };

  const DOM = {
    // Main Elements
    audioPlayer: null,
    trackList: null,
    groups: null,
    search: null,
    clearSearch: null,
    searchFeedback: null,
    rangeStart: null,
    rangeEnd: null,
    selectRangeBtn: null,
    toggleGroupsBtn: null,
    groupToggleIcon: null,
    toggleModeBtn: null,
    playSelectedBtn: null,
    clearSelectionBtn: null,
    quizControls: null,
    regularControls: null,
    repeatCount: null,
    shuffle: null,
    repeatPlaylist: null,
    speedSlider: null,
    speedDisplay: null,
    currentShlokQuiz: null,
    countdownBar: null,
    quizStatus: null,
    countdown: null,
    quizTimeSlider: null,
    quizTimeDisplay: null,
    quizDelaySlider: null,
    quizDelayDisplay: null,
    autoPlayToggleBtn: null,
    playFullBtn: null,
    playNextQuizBtn: null,
    playlistList: null,
    playlistEmpty: null,
    savePlaylistContainer: null,
    showSaveModalBtn: null,
    recentlyPlayed: null,
    recentList: null,
    recentEmpty: null,
    clearHistoryBtn: null,
    toastContainer: null,
    modalContainer: null,
  };

  // Utility
  function toggleClass(el, className, condition = null) {
    if (!el) return;
    if (condition === null) {
      el.classList.toggle(className);
    } else {
      el.classList.toggle(className, condition);
    }
  }

  // --- 2. INIT ---
  function init() {
    cacheDOM();
    generateTrackList();
    generateGroups();
    checkLocalStorage();

    if (AppState.localStorageEnabled) {
      restoreLastSelection();
      renderRecentSelections();
      renderPersonalPlaylists();
    } else {
      showToast('Local storage is disabled. Playlists and history will not be saved.');
    }

    setupEventListeners();
    updateSavePlaylistButtonVisibility();
  }

  function cacheDOM() {
    DOM.audioPlayer = document.getElementById('audioPlayer');
    DOM.trackList = document.getElementById('trackList');
    DOM.groups = document.getElementById('groups');

    DOM.search = document.getElementById('search');
    DOM.clearSearch = document.getElementById('clearSearch');
    DOM.searchFeedback = document.getElementById('search-feedback');
    DOM.rangeStart = document.getElementById('rangeStart');
    DOM.rangeEnd = document.getElementById('rangeEnd');
    DOM.selectRangeBtn = document.getElementById('selectRangeBtn');

    // Mode toggle buttons
    DOM.toggleGroupsBtn = document.getElementById('toggleGroupsBtn');
    DOM.groupToggleIcon = document.getElementById('group-toggle-icon');
    DOM.toggleModeBtn = document.getElementById('toggleModeBtn');
    DOM.playSelectedBtn = document.getElementById('playSelectedBtn');
    DOM.clearSelectionBtn = document.getElementById('clearSelectionBtn');

    // Quiz controls
    DOM.quizControls = document.getElementById('quizControls');
    DOM.regularControls = document.getElementById('regularControls');

    DOM.currentShlokQuiz = document.getElementById('currentShlokQuiz');
    DOM.countdownBar = document.getElementById('countdownBar');
    DOM.quizStatus = document.getElementById('quizStatus');
    DOM.countdown = document.getElementById('countdown');
    DOM.quizTimeSlider = document.getElementById('quizTimeSlider');
    DOM.quizTimeDisplay = document.getElementById('quizTimeDisplay');
    DOM.quizDelaySlider = document.getElementById('quizDelaySlider');
    DOM.quizDelayDisplay = document.getElementById('quizDelayDisplay');
    DOM.autoPlayToggleBtn = document.getElementById('autoPlayToggleBtn');
    DOM.playFullBtn = document.getElementById('playFullBtn');
    DOM.playNextQuizBtn = document.getElementById('playNextQuizBtn');

    // Playlists & Recents
    DOM.playlistList = document.getElementById('playlistList');
    DOM.playlistEmpty = document.getElementById('playlist-empty');
    DOM.savePlaylistContainer = document.getElementById('savePlaylistContainer');
    DOM.showSaveModalBtn = document.getElementById('showSaveModalBtn');
    DOM.recentlyPlayed = document.getElementById('recentlyPlayed');
    DOM.recentList = document.getElementById('recentList');
    DOM.recentEmpty = document.getElementById('recent-empty');
    DOM.clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Feedback
    DOM.toastContainer = document.getElementById('toast-container');
    DOM.modalContainer = document.getElementById('modal-container');

    // Regular controls
    DOM.repeatCount = document.getElementById('repeatCount');
    DOM.shuffle = document.getElementById('shuffle');
    DOM.repeatPlaylist = document.getElementById('repeatPlaylist');
    DOM.speedSlider = document.getElementById('speedSlider');
    DOM.speedDisplay = document.getElementById('speedDisplay');
  }

  function setupEventListeners() {
    // Player events
    DOM.audioPlayer.addEventListener('ended', handleTrackEnd);
    DOM.audioPlayer.addEventListener('playing', handleAudioPlaying);
    DOM.audioPlayer.addEventListener('error', handleAudioError);

    // Search & Range
    DOM.search.addEventListener('input', handleSearch);
    DOM.clearSearch.addEventListener('click', () => {
      DOM.search.value = '';
      handleSearch();
      DOM.search.focus();
    });
    DOM.selectRangeBtn.addEventListener('click', selectRange);

    // Mode toggles
    DOM.toggleGroupsBtn.addEventListener('click', toggleGroupDisplay);
    DOM.toggleModeBtn.addEventListener('click', toggleMode);

    // Buttons
    DOM.playSelectedBtn.addEventListener('click', playSelected);
    DOM.clearSelectionBtn.addEventListener('click', confirmClearSelection);
    DOM.speedSlider.addEventListener('input', () => changeSpeed(parseFloat(DOM.speedSlider.value)));

    // Quiz
    DOM.quizTimeSlider.addEventListener('input', () => changeQuizTime(parseInt(DOM.quizTimeSlider.value)));
    DOM.quizDelaySlider.addEventListener('input', () => changeQuizDelay(parseInt(DOM.quizDelaySlider.value)));
    DOM.autoPlayToggleBtn.addEventListener('click', toggleAutoPlay);
    DOM.playFullBtn.addEventListener('click', playFullShloka);
    DOM.playNextQuizBtn.addEventListener('click', playNextQuizTrack);

    // Playlist & Recent
    DOM.showSaveModalBtn.addEventListener('click', showSavePlaylistModal);
    DOM.clearHistoryBtn.addEventListener('click', confirmClearHistory);

    // Delegate change events for checkboxes
    DOM.trackList.addEventListener('change', handleTrackSelection);
    DOM.recentList.addEventListener('change', handleTrackSelection);
    DOM.playlistList.addEventListener('change', handleTrackSelection);
  }

  function checkLocalStorage() {
    try {
      const test = '__localStorageTest__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      AppState.localStorageEnabled = true;
    } catch (e) {
      AppState.localStorageEnabled = false;
      console.warn('Local storage is disabled.');
    }
  }

  // --- 3. Generate UI ---
  function generateTrackList() {
    if (!DOM.trackList) return;
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= CONFIG.totalTracks; i++) {
      const li = document.createElement('li');
      const label = document.createElement('label');
      label.className = 'selectable-item p-3 block flex items-center';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'trackBox mr-2';
      checkbox.value = i;

      const span = document.createElement('span');
      span.className = 'ml-6';
      span.textContent = `Shlok ${i}`;

      label.appendChild(checkbox);
      label.appendChild(span);
      li.appendChild(label);
      fragment.appendChild(li);
    }
    DOM.trackList.appendChild(fragment);
  }

  function generateGroups() {
    if (!DOM.groups) return;
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= CONFIG.totalTracks; i += 10) {
      const end = Math.min(i + 9, CONFIG.totalTracks);
      const btn = document.createElement('button');
      btn.className = 'group-btn';
      btn.setAttribute('tabindex', '0');
      btn.setAttribute('aria-pressed', 'false');
      btn.dataset.start = i;
      btn.dataset.end = end;
      btn.innerHTML = `${i}–${end}<span class="checkmark">✓</span>`;
      btn.addEventListener('click', () => toggleGroup(i, end, btn));
      fragment.appendChild(btn);
    }
    DOM.groups.appendChild(fragment);
  }

  function toggleGroupDisplay() {
    if (!DOM.groups || !DOM.groupToggleIcon) return;
    const isHidden = DOM.groups.classList.toggle('hidden');
    toggleClass(DOM.groupToggleIcon, 'fa-chevron-down', isHidden);
    toggleClass(DOM.groupToggleIcon, 'fa-chevron-up', !isHidden);
  }

  function updateGroupButtonSelection() {
    const selectedTracks = new Set(
      Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10))
    );
    document.querySelectorAll('.group-btn').forEach(btn => {
      const start = parseInt(btn.dataset.start, 10);
      const end = parseInt(btn.dataset.end, 10);
      if (isNaN(start) || isNaN(end)) return;
      let isGroupSelected = true;
      for (let i = start; i <= end; i++) {
        if (!selectedTracks.has(i)) {
          isGroupSelected = false;
          break;
        }
      }
      toggleClass(btn, 'selected', isGroupSelected);
      btn.setAttribute('aria-pressed', isGroupSelected.toString());
    });
    DOM.savePlaylistContainer.classList.toggle('hidden', selectedTracks.size === 0 || AppState.isQuizMode);
  }

  function updateSavePlaylistButtonVisibility() {
    const selectedCount = document.querySelectorAll('.trackBox:checked').length;
    toggleClass(DOM.savePlaylistContainer, 'hidden', selectedCount === 0 || AppState.isQuizMode);
  }

  // --- 4. Player Logic ---
  function playCurrent() {
    if (AppState.playlist.length === 0) {
      showToast('Playlist is empty.');
      return;
    }
    if (AppState.currentIndex >= AppState.playlist.length) {
      if (DOM.repeatPlaylist.checked) {
        AppState.currentIndex = 0;
      } else {
        DOM.audioPlayer.pause();
        DOM.audioPlayer.src = '';
        showToast('Playlist finished.');
        return;
      }
    }
    const trackNum = AppState.playlist[AppState.currentIndex];
    const padded = String(trackNum).padStart(3, '0');
    DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${padded}.mp3`;
    DOM.audioPlayer.playbackRate = AppState.currentSpeed;
    DOM.audioPlayer.play().catch((err) => {
      console.error('Play error:', err);
      showToast('Failed to play track.');
    });
  }

  function handleTrackEnd() {
    if (AppState.isQuizMode) return;
    AppState.repeatCounter++;
    if (AppState.repeatCounter < AppState.repeatEach) {
      DOM.audioPlayer.currentTime = 0;
      DOM.audioPlayer.play();
    } else {
      AppState.repeatCounter = 0;
      AppState.currentIndex++;
      playCurrent();
    }
  }

  function handleAudioPlaying() {
    if (AppState.isQuizMode && !AppState.hasQuizPaused) {
      DOM.playFullBtn.classList.add('hidden');
      setTimeout(() => {
        DOM.audioPlayer.pause();
        AppState.hasQuizPaused = true;
        DOM.quizStatus.textContent = "Audio Paused. Your turn to recite!";
        DOM.playFullBtn.classList.remove('hidden');
        startQuizCountdown();
      }, AppState.currentQuizDelay * 1000);
    }
  }

  function handleAudioError() {
    showToast('Audio error occurred.');
  }

  function playSelected() {
    const selection = getActiveSelection('regular');
    if (selection.length === 0) {
      showModal('Please select at least one shlok or a playlist to play.');
      return;
    }
    AppState.repeatEach = parseInt(DOM.repeatCount.value, 10) || 1;
    AppState.playlist = [...selection];
    if (DOM.shuffle.checked) {
      AppState.playlist.sort(() => Math.random() - 0.5);
    }
    AppState.currentIndex = 0;
    AppState.repeatCounter = 0;
    if (AppState.localStorageEnabled) {
      saveSelection(selection);
    }
    playCurrent();
    showToast('Playback started.');
  }

  function changeSpeed(speed) {
    AppState.currentSpeed = speed;
    DOM.audioPlayer.playbackRate = speed;
    DOM.speedDisplay.textContent = speed.toFixed(1);
  }

  // --- 5. QUIZ MODE ---
  function toggleMode() {
    AppState.isQuizMode = !AppState.isQuizMode;
    toggleClass(DOM.quizControls, 'hidden', !AppState.isQuizMode);
    toggleClass(DOM.regularControls, 'hidden', AppState.isQuizMode);
    DOM.toggleModeBtn.innerHTML = `<i class="fa-solid fa-toggle-${AppState.isQuizMode ? 'on' : 'off'}"></i> ${AppState.isQuizMode ? 'Exit Quiz Mode' : 'Toggle to Quiz Mode'}`;

    // Reset state
    DOM.audioPlayer.pause();
    DOM.audioPlayer.src = '';
    clearQuizTimers();

    if (AppState.isQuizMode) {
      AppState.playlist = [];
      AppState.currentIndex = 0;
      DOM.playFullBtn.classList.add('hidden');
      DOM.countdownBar.style.width = '100%';
      DOM.currentShlokQuiz.textContent = 'Shlok 0';
    } else {
      DOM.quizStatus.textContent = '';
      DOM.countdown.textContent = '';
    }
    updateSavePlaylistButtonVisibility();
  }

  function playNextQuizTrack() {
    const selected = getActiveSelection('quiz');
    if (selected.length === 0) {
      showModal('Select shlokas, playlist, or recent to quiz on.');
      return;
    }
    if (AppState.playlist.length === 0 || AppState.currentIndex >= AppState.playlist.length) {
      AppState.playlist = [...selected].sort(() => Math.random() - 0.5);
      AppState.currentIndex = 0;
    }
    clearQuizTimers();
    DOM.quizStatus.textContent = '';
    DOM.playFullBtn.classList.add('hidden');

    const trackNum = AppState.playlist[AppState.currentIndex];
    const padded = String(trackNum).padStart(3, '0');
    DOM.currentShlokQuiz.textContent = `Now playing: Shlok ${trackNum}`;
    DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${padded}.mp3`;
    DOM.audioPlayer.playbackRate = AppState.currentSpeed;

    AppState.hasQuizPaused = false;
    DOM.countdownBar.style.width = '100%';

    DOM.audioPlayer.play().catch((err) => {
      console.error('Play error:', err);
      showToast('Failed to play track.');
    });

    AppState.currentIndex++;
  }

  function startQuizCountdown() {
    let timeLeft = AppState.currentQuizTime;
    DOM.countdownBar.style.width = '0%';
    DOM.quizStatus.textContent = "What's the shlok number?";
    DOM.quizStatus.style.color = 'var(--accent-green)';
    if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
    AppState.countdownInterval = setInterval(() => {
      timeLeft--;
      DOM.countdown.textContent = `(${timeLeft}s)`;
      DOM.countdownBar.style.width = `${(timeLeft / AppState.currentQuizTime) * 100}%`;
      if (timeLeft <= 0) {
        clearInterval(AppState.countdownInterval);
        AppState.countdownInterval = null;
        DOM.quizStatus.textContent = "Time's up!";
        DOM.quizStatus.style.color = 'var(--accent-red)';
        DOM.countdown.textContent = '';
        if (AppState.autoPlay) {
          if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);
          AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, CONFIG.quizAutoPlayDelay);
        }
      }
    }, 1000);
  }

  function playFullShloka() {
    const index = AppState.currentIndex > 0 ? AppState.currentIndex - 1 : 0;
    if (AppState.playlist.length === 0 || index >= AppState.playlist.length) return;
    const trackNum = AppState.playlist[index];
    const padded = String(trackNum).padStart(3, '0');
    DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${padded}.mp3`;
    DOM.audioPlayer.playbackRate = AppState.currentSpeed;

    clearQuizTimers();
    DOM.quizStatus.textContent = `Answer: Shlok ${trackNum}`;
    DOM.quizStatus.style.color = 'var(--accent-blue)';
    DOM.countdown.textContent = '';

    DOM.audioPlayer.play().catch((err) => {
      console.error('Play error:', err);
      showToast('Failed to play track.');
    });

    if (AppState.autoPlay) {
      DOM.audioPlayer.onended = () => {
        if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);
        AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, 1000);
      };
    }
  }

  function toggleAutoPlay() {
    AppState.autoPlay = !AppState.autoPlay;
    DOM.autoPlayToggleBtn.innerHTML = `<i class="fa-solid fa-toggle-${AppState.autoPlay ? 'on' : 'off'}"></i> Auto-Play: ${AppState.autoPlay ? 'ON' : 'OFF'}`;
    toggleClass(DOM.autoPlayToggleBtn, 'btn-secondary', !AppState.autoPlay);
    toggleClass(DOM.autoPlayToggleBtn, 'btn-green', AppState.autoPlay);
  }

  function changeQuizTime(time) {
    AppState.currentQuizTime = time;
    DOM.quizTimeDisplay.textContent = `${time}s`;
  }

  function changeQuizDelay(delay) {
    AppState.currentQuizDelay = delay;
    DOM.quizDelayDisplay.textContent = `${delay}s`;
  }

  function clearQuizTimers() {
    if (AppState.countdownInterval) {
      clearInterval(AppState.countdownInterval);
      AppState.countdownInterval = null;
    }
    if (AppState.autoPlayTimeout) {
      clearTimeout(AppState.autoPlayTimeout);
      AppState.autoPlayTimeout = null;
    }
  }

  // --- 6. SELECTION & UTILS ---
  function handleTrackSelection(e) {
    const target = e.target;
    if (!target || target.type !== 'checkbox') return;
    const label = target.closest('label');
    if (label) toggleClass(label, 'selected', target.checked);

    // For mutual exclusivity between track and playlist
    if (target.classList.contains('trackBox') && target.checked) {
      document.querySelectorAll('.playlist-box').forEach(cb => {
        cb.checked = false;
        toggleClass(cb.closest('label'), 'selected', false);
      });
    } else if (target.classList.contains('playlist-box') && target.checked) {
      document.querySelectorAll('.trackBox').forEach(cb => {
        cb.checked = false;
        toggleClass(cb.closest('label'), 'selected', false);
      });
    }
    updateGroupButtonSelection();
    updateSavePlaylistButtonVisibility();
  }

  function getActiveSelection(mode = 'regular') {
    // For quiz mode, combine recents, playlists, tracks
    if (mode === 'quiz') {
      const recents = Array.from(document.querySelectorAll('.recent-box:checked')).map(cb => {
        const selStr = cb.dataset.selection;
        return selStr ? selStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)) : [];
      });

      const selectedRecents = recents.flat();

      const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));
      const selectedPlaylists = Array.from(document.querySelectorAll('.playlist-box:checked')).map(cb => {
        try {
          return JSON.parse(cb.dataset.selection);
        } catch {
          return [];
        }
      }).flat();

      const combinedSet = new Set([...selectedTracks, ...selectedPlaylists, ...selectedRecents]);
      return Array.from(combinedSet);
    }

    // Regular mode
    const selectedPlaylists = Array.from(document.querySelectorAll('.playlist-box:checked')).map(cb => {
      try {
        return JSON.parse(cb.dataset.selection);
      } catch {
        return [];
      }
    }).flat();

    if (selectedPlaylists.length > 0) {
      // Playlist selected
      return Array.from(new Set(selectedPlaylists));
    }

    // Else tracks
    return Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));
  }

  function selectRange() {
    const start = parseInt(DOM.rangeStart.value, 10);
    const end = parseInt(DOM.rangeEnd.value, 10);
    if (isNaN(start) || isNaN(end) || start < 1 || end > CONFIG.totalTracks || start > end) {
      showModal("Invalid range. Please enter valid start and end within 1 to " + CONFIG.totalTracks);
      return;
    }
    document.querySelectorAll('.trackBox').forEach(cb => {
      const val = parseInt(cb.value, 10);
      const isChecked = val >= start && val <= end;
      cb.checked = isChecked;
      toggleClass(cb.closest('label'), 'selected', isChecked);
    });
    updateGroupButtonSelection();
    updateSavePlaylistButtonVisibility();
  }

  // Save & Load Playlist
  function renderPersonalPlaylists() {
    if (!AppState.localStorageEnabled || !DOM.playlistList) return;
    let playlists = {};
    try {
      playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
    } catch {
      playlists = {};
    }
    DOM.playlistList.innerHTML = '';

    const names = Object.keys(playlists);
    if (names.length === 0) {
      DOM.playlistEmpty.classList.remove('hidden');
    } else {
      DOM.playlistEmpty.classList.add('hidden');
    }

    names.forEach(name => {
      const shlokas = playlists[name];
      const li = document.createElement('li');
      li.className = 'space-y-2';

      const labelEl = document.createElement('label');
      labelEl.className = 'selectable-item playlist-item block p-3 container-card cursor-pointer flex items-center justify-between';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'playlist-box mr-2';
      checkbox.dataset.selection = JSON.stringify(shlokas);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'ml-6 font-semibold';
      nameSpan.textContent = name;

      labelEl.appendChild(checkbox);
      labelEl.appendChild(nameSpan);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex items-center space-x-2 text-sm text-gray-400';

      const countSpan = document.createElement('span');
      countSpan.textContent = `(${shlokas.length} shlokas)`;

      const loadBtn = document.createElement('button');
      loadBtn.className = 'text-xs px-2 py-1 btn-secondary rounded-full';
      loadBtn.textContent = 'Load';
      loadBtn.type = 'button';
      loadBtn.onclick = () => loadPlaylist(name);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'text-xs px-2 py-1 btn-red rounded-full';
      deleteBtn.textContent = 'Delete';
      deleteBtn.type = 'button';
      deleteBtn.onclick = () => confirmDeletePlaylist(name);

      actionsDiv.appendChild(countSpan);
      actionsDiv.appendChild(loadBtn);
      actionsDiv.appendChild(deleteBtn);
      labelEl.appendChild(actionsDiv);
      li.appendChild(labelEl);
      DOM.playlistList.appendChild(li);
    });
  }

  function loadPlaylist(name) {
    if (!AppState.localStorageEnabled) return;
    let playlists = {};
    try {
      playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
    } catch {
      playlists = {};
    }
    const shlokas = playlists[name];
    if (!shlokas) return;
    // clear current selection
    clearSelection();

    shlokas.forEach(trackNum => {
      const checkbox = document.querySelector(`.trackBox[value="${trackNum}"]`);
      if (checkbox) {
        checkbox.checked = true;
        toggleClass(checkbox.closest('label'), 'selected', true);
      }
    });
    updateGroupButtonSelection();
    updateSavePlaylistButtonVisibility();
    showToast(`Playlist "${name}" loaded!`);
  }

  function deletePlaylist(name) {
    if (!AppState.localStorageEnabled) return;
    let playlists = {};
    try {
      playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
    } catch {
      playlists = {};
    }
    delete playlists[name];
    localStorage.setItem('personalPlaylists', JSON.stringify(playlists));
    renderPersonalPlaylists();
    showToast(`Playlist "${name}" deleted.`);
  }

  function showSavePlaylistModal() {
    if (!AppState.localStorageEnabled) {
      showModal('Local storage is disabled. Cannot save playlist.');
      return;
    }
    const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));
    if (selectedTracks.length === 0) {
      showModal('Select at least one shlok to save playlist.');
      return;
    }

    // Create modal
    DOM.modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal fade-in';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="modal-content" role="document">
        <button class="modal-close" aria-label="Close">&times;</button>
        <h3 class="text-xl font-bold mb-4">Save Playlist</h3>
        <input type="text" id="playlistNameInput" class="w-full mb-4" placeholder="My playlist" aria-label="Playlist Name">
        <div id="playlistNameFeedback" class="text-red-400 font-semibold hidden mb-4"></div>
        <div class="flex gap-4 justify-end">
          <button class="px-4 py-3 btn-secondary rounded-full" id="modal-cancel" type="button">Cancel</button>
          <button class="px-4 py-3 btn-green rounded-full" id="savePlaylistConfirm" type="button">Save</button>
        </div>
      </div>
    `;
    DOM.modalContainer.appendChild(modal);

    const inputEl = document.getElementById('playlistNameInput');
    const saveBtn = document.getElementById('savePlaylistConfirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const feedbackEl = document.getElementById('playlistNameFeedback');

    function closeModal() {
      toggleClass(modal, 'fade-in', false);
      toggleClass(modal, 'fade-out', true);
      modal.addEventListener('animationend', () => modal.remove(), { once: true });
    }

    saveBtn.onclick = () => {
      const name = inputEl.value.trim();
      if (name === '') {
        feedbackEl.textContent = 'Name cannot be empty.';
        toggleClass(feedbackEl, 'hidden', false);
        return;
      }

      // Save playlist
      let playlists = {};
      try {
        playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
      } catch {
        playlists = {};
      }

      if (playlists[name]) {
        feedbackEl.textContent = 'Name exists.';
        toggleClass(feedbackEl, 'hidden', false);
        return;
      }

      playlists[name] = selectedTracks;
      localStorage.setItem('personalPlaylists', JSON.stringify(playlists));
      renderPersonalPlaylists();
      showToast(`Playlist "${name}" saved!`);
      closeModal();
    };

    document.querySelector('.modal-close').onclick = closeModal;
    cancelBtn.onclick = closeModal;
    inputEl.onkeydown = (e) => {
      if (e.key === 'Enter') saveBtn.onclick();
    };
    inputEl.focus();
  }

  function confirmDeletePlaylist(name) {
    showModal(`Delete playlist "${name}"?`, () => deletePlaylist(name));
  }

  // --- 7. UTILITIES ---
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    if (DOM.toastContainer) {
      DOM.toastContainer.appendChild(toast);
      setTimeout(() => {
        toggleClass(toast, 'fadeOut', true);
        toast.addEventListener('animationend', () => toast.remove());
      }, CONFIG.toastDuration - 300);
    }
  }

  function showModal(message, onConfirm = null) {
    if (!DOM.modalContainer) return;
    DOM.modalContainer.innerHTML = '';
    const modal = document.createElement('div');
    modal.className = 'modal fade-in';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const buttonsHtml = onConfirm
      ? `<div class="flex justify-center gap-4 mt-6">
           <button id="modal-confirm" class="btn-rounded btn-primary px-8">Yes</button>
           <button id="modal-cancel" class="btn-rounded btn-secondary px-6">Cancel</button>
         </div>`
      : `<div class="mt-6"><button id="modal-cancel" class="btn-rounded btn-primary">OK</button></div>`;

    modal.innerHTML = `
      <div class="modal-content" role="document">
        <button class="modal-close" aria-label="Close">&times;</button>
        <p class="text-lg">${escapeHtml(message)}</p>
        ${buttonsHtml}
      </div>
    `;
    DOM.modalContainer.appendChild(modal);

    setTimeout(() => {
      const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable) focusable.focus();
    }, 0);

    const closeModal = () => {
      toggleClass(modal, 'fade-in', false);
      toggleClass(modal, 'fade-out', true);
      modal.addEventListener('animationend', () => modal.remove(), { once: true });
    };

    modal.querySelector('.modal-close').onclick = closeModal;
    const cancelBtn = document.getElementById('modal-cancel');
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (onConfirm) {
      document.getElementById('modal-confirm').onclick = () => {
        onConfirm();
        closeModal();
      };
    }
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  // --- 8. RESTORE & SAVE ---
  function restoreLastSelection() {
    if (!AppState.localStorageEnabled) return;
    const lastSelection = localStorage.getItem('lastSelection');
    if (lastSelection) {
      const tracks = lastSelection.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      tracks.forEach(trackNum => {
        const checkbox = document.querySelector(`.trackBox[value="${trackNum}"]`);
        if (checkbox) {
          checkbox.checked = true;
          toggleClass(checkbox.closest('label'), 'selected', true);
        }
      });
      updateGroupButtonSelection();
      updateSavePlaylistButtonVisibility();
    }
  }

  function renderRecentSelections() {
    if (!DOM.recentList || !AppState.localStorageEnabled) return;
    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('recentSelections')) || [];
    } catch {
      recents = [];
    }
    DOM.recentList.innerHTML = '';
    toggleClass(DOM.recentlyPlayed, 'hidden', recents.length === 0);
    toggleClass(DOM.recentEmpty, 'hidden', recents.length > 0);
    recents.forEach(str => {
      const shlokas = str.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      if (shlokas.length === 0) return;
      const li = document.createElement('li');
      const label = document.createElement('label');
      label.className = 'selectable-item recent-item block p-3 container-card cursor-pointer flex items-center justify-between';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'recent-box mr-2';
      checkbox.dataset.selection = str;

      let content;
      if (shlokas.length === 1) {
        content = `Shlok ${shlokas[0]}`;
      } else if (shlokas.every((v, i, arr) => i === 0 || v === arr[i - 1] + 1)) {
        content = `Range: ${shlokas[0]} - ${shlokas[shlokas.length - 1]}`;
      } else {
        content = `Custom (${shlokas.length})`;
      }

      const spanName = document.createElement('span');
      spanName.className = 'ml-6 font-semibold';
      spanName.textContent = content;

      label.appendChild(checkbox);
      label.appendChild(spanName);

      const countSpan = document.createElement('div');
      countSpan.className = 'text-sm text-gray-400';
      countSpan.textContent = `(${shlokas.length})`;

      label.appendChild(countSpan);
      li.appendChild(label);
      DOM.recentList.appendChild(li);
    });
  }

  function saveSelection(selection) {
    if (!AppState.localStorageEnabled) return;
    localStorage.setItem('lastSelection', selection.join(','));
    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('recentSelections')) || [];
    } catch {
      recents = [];
    }
    const selStr = selection.join(',');
    recents = recents.filter(s => s !== selStr);
    recents.unshift(selStr);
    recents = recents.slice(0, CONFIG.maxRecentSelections);
    localStorage.setItem('recentSelections', JSON.stringify(recents));
    renderRecentSelections();
  }

  // --- 9. Mode & Timer ---
  function toggleMode() {
    AppState.isQuizMode = !AppState.isQuizMode;
    toggleClass(DOM.quizControls, 'hidden', !AppState.isQuizMode);
    toggleClass(DOM.regularControls, 'hidden', AppState.isQuizMode);
    DOM.toggleModeBtn.innerHTML = `<i class="fa-solid fa-toggle-${AppState.isQuizMode ? 'on' : 'off'}"></i> ${AppState.isQuizMode ? 'Exit Quiz Mode' : 'Toggle to Quiz Mode'}`;
    DOM.audioPlayer.pause();
    DOM.audioPlayer.src = '';
    clearQuizTimers();

    if (AppState.isQuizMode) {
      AppState.playlist = [];
      AppState.currentIndex = 0;
      DOM.playFullBtn.classList.add('hidden');
      DOM.countdownBar.style.width = '100%';
      DOM.currentShlokQuiz.textContent = 'Shlok 0';
    } else {
      DOM.quizStatus.textContent = '';
      DOM.countdown.textContent = '';
    }
    updateSavePlaylistButtonVisibility();
  }

  function playNextQuizTrack() {
    const selected = getActiveSelection('quiz');
    if (selected.length === 0) {
      showModal('Select shlokas, playlist, or recent to quiz on.');
      return;
    }
    if (AppState.playlist.length === 0 || AppState.currentIndex >= AppState.playlist.length) {
      AppState.playlist = [...selected].sort(() => Math.random() - 0.5);
      AppState.currentIndex = 0;
    }
    clearQuizTimers();
    DOM.quizStatus.textContent = '';
    DOM.playFullBtn.classList.add('hidden');

    const trackNum = AppState.playlist[AppState.currentIndex];
    const padded = String(trackNum).padStart(3, '0');
    DOM.currentShlokQuiz.textContent = `Now playing: Shlok ${trackNum}`;
    DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${padded}.mp3`;
    DOM.audioPlayer.playbackRate = AppState.currentSpeed;

    AppState.hasQuizPaused = false;
    DOM.countdownBar.style.width = '100%';

    DOM.audioPlayer.play().catch(err => {
      console.error('Play error:', err);
      showToast('Failed to play track.');
    });
    AppState.currentIndex++;
  }

  function startQuizCountdown() {
    let timeLeft = AppState.currentQuizTime;
    DOM.countdownBar.style.width = '0%';
    DOM.quizStatus.textContent = "What's the shlok number?";
    DOM.quizStatus.style.color = 'var(--accent-green)';
    if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
    AppState.countdownInterval = setInterval(() => {
      timeLeft--;
      DOM.countdown.textContent = `(${timeLeft}s)`;
      DOM.countdownBar.style.width = `${(timeLeft / AppState.currentQuizTime) * 100}%`;
      if (timeLeft <= 0) {
        clearInterval(AppState.countdownInterval);
        AppState.countdownInterval = null;
        DOM.quizStatus.textContent = "Time's up!";
        DOM.quizStatus.style.color = 'var(--accent-red)';
        DOM.countdown.textContent = '';
        if (AppState.autoPlay) {
          if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);
          AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, CONFIG.quizAutoPlayDelay);
        }
      }
    }, 1000);
  }

  function playFullShloka() {
    const idx = AppState.currentIndex > 0 ? AppState.currentIndex - 1 : 0;
    if (AppState.playlist.length === 0 || idx >= AppState.playlist.length) return;
    const trackNum = AppState.playlist[idx];
    const padded = String(trackNum).padStart(3, '0');
    DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${padded}.mp3`;
    DOM.audioPlayer.playbackRate = AppState.currentSpeed;
    DOM.audioPlayer.play().catch(err => {
      console.error('Play error:', err);
      showToast('Failed to play track.');
    });
    DOM.quizStatus.textContent = `Answer: Shlok ${trackNum}`;
    DOM.quizStatus.style.color = 'var(--accent-blue)';
    DOM.countdown.textContent = '';

    if (AppState.autoPlay) {
      DOM.audioPlayer.onended = () => {
        if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);
        AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, 1000);
      };
    }
  }

  function toggleAutoPlay() {
    AppState.autoPlay = !AppState.autoPlay;
    DOM.autoPlayToggleBtn.innerHTML = `<i class="fa-solid fa-toggle-${AppState.autoPlay ? 'on' : 'off'}"></i> Auto-Play: ${AppState.autoPlay ? 'ON' : 'OFF'}`;
    toggleClass(DOM.autoPlayToggleBtn, 'btn-secondary', !AppState.autoPlay);
    toggleClass(DOM.autoPlayToggleBtn, 'btn-green', AppState.autoPlay);
  }

  function changeQuizTime(time) {
    AppState.currentQuizTime = time;
    DOM.quizTimeDisplay.textContent = `${time}s`;
  }

  function changeQuizDelay(delay) {
    AppState.currentQuizDelay = delay;
    DOM.quizDelayDisplay.textContent = `${delay}s`;
  }

  function clearQuizTimers() {
    if (AppState.countdownInterval) {
      clearInterval(AppState.countdownInterval);
      AppState.countdownInterval = null;
    }
    if (AppState.autoPlayTimeout) {
      clearTimeout(AppState.autoPlayTimeout);
      AppState.autoPlayTimeout = null;
    }
  }

  // --- 10. UI & Reset ---
  function handleSearch() {
    const query = DOM.search.value.trim();
    toggleClass(DOM.clearSearch, 'hidden', query.length === 0);
    toggleClass(DOM.searchFeedback, 'hidden', true);
    const items = DOM.trackList.querySelectorAll('li');
    let found = false;
    items.forEach(li => {
      const checkbox = li.querySelector('.trackBox');
      const num = parseInt(checkbox.value, 10);
      const match = isNaN(num) ? false : (num === parseInt(query, 10));
      toggleClass(li, 'hidden', query.length > 0 && !match);
      if (match) found = true;
    });
    toggleClass(DOM.searchFeedback, 'hidden', !found);
  }

  function getActiveSelection(mode='regular') {
    if (mode === 'quiz') {
      // recents
      const recents = Array.from(document.querySelectorAll('.recent-box:checked')).map(cb => {
        const selStr = cb.dataset.selection;
        return selStr ? selStr.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)) : [];
      });
      const recentsFlat = recents.flat();

      // playlist
      const playlists = Array.from(document.querySelectorAll('.playlist-box:checked')).map(cb => {
        try { return JSON.parse(cb.dataset.selection); } catch { return []; }
      }).flat();

      // tracks
      const tracks = Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));

      const allSet = new Set([...tracks, ...playlists, ...recentsFlat]);
      return Array.from(allSet);
    }

    // Regular mode: prioritize playlist, then tracks
    const playlists = Array.from(document.querySelectorAll('.playlist-box:checked')).map(cb => {
      try { return JSON.parse(cb.dataset.selection); } catch { return []; }
    }).flat();
    if (playlists.length > 0) {
      return Array.from(new Set(playlists));
    }
    return Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));
  }

  function confirmClearSelection() {
    showModal('Clear current selection?', () => {
      clearSelection();
    });
  }

  function clearSelection() {
    document.querySelectorAll('.trackBox:checked, .playlist-box:checked, .recent-box:checked').forEach(cb => {
      cb.checked = false;
      toggleClass(cb.closest('label'), 'selected', false);
    });
    updateGroupButtonSelection();
    updateSavePlaylistButtonVisibility();
    showToast('Selection cleared.');
  }

  function confirmClearHistory() {
    showModal('Clear recent history?', () => {
      localStorage.removeItem('recentSelections');
      renderRecentSelections();
      showToast('Recent history cleared.');
    });
  }

  // Save playlist
  function saveSelection(selection) {
    if (!AppState.localStorageEnabled) return;
    localStorage.setItem('lastSelection', selection.join(','));
    let recents = [];
    try {
      recents = JSON.parse(localStorage.getItem('recentSelections')) || [];
    } catch {
      recents = [];
    }
    const selStr = selection.join(',');
    recents = recents.filter(s => s !== selStr);
    recents.unshift(selStr);
    recents = recents.slice(0, CONFIG.maxRecentSelections);
    localStorage.setItem('recentSelections', JSON.stringify(recents));
    renderRecentSelections();
  }

  // --- 11. BEGIN ---
  init();
});
