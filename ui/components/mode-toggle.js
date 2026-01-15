// mode-toggle.js - Mode switching component (UPDATED FOR 3 MODES)

import { $, $$, addClass, removeClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { regularMode } from '../../modes/regular-mode.js';
import { quizMode } from '../../modes/quiz-mode.js';
import { memoryMode } from '../../modes/memory-mode.js';

class ModeToggle {
  constructor() {
    this.regularBtn = null;
    this.quizBtn = null;
    this.memoryBtn = null;
    this.currentMode = MODES.REGULAR;
  }

  initialize() {
    this.regularBtn = $('#regularModeBtn');
    this.quizBtn = $('#quizModeBtn');
    this.memoryBtn = $('#memoryModeBtn');

    this._setupEventListeners();
    this._updateUI();

    console.log('✅ Mode toggle initialized (3 modes)');
  }

  _setupEventListeners() {
    if (this.regularBtn) {
      this.regularBtn.addEventListener('click', () => {
        this._switchMode(MODES.REGULAR);
      });
    }

    if (this.quizBtn) {
      this.quizBtn.addEventListener('click', () => {
        this._switchMode(MODES.QUIZ);
      });
    }

    if (this.memoryBtn) {
      this.memoryBtn.addEventListener('click', () => {
        this._switchMode(MODES.MEMORY);
      });
    }
  }

  _switchMode(newMode) {
    if (this.currentMode === newMode) return;

    const oldMode = this.currentMode;

    console.log(`Switching mode: ${oldMode} → ${newMode}`);

    // Cleanup old mode
    switch (oldMode) {
      case MODES.REGULAR:
        regularMode.cleanup();
        break;
      case MODES.QUIZ:
        quizMode.cleanup();
        break;
      case MODES.MEMORY:
        memoryMode.cleanup();
        break;
    }

    // Initialize new mode
    switch (newMode) {
      case MODES.REGULAR:
        regularMode.initialize();
        break;
      case MODES.QUIZ:
        quizMode.initialize();
        break;
      case MODES.MEMORY:
        memoryMode.initialize();
        break;
    }

    this.currentMode = newMode;
    this._updateUI();

    // Show/hide appropriate controls
    this._toggleControlVisibility(newMode);

    // Emit mode change event
    EventBus.emit(EVENTS.MODE_CHANGED, {
      from: oldMode,
      to: newMode
    });
  }

  _updateUI() {
    // Remove active from all
    [this.regularBtn, this.quizBtn, this.memoryBtn].forEach(btn => {
      if (btn) removeClass(btn, 'active');
    });

    // Add active to current
    switch (this.currentMode) {
      case MODES.REGULAR:
        if (this.regularBtn) addClass(this.regularBtn, 'active');
        break;
      case MODES.QUIZ:
        if (this.quizBtn) addClass(this.quizBtn, 'active');
        break;
      case MODES.MEMORY:
        if (this.memoryBtn) addClass(this.memoryBtn, 'active');
        break;
    }
  }

  _toggleControlVisibility(mode) {
    const regularControls = $('#regularControls');
    const quizControls = $('#quizControls');
    const memoryControls = $('#memoryControls');

    // Hide all
    [regularControls, quizControls, memoryControls].forEach(el => {
      if (el) addClass(el, 'hidden');
    });

    // Show active mode controls
    switch (mode) {
      case MODES.REGULAR:
        if (regularControls) removeClass(regularControls, 'hidden');
        break;
      case MODES.QUIZ:
        if (quizControls) removeClass(quizControls, 'hidden');
        break;
      case MODES.MEMORY:
        if (memoryControls) removeClass(memoryControls, 'hidden');
        break;
    }
  }
}

// Export singleton
export const modeToggle = new ModeToggle();
