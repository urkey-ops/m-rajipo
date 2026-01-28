// timer-manager.js - ENHANCED VERSION with proper auto-cleanup

import { TIMING } from '../core/constants.js';
import { EventBus } from '../core/events.js';

class TimerManager {
  constructor() {
    this._timers = new Map();
    this._intervals = new Map();
    this._nextId = 1;
    this._maxTimers = 50;
  }
  
  startCountdown(duration, callbacks = {}) {
    const {
      onTick = null,
      onComplete = null,
      interval = TIMING.MS_PER_SECOND
    } = callbacks;
    
    this._checkTimerLimit();
    
    const id = `countdown_${this._nextId++}`;
    let remaining = duration;
    
    if (onTick) onTick(remaining, duration);
    
    const intervalId = setInterval(() => {
      remaining--;
      
      // ✅ FIXED: Update the stored timer object with current remaining time
      // This is critical for pause/resume functionality to work correctly
      const timerObj = this._intervals.get(id);
      if (timerObj) {
        timerObj.remaining = remaining;
      }
      
      if (onTick) onTick(remaining, duration);
      
      if (remaining <= 0) {
        this.stopTimer(id);
        if (onComplete) onComplete();
      }
    }, interval);
    
    this._intervals.set(id, {
      intervalId,
      type: 'countdown',
      startTime: Date.now(),
      duration,
      remaining,
      autoCleanup: true
    });
    
    console.log(`Timer started: ${id} (${duration}s)`);
    return id;
  }
  
  startDelay(delay, callback) {
    this._checkTimerLimit();
    
    const id = `delay_${this._nextId++}`;
    
    const timeoutId = setTimeout(() => {
      this._timers.delete(id);
      if (callback) callback();
    }, delay);
    
    this._timers.set(id, {
      timeoutId,
      type: 'delay',
      startTime: Date.now(),
      delay,
      autoCleanup: true
    });
    
    console.log(`Delay timer started: ${id} (${delay}ms)`);
    return id;
  }
  
  startRetryTimer(attempt, baseDelay, callback) {
    this._checkTimerLimit();
    
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
      startTime: Date.now(),
      autoCleanup: true
    });
    
    console.log(`Retry timer started: ${id} attempt ${attempt} (${delay}ms)`);
    return id;
  }
  
  startInterval(intervalDelay, callback) {
    this._checkTimerLimit();
    
    const id = `interval_${this._nextId++}`;
    
    const intervalId = setInterval(() => {
      if (callback) callback();
    }, intervalDelay);
    
    this._intervals.set(id, {
      intervalId,
      type: 'interval',
      startTime: Date.now(),
      interval: intervalDelay,
      autoCleanup: false
    });
    
    console.log(`Interval started: ${id} (${intervalDelay}ms)`);
    return id;
  }
  
  stopTimer(id) {
    if (this._timers.has(id)) {
      const timer = this._timers.get(id);
      clearTimeout(timer.timeoutId);
      this._timers.delete(id);
      console.log(`Timer stopped: ${id}`);
      return true;
    }
    
    if (this._intervals.has(id)) {
      const interval = this._intervals.get(id);
      clearInterval(interval.intervalId);
      this._intervals.delete(id);
      console.log(`Interval stopped: ${id}`);
      return true;
    }
    
    return false;
  }
  
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
  
  resumeCountdown(id, onTick, onComplete) {
    if (!this._intervals.has(id)) return false;
    
    const timer = this._intervals.get(id);
    if (timer.type !== 'countdown' || !timer.paused) return false;
    
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
  
  stopAllOfType(type) {
    let count = 0;
    
    for (const [id, timer] of this._timers.entries()) {
      if (timer.type === type) {
        clearTimeout(timer.timeoutId);
        this._timers.delete(id);
        count++;
      }
    }
    
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
  
  clearAll() {
    for (const timer of this._timers.values()) {
      clearTimeout(timer.timeoutId);
    }
    this._timers.clear();
    
    for (const interval of this._intervals.values()) {
      clearInterval(interval.intervalId);
    }
    this._intervals.clear();
    
    console.log('All timers cleared');
  }
  
  _checkTimerLimit() {
    const total = this._timers.size + this._intervals.size;
    
    if (total >= this._maxTimers) {
      console.warn(`Timer limit reached (${total}/${this._maxTimers}), cleaning up old timers`);
      this._cleanupOldTimers();
    }
  }
  
  // ✅ FIXED: Don't cleanup timers that are still in the active maps
  _cleanupOldTimers() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    // Only cleanup completed timers that somehow weren't removed
    for (const [id, timer] of this._timers.entries()) {
      if (timer.autoCleanup && (now - timer.startTime) > maxAge) {
        // Verify the timeout hasn't already fired by checking if it still exists
        try {
          clearTimeout(timer.timeoutId);
          this._timers.delete(id);
          console.log(`Auto-cleaned stale timer: ${id}`);
        } catch (e) {
          // Timer already cleared, just remove from map
          this._timers.delete(id);
        }
      }
    }
    
    // ✅ CRITICAL FIX: Don't auto-cleanup intervals that are still active
    // Only cleanup intervals that are marked as completed or stale
    for (const [id, interval] of this._intervals.entries()) {
      // Only cleanup if autoCleanup is true AND it's been running for too long
      // This prevents cleaning up long-running legitimate timers like 60s+ gaps
      if (interval.autoCleanup && interval.paused && (now - (interval.pausedAt || interval.startTime)) > maxAge) {
        clearInterval(interval.intervalId);
        this._intervals.delete(id);
        console.log(`Auto-cleaned paused interval: ${id}`);
      }
    }
  }
  
  getActiveCount() {
    return this._timers.size + this._intervals.size;
  }
  
  getTimerInfo(id) {
    if (this._timers.has(id)) {
      return { ...this._timers.get(id), category: 'timeout' };
    }
    if (this._intervals.has(id)) {
      return { ...this._intervals.get(id), category: 'interval' };
    }
    return null;
  }
  
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

export const timerManager = new TimerManager();

window.addEventListener('beforeunload', () => {
  timerManager.clearAll();
});
