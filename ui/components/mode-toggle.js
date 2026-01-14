// mode-toggle.js - Mode toggle (segmented control) component
import { $, $$, addClass, removeClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { regularMode } from '../../modes/regular-mode.js';
import { quizMode } from '../../modes/quiz-mode.js';
import { audioService } from '../../services/audio-service.js';

class ModeToggle {
  constructor() {
    this._regularBtn = null;
    this._quizBtn = null;
    this._currentMode = MODES.REGULAR;
  }
  
  initialize() {
    this._regularBtn = $('#regularModeBtn');
    this._quizBtn = $('#quizModeBtn');
    
    if (!this._regularBtn || !this._quizBtn) {
      console.error('Mode toggle buttons not found');
      return;
    }
    
    this._setupEventListeners();
    
    // Initialize regular mode by default
    this._switchMode(MODES.REGULAR);
    
    console.log('✅ Mode toggle initialized');
  }
  
  _setupEventListeners() {
    this._regularBtn.addEventListener('click', () => {
      if (this._currentMode !== MODES.REGULAR) {
        this._switchMode(MODES.REGULAR);
      }
    });
    
    this._quizBtn.addEventListener('click', () => {
      if (this._currentMode !== MODES.QUIZ) {
        this._switchMode(MODES.QUIZ);
      }
    });
  }
  
  _switchMode(toMode) {
    const fromMode = this._currentMode;
    
    // Check if audio is playing
    const wasPlaying = audioService.isPlaying();
    
    // Cleanup old mode
    if (fromMode === MODES.REGULAR) {
      regularMode.cleanup();
    } else if (fromMode === MODES.QUIZ) {
      quizMode.cleanup();
    }
    
    // Stop any playing audio
    if (wasPlaying) {
      audioService.stop();
    }
    
    // Update button UI
    if (toMode === MODES.REGULAR) {
      addClass(this._regularBtn, 'active');
      removeClass(this._quizBtn, 'active');
    } else {
      removeClass(this._regularBtn, 'active');
      addClass(this._quizBtn, 'active');
    }
    
    // Show/hide appropriate controls
    const regularControls = $('#regularControls');
    const quizControls = $('#quizControls');
    
    if (toMode === MODES.REGULAR) {
      if (regularControls) removeClass(regularControls, 'hidden');
      if (quizControls) addClass(quizControls, 'hidden');
    } else {
      if (regularControls) addClass(regularControls, 'hidden');
      if (quizControls) removeClass(quizControls, 'hidden');
    }
    
    // Initialize new mode
    if (toMode === MODES.REGULAR) {
      regularMode.initialize();
    } else if (toMode === MODES.QUIZ) {
      quizMode.initialize();
    }
    
    this._currentMode = toMode;
    
    // Show toast if audio was playing
    if (wasPlaying) {
      const modeName = toMode === MODES.QUIZ ? 'Quiz' : 'Regular';
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: `Switched to ${modeName} mode. Playback stopped.`,
        type: 'info'
      });
    }
    
    console.log(`Mode switched: ${fromMode} → ${toMode}`);
  }
  
  getCurrentMode() {
    return this._currentMode;
  }
  
  isQuizMode() {
    return this._currentMode === MODES.QUIZ;
  }
  
  isRegularMode() {
    return this._currentMode === MODES.REGULAR;
  }
}

// Export singleton
export const modeToggle = new ModeToggle();
