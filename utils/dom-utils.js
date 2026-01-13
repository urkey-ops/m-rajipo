// dom-utils.js - DOM manipulation utilities

// Query selector shortcuts
export const $ = (selector, context = document) => context.querySelector(selector);
export const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

// Create element with attributes and children
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  
  // Set attributes
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on')) {
      const event = key.substring(2).toLowerCase();
      element.addEventListener(event, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Append children
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  
  return element;
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Debounce function calls
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function calls
export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Class manipulation
export function addClass(element, ...classes) {
  if (element) element.classList.add(...classes);
}

export function removeClass(element, ...classes) {
  if (element) element.classList.remove(...classes);
}

export function toggleClass(element, className, force) {
  if (element) return element.classList.toggle(className, force);
}

export function hasClass(element, className) {
  return element ? element.classList.contains(className) : false;
}

// Show/hide elements
export function show(element) {
  if (element) element.style.display = '';
}

export function hide(element) {
  if (element) element.style.display = 'none';
}

export function toggle(element) {
  if (element) {
    element.style.display = element.style.display === 'none' ? '' : 'none';
  }
}

// Check if element is visible
export function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

// Get/set attributes
export function setAttrs(element, attrs) {
  if (!element) return;
  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

export function getAttr(element, attr) {
  return element ? element.getAttribute(attr) : null;
}

// Trigger custom event
export function trigger(element, eventName, detail = {}) {
  if (!element) return;
  const event = new CustomEvent(eventName, { detail, bubbles: true, cancelable: true });
  element.dispatchEvent(event);
}

// Wait for DOM ready
export function ready(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

// Smooth scroll to element
export function scrollTo(element, options = {}) {
  if (!element) return;
  element.scrollIntoView({ behavior: 'smooth', block: 'start', ...options });
}

// Get element offset
export function getOffset(element) {
  if (!element) return { top: 0, left: 0 };
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset
  };
}
