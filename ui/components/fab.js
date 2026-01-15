// fab.js - Floating Action Button component (FIXED)
import { $, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES } from '../../core/constants.js';
import { state } from '../../core/state.js';

class FAB {
  constructor() {
    this._fabBtn = null;
    this._fabIcon = null;
    this._fabBadge = null;
    this._isQuizMode = false;
    this._count = 0;
  }
  
  initialize() {
    this._fabBtn = $('#fabBtn');
    this._fabIcon = $('#fabIcon');
    this._fabBadge = $('#fabBadge');
    
    if (!this._fabBtn) {
      console.error('FAB button not found');
      return;
    }
    
    this._setupEventListeners();
    
    // Set initial state
    this.updateState(0);
    
    console.log('✅ FAB initialized');
  }
  
  _setupEventListeners() {
    // Click handler
    this._fabBtn.addEventListener('click', () => {
      this._handleClick();
    });
    
    // Listen to selection changes
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      this.updateState(data.count);
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this.updateState(0);
    });
    
    // Listen to mode changes
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._isQuizMode = data.to === MODES.QUIZ;
      this.updateMode();
    });
  }
  
  _handleClick() {
    if (this._isQuizMode) {
      // Quiz mode: play next/start quiz
      EventBus.emit('fab:quiz-next-clicked');
    } else {
      // Regular mode: play selected
      EventBus.emit('fab:play-clicked');
    }
  }
  
  // Update FAB state based on count
  updateState(count) {
    this._count = count;
    
    if (this._isQuizMode) {
      // Quiz mode: no badge, always enabled
      removeClass(this._fabBtn, 'dimmed');
      addClass(this._fabBadge, 'hidden');
      
      const title = count > 0 
        ? `Quiz ${count} shloka${count > 1 ? 's' : ''}`
        : 'Select shlokas for quiz mode';
      this._fabBtn.setAttribute('title', title);
      this._fabBtn.setAttribute('aria-label', title);
      
    } else {
      // Regular mode: show badge and count
      if (count === 0) {
        addClass(this._fabBtn, 'dimmed');
        addClass(this._fabBadge, 'hidden');
        this._fabBtn.setAttribute('title', 'Select shlokas to play');
        this._fabBtn.setAttribute('aria-label', 'Select shlokas to play');
      } else {
        removeClass(this._fabBtn, 'dimmed');
        removeClass(this._fabBadge, 'hidden');
        
        // Update badge text
        const displayCount = count > 999 ? '999+' : count.toString();
        this._fabBadge.textContent = displayCount;
        
        const title = `Play ${count} shloka${count > 1 ? 's' : ''}`;
        this._fabBtn.setAttribute('title', title);
        this._fabBtn.setAttribute('aria-label', title);
      }
    }
  }
  
  // Update FAB based on mode
  updateMode() {
    if (this._isQuizMode) {
      addClass(this._fabBtn, 'quiz-mode');
      removeClass(this._fabBtn, 'dimmed');
      this._fabIcon.className = 'fa-solid fa-forward-step';
    } else {
      removeClass(this._fabBtn, 'quiz-mode');
      this._fabIcon.className = 'fa-solid fa-play';
    }
    
    // Update state with current count
    this.updateState(this._count);
  }
  
  // Show FAB
  show() {
    if (this._fabBtn) {
      this._fabBtn.style.display = 'flex';
    }
  }
  
  // Hide FAB
  hide() {
    if (this._fabBtn) {
      this._fabBtn.style.display = 'none';
    }
  }
  
  // Enable FAB
  enable() {
    if (this._fabBtn) {
      this._fabBtn.disabled = false;
      removeClass(this._fabBtn, 'disabled');
    }
  }
  
  // Disable FAB
  disable() {
    if (this._fabBtn) {
      this._fabBtn.disabled = true;
      addClass(this._fabBtn, 'disabled');
    }
  }
}

// Export singleton
export const fab = new FAB();
