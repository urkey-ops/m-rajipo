document.addEventListener('DOMContentLoaded', () => {

    // --- 1. STATE & ELEMENTS ---

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
        totalTracks: 315,
        localStorageEnabled: false,
        personalPlaylists: {}
    };

    // Cached DOM Elements for Performance
    const DOMElements = {};

    // --- 2. INITIALIZATION ---

    function initApp() {
        cacheDOMElements();
        initEventListeners();
        checkLocalStorage();
        generateTrackList();
        generateGroups();
        if (AppState.localStorageEnabled) {
            loadPlaylists();
            loadRecents();
        }
        updateSavePlaylistButtonVisibility();
    }

    function cacheDOMElements() {
        // Main Player & Lists
        DOMElements.audioPlayer = document.getElementById('audioPlayer');
        DOMElements.trackList = document.getElementById('trackList');
        DOMElements.groups = document.getElementById('groups');
        
        // Search & Range
        DOMElements.search = document.getElementById('search');
        DOMElements.clearSearch = document.getElementById('clearSearch');
        DOMElements.searchFeedback = document.getElementById('search-feedback');
        DOMElements.rangeStart = document.getElementById('rangeStart');
        DOMElements.rangeEnd = document.getElementById('rangeEnd');
        DOMElements.selectRangeBtn = document.getElementById('selectRangeBtn');
        
        // Mode Toggling & Main Buttons
        DOMElements.toggleGroupsBtn = document.getElementById('toggleGroupsBtn');
        DOMElements.groupToggleIcon = document.getElementById('group-toggle-icon');
        DOMElements.toggleModeBtn = document.getElementById('toggleModeBtn');
        DOMElements.playSelectedBtn = document.getElementById('playSelectedBtn');
        DOMElements.clearSelectionBtn = document.getElementById('clearSelectionBtn');
        
        // Control Wrappers
        DOMElements.quizControls = document.getElementById('quizControls');
        DOMElements.regularControls = document.getElementById('regularControls');
        
        // Regular Mode Controls
        DOMElements.repeatCount = document.getElementById('repeatCount');
        DOMElements.shuffle = document.getElementById('shuffle');
        DOMElements.repeatPlaylist = document.getElementById('repeatPlaylist');
        DOMElements.speedSlider = document.getElementById('speedSlider');
        DOMElements.speedDisplay = document.getElementById('speedDisplay');
        
        // Quiz Mode Controls
        DOMElements.currentShlokQuiz = document.getElementById('currentShlokQuiz');
        DOMElements.countdownBar = document.getElementById('countdownBar');
        DOMElements.quizStatus = document.getElementById('quizStatus');
        DOMElements.countdown = document.getElementById('countdown');
        DOMElements.quizTimeSlider = document.getElementById('quizTimeSlider');
        DOMElements.quizTimeDisplay = document.getElementById('quizTimeDisplay');
        DOMElements.quizDelaySlider = document.getElementById('quizDelaySlider');
        DOMElements.quizDelayDisplay = document.getElementById('quizDelayDisplay');
        DOMElements.autoPlayToggleBtn = document.getElementById('autoPlayToggleBtn');
        DOMElements.playFullBtn = document.getElementById('playFullBtn');
        DOMElements.playNextQuizBtn = document.getElementById('playNextQuizBtn');
        
        // Playlists & Recents
        DOMElements.playlistList = document.getElementById('playlistList');
        DOMElements.playlistEmpty = document.getElementById('playlist-empty');
        DOMElements.savePlaylistContainer = document.getElementById('savePlaylistContainer');
        DOMElements.showSaveModalBtn = document.getElementById('showSaveModalBtn');
        DOMElements.recentlyPlayed = document.getElementById('recentlyPlayed');
        DOMElements.recentList = document.getElementById('recentList');
        DOMElements.recentEmpty = document.getElementById('recent-empty');
        DOMElements.clearHistoryBtn = document.getElementById('clearHistoryBtn');

        // UI Feedback
        DOMElements.toastContainer = document.getElementById('toast-container');
        DOMElements.modalContainer = document.getElementById('modal-container');
    }

    function initEventListeners() {
        // Player events
        DOMElements.audioPlayer.addEventListener('ended', handleTrackEnd);
        DOMElements.audioPlayer.addEventListener('timeupdate', handleTimeUpdate);

        // Control events
        DOMElements.search.addEventListener('input', handleSearch);
        DOMElements.clearSearch.addEventListener('click', () => {
            DOMElements.search.value = '';
            handleSearch();
            DOMElements.search.focus();
        });
        DOMElements.selectRangeBtn.addEventListener('click', selectRange);
        DOMElements.toggleGroupsBtn.addEventListener('click', toggleGroupDisplay);
        
        // Mode & Playback events
        DOMElements.toggleModeBtn.addEventListener('click', toggleMode);
        DOMElements.playSelectedBtn.addEventListener('click', playSelected);
        DOMElements.clearSelectionBtn.addEventListener('click', confirmClearSelection);
        DOMElements.speedSlider.addEventListener('input', () => changeSpeed(parseFloat(DOMElements.speedSlider.value)));

        // Quiz events
        DOMElements.quizTimeSlider.addEventListener('input', () => changeQuizTime(parseInt(DOMElements.quizTimeSlider.value)));
        DOMElements.quizDelaySlider.addEventListener('input', () => changeQuizDelay(parseInt(DOMElements.quizDelaySlider.value)));
        DOMElements.autoPlayToggleBtn.addEventListener('click', toggleAutoPlay);
        DOMElements.playFullBtn.addEventListener('click', playFullShloka);
        DOMElements.playNextQuizBtn.addEventListener('click', playNextQuizTrack);

        // Playlist & History events
        DOMElements.showSaveModalBtn.addEventListener('click', showSavePlaylistModal);
        DOMElements.clearHistoryBtn.addEventListener('click', confirmClearHistory);
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
        for (let i = 1; i <= AppState.totalTracks; i++) {
            const li = document.createElement('li');
            const label = document.createElement('label');
            label.className = 'track-item selectable-item p-4 justify-center font-semibold';
            label.setAttribute('for', `track${i}`);
            label.textContent = `${i}`;

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'trackBox';
            checkbox.id = `track${i}`;
            checkbox.value = i;
            checkbox.addEventListener('change', () => {
                label.classList.toggle('selected', checkbox.checked);
                updateUiAfterSelectionChange();
            });

            label.prepend(checkbox);
            li.appendChild(label);
            fragment.appendChild(li);
        }
        DOMElements.trackList.appendChild(fragment);
    }
    
    function generateGroups() {
        const groups = [
            { name: "1-50", range: [1, 50] }, { name: "51-100", range: [51, 100] }, { name: "101-150", range: [101, 150] },
            { name: "151-200", range: [151, 200] }, { name: "201-250", range: [201, 250] }, { name: "251-315", range: [251, 315] }
        ];
        const fragment = document.createDocumentFragment();
        groups.forEach(group => {
            const btn = document.createElement('button');
            btn.className = 'group-btn';
            btn.textContent = group.name;
            btn.setAttribute('aria-pressed', 'false');
            btn.innerHTML += `<i class="fas fa-check-circle checkmark"></i>`;
            btn.addEventListener('click', () => toggleGroup(group.range[0], group.range[1], btn));
            fragment.appendChild(btn);
        });
        DOMElements.groups.appendChild(fragment);
    }
    
    function toggleGroupDisplay() {
        const isHidden = DOMElements.groups.classList.toggle("hidden");
        DOMElements.groupToggleIcon.classList.toggle("fa-chevron-down", isHidden);
        DOMElements.groupToggleIcon.classList.toggle("fa-chevron-up", !isHidden);
    }

    function updateGroupButtonSelection() {
        const groupButtons = DOMElements.groups.querySelectorAll('.group-btn');
        groupButtons.forEach(btn => {
            const start = parseInt(btn.dataset.start, 10);
            const end = parseInt(btn.dataset.end, 10);
            let allSelected = true;
            for (let i = start; i <= end; i++) {
                const cb = document.getElementById(`track${i}`);
                if (!cb || !cb.checked) {
                    allSelected = false;
                    break;
                }
            }
            btn.classList.toggle('selected', allSelected);
            btn.setAttribute('aria-pressed', allSelected);
        });
    }

    function updateSavePlaylistButtonVisibility() {
        const selectedCount = document.querySelectorAll('.trackBox:checked').length;
        DOMElements.savePlaylistContainer.classList.toggle('hidden', selectedCount === 0);
    }

    function updateUiAfterSelectionChange() {
        updateGroupButtonSelection();
        updateSavePlaylistButtonVisibility();
    }

    // --- 4. CORE PLAYER LOGIC ---
    
    function playCurrent() {
        if (AppState.currentIndex < AppState.playlist.length) {
            const trackNum = AppState.playlist[AppState.currentIndex];
            DOMElements.audioPlayer.src = `https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_${String(trackNum).padStart(3, '0')}.mp3`;
            DOMElements.audioPlayer.playbackRate = AppState.currentSpeed;
            DOMElements.audioPlayer.play().catch(err => {
                console.error("Play error:", err);
                showToast("Failed to play track. Check connection.");
            });
        } else if (DOMElements.repeatPlaylist.checked) {
            AppState.currentIndex = 0;
            AppState.repeatCounter = 0;
            playCurrent();
        } else {
            DOMElements.audioPlayer.pause();
            DOMElements.audioPlayer.src = "";
            showToast("Playlist finished.");
        }
    }

    function handleTrackEnd() {
        if (AppState.isQuizMode) return; 

        AppState.repeatCounter++;
        if (AppState.repeatCounter < AppState.repeatEach) {
            DOMElements.audioPlayer.currentTime = 0;
            DOMElements.audioPlayer.play();
        } else {
            AppState.repeatCounter = 0;
            AppState.currentIndex++;
            playCurrent();
        }
    }
    
    function playSelected() {
        const finalSelection = getActiveSelection('regular');
        if (finalSelection.length === 0) {
            showModal("Please select at least one shlok or a playlist to play.");
            return;
        }

        AppState.repeatEach = parseInt(DOMElements.repeatCount.value, 10) || 1;
        AppState.playlist = [...finalSelection];
        if (DOMElements.shuffle.checked) {
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
        DOMElements.audioPlayer.playbackRate = AppState.currentSpeed;
        DOMElements.speedDisplay.textContent = AppState.currentSpeed.toFixed(1);
    }

    // --- 5. QUIZ MODE LOGIC ---

    function toggleMode() {
        AppState.isQuizMode = !AppState.isQuizMode;
        
        const showQuiz = AppState.isQuizMode;
        DOMElements.quizControls.classList.toggle('hidden', !showQuiz);
        DOMElements.quizControls.classList.toggle('fade-in', showQuiz);
        DOMElements.quizControls.classList.toggle('fade-out', !showQuiz);
        
        DOMElements.regularControls.classList.toggle('hidden', showQuiz);
        DOMElements.regularControls.classList.toggle('fade-out', showQuiz);
        DOMElements.regularControls.classList.toggle('fade-in', !showQuiz);
        
        DOMElements.toggleModeBtn.innerHTML = `<i class="fa-solid fa-toggle-${showQuiz ? 'on' : 'off'}"></i> ${showQuiz ? 'Exit Quiz Mode' : 'Toggle to Quiz Mode'}`;

        // Stop all activity on mode switch
        DOMElements.audioPlayer.pause();
        DOMElements.audioPlayer.src = '';
        if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
        if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);

        if (showQuiz) {
            AppState.playlist = [];
            AppState.currentIndex = 0;
            DOMElements.playFullBtn.classList.add('hidden');
            DOMElements.countdownBar.style.width = '100%';
            DOMElements.currentShlokQuiz.textContent = 'Shlok 0';
        } else {
            DOMElements.quizStatus.textContent = '';
            DOMElements.countdown.textContent = '';
        }
        updateUiAfterSelectionChange();
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
        
        // Clear previous state
        if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
        if (AppState.autoPlayTimeout) clearTimeout(AppState.autoPlayTimeout);
        DOMElements.quizStatus.textContent = '';
        DOMElements.playFullBtn.classList.add('hidden');

        const trackNum = AppState.playlist[AppState.currentIndex];
        DOMElements.currentShlokQuiz.textContent = `Now playing: Shlok ${trackNum}`;
        DOMElements.audioPlayer.src = `https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_${String(trackNum).padStart(3, '0')}.mp3`;
        DOMElements.audioPlayer.playbackRate = AppState.currentSpeed;
        
        AppState.hasQuizPaused = false;
        DOMElements.countdownBar.style.transition = 'none'; // Reset transition for instant fill
        DOMElements.countdownBar.style.width = '100%';
        setTimeout(() => { DOMElements.countdownBar.style.transition = `width ${AppState.currentQuizTime}s linear`; }, 50); // Restore transition

        DOMElements.audioPlayer.play().catch(err => {
            console.error("Play error:", err);
            showToast("Failed to play track.");
        });

        AppState.currentIndex++;
    }
    
    function handleTimeUpdate() {
        if (!AppState.isQuizMode || AppState.hasQuizPaused) return;

        if (DOMElements.audioPlayer.currentTime >= AppState.currentQuizDelay) {
            DOMElements.audioPlayer.pause();
            AppState.hasQuizPaused = true;
            DOMElements.playFullBtn.classList.remove('hidden');
            startQuizCountdown();
        }
    }

    function startQuizCountdown() {
        let timeLeft = AppState.currentQuizTime;
        DOMElements.countdownBar.style.width = '0%';
        DOMElements.quizStatus.textContent = "What's the shlok number?";
        DOMElements.quizStatus.style.color = 'var(--accent-green)';
        
        AppState.countdownInterval = setInterval(() => {
            timeLeft--;
            DOMElements.countdown.textContent = `${timeLeft}s`;
            if (timeLeft <= 0) {
                clearInterval(AppState.countdownInterval);
                DOMElements.quizStatus.textContent = "Time's up!";
                DOMElements.quizStatus.style.color = 'var(--accent-red)';
                DOMElements.countdown.textContent = '';
                if (AppState.autoPlay) {
                    AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, 1500);
                }
            }
        }, 1000);
    }

    function playFullShloka() {
        const trackIndex = AppState.currentIndex > 0 ? AppState.currentIndex - 1 : 0;
        const trackNum = AppState.playlist[trackIndex];
        DOMElements.audioPlayer.src = `https://ia601703.us.archive.org/35/items/satsang_diksha/sanskrit_${String(trackNum).padStart(3, '0')}.mp3`;
        DOMElements.audioPlayer.playbackRate = AppState.currentSpeed;
        
        if (AppState.countdownInterval) clearInterval(AppState.countdownInterval);
        DOMElements.quizStatus.textContent = `Answer: Shlok ${trackNum}`;
        DOMElements.quizStatus.style.color = 'var(--accent-blue)';
        DOMElements.countdown.textContent = '';
        DOMElements.playFullBtn.classList.add('hidden');
        
        DOMElements.audioPlayer.play().catch(err => console.error("Play error:", err));

        if (AppState.autoPlay) {
            DOMElements.audioPlayer.onended = () => {
                AppState.autoPlayTimeout = setTimeout(playNextQuizTrack, 1000);
            };
        }
    }

    function toggleAutoPlay() {
        AppState.autoPlay = !AppState.autoPlay;
        const btn = DOMElements.autoPlayToggleBtn;
        btn.innerHTML = `<i class="fa-solid fa-toggle-${AppState.autoPlay ? 'on' : 'off'}"></i> Auto-Play: ${AppState.autoPlay ? 'ON' : 'OFF'}`;
        btn.classList.toggle('btn-secondary', !AppState.autoPlay);
        btn.classList.toggle('btn-green', AppState.autoPlay);
    }
    
    function changeQuizTime(time) {
        AppState.currentQuizTime = time;
        DOMElements.quizTimeDisplay.textContent = `${time}s`;
    }

    function changeQuizDelay(delay) {
        AppState.currentQuizDelay = delay;
        DOMElements.quizDelayDisplay.textContent = `${delay}s`;
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
            if(selectedRecents.length > 0) {
                 const recentShlokas = new Set(selectedRecents.flat());
                 return Array.from(recentShlokas);
            }
        }
        
        return Array.from(document.querySelectorAll(".trackBox:checked"))
            .map(cb => parseInt(cb.value, 10));
    }
    
    function selectRange() {
        const start = parseInt(DOMElements.rangeStart.value, 10);
        const end = parseInt(DOMElements.rangeEnd.value, 10);
        if (!isNaN(start) && !isNaN(end) && start >= 1 && end <= AppState.totalTracks && start <= end) {
            document.querySelectorAll(".trackBox").forEach(cb => {
                const val = parseInt(cb.value, 10);
                const isChecked = val >= start && val <= end;
                cb.checked = isChecked;
                cb.closest("label").classList.toggle("selected", isChecked);
            });
            updateUiAfterSelectionChange();
            showToast(`Shlokas ${start}-${end} selected.`);
        } else {
            showModal("Please enter a valid shlok range (e.g., 1-10).");
        }
    }

    function toggleGroup(start, end, element) {
        const isSelected = !element.classList.contains('selected');
        for (let i = start; i <= end; i++) {
            const checkbox = document.getElementById(`track${i}`);
            if (checkbox) {
                checkbox.checked = isSelected;
                checkbox.closest("label").classList.toggle("selected", isSelected);
            }
        }
        updateUiAfterSelectionChange();
    }
    
    function handleSearch(event) {
        const query = event.target.value.trim();
        DOMElements.clearSearch.classList.toggle('hidden', query.length === 0);
        let matchFound = false;

        document.querySelectorAll('#trackList li').forEach(li => {
            const trackNum = li.querySelector('.trackBox').value;
            const isVisible = query === '' || trackNum.startsWith(query);
            li.style.display = isVisible ? 'block' : 'none';
            if (isVisible) matchFound = true;
        });

        DOMElements.searchFeedback.classList.toggle('hidden', matchFound);
    }
    
    function clearSelection() {
        document.querySelectorAll(".selectable-item.selected").forEach(item => item.classList.remove("selected"));
        document.querySelectorAll(".trackBox:checked, .recent-box:checked, .playlist-box:checked").forEach(cb => cb.checked = false);
        document.querySelectorAll(".group-btn.selected").forEach(btn => btn.classList.remove("selected"));
        updateUiAfterSelectionChange();
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
        showModal("Are you sure you want to clear your recently played history?", clearHistory);
    }
    
    function confirmDeletePlaylist(playlistName) {
         showModal(`Are you sure you want to delete the playlist "${playlistName}"?`, () => {
             deletePlaylist(playlistName);
             showToast(`Playlist "${playlistName}" deleted.`);
         });
    }

    // --- 7. LOCAL STORAGE & PLAYLISTS ---

    // ... (All functions for saving, loading, deleting playlists and recents)
    // Example refactor for loadPlaylists:
    function loadPlaylists() {
        const saved = localStorage.getItem('personalPlaylists');
        AppState.personalPlaylists = saved ? JSON.parse(saved) : {};
        renderPlaylists();
    }
    
    function renderPlaylists() {
        // ... Logic to render playlist items into DOMElements.playlistList
    }

    // --- 8. UTILITY FUNCTIONS ---

    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        DOMElements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            toast.addEventListener('animationend', () => toast.remove());
        }, 3700);
    }

    function showModal(message, onConfirm = null) {
        DOMElements.modalContainer.innerHTML = ''; // Clear previous modals
        const modal = document.createElement('div');
        modal.className = 'modal fade-in';
        
        let buttonsHtml = onConfirm 
            ? `<div class="flex justify-center gap-4 mt-6">
                 <button id="modal-confirm" class="btn-rounded btn-primary px-8">Yes</button>
                 <button id="modal-cancel" class="btn-rounded btn-secondary px-6">Cancel</button>
               </div>`
            : `<div class="mt-6"><button id="modal-cancel" class="btn-rounded btn-primary">OK</button></div>`;

        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <p class="text-lg">${message}</p>
                ${buttonsHtml}
            </div>`;
        
        DOMElements.modalContainer.appendChild(modal);

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
    }
    
    function showSavePlaylistModal() {
        // ... Logic for save playlist modal
    }

    // --- KICK OFF THE APP ---
    initApp();
});
