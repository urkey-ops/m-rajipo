// events.js - Event bus for decoupled communication
class EventBusClass {
  constructor() {
    this._events = new Map();
  }
  
  // Subscribe to event
  on(event, handler) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(handler);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }
  
  // Subscribe once
  once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    return this.on(event, wrappedHandler);
  }
  
  // Unsubscribe from event
  off(event, handler) {
    const handlers = this._events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._events.delete(event);
      }
    }
  }
  
  // Emit event
  emit(event, data) {
    const handlers = this._events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }
  
  // Clear all handlers for event
  clear(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }
  
  // Get event count
  getEventCount(event) {
    const handlers = this._events.get(event);
    return handlers ? handlers.size : 0;
  }
  
  // Debug: list all events
  listEvents() {
    return Array.from(this._events.keys());
  }
}

// Export singleton
export const EventBus = new EventBusClass();
