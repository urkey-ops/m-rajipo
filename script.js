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

    // Cached DOM Elements for Performance
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
        // Main Player & Lists
        DOM.audioPlayer = document.getElementById('audioPlayer');
        DOM.trackList = document.getElementById('trackList');
        DOM.groups = document.getElementById('groups');
        
        // Search & Range
        DOM.search = document.getElementById('search');
        DOM.clearSearch = document.getElementById('clearSearch');
        DOM.searchFeedback = document.getElementById('search-feedback');
        DOM.rangeStart = document.getElementById('rangeStart');
        DOM.rangeEnd = document.getElementById('rangeEnd');
        DOM.selectRangeBtn = document.getElementById('selectRangeBtn');
        
        // Mode Toggling & Main Buttons
        DOM.toggleGroupsBtn = document.getElementById('toggleGroupsBtn');
        DOM.groupToggleIcon = document.getElementById('group-toggle-icon');
        DOM.toggleModeBtn = document.getElementById('toggleModeBtn');
        DOM.playSelectedBtn = document.getElementById('playSelectedBtn');
        DOM.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        
        // Control Wrappers
        DOM.quizControls = document.getElementById('quizControls');
        DOM.regularControls = document.getElementById('regularControls');
        
        // Regular Mode Controls
        DOM.repeatCount = document.getElementById('repeatCount');
        DOM.shuffle = document.getElementById('shuffle');
        DOM.repeatPlaylist = document.getElementById('repeatPlaylist');
        DOM.speedSlider = document.getElementById('speedSlider');
        DOM.speedDisplay = document.getElementById('speedDisplay');
        
        // Quiz Mode Controls
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
        DOM.savePlaylistContainer = document.getElementById('savePlaylistBtn');
        DOM.showSaveModalBtn = document.getElementById('showSaveModalBtn');
        DOM.recentlyPlayed = document.getElementById('recentlyPlayed');
        DOM.recentList = document.getElementById('recentList');
        DOM.recentEmpty = document.getElementById('recent-empty');
        DOM.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // UI Feedback
        DOM.toastContainer = document.getElementById('toast-container');
        DOM.modalContainer = document.getElementById('modal-container');
    }

    function initEventListeners() {
        // Player events
        DOM.audioPlayer.addEventListener('ended', handleTrackEnd);
        DOM.audioPlayer.addEventListener('playing', handleAudioPlaying);
        DOM.audioPlayer.addEventListener('error', handleAudioError);

        // Search & Control events
        DOM.search.addEventListener('input', handleSearch);
        DOM.clearSearch.addEventListener('click', () => {
            DOM.search.value = '';
            handleSearch();
            DOM.search.focus();
        });
        DOM.selectRangeBtn.addEventListener('click', selectRange);
        DOM.toggleGroupsBtn.addEventListener('click', toggleGroupDisplay);
        
        // Mode & Playback events
        DOM.toggleModeBtn.addEventListener('click', toggleMode);
        DOM.playSelectedBtn.addEventListener('click', playSelected);
        DOM.clearSelectionBtn.addEventListener('click', confirmClearSelection);
        DOM.speedSlider.addEventListener('input', () => changeSpeed(parseFloat(DOM.speedSlider.value)));

        // Quiz events
        DOM.quizTimeSlider.addEventListener('input', () => changeQuizTime(parseInt(DOM.quizTimeSlider.value)));
        DOM.quizDelaySlider.addEventListener('input', () => changeQuizDelay(parseInt(DOM.quizDelaySlider.value)));
        DOM.autoPlayToggleBtn.addEventListener('click', toggleAutoPlay);
        DOM.playFullBtn.addEventListener('click', playFullShloka);
        DOM.playNextQuizBtn.addEventListener('click', playNextQuizTrack);

        // Playlist & History events
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
        const isHidden = DOM.groups.classList.toggle("hidden");
        DOM.groupToggleIcon.classList.toggle("fa-chevron-down", isHidden);
        DOM.groupToggleIcon.classList.toggle("fa-chevron-up", !isHidden);
    }

    function updateGroupButtonSelection() {
        const selectedTracks = new Set(
            Array.from(document.querySelectorAll(".trackBox:checked"))
                .map(cb => parseInt(cb.value, 10))
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
            
            btn.classList.toggle('selected', isGroupSelected);
            btn.setAttribute('aria-pressed', isGroupSelected.toString());
        });
        
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
                console.error("Play error:", err);
                showToast("Failed to play track. Check connection.");
            });
        } else if (DOM.repeatPlaylist.checked) {
            AppState.currentIndex = 0;
            AppState.repeatCounter = 0;
            playCurrent();
        } else {
            DOM.audioPlayer.pause();
            DOM.audioPlayer.src = "";
            showToast("Playlist finished.");
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
        showToast("An error occurred while loading the audio.");
    }
    
    function playSelected() {
        const finalSelection = getActiveSelection('regular');
        if (finalSelection.length === 0) {
            showModal("Please select at least one shlok or a playlist to play.");
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
        showToast("Playback started.");
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
        DOM.quizControls.classList.toggle('hidden', !showQuiz);
        DOM.quizControls.classList.toggle('fade-in', showQuiz);
        DOM.quizControls.classList.toggle('fade-out', !showQuiz);
        
        DOM.regularControls.classList.toggle('hidden', showQuiz);
        DOM.regularControls.classList.toggle('fade-out', showQuiz);
        DOM.regularControls.classList.toggle('fade-in', !showQuiz);
        
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
            showModal("Please select shlokas, a playlist, or a recent entry to quiz on!");
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
        const paddedNum = String(trackNum).padStart(3, '0');
        DOM.currentShlokQuiz.textContent = `Now playing: Shlok ${trackNum}`;
        DOM.audioPlayer.src = `${CONFIG.audioBaseUrl}${paddedNum}.mp3`;
        DOM.audioPlayer.playbackRate = AppState.currentSpeed;
        
        AppState.hasQuizPaused = false;
        DOM.countdownBar.style.width = '100%';

        DOM.audioPlayer.play().catch(err => {
            console.error("Play error:", err);
            showToast("Failed to play track.");
        });

        AppState.currentIndex++;
    }

    function startQuizCountdown() {
        let timeLeft = AppState.currentQuizTime;
        DOM.countdownBar.style.width = '0%';
        DOM.quizStatus.textContent = "What's the shlok number?";
        DOM.quizStatus.style.color = 'var(--accent-green)';
        
        AppState.countdownInterval = setInterval(() => {
            timeLeft--;
            DOM.countdown.textContent = `(${timeLeft}s)`;
            DOM.countdownBar.style.width = `${(timeLeft / AppState.currentQuizTime) * 100}%`;
            
            if (timeLeft <= 0) {
                clearInterval(AppState.countdownInterval);
                DOM.quizStatus.textContent = "Time's up!";
                DOM.quizStatus.style.color = 'var(--accent-red)';
                DOM.countdown.textContent = '';
                
                if (AppState.autoPlay) {
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
        DOM.playFullBtn.classList.add('hidden');
        
        DOM.audioPlayer.play().catch(err => console.error("Play error:", err));

        if (AppState.autoPlay) {
            DOM.audioPlayer.onended = () => {
                AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, 1000);
            };
        }
    }

    function toggleAutoPlay() {
        AppState.autoPlay = !AppState.autoPlay;
        DOM.autoPlayToggleBtn.innerHTML = `<i class="fa-solid fa-toggle-${AppState.autoPlay ? 'on' : 'off'}"></i> Auto-Play: ${AppState.autoPlay ? 'ON' : 'OFF'}`;
        DOM.autoPlayToggleBtn.classList.toggle('btn-secondary', !AppState.autoPlay);
        DOM.autoPlayToggleBtn.classList.toggle('btn-green', AppState.autoPlay);
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
        const selectedPlaylists = Array.from(document.querySelectorAll(".playlist-box:checked"))
            .map(cb => JSON.parse(cb.dataset.selection));
        
        if (selectedPlaylists.length > 0) {
            const playlistShlokas = new Set(selectedPlaylists.flat());
            return Array.from(playlistShlokas);
        }

        if (mode === 'quiz') {
            const selectedRecents = Array.from(document.querySelectorAll(".recent-box:checked"))
                .map(cb => cb.dataset.selection.split(",").map(n => parseInt(n.trim(), 10)));
            if (selectedRecents.length > 0) {
                const recentShlokas = new Set(selectedRecents.flat());
                return Array.from(recentShlokas);
            }
        }
        
        return Array.from(document.querySelectorAll(".trackBox:checked"))
            .map(cb => parseInt(cb.value, 10));
    }
    
    function selectRange() {
        const start = parseInt(DOM.rangeStart.value, 10);
        const end = parseInt(DOM.rangeEnd.value, 10);
        
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= CONFIG.totalTracks && start <= end) {
            document.querySelectorAll(".trackBox").forEach(cb => {
                const val = parseInt(cb.value, 10);
                const isChecked = val >= start && val <= end;
                cb.checked = isChecked;
                cb.closest("label").classList.toggle("selected", isChecked);
            });
            updateGroupButtonSelection();
        }
    }

    function renderPersonalPlaylists() {
        if (!AppState.localStorageEnabled) return;
        
        const playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
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
            li.innerHTML = `
                <label class="playlist-item block p-3 container-card cursor-pointer flex items-center justify-between">
                    <div class="flex items-center">
                        <input type="checkbox" class="playlist-box mr-2" data-selection='${JSON.stringify(shlokas)}'>
                        <span class="ml-6 font-semibold">${escapeHtml(name)}</span>
                    </div>
                    <div class="flex items-center space-x-2 text-sm text-gray-400">
                        <span>(${shlokas.length} shlokas)</span>
                        <button onclick="window.loadPlaylistGlobal('${escapeHtml(name).replace(/'/g, "\\'")}') " class="text-xs px-2 py-1 btn-secondary rounded-full">
                            Load
                        </button>
                        <button onclick="window.confirmDeletePlaylistGlobal('${escapeHtml(name).replace(/'/g, "\\'")}') " class="text-xs px-2 py-1 btn-red rounded-full">
                            Delete
                        </button>
                    </div>
                </label>
            `;
            DOM.playlistList.appendChild(li);
        });
    }

    function loadPlaylist(name) {
        if (!AppState.localStorageEnabled) return;
        
        let playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
        const shlokas = playlists[name];
        
        if (shlokas) {
            clearSelection();
            shlokas.forEach(trackNum => {
                const checkbox = document.querySelector(`.trackBox[value="${trackNum}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.closest('label').classList.add('selected');
                }
            });
            updateGroupButtonSelection();
            showToast(`Playlist "${name}" loaded into your selection!`);
        }
    }

    function deletePlaylist(name) {
        if (!AppState.localStorageEnabled) return;
        
        let playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
        delete playlists[name];
        localStorage.setItem('personalPlaylists', JSON.stringify(playlists));
        renderPersonalPlaylists();
    }

    function showSavePlaylistModal() {
        if (!AppState.localStorageEnabled) {
            showModal("Local storage is not enabled or available in your browser. Cannot save playlists.");
            return;
        }
        
        const selectedTracks = Array.from(document.querySelectorAll('.trackBox:checked'))
            .map(cb => parseInt(cb.value, 10));
        
        if (selectedTracks.length === 0) {
            showModal("Please select at least one shlok to save as a playlist.");
            return;
        }

        DOM.modalContainer.innerHTML = '';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="modal-content text-left">
                <span class="modal-close">&times;</span>
                <h3 class="text-xl font-bold mb-4">Save Playlist</h3>
                <p class="mb-2">Enter a name for your playlist:</p>
                <input type="text" id="playlistNameInput" class="w-full mb-4" placeholder="My new playlist">
                <div id="playlistNameFeedback" class="text-red-400 font-semibold hidden mb-4"></div>
                <div class="flex gap-4 justify-end">
                    <button class="px-4 py-3 btn-secondary text-white btn-rounded" id="modal-cancel">Cancel</button>
                    <button class="px-4 py-3 btn-green text-white btn-rounded" id="savePlaylistConfirm">Save</button>
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
            modal.classList.add('fade-out');
            modal.addEventListener('animationend', () => modal.remove());
        }

        function savePlaylist() {
            const playlistName = inputEl.value.trim();
            if (playlistName === '') {
                feedbackEl.textContent = 'Playlist name cannot be empty.';
                feedbackEl.classList.remove('hidden');
                return;
            }
            
            let playlists = JSON.parse(localStorage.getItem('personalPlaylists')) || {};
            if (playlists[playlistName]) {
                feedbackEl.textContent = 'A playlist with this name already exists.';
                feedbackEl.classList.remove('hidden');
                return;
            }
            
            playlists[playlistName] = selectedTracks;
            localStorage.setItem('personalPlaylists', JSON.stringify(playlists));
            renderPersonalPlaylists();
            showToast(`Playlist "${playlistName}" saved!`);
            closeModal();
        }

        saveBtnEl.addEventListener('click', savePlaylist);
        cancelBtnEl.addEventListener('click', closeModal);
        closeBtnEl.addEventListener('click', closeModal);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                savePlaylist();
            }
        });
        inputEl.focus();
    }

    // --- 8. UTILITY FUNCTIONS ---

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
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
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
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <p class="text-lg">${escapeHtml(message)}</p>
                ${buttonsHtml}
            </div>
        `;
        
        DOM.modalContainer.appendChild(modal);

        const closeModal = () => {
            modal.classList.remove('fade-in');
            modal.classList.add('fade-out');
            modal.addEventListener('animationend', () => modal.remove());
        };

        modal.querySelector('.modal-close').onclick = closeModal;
        modal.querySelector('#modal-cancel').onclick = closeModal;
        
        if (onConfirm) {
            modal.querySelector('#modal-confirm').onclick = () => {
                onConfirm();
                closeModal();
            };
        }
        
        modal.querySelector('#modal-cancel').focus();
    }

    // --- 9. GLOBAL FUNCTION EXPOSURE ---
    // Expose functions needed by inline onclick handlers in dynamically generated HTML
    window.loadPlaylistGlobal = loadPlaylist;
    window.confirmDeletePlaylistGlobal = confirmDeletePlaylist;

    // --- 10. KICK OFF THE APP ---
    initApp();
});
            showToast(`Shlokas ${start}-${end} selected.`);
        } else {
            showModal("Please enter a valid shlok range (e.g., 1-10).");
        }
    }

    function toggleGroup(start, end, element) {
        const isSelected = !element.classList.contains('selected');
        
        for (let i = start; i <= end; i++) {
            const checkbox = document.querySelector(`.trackBox[value="${i}"]`);
            if (checkbox) {
                checkbox.checked = isSelected;
                checkbox.closest("label").classList.toggle("selected", isSelected);
            }
        }
        
        updateGroupButtonSelection();
    }
    
    function handleSearch() {
        const query = DOM.search.value.trim();
        DOM.clearSearch.classList.toggle('hidden', query.length === 0);
        let matchFound = false;

        document.querySelectorAll('#trackList li').forEach(li => {
            const trackNum = li.querySelector('.trackBox').value;
            const isVisible = query === '' || trackNum.startsWith(query);
            li.style.display = isVisible ? 'block' : 'none';
            if (isVisible) matchFound = true;
        });

        DOM.searchFeedback.classList.toggle('hidden', matchFound);
    }

    function handleTrackSelection(event) {
        if (event.target.classList.contains('trackBox')) {
            const label = event.target.closest('label');
            const isChecked = event.target.checked;
            label.classList.toggle('selected', isChecked);
            updateGroupButtonSelection();
            
            document.querySelectorAll('.recent-box, .playlist-box').forEach(cb => {
                cb.checked = false;
                cb.closest('label').classList.remove('selected');
            });
        }
    }

    function handleRecentSelection(event) {
        if (event.target.classList.contains('recent-box')) {
            document.querySelectorAll('.track-item.selected, .playlist-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelectorAll('.trackBox, .playlist-box').forEach(cb => cb.checked = false);

            const selectedRecents = Array.from(document.querySelectorAll('.recent-box:checked'));
            const allNumbers = new Set(selectedRecents.flatMap(cb => 
                cb.dataset.selection.split(',').map(Number)
            ));
            
            document.querySelectorAll('.trackBox').forEach(cb => {
                const trackNum = parseInt(cb.value, 10);
                if (allNumbers.has(trackNum)) {
                    cb.checked = true;
                    cb.closest('label').classList.add('selected');
                }
            });
            
            selectedRecents.forEach(cb => cb.closest('label').classList.add('selected'));
            updateGroupButtonSelection();
        }
    }

    function handlePlaylistSelection(event) {
        if (event.target.classList.contains('playlist-box')) {
            document.querySelectorAll('.track-item.selected, .recent-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            document.querySelectorAll('.trackBox, .recent-box').forEach(cb => cb.checked = false);

            const selectedPlaylists = Array.from(document.querySelectorAll('.playlist-box:checked'));
            const allNumbers = new Set(selectedPlaylists.flatMap(cb => 
                JSON.parse(cb.dataset.selection)
            ));
            
            document.querySelectorAll('.trackBox').forEach(cb => {
                const trackNum = parseInt(cb.value, 10);
                if (allNumbers.has(trackNum)) {
                    cb.checked = true;
                    cb.closest('label').classList.add('selected');
                }
            });
            
            selectedPlaylists.forEach(cb => cb.closest('label').classList.add('selected'));
            updateGroupButtonSelection();
        }
    }
    
    function clearSelection() {
        document.querySelectorAll('.selectable-item.selected, .track-item.selected, .recent-item.selected, .playlist-item.selected').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelectorAll('.trackBox:checked, .recent-box:checked, .playlist-box:checked').forEach(cb => {
            cb.checked = false;
        });
        document.querySelectorAll('.group-btn.selected').forEach(btn => {
            btn.classList.remove('selected');
            btn.setAttribute('aria-pressed', 'false');
        });
        updateGroupButtonSelection();
        showToast("Selection cleared.");
    }
    
    function confirmClearSelection() {
        if (getActiveSelection('regular').length === 0) {
            showToast("Nothing to clear.");
            return;
        }
        showModal("Are you sure you want to clear your current selection?", clearSelection);
    }
    
    function confirmClearHistory() {
        showModal("Are you sure you want to clear your recently played history? This action cannot be undone.", () => {
            clearHistory();
            showToast("Recently played history cleared.");
        });
    }
    
    function confirmDeletePlaylist(playlistName) {
        showModal(`Are you sure you want to delete the playlist "${playlistName}"? This action cannot be undone.`, () => {
            deletePlaylist(playlistName);
            showToast(`Playlist "${playlistName}" deleted.`);
        });
    }

    // --- 7. LOCAL STORAGE & PLAYLISTS ---

    function saveSelection(selection) {
        if (!AppState.localStorageEnabled) return;
        
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('recentSelections')) || [];
        } catch (e) {
            history = [];
        }
        
        const selString = selection.join(',');
        history = [selString, ...history.filter(h => h !== selString)].slice(0, CONFIG.maxRecentSelections);
        localStorage.setItem('recentSelections', JSON.stringify(history));
        renderRecentSelections();
    }

    function clearHistory() {
        if (!AppState.localStorageEnabled) return;
        localStorage.removeItem('recentSelections');
        renderRecentSelections();
    }

    function renderRecentSelections() {
        if (!AppState.localStorageEnabled) return;
        
        const history = JSON.parse(localStorage.getItem('recentSelections')) || [];
        DOM.recentList.innerHTML = '';
        
        if (history.length === 0) {
            DOM.recentlyPlayed.classList.add('hidden');
            DOM.recentEmpty.classList.remove('hidden');
            return;
        }
        
        DOM.recentlyPlayed.classList.remove('hidden');
        DOM.recentEmpty.classList.add('hidden');
        
        history.forEach(sel => {
            const numbers = sel.split(',').map(n => parseInt(n.trim(), 10));
            let labelText = numbers.length <= 6 
                ? 'Shlok ' + numbers.join(', ') 
                : `Shlok ${numbers[0]}–${numbers[numbers.length - 1]} (${numbers.length} total)`;
            
            const li = document.createElement('li');
            li.className = 'space-y-2';
            li.innerHTML = `
                <label class="recent-item block p-3 container-card cursor-pointer">
                    <input type="checkbox" class="recent-box mr-2" data-selection="${sel}">
                    <span class="ml-6">${labelText}</span>
                </label>
            `;
            DOM.recentList.appendChild(li);
        });
    }

    function restoreLastSelection() {
        if (!AppState.localStorageEnabled) return;
        
        let history = [];
        try {
            history = JSON.parse(localStorage.getItem('recentSelections')) || [];
        } catch (e) {
            history = [];
        }
        
        if (history.length > 0) {
            const lastSel = history[0].split(',').map(n => parseInt(n.trim(), 10));
            document.querySelectorAll('.trackBox').forEach(cb => {
                const isChecked = lastSel.includes(parseInt(cb.value, 10));
                cb.checked = isChecked;
                cb.closest('label').classList.toggle('selected', isChecked);
            });
            updateGroupButtonSelection();
