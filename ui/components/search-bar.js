// search-bar.js - CLEANED UP VERSION
import { $, $$, addClass, removeClass, toggleClass, debounce } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS, MODES, TIMING } from '../../core/constants.js';
import { state } from '../../core/state.js';
import { playlistService } from '../../services/playlist-service.js';
import { selectionManager } from '../../managers/selection-manager.js';

class SearchBar {
  constructor() {
    this.searchTab = null;
    this.rangeTab = null;
    this.groupsTab = null;
    this.searchPanel = null;
    this.rangePanel = null;
    this.groupsPanel = null;
    this.searchInput = null;
    this.searchFeedback = null;
    this.rangeStart = null;
    this.rangeEnd = null;
    this.applyRangeBtn = null;
    this.rangePreview = null;
    this.groupsGrid = null;
    this.activeTab = 0;
    this.currentMode = MODES.REGULAR;
  }

  initialize() {
    this.searchTab = $('#searchTab');
    this.rangeTab = $('#rangeTab');
    this.groupsTab = $('#groupsTab');
    this.searchPanel = $('#searchPanel');
    this.rangePanel = $('#rangePanel');
    this.groupsPanel = $('#groupsPanel');
    this.searchInput = $('#searchInput');
    this.searchFeedback = $('#searchFeedback');
    this.rangeStart = $('#rangeStart');
    this.rangeEnd = $('#rangeEnd');
    this.applyRangeBtn = $('#applyRangeBtn');
    this.rangePreview = $('#rangePreview');
    this.groupsGrid = $('#groupsGrid');

    this.renderGroups();
    this.setupEventListeners();

    console.log('✅ Search bar initialized');
  }

  setupEventListeners() {
    [this.searchTab, this.rangeTab, this.groupsTab].forEach((tab, index) => {
      if (!tab) return;
      tab.addEventListener('click', () => {
        this.switchTab(index);
      });
    });

    if (this.searchInput) {
      const debouncedSearch = debounce((value) => {
        this.handleSearch(value);
      }, TIMING.DEBOUNCE_DELAY);

      this.searchInput.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });

      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.searchInput.value = '';
          this.handleSearch('');
        }
      });
    }

    if (this.rangeStart && this.rangeEnd) {
      [this.rangeStart, this.rangeEnd].forEach(input => {
        input.addEventListener('input', () => {
          this.updateRangePreview();
        });
      });
    }

    if (this.applyRangeBtn) {
      this.applyRangeBtn.addEventListener('click', () => {
        this.applyRange();
      });
    }

    EventBus.on(EVENTS.MODE_CHANGED, (data) => {
      this.currentMode = data.mode;
      this.updateForMode(data.mode);
    });

    // ✅ FIXED: These subscriptions belong here, NOT inside renderGroups().
    // Moving them here prevents duplicate listeners if renderGroups() is ever called again.
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      this.updateGroupSelections(data.source, data.sourceData);

      // ✅ Phase 9 mitigation: clear group highlights on deselect-to-zero
      if (data.count === 0) {
        this.clearGroupSelections();
      }
    });

    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this.clearGroupSelections();
    });
  }

  updateForMode(mode) {
    if (mode === MODES.MEMORY) {
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

      if (this.activeTab !== 0) {
        this.switchTab(0);
      }
    } else {
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
    if (index === 1 && this.rangeTab?.disabled) return;
    if (index === 2 && this.groupsTab?.disabled) return;

    this.activeTab = index;

    [this.searchTab, this.rangeTab, this.groupsTab].forEach((tab, i) => {
      toggleClass(tab, 'active', i === index);
    });

    [this.searchPanel, this.rangePanel, this.groupsPanel].forEach((panel, i) => {
      toggleClass(panel, 'active', i === index);
    });

    if (index === 0 && this.searchInput) {
      setTimeout(() => this.searchInput.focus(), 100);
    }
  }

  handleSearch(query) {
    if (!this.searchInput || !this.searchFeedback) return;

    const trimmed = query.trim();

    if (!trimmed) {
      addClass(this.searchFeedback, 'hidden');
      // ✅ Uses EVENTS constant
      EventBus.emit(EVENTS.SEARCH_CLEARED);
      return;
    }

    const numbers = trimmed.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 315);

    if (numbers.length === 0) {
      removeClass(this.searchFeedback, 'hidden');
      return;
    }

    addClass(this.searchFeedback, 'hidden');

    if (this.currentMode === MODES.MEMORY && numbers.length > 1) {
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

    if (this.currentMode === MODES.MEMORY) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Range selection disabled in Memory Mode',
        type: 'warning'
      });
      return;
    }

    const tracks = playlistService.createRangePlaylist(start, end);
    selectionManager.selectRange(start, end, tracks);

    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: `Selected ${tracks.length} shlokas (${start}-${end})`,
      type: 'success'
    });
  }

  // ✅ FIXED: renderGroups() is DOM-only — no EventBus subscriptions inside it
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

      const checkmark = document.createElement('span');
      checkmark.className = 'checkmark';
      checkmark.innerHTML = '✓';
      btn.appendChild(checkmark);

      btn.addEventListener('click', () => {
        this.selectGroup(group.number);
      });

      this.groupsGrid.appendChild(btn);
    });
  }

  selectGroup(groupNumber) {
    const currentMode = state.get('currentMode');

    if (currentMode === MODES.MEMORY) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Groups disabled in Memory Mode',
        type: 'warning'
      });
      return;
    }

    const groupData = playlistService.getGroup(groupNumber);
    if (!groupData) {
      console.error(`Group ${groupNumber} not found`);
      return;
    }

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

export const searchBar = new SearchBar();
