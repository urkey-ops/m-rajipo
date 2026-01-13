// main.js - Application entry point
import { EventBus } from './core/events.js';
import { state } from './core/state.js';
import { EVENTS } from './core/constants.js';

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

// UI
import { uiManager } from './ui/ui-manager.js';
import { toast } from './ui/components/toast.js';

class Application {
  constructor() {
    this._isInitialized = false;
  }
  
  async initialize() {
    if (this._isInitialized) {
      console.warn('Application already initialized');
      return;
    }
    
    console.log('🚀 Starting Mission Rajipo...');
    
    try {
      // Initialize core services
      this._initializeServices();
      
      // Initialize UI
      uiManager.initialize();
      
      // Wait for UI to be ready
      await this._waitForUIReady();
      
      // Setup application event handlers
      this._setupEventHandlers();
      
      // Restore last session (if available)
      this._restoreSession();
      
      // Initialize default mode (regular)
      regularMode.initialize();
      
      this._isInitialized = true;
      
      console.log('✅ Application ready!');
      
      // Auto-scroll to top after initialization
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }, 300);
      
    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      this._showFatalError(error);
    }
  }
  
  _initializeServices() {
    console.log('📦 Initializing services...');
    
    // Initialize audio service
    const audioElement = document.getElementById('audioPlayer');
    if (!audioElement) {
      throw new Error('Audio element not found');
    }
    audioService.initialize(audioElement);
    
    // Check storage availability
    if (!storageService.isAvailable()) {
      console.warn('⚠️ Storage not available - playlists and history disabled');
      toast.info('Storage unavailable - playlists and history won\'t be saved.');
    }
    
    // Network service is automatically initialized
    console.log(`📡 Network status: ${networkService.isOnline() ? 'Online' : 'Offline'}`);
    
    console.log('✅ Services initialized');
  }
  
  _waitForUIReady() {
    return new Promise((resolve) => {
      if (uiManager.isInitialized()) {
        resolve();
      } else {
        EventBus.once(EVENTS.UI_READY, () => {
          resolve();
        });
      }
    });
  }
  
  _setupEventHandlers() {
    console.log('🔗 Setting up event handlers...');
    
    // FAB play button handler
    window.handlePlaySelected = () => {
      this._handlePlaySelected();
    };
    
    // FAB quiz next handler
    window.handleQuizNext = () => {
      this._handleQuizNext();
    };
    
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
    
    // Page unload cleanup
    window.addEventListener('beforeunload', () => {
      this._cleanup();
    });
    
    console.log('✅ Event handlers setup complete');
  }
  
  async _handlePlaySelected() {
    try {
      // Validate mode
      const validation = regularMode.validate();
      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }
      
      // Get playback settings
      const settings = regularMode.getSettings();
      
      // Get selected tracks
      const selectedTracks = selectionManager.getSelection();
      
      if (selectedTracks.length === 0) {
        toast.info('Please select at least one shloka to play.');
        return;
      }
      
      // Get UI settings
      const repeatCount = parseInt(document.getElementById('repeatCount')?.value) || 1;
      const shuffle = document.getElementById('shuffle')?.checked || false;
      const repeatPlaylist = document.getElementById('repeatPlaylist')?.checked || false;
      
      // Start playback
      await playbackManager.startPlayback(selectedTracks, {
        startIndex: 0,
        repeatEach: repeatCount,
        repeatPlaylist: repeatPlaylist,
        shuffle: shuffle,
        speed: settings.speed
      });
      
    } catch (error) {
      console.error('Failed to start playback:', error);
      toast.error(error.message || 'Failed to start playback');
    }
  }
  
  async _handleQuizNext() {
    try {
      // Check if quiz is active
      if (!quizMode.isActive()) {
        // Start new quiz
        const validation = quizMode.validate();
        if (!validation.valid) {
          toast.error(validation.error);
          return;
        }
        
        await quizMode.startQuiz();
      } else {
        // Next question
        await quizMode.nextQuestion();
      }
      
    } catch (error) {
      console.error('Quiz error:', error);
      toast.error(error.message || 'Quiz error occurred');
    }
  }
  
  _restoreSession() {
    if (!storageService.isAvailable()) return;
    
    console.log('🔄 Restoring last session...');
    
    try {
      // Restore last selection
      const lastSelection = storageService.loadLastSelection();
      if (lastSelection && lastSelection.length > 0) {
        // Import selection
        selectionManager.selectMultiple(lastSelection);
        console.log(`✅ Restored ${lastSelection.length} selected tracks`);
      }
      
    } catch (error) {
      console.warn('Failed to restore session:', error);
    }
  }
  
  _cleanup() {
    console.log('🧹 Cleaning up...');
    
    // Clear all timers
    timerManager.clearAll();
    
    // Stop playback
    if (playbackManager.isPlaying()) {
      playbackManager.stop();
    }
    
    // Save current selection
    if (storageService.isAvailable()) {
      const selection = selectionManager.getSelection();
      if (selection.length > 0) {
        storageService.saveLastSelection(selection);
      }
    }
    
    console.log('✅ Cleanup complete');
  }
  
  _showFatalError(error) {
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
      <h2 style="color: var(--destructive, #ff3b30); margin-bottom: 16px;">
        ⚠️ Initialization Failed
      </h2>
      <p style="margin-bottom: 16px; color: var(--text-primary, #000);">
        ${error.message || 'An unexpected error occurred'}
      </p>
      <button onclick="window.location.reload()" style="
        padding: 12px 24px;
        background: var(--primary, #007aff);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
      ">
        Reload App
      </button>
    `;
    
    container.appendChild(errorDiv);
  }
}

// Create application instance
const app = new Application();

// Initialize when DOM is ready
function initApp() {
  app.initialize();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Export for debugging
window.__app__ = app;
window.__state__ = state;
window.__eventBus__ = EventBus;
