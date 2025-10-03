document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE & CONFIGURATION ---
    const CONFIG = {
        audioBaseUrl: 'https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_',
        totalTracks: 315,
        maxRecentSelections: 5,
        toastDuration: 4000,
        quizAutoPlayDelay: 1500
    };

    // Centralized Application State
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
        personalPlaylists: {}
    };

    // Cached DOM Elements
    const DOM = {
        // Main Player & Lists
        audioPlayer: null,
        trackList: null,
        groups: null,

        // Search & Range
        search: null,
        clearSearch: null,
        searchFeedback: null,
        rangeStart: null,
        rangeEnd: null,
        selectRangeBtn: null,

        // Mode Toggling & Main Buttons
        toggleGroupsBtn: null,
        groupToggleIcon: null,
        toggleModeBtn: null,
        playSelectedBtn: null,
        clearSelectionBtn: null,

        // Control Wrappers
        quizControls: null,
        regularControls: null,

        // Regular Mode Controls
        repeatCount: null,
        shuffle: null,
        repeatPlaylist: null,
        speedSlider: null,
        speedDisplay: null,

        // Quiz Mode Controls
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

        // Playlists & Recents
        playlistList: null,
        playlistEmpty: null,
        savePlaylistContainer: null,
        showSaveModalBtn: null,
        recentlyPlayed: null,
        recentList: null,
        recentEmpty: null,
        clearHistoryBtn: null,

        // UI Feedback
        toastContainer: null,
        modalContainer: null
    };

    // Utility function for toggling classes
    function toggleClass(element, className, condition = null) {
        if (condition === null) {
            element.classList.toggle(className);
        } else {
            element.classList.toggle(className, condition);
        }
    }

    // --- 2. INITIALIZATION ---
    function initApp() {
        cacheDOMElements();
        checkLocalStorage();
        initEventListeners();
        generateTrackList();
        generateGroups();

        if (AppState.localStorageEnabled) {
            restoreLastSelection();
            renderRecentSelections();
            renderPersonalPlaylists();
        } else {
            showToast("Local storage is disabled. Playlists and history will not be saved.");
        }

        updateSavePlaylistButtonVisibility();
    }

    function cacheDOMElements() {
        // Assign DOM elements
        DOM.audioPlayer = document.getElementById('audioPlayer');
        DOM.trackList = document.getElementById('trackList');
        DOM.groups = document.getElementById('groups');

        DOM.search = document.getElementById('search');
        DOM.clearSearch = document.getElementById('clearSearch');
        DOM.searchFeedback = document.getElementById('search-feedback');
        DOM.rangeStart = document.getElementById('rangeStart');
        DOM.rangeEnd = document.getElementById('rangeEnd');
        DOM.selectRangeBtn = document.getElementById('selectRangeBtn');

        DOM.toggleGroupsBtn = document.getElementById('toggleGroupsBtn');
        DOM.groupToggleIcon = document.getElementById('group-toggle-icon');
        DOM.toggleModeBtn = document.getElementById('toggleModeBtn');
        DOM.playSelectedBtn = document.getElementById('playSelectedBtn');
        DOM.clearSelectionBtn = document.getElementById('clearSelectionBtn');

        DOM.quizControls = document.getElementById('quizControls');
        DOM.regularControls = document.getElementById('regularControls');

        DOM.repeatCount = document.getElementById('repeatCount');
        DOM.shuffle = document.getElementById('shuffle');
        DOM.repeatPlaylist = document.getElementById('repeatPlaylist');
        DOM.speedSlider = document.getElementById('speedSlider');
        DOM.speedDisplay = document.getElementById('speedDisplay');

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

        DOM.playlistList = document.getElementById('playlistList');
        DOM.playlistEmpty = document.getElementById('playlist-empty');
        DOM.savePlaylistContainer = document.getElementById('savePlaylistBtn');
        DOM.showSaveModalBtn = document.getElementById('showSaveModalBtn');
        DOM.recentlyPlayed = document.getElementById('recentlyPlayed');
        DOM.recentList = document.getElementById('recentList');
        DOM.recentEmpty = document.getElementById('recent-empty');
        DOM.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        DOM.toastContainer = document.getElementById('toast-container');
        DOM.modalContainer = document.getElementById('modal-container');
    }

    function initEventListeners() {
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

        // Toggle group display
        DOM.toggleGroupsBtn.addEventListener('click', toggleGroupDisplay);

        // Mode & Playback
        DOM.toggleModeBtn.addEventListener('click', toggleMode);
        DOM.playSelectedBtn.addEventListener('click', playSelected);
        DOM.clearSelectionBtn.addEventListener('click', confirmClearSelection);
        DOM.speedSlider.addEventListener('input', () => changeSpeed(parseFloat(DOM.speedSlider.value)));

        // Quiz controls
        DOM.quizTimeSlider.addEventListener('input', () => changeQuizTime(parseInt(DOM.quizTimeSlider.value)));
        DOM.quizDelaySlider.addEventListener('input', () => changeQuizDelay(parseInt(DOM.quizDelaySlider.value)));
        DOM.autoPlayToggleBtn.addEventListener('click', toggleAutoPlay);
        DOM.playFullBtn.addEventListener('click', playFullShloka);
        DOM.playNextQuizBtn.addEventListener('click', playNextQuizTrack);

        // Playlist & history
        DOM.showSaveModalBtn.addEventListener('click', showSavePlaylistModal);
        DOM.clearHistoryBtn.addEventListener('click', confirmClearHistory);

        // Event delegation for track selection
        DOM.trackList.addEventListener('change', handleTrackSelection);
        DOM.recentList.addEventListener('change', handleRecentSelection);
        DOM.playlistList.addEventListener('change', handlePlaylistSelection);
    }

    function checkLocalStorage() {
        try {
            const test = '__localStorageTest__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            AppState.localStorageEnabled = true;
        } catch (e) {
            AppState.localStorageEnabled = false;
            console.warn("Local storage is disabled. Playlists and history will not be saved.");
        }
    }

    // --- 3. UI GENERATION & UPDATES ---
    function generateTrackList() {
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= CONFIG.totalTracks; i++) {
            const li = document.createElement('li');
            const label = document.createElement('label');
            label.className = 'track-item block p-3 text-white';

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
        // hide save button if no selection or quiz mode
        DOM.savePlaylistContainer.classList.toggle('hidden', selectedTracks.size === 0 || AppState.isQuizMode);
    }

    function updateSavePlaylistButtonVisibility() {
        const selectedCount = document.querySelectorAll('.trackBox:checked').length;
        DOM.savePlaylistContainer.classList.toggle('hidden', selectedCount === 0 || AppState.isQuizMode);
    }

    // --- 4. CORE PLAYER LOGIC ---
    function playCurrent() {
        if (AppState.currentIndex < AppState.playlist.length) {
            const trackNum = AppState.playlist[AppState.currentIndex];
            const paddedNum = String(trackNum).padStart(3, '0');
            DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${paddedNum}.mp3`;
            DOM.audioPlayer.playbackRate = AppState.currentSpeed;
            DOM.audioPlayer.play().catch(err => {
                console.error('Play error:', err);
                showToast('Failed to play track. Check connection.');
            });
        } else if (DOM.repeatPlaylist.checked) {
            AppState.currentIndex = 0;
            AppState.repeatCounter = 0;
            playCurrent();
        } else {
            DOM.audioPlayer.pause();
            DOM.audioPlayer.src = '';
            showToast('Playlist finished.');
        }
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
        showToast('An error occurred while loading the audio.');
    }

    function playSelected() {
        const finalSelection = getActiveSelection('regular');
        if (finalSelection.length === 0) {
            showModal('Please select at least one shlok or a playlist to play.');
            return;
        }

        AppState.repeatEach = parseInt(DOM.repeatCount.value, 10) || 1;
        AppState.playlist = [...finalSelection];

        if (DOM.shuffle.checked) {
            AppState.playlist.sort(() => Math.random() - 0.5);
        }

        AppState.currentIndex = 0;
        AppState.repeatCounter = 0;

        if (AppState.localStorageEnabled) {
            saveSelection(finalSelection);
        }

        playCurrent();
        showToast('Playback started.');
    }

    function changeSpeed(speed) {
        AppState.currentSpeed = speed;
        DOM.audioPlayer.playbackRate = AppState.currentSpeed;
        DOM.speedDisplay.textContent = AppState.currentSpeed.toFixed(1);
    }

    // --- 5. QUIZ MODE LOGIC ---
    function toggleMode() {
        AppState.isQuizMode = !AppState.isQuizMode;

        const showQuiz = AppState.isQuizMode;
        toggleClass(DOM.quizControls, 'hidden', !showQuiz);
        toggleClass(DOM.regularControls, 'hidden', showQuiz);

        // toggle button text/icon
        DOM.toggleModeBtn.innerHTML = `<i class="fa-solid fa-toggle-${showQuiz ? 'on' : 'off'}"></i> ${showQuiz ? 'Exit Quiz Mode' : 'Toggle to Quiz Mode'}`;

        // Stop all activity on mode switch
        DOM.audioPlayer.pause();
        DOM.audioPlayer.src = '';
        clearQuizTimers();

        if (showQuiz) {
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
            showModal('Please select shlokas, a playlist, or a recent entry to quiz on!');
            return;
        }

        if (AppState.playlist.length === 0 || AppState.currentIndex >= AppState.playlist.length) {
            // shuffle selected
            AppState.playlist = [...selected].sort(() => Math.random() - 0.5);
            AppState.currentIndex = 0;
        }

        clearQuizTimers();
        DOM.quizStatus.textContent = '';
        DOM.playFullBtn.classList.add('hidden');

        const trackNum = AppState.playlist[AppState.currentIndex];
        const paddedNum = String(trackNum).padStart(3, '0');
        DOM.currentShlokQuiz.textContent = `Now playing: Shlok ${trackNum}`;
        DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${paddedNum}.mp3`;
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

        // clear previous
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
        const trackIndex = AppState.currentIndex > 0 ? AppState.currentIndex - 1 : 0;
        const trackNum = AppState.playlist[trackIndex];
        const paddedNum = String(trackNum).padStart(3, '0');
        DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${paddedNum}.mp3`;
        DOM.audioPlayer.playbackRate = AppState.currentSpeed;

        clearQuizTimers();

        DOM.quizStatus.textContent = `Answer: Shlok ${trackNum}`;
        DOM.quizStatus.style.color = 'var(--accent-blue)';
        DOM.countdown.textContent = '';

        DOM.audioPlayer.play().catch(err => {
            console.error('Play error:', err);
            showToast('Failed to play track.');
        });

        if (AppState.autoPlay) {
            DOM.audioPlayer.onended = () => {
                if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);
                AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, 1000);
            };
        }
        // No need for reset current index here
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

    // --- 6. SELECTION & UI HANDLERS ---
    function getActiveSelection(mode = 'regular') {
        // handle playlist box
        const selectedPlaylists = Array.from(document.querySelectorAll('.playlist-box:checked')).map(cb => JSON.parse(cb.dataset.selection));
        if (selectedPlaylists.length > 0) {
            const playlistShlokas = new Set(selectedPlaylists.flat());
            return Array.from(playlistShlokas);
        }

        // handle recent box
        if (mode === 'quiz') {
            const selectedRecents = Array.from(document.querySelectorAll('.recent-box:checked')).map(cb => cb.dataset.selection.split(',').map(n => parseInt(n.trim(), 10)));
            if (selectedRecents.length > 0) {
                const recentShlokas = new Set(selectedRecents.flat());
                return Array.from(recentShlokas);
            }
        }

        // default track box
        return Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));
    }

    function selectRange() {
        const start = parseInt(DOM.rangeStart.value, 10);
        const end = parseInt(DOM.rangeEnd.value, 10);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= CONFIG.totalTracks && start <= end) {
            document.querySelectorAll('.trackBox').forEach(cb => {
                const val = parseInt(cb.value, 10);
                const isChecked = val >= start && val <= end;
                cb.checked = isChecked;
                toggleClass(cb.closest('label'), 'selected', isChecked);
            });
            updateGroupButtonSelection();
        } else {
            showModal("Please enter a valid shlok range (e.g., 1-10).");
        }
    }

    function renderPersonalPlaylists() {
        if (!AppState.localStorageEnabled) return;
        let playlists = {};
        try {
            playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
        } catch (e) {
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
            labelEl.className = 'playlist-item block p-3 container-card cursor-pointer flex items-center justify-between';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'playlist-box mr-2';
            checkbox.setAttribute('data-selection', JSON.stringify(shlokas));

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
            loadBtn.setAttribute('type', 'button');
            loadBtn.addEventListener('click', () => loadPlaylist(name));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'text-xs px-2 py-1 btn-red rounded-full';
            deleteBtn.textContent = 'Delete';
            deleteBtn.setAttribute('type', 'button');
            deleteBtn.addEventListener('click', () => confirmDeletePlaylist(name));

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
        } catch (e) {
            playlists = {};
        }
        const shlokas = playlists[name];
        if (shlokas) {
            clearSelection();
            shlokas.forEach(trackNum => {
                const checkbox = document.querySelector(`.trackBox[value="${trackNum}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    toggleClass(checkbox.closest('label'), 'selected', true);
                }
            });
            updateGroupButtonSelection();
            showToast(`Playlist "${name}" loaded into your selection!`);
        }
    }

    function deletePlaylist(name) {
        if (!AppState.localStorageEnabled) return;
        let playlists = {};
        try {
            playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
        } catch (e) {
            playlists = {};
        }
        delete playlists[name];
        localStorage.setItem('personalPlaylists', JSON.stringify(playlists));
        renderPersonalPlaylists();
    }

    function showSavePlaylistModal() {
        if (!AppState.localStorageEnabled) {
            showModal("Local storage is not enabled or available in your browser. Cannot save playlists.");
            return;
        }
        const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked')).map(cb => parseInt(cb.value, 10));
        if (selectedTracks.length === 0) {
            showModal("Please select at least one shlok to save as a playlist.");
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
                <p class="mb-2">Enter a name for your playlist:</p>
                <input type="text" id="playlistNameInput" class="w-full mb-4" placeholder="My new playlist" aria-label="Playlist Name">
                <div id="playlistNameFeedback" class="text-red-400 font-semibold hidden mb-4"></div>
                <div class="flex gap-4 justify-end">
                    <button class="px-4 py-3 btn-secondary text-white btn-rounded" id="modal-cancel" type="button">Cancel</button>
                    <button class="px-4 py-3 btn-green text-white btn-rounded" id="savePlaylistConfirm" type="button">Save</button>
                </div>
            </div>
        `;

        DOM.modalContainer.appendChild(modal);

        const inputEl = document.getElementById('playlistNameInput');
        const saveBtnEl = document.getElementById('savePlaylistConfirm');
        const cancelBtnEl = document.getElementById('modal-cancel');
        const closeBtnEl = modal.querySelector('.modal-close');
        const feedbackEl = document.getElementById('playlistNameFeedback');

        function closeModal() {
            toggleClass(modal, 'fade-in', false);
            toggleClass(modal, 'fade-out', true);
            modal.addEventListener('animationend', () => modal.remove(), {once: true});
        }

        function savePlaylist() {
            const playlistName = inputEl.value.trim();
            if (playlistName === '') {
                feedbackEl.textContent = 'Playlist name cannot be empty.';
                toggleClass(feedbackEl, 'hidden', false);
                return;
            }
            let playlists = {};
            try {
                playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
            } catch (e) {
                playlists = {};
            }
            if (playlists[playlistName]) {
                feedbackEl.textContent = 'A playlist with this name already exists.';
                toggleClass(feedbackEl, 'hidden', false);
                return;
            }
            playlists[playlistName] = selectedTracks;
            localStorage.setItem('personalPlaylists', JSON.stringify(playlists));
            renderPersonalPlaylists();
            showToast(`Playlist "${playlistName}" saved!`);
            closeModal();
        }

        // Event listeners
        saveBtnEl.addEventListener('click', savePlaylist);
        cancelBtnEl.addEventListener('click', closeModal);
        closeBtnEl.addEventListener('click', closeModal);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') savePlaylist();
        });

        inputEl.focus();
    }

    // --- 7. UTILITY FUNCTIONS ---
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        toast.textContent = message;
        DOM.toastContainer.appendChild(toast);
        setTimeout(() => {
            toggleClass(toast, 'fadeOut', true);
            toast.addEventListener('animationend', () => toast.remove());
        }, CONFIG.toastDuration - 300);
    }

    function showModal(message, onConfirm = null) {
        DOM.modalContainer.innerHTML = '';

        const modal = document.createElement('div');
        modal.className = 'modal fade-in';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        let buttonsHtml = onConfirm
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

        // Focus trap
        setTimeout(() => {
            const focusable = modal.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusable) focusable.focus();
        }, 0);

        const closeModal = () => {
            toggleClass(modal, 'fade-in', false);
            toggleClass(modal, 'fade-out', true);
            modal.addEventListener('animationend', () => modal.remove(), {once: true});
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

    // --- 8. GLOBAL FUNCTION EXPOSURE ---
    window.loadPlaylistGlobal = loadPlaylist;
    window.confirmDeletePlaylistGlobal = confirmDeletePlaylist;

    // --- 9. KICK OFF THE APP ---
    initApp();
});
