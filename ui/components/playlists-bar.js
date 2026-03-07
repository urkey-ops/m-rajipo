// playlists-bar.js - CLEANED UP VERSION
import { $, $$, addClass, removeClass, toggleClass } from '../../utils/dom-utils.js';
import { EventBus } from '../../core/events.js';
import { EVENTS } from '../../core/constants.js';
import { storageService } from '../../services/storage-service.js';
import { playlistService } from '../../services/playlist-service.js';
import { selectionManager } from '../../managers/selection-manager.js';
import { modal } from './modal.js';
import { validatePlaylistName } from '../../utils/validation.js';

class PlaylistsBar {
  constructor() {
    this.playlistsTab = null;
    this.recentTab = null;
    this.playlistsPanel = null;
    this.recentPanel = null;
    this.playlistsContent = null;
    this.playlistList = null;
    this.playlistEmpty = null;
    this.playlistCount = null;
    this.recentList = null;
    this.recentEmpty = null;
    this.recentCount = null;
    this.savePlaylistBtn = null;
    this.clearHistoryBtn = null;
    this.activeTab = 0;
    this.isCollapsed = false;
  }

  initialize() {
    this.playlistsTab = $('#playlistsTab');
    this.recentTab = $('#recentTab');
    this.playlistsPanel = $('#playlistsPanel');
    this.recentPanel = $('#recentPanel');
    this.playlistsContent = $('#playlistsContent');
    this.playlistList = $('#playlistList');
    this.playlistEmpty = $('#playlistEmpty');
    this.playlistCount = $('#playlistCount');
    this.recentList = $('#recentList');
    this.recentEmpty = $('#recentEmpty');
    this.recentCount = $('#recentCount');
    this.savePlaylistBtn = $('#savePlaylistBtn');
    this.clearHistoryBtn = $('#clearHistoryBtn');

    this._setupEventListeners();
    this.renderPlaylists();
    this.renderRecent();

    this._updateSaveButtonVisibility();

    console.log('✅ Playlists bar initialized');
  }

  _setupEventListeners() {
    [this.playlistsTab, this.recentTab].forEach((tab, index) => {
      if (!tab) return;
      tab.addEventListener('click', () => {
        if (this.activeTab === index) {
          this.isCollapsed = !this.isCollapsed;
          this._updateCollapse();
        } else {
          this.isCollapsed = false;
          this._switchTab(index);
        }
      });
    });

    if (this.savePlaylistBtn) {
      this.savePlaylistBtn.addEventListener('click', () => {
        this._showSavePlaylistModal();
      });
    }

    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener('click', () => {
        this._confirmClearHistory();
      });
    }

    EventBus.on(EVENTS.SELECTION_CHANGED, () => {
      this._updateSaveButtonVisibility();
    });

    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this._updateSaveButtonVisibility();
    });

    EventBus.on(EVENTS.PLAYLIST_SAVED, () => {
      this.renderPlaylists();
    });

    EventBus.on(EVENTS.PLAYLIST_DELETED, () => {
      this.renderPlaylists();
    });

    EventBus.on(EVENTS.HISTORY_CLEARED, () => {
      this.renderRecent();
    });

    // ✅ FIXED: Listen to HISTORY_UPDATED instead of PLAYBACK_STARTED + setTimeout.
    // saveToHistory() in storage-service.js emits HISTORY_UPDATED immediately after saving,
    // so this is reliable and race-condition-free.
    EventBus.on(EVENTS.HISTORY_UPDATED, () => {
      this.renderRecent();
    });
  }

  _updateSaveButtonVisibility() {
    if (!this.savePlaylistBtn) return;
    const count = selectionManager.getCount();
    toggleClass(this.savePlaylistBtn, 'hidden', count === 0);
  }

  _switchTab(index) {
    this.activeTab = index;

    [this.playlistsTab, this.recentTab].forEach((tab, i) => {
      toggleClass(tab, 'active', i === index);
    });

    [this.playlistsPanel, this.recentPanel].forEach((panel, i) => {
      toggleClass(panel, 'active', i === index);
    });

    if (index === 0) {
      this.renderPlaylists();
    } else {
      this.renderRecent();
    }

    this._updateCollapse();
  }

  _updateCollapse() {
    if (this.playlistsContent) {
      if (this.isCollapsed) {
        this.playlistsContent.style.transform = 'scaleY(0)';
        this.playlistsContent.style.opacity = '0';
        this.playlistsContent.style.maxHeight = '0';
      } else {
        this.playlistsContent.style.transform = 'scaleY(1)';
        this.playlistsContent.style.opacity = '1';
        this.playlistsContent.style.maxHeight = '1000px';
      }
    }
  }

  renderPlaylists() {
    if (!this.playlistList) return;

    const playlists = storageService.getPlaylists();
    const names = Object.keys(playlists);

    if (this.playlistCount) {
      this.playlistCount.textContent = names.length.toString();
    }

    this.playlistList.innerHTML = '';

    if (this.playlistEmpty) {
      this.playlistEmpty.style.display = names.length === 0 ? 'block' : 'none';
    }

    if (names.length === 0) return;

    const fragment = document.createDocumentFragment();

    names.forEach((name, index) => {
      const tracks = playlists[name];
      if (!Array.isArray(tracks)) return;

      const li = document.createElement('li');
      const sheetItem = this._createPlaylistItem(name, tracks, index);
      li.appendChild(sheetItem);
      fragment.appendChild(li);
    });

    this.playlistList.appendChild(fragment);
  }

  _createPlaylistItem(name, tracks, index) {
    const sheetItem = document.createElement('div');
    sheetItem.className = 'sheet-item';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'sheet-item-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'sheet-item-checkbox';
    checkbox.id = `playlist-${index}`;
    checkbox.dataset.selection = JSON.stringify(tracks);

    const label = document.createElement('label');
    label.htmlFor = `playlist-${index}`;
    label.className = 'sheet-item-text';
    label.textContent = `${name} (${tracks.length})`;

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(label);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'sheet-item-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'sheet-item-btn';
    loadBtn.title = 'Load playlist';
    loadBtn.innerHTML = '<i class="fa-solid fa-upload"></i>';
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._loadPlaylist(name, tracks);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'sheet-item-btn delete';
    deleteBtn.title = 'Delete playlist';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._confirmDeletePlaylist(name);
    });

    actionsDiv.appendChild(loadBtn);
    actionsDiv.appendChild(deleteBtn);

    sheetItem.appendChild(leftDiv);
    sheetItem.appendChild(actionsDiv);

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
      $$('.sheet-item input:checked').forEach(cb => {
        if (cb !== checkbox) {
          cb.checked = false;
          removeClass(cb.closest('.sheet-item'), 'selected');
        }
      });

      selectionManager.selectPlaylist(name, tracks);
    } else {
      selectionManager.clear();
    }
  }

  _loadPlaylist(name, tracks) {
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

          const source = selectionManager.getSource();
          if (source.type === 'playlist' && source.data?.name === name) {
            selectionManager.clear();
          }

          EventBus.emit(EVENTS.PLAYLIST_DELETED, { name });
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: `Playlist "${name}" deleted`,
            type: 'success'
          });
        } catch (error) {
          console.error('Delete playlist error:', error);
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: error.message,
            type: 'error'
          });
        }
      },
      null,
      {
        confirmText: 'Delete',
        confirmStyle: {
          background: 'var(--destructive)',
          borderColor: 'var(--destructive)'
        }
      }
    );
  }

  renderRecent() {
    if (!this.recentList) return;

    const history = storageService.getHistory();

    if (this.recentCount) {
      this.recentCount.textContent = history.length.toString();
    }

    this.recentList.innerHTML = '';

    if (this.recentEmpty) {
      this.recentEmpty.style.display = history.length === 0 ? 'block' : 'none';
    }

    if (history.length === 0) return;

    const fragment = document.createDocumentFragment();

    history.forEach((sel, index) => {
      const tracks = playlistService.parseSelectionString(sel);
      if (tracks.length === 0) return;

      const li = document.createElement('li');
      const sheetItem = this._createRecentItem(tracks, index);
      li.appendChild(sheetItem);
      fragment.appendChild(li);
    });

    this.recentList.appendChild(fragment);
  }

  _createRecentItem(tracks, index) {
    const sheetItem = document.createElement('div');
    sheetItem.className = 'sheet-item';

    const leftDiv = document.createElement('div');
    leftDiv.className = 'sheet-item-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'sheet-item-checkbox';
    checkbox.id = `recent-${index}`;
    checkbox.dataset.selection = tracks.join(',');

    const labelText = playlistService.formatPlaylistLabel(tracks);
    const label = document.createElement('label');
    label.htmlFor = `recent-${index}`;
    label.className = 'sheet-item-text';
    label.textContent = labelText;

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(label);

    sheetItem.appendChild(leftDiv);

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
      $$('.sheet-item input:checked').forEach(cb => {
        if (cb !== checkbox) {
          cb.checked = false;
          removeClass(cb.closest('.sheet-item'), 'selected');
        }
      });

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
          const savedName = storageService.savePlaylist(name, selectedTracks);
          EventBus.emit(EVENTS.PLAYLIST_SAVED, { name: savedName, tracks: selectedTracks });
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: `Playlist "${savedName}" saved!`,
            type: 'success'
          });
        } catch (error) {
          console.error('Save playlist error:', error);
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
        try {
          storageService.clearHistory();
          EventBus.emit(EVENTS.HISTORY_CLEARED);
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: 'Recently played history cleared',
            type: 'success'
          });
          this.renderRecent();
        } catch (error) {
          console.error('Clear history error:', error);
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: 'Failed to clear history',
            type: 'error'
          });
        }
      },
      null,
      {
        confirmText: 'Clear',
        confirmStyle: {
          background: 'var(--destructive)',
          borderColor: 'var(--destructive)'
        }
      }
    );
  }
}

export const playlistsBar = new PlaylistsBar();
