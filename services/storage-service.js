// storage-service.js - CLEANED UP VERSION
import { STORAGE_KEYS, MAX_RECENT_ITEMS, EVENTS } from '../core/constants.js';
import { EventBus } from '../core/events.js';
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

   save(key, value) {
    if (!this.available) {
      return { success: false, error: 'Storage not available' };
    }

    // ✅ NEW: Pre-write quota check
    const estimatedSize = JSON.stringify(value).length + key.length;
    const currentSize = this.getStorageSize();
    const totalEstimated = currentSize + estimatedSize;
    
    const quotaWarning = 5 * 1024 * 1024; // 5MB warning threshold
    const estimatedQuota = quotaWarning * 0.9; // 90% threshold for proactive check
    
    if (totalEstimated > estimatedQuota) {
      EventBus.emit(EVENTS.TOAST_SHOW, {
        message: `Storage nearly full (${(totalEstimated/1024/1024).toFixed(1)}MB). Clear playlists first.`,
        type: 'warning'
      });
      return { success: false, error: 'Storage quota warning - clear space first' };
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return { success: true };
    } catch (error) {
      console.error('Storage save error:', error);
      if (error.name === 'QuotaExceededError') {
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Storage quota exceeded. Please delete playlists.',
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
    if (!this.available) return { success: false, error: 'Storage not available' };
    try {
      localStorage.removeItem(key);
      return { success: true };
    } catch (error) {
      console.error('Storage remove error:', error);
      return { success: false, error: error.message };
    }
  }

  clear() {
    if (!this.available) return { success: false, error: 'Storage not available' };
    try {
      localStorage.clear();
      return { success: true };
    } catch (error) {
      console.error('Storage clear error:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ RENAMED: saveSettings → saveQuizSettings (quiz-specific, not generic)
  saveQuizSettings(settings) {
    const result = this.save(STORAGE_KEYS.QUIZ_SETTINGS, settings);
    return result.success;
  }

  // ✅ RENAMED: loadSettings → loadQuizSettings (quiz-specific, not generic)
  loadQuizSettings() {
    const saved = this.load(STORAGE_KEYS.QUIZ_SETTINGS, null);
    if (saved) {
      if (typeof saved.autoPlayFull === 'undefined') {
        saved.autoPlayFull = false;
      }
    }
    return saved;
  }

  savePlaylist(name, tracks) {
    const nameValidation = validatePlaylistName(name);
    if (!nameValidation.valid) throw new Error(nameValidation.error);

    const tracksValidation = validatePlaylist(tracks);
    if (!tracksValidation.valid) throw new Error(tracksValidation.error);

    const playlists = this.getPlaylists();
    if (playlists[nameValidation.value]) {
      throw new Error(`Playlist "${nameValidation.value}" already exists. Please delete or rename.`);
    }

    playlists[nameValidation.value] = tracksValidation.value;

    const result = this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    if (!result.success) throw new Error(result.error || 'Failed to save playlist');

    return nameValidation.value;
  }

  loadPlaylist(name) {
    return this.getPlaylists()[name] || null;
  }

  deletePlaylist(name) {
    const playlists = this.getPlaylists();
    if (!playlists[name]) throw new Error('Playlist not found');
    delete playlists[name];
    const result = this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    if (!result.success) throw new Error(result.error || 'Failed to delete playlist');
    return true;
  }

  getPlaylists() {
    return this.load(STORAGE_KEYS.PLAYLISTS, {});
  }

  playlistExists(name) {
    return this.getPlaylists().hasOwnProperty(name);
  }

  getPlaylistCount() {
    return Object.keys(this.getPlaylists()).length;
  }

  // ✅ UPDATED: emits HISTORY_UPDATED so playlists-bar can react without setTimeout
  saveToHistory(tracks) {
    if (!tracks || tracks.length === 0) return false;

    const history = this.getHistory();
    const trackString = tracks.join(',');

    const filtered = history.filter(h => h !== trackString);
    const updated = [trackString, ...filtered.slice(0, MAX_RECENT_ITEMS - 1)];

    const result = this.save(STORAGE_KEYS.RECENT, updated);

    if (result.success) {
      EventBus.emit(EVENTS.HISTORY_UPDATED);
    }

    return result.success;
  }

  getHistory() {
    return this.load(STORAGE_KEYS.RECENT, []);
  }

  clearHistory() {
    return this.remove(STORAGE_KEYS.RECENT).success;
  }

  getHistoryCount() {
    return this.getHistory().length;
  }

  saveLastSelection(tracks) {
    return this.save(STORAGE_KEYS.LAST_SELECTION, tracks).success;
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
