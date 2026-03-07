// quiz-controls.js - CLEANED UP VERSION
import { $, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';
import { quizMode } from '../../modes/quiz-mode.js';

class QuizControls {
  constructor() {
    this._quizCurrentText = null;
    this._countdownText = null;
    this._countdownBar = null;
    this._playFullBtn = null;

    this._quizTimeSlider = null;
    this._quizTimeDisplay = null;
    this._quizDelaySlider = null;
    this._quizDelayDisplay = null;
    this._autoPlayToggle = null;
    this._autoPlayFullToggle = null;
  }

  initialize() {
    this._quizCurrentText = $('#quizCurrentText');
    this._countdownText = $('#countdownText');
    this._countdownBar = $('#countdownBar');
    this._playFullBtn = $('#playFullBtn');

    this._quizTimeSlider = $('#quizTimeSlider');
    this._quizTimeDisplay = $('#quizTimeDisplay');
    this._quizDelaySlider = $('#quizDelaySlider');
    this._quizDelayDisplay = $('#quizDelayDisplay');
    this._autoPlayToggle = $('#autoPlayToggle');
    this._autoPlayFullToggle = $('#autoPlayFullToggle');

    this._setupEventListeners();

    console.log('✅ Quiz controls initialized');
  }

  _setupEventListeners() {
    if (this._playFullBtn) {
      this._playFullBtn.addEventListener('click', () => {
        quizMode.playFullShloka();
      });
    }

    if (this._quizTimeSlider && this._quizTimeDisplay) {
      this._quizTimeSlider.addEventListener('input', (e) => {
        const time = parseInt(e.target.value);
        quizMode.updateQuizTime(time);
        this._quizTimeDisplay.textContent = `${time}s`;
        e.target.setAttribute('aria-valuenow', time.toString());
      });
    }

    if (this._quizDelaySlider && this._quizDelayDisplay) {
      this._quizDelaySlider.addEventListener('input', (e) => {
        const delay = parseInt(e.target.value);
        quizMode.updateQuizDelay(delay);
        this._quizDelayDisplay.textContent = `${delay}s`;
        e.target.setAttribute('aria-valuenow', delay.toString());
      });
    }

    if (this._autoPlayToggle) {
      this._autoPlayToggle.addEventListener('change', () => {
        quizMode.toggleAutoPlay();
      });
    }

    if (this._autoPlayFullToggle) {
      this._autoPlayFullToggle.addEventListener('change', () => {
        quizMode.toggleAutoPlayFull();
      });
    }

    // ✅ All string literals replaced with EVENTS constants
    EventBus.on(EVENTS.QUIZ_MODE_TRACK_STARTED, (data) => {
      this._updateCurrentTrack(data.track, data.index, data.total);
      this._hidePlayFullButton();
      this._resetCountdown();
    });

    EventBus.on(EVENTS.QUIZ_MODE_PAUSED, () => {
      this._showRecitationMessage();
      this._showPlayFullButton();
    });

    EventBus.on(EVENTS.QUIZ_COUNTDOWN_TICK, (data) => {
      this._updateCountdown(data.remaining, data.total);
    });

    EventBus.on(EVENTS.QUIZ_COUNTDOWN_COMPLETE, () => {
      this._showTimeUpMessage();
    });

    EventBus.on(EVENTS.QUIZ_MODE_PLAYING_FULL, () => {
      this._hidePlayFullButton();
    });

    EventBus.on(EVENTS.QUIZ_MODE_INITIALIZED, (settings) => {
      this._loadSettings(settings);
    });

    EventBus.on(EVENTS.QUIZ_MODE_CLEANUP, () => {
      this._reset();
    });
  }

  _updateCurrentTrack(trackNum, index, total) {
    if (this._quizCurrentText) {
      this._quizCurrentText.textContent = `Shloka ${trackNum} (${index + 1}/${total})`;
    }
  }

  _showRecitationMessage() {
    if (this._quizCurrentText) {
      this._quizCurrentText.textContent = 'Your turn to recite!';
    }
  }

  _showTimeUpMessage() {
    if (this._quizCurrentText) {
      this._quizCurrentText.textContent = 'Time up! Select next or play full audio.';
    }
  }

  _showPlayFullButton() {
    if (this._playFullBtn) {
      removeClass(this._playFullBtn, 'hidden');
    }
  }

  _hidePlayFullButton() {
    if (this._playFullBtn) {
      addClass(this._playFullBtn, 'hidden');
    }
  }

  _updateCountdown(remaining, total) {
    if (this._countdownText) {
      this._countdownText.textContent = `${remaining}s`;
    }

    if (this._countdownBar) {
      const percentage = (remaining / total) * 100;
      this._countdownBar.style.width = `${percentage}%`;
      this._countdownBar.setAttribute('aria-valuenow', percentage.toFixed(0));
    }
  }

  _resetCountdown() {
    if (this._countdownText) {
      this._countdownText.textContent = '';
    }

    if (this._countdownBar) {
      this._countdownBar.style.width = '100%';
      this._countdownBar.setAttribute('aria-valuenow', '100');
    }
  }

  _loadSettings(settings) {
    if (this._quizTimeSlider) this._quizTimeSlider.value = settings.quizTime;
    if (this._quizTimeDisplay) this._quizTimeDisplay.textContent = `${settings.quizTime}s`;

    if (this._quizDelaySlider) this._quizDelaySlider.value = settings.quizDelay;
    if (this._quizDelayDisplay) this._quizDelayDisplay.textContent = `${settings.quizDelay}s`;

    if (this._autoPlayToggle) this._autoPlayToggle.checked = settings.autoPlay;
    if (this._autoPlayFullToggle) this._autoPlayFullToggle.checked = settings.autoPlayFull || false;
  }

  _reset() {
    if (this._quizCurrentText) {
      this._quizCurrentText.textContent = 'Ready to start';
    }

    this._hidePlayFullButton();
    this._resetCountdown();
  }
}

export const quizControls = new QuizControls();
