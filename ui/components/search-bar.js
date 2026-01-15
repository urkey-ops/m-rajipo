// search-bar.js - Unified search bar component (UPDATED FOR MEMORY MODE)

import { $, $$, addClass, removeClass, toggleClass, debounce } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES, TIMING } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { playlistService } from '../../services/playlist-service.js';
import { selectionManager } from '../../managers/selection-manager.js';

class SearchBar {
  constructor() {
    // Tabs
    this.searchTab = null;
    this.rangeTab = null;
    this.groupsTab = null;
    
    // Panels
    this.searchPanel = null;
    this.rangePanel = null;
    this.groupsPanel = null;
    
    // Search elements
    this.searchInput = null;
    this.searchFeedback = null;
    
    // Range elements
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyRangeBtn = null;
    this.rangePreview = null;
    
    // Groups elements
    this.groupsGrid = null;
    
    this.activeTab = 0; // 0=search, 1=range, 2=groups
    this.currentMode = MODES.REGULAR;
  }

  initialize() {
    // Tabs
    this.searchTab = $('#searchTab');
    this.rangeTab = $('#rangeTab');
    this.groupsTab = $('#groupsTab');
    
    // Panels
    this.searchPanel = $('#searchPanel');
    this.rangePanel = $('#rangePanel');
    this.groupsPanel = $('#groupsPanel');
    
    // Search
    this.searchInput = $('#searchInput');
    this.searchFeedback = $('#searchFeedback');
    
    // Range
    this.rangeStart = $('#rangeStart');
    this.rangeEnd = $('#rangeEnd');
    this.applyRangeBtn = $('#applyRangeBtn');
    this.rangePreview = $('#rangePreview');
    
    // Groups
    this.groupsGrid = $('#groupsGrid');
    
    this.setupEventListeners();
    this.renderGroups();
    
    console.log('✅ Search bar initialized');
  }

  setupEventListeners() {
    // Tab switching
    [this.searchTab, this.rangeTab, this.groupsTab].forEach((tab, index) => {
      if (!tab) return;
      tab.addEventListener('click', () => {
        this.switchTab(index);
      });
    });

    // Search input with debounce
    if (this.searchInput) {
      const debouncedSearch = debounce((value) => {
        this.handleSearch(value);
      }, TIMING.DEBOUNCE_DELAY);

      this.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });

      // Clear on escape
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.searchInput.value = '';
          this.handleSearch('');
        }
      });
    }

    // Range inputs
    if (this.rangeStart && this.rangeEnd) {
      [this.rangeStart, this.rangeEnd].forEach(input => {
        input.addEventListener('input', () => {
          this.updateRangePreview();
        });
      });
    }

    // Apply range button
    if (this.applyRangeBtn) {
      this.applyRangeBtn.addEventListener('click', () => {
        this.applyRange();
      });
    }

    // Listen to mode changes
    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this.currentMode = data.to;
      this.updateForMode(data.to);
    });
  }

  updateForMode(mode) {
    if (mode === MODES.MEMORY) {
      // Disable range and groups tabs in memory mode
      if (this.rangeTab) {
        this.rangeTab.disabled = true;
        this.rangeTab.style.opacity = '0.5';
        this.rangeTab.style.cursor = 'not-allowed';
      }
      if (this.groupsTab) {
        this.groupsTab.disabled = true;
        this.groupsTab.style.opacity = '0.5';
        this.groupsTab.style.cursor = 'not-allowed';
      }
      
      // Switch to search tab if on range/groups
      if (this.activeTab !== 0) {
        this.switchTab(0);
      }
    } else {
      // Enable range and groups tabs
      if (this.rangeTab) {
        this.rangeTab.disabled = false;
        this.rangeTab.style.opacity = '1';
        this.rangeTab.style.cursor = 'pointer';
      }
      if (this.groupsTab) {
        this.groupsTab.disabled = false;
        this.groupsTab.style.opacity = '1';
        this.groupsTab.style.cursor = 'pointer';
      }
    }
  }

  switchTab(index) {
    // Don't switch if disabled
    if (index === 1 && this.rangeTab?.disabled) return;
    if (index === 2 && this.groupsTab?.disabled) return;
    
    this.activeTab = index;

    // Update tab active states
    [this.searchTab, this.rangeTab, this.groupsTab].forEach((tab, i) => {
      toggleClass(tab, 'active', i === index);
    });

    // Update panel active states
    [this.searchPanel, this.rangePanel, this.groupsPanel].forEach((panel, i) => {
      toggleClass(panel, 'active', i === index);
    });

    // Focus input when switching to search
    if (index === 0 && this.searchInput) {
      setTimeout(() => this.searchInput.focus(), 100);
    }
  }

  handleSearch(query) {
    if (!this.searchInput || !this.searchFeedback) return;

    const trimmed = query.trim();

    if (!trimmed) {
      addClass(this.searchFeedback, 'hidden');
      // Emit search cleared event
      EventBus.emit('search:cleared');
      return;
    }

    // Parse search query (could be single number or comma-separated)
    const numbers = trimmed.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 315);

    if (numbers.length === 0) {
      removeClass(this.searchFeedback, 'hidden');
      return;
    }

    addClass(this.searchFeedback, 'hidden');

    // Select the found tracks
    if (this.currentMode === MODES.MEMORY && numbers.length > 1) {
      // Memory mode: only select first
      selectionManager.selectMultiple([numbers[0]], 'search');
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Memory mode: Only 1 shloka selected',
        type: 'info'
      });
    } else {
      selectionManager.selectMultiple(numbers, 'search');
    }
  }

  updateRangePreview() {
    if (!this.rangePreview || !this.rangeStart || !this.rangeEnd) return;

    const start = parseInt(this.rangeStart.value);
    const end = parseInt(this.rangeEnd.value);

    if (!start || !end || start > end || start < 1 || end > 315) {
      this.rangePreview.textContent = '';
      addClass(this.rangePreview, 'empty');
      return;
    }

    const count = end - start + 1;
    this.rangePreview.textContent = `${count} shlokas selected (${start}-${end})`;
    removeClass(this.rangePreview, 'empty');
  }

  applyRange() {
    if (!this.rangeStart || !this.rangeEnd) return;

    const start = parseInt(this.rangeStart.value);
    const end = parseInt(this.rangeEnd.value);

    if (!start || !end) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Please enter both start and end values',
        type: 'error'
      });
      return;
    }

    if (start > end) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Start must be less than or equal to end',
        type: 'error'
      });
      return;
    }

    if (start < 1 || end > 315) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Range must be between 1 and 315',
        type: 'error'
      });
      return;
    }

    // Create range playlist
    const tracks = playlistService.createRangePlaylist(start, end);
    
    selectionManager.selectRange(start, end, tracks);

    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: `Selected ${tracks.length} shlokas (${start}-${end})`,
      type: 'success'
    });
  }

  renderGroups() {
    if (!this.groupsGrid) return;

    const groups = playlistService.getGroups();
    this.groupsGrid.innerHTML = '';

    groups.forEach(group => {
      const btn = document.createElement('button');
      btn.className = 'group-btn';
      btn.textContent = `${group.start}-${group.end}`;
      btn.setAttribute('data-group', group.number);
      btn.setAttribute('aria-label', `Select group ${group.number}: shlokas ${group.start} to ${group.end}`);

      // Add checkmark (hidden by default)
      const checkmark = document.createElement('span');
      checkmark.className = 'checkmark';
      checkmark.innerHTML = '✓';
      btn.appendChild(checkmark);

      btn.addEventListener('click', () => {
        this.selectGroup(group.number);
      });

      this.groupsGrid.appendChild(btn);
    });

    // Listen to selection changes to update group buttons
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      this.updateGroupSelections(data.source, data.sourceData);
    });

    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this.clearGroupSelections();
    });
  }

  selectGroup(groupNumber) {
    const groupData = playlistService.getGroup(groupNumber);
    if (!groupData) return;

    selectionManager.selectGroup(groupNumber, groupData.tracks);

    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: `Selected group ${groupNumber} (${groupData.start}-${groupData.end})`,
      type: 'success'
    });
  }

  updateGroupSelections(source, sourceData) {
    if (source !== 'group') {
      this.clearGroupSelections();
      return;
    }

    // Highlight the selected group
    $$('.group-btn').forEach(btn => {
      const groupNum = parseInt(btn.getAttribute('data-group'));
      toggleClass(btn, 'selected', groupNum === sourceData?.groupNumber);
    });
  }

  clearGroupSelections() {
    $$('.group-btn').forEach(btn => {
      removeClass(btn, 'selected');
    });
  }
}

// Export singleton
export const searchBar = new SearchBar();
