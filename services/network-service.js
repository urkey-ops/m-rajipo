// network-service.js - Network status and retry logic
import { EventBus } from '../core/events.js';
import { EVENTS, TIMING } from '../core/constants.js';
import { errorHandler } from '../utils/error-handler.js';

class NetworkService {
  constructor() {
    this._isOnline = navigator.onLine;
    this._listeners = new Set();
    this._retryQueues = new Map();
    
    this._setupListeners();
  }
  
  _setupListeners() {
    window.addEventListener('online', () => {
      this._isOnline = true;
      console.log('Network: Online');
      EventBus.emit(EVENTS.NETWORK_ONLINE);
      this._processRetryQueue();
    });
    
    window.addEventListener('offline', () => {
      this._isOnline = false;
      console.log('Network: Offline');
      EventBus.emit(EVENTS.NETWORK_OFFLINE);
    });
  }
  
  isOnline() {
    return this._isOnline;
  }
  
  // Subscribe to status changes
  onStatusChange(callback) {
    this._listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this._listeners.delete(callback);
    };
  }
  
  // Retry with exponential backoff
  async retryWithBackoff(fn, options = {}) {
    const {
      maxRetries = TIMING.MAX_RETRIES,
      baseDelay = TIMING.RETRY_DELAY_MS,
      onRetry = null
    } = options;
    
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check if online before attempting
        if (!this._isOnline && attempt > 0) {
          throw new Error('Network offline');
        }
        
        const result = await fn(attempt);
        return result;
        
      } catch (error) {
        lastError = error;
        
        // If this was the last attempt, throw
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt + 1, maxRetries, delay);
        }
        
        // Wait before retry
        await this._delay(delay);
      }
    }
    
    // All retries failed
    throw lastError;
  }
  
  // Add to retry queue (for offline scenarios)
  addToRetryQueue(id, fn) {
    this._retryQueues.set(id, fn);
  }
  
  // Remove from retry queue
  removeFromRetryQueue(id) {
    this._retryQueues.delete(id);
  }
  
  // Process retry queue when back online
  async _processRetryQueue() {
    if (this._retryQueues.size === 0) return;
    
    console.log(`Processing ${this._retryQueues.size} queued operations...`);
    
    const promises = [];
    for (const [id, fn] of this._retryQueues.entries()) {
      promises.push(
        fn()
          .then(() => {
            this._retryQueues.delete(id);
            console.log(`Retry queue: ${id} completed`);
          })
          .catch(error => {
            console.error(`Retry queue: ${id} failed:`, error);
          })
      );
    }
    
    await Promise.allSettled(promises);
  }
  
  // Check if URL is reachable
  async checkUrl(url) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  // Prefetch resource
  async prefetch(url) {
    if (!this._isOnline) return false;
    
    try {
      const response = await fetch(url);
      return response.ok;
    } catch (error) {
      console.warn('Prefetch failed:', url, error);
      return false;
    }
  }
  
  // Delay utility
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Get connection info (if available)
  getConnectionInfo() {
    if (!('connection' in navigator)) return null;
    
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }
  
  // Check if connection is slow
  isSlowConnection() {
    const info = this.getConnectionInfo();
    if (!info) return false;
    
    return info.effectiveType === 'slow-2g' || 
           info.effectiveType === '2g' ||
           info.saveData === true;
  }
}

// Export singleton
export const networkService = new NetworkService();
