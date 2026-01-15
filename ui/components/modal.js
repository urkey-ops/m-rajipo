// modal.js - Modal dialog component (COMPLETE FIX)

import { createElement, $, addClass, removeClass } from '../../utils/dom-utils.js';

class Modal {
  constructor() {
    this._container = null;
    this._currentModal = null;
    this._escapeHandler = null;
  }

  initialize() {
    this._container = $('#modalContainer');
    
    if (!this._container) {
      console.error('❌ Modal container (#modalContainer) not found in DOM!');
      console.error('Available IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      // Don't throw - just warn
    } else {
      console.log('✅ Modal initialized with container:', this._container);
    }
  }

  // Show simple alert modal
  show(message, options = {}) {
    this.hide();
    
    if (!this._ensureContainer()) {
      console.error('Cannot show modal - container not available');
      alert(message); // Fallback to native alert
      return;
    }
    
    const {
      title = null,
      onClose = null
    } = options;
    
    const modal = this._createModalStructure();
    const content = modal.querySelector('.modal-content');
    
    if (title) {
      const titleEl = createElement('h3', {
        style: { marginBottom: '16px', fontSize: '24px', fontWeight: '600' }
      }, [title]);
      content.appendChild(titleEl);
    }
    
    const messageEl = createElement('p', {
      style: { marginBottom: '24px', lineHeight: '1.5', color: '#666' }
    }, [message]);
    content.appendChild(messageEl);
    
    const okBtn = createElement('button', {
      className: 'btn-primary',
      style: { 
        width: '100%',
        padding: '12px',
        background: '#007AFF',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '17px',
        fontWeight: '600',
        cursor: 'pointer'
      }
    }, ['OK']);
    
    okBtn.addEventListener('click', () => {
      this.hide();
      if (onClose) onClose();
    });
    
    content.appendChild(okBtn);
    this._showModal(modal);
  }

  // Show confirmation modal
  showConfirm(message, onConfirm, onCancel = null, options = {}) {
    this.hide();
    
    if (!this._ensureContainer()) {
      console.error('Cannot show confirm modal - container not available');
      if (confirm(message) && onConfirm) onConfirm();
      else if (onCancel) onCancel();
      return;
    }
    
    const {
      title = null,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      confirmStyle = {}
    } = options;
    
    const modal = this._createModalStructure();
    const content = modal.querySelector('.modal-content');
    
    if (title) {
      const titleEl = createElement('h3', {
        style: { marginBottom: '16px', fontSize: '24px', fontWeight: '600' }
      }, [title]);
      content.appendChild(titleEl);
    }
    
    const messageEl = createElement('p', {
      style: { marginBottom: '24px', lineHeight: '1.5', color: '#666' }
    }, [message]);
    content.appendChild(messageEl);
    
    const btnContainer = createElement('div', {
      style: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }
    });
    
    const cancelBtn = createElement('button', {
      style: {
        padding: '10px 20px',
        background: '#f0f0f0',
        color: '#333',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer'
      }
    }, [cancelText]);
    
    cancelBtn.addEventListener('click', () => {
      this.hide();
      if (onCancel) onCancel();
    });
    
    const confirmBtn = createElement('button', {
      style: {
        padding: '10px 20px',
        background: '#007AFF',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        ...confirmStyle
      }
    }, [confirmText]);
    
    confirmBtn.addEventListener('click', () => {
      this.hide();
      if (onConfirm) onConfirm();
    });
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    content.appendChild(btnContainer);
    
    this._showModal(modal);
  }

  // Show input modal
  showInput(title, onSubmit, options = {}) {
    this.hide();
    
    if (!this._ensureContainer()) {
      console.error('Cannot show input modal - container not available');
      const value = prompt(title + (options.placeholder ? ` (${options.placeholder})` : ''));
      if (value && onSubmit) {
        // Basic validation
        if (options.validation) {
          const result = options.validation(value);
          if (result.valid) {
            onSubmit(value);
          } else {
            alert(result.error);
          }
        } else {
          onSubmit(value);
        }
      }
      return;
    }
    
    const {
      placeholder = '',
      defaultValue = '',
      maxLength = 50,
      submitText = 'Save',
      cancelText = 'Cancel',
      validation = null
    } = options;
    
    const modal = this._createModalStructure();
    const content = modal.querySelector('.modal-content');
    
    const titleEl = createElement('h3', {
      style: { marginBottom: '16px', fontSize: '24px', fontWeight: '600' }
    }, [title]);
    content.appendChild(titleEl);
    
    const input = createElement('input', {
      type: 'text',
      placeholder,
      value: defaultValue,
      maxLength: maxLength.toString(),
      style: {
        width: '100%',
        padding: '12px',
        marginBottom: '8px',
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontSize: '16px',
        boxSizing: 'border-box'
      }
    });
    
    const feedback = createElement('div', {
      className: 'hidden',
      style: {
        color: '#ff3b30',
        marginBottom: '16px',
        fontSize: '14px',
        minHeight: '20px'
      }
    });
    
    content.appendChild(input);
    content.appendChild(feedback);
    
    const btnContainer = createElement('div', {
      style: {
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end',
        marginTop: '16px'
      }
    });
    
    const cancelBtn = createElement('button', {
      style: {
        padding: '10px 20px',
        background: '#f0f0f0',
        color: '#333',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '500',
        cursor: 'pointer'
      }
    }, [cancelText]);
    
    cancelBtn.addEventListener('click', () => {
      this.hide();
    });
    
    const submitBtn = createElement('button', {
      style: {
        padding: '10px 20px',
        background: '#007AFF',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer'
      }
    }, [submitText]);
    
    const handleSubmit = () => {
      const value = input.value.trim();
      
      if (!value) {
        feedback.textContent = 'This field cannot be empty';
        removeClass(feedback, 'hidden');
        input.focus();
        return;
      }
      
      if (validation) {
        const result = validation(value);
        if (!result.valid) {
          feedback.textContent = result.error;
          removeClass(feedback, 'hidden');
          input.focus();
          return;
        }
      }
      
      this.hide();
      if (onSubmit) onSubmit(value);
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });
    
    input.addEventListener('input', () => {
      addClass(feedback, 'hidden');
    });
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(submitBtn);
    content.appendChild(btnContainer);
    
    this._showModal(modal);
    
    setTimeout(() => input.focus(), 100);
  }

  // Ensure container exists (re-query if needed)
  _ensureContainer() {
    if (!this._container) {
      console.warn('Modal container was null, re-querying...');
      this._container = $('#modalContainer');
      
      if (!this._container) {
        console.error('Still cannot find #modalContainer');
        return false;
      }
    }
    return true;
  }

  // Create modal structure
  _createModalStructure() {
    const overlay = createElement('div', {
      className: 'modal-overlay',
      style: {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '10000',
        padding: '20px'
      }
    });
    
    const box = createElement('div', {
      className: 'modal-content',
      style: {
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
      }
    });
    
    const closeBtn = createElement('button', {
      className: 'modal-close',
      style: {
        position: 'absolute',
        top: '12px',
        right: '12px',
        background: 'transparent',
        border: 'none',
        fontSize: '28px',
        lineHeight: '1',
        cursor: 'pointer',
        color: '#999',
        padding: '0',
        width: '32px',
        height: '32px'
      }
    }, ['×']);
    
    closeBtn.addEventListener('click', () => this.hide());
    
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });
    
    return overlay;
  }

  // Show modal
  _showModal(modal) {
    if (!this._ensureContainer()) {
      console.error('Cannot display modal - no container');
      return;
    }
    
    this._currentModal = modal;
    this._container.innerHTML = '';
    this._container.appendChild(modal);
    this._container.style.display = 'block';
    
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    };
    
    document.addEventListener('keydown', this._escapeHandler);
    console.log('Modal displayed successfully');
  }

  // Hide modal
  hide() {
    if (this._currentModal) {
      this._currentModal.remove();
      this._currentModal = null;
    }
    
    if (this._container) {
      this._container.style.display = 'none';
    }
    
    if (this._escapeHandler) {
      document.removeEventListener('keydown', this._escapeHandler);
      this._escapeHandler = null;
    }
  }

  // Check if modal is open
  isOpen() {
    return this._currentModal !== null;
  }
}

// Export singleton
export const modal = new Modal();
