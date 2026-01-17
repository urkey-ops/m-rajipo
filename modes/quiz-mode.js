// quiz-mode.js - Quiz mode logic with autoPlayFull support
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
      autoPlayFull: false // NEW: auto-play full shloka after countdown
    };
    
    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._isPaused = false;
    this._countdownTimerId = null;
    this._pauseTimerId = null;
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    EventBus.on(EVENTS.PLAYBACK_STARTED, () => {
      if (this._isActive && !this._isPaused) {
        this._startPauseTimer();
      }
    });

    EventBus.on(EVENTS.TRACK_ENDED, () => {
      if (this._isActive) {
        console.log('Quiz mode: Track ended, waiting for user action');
      }
    });
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
    audioService.setPlaybackRate(1.0);

    EventBus.emit('quiz-mode:initialized', this._settings);
    console.log('✅ Quiz mode initialized', this._settings);
  }

  cleanup() {
    if (!this._isActive) return;

    console.log('🧹 Cleaning up Quiz Mode');
    this._clearAllTimers();

    if (audioService.isPlaying()) audioService.stop();

    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._isPaused = false;
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
    state.update({
      'quizMode.currentTrack': this._currentPlaylist[this._currentIndex],
      'quizMode.isPaused': false
    });

    await this._playCurrentTrack();
  }

  async _playCurrentTrack() {
    const trackNum = this._currentPlaylist[this._currentIndex];
    this._isPaused = false;

    try {
      await audioService.loadTrack(trackNum);
      audioService.setPlaybackRate(1.0);
      await audioService.play();

      console.log(`🎵 Quiz: Playing track ${trackNum} (${this._currentIndex + 1}/${this._currentPlaylist.length})`);
      EventBus.emit('quiz-mode:track-started', {
        track: trackNum,
        index: this._currentIndex,
        total: this._currentPlaylist.length
      });
    } catch (error) {
      console.error('Failed to play quiz track:', error);
      EventBus.emit(EVENTS.TOAST_SHOW, { message: 'Failed to play track. Skipping...', type: 'error' });
      setTimeout(() => this.nextQuestion(), 1000);
    }
  }

  _startPauseTimer() {
    if (this._pauseTimerId) timerManager.stopTimer(this._pauseTimerId);

    const delayMs = this._settings.quizDelay * TIMING.MS_PER_SECOND;
    console.log(`⏸️ Quiz: Will pause after ${this._settings.quizDelay}s`);

    this._pauseTimerId = timerManager.startDelay(delayMs, () => {
      if (!this._isActive || this._isPaused) return;

      audioService.pause();
      this._isPaused = true;
      state.set('quizMode.isPaused', true);

      console.log('⏸️ Quiz: Audio paused, your turn!');
      EventBus.emit('quiz-mode:paused-for-recitation');

      // Start countdown
      this._startCountdown();
    });
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

          // Auto-play next track
          if (this._settings.autoPlay) {
            console.log('▶️ Auto-playing next track...');
            setTimeout(() => this.nextQuestion(), 500);
          }
          // NEW: Auto-play full shloka if enabled
          else if (this._settings.autoPlayFull && this._isPaused) {
            console.log('🔊 Auto-playing full shloka...');
            await this.playFullShloka();
          }
        }
      }
    );
  }

  async playFullShloka() {
    if (!this._isActive || !this._isPaused) return;

    this._clearAllTimers();
    const trackNum = this._currentPlaylist[this._currentIndex];

    try {
      await audioService.loadTrack(trackNum);
      audioService.setPlaybackRate(1.0);
      await audioService.play();

      console.log(`🔊 Playing full shloka ${trackNum}`);
      EventBus.emit('quiz-mode:playing-full', { track: trackNum });
    } catch (error) {
      console.error('Failed to play full shloka:', error);
    }
  }

  _clearAllTimers() {
    if (this._countdownTimerId) { timerManager.stopTimer(this._countdownTimerId); this._countdownTimerId = null; }
    if (this._pauseTimerId) { timerManager.stopTimer(this._pauseTimerId); this._pauseTimerId = null; }
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
