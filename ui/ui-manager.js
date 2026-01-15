// ui-manager.js - Coordinates all UI components (FIXED)

import { EventBus } from '../core/events.js';
import { EVENTS } from '../core/constants.js';

import { modal } from './components/modal.js';
import { toast } from './components/toast.js';
import { fab } from './components/fab.js';
import { nowPlaying } from './components/now-playing.js';
import { modeToggle } from './components/mode-toggle.js';
import { controls } from './components/controls.js';
import { shlokaGrid } from './components/shloka-grid.js';
import { searchBar } from './components/search-bar.js';
import { playlistsBar } from './components/playlists-bar.js';
import { audioPlayer } from './components/audio-player.js';
import { quizControls } from './components/quiz-controls.js';
import { memoryControls } from './components/memory-controls.js';

class UIManager {
  constructor() {
    this._initialized = false; // ✅ FIXED: Renamed from isInitialized to _initialized
  }

  initialize() {
    if (this._initialized) {
      console.warn('UI Manager already initialized');
      return;
    }

    console.log('🎨 Initializing UI Manager...');

    // Initialize all components
    modal.initialize();
    toast.initialize();
    fab.initialize();
    nowPlaying.initialize();
    modeToggle.initialize();
    controls.initialize();
    shlokaGrid.initialize();
    searchBar.initialize();
    playlistsBar.initialize();
    audioPlayer.initialize();
    quizControls.initialize();
    memoryControls.initialize();

    // Setup global event listeners
    this.setupGlobalEvents();

    this._initialized = true;

    // Emit UI ready event
    EventBus.emit(EVENTS.UI_READY);

    console.log('✅ UI Manager initialized');
  }

  setupGlobalEvents() {
    // Toast events
    EventBus.on(EVENTS.TOAST_SHOW, (data) => {
      toast.show(data.message, data.type, data.duration);
    });

    // Modal events
    EventBus.on(EVENTS.MODAL_SHOW, (data) => {
      if (data.type === 'confirm') {
        modal.showConfirm(data.message, data.onConfirm, data.onCancel, data.options);
      } else if (data.type === 'input') {
        modal.showInput(data.title, data.onSubmit, data.options);
      } else {
        modal.show(data.message, data.options);
      }
    });

    // Network status
    window.addEventListener('online', () => {
      const networkStatus = document.getElementById('networkStatus');
      if (networkStatus) {
        networkStatus.classList.add('hidden');
      }
    });

    window.addEventListener('offline', () => {
      const networkStatus = document.getElementById('networkStatus');
      if (networkStatus) {
        networkStatus.classList.remove('hidden');
      }
      toast.warning('You are offline. Playback may be affected.');
    });

    // Visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Refresh network status when returning to app
        const networkStatus = document.getElementById('networkStatus');
        if (networkStatus) {
          if (navigator.onLine) {
            networkStatus.classList.add('hidden');
          } else {
            networkStatus.classList.remove('hidden');
          }
        }
      }
    });
  }

  isInitialized() {
    return this._initialized; // ✅ FIXED: Return the renamed property
  }
}

// Export singleton
export const uiManager = new UIManager();
