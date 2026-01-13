// timer-manager.js - Centralized timer management
import { TIMING } from '../core/constants.js';
import { EventBus } from '../core/events.js';

class TimerManager {
  constructor() {
    this._timers = new Map();
    this._intervals = new Map();
    this._nextId = 1;
  }
  
  // Start a countdown timer
  startCountdown(duration, callbacks = {}) {
    const {
      onTick = null,
      onComplete = null,
      interval = TIMING.MS_PER_SECOND
    } = callbacks;
    
    // Generate unique ID
    const id = `countdown_${this._nextId++}`;
    
    let remaining = duration;
    
    // Initial tick
    if (onTick) onTick(remaining, duration);
    
    // Start interval
    const intervalId = setInterval(() => {
      remaining--;
      
      if (onTick) onTick(remaining, duration);
      
      if (remaining <= 0) {
        this.stopTimer(id);
        if (onComplete) onComplete();
      }
    }, interval);
    
    // Store interval reference
    this._intervals.set(id, {
      intervalId,
      type: 'countdown',
      startTime: Date.now(),
      duration,
      remaining
    });
    
    console.log(`Timer started: ${id} (${duration}s)`);
    
    return id;
  }
  
  // Start a delay timer (one-shot)
  startDelay(delay, callback) {
    const id = `delay_${this._nextId++}`;
    
    const timeoutId = setTimeout(() => {
      this._timers.delete(id);
      if (callback) callback();
    }, delay);
    
    this._timers.set(id, {
      timeoutId,
      type: 'delay',
      startTime: Date.now(),
      delay
    });
    
    console.log(`Delay timer started: ${id} (${delay}ms)`);
    
    return id;
  }
  
  // Start a retry timer with exponential backoff
  startRetryTimer(attempt, baseDelay, callback) {
    const delay = baseDelay * Math.pow(2, attempt);
    const id = `retry_${this._nextId++}`;
    
    const timeoutId = setTimeout(() => {
      this._timers.delete(id);
      if (callback) callback(attempt);
    }, delay);
    
    this._timers.set(id, {
      timeoutId,
      type: 'retry',
      attempt,
      delay,
      startTime: Date.now()
    });
    
    console.log(`Retry timer started: ${id} attempt ${attempt} (${delay}ms)`);
    
    return id;
  }
  
  // Start a periodic interval
  startInterval(intervalDelay, callback) {
    const id = `interval_${this._nextId++}`;
    
    const intervalId = setInterval(() => {
      if (callback) callback();
    }, intervalDelay);
    
    this._intervals.set(id, {
      intervalId,
      type: 'interval',
      startTime: Date.now(),
      interval: intervalDelay
    });
    
    console.log(`Interval started: ${id} (${intervalDelay}ms)`);
    
    return id;
  }
  
  // Stop specific timer
  stopTimer(id) {
    // Check timeouts
    if (this._timers.has(id)) {
      const timer = this._timers.get(id);
      clearTimeout(timer.timeoutId);
      this._timers.delete(id);
      console.log(`Timer stopped: ${id}`);
      return true;
    }
    
    // Check intervals
    if (this._intervals.has(id)) {
      const interval = this._intervals.get(id);
      clearInterval(interval.intervalId);
      this._intervals.delete(id);
      console.log(`Interval stopped: ${id}`);
      return true;
    }
    
    return false;
  }
  
  // Pause countdown (not implemented for timeouts)
  pauseCountdown(id) {
    if (!this._intervals.has(id)) return false;
    
    const timer = this._intervals.get(id);
    if (timer.type !== 'countdown') return false;
    
    clearInterval(timer.intervalId);
    timer.paused = true;
    timer.pausedAt = Date.now();
    
    console.log(`Countdown paused: ${id}`);
    return true;
  }
  
  // Resume countdown
  resumeCountdown(id, onTick, onComplete) {
    if (!this._intervals.has(id)) return false;
    
    const timer = this._intervals.get(id);
    if (timer.type !== 'countdown' || !timer.paused) return false;
    
    const remaining = timer.remaining;
    
    // Restart interval
    const intervalId = setInterval(() => {
      timer.remaining--;
      
      if (onTick) onTick(timer.remaining, timer.duration);
      
      if (timer.remaining <= 0) {
        this.stopTimer(id);
        if (onComplete) onComplete();
      }
    }, TIMING.MS_PER_SECOND);
    
    timer.intervalId = intervalId;
    timer.paused = false;
    delete timer.pausedAt;
    
    console.log(`Countdown resumed: ${id}`);
    return true;
  }
  
  // Stop all timers of a specific type
  stopAllOfType(type) {
    let count = 0;
    
    // Stop matching timeouts
    for (const [id, timer] of this._timers.entries()) {
      if (timer.type === type) {
        clearTimeout(timer.timeoutId);
        this._timers.delete(id);
        count++;
      }
    }
    
    // Stop matching intervals
    for (const [id, interval] of this._intervals.entries()) {
      if (interval.type === type) {
        clearInterval(interval.intervalId);
        this._intervals.delete(id);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`Stopped ${count} timers of type "${type}"`);
    }
    
    return count;
  }
  
  // Clear all timers
  clearAll() {
    // Clear all timeouts
    for (const timer of this._timers.values()) {
      clearTimeout(timer.timeoutId);
    }
    this._timers.clear();
    
    // Clear all intervals
    for (const interval of this._intervals.values()) {
      clearInterval(interval.intervalId);
    }
    this._intervals.clear();
    
    console.log('All timers cleared');
  }
  
  // Get active timer count
  getActiveCount() {
    return this._timers.size + this._intervals.size;
  }
  
  // Get timer info
  getTimerInfo(id) {
    if (this._timers.has(id)) {
      return { ...this._timers.get(id), category: 'timeout' };
    }
    if (this._intervals.has(id)) {
      return { ...this._intervals.get(id), category: 'interval' };
    }
    return null;
  }
  
  // List all active timers (debug)
  listActive() {
    const active = [];
    
    for (const [id, timer] of this._timers.entries()) {
      active.push({ id, ...timer, category: 'timeout' });
    }
    
    for (const [id, interval] of this._intervals.entries()) {
      active.push({ id, ...interval, category: 'interval' });
    }
    
    return active;
  }
}

// Export singleton
export const timerManager = new TimerManager();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  timerManager.clearAll();
});
