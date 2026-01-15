// selection-manager.js - COMPLETE FIXED VERSION

import { EventBus } from '../core/events.js';
import { EVENTS, MODES } from '../core/constants.js';
import { state } from '../core/state.js';

class SelectionManager {
  constructor() {
    this._selectedTracks = new Set();
    this._source = null; // 'manual', 'playlist', 'recent', 'group', 'range'
    this._sourceData = null;
  }

  // Select single track
  select(trackNum, source = 'manual') {
    const currentMode = state.get('currentMode');
    
    // Memory mode: only allow single selection
    if (currentMode === MODES.MEMORY) {
      this._selectedTracks.clear();
      this._selectedTracks.add(trackNum);
      this._source = source;
      this._sourceData = null;
      
      this._emitChange();
      console.log(`Selected track ${trackNum} (Memory Mode - single only)`);
      return;
    }

    // Regular/Quiz mode: normal selection
    if (this._selectedTracks.has(trackNum)) {
      this._selectedTracks.delete(trackNum);
    } else {
      this._selectedTracks.add(trackNum);
    }
    
    this._source = source;
    this._sourceData = null;
    
    this._emitChange();
    console.log(`Selected tracks: ${Array.from(this._selectedTracks).join(', ')}`);
  }

  // ✅ FIX: Add deselect method
  deselect(trackNum) {
    const currentMode = state.get('currentMode');
    
    // In memory mode, deselecting means clearing all
    if (currentMode === MODES.MEMORY) {
      this._selectedTracks.clear();
    } else {
      // Regular/Quiz mode: remove specific track
      this._selectedTracks.delete(trackNum);
    }
    
    this._emitChange();
    console.log(`Deselected track ${trackNum}`);
  }

  // Select multiple tracks
  selectMultiple(tracks, source = 'manual', sourceData = null) {
    const currentMode = state.get('currentMode');
    
    // Memory mode: only take first track
    if (currentMode === MODES.MEMORY) {
      this._selectedTracks.clear();
      if (tracks.length > 0) {
        this._selectedTracks.add(tracks[0]);
      }
      this._source = source;
      this._sourceData = sourceData;
      this._emitChange();
      
      if (tracks.length > 1) {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Memory mode: Only 1 shloka selected',
          type: 'info'
        });
      }
      return;
    }

    // Regular/Quiz mode: select all
    this._selectedTracks.clear();
    tracks.forEach(track => this._selectedTracks.add(track));
    this._source = source;
    this._sourceData = sourceData;
    
    this._emitChange();
    console.log(`Selected ${tracks.length} tracks from ${source}`);
  }

  // Select playlist
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

  // Select recent
  selectRecent(label, tracks) {
    this.selectMultiple(tracks, 'recent', { label });
  }

  // Select group
  selectGroup(groupNumber, tracks) {
    this.selectMultiple(tracks, 'group', { groupNumber });
  }

  // Select range
  selectRange(start, end, tracks) {
    this.selectMultiple(tracks, 'range', { start, end });
  }

  // Toggle track
  toggle(trackNum) {
    const currentMode = state.get('currentMode');
    
    // Memory mode: replace selection
    if (currentMode === MODES.MEMORY) {
      const wasSelected = this._selectedTracks.has(trackNum);
      this._selectedTracks.clear();
      
      // If it wasn't selected, select it. If it was, leave empty (deselect)
      if (!wasSelected) {
        this._selectedTracks.add(trackNum);
      }
      
      this._emitChange();
      return;
    }

    // Regular/Quiz mode: toggle
    if (this._selectedTracks.has(trackNum)) {
      this._selectedTracks.delete(trackNum);
    } else {
      this._selectedTracks.add(trackNum);
    }
    
    this._emitChange();
  }

  // Clear selection
  clear() {
    this._selectedTracks.clear();
    this._source = null;
    this._sourceData = null;
    
    this._emitChange(true); // Force clear event
    console.log('Selection cleared');
  }

  // Get selection as sorted array
  getSelection() {
    return Array.from(this._selectedTracks).sort((a, b) => a - b);
  }

  // Get count
  getCount() {
    return this._selectedTracks.size;
  }

  // Check if track is selected
  isSelected(trackNum) {
    return this._selectedTracks.has(trackNum);
  }

  // Get source info
  getSource() {
    return {
      type: this._source,
      data: this._sourceData
    };
  }

  // Check if has selection
  hasSelection() {
    return this._selectedTracks.size > 0;
  }

  _emitChange(isCleared = false) {
    const tracks = this.getSelection();
    const count = tracks.length;

    if (isCleared || count === 0) {
      EventBus.emit(EVENTS.SELECTION_CLEARED);
    }

    EventBus.emit(EVENTS.SELECTION_CHANGED, {
      tracks,
      count,
      source: this._source,
      sourceData: this._sourceData,
      shouldSyncUI: true
    });

    // Update state
    state.set('selectedTracks', tracks);
  }
}

// Export singleton
export const selectionManager = new SelectionManager();
