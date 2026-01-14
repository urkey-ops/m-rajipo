// playlists-bar.js - Playlists and recent selections component
import { $, $$, createElement, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';
import { storageService } from '../../services/storage-service.js';
import { playlistService } from '../../services/playlist-service.js';
import { selectionManager } from '../../managers/selection-manager.js';
import { modal } from './modal.js';
import { validatePlaylistName } from '../../utils/validation.js';

class PlaylistsBar {
  constructor() {
    this._playlistsTab = null;
    this._recentTab = null;
    this._playlistsPanel = null;
    this._recentPanel = null;
    this._playlistsContent = null;
    
    this._playlistList = null;
    this._playlistEmpty = null;
    this._playlistCount = null;
    
    this._recentList = null;
    this._recentEmpty = null;
    this._recentCount = null;
    
    this._savePlaylistBtn = null;
    this._clearHistoryBtn = null;
    
    this._activeTab = 0;
    this._isCollapsed = false;
  }
  
  initialize() {
    // Tabs
    this._playlistsTab = $('#playlistsTab');
    this._recentTab = $('#recentTab');
    
    // Panels
    this._playlistsPanel = $('#playlistsPanel');
    this._recentPanel = $('#recentPanel');
    this._playlistsContent = $('#playlistsContent');
    
    // Playlists elements
    this._playlistList = $('#playlistList');
    this._playlistEmpty = $('#playlistEmpty');
    this._playlistCount = $('#playlistCount');
    
    // Recent elements
    this._recentList = $('#recentList');
    this._recentEmpty = $('#recentEmpty');
    this._recentCount = $('#recentCount');
    
    // Buttons
    this._savePlaylistBtn = $('#savePlaylistBtn');
    this._clearHistoryBtn = $('#clearHistoryBtn');
    
    this._setupEventListeners();
    this._renderPlaylists();
    this._renderRecent();
    
    console.log('✅ Playlists bar initialized');
  }
  
  _setupEventListeners() {
    // Tab switching
    [this._playlistsTab, this._recentTab].forEach((tab, index) => {
      if (!tab) return;
      
      tab.addEventListener('click', () => {
        if (this._activeTab === index) {
          // Toggle collapse
          this._isCollapsed = !this._isCollapsed;
          this._updateCollapse();
        } else {
          // Switch tab and expand
          this._isCollapsed = false;
          this._switchTab(index);
        }
      });
    });
    
    // Save playlist button
    if (this._savePlaylistBtn) {
      this._savePlaylistBtn.addEventListener('click', () => {
        this._showSavePlaylistModal();
      });
    }
    
    // Clear history button
    if (this._clearHistoryBtn) {
      this._clearHistoryBtn.addEventListener('click', () => {
        this._confirmClearHistory();
      });
    }
    
    // Listen to selection changes to show/hide save button
    EventBus.on(EVENTS.SELECTION_CHANGED, (data) => {
      if (this._savePlaylistBtn) {
        toggleClass(this._savePlaylistBtn, 'hidden', data.count === 0);
      }
    });
    
    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      if (this._savePlaylistBtn) {
        addClass(this._savePlaylistBtn, 'hidden');
      }
    });
    
    // Listen to playlist events
    EventBus.on(EVENTS.PLAYLIST_SAVED, () => {
      this._renderPlaylists();
    });
    
    EventBus.on(EVENTS.PLAYLIST_DELETED, () => {
      this._renderPlaylists();
    });
    
    EventBus.on(EVENTS.HISTORY_CLEARED, () => {
      this._renderRecent();
    });
    
    // Listen to playback start to update recent
    EventBus.on(EVENTS.PLAYBACK_STARTED, () => {
      // Delay to allow storage service to save
      setTimeout(() => this._renderRecent(), 100);
    });
  }
  
  _switchTab(index) {
    this._activeTab = index;
    
    // Update tab active states
    [this._playlistsTab, this._recentTab].forEach((tab, i) => {
      toggleClass(tab, 'active', i === index);
    });
    
    // Update panel active states
    [this._playlistsPanel, this._recentPanel].forEach((panel, i) => {
      toggleClass(panel, 'active', i === index);
    });
    
    // Render content when switching
    if (index === 0) {
      this._renderPlaylists();
    } else {
      this._renderRecent();
    }
    
    // Expand content
    this._updateCollapse();
  }
  
  _updateCollapse() {
    if (this._playlistsContent) {
      if (this._isCollapsed) {
        this._playlistsContent.style.transform = 'scaleY(0)';
        this._playlistsContent.style.opacity = '0';
      } else {
        this._playlistsContent.style.transform = 'scaleY(1)';
        this._playlistsContent.style.opacity = '1';
      }
    }
  }
  
  _renderPlaylists() {
    if (!this._playlistList) return;
    
    const playlists = storageService.getPlaylists();
    const names = Object.keys(playlists);
    
    // Update count
    if (this._playlistCount) {
      this._playlistCount.textContent = names.length.toString();
    }
    
    // Clear list
    this._playlistList.innerHTML = '';
    
    // Show/hide empty message
    if (this._playlistEmpty) {
      toggleClass(this._playlistEmpty, 'hidden', names.length > 0);
    }
    
    if (names.length === 0) return;
    
    const fragment = document.createDocumentFragment();
    
    names.forEach((name, index) => {
      const tracks = playlists[name];
      if (!Array.isArray(tracks)) return;
      
      const li = createElement('li');
      const sheetItem = this._createPlaylistItem(name, tracks, index);
      li.appendChild(sheetItem);
      fragment.appendChild(li);
    });
    
    this._playlistList.appendChild(fragment);
  }
  
  _createPlaylistItem(name, tracks, index) {
    const sheetItem = createElement('div', { className: 'sheet-item' });
    
    // Left side (checkbox + label)
    const leftDiv = createElement('div', { className: 'sheet-item-left' });
    
    const checkbox = createElement('input', {
      type: 'checkbox',
      className: 'sheet-item-checkbox',
      id: `playlist-${index}`,
      dataset: { selection: JSON.stringify(tracks) }
    });
    
    const label = createElement('label', {
      htmlFor: `playlist-${index}`,
      className: 'sheet-item-text'
    }, [`${name} (${tracks.length})`]);
    
    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(label);
    
    // Actions
    const actionsDiv = createElement('div', { className: 'sheet-item-actions' });
    
    const loadBtn = createElement('button', {
      className: 'sheet-item-btn',
      title: 'Load playlist'
    }, [createElement('i', { className: 'fa-solid fa-upload' })]);
    
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._loadPlaylist(name, tracks);
    });
    
    const deleteBtn = createElement('button', {
      className: 'sheet-item-btn delete',
      title: 'Delete playlist'
    }, [createElement('i', { className: 'fa-solid fa-trash' })]);
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._confirmDeletePlaylist(name);
    });
    
    actionsDiv.appendChild(loadBtn);
    actionsDiv.appendChild(deleteBtn);
    
    sheetItem.appendChild(leftDiv);
    sheetItem.appendChild(actionsDiv);
    
    // Click handler for entire item
    sheetItem.addEventListener('click', (e) => {
      if (e.target === checkbox || e.target.closest('.sheet-item-btn')) return;
      checkbox.checked = !checkbox.checked;
      this._handlePlaylistSelection(checkbox, tracks, name);
    });
    
    checkbox.addEventListener('change', () => {
      this._handlePlaylistSelection(checkbox, tracks, name);
    });
    
    return sheetItem;
  }
  
  _handlePlaylistSelection(checkbox, tracks, name) {
    toggleClass(checkbox.closest('.sheet-item'), 'selected', checkbox.checked);
    
    if (checkbox.checked) {
      // Deselect other sheet items
      $$('.sheet-item input:checked').forEach(cb => {
        if (cb !== checkbox) {
          cb.checked = false;
          removeClass(cb.closest('.sheet-item'), 'selected');
        }
      });
      
      // Select tracks via selection manager (will update UI)
      selectionManager.selectPlaylist(name, tracks);
    } else {
      selectionManager.clear();
    }
  }
  
  _loadPlaylist(name, tracks) {
    // Deselect all sheet items first
    $$('.sheet-item input:checked').forEach(cb => {
      cb.checked = false;
      removeClass(cb.closest('.sheet-item'), 'selected');
    });
    
    selectionManager.selectPlaylist(name, tracks);
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message: `Playlist "${name}" loaded (${tracks.length} shlokas)`,
      type: 'success'
    });
  }
  
  _confirmDeletePlaylist(name) {
    modal.showConfirm(
      `Are you sure you want to delete the playlist "${name}"? This action cannot be undone.`,
      () => {
        try {
          storageService.deletePlaylist(name);
          
          EventBus.emit(EVENTS.PLAYLIST_DELETED, { name });
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: `Playlist "${name}" deleted`,
            type: 'success'
          });
        } catch (error) {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: error.message,
            type: 'error'
          });
        }
      }
    );
  }
  
  _renderRecent() {
    if (!this._recentList) return;
    
    const history = storageService.getHistory();
    
    // Update count
    if (this._recentCount) {
      this._recentCount.textContent = history.length.toString();
    }
    
    // Clear list
    this._recentList.innerHTML = '';
    
    // Show/hide empty message
    if (this._recentEmpty) {
      toggleClass(this._recentEmpty, 'hidden', history.length > 0);
    }
    
    if (history.length === 0) return;
    
    const fragment = document.createDocumentFragment();
    
    history.forEach((sel, index) => {
      const tracks = playlistService.parseSelectionString(sel);
      if (tracks.length === 0) return;
      
      const li = createElement('li');
      const sheetItem = this._createRecentItem(tracks, index);
      li.appendChild(sheetItem);
      fragment.appendChild(li);
    });
    
    this._recentList.appendChild(fragment);
  }
  
  _createRecentItem(tracks, index) {
    const sheetItem = createElement('div', { className: 'sheet-item' });
    
    // Left side
    const leftDiv = createElement('div', { className: 'sheet-item-left' });
    
    const checkbox = createElement('input', {
      type: 'checkbox',
      className: 'sheet-item-checkbox',
      id: `recent-${index}`,
      dataset: { selection: tracks.join(',') }
    });
    
    const labelText = playlistService.formatPlaylistLabel(tracks);
    const label = createElement('label', {
      htmlFor: `recent-${index}`,
      className: 'sheet-item-text'
    }, [labelText]);
    
    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(label);
    sheetItem.appendChild(leftDiv);
    
    // Click handler
    sheetItem.addEventListener('click', (e) => {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      this._handleRecentSelection(checkbox, tracks);
    });
    
    checkbox.addEventListener('change', () => {
      this._handleRecentSelection(checkbox, tracks);
    });
    
    return sheetItem;
  }
  
  _handleRecentSelection(checkbox, tracks) {
    toggleClass(checkbox.closest('.sheet-item'), 'selected', checkbox.checked);
    
    if (checkbox.checked) {
      // Deselect other sheet items
      $$('.sheet-item input:checked').forEach(cb => {
        if (cb !== checkbox) {
          cb.checked = false;
          removeClass(cb.closest('.sheet-item'), 'selected');
        }
      });
      
      // Select tracks via selection manager (will update UI)
      selectionManager.selectRecent('recent', tracks);
    } else {
      selectionManager.clear();
    }
  }
  
  _showSavePlaylistModal() {
    const selectedTracks = selectionManager.getSelection();
    
    if (selectedTracks.length === 0) {
      modal.show('Please select at least one shloka to save as a playlist.');
      return;
    }
    
    modal.showInput(
      'Save Playlist',
      (name) => {
        try {
          storageService.savePlaylist(name, selectedTracks);
          
          EventBus.emit(EVENTS.PLAYLIST_SAVED, { name, tracks: selectedTracks });
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: `Playlist "${name}" saved!`,
            type: 'success'
          });
        } catch (error) {
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: error.message,
            type: 'error'
          });
        }
      },
      {
        placeholder: 'My new playlist',
        maxLength: 50,
        validation: (name) => validatePlaylistName(name)
      }
    );
  }
  
  _confirmClearHistory() {
    modal.showConfirm(
      'Are you sure you want to clear your recently played history? This action cannot be undone.',
      () => {
        storageService.clearHistory();
        
        EventBus.emit(EVENTS.HISTORY_CLEARED);
        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: 'Recently played history cleared',
          type: 'success'
        });
      }
    );
  }
}

// Export singleton
export const playlistsBar = new PlaylistsBar();
