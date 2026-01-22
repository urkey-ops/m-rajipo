// controls.js - UPDATED with gap slider for regular mode
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
    this._gapSlider = null; // ✅ NEW: Gap slider
    this._gapDisplay = null; // ✅ NEW: Gap display

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
    this._gapSlider = $('#gapSlider'); // ✅ NEW
    this._gapDisplay = $('#gapDisplay'); // ✅ NEW

    // Quiz mode controls
    this._quizTimeSlider = $('#quizTimeSlider');
    this._quizTimeDisplay = $('#quizTimeDisplay');
    this._quizDelaySlider = $('#quizDelaySlider');
    this._quizDelayDisplay = $('#quizDelayDisplay');
    this._autoPlayToggle = $('#autoPlayToggle');

    this._setupEventListeners();
    this._loadRegularModeSettings(); // ✅ NEW: Load saved settings

    console.log('✅ Controls initialized');
  }

  // ✅ NEW: Load regular mode settings on init
  _loadRegularModeSettings() {
    const settings = regularMode.getSettings();
    
    // Load speed
    if (this._speedSlider && this._speedDisplay) {
      this._speedSlider.value = settings.speed;
      this._speedDisplay.textContent = `${settings.speed.toFixed(1)}×`;
    }
    
    // Load repeat count
    if (this._repeatCount) {
      this._repeatCount.value = settings.repeatCount;
    }
    
    // Load shuffle
    if (this._shuffleCheckbox) {
      this._shuffleCheckbox.checked = settings.shuffle;
    }
    
    // Load repeat playlist
    if (this._repeatPlaylistCheckbox) {
      this._repeatPlaylistCheckbox.checked = settings.repeatPlaylist;
    }
    
    // ✅ NEW: Load gap duration
    if (this._gapSlider && this._gapDisplay) {
      this._gapSlider.value = settings.gapDuration;
      this._gapDisplay.textContent = `${settings.gapDuration}s`;
    }
    
    console.log('📥 Regular mode settings loaded:', settings);
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

    // ✅ NEW: Regular mode - Gap slider
    if (this._gapSlider && this._gapDisplay) {
      this._gapSlider.addEventListener('input', (e) => {
        if (!state.isQuizMode()) {
          const gap = parseInt(e.target.value);
          
          try {
            regularMode.updateGapDuration(gap);
            this._gapDisplay.textContent = `${gap}s`;
            e.target.setAttribute('aria-valuenow', gap.toString());
            
            console.log(`Gap updated: ${gap}s`);
          } catch (error) {
            console.error('Gap update error:', error);
            EventBus.emit(EVENTS.TOAST_SHOW, {
              message: error.message,
              type: 'error'
            });
          }
        }
      });
    }

    // Listen to mode changes
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.mode === MODES.QUIZ;
      this._updateControlsForMode();
    });
    
    // ✅ NEW: Listen to regular mode settings changes (for sync)
    EventBus.on('regular-mode:gap-changed', (gap) => {
      if (this._gapSlider && this._gapDisplay) {
        this._gapSlider.value = gap;
        this._gapDisplay.textContent = `${gap}s`;
      }
    });
    
    EventBus.on('regular-mode:speed-changed', (speed) => {
      if (this._speedSlider && this._speedDisplay) {
        this._speedSlider.value = speed;
        this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
      }
    });
  }

  _updateControlsForMode() {
    if (this._isQuizMode) {
      // Disable regular mode controls in quiz mode
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
      // ✅ NEW: Disable gap slider in quiz mode
      if (this._gapSlider) {
        this._gapSlider.disabled = true;
        this._gapSlider.style.opacity = '0.5';
        this._gapSlider.style.cursor = 'not-allowed';
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
      // ✅ NEW: Enable gap slider
      if (this._gapSlider) {
        this._gapSlider.disabled = false;
        this._gapSlider.style.opacity = '1';
        this._gapSlider.style.cursor = 'pointer';
      }
    }
  }

  // Update speed display (for external updates)
  updateSpeedDisplay(speed) {
    if (this._speedDisplay) {
      this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
    }
  }

  // ✅ NEW: Update gap display (for external updates)
  updateGapDisplay(gap) {
    if (this._gapDisplay) {
      this._gapDisplay.textContent = `${gap}s`;
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
