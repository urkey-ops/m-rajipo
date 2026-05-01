// shloka-grid.js - FIXED with Clear All button and proper mode handling

import { $, $$, createElement, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, TOTAL_TRACKS, MODES } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { selectionManager } from '../../managers/selection-manager.js';

class ShlokaGrid {
  constructor() {
    this._grid = null;
    this._searchTerm = '';
    this._isUpdatingFromManager = false;
    this._currentMode = MODES.REGULAR;
    this._clearAllBtn = null;
  }

  // Add this method to ShlokaGrid class (after constructor)
_debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
  
  initialize() {
    this._grid = $('#shlokaGrid');
    
    if (!this._grid) {
      console.error('Shloka grid not found');
      return;
    }
    
    this._generateGrid();
    this._setupEventListeners();
    this._setupClearAllButton();
    
    setTimeout(() => {
      this._updateSelectionActions();
    }, 100);
    
    console.log('✅ Shloka grid initialized');
  }
  
  _generateGrid() {
    const fragment = document.createDocumentFragment();
    
    for (let i = 1; i <= TOTAL_TRACKS; i++) {
      const label = createElement('label', {
        className: 'shloka-item',
        dataset: { shloka: i.toString() }
      });
      
      const checkbox = createElement('input', {
        type: 'checkbox',
        className: 'shloka-checkbox',
        value: i.toString(),
        id: `shloka-${i}`
      });
      
      const span = createElement('span', {}, [i.toString()]);
      
      label.appendChild(checkbox);
      label.appendChild(span);
      fragment.appendChild(label);
    }
    
    this._grid.innerHTML = '';
    this._grid.appendChild(fragment);
    
    console.log(`Generated ${TOTAL_TRACKS} shloka items`);
  }
  
  _setupClearAllButton() {
    this._clearAllBtn = $('#clearAllBtn') || 
                        $('#clearAll') || 
                        $('.clear-all-btn') ||
                        $('[data-action="clear-all"]');
    
    if (this._clearAllBtn) {
      this._clearAllBtn.addEventListener('click', () => {
        console.log('🗑️ Clear All clicked');
        this.clearAllSelection();
      });
      console.log('✅ Clear All button connected');
    } else {
      console.warn('⚠️ Clear All button not found in DOM');
    }
  }
  
  _setupEventListeners() {
    this._grid.addEventListener('click', (e) => {
      const label = e.target.closest('.shloka-item');
      if (!label) return;
      
      const style = window.getComputedStyle(label);
      if (style.display === 'none') return;
      
      const checkbox = label.querySelector('.shloka-checkbox');
      if (!checkbox) return;
      
      if (e.target === checkbox) {
        this._handleCheckboxChange(checkbox);
        return;
      }
      
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      this._handleCheckboxChange(checkbox);
    });
    
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      if (!this._isUpdatingFromManager) {
        this._updateVisualStateFromManager();
      }
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      if (!this._isUpdatingFromManager) {
        this._clearAllVisualSelection();
      }
    });

    // ✅ FIXED: Use correct property from event
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._currentMode = data.mode; // ✅ FIXED: Now matches emitted property
      this._updateGridForMode(data.mode);
      console.log(`📊 Grid mode changed to: ${data.mode}`);
    });
  }
  
  _updateGridForMode(mode) {
    if (mode === MODES.MEMORY) {
      this._grid.setAttribute('data-mode', 'memory');
      console.log('🧠 Grid set to Memory Mode - single selection only');
    } else {
      this._grid.setAttribute('data-mode', 'multi');
    }
  }
  
 _handleCheckboxChange(checkbox) {
  // ✅ NEW: Debounced selection update (200ms)
  const debouncedUpdate = this._debounce(() => {
    const trackNum = parseInt(checkbox.value);
    const isChecked = checkbox.checked;
    
    const label = checkbox.closest('.shloka-item');
    
    // In Memory Mode, enforce single selection
    if (this._currentMode === MODES.MEMORY && isChecked) {
      $$('.shloka-checkbox').forEach(cb => {
        if (cb !== checkbox && cb.checked) {
          cb.checked = false;
          removeClass(cb.closest('.shloka-item'), 'selected');
        }
      });
    }
    
    toggleClass(label, 'selected', isChecked);
    
    if (isChecked) {
      selectionManager.select(trackNum);
      this._deselectSheetItems();
    } else {
      selectionManager.deselect(trackNum);
    }
    
    this._updateSelectionActions();
  }, 200);

  debouncedUpdate();
}
  
  _updateVisualStateFromManager() {
    const selectedTracks = selectionManager.getSelection();
    const selectedSet = new Set(selectedTracks);
    
    $$('.shloka-checkbox').forEach(checkbox => {
      const trackNum = parseInt(checkbox.value);
      const isSelected = selectedSet.has(trackNum);
      
      checkbox.checked = isSelected;
      toggleClass(checkbox.closest('.shloka-item'), 'selected', isSelected);
    });
    
    this._updateSelectionActions();
  }
  
  _clearAllVisualSelection() {
    $$('.shloka-checkbox').forEach(checkbox => {
      checkbox.checked = false;
      removeClass(checkbox.closest('.shloka-item'), 'selected');
    });
    
    this._updateSelectionActions();
  }
  
  clearAllSelection() {
    console.log('🗑️ Clearing all selections');
    
    selectionManager.clear();
    this._clearAllVisualSelection();
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: 'All selections cleared',
      type: 'info'
    });
  }
  
  _updateSelectionActions() {
    const selectionActions = $('#selectionActions');
    const selectionCount = $('#selectionCount');
    const count = selectionManager.getCount();
    
    if (selectionActions) {
      toggleClass(selectionActions, 'hidden', count === 0);
    }
    
    if (selectionCount) {
      if (this._currentMode === MODES.MEMORY) {
        selectionCount.textContent = count === 1 ? 'Selected: 1 (Memory Mode)' : 'Select 1 shloka';
      } else {
        selectionCount.textContent = `Selected: ${count}`;
      }
      
      removeClass(selectionCount, 'pulse');
      void selectionCount.offsetWidth;
      addClass(selectionCount, 'pulse');
      
      setTimeout(() => {
        removeClass(selectionCount, 'pulse');
      }, 300);
    }
  }
  
  _deselectSheetItems() {
    $$('.sheet-item input:checked').forEach(cb => {
      cb.checked = false;
      removeClass(cb.closest('.sheet-item'), 'selected');
    });
  }
  
  applyFilter(searchTerm) {
    this._searchTerm = searchTerm;
    let foundCount = 0;
    
    $$('.shloka-item').forEach(item => {
      const shloka = item.dataset.shloka;
      
      if (!searchTerm || shloka.startsWith(searchTerm)) {
        item.style.display = '';
        foundCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    return foundCount;
  }
  
  clearFilter() {
    this._searchTerm = '';
    $$('.shloka-item').forEach(item => {
      item.style.display = '';
    });
  }
  
  getStats() {
    const total = $$('.shloka-item').length;
    const selected = $$('.shloka-checkbox:checked').length;
    const visible = $$('.shloka-item').filter(item => item.style.display !== 'none').length;
    
    return { total, selected, visible };
  }
}

export const shlokaGrid = new ShlokaGrid();
