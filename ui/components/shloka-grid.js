// shloka-grid.js - Shloka grid component (FIXED - Initial State)
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
    
    // Update selection actions on init (for restored selections)
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
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      if (data.shouldSyncUI) {
        this._updateVisualStateFromManager();
      }
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this._clearAllVisualSelection();
    });
  }
  
  _handleCheckboxChange(checkbox) {
    const trackNum = parseInt(checkbox.value);
    const isChecked = checkbox.checked;
    
    // Update visual state immediately
    const label = checkbox.closest('.shloka-item');
    toggleClass(label, 'selected', isChecked);
    
    // Update selection manager (will NOT trigger UI sync to avoid loop)
    if (isChecked) {
      // Temporarily set shouldSyncUI to false
      const originalEmit = EventBus.emit.bind(EventBus);
      EventBus.emit = function(event, data) {
        if (event === EVENTS.SELECTION_CHANGED && data) {
          data.shouldSyncUI = false;
        }
        originalEmit(event, data);
      };
      
      selectionManager.select(trackNum);
      
      // Restore original emit
      EventBus.emit = originalEmit;
      
      // Deselect playlists/recent when selecting individual
      this._deselectSheetItems();
    } else {
      // Temporarily set shouldSyncUI to false
      const originalEmit = EventBus.emit.bind(EventBus);
      EventBus.emit = function(event, data) {
        if (event === EVENTS.SELECTION_CHANGED && data) {
          data.shouldSyncUI = false;
        }
        originalEmit(event, data);
      };
      
      selectionManager.deselect(trackNum);
      
      // Restore original emit
      EventBus.emit = originalEmit;
    }
    
    // Update selection actions
    this._updateSelectionActions();
  }
  
  // Update visual state from selection manager
  _updateVisualStateFromManager() {
    const selectedTracks = selectionManager.getSelection();
    const selectedSet = new Set(selectedTracks);
    
    $$('.shloka-checkbox').forEach(checkbox => {
      const trackNum = parseInt(checkbox.value);
      const isSelected = selectedSet.has(trackNum);
      
      checkbox.checked = isSelected;
      toggleClass(checkbox.closest('.shloka-item'), 'selected', isSelected);
    });
    
    // Update selection actions
    this._updateSelectionActions();
  }
  
  // Clear all visual selection
  _clearAllVisualSelection() {
    $$('.shloka-checkbox').forEach(checkbox => {
      checkbox.checked = false;
      removeClass(checkbox.closest('.shloka-item'), 'selected');
    });
    
    // Update selection actions
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
  
  // Add pulse animation
  removeClass(selectionCount, 'pulse');
  void selectionCount.offsetWidth; // Trigger reflow
  addClass(selectionCount, 'pulse');
  
  setTimeout(() => {
    removeClass(selectionCount, 'pulse');
  }, 300);
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
