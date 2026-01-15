// playlists-bar.js - Playlists and recent selections component

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
    // Tabs
    this.playlistsTab = $('#playlistsTab');
    this.recentTab = $('#recentTab');

    // Panels
    this.playlistsPanel = $('#playlistsPanel');
    this.recentPanel = $('#recentPanel');

    // Content
    this.playlistsContent = $('#playlistsContent');

    // Playlists elements
    this.playlistList = $('#playlistList');
    this.playlistEmpty = $('#playlistEmpty');
    this.playlistCount = $('#playlistCount');

    // Recent elements
    this.recentList = $('#recentList');
    this.recentEmpty = $('#recentEmpty');
    this.recentCount = $('#recentCount');

    // Buttons
    this.savePlaylistBtn = $('#savePlaylistBtn');
    this.clearHistoryBtn = $('#clearHistoryBtn');

    this._setupEventListeners();
    this.renderPlaylists();
    this.renderRecent();

    // Check initial selection state for save button
    this._updateSaveButtonVisibility();

    console.log('✅ Playlists bar initialized');
  }

  _setupEventListeners() {
    // Tab switching with collapse
    [this.playlistsTab, this.recentTab].forEach((tab, index) => {
      if (!tab) return;
      tab.addEventListener('click', () => {
        if (this.activeTab === index) {
          // Toggle collapse
          this.isCollapsed = !this.isCollapsed;
          this._updateCollapse();
        } else {
          // Switch tab and expand
          this.isCollapsed = false;
          this._switchTab(index);
        }
      });
    });

    // Save playlist button
    if (this.savePlaylistBtn) {
      this.savePlaylistBtn.addEventListener('click', () => {
        console.log('Save playlist button clicked');
        this._showSavePlaylistModal();
      });
    } else {
      console.warn('Save playlist button not found! Check if element has id="savePlaylistBtn"');
    }

    // Clear history button
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener('click', () => {
        console.log('Clear history button clicked');
        this._confirmClearHistory();
      });
    } else {
      console.warn('Clear history button not found! Check if element has id="clearHistoryBtn"');
    }

    // Listen to selection changes to show/hide save button
    EventBus.on(EVENTS.SELECTION_CHANGED, () => {
      this._updateSaveButtonVisibility();
    });

    EventBus.on(EVENTS.SELECTION_CLEARED, () => {
      this._updateSaveButtonVisibility();
    });

    // Listen to playlist events
    EventBus.on(EVENTS.PLAYLIST_SAVED, () => {
      this.renderPlaylists();
    });

    EventBus.on(EVENTS.PLAYLIST_DELETED, () => {
      this.renderPlaylists();
    });

    EventBus.on(EVENTS.HISTORY_CLEARED, () => {
      this.renderRecent();
    });

    // Listen to playback start to update recent
    EventBus.on(EVENTS.PLAYBACK_STARTED, () => {
      setTimeout(() => this.renderRecent(), 100);
    });
  }

  _updateSaveButtonVisibility() {
    if (!this.savePlaylistBtn) return;
    const count = selectionManager.getCount();
    toggleClass(this.savePlaylistBtn, 'hidden', count === 0);
    console.log(`Save button visibility updated (count=${count}, hidden=${count === 0})`);
  }

  _switchTab(index) {
    this.activeTab = index;

    // Update tab active states
    [this.playlistsTab, this.recentTab].forEach((tab, i) => {
      toggleClass(tab, 'active', i === index);
    });

    // Update panel active states
    [this.playlistsPanel, this.recentPanel].forEach((panel, i) => {
      toggleClass(panel, 'active', i === index);
    });

    // Render content when switching
    if (index === 0) {
      this.renderPlaylists();
    } else {
      this.renderRecent();
    }

    // Expand content
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
    console.log(`Rendering playlists: ${names.length}`);

    // Update count
    if (this.playlistCount) {
      this.playlistCount.textContent = names.length.toString();
    }

    // Clear list
    this.playlistList.innerHTML = '';

    // Show/hide empty message
    if (this.playlistEmpty) {
      if (names.length === 0) {
        this.playlistEmpty.style.display = 'block';
      } else {
        this.playlistEmpty.style.display = 'none';
      }
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

    // Left side (checkbox + label)
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

    // Actions
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'sheet-item-actions';

    // Load button
    const loadBtn = document.createElement('button');
    loadBtn.className = 'sheet-item-btn';
    loadBtn.title = 'Load playlist';
    loadBtn.innerHTML = '<i class="fa-solid fa-upload"></i>';
    loadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Load playlist clicked:', name);
      this._loadPlaylist(name, tracks);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'sheet-item-btn delete';
    deleteBtn.title = 'Delete playlist';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Delete playlist clicked:', name);
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

      // Select tracks via selection manager
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
    console.log('Confirming delete for:', name);

    modal.showConfirm(
      `Are you sure you want to delete the playlist "${name}"? This action cannot be undone.`,
      () => {
        console.log('Delete confirmed for:', name);
        try {
          storageService.deletePlaylist(name);

          // Clear selection if this playlist was selected
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
    console.log(`Rendering recent: ${history.length}`);

    // Update count
    if (this.recentCount) {
      this.recentCount.textContent = history.length.toString();
    }

    // Clear list
    this.recentList.innerHTML = '';

    // Show/hide empty message
    if (this.recentEmpty) {
      if (history.length === 0) {
        this.recentEmpty.style.display = 'block';
      } else {
        this.recentEmpty.style.display = 'none';
      }
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

    // Left side
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

      // Select tracks via selection manager
      selectionManager.selectRecent('recent', tracks);
    } else {
      selectionManager.clear();
    }
  }

  _showSavePlaylistModal() {
    console.log('Opening save playlist modal');

    const selectedTracks = selectionManager.getSelection();
    console.log('Selected tracks:', selectedTracks);

    if (selectedTracks.length === 0) {
      modal.show('Please select at least one shloka to save as a playlist.');
      return;
    }

    modal.showInput(
      'Save Playlist',
      (name) => {
        console.log('Saving playlist with name:', name);
        try {
          const savedName = storageService.savePlaylist(name, selectedTracks);
          console.log('Playlist saved successfully:', savedName);

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
    console.log('Confirming clear history');

    modal.showConfirm(
      'Are you sure you want to clear your recently played history? This action cannot be undone.',
      () => {
        console.log('Clear history confirmed');
        try {
          storageService.clearHistory();
          EventBus.emit(EVENTS.HISTORY_CLEARED);
          EventBus.emit(EVENTS.TOAST_SHOW, {
            message: 'Recently played history cleared',
            type: 'success'
          });

          // Re-render to show empty state
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

// Export singleton
export const playlistsBar = new PlaylistsBar();
