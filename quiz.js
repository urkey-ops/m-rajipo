// quiz.js (Patched)

import { 
    AppState, stopAllTimers, setQuizMode, setAutoPlay, setQuizPaused, 
    setAutoPlayTimeout, setCountdownInterval, setRepeatEach, setCurrentIndex,
    CONFIG
} from './state.js';
import { playCurrent } from './player.js';
import { showToast, toggleClass } from './ui-helpers.js';
import { getActivePlaylist } from './selection.js';

// DOM object is expected to be initialized and set up in app.js
const DOM = window.DOM || {}; 

// --- Quiz Timer Management ---

// Helper function for starting the countdown
function startCountdown() {
    stopAllTimers(); // CRITICAL FIX: Ensure all previous timers are cleared

    if (!DOM.quizProgress || !DOM.quizProgressText || !DOM.quizDisplay) {
      console.warn("Missing critical quiz DOM elements. Cannot start countdown.");
      return;
    }

    let countdown = AppState.currentQuizTime;
    DOM.quizProgressText.textContent = `(${countdown}s)`;

    // Set initial bar width
    DOM.quizProgress.style.transition = 'none';
    DOM.quizProgress.style.width = '100%';
    
    // Animate width decrease over the duration of the countdown
    setTimeout(() => {
        DOM.quizProgress.style.transition = `width ${AppState.currentQuizTime}s linear`;
        DOM.quizProgress.style.width = '0%';
    }, 50); // Small delay to allow the initial width to set

    const intervalId = setInterval(() => {
        countdown -= 1;
        DOM.quizProgressText.textContent = `(${countdown}s)`;

        if (countdown <= 0) {
            stopAllTimers();
            // CRITICAL FIX: Safely check for DOM elements before access
            if (DOM.quizProgressText) DOM.quizProgressText.textContent = '';
            if (DOM.quizDisplay) DOM.quizDisplay.querySelector('#quiz-status').textContent = 'Time out!';

            if (AppState.autoPlay) {
                playNextQuizTrack();
            }
        }
    }, 1000);
    
    setCountdownInterval(intervalId);
}

// --- Quiz Flow ---

/**
 * Starts the quiz with the current playlist or handles resume/pause.
 */
export function startQuizRound() {
    // CRITICAL FIX: Get the active playlist and validate it first
    const playlist = getActivePlaylist();
    if (playlist.length === 0) {
        showToast("Cannot start Quiz Mode: Please select at least one Shloka.");
        setQuizMode(false); // Force exit if state was inconsistent
        return;
    }
    
    if (!DOM.audioPlayer) {
        console.error("Audio player missing. Cannot run quiz.");
        return;
    }

    // Always reset the audio state and playlist index when starting a fresh round
    setPlaylist(playlist);
    setCurrentIndex(0);
    DOM.audioPlayer.src = ''; // Clear source to prepare for the first play

    // Set initial state
    setQuizPaused(false);
    
    // Start the first track
    playNextQuizTrack();
}

/**
 * Logic to play the next track in Quiz Mode.
 */
export function playNextQuizTrack() {
    // CRITICAL FIX: Ensure playlist is not empty before attempting to play
    if (AppState.playlist.length === 0 || AppState.currentIndex >= AppState.playlist.length) {
        stopAllTimers();
        setQuizMode(false);
        showToast("Quiz Finished!");
        return;
    }
    
    stopAllTimers(); // Stop any pending timeouts/intervals

    // 1. Update UI for next track
    const currentShloka = AppState.playlist[AppState.currentIndex];
    if (DOM.currentShlokQuiz) {
        DOM.currentShlokQuiz.textContent = `Shlok ${currentShloka}`;
    }

    // 2. Set timeout for the audio to start playing (Quiz Delay)
    const playDelayMs = AppState.currentQuizDelay * 1000;

    if (DOM.quizStatus) DOM.quizStatus.textContent = `Playing in ${AppState.currentQuizDelay} seconds...`;
    
    const timeoutId = setTimeout(() => {
        // Play the current track
        playCurrent();
        
        // After audio starts, begin the pause countdown
        startCountdown();

    }, playDelayMs);

    setAutoPlayTimeout(timeoutId);
}

/**
 * Toggles the quiz pause state, playing the full shloka if unpaused.
 */
export function toggleQuizPause() {
    if (!DOM.audioPlayer) return;

    if (AppState.hasQuizPaused) {
        // Resume Quiz: Go straight to next question
        setQuizPaused(false);
        playNextQuizTrack();
    } else {
        // Pause Quiz: Play the full shloka for revision
        setQuizPaused(true);
        stopAllTimers();
        
        // This relies on playCurrent() being able to play the current index
        playCurrent(); 
        
        // Set new timeout to return to the quiz flow after the track ends
        // (handleTrackEnded in player.js will pause and show next question prompt)
    }
}

// Export for use in app.js and selection.js
// NOTE: Quiz mode UI updates are handled by toggleAppMode in selection.js
