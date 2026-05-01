// mode-toggle.js - Mode switching component (FIXED with proper event emission and selection clearing)
import { $, $$, addClass, removeClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { regularMode } from '../../modes/regular-mode.js';
import { quizMode } from '../../modes/quiz-mode.js';
import { memoryMode } from '../../modes/memory-mode.js';
import { selectionManager } from '../../managers/selection-manager.js';

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
    
    // ✅ NEW - Set initial mode on body for CSS
    document.body.setAttribute('data-mode', this.currentMode);
    
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
    console.log(`🔄 Switching mode: ${oldMode} → ${newMode}`);
    
    // ✅ Clear selections when switching to/from Memory Mode
    if (newMode === MODES.MEMORY || oldMode === MODES.MEMORY) {
      const hadSelection = selectionManager.getCount() > 0;
      selectionManager.clear();
      
      if (hadSelection) {
        console.log('🧹 Cleared selections due to Memory Mode switch');
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: newMode === MODES.MEMORY 
            ? 'Memory Mode: Select 1 shloka to memorize' 
            : 'Selections cleared. Select shlokas to continue.',
          type: 'info'
        });
      }
    }
    
    // 1. Cleanup old mode FIRST
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
    
    // 2. Initialize new mode
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
    
    // 3. ✅ NEW: Explicit state sync after cleanup/init
    state.set('currentMode', newMode);
    
    this.currentMode = newMode;
    this._updateUI();
    
    // ✅ Update body data-mode attribute for CSS
    document.body.setAttribute('data-mode', newMode);
    
    // Show/hide appropriate controls
    this._toggleControlVisibility(newMode);
    
    // ✅ Emit event with BOTH properties for compatibility
    EventBus.emit(EVENTS.MODE_CHANGED, {
      mode: newMode,
      from: oldMode,
      to: newMode
    });
    
    console.log(`✅ Mode switch complete: ${oldMode} → ${newMode}, state synced`);
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

export const modeToggle = new ModeToggle();
