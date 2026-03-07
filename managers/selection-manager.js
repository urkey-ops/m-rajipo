// selection-manager.js - CLEANED UP VERSION
import { EventBus } from '../core/events.js';
import { EVENTS, MODES } from '../core/constants.js';
import { state } from '../core/state.js';

class SelectionManager {
  constructor() {
    this._selectedTracks = new Set();
    this._source = null;
    this._sourceData = null;
  }

  select(trackNum, options = {}) {
    const { silent = false, source = 'manual' } = options;
    const currentMode = state.get('currentMode');

    if (currentMode === MODES.MEMORY) {
      this._selectedTracks.clear();
      this._selectedTracks.add(trackNum);
      this._source = source;
      this._sourceData = null;

      if (!silent) this._emitChange(false);
      console.log(`Selected track ${trackNum} (Memory Mode - single only)`);
      return;
    }

    if (this._selectedTracks.has(trackNum)) {
      this._selectedTracks.delete(trackNum);
    } else {
      this._selectedTracks.add(trackNum);
    }

    this._source = source;
    this._sourceData = null;

    if (!silent) this._emitChange(false);
    console.log(`Selected tracks: ${Array.from(this._selectedTracks).join(', ')}`);
  }

  deselect(trackNum, options = {}) {
    const { silent = false } = options;
    const currentMode = state.get('currentMode');

    if (currentMode === MODES.MEMORY) {
      if (this._selectedTracks.has(trackNum)) {
        this._selectedTracks.clear();
        console.log(`Deselected track ${trackNum} (Memory Mode)`);
      } else {
        console.log(`Deselect ignored - track ${trackNum} not selected`);
        return;
      }
    } else {
      this._selectedTracks.delete(trackNum);
      console.log(`Deselected track ${trackNum}`);
    }

    if (!silent) this._emitChange(false);
  }

  selectMultiple(tracks, source = 'manual', sourceData = null) {
    const currentMode = state.get('currentMode');

    if (currentMode === MODES.MEMORY) {
      this._selectedTracks.clear();
      if (tracks.length > 0) {
        this._selectedTracks.add(tracks[0]);
      }
      this._source = source;
      this._sourceData = sourceData;
      this._emitChange(false);

      if (tracks.length > 1) {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Memory mode: Only 1 shloka selected',
          type: 'info'
        });
      }
      return;
    }

    this._selectedTracks.clear();
    tracks.forEach(track => this._selectedTracks.add(track));
    this._source = source;
    this._sourceData = sourceData;

    this._emitChange(false);
    console.log(`Selected ${tracks.length} tracks from ${source}`);
  }

  selectPlaylist(name, tracks) {
    const currentMode = state.get('currentMode');

    if (currentMode === MODES.MEMORY && tracks.length > 1) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: 'Memory mode: Only first shloka from playlist selected',
        type: 'info'
      });
    }

    this.selectMultiple(tracks, 'playlist', { name });
  }

  selectRecent(label, tracks) {
    this.selectMultiple(tracks, 'recent', { label });
  }

  selectGroup(groupNumber, tracks) {
    this.selectMultiple(tracks, 'group', { groupNumber });
  }

  selectRange(start, end, tracks) {
    this.selectMultiple(tracks, 'range', { start, end });
  }

  toggle(trackNum) {
    const currentMode = state.get('currentMode');

    if (currentMode === MODES.MEMORY) {
      const wasSelected = this._selectedTracks.has(trackNum);
      this._selectedTracks.clear();

      if (!wasSelected) {
        this._selectedTracks.add(trackNum);
      }

      this._emitChange(false);
      return;
    }

    if (this._selectedTracks.has(trackNum)) {
      this._selectedTracks.delete(trackNum);
    } else {
      this._selectedTracks.add(trackNum);
    }

    this._emitChange(false);
  }

  clear() {
    this._selectedTracks.clear();
    this._source = null;
    this._sourceData = null;

    // ✅ isCleared = true: only explicit clear() triggers SELECTION_CLEARED
    this._emitChange(true);
    console.log('Selection cleared');
  }

  getSelection() {
    return Array.from(this._selectedTracks).sort((a, b) => a - b);
  }

  getCount() {
    return this._selectedTracks.size;
  }

  isSelected(trackNum) {
    return this._selectedTracks.has(trackNum);
  }

  getSource() {
    return {
      type: this._source,
      data: this._sourceData
    };
  }

  hasSelection() {
    return this._selectedTracks.size > 0;
  }

  // ✅ FIXED: SELECTION_CLEARED is only emitted when isCleared === true (explicit clear).
  // Previously it also fired on deselect-to-zero, which was misleading.
  // search-bar.js clears group highlights by listening to SELECTION_CHANGED with count === 0.
  _emitChange(isCleared = false) {
    const tracks = this.getSelection();
    const count = tracks.length;

    if (isCleared) {
      EventBus.emit(EVENTS.SELECTION_CLEARED);
    }

    EventBus.emit(EVENTS.SELECTION_CHANGED, {
      tracks,
      count,
      source: this._source,
      sourceData: this._sourceData
    });

    state.set('selectedTracks', tracks);
  }
}

export const selectionManager = new SelectionManager();
