// selection-manager.js - Single source of truth for selections
import { EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { state } from '../core/state.js';
import { validateTrackNumber } from '../utils/validation.js';
import { playlistService } from '../services/playlist-service.js';

class SelectionManager {
  constructor() {
    this._selectedTracks = new Set();
    this._selectedSource = null; // 'individual', 'playlist', 'recent', 'group', 'range'
    this._sourceData = null; // Additional data about the source
  }
  
  // Select individual track
  select(trackNum) {
    const validation = validateTrackNumber(trackNum);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    this._selectedTracks.add(validation.value);
    this._updateSource('individual');
    this._notifyChange();
    
    return true;
  }
  
  // Deselect individual track
  deselect(trackNum) {
    const validation = validateTrackNumber(trackNum);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    this._selectedTracks.delete(validation.value);
    this._notifyChange();
    
    return true;
  }
  
  // Toggle track selection
  toggle(trackNum) {
    if (this.isSelected(trackNum)) {
      return this.deselect(trackNum);
    } else {
      return this.select(trackNum);
    }
  }
  
  // Select range of tracks
  selectRange(start, end) {
    const tracks = playlistService.createRangePlaylist(start, end);
    
    this._selectedTracks.clear();
    tracks.forEach(track => this._selectedTracks.add(track));
    
    this._updateSource('range', { start, end });
    this._notifyChange();
    
    return tracks;
  }
  
  // Select group
  selectGroup(groupIndex) {
    const group = playlistService.getGroup(groupIndex);
    if (!group) {
      throw new Error('Invalid group index');
    }
    
    this._selectedTracks.clear();
    group.tracks.forEach(track => this._selectedTracks.add(track));
    
    this._updateSource('group', { groupIndex, group });
    this._notifyChange();
    
    return group.tracks;
  }
  
  // Select from playlist
  selectPlaylist(playlistName, tracks) {
    this._selectedTracks.clear();
    tracks.forEach(track => this._selectedTracks.add(track));
    
    this._updateSource('playlist', { name: playlistName, tracks });
    this._notifyChange();
    
    return tracks;
  }
  
  // Select from recent
  selectRecent(recentIndex, tracks) {
    this._selectedTracks.clear();
    tracks.forEach(track => this._selectedTracks.add(track));
    
    this._updateSource('recent', { index: recentIndex, tracks });
    this._notifyChange();
    
    return tracks;
  }
  
  // Select multiple tracks at once
  selectMultiple(tracks) {
    tracks.forEach(track => {
      const validation = validateTrackNumber(track);
      if (validation.valid) {
        this._selectedTracks.add(validation.value);
      }
    });
    
    this._updateSource('multiple');
    this._notifyChange();
    
    return Array.from(this._selectedTracks);
  }
  
  // Clear all selections
  clear() {
    const hadSelection = this._selectedTracks.size > 0;
    
    this._selectedTracks.clear();
    this._selectedSource = null;
    this._sourceData = null;
    
    if (hadSelection) {
      this._notifyChange();
      EventBus.emit(EVENTS.SELECTION_CLEARED);
    }
  }
  
  // Check if track is selected
  isSelected(trackNum) {
    return this._selectedTracks.has(trackNum);
  }
  
  // Get all selected tracks (sorted)
  getSelection() {
    return Array.from(this._selectedTracks).sort((a, b) => a - b);
  }
  
  // Get selection count
  getCount() {
    return this._selectedTracks.size;
  }
  
  // Check if has selection
  hasSelection() {
    return this._selectedTracks.size > 0;
  }
  
  // Get selection source info
  getSource() {
    return {
      type: this._selectedSource,
      data: this._sourceData
    };
  }
  
  // Get selection statistics
  getStats() {
    if (this._selectedTracks.size === 0) return null;
    
    const tracks = this.getSelection();
    return {
      count: tracks.length,
      min: tracks[0],
      max: tracks[tracks.length - 1],
      source: this._selectedSource,
      sourceData: this._sourceData
    };
  }
  
  // Update source tracking
  _updateSource(type, data = null) {
    this._selectedSource = type;
    this._sourceData = data;
  }
  
  // Notify of selection change
  _notifyChange() {
    const selection = this.getSelection();
    
    // Update state
    state.set('selection.selectedTracks', new Set(this._selectedTracks));
    
    // Emit event
    EventBus.emit(EVENTS.SELECTION_CHANGED, {
      count: this._selectedTracks.size,
      tracks: selection,
      source: this._selectedSource,
      sourceData: this._sourceData
    });
  }
  
  // Export selection for storage
  exportSelection() {
    return {
      tracks: this.getSelection(),
      source: this._selectedSource,
      sourceData: this._sourceData,
      timestamp: Date.now()
    };
  }
  
  // Import selection from storage
  importSelection(data) {
    if (!data || !data.tracks) return false;
    
    this._selectedTracks.clear();
    data.tracks.forEach(track => this._selectedTracks.add(track));
    
    this._selectedSource = data.source || 'imported';
    this._sourceData = data.sourceData || null;
    
    this._notifyChange();
    return true;
  }
}

// Export singleton
export const selectionManager = new SelectionManager();
