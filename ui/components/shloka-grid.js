// shloka-grid.js - Shloka grid component with event delegation
import { $, $$, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
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

    this._generateGrid?.(); // safe if method exists
    this._setupEventListeners();

    console.log('✅ Shloka grid initialized');
  }

  _setupEventListeners() {
    if (!this._grid) return;

    // Event delegation
    this._grid.addEventListener('click', (e) => {
      const label = e.target.closest('.shloka-item');
      if (!label) return;

      // Ignore hidden items
      if (label.style.display === 'none') return;

      const checkbox = label.querySelector('.shloka-checkbox');
      if (!checkbox) return;

      // Let native checkbox clicks work
      if (e.target === checkbox) return;

      e.preventDefault();
      checkbox.checked = !checkbox.checked;

      this._handleCheckboxChange(checkbox);
    });
  }

  _handleCheckboxChange(checkbox) {
    const trackNum = parseInt(checkbox.value, 10);
    const isChecked = checkbox.checked;

    const label = checkbox.closest('.shloka-item');
    toggleClass(label, 'selected', isChecked);

    if (isChecked) {
      selectionManager.select(trackNum);
      this._deselectSheetItems();
    } else {
      selectionManager.deselect(trackNum);
    }
  }

  _updateVisualState() {
    const selectedSet = new Set(selectionManager.getSelection());

    $$('.shloka-checkbox').forEach((checkbox) => {
      const trackNum = parseInt(checkbox.value, 10);
      const isSelected = selectedSet.has(trackNum);

      checkbox.checked = isSelected;
      toggleClass(
        checkbox.closest('.shloka-item'),
        'selected',
        isSelected
      );
    });
  }

  _deselectSheetItems() {
    $$('.sheet-item input:checked').forEach((cb) => {
      cb.checked = false;
      removeClass(cb.closest('.sheet-item'), 'selected');
    });
  }

  applyFilter(searchTerm) {
    let foundCount = 0;

    $$('.shloka-item').forEach((item) => {
      const shloka = item.dataset.shloka || '';

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
    $$('.shloka-item').forEach((item) => {
      item.style.display = '';
    });
  }

  getStats() {
    const total = $$('.shloka-item').length;
    const selected = $$('.shloka-checkbox:checked').length;
    const visible = $$('.shloka-item').filter(
      (item) => item.style.display !== 'none'
    ).length;

    return { total, selected, visible };
  }
}

// Export singleton
export const shlokaGrid = new ShlokaGrid();
