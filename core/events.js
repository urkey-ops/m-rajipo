// events.js - Event bus for decoupled communication (UNCHANGED)
class EventBusClass {
  constructor() {
    this._events = new Map();
  }
  on(event, handler) {
    if (!this._events.has(event)) {
      this._events.set(event, new Set());
    }
    this._events.get(event).add(handler);
    return () => this.off(event, handler);
  }
  once(event, handler) {
    const wrappedHandler = (...args) => {
      handler(...args);
      this.off(event, wrappedHandler);
    };
    return this.on(event, wrappedHandler);
  }
  off(event, handler) {
    const handlers = this._events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this._events.delete(event);
      }
    }
  }
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
  clear(event) {
    if (event) {
      this._events.delete(event);
    } else {
      this._events.clear();
    }
  }
  getEventCount(event) {
    const handlers = this._events.get(event);
    return handlers ? handlers.size : 0;
  }
  listEvents() {
    return Array.from(this._events.keys());
  }
}
export const EventBus = new EventBusClass();
