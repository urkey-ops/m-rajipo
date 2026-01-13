// state.js - Centralized state management
import { MODES, DEFAULT_SETTINGS } from './constants.js';
import { EventBus } from './events.js';

class State {
  constructor() {
    this._state = {
      // Current mode
      currentMode: MODES.REGULAR,
      
      // Audio state
      audio: {
        currentTrack: null,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        speed: DEFAULT_SETTINGS.SPEED,
        isLoading: false
      },
      
      // Playlist state
      playlist: {
        tracks: [],
        currentIndex: 0,
        repeatEach: DEFAULT_SETTINGS.REPEAT_COUNT,
        repeatCounter: 0,
        repeatPlaylist: false,
        shuffled: false
      },
      
      // Selection state
      selection: {
        selectedTracks: new Set(),
        selectedPlaylist: null,
        selectedRecent: null
      },
      
      // Regular mode settings
      regularMode: {
        speed: DEFAULT_SETTINGS.SPEED,
        repeatCount: DEFAULT_SETTINGS.REPEAT_COUNT,
        shuffle: false,
        repeatPlaylist: false
      },
      
      // Quiz mode settings
      quizMode: {
        quizTime: DEFAULT_SETTINGS.QUIZ_TIME,
        quizDelay: DEFAULT_SETTINGS.QUIZ_DELAY,
        autoPlay: DEFAULT_SETTINGS.AUTO_PLAY,
        currentTrack: null,
        isPaused: false,
        countdown: null
      },
      
      // UI state
      ui: {
        isSearchCollapsed: false,
        isPlaylistsCollapsed: false,
        activeSearchTab: 'search',
        activePlaylistTab: 'playlists'
      },
      
      // Network state
      network: {
        isOnline: navigator.onLine
      }
    };
    
    this._subscribers = new Map();
    this._eventBus = EventBus;
  }
  
  // Get entire state (immutable)
  getState() {
    return JSON.parse(JSON.stringify(this._state));
  }
  
  // Get specific state slice
  get(path) {
    const keys = path.split('.');
    let value = this._state;
    
    for (const key of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[key];
    }
    
    return value;
  }
  
  // Set state (immutable update)
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this._state;
    
    // Navigate to parent
    for (const key of keys) {
      if (!target[key]) target[key] = {};
      target = target[key];
    }
    
    // Update value
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    // Notify subscribers
    this._notify(path, value, oldValue);
    
    // Emit global state change event
    this._eventBus.emit('state:changed', { path, value, oldValue });
  }
  
  // Update multiple paths at once
  update(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }
  
  // Subscribe to state changes
  subscribe(path, callback) {
    if (!this._subscribers.has(path)) {
      this._subscribers.set(path, new Set());
    }
    this._subscribers.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this._subscribers.get(path);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }
  
  // Notify subscribers
  _notify(path, newValue, oldValue) {
    // Notify exact path subscribers
    const subscribers = this._subscribers.get(path);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(newValue, oldValue);
        } catch (error) {
          console.error('Subscriber error:', error);
        }
      });
    }
    
    // Notify parent path subscribers (e.g., 'audio' when 'audio.isPlaying' changes)
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentSubscribers = this._subscribers.get(parentPath);
      if (parentSubscribers) {
        const parentValue = this.get(parentPath);
        parentSubscribers.forEach(callback => {
          try {
            callback(parentValue, parentValue);
          } catch (error) {
            console.error('Parent subscriber error:', error);
          }
        });
      }
    }
  }
  
  // Reset state
  reset() {
    this._state.selection.selectedTracks.clear();
    this.update({
      'audio.currentTrack': null,
      'audio.isPlaying': false,
      'playlist.tracks': [],
      'playlist.currentIndex': 0,
      'playlist.repeatCounter': 0
    });
  }
  
  // Mode helpers
  isQuizMode() {
    return this._state.currentMode === MODES.QUIZ;
  }
  
  isRegularMode() {
    return this._state.currentMode === MODES.REGULAR;
  }
  
  setMode(mode) {
    if (mode !== MODES.REGULAR && mode !== MODES.QUIZ) {
      throw new Error(`Invalid mode: ${mode}`);
    }
    const oldMode = this._state.currentMode;
    this.set('currentMode', mode);
    this._eventBus.emit('mode:changed', { from: oldMode, to: mode });
  }
  
  // Selection helpers
  addToSelection(trackNum) {
    this._state.selection.selectedTracks.add(trackNum);
    this._notify('selection.selectedTracks', this._state.selection.selectedTracks, null);
    this._eventBus.emit('selection:changed', { 
      count: this._state.selection.selectedTracks.size 
    });
  }
  
  removeFromSelection(trackNum) {
    this._state.selection.selectedTracks.delete(trackNum);
    this._notify('selection.selectedTracks', this._state.selection.selectedTracks, null);
    this._eventBus.emit('selection:changed', { 
      count: this._state.selection.selectedTracks.size 
    });
  }
  
  clearSelection() {
    this._state.selection.selectedTracks.clear();
    this._state.selection.selectedPlaylist = null;
    this._state.selection.selectedRecent = null;
    this._notify('selection.selectedTracks', this._state.selection.selectedTracks, null);
    this._eventBus.emit('selection:cleared');
  }
  
  getSelectedTracks() {
    return Array.from(this._state.selection.selectedTracks);
  }
  
  getSelectionCount() {
    return this._state.selection.selectedTracks.size;
  }
}

// Export singleton instance
export const state = new State();
