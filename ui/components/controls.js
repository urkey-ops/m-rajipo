// controls.js - Playback controls (speed, repeat, shuffle, etc.)
import { $, addClass, removeClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';
import { regularMode } from '../../modes/regular-mode.js';
import { quizMode } from '../../modes/quiz-mode.js';
import { state } from '../../core/state.js';

class Controls {
  constructor() {
    // Regular mode controls
    this._speedSlider = null;
    this._speedDisplay = null;
    this._repeatCount = null;
    this._shuffleCheckbox = null;
    this._repeatPlaylistCheckbox = null;
    
    // Quiz mode controls
    this._quizTimeSlider = null;
    this._quizTimeDisplay = null;
    this._quizDelaySlider = null;
    this._quizDelayDisplay = null;
    this._autoPlayToggle = null;
    
    this._isQuizMode = false;
  }
  
  initialize() {
    // Regular mode controls
    this._speedSlider = $('#speedSlider');
    this._speedDisplay = $('#speedDisplay');
    this._repeatCount = $('#repeatCount');
    this._shuffleCheckbox = $('#shuffle');
    this._repeatPlaylistCheckbox = $('#repeatPlaylist');
    
    // Quiz mode controls
    this._quizTimeSlider = $('#quizTimeSlider');
    this._quizTimeDisplay = $('#quizTimeDisplay');
    this._quizDelaySlider = $('#quizDelaySlider');
    this._quizDelayDisplay = $('#quizDelayDisplay');
    this._autoPlayToggle = $('#autoPlayToggle');
    
    this._setupEventListeners();
    
    console.log('✅ Controls initialized');
  }
  
  _setupEventListeners() {
    // Regular mode controls
    if (this._speedSlider && this._speedDisplay) {
      this._speedSlider.addEventListener('input', (e) => {
        if (!state.isQuizMode()) {
          const speed = parseFloat(e.target.value);
          regularMode.updateSpeed(speed);
          this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
        }
      });
    }
    
    if (this._repeatCount) {
      this._repeatCount.addEventListener('change', () => {
        const value = parseInt(this._repeatCount.value);
        if (value < 1) this._repeatCount.value = 1;
        if (value > 10) this._repeatCount.value = 10;
      });
      
      this._repeatCount.addEventListener('input', () => {
        const value = parseInt(this._repeatCount.value);
        if (value > 10) this._repeatCount.value = 10;
      });
    }
    
    // Shuffle checkbox
    if (this._shuffle) {
      this._shuffle.addEventListener('change', () => {
        regularMode.toggleShuffle();
      });
    }
    
    // Repeat playlist checkbox
    if (this._repeatPlaylist) {
      this._repeatPlaylist.addEventListener('change', () => {
        regularMode.toggleRepeatPlaylist();
      });
    }
    
    // Repeat count input
    if (this._repeatCount) {
      this._repeatCount.addEventListener('change', () => {
        try {
          regularMode.updateRepeatCount(this._repeatCount.value);
        } catch (error) {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: error.message,
            type: 'error'
          });
        }
      });
      
      // Prevent invalid input
      this._repeatCount.addEventListener('input', () => {
        const value = parseInt(this._repeatCount.value);
        if (value > 10) this._repeatCount.value = 10;
        if (value < 1) this._repeatCount.value = 1;
      });
    }
    
    console.log('✅ Controls initialized');
  }
  
  // Update speed display
  updateSpeedDisplay(speed) {
    if (this._speedDisplay) {
      this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
    }
  }
  
  // Update quiz time display
  updateQuizTimeDisplay(time) {
    if (this._quizTimeDisplay) {
      this._quizTimeDisplay.textContent = `${time}s`;
    }
  }
  
  // Update quiz delay display
  updateQuizDelayDisplay(delay) {
    if (this._quizDelayDisplay) {
      this._quizDelayDisplay.textContent = `${delay}s`;
    }
  }
  
  // Enable/disable controls based on mode
  setRegularControlsEnabled(enabled) {
    const controls = $$('#regularControls input, #regularControls button');
    controls.forEach(el => {
      el.disabled = !enabled;
      if (enabled) {
        removeClass(el, 'disabled');
      } else {
        addClass(el, 'disabled');
      }
    });
  }
  
  setQuizControlsEnabled(enabled) {
    const controls = $$('#quizControls input, #quizControls button');
    controls.forEach(el => {
      el.disabled = !enabled;
    });
  }
}

// Export singleton
export const controls = new Controls();
