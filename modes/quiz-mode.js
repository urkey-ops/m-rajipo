// quiz-mode.js - Quiz mode logic
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
      autoPlay: DEFAULT_SETTINGS.AUTO_PLAY
    };
    
    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._isPaused = false;
    this._countdownTimerId = null;
    this._pauseTimerId = null;
    
    this._setupEventListeners();
  }
  
  _setupEventListeners() {
    // Listen to audio playing event to start pause timer
    EventBus.on(EVENTS.PLAYBACK_STARTED, (data) => {
      if (this._isActive && !this._isPaused) {
        this._startPauseTimer();
      }
    });
    
    // Listen to track ended (shouldn't auto-advance in quiz mode)
    EventBus.on(EVENTS.TRACK_ENDED, () => {
      if (this._isActive) {
        console.log('Quiz mode: Track ended, waiting for user action');
      }
    });
  }
  
  // Initialize quiz mode
  initialize() {
    if (this._isActive) {
      console.warn('Quiz mode already active');
      return;
    }
    
    console.log('🧠 Initializing Quiz Mode');
    
    // Load saved settings
    const savedSettings = storageService.loadSettings();
    if (savedSettings) {
      this._settings = { ...this._settings, ...savedSettings };
    }
    
    // Update state settings
    state.update({
      'quizMode.quizTime': this._settings.quizTime,
      'quizMode.quizDelay': this._settings.quizDelay,
      'quizMode.autoPlay': this._settings.autoPlay
    });
    
    this._isActive = true;
    
    // Set mode in state
    state.setMode(MODES.QUIZ);
    
    // Clear any existing timers
    this._clearAllTimers();
    
    // Force speed to 1.0 in quiz mode
    audioService.setPlaybackRate(1.0);
    
    EventBus.emit('quiz-mode:initialized', this._settings);
    
    console.log('✅ Quiz mode initialized', this._settings);
  }
  
  // Cleanup quiz mode
  cleanup() {
    if (!this._isActive) return;
    
    console.log('🧹 Cleaning up Quiz Mode');
    
    // Clear all timers
    this._clearAllTimers();
    
    // Stop audio
    if (audioService.isPlaying()) {
      audioService.stop();
    }
    
    // Reset state
    this._currentPlaylist = [];
    this._currentIndex = 0;
    this._isPaused = false;
    
    this._isActive = false;
    
    EventBus.emit('quiz-mode:cleanup');
    
    console.log('✅ Quiz mode cleaned up');
  }
  
  // Start quiz
  async startQuiz() {
    if (!this._isActive) {
      throw new Error('Quiz mode not initialized');
    }
    
    // Get selected tracks
    const selectedTracks = selectionManager.getSelection();
    
    if (selectedTracks.length === 0) {
      throw new Error('No tracks selected for quiz');
    }
    
    // Shuffle tracks for quiz
    this._currentPlaylist = playlistService.shufflePlaylist(selectedTracks);
    this._currentIndex = 0;
    this._isPaused = false;
    
    // Update state
    state.update({
      'quizMode.currentTrack': this._currentPlaylist[0],
      'quizMode.isPaused': false
    });
    
    console.log(`🎯 Quiz started with ${this._currentPlaylist.length} tracks`);
    
    // Play first track
    await this._playCurrentTrack();
  }
  
  // Play next question
  async nextQuestion() {
    if (!this._isActive) {
      throw new Error('Quiz mode not initialized');
    }
    
    // Clear countdown timer
    this._clearAllTimers();
    
    // Move to next track
    this._currentIndex++;
    
    // Check if we have more tracks
    if (this._currentIndex >= this._currentPlaylist.length) {
      // End of quiz
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Quiz complete! Great job!',
        type: 'success'
      });
      
      this.cleanup();
      return;
    }
    
    this._isPaused = false;
    
    // Update state
    state.update({
      'quizMode.currentTrack': this._currentPlaylist[this._currentIndex],
      'quizMode.isPaused': false
    });
    
    // Play next track
    await this._playCurrentTrack();
  }
  
  // Play current track (with pause after delay)
  async _playCurrentTrack() {
    const trackNum = this._currentPlaylist[this._currentIndex];
    
    this._isPaused = false;
    
    try {
      await audioService.loadTrack(trackNum);
      
      // Ensure speed is 1.0 for quiz mode
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
      
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Failed to play track. Skipping...',
        type: 'error'
      });
      
      // Auto-skip to next
      setTimeout(() => this.nextQuestion(), 1000);
    }
  }
  
  // Start pause timer (pauses audio after quiz delay)
  _startPauseTimer() {
    // Clear any existing pause timer
    if (this._pauseTimerId) {
      timerManager.stopTimer(this._pauseTimerId);
      this._pauseTimerId = null;
    }
    
    const delayMs = this._settings.quizDelay * TIMING.MS_PER_SECOND;
    
    console.log(`⏸️ Quiz: Will pause after ${this._settings.quizDelay}s`);
    
    this._pauseTimerId = timerManager.startDelay(delayMs, () => {
      if (!this._isActive || this._isPaused) return;
      
      audioService.pause();
      this._isPaused = true;
      
      // Update state
      state.set('quizMode.isPaused', true);
      
      console.log('⏸️ Quiz: Audio paused, your turn!');
      
      EventBus.emit('quiz-mode:paused-for-recitation');
      
      // Start countdown
      this._startCountdown();
    });
  }
  
  // Start countdown timer
  _startCountdown() {
    this._countdownTimerId = timerManager.startCountdown(
      this._settings.quizTime,
      {
        onTick: (remaining, total) => {
          EventBus.emit(EVENTS.QUIZ_COUNTDOWN_TICK, { remaining, total });
        },
        onComplete: () => {
          console.log('⏰ Quiz countdown complete');
          this._countdownTimerId = null;
          
          EventBus.emit(EVENTS.QUIZ_COUNTDOWN_COMPLETE);
          
          // Auto-play next if enabled
          if (this._settings.autoPlay) {
            console.log('▶️ Auto-playing next track...');
            setTimeout(() => this.nextQuestion(), 500);
          }
        }
      }
    );
  }
  
  // Play full shloka (after pause)
  async playFullShloka() {
    if (!this._isActive || !this._isPaused) {
      console.warn('Cannot play full shloka - not in paused state');
      return;
    }
    
    // Clear countdown
    this._clearAllTimers();
    
    const trackNum = this._currentPlaylist[this._currentIndex];
    
    try {
      await audioService.loadTrack(trackNum);
      
      // Ensure speed is 1.0
      audioService.setPlaybackRate(1.0);
      
      await audioService.play();
      
      console.log(`🔊 Playing full shloka ${trackNum}`);
      
      EventBus.emit('quiz-mode:playing-full', { track: trackNum });
      
    } catch (error) {
      console.error('Failed to play full shloka:', error);
    }
  }
  
  // Clear all timers
  _clearAllTimers() {
    if (this._countdownTimerId) {
      timerManager.stopTimer(this._countdownTimerId);
      this._countdownTimerId = null;
    }
    if (this._pauseTimerId) {
      timerManager.stopTimer(this._pauseTimerId);
      this._pauseTimerId = null;
    }
  }
  
  // Update quiz time
  updateQuizTime(time) {
    const validation = validateQuizTime(time);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    this._settings.quizTime = validation.value;
    state.set('quizMode.quizTime', validation.value);
    
    this._saveSettings();
    
    console.log(`Quiz time updated: ${validation.value}s`);
    
    EventBus.emit('quiz-mode:time-changed', validation.value);
  }
  
  // Update quiz delay
  updateQuizDelay(delay) {
    const validation = validateQuizDelay(delay);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    this._settings.quizDelay = validation.value;
    state.set('quizMode.quizDelay', validation.value);
    
    this._saveSettings();
    
    console.log(`Quiz delay updated: ${validation.value}s`);
    
    EventBus.emit('quiz-mode:delay-changed', validation.value);
  }
  
  // Toggle auto-play
  toggleAutoPlay() {
    this._settings.autoPlay = !this._settings.autoPlay;
    state.set('quizMode.autoPlay', this._settings.autoPlay);
    
    this._saveSettings();
    
    console.log(`Auto-play: ${this._settings.autoPlay}`);
    
    EventBus.emit('quiz-mode:autoplay-changed', this._settings.autoPlay);
    
    return this._settings.autoPlay;
  }
  
  // Save settings to storage
  _saveSettings() {
    storageService.saveSettings(this._settings);
  }
  
  // Get current settings
  getSettings() {
    return { ...this._settings };
  }
  
  // Get current quiz state
  getState() {
    return {
      playlist: [...this._currentPlaylist],
      currentIndex: this._currentIndex,
      currentTrack: this._currentPlaylist[this._currentIndex] || null,
      isPaused: this._isPaused,
      isCountdownActive: this._countdownTimerId !== null
    };
  }
  
  // Check if mode is active
  isActive() {
    return this._isActive;
  }
  
  // Validate if quiz can start
  validate() {
    if (!this._isActive) {
      return { valid: false, error: 'Quiz mode not initialized' };
    }
    
    const selectedCount = selectionManager.getCount();
    if (selectedCount === 0) {
      return { valid: false, error: 'No tracks selected for quiz' };
    }
    
    return { valid: true };
  }
}

// Export singleton
export const quizMode = new QuizMode();
