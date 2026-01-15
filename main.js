// main.js - FIXED VERSION (Add $ import)

import { EventBus } from './core/events.js';
import { state } from './core/state.js';
import { EVENTS } from './core/constants.js';
import { $ } from './utils/dom-utils.js'; // ✅ FIX: Add this import

// Services
import { audioService } from './services/audio-service.js';
import { storageService } from './services/storage-service.js';
import { networkService } from './services/network-service.js';

// Managers
import { playbackManager } from './managers/playback-manager.js';
import { selectionManager } from './managers/selection-manager.js';
import { timerManager } from './managers/timer-manager.js';

// Modes
import { regularMode } from './modes/regular-mode.js';
import { quizMode } from './modes/quiz-mode.js';
import { memoryMode } from './modes/memory-mode.js';

// UI
import { uiManager } from './ui/ui-manager.js';
import { toast } from './ui/components/toast.js';

class Application {
  constructor() {
    this._initialized = false; // ✅ FIX: Use underscore prefix
  }

  async initialize() {
    if (this._initialized) {
      console.warn('Application already initialized');
      return;
    }

    console.log('🚀 Starting Mission Rajipo...');

    try {
      this.initializeServices();
      uiManager.initialize();
      await this.waitForUIReady();
      this.setupEventHandlers();
      this.restoreSession();
      regularMode.initialize();

      this._initialized = true;
      console.log('✅ Application ready!');

      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }, 300);

    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showFatalError(error);
    }
  }

  initializeServices() {
    console.log('🔧 Initializing services...');

    const audioElement = document.getElementById('audioPlayer');
    if (!audioElement) {
      throw new Error('Audio element not found');
    }
    audioService.initialize(audioElement);

    if (!storageService.isAvailable()) {
      console.warn('Storage not available - playlists and history disabled');
      toast.info('Storage unavailable - playlists and history won\'t be saved.');
    }

    console.log('Network status:', networkService.isOnline() ? 'Online' : 'Offline');
    console.log('✅ Services initialized');
  }

  waitForUIReady() {
    return new Promise((resolve) => {
      if (uiManager.isInitialized()) {
        resolve();
      } else {
        EventBus.once(EVENTS.UI_READY, resolve);
      }
    });
  }

  setupEventHandlers() {
    console.log('🔌 Setting up event handlers...');

    EventBus.on('fab:play-clicked', () => {
      this.handlePlaySelected();
    });

    EventBus.on('fab:quiz-next-clicked', () => {
      this.handleQuizNext();
    });

    EventBus.on('fab:memory-clicked', () => {
      this.handleMemoryStart();
    });

    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });

    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    console.log('✅ Event handlers setup complete');
  }

// main.js - handlePlaySelected - Lines 148-180 FIXED

async handlePlaySelected() {
  try {
    const currentMode = state.get('currentMode');
    
    // ✅ FIX: Ensure we're in regular mode
    if (currentMode !== MODES.REGULAR) {
      toast.warning('Switch to Regular mode to use this feature');
      return;
    }

    const validation = regularMode.validate();
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    const selectedTracks = selectionManager.getSelection();
    
    if (selectedTracks.length === 0) {
      toast.info('Please select at least one shloka to play.');
      return;
    }

    // ✅ FIX: Get values safely
    const repeatCountEl = $('#repeatCount');
    const shuffleEl = $('#shuffle');
    const repeatPlaylistEl = $('#repeatPlaylist');

    const repeatCount = repeatCountEl ? parseInt(repeatCountEl.value) || 1 : 1;
    const shuffle = shuffleEl ? shuffleEl.checked : false;
    const repeatPlaylist = repeatPlaylistEl ? repeatPlaylistEl.checked : false;
    const speed = regularMode.getSettings().speed || 1.0;

    console.log('Starting playback with settings:', {
      tracks: selectedTracks,
      repeatCount,
      shuffle,
      repeatPlaylist,
      speed
    });

    await playbackManager.startPlayback(selectedTracks, {
      startIndex: 0,
      repeatEach: repeatCount,
      repeatPlaylist: repeatPlaylist,
      shuffle: shuffle,
      speed: speed
    });

    toast.success(`Playing ${selectedTracks.length} shloka${selectedTracks.length > 1 ? 's' : ''}`);

  } catch (error) {
    console.error('Failed to start playback:', error);
    toast.error(error.message || 'Failed to start playback');
  }
}


  async handleQuizNext() {
    try {
      const quizState = quizMode.getState();

      if (!quizMode.isActive()) {
        const validation = quizMode.validate();
        if (!validation.valid) {
          toast.error(validation.error);
          return;
        }
        await quizMode.startQuiz();
        return;
      }

      if (quizState.playlist.length === 0) {
        const validation = quizMode.validate();
        if (!validation.valid) {
          toast.error(validation.error);
          return;
        }
        await quizMode.startQuiz();
      } else {
        await quizMode.nextQuestion();
      }

    } catch (error) {
      console.error('Quiz error:', error);
      toast.error(error.message || 'Quiz error occurred');
    }
  }

  async handleMemoryStart() {
    try {
      const validation = memoryMode.validate();
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      const memState = memoryMode.getState();
      if (memState.isLooping) {
        toast.info('Memory loop already running');
        return;
      }

      await memoryMode.startLoop();
      toast.success('Memory loop started!');

    } catch (error) {
      console.error('Memory mode error:', error);
      toast.error(error.message || 'Failed to start memory loop');
    }
  }

  restoreSession() {
    if (!storageService.isAvailable()) return;

    console.log('🔄 Restoring last session...');

    try {
      const lastSelection = storageService.loadLastSelection();
      if (lastSelection && lastSelection.length > 0) {
        selectionManager.selectMultiple(lastSelection);
        console.log(`Restored ${lastSelection.length} selected tracks`);
      }
    } catch (error) {
      console.warn('Failed to restore session:', error);
    }
  }

  cleanup() {
    console.log('🧹 Cleaning up...');

    timerManager.clearAll();

    if (playbackManager.isPlaying()) {
      playbackManager.stop();
    }

    if (storageService.isAvailable()) {
      const selection = selectionManager.getSelection();
      if (selection.length > 0) {
        storageService.saveLastSelection(selection);
      }
    }

    console.log('✅ Cleanup complete');
  }

  showFatalError(error) {
    const container = document.body;
    if (!container) return;

    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--bg-elevated, #fff);
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      max-width: 400px;
      text-align: center;
      z-index: 10000;
    `;

    errorDiv.innerHTML = `
      <h2 style="color: var(--destructive, #ff3b30); margin-bottom: 16px;">Initialization Failed</h2>
      <p style="margin-bottom: 16px; color: var(--text-primary, #000);">${error.message || 'An unexpected error occurred'}</p>
      <button onclick="window.location.reload()" style="
        padding: 12px 24px;
        background: var(--primary, #007aff);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      ">Reload App</button>
    `;

    container.appendChild(errorDiv);
  }
}

const app = new Application();

function initApp() {
  app.initialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

window.app = app;
window.state = state;
window.eventBus = EventBus;
