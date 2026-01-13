// toast.js - Toast notification component
import { createElement, $, addClass } from '../../utils/dom-utils.js';
import { TOAST_TYPES, TIMING } from '../../core/constants.js';

class Toast {
  constructor() {
    this._container = null;
    this._toasts = new Map();
    this._nextId = 1;
  }
  
  initialize() {
    this._container = $('#toastContainer');
    if (!this._container) {
      console.error('Toast container not found');
    }
  }
  
  // Show toast
  show(message, type = TOAST_TYPES.INFO, duration = null) {
    if (!this._container) return null;
    
    // Determine duration based on type
    if (duration === null) {
      duration = type === TOAST_TYPES.ERROR 
        ? TIMING.ERROR_TOAST_DURATION 
        : TIMING.TOAST_DURATION;
    }
    
    const id = this._nextId++;
    
    const toast = createElement('div', {
      className: `toast ${type}`,
      dataset: { toastId: id.toString() }
    }, [message]);
    
    this._container.appendChild(toast);
    this._toasts.set(id, toast);
    
    // Auto-dismiss
    setTimeout(() => {
      this.hide(id);
    }, duration);
    
    return id;
  }
  
  // Show info toast
  info(message, duration = null) {
    return this.show(message, TOAST_TYPES.INFO, duration);
  }
  
  // Show success toast
  success(message, duration = null) {
    return this.show(message, TOAST_TYPES.SUCCESS, duration);
  }
  
  // Show error toast
  error(message, duration = null) {
    return this.show(message, TOAST_TYPES.ERROR, duration);
  }
  
  // Show warning toast
  warning(message, duration = null) {
    return this.show(message, TOAST_TYPES.WARNING, duration);
  }
  
  // Hide specific toast
  hide(id) {
    const toast = this._toasts.get(id);
    if (toast && toast.parentNode) {
      toast.remove();
      this._toasts.delete(id);
    }
  }
  
  // Hide all toasts
  hideAll() {
    for (const toast of this._toasts.values()) {
      if (toast.parentNode) {
        toast.remove();
      }
    }
    this._toasts.clear();
  }
  
  // Get active toast count
  getCount() {
    return this._toasts.size;
  }
}

// Export singleton
export const toast = new Toast();
