// network-service.js - Network status and retry logic
import { EventBus } from '../core/events.js';
import { EVENTS, TIMING } from '../core/constants.js';
import { errorHandler } from '../utils/error-handler.js';

class NetworkService {
  constructor() {
    this._isOnline = navigator.onLine;
    this._listeners = new Set();
    this._retryQueues = new Map();
    this._retryAttempts = new Map();
    this._maxRetryAttempts = 3;

    this._setupListeners();
  }

  _notifyListeners(payload) {
    for (const callback of this._listeners) {
      try {
        callback(payload);
      } catch (error) {
        console.error('Network status listener failed:', error);
      }
    }
  }

  _setupListeners() {
    window.addEventListener('online', () => {
      this._isOnline = true;
      console.log('Network: Online');
      EventBus.emit(EVENTS.NETWORK_ONLINE);
      this._notifyListeners({ isOnline: true });
      this._processRetryQueue().catch(error => {
        console.error('Failed to process retry queue:', error);
      });
    });

    window.addEventListener('offline', () => {
      this._isOnline = false;
      console.log('Network: Offline');
      EventBus.emit(EVENTS.NETWORK_OFFLINE);
      this._notifyListeners({ isOnline: false });
    });
  }

  onStatusChange(callback) {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  async _processRetryQueue() {
    if (this._retryQueues.size === 0) return;

    console.log(`Processing ${this._retryQueues.size} queued operations...`);

    const promises = [];
    for (const [id, fn] of this._retryQueues.entries()) {
      const attempts = this._retryAttempts.get(id) || 0;

      if (attempts >= this._maxRetryAttempts) {
        console.warn(`Retry queue: ${id} exceeded max attempts (${this._maxRetryAttempts}), removing`);
        this._retryQueues.delete(id);
        this._retryAttempts.delete(id);

        EventBus.emit(EVENTS.TOAST_SHOW, {
          message: `Operation "${id}" failed after ${this._maxRetryAttempts} attempts.`,
          type: 'error'
        });

        continue;
      }

      promises.push(
        Promise.resolve()
          .then(() => fn())
          .then(() => {
            this._retryQueues.delete(id);
            this._retryAttempts.delete(id);
            console.log(`Retry queue: ${id} completed`);
          })
          .catch(error => {
            console.error(`Retry queue: ${id} failed:`, error);

            const newAttempts = attempts + 1;
            this._retryAttempts.set(id, newAttempts);

            if (newAttempts >= this._maxRetryAttempts) {
              this._retryQueues.delete(id);
              this._retryAttempts.delete(id);

              EventBus.emit(EVENTS.TOAST_SHOW, {
                message: `Operation "${id}" failed permanently after ${newAttempts} attempts.`,
                type: 'error'
              });

              if (errorHandler?.handle) {
                errorHandler.handle(error);
              }

              console.error(`Retry queue: ${id} failed permanently after ${newAttempts} attempts, removed`);
            }
          })
      );
    }

    await Promise.allSettled(promises);
  }
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
