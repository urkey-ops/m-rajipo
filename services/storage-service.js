// storage-service.js - All localStorage operations
import { STORAGE_KEYS, MAX_RECENT_ITEMS } from '../core/constants.js';
import { errorHandler } from '../utils/error-handler.js';
import { validatePlaylistName, validatePlaylist } from '../utils/validation.js';

class StorageService {
  constructor() {
    this._available = this._checkAvailability();
  }
  
  // Check if localStorage is available
  _checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  }
  
  isAvailable() {
    return this._available;
  }
  
  // Generic save
  save(key, value) {
    if (!this._available) return false;
    
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      errorHandler.handle(error, { type: 'storage', operation: 'save', key });
      return false;
    }
  }
  
  // Generic load
  load(key, defaultValue = null) {
    if (!this._available) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      errorHandler.handle(error, { type: 'storage', operation: 'load', key });
      return defaultValue;
    }
  }
  
  // Generic remove
  remove(key) {
    if (!this._available) return false;
    
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      errorHandler.handle(error, { type: 'storage', operation: 'remove', key });
      return false;
    }
  }
  
  // Clear all storage
  clear() {
    if (!this._available) return false;
    
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      errorHandler.handle(error, { type: 'storage', operation: 'clear' });
      return false;
    }
  }
  
  // === Playlist Operations ===
  
  savePlaylist(name, tracks) {
    // Validate name
    const nameValidation = validatePlaylistName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }
    
    // Validate tracks
    const tracksValidation = validatePlaylist(tracks);
    if (!tracksValidation.valid) {
      throw new Error(tracksValidation.error);
    }
    
    const playlists = this.getPlaylists();
    
    // Check if playlist exists
    if (playlists[nameValidation.value]) {
      throw new Error('A playlist with this name already exists');
    }
    
    playlists[nameValidation.value] = tracksValidation.value;
    
    const success = this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    if (!success) {
      throw new Error('Failed to save playlist');
    }
    
    return nameValidation.value;
  }
  
  loadPlaylist(name) {
    const playlists = this.getPlaylists();
    return playlists[name] || null;
  }
  
  deletePlaylist(name) {
    const playlists = this.getPlaylists();
    if (!playlists[name]) {
      throw new Error('Playlist not found');
    }
    
    delete playlists[name];
    
    const success = this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    if (!success) {
      throw new Error('Failed to delete playlist');
    }
    
    return true;
  }
  
  getPlaylists() {
    return this.load(STORAGE_KEYS.PLAYLISTS, {});
  }
  
  playlistExists(name) {
    const playlists = this.getPlaylists();
    return playlists.hasOwnProperty(name);
  }
  
  getPlaylistCount() {
    return Object.keys(this.getPlaylists()).length;
  }
  
  // === History Operations ===
  
  saveToHistory(tracks) {
    if (!tracks || tracks.length === 0) return false;
    
    const history = this.getHistory();
    const trackString = tracks.join(',');
    
    // Remove if already exists
    const filtered = history.filter(h => h !== trackString);
    
    // Add to front
    const updated = [trackString, ...filtered].slice(0, MAX_RECENT_ITEMS);
    
    return this.save(STORAGE_KEYS.RECENT, updated);
  }
  
  getHistory() {
    return this.load(STORAGE_KEYS.RECENT, []);
  }
  
  clearHistory() {
    return this.remove(STORAGE_KEYS.RECENT);
  }
  
  getHistoryCount() {
    return this.getHistory().length;
  }
  
  // === Settings Operations ===
  
  saveSettings(settings) {
    return this.save(STORAGE_KEYS.QUIZ_SETTINGS, settings);
  }
  
  loadSettings() {
    return this.load(STORAGE_KEYS.QUIZ_SETTINGS, null);
  }
  
  // === Last Selection ===
  
  saveLastSelection(tracks) {
    return this.save(STORAGE_KEYS.LAST_SELECTION, tracks);
  }
  
  loadLastSelection() {
    return this.load(STORAGE_KEYS.LAST_SELECTION, []);
  }
  
  // === Utilities ===
  
  // Get storage usage (estimate)
  getStorageSize() {
    if (!this._available) return 0;
    
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
  
  // Get storage size in KB
  getStorageSizeKB() {
    return (this.getStorageSize() / 1024).toFixed(2);
  }
}

// Export singleton
export const storageService = new StorageService();
