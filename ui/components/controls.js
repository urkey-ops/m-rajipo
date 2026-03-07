// controls.js - CLEANED UP VERSION
import { $, $$, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { regularMode } from '../../modes/regular-mode.js';
import { quizMode } from '../../modes/quiz-mode.js';
import { state } from '../../core/state.js';

class Controls {
  constructor() {
    this._speedSlider = null;
    this._speedDisplay = null;
    this._repeatCount = null;
    this._shuffleCheckbox = null;
    this._repeatPlaylistCheckbox = null;
    this._gapSlider = null;
    this._gapDisplay = null;

    this._quizTimeSlider = null;
    this._quizTimeDisplay = null;
    this._quizDelaySlider = null;
    this._quizDelayDisplay = null;
    this._autoPlayToggle = null;

    this._isQuizMode = false;
  }

  initialize() {
    this._speedSlider = $('#speedSlider');
    this._speedDisplay = $('#speedDisplay');
    this._repeatCount = $('#repeatCount');
    this._shuffleCheckbox = $('#shuffle');
    this._repeatPlaylistCheckbox = $('#repeatPlaylist');
    this._gapSlider = $('#gapSlider');
    this._gapDisplay = $('#gapDisplay');

    this._quizTimeSlider = $('#quizTimeSlider');
    this._quizTimeDisplay = $('#quizTimeDisplay');
    this._quizDelaySlider = $('#quizDelaySlider');
    this._quizDelayDisplay = $('#quizDelayDisplay');
    this._autoPlayToggle = $('#autoPlayToggle');

    this._setupEventListeners();
    this._loadRegularModeSettings();

    console.log('✅ Controls initialized');
  }

  _loadRegularModeSettings() {
    const settings = regularMode.getSettings();

    if (this._speedSlider && this._speedDisplay) {
      this._speedSlider.value = settings.speed;
      this._speedDisplay.textContent = `${settings.speed.toFixed(1)}×`;
    }

    if (this._repeatCount) {
      this._repeatCount.value = settings.repeatCount;
    }

    if (this._shuffleCheckbox) {
      this._shuffleCheckbox.checked = settings.shuffle;
    }

    if (this._repeatPlaylistCheckbox) {
      this._repeatPlaylistCheckbox.checked = settings.repeatPlaylist;
    }

    if (this._gapSlider && this._gapDisplay) {
      this._gapSlider.value = settings.gapDuration;
      this._gapDisplay.textContent = `${settings.gapDuration}s`;
    }

    console.log('📥 Regular mode settings loaded:', settings);
  }

  _setupEventListeners() {
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

    if (this._shuffleCheckbox) {
      this._shuffleCheckbox.addEventListener('change', () => {
        if (!state.isQuizMode()) {
          regularMode.toggleShuffle();
        }
      });
    }

    if (this._repeatPlaylistCheckbox) {
      this._repeatPlaylistCheckbox.addEventListener('change', () => {
        if (!state.isQuizMode()) {
          regularMode.toggleRepeatPlaylist();
        }
      });
    }

    if (this._gapSlider && this._gapDisplay) {
      this._gapSlider.addEventListener('input', (e) => {
        if (!state.isQuizMode()) {
          const gap = parseInt(e.target.value);

          try {
            regularMode.updateGapDuration(gap);
            this._gapDisplay.textContent = `${gap}s`;
            e.target.setAttribute('aria-valuenow', gap.toString());
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

    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.mode === MODES.QUIZ;
      this._updateControlsForMode();
    });

    // ✅ Uses EVENTS constants
    EventBus.on(EVENTS.REGULAR_MODE_GAP_CHANGED, (gap) => {
      if (this._gapSlider && this._gapDisplay) {
        this._gapSlider.value = gap;
        this._gapDisplay.textContent = `${gap}s`;
      }
    });

    EventBus.on(EVENTS.REGULAR_MODE_SPEED_CHANGED, (speed) => {
      if (this._speedSlider && this._speedDisplay) {
        this._speedSlider.value = speed;
        this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
      }
    });
  }

  _updateControlsForMode() {
    const disable = this._isQuizMode;

    const regularControls = [
      this._speedSlider,
      this._repeatCount,
      this._shuffleCheckbox,
      this._repeatPlaylistCheckbox,
      this._gapSlider
    ];

    regularControls.forEach(el => {
      if (!el) return;
      el.disabled = disable;
      if (el.type === 'range') {
        el.style.opacity = disable ? '0.5' : '1';
        el.style.cursor = disable ? 'not-allowed' : 'pointer';
      }
    });
  }

  updateSpeedDisplay(speed) {
    if (this._speedDisplay) {
      this._speedDisplay.textContent = `${speed.toFixed(1)}×`;
    }
  }

  updateGapDisplay(gap) {
    if (this._gapDisplay) {
      this._gapDisplay.textContent = `${gap}s`;
    }
  }

  updateQuizTimeDisplay(time) {
    if (this._quizTimeDisplay) {
      this._quizTimeDisplay.textContent = `${time}s`;
    }
  }

  updateQuizDelayDisplay(delay) {
    if (this._quizDelayDisplay) {
      this._quizDelayDisplay.textContent = `${delay}s`;
    }
  }
}

export const controls = new Controls();
