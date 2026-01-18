// fab.js - Floating Action Button (FIXED with debounce)
import { $, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { state } from '../../core/state.js';

class Fab {
  constructor() {
    this.button = null;
    this.icon = null;
    this.badge = null;
    this.currentMode = MODES.REGULAR;
    this._isProcessing = false; // ✅ NEW: Prevent rapid clicks
    this._debounceTimeout = null; // ✅ NEW: Debounce timer
  }
  
  initialize() {
    this.button = $('#fabBtn');
    this.icon = $('#fabIcon');
    this.badge = $('#fabBadge');
    
    if (!this.button) {
      console.error('FAB button not found');
      return;
    }
    
    this._setupEventListeners();
    console.log('✅ FAB initialized');
  }
  
  _setupEventListeners() {
    // ✅ FIXED: Debounced click handler
    this.button.addEventListener('click', () => {
      this._handleClickDebounced();
    });
    
    // ✅ FIXED: Use correct property from event
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      this._updateBadge(data.count);
      this._updateDimmedState(data.count);
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this._updateBadge(0);
      this._updateDimmedState(0);
    });
    
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this.currentMode = data.mode; // ✅ FIXED: Use 'mode' property
      this._updateForMode(data.mode);
    });
  }
  
  // ✅ NEW: Debounced click handler to prevent rapid clicks
  _handleClickDebounced() {
    // If already processing, ignore
    if (this._isProcessing) {
      console.log('FAB click ignored - already processing');
      return;
    }
    
    // Clear any existing debounce timeout
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
    
    // Set processing flag and add visual feedback
    this._isProcessing = true;
    addClass(this.button, 'processing');
    
    // Handle the click
    this._handleClick();
    
    // Reset processing flag after debounce period (500ms)
    this._debounceTimeout = setTimeout(() => {
      this._isProcessing = false;
      removeClass(this.button, 'processing');
      this._debounceTimeout = null;
    }, 500);
  }
  
  _handleClick() {
    switch (this.currentMode) {
      case MODES.REGULAR:
        EventBus.emit('fab:play-clicked');
        break;
      case MODES.QUIZ:
        EventBus.emit('fab:quiz-next-clicked');
        break;
      case MODES.MEMORY:
        EventBus.emit('fab:memory-clicked');
        break;
    }
  }
  
  _updateForMode(mode) {
    // Remove all mode classes
    removeClass(this.button, 'quiz-mode', 'memory-mode');
    
    // Update icon and class
    switch (mode) {
      case MODES.REGULAR:
        this.icon.className = 'fa-solid fa-play';
        this.button.setAttribute('aria-label', 'Play selection');
        break;
      case MODES.QUIZ:
        this.icon.className = 'fa-solid fa-forward';
        this.button.setAttribute('aria-label', 'Next question');
        addClass(this.button, 'quiz-mode');
        break;
      case MODES.MEMORY:
        this.icon.className = 'fa-solid fa-brain';
        this.button.setAttribute('aria-label', 'Start memory loop');
        addClass(this.button, 'memory-mode');
        break;
    }
  }
  
  _updateBadge(count) {
    if (!this.badge) return;
    
    if (count > 0) {
      this.badge.textContent = count;
      removeClass(this.badge, 'hidden');
    } else {
      addClass(this.badge, 'hidden');
    }
  }
  
  _updateDimmedState(count) {
    if (!this.button) return;
    
    // In regular mode, dim if no selection
    if (this.currentMode === MODES.REGULAR) {
      toggleClass(this.button, 'dimmed', count === 0);
    } else {
      removeClass(this.button, 'dimmed');
    }
  }
  
  show() {
    if (this.button) {
      removeClass(this.button, 'hidden');
    }
  }
  
  hide() {
    if (this.button) {
      addClass(this.button, 'hidden');
    }
  }
  
  // ✅ NEW: Cleanup method
  cleanup() {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
      this._debounceTimeout = null;
    }
    this._isProcessing = false;
    
    if (this.button) {
      removeClass(this.button, 'processing');
    }
  }
}

export const fab = new Fab();
