// error-handler.js - Centralized error handling
import { EventBus } from '../core/events.js';
import { EVENTS, TOAST_TYPES } from '../core/constants.js';

class ErrorHandler {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
  }
  
  // Handle error
  handle(error, context = {}) {
    // Log error
    this.log(error, context);
    
    // Show user-friendly error
    this.showUserError(error, context);
    
    // Emit error event
    EventBus.emit(EVENTS.PLAYBACK_ERROR, { error, context });
    
    // Recovery strategy
    this.recover(error, context);
  }
  
  // Log error
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
    
    // Store error
    this.errors.push(errorEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }
  
  // Show user-friendly error
  showUserError(error, context) {
    let message = this.getUserMessage(error, context);
    
    EventBus.emit(EVENTS.TOAST_SHOW, {
      message,
      type: TOAST_TYPES.ERROR
    });
  }
  
  // Get user-friendly message
  getUserMessage(error, context) {
    // Audio errors
    if (context.type === 'audio') {
      switch (error.code) {
        case 1: // MEDIA_ERR_ABORTED
          return 'Audio loading was stopped.';
        case 2: // MEDIA_ERR_NETWORK
          return 'Network error. Please check your connection.';
        case 3: // MEDIA_ERR_DECODE
          return 'Audio file is corrupted.';
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          return 'Audio format not supported or file not found.';
        default:
          return 'An error occurred while playing audio.';
      }
    }
    
    // Network errors
    if (context.type === 'network') {
      return 'Connection issue. Please check your internet.';
    }
    
    // Storage errors
    if (context.type === 'storage') {
      if (error.name === 'QuotaExceededError') {
        return 'Storage full. Please delete some playlists.';
      }
      return 'Failed to save data. Please try again.';
    }
    
    // Validation errors
    if (context.type === 'validation') {
      return error.message || 'Invalid input.';
    }
    
    // Generic error
    return error.message || 'An unexpected error occurred.';
  }
  
  // Recovery strategy
  recover(error, context) {
    // Audio recovery - skip to next track if possible
    if (context.type === 'audio' && context.canSkip) {
      console.log('Attempting to skip to next track...');
      EventBus.emit('playback:skip');
    }
    
    // Network recovery - queue for retry when online
    if (context.type === 'network' && context.canRetry) {
      console.log('Will retry when connection is restored...');
    }
  }
  
  // Get error log
  getErrors() {
    return [...this.errors];
  }
  
  // Clear error log
  clearErrors() {
    this.errors = [];
  }
}

// Export singleton
export const errorHandler = new ErrorHandler();

// Global error handler
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, { 
    type: 'global', 
    filename: event.filename, 
    lineno: event.lineno 
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(event.reason, { type: 'promise' });
});
