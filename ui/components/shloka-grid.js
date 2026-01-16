// shloka-grid.js - FIXED with Memory Mode single-selection enforcement

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
  }
  
  initialize() {
    this._grid = $('#shlokaGrid');
    
    if (!this._grid) {
      console.error('Shloka grid not found');
      return;
    }
    
    this._generateGrid();
    this._setupEventListeners();
    
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

    // ✅ FIX: Listen to mode changes
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this._currentMode = data.to;
      this._updateGridForMode(data.to);
    });
  }
  
  // ✅ NEW: Update grid behavior for different modes
  _updateGridForMode(mode) {
    // In memory mode, show visual feedback that only 1 can be selected
    if (mode === MODES.MEMORY) {
      this._grid.setAttribute('data-mode', 'memory');
      console.log('🧠 Grid set to Memory Mode - single selection only');
    } else {
      this._grid.setAttribute('data-mode', 'multi');
    }
  }
  
  // ✅ FIX: Handle single-selection in Memory Mode
  _handleCheckboxChange(checkbox) {
    const trackNum = parseInt(checkbox.value);
    const isChecked = checkbox.checked;
    
    this._isUpdatingFromManager = true;
    
    const label = checkbox.closest('.shloka-item');
    
    // ✅ FIX: In Memory Mode, enforce single selection
    if (this._currentMode === MODES.MEMORY && isChecked) {
      // Uncheck ALL other checkboxes first
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
    
    setTimeout(() => {
      this._isUpdatingFromManager = false;
    }, 0);
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
  
  _updateSelectionActions() {
    const selectionActions = $('#selectionActions');
    const selectionCount = $('#selectionCount');
    const count = selectionManager.getCount();
    
    if (selectionActions) {
      toggleClass(selectionActions, 'hidden', count === 0);
    }
    
    if (selectionCount) {
      // ✅ FIX: Show different message in Memory Mode
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
