// shloka-grid.js - Shloka grid component with event delegation
import { $, $$, createElement, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, TOTAL_TRACKS } from '../../core/constants.js';
import { selectionManager } from '../../managers/selection-manager.js';

class ShlokaGrid {
  constructor() {
    this._grid = null;
    this._searchTerm = '';
  }
  
  initialize() {
    this._grid = $('#shlokaGrid');
    
    if (!this._grid) {
      console.error('Shloka grid not found');
      return;
    }
    
    this._generateGrid();
    this._setupEventListeners();
    
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
    // Use event delegation for better performance
    this._grid.addEventListener('click', (e) => {
      const label = e.target.closest('.shloka-item');
      if (!label) return;
      
      // Check if visible
      const style = window.getComputedStyle(label);
      if (style.display === 'none') return;
      
      const checkbox = label.querySelector('.shloka-checkbox');
      if (!checkbox) return;
      
      // If click was on checkbox, let browser handle it
      if (e.target === checkbox) {
        this._handleCheckboxChange(checkbox);
        return;
      }
      
      // Otherwise toggle manually
      e.preventDefault();
      checkbox.checked = !checkbox.checked;
      this._handleCheckboxChange(checkbox);
    });
    
    // Listen to selection manager changes to update visual state
    EventBus.on(EVENTS.SELECTION_CHANGED, () => {
      this._updateVisualState();
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this._updateVisualState();
    });
  }
  
  _handleCheckboxChange(checkbox) {
    const trackNum = parseInt(checkbox.value);
    const isChecked = checkbox.checked;
    
    // Update visual state
    const label = checkbox.closest('.shloka-item');
    toggleClass(label, 'selected', isChecked);
    
    // Update selection manager
    if (isChecked) {
      selectionManager.select(trackNum);
      
      // Deselect playlists/recent when selecting individual
      this._deselectSheetItems();
    } else {
      selectionManager.deselect(trackNum);
    }
  }
  
  // Update visual state from selection manager
  _updateVisualState() {
    const selectedTracks = selectionManager.getSelection();
    const selectedSet = new Set(selectedTracks);
    
    $$('.shloka-checkbox').forEach(checkbox => {
      const trackNum = parseInt(checkbox.value);
      const isSelected = selectedSet.has(trackNum);
      
      checkbox.checked = isSelected;
      toggleClass(checkbox.closest('.shloka-item'), 'selected', isSelected);
    });
    
    // Update selection actions visibility
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
      selectionCount.textContent = `Selected: ${count}`;
    }
  }
  
  // Deselect all sheet items (playlists/recent)
  _deselectSheetItems() {
    $$('.sheet-item input:checked').forEach(cb => {
      cb.checked = false;
      removeClass(cb.closest('.sheet-item'), 'selected');
    });
  }
  
  // Apply search filter
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
  
  // Clear filter
  clearFilter() {
    this._searchTerm = '';
    $$('.shloka-item').forEach(item => {
      item.style.display = '';
    });
  }
  
  // Get grid statistics
  getStats() {
    const total = $$('.shloka-item').length;
    const selected = $$('.shloka-checkbox:checked').length;
    const visible = $$('.shloka-item').filter(item => item.style.display !== 'none').length;
    
    return { total, selected, visible };
  }
}

// Export singleton
export const shlokaGrid = new ShlokaGrid();
