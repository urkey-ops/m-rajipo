// search-bar.js - Search bar component with tabs (FIXED)
import { $, $$, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, TIMING, TOTAL_TRACKS } from '../../core/constants.js';
import { debounce } from '../../utils/dom-utils.js';
import { selectionManager } from '../../managers/selection-manager.js';
import { shlokaGrid } from './shloka-grid.js';

class SearchBar {
  constructor() {
    this._searchTab = null;
    this._rangeTab = null;
    this._groupsTab = null;
    
    this._searchPanel = null;
    this._rangePanel = null;
    this._groupsPanel = null;
    this._searchContent = null;
    
    this._searchInput = null;
    this._searchFeedback = null;
    
    this._rangeStart = null;
    this._rangeEnd = null;
    this._rangePreview = null;
    this._applyRangeBtn = null;
    
    this._groupsGrid = null;
    this._clearAllBtn = null;
    
    this._activeTab = 0;
    this._isCollapsed = false;
  }
  
  initialize() {
    // Tabs
    this._searchTab = $('#searchTab');
    this._rangeTab = $('#rangeTab');
    this._groupsTab = $('#groupsTab');
    
    // Panels
    this._searchPanel = $('#searchPanel');
    this._rangePanel = $('#rangePanel');
    this._groupsPanel = $('#groupsPanel');
    this._searchContent = $('#searchContent');
    
    // Search elements
    this._searchInput = $('#searchInput');
    this._searchFeedback = $('#searchFeedback');
    
    // Range elements
    this._rangeStart = $('#rangeStart');
    this._rangeEnd = $('#rangeEnd');
    this._rangePreview = $('#rangePreview');
    this._applyRangeBtn = $('#applyRangeBtn');
    
    // Groups grid
    this._groupsGrid = $('#groupsGrid');
    
    // Clear all button
    this._clearAllBtn = $('#clearAllBtn');
    
    this._setupEventListeners();
    this._generateGroups();
    
    console.log('✅ Search bar initialized');
  }
  
  _setupEventListeners() {
    // Tab switching
    [this._searchTab, this._rangeTab, this._groupsTab].forEach((tab, index) => {
      if (!tab) return;
      
      tab.addEventListener('click', () => {
        if (this._activeTab === index) {
          // Toggle collapse
          this._isCollapsed = !this._isCollapsed;
          this._updateCollapse();
        } else {
          // Switch tab and expand
          this._isCollapsed = false;
          this._switchTab(index);
        }
      });
    });
    
    // Clear all button
    if (this._clearAllBtn) {
      this._clearAllBtn.addEventListener('click', () => {
        selectionManager.clear();
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Selection cleared',
          type: 'info'
        });
      });
    }
    
    // Search input
    if (this._searchInput) {
      const debouncedSearch = debounce((term) => {
        this._handleSearch(term);
      }, TIMING.DEBOUNCE_DELAY);
      
      this._searchInput.addEventListener('input', (e) => {
        // Only allow numbers
        e.target.value = e.target.value.replace(/\D/g, '');
        debouncedSearch(e.target.value);
      });
    }
    
    // Range inputs
    if (this._rangeStart && this._rangeEnd) {
      this._rangeStart.addEventListener('input', () => this._updateRangePreview());
      this._rangeEnd.addEventListener('input', () => this._updateRangePreview());
      
      const handleRangeEnter = (e) => {
        if (e.key === 'Enter' && this._applyRangeBtn && !this._applyRangeBtn.disabled) {
          this._applyRange();
        }
      };
      
      this._rangeStart.addEventListener('keydown', handleRangeEnter);
      this._rangeEnd.addEventListener('keydown', handleRangeEnter);
    }
    
    // Apply range button
    if (this._applyRangeBtn) {
      this._applyRangeBtn.addEventListener('click', () => this._applyRange());
    }
  }
  
  _switchTab(index) {
    this._activeTab = index;
    
    // Update tab active states
    [this._searchTab, this._rangeTab, this._groupsTab].forEach((tab, i) => {
      toggleClass(tab, 'active', i === index);
    });
    
    // Update panel active states
    [this._searchPanel, this._rangePanel, this._groupsPanel].forEach((panel, i) => {
      toggleClass(panel, 'active', i === index);
    });
    
    // Expand content
    this._updateCollapse();
  }
  
  _updateCollapse() {
    if (this._searchContent) {
      if (this._isCollapsed) {
        this._searchContent.style.transform = 'scaleY(0)';
        this._searchContent.style.opacity = '0';
        this._searchContent.style.maxHeight = '0';
      } else {
        this._searchContent.style.transform = 'scaleY(1)';
        this._searchContent.style.opacity = '1';
        this._searchContent.style.maxHeight = '1000px';
      }
    }
  }
  
  _handleSearch(term) {
    const foundCount = shlokaGrid.applyFilter(term);
    
    if (this._searchFeedback) {
      toggleClass(this._searchFeedback, 'hidden', foundCount > 0 || !term);
    }
  }
  
  _updateRangePreview() {
    const start = parseInt(this._rangeStart.value);
    const end = parseInt(this._rangeEnd.value);
    
    if (start && end && start <= end && start >= 1 && end <= TOTAL_TRACKS) {
      const count = end - start + 1;
      this._rangePreview.textContent = `${count} shloka${count > 1 ? 's' : ''}`;
      this._applyRangeBtn.disabled = false;
    } else if (start || end) {
      this._rangePreview.textContent = 'Invalid range';
      this._applyRangeBtn.disabled = true;
    } else {
      this._rangePreview.textContent = '';
      this._applyRangeBtn.disabled = false;
    }
  }
  
  _applyRange() {
    const start = parseInt(this._rangeStart.value);
    const end = parseInt(this._rangeEnd.value);
    
    if (!start || !end) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Please enter both start and end values',
        type: 'error'
      });
      return;
    }
    
    if (start < 1 || end > TOTAL_TRACKS || start > end) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: `Please enter a valid range between 1 and ${TOTAL_TRACKS}`,
        type: 'error'
      });
      return;
    }
    
    try {
      // Deselect sheet items first
      this._deselectSheetItems();
      
      selectionManager.selectRange(start, end);
      
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: `Shlokas ${start}-${end} selected (${end - start + 1} total)`,
        type: 'success'
      });
    } catch (error) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: error.message,
        type: 'error'
      });
    }
  }
  
  _generateGroups() {
    if (!this._groupsGrid) return;
    
    const fragment = document.createDocumentFragment();
    
    for (let i = 1; i <= TOTAL_TRACKS; i += 10) {
      const end = Math.min(i + 9, TOTAL_TRACKS);
      
      const btn = document.createElement('button');
      btn.className = 'group-btn';
      btn.dataset.start = i.toString();
      btn.dataset.end = end.toString();
      btn.dataset.groupIndex = Math.floor((i - 1) / 10).toString();
      
      const rangeText = document.createTextNode(`${i}–${end}`);
      const checkmark = document.createElement('span');
      checkmark.className = 'checkmark';
      checkmark.textContent = '✓';
      
      btn.appendChild(rangeText);
      btn.appendChild(checkmark);
      
      btn.addEventListener('click', () => {
        const groupIndex = parseInt(btn.dataset.groupIndex);
        try {
          // Deselect sheet items first
          this._deselectSheetItems();
          
          selectionManager.selectGroup(groupIndex);
        } catch (error) {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: error.message,
            type: 'error'
          });
        }
      });
      
      fragment.appendChild(btn);
    }
    
    this._groupsGrid.innerHTML = '';
    this._groupsGrid.appendChild(fragment);
    
    // Listen to selection changes to update group button states
    EventBus.on(EVENTS.SELECTION_CHANGED, () => {
      this._updateGroupButtons();
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this._updateGroupButtons();
    });
  }
  
  _updateGroupButtons() {
    $$('.group-btn').forEach(btn => {
      const start = parseInt(btn.dataset.start);
      const end = parseInt(btn.dataset.end);
      
      let allSelected = true;
      for (let i = start; i <= end; i++) {
        if (!selectionManager.isSelected(i)) {
          allSelected = false;
          break;
        }
      }
      
      toggleClass(btn, 'selected', allSelected);
    });
  }
  
  _deselectSheetItems() {
    $$('.sheet-item input:checked').forEach(cb => {
      cb.checked = false;
      removeClass(cb.closest('.sheet-item'), 'selected');
    });
  }
  
  clearSearch() {
    if (this._searchInput) {
      this._searchInput.value = '';
      shlokaGrid.clearFilter();
      addClass(this._searchFeedback, 'hidden');
    }
  }
}

// Export singleton
export const searchBar = new SearchBar();
