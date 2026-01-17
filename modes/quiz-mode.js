// quiz-mode.js - Quiz mode logic with FIXED precise timing
import { EVENTS, MODES, DEFAULT_SETTINGS, TIMING } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { state } from '../core/state.js';
import { audioService } from '../services/audio-service.js';
import { playlistService } from '../services/playlist-service.js';
import { storageService } from '../services/storage-service.js';
import { selectionManager } from '../managers/selection-manager.js';
import { timerManager } from '../managers/timer-manager.js';
import { validateQuizTime, validateQuizDelay } from '../utils/validation.js';

class QuizMode {
  constructor() {
    this._isActive = false;
    this._settings = {
      quizTime: DEFAULT_SETTINGS.QUIZ_TIME,
      quizDelay: DEFAULT_SETTINGS.QUIZ_DELAY,
      autoPlay: DEFAULT_SETTINGS.AUTO_PLAY,
      autoPlayFull: DEFAULT_SETTINGS.AUTO_PLAY_FULL
    };
    
    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._isPaused = false;
    this._isPlayingFull = false;
    this._countdownTimerId = null;
    this._pauseTimerId = null;
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    EventBus.on(EVENTS.PLAYBACK_STARTED, () => {
      if (this._isActive && !this._isPaused && !this._isPlayingFull) {
        // This is quiz playback (not full shloka)
        this._startMonitoringPlayback();
      }
    });

    EventBus.on(EVENTS.TRACK_ENDED, () => {
      if (!this._isActive) return;
      
      // If we just finished playing the full shloka
      if (this._isPlayingFull) {
        this._isPlayingFull = false;
        console.log('✅ Full shloka finished');
        
        // Auto-advance if enabled
        if (this._settings.autoPlay) {
          console.log('▶️ Auto-advancing to next question...');
          setTimeout(() => this.nextQuestion(), 500);
        } else {
          console.log('⏸️ Waiting for manual next...');
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: 'Click Next for the next question',
            type: 'info'
          });
        }
      } else {
        // Normal quiz track ended (shouldn't happen during quiz play)
        console.log('Quiz mode: Track ended during quiz play, waiting for user action');
      }
    });
  }
  
  // ✅ NEW: Precise interval-based monitoring (replaces timeupdate)
  _startMonitoringPlayback() {
    // Clear any existing monitoring
    this._clearMonitoringTimer();
    
    const targetDelay = this._settings.quizDelay;
    const startTime = Date.now();
    const startAudioTime = audioService.getCurrentTime();
    
    console.log(`👁️ Starting monitoring: will pause at ${targetDelay}s (current: ${startAudioTime.toFixed(2)}s)`);
    
    // Use precise 50ms interval for ±25ms accuracy
    this._pauseTimerId = setInterval(() => {
      // Safety check: ensure we're still in valid state
      if (!this._isActive || this._isPaused || this._isPlayingFull) {
        this._clearMonitoringTimer();
        return;
      }
      
      const currentTime = audioService.getCurrentTime();
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Pause when we've reached the target (with 50ms tolerance for precision)
      if (currentTime >= targetDelay - 0.05) {
        console.log(`⏸️ Quiz: Reached ${currentTime.toFixed(2)}s (target: ${targetDelay}s), pausing now`);
        this._pauseForRecitation();
        this._clearMonitoringTimer();
        return;
      }
      
      // Safety timeout: if we've been monitoring for longer than expected, something's wrong
      if (elapsed > targetDelay + 2) {
        console.warn(`⚠️ Quiz monitoring timeout at ${elapsed.toFixed(2)}s, forcing pause`);
        this._pauseForRecitation();
        this._clearMonitoringTimer();
      }
    }, 50); // Check every 50ms for ±25ms accuracy
    
    console.log(`👁️ Monitoring started, will pause at ${targetDelay}s`);
  }
  
  // ✅ NEW: Clear monitoring timer
  _clearMonitoringTimer() {
    if (this._pauseTimerId) {
      clearInterval(this._pauseTimerId);
      this._pauseTimerId = null;
      console.log('🛑 Quiz monitoring timer cleared');
    }
  }
  
  // ✅ EXTRACTED: Pause logic
  _pauseForRecitation() {
    if (this._isPaused) return;
    
    audioService.pause();
    this._isPaused = true;
    state.set('quizMode.isPaused', true);

    console.log('⏸️ Quiz: Audio paused, your turn!');
    EventBus.emit('quiz-mode:paused-for-recitation');

    // Start countdown
    this._startCountdown();
  }
  
  initialize() {
    if (this._isActive) return;

    console.log('🧠 Initializing Quiz Mode');

    // Load saved settings
    const savedSettings = storageService.loadSettings();
    if (savedSettings) {
      this._settings = { ...this._settings, ...savedSettings };
    }

    // Update state
    state.update({
      'quizMode.quizTime': this._settings.quizTime,
      'quizMode.quizDelay': this._settings.quizDelay,
      'quizMode.autoPlay': this._settings.autoPlay,
      'quizMode.autoPlayFull': this._settings.autoPlayFull
    });

    this._isActive = true;
    state.setMode(MODES.QUIZ);
    this._clearAllTimers();
    this._clearMonitoringTimer(); // ✅ Clean up monitoring timer
    audioService.setPlaybackRate(1.0);

    EventBus.emit('quiz-mode:initialized', this._settings);
    console.log('✅ Quiz mode initialized', this._settings);
  }

  cleanup() {
    if (!this._isActive) return;

    console.log('🧹 Cleaning up Quiz Mode');
    this._clearAllTimers();
    this._clearMonitoringTimer(); // ✅ Clean up monitoring timer

    if (audioService.isPlaying()) audioService.stop();

    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._isPaused = false;
    this._isPlayingFull = false;
    this._isActive = false;

    EventBus.emit('quiz-mode:cleanup');
    console.log('✅ Quiz mode cleaned up');
  }

  async startQuiz() {
    if (!this._isActive) throw new Error('Quiz mode not initialized');

    const selectedTracks = selectionManager.getSelection();
    if (selectedTracks.length === 0) throw new Error('No tracks selected for quiz');

    this._currentPlaylist = playlistService.shufflePlaylist(selectedTracks);
    this._currentIndex = 0;
    this._isPaused = false;
    this._isPlayingFull = false;

    state.update({
      'quizMode.currentTrack': this._currentPlaylist[0],
      'quizMode.isPaused': false
    });

    console.log(`🎯 Quiz started with ${this._currentPlaylist.length} tracks`);
    await this._playCurrentTrack();
  }

  async nextQuestion() {
    if (!this._isActive) throw new Error('Quiz mode not initialized');

    this._clearAllTimers();
    this._clearMonitoringTimer(); // ✅ Clean up monitoring timer
    this._currentIndex++;

    if (this._currentIndex >= this._currentPlaylist.length) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Quiz complete! Great job!',
        type: 'success'
      });
      this.cleanup();
      return;
    }

    this._isPaused = false;
    this._isPlayingFull = false;
    
    state.update({
      'quizMode.currentTrack': this._currentPlaylist[this._currentIndex],
      'quizMode.isPaused': false
    });

    await this._playCurrentTrack();
  }

  async _playCurrentTrack() {
    const trackNum = this._currentPlaylist[this._currentIndex];
    this._isPaused = false;
    this._isPlayingFull = false;

    try {
      await audioService.loadTrack(trackNum);
      audioService.setPlaybackRate(1.0);
      await audioService.play();

      console.log(`🎵 Quiz: Playing track ${trackNum} (${this._currentIndex + 1}/${this._currentPlaylist.length}) for ${this._settings.quizDelay}s`);
      EventBus.emit('quiz-mode:track-started', {
        track: trackNum,
        index: this._currentIndex,
        total: this._currentPlaylist.length
      });
    } catch (error) {
      console.error('Failed to play quiz track:', error);
      EventBus.emit(EVENTS.TOAST_SHOW, { 
        message: 'Failed to play track. Skipping...', 
        type: 'error' 
      });
      setTimeout(() => this.nextQuestion(), 1000);
    }
  }

  _startCountdown() {
    this._countdownTimerId = timerManager.startCountdown(
      this._settings.quizTime,
      {
        onTick: (remaining, total) => EventBus.emit(EVENTS.QUIZ_COUNTDOWN_TICK, { remaining, total }),
        onComplete: async () => {
          console.log('⏰ Quiz countdown complete');
          this._countdownTimerId = null;
          EventBus.emit(EVENTS.QUIZ_COUNTDOWN_COMPLETE);

          // Play full shloka if enabled
          if (this._settings.autoPlayFull && this._isPaused) {
            console.log('🔊 Auto-playing full shloka...');
            await this.playFullShloka();
            // Note: TRACK_ENDED handler will handle autoPlay after full shloka
          }
          // If not playing full, but autoPlay is enabled, skip immediately
          else if (this._settings.autoPlay) {
            console.log('▶️ Auto-playing next track (no full shloka)...');
            setTimeout(() => this.nextQuestion(), 500);
          }
          // else: wait for manual action
          else {
            console.log('⏸️ Waiting for manual action...');
            EventBus.emit(EVENTS.TOAST_SHOW, {
              message: 'Timer complete. Click Next or Play Full.',
              type: 'info'
            });
          }
        }
      }
    );
  }

  async playFullShloka() {
    if (!this._isActive || !this._isPaused) return;

    this._clearAllTimers();
    this._clearMonitoringTimer(); // ✅ Clean up monitoring timer
    this._isPlayingFull = true;
    const trackNum = this._currentPlaylist[this._currentIndex];

    try {
      await audioService.loadTrack(trackNum);
      audioService.setPlaybackRate(1.0);
      await audioService.play();

      console.log(`🔊 Playing full shloka ${trackNum}`);
      EventBus.emit('quiz-mode:playing-full', { track: trackNum });
    } catch (error) {
      this._isPlayingFull = false;
      console.error('Failed to play full shloka:', error);
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Failed to play full shloka',
        type: 'error'
      });
    }
  }

  _clearAllTimers() {
    if (this._countdownTimerId) { 
      timerManager.stopTimer(this._countdownTimerId); 
      this._countdownTimerId = null; 
    }
    // Note: _pauseTimerId is now cleared by _clearMonitoringTimer()
  }

  updateQuizTime(time) {
    const validation = validateQuizTime(time);
    if (!validation.valid) throw new Error(validation.error);

    this._settings.quizTime = validation.value;
    state.set('quizMode.quizTime', validation.value);
    this._saveSettings();
    EventBus.emit('quiz-mode:time-changed', validation.value);
  }

  updateQuizDelay(delay) {
    const validation = validateQuizDelay(delay);
    if (!validation.valid) throw new Error(validation.error);

    this._settings.quizDelay = validation.value;
    state.set('quizMode.quizDelay', validation.value);
    this._saveSettings();
    EventBus.emit('quiz-mode:delay-changed', validation.value);
  }

  toggleAutoPlay() {
    this._settings.autoPlay = !this._settings.autoPlay;
    state.set('quizMode.autoPlay', this._settings.autoPlay);
    this._saveSettings();
    EventBus.emit('quiz-mode:autoplay-changed', this._settings.autoPlay);
    return this._settings.autoPlay;
  }

  toggleAutoPlayFull() {
    this._settings.autoPlayFull = !this._settings.autoPlayFull;
    state.set('quizMode.autoPlayFull', this._settings.autoPlayFull);
    this._saveSettings();
    EventBus.emit('quiz-mode:autoplayfull-changed', this._settings.autoPlayFull);
    return this._settings.autoPlayFull;
  }

  _saveSettings() {
    storageService.saveSettings(this._settings);
  }

  getSettings() {
    return { ...this._settings };
  }

  getState() {
    return {
      playlist: [...this._currentPlaylist],
      currentIndex: this._currentIndex,
      currentTrack: this._currentPlaylist[this._currentIndex] || null,
      isPaused: this._isPaused,
      isPlayingFull: this._isPlayingFull,
      isCountdownActive: this._countdownTimerId !== null
    };
  }

  isActive() { return this._isActive; }

  validate() {
    if (!this._isActive) return { valid: false, error: 'Quiz mode not initialized' };
    if (selectionManager.getCount() === 0) return { valid: false, error: 'No tracks selected for quiz' };
    return { valid: true };
  }
}

// Export singleton
export const quizMode = new QuizMode();
