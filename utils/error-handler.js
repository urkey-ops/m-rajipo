// error-handler.js - CLEANED UP VERSION
import { EventBus } from '../core/events.js';
import { EVENTS, TOAST_TYPES } from '../core/constants.js';

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
  }

  // Handle error — logs, shows toast, attempts recovery
  // ✅ FIXED: No longer emits PLAYBACK_ERROR. Only audio-service.js emits that
  // to avoid triggering unintended playback skip logic on non-audio errors.
  handle(error, context = {}) {
    this.log(error, context);
    this.showUserError(error, context);
    this.recover(error, context);
  }

  log(error, context) {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };

    console.error('Error:', errorEntry);

    this.errors.push(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  showUserError(error, context) {
    const message = this.getUserMessage(error, context);

    EventBus.emit(EVENTS.TOAST_SHOW, {
      message,
      type: TOAST_TYPES.ERROR
    });
  }

  getUserMessage(error, context) {
    if (context.type === 'audio') {
      switch (error.code) {
        case 1: return 'Audio loading was stopped.';
        case 2: return 'Network error. Please check your connection.';
        case 3: return 'Audio file is corrupted.';
        case 4: return 'Audio format not supported or file not found.';
        default: return 'An error occurred while playing audio.';
      }
    }

    if (context.type === 'network') {
      return 'Connection issue. Please check your internet.';
    }

    if (context.type === 'storage') {
      if (error.name === 'QuotaExceededError') {
        return 'Storage full. Please delete some playlists.';
      }
      return 'Failed to save data. Please try again.';
    }

    if (context.type === 'validation') {
      return error.message || 'Invalid input.';
    }

    return error.message || 'An unexpected error occurred.';
  }

  recover(error, context) {
    // ✅ FIXED: Use EVENTS constant instead of raw string
    if (context.type === 'audio' && context.canSkip) {
      console.log('Attempting to skip to next track...');
      EventBus.emit(EVENTS.PLAYBACK_SKIP);
    }

    if (context.type === 'network' && context.canRetry) {
      console.log('Will retry when connection is restored...');
    }
  }

  getErrors() {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorHandler = new ErrorHandler();

window.addEventListener('error', (event) => {
  errorHandler.handle(event.error || new Error(event.message), {
    type: 'global',
    filename: event.filename,
    lineno: event.lineno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
    type: 'promise'
  });
});
