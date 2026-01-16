// storage-service.js - ENHANCED VERSION with better error handling

import { STORAGE_KEYS, MAX_RECENT_ITEMS } from '../core/constants.js';
import { EventBus } from '../core/events.js';
import { EVENTS } from '../core/constants.js';
import { validatePlaylistName, validatePlaylist } from '../utils/validation.js';

class StorageService {
  constructor() {
    this.available = this._checkAvailability();
  }

  _checkAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('localStorage not available', e);
      return false;
    }
  }

  isAvailable() {
    return this.available;
  }

  // ✅ ENHANCED: Returns result object instead of boolean
  save(key, value) {
    if (!this.available) {
      return { success: false, error: 'Storage not available' };
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return { success: true };
    } catch (error) {
      console.error('Storage save error:', error);
      
      if (error.name === 'QuotaExceededError') {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Storage full. Please delete some playlists.',
          type: 'error'
        });
      }
      
      return { success: false, error: error.message };
    }
  }

  load(key, defaultValue = null) {
    if (!this.available) return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Storage load error:', error);
      return defaultValue;
    }
  }

  remove(key) {
    if (!this.available) {
      return { success: false, error: 'Storage not available' };
    }

    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      console.error('Storage remove error:', error);
      return { success: false, error: error.message };
    }
  }

  clear() {
    if (!this.available) {
      return { success: false, error: 'Storage not available' };
    }

    try {
      localStorage.clear();
      return { success: true };
    } catch (error) {
      console.error('Storage clear error:', error);
      return { success: false, error: error.message };
    }
  }

  savePlaylist(name, tracks) {
    const nameValidation = validatePlaylistName(name);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const tracksValidation = validatePlaylist(tracks);
    if (!tracksValidation.valid) {
      throw new Error(tracksValidation.error);
    }

    const playlists = this.getPlaylists();

    if (playlists[nameValidation.value]) {
      throw new Error(`Playlist "${nameValidation.value}" already exists. Please choose a different name or delete the existing playlist first.`);
    }

    playlists[nameValidation.value] = tracksValidation.value;

    const result = this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    if (!result.success) {
      throw new Error(result.error || 'Failed to save playlist');
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

    const result = this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete playlist');
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

  saveToHistory(tracks) {
    if (!tracks || tracks.length === 0) return false;

    const history = this.getHistory();
    const trackString = tracks.join(',');

    const filtered = history.filter(h => h !== trackString);
    const updated = [trackString, ...filtered.slice(0, MAX_RECENT_ITEMS - 1)];

    const result = this.save(STORAGE_KEYS.RECENT, updated);
    return result.success;
  }

  getHistory() {
    return this.load(STORAGE_KEYS.RECENT, []);
  }

  clearHistory() {
    const result = this.remove(STORAGE_KEYS.RECENT);
    return result.success;
  }

  getHistoryCount() {
    return this.getHistory().length;
  }

  saveSettings(settings) {
    const result = this.save(STORAGE_KEYS.QUIZ_SETTINGS, settings);
    return result.success;
  }

  loadSettings() {
    return this.load(STORAGE_KEYS.QUIZ_SETTINGS, null);
  }

  saveLastSelection(tracks) {
    const result = this.save(STORAGE_KEYS.LAST_SELECTION, tracks);
    return result.success;
  }

  loadLastSelection() {
    return this.load(STORAGE_KEYS.LAST_SELECTION, []);
  }

  getStorageSize() {
    if (!this.available) return 0;

    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  getStorageSizeKB() {
    return (this.getStorageSize() / 1024).toFixed(2);
  }
}

export const storageService = new StorageService();
