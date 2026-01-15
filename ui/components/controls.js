// controls.js - Playback controls (FIXED - Mode-aware disable)
import { $, $$, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
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
    // Regular mode - Speed slider
    if (this._speedSlider && this._speedDisplay) {
      this._speedSlider.addEventListener('input', (e) => {
        if (!state.isQuizMode()) {
          const speed = parseFloat(e.target.value);
          regularMode.updateSpeed(speed);
         this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
          e.target.setAttribute('aria-valuenow', speed.toString());
        }
      });
    }

    // Regular mode - Repeat count
    if (this._repeatCount) {
      this._repeatCount.addEventListener('change', () => {
        const value = parseInt(this._repeatCount.value, 10);
        if (value < 1) this._repeatCount.value = 1;
        if (value > 10) this._repeatCount.value = 10;

        try {
          regularMode.updateRepeatCount(this._repeatCount.value);
        } catch (error) {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: error.message,
            type: 'error'
          });
        }
      });

      this._repeatCount.addEventListener('input', () => {
        const value = parseInt(this._repeatCount.value, 10);
        if (value > 10) this._repeatCount.value = 10;
        if (value < 1) this._repeatCount.value = 1;
      });
    }

    // Regular mode - Shuffle checkbox
    if (this._shuffleCheckbox) {
      this._shuffleCheckbox.addEventListener('change', () => {
        if (!state.isQuizMode()) {
          regularMode.toggleShuffle();
        }
      });
    }

    // Regular mode - Repeat playlist checkbox
    if (this._repeatPlaylistCheckbox) {
      this._repeatPlaylistCheckbox.addEventListener('change', () => {
        if (!state.isQuizMode()) {
          regularMode.toggleRepeatPlaylist();
        }
      });
    }

    // Listen to mode changes
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.to === MODES.QUIZ;
      this._updateControlsForMode();
    });
  }

  _updateControlsForMode() {
    if (this._isQuizMode) {
      // Disable regular mode controls
      if (this._speedSlider) {
        this._speedSlider.disabled = true;
        this._speedSlider.style.opacity = '0.5';
        this._speedSlider.style.cursor = 'not-allowed';
      }
      if (this._repeatCount) {
        this._repeatCount.disabled = true;
      }
      if (this._shuffleCheckbox) {
        this._shuffleCheckbox.disabled = true;
      }
      if (this._repeatPlaylistCheckbox) {
        this._repeatPlaylistCheckbox.disabled = true;
      }
    } else {
      // Enable regular mode controls
      if (this._speedSlider) {
        this._speedSlider.disabled = false;
        this._speedSlider.style.opacity = '1';
        this._speedSlider.style.cursor = 'pointer';
      }
      if (this._repeatCount) {
        this._repeatCount.disabled = false;
      }
      if (this._shuffleCheckbox) {
        this._shuffleCheckbox.disabled = false;
      }
      if (this._repeatPlaylistCheckbox) {
        this._repeatPlaylistCheckbox.disabled = false;
      }
    }
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
}

// Export singleton
export const controls = new Controls();
