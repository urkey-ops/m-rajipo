// modal.js - Modal dialog component (FIXED)
import { createElement, $, addClass, removeClass } from '../../utils/dom-utils.js';
import { escapeHtml } from '../../utils/dom-utils.js';

class Modal {
  constructor() {
    this._container = null;
    this._currentModal = null;
  }
  
  initialize() {
    this._container = $('#modalContainer');
    if (!this._container) {
      console.error('Modal container not found');
    }
  }
  
  // Show simple alert modal
  show(message, options = {}) {
    this.hide(); // Close existing modal
    
    const {
      title = null,
      onClose = null
    } = options;
    
    const modal = this._createModalStructure();
    const content = modal.querySelector('.modal-content');
    
    // Add title if provided
    if (title) {
      const titleEl = createElement('h3', { 
        style: { marginBottom: '16px', fontSize: '24px' }
      }, [title]);
      content.appendChild(titleEl);
    }
    
    // Add message
    const messageEl = createElement('p', {
      style: { marginBottom: '16px', lineHeight: '1.5' }
    }, [message]);
    content.appendChild(messageEl);
    
    // Add OK button
    const okBtn = createElement('button', {
      className: 'btn-icon',
      style: { width: '100%' }
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
    
    const {
      title = null,
      confirmText = 'OK',
      cancelText = 'Cancel',
      confirmStyle = {}
    } = options;
    
    const modal = this._createModalStructure();
    const content = modal.querySelector('.modal-content');
    
    // Add title if provided
    if (title) {
      const titleEl = createElement('h3', {
        style: { marginBottom: '16px', fontSize: '24px' }
      }, [title]);
      content.appendChild(titleEl);
    }
    
    // Add message
    const messageEl = createElement('p', {
      style: { marginBottom: '16px', lineHeight: '1.5' }
    }, [message]);
    content.appendChild(messageEl);
    
    // Button container
    const btnContainer = createElement('div', {
      style: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
        marginTop: '16px'
      }
    });
    
    // Cancel button
    const cancelBtn = createElement('button', {
      className: 'sheet-item-btn'
    }, [cancelText]);
    
    cancelBtn.addEventListener('click', () => {
      this.hide();
      if (onCancel) onCancel();
    });
    
    // Confirm button
    const confirmBtn = createElement('button', {
      className: 'sheet-item-btn',
      style: {
        background: 'var(--primary)',
        color: 'white',
        borderColor: 'var(--primary)',
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
    
    // Title
    const titleEl = createElement('h3', {
      style: { marginBottom: '16px', fontSize: '24px' }
    }, [title]);
    content.appendChild(titleEl);
    
    // Input
    const input = createElement('input', {
      type: 'text',
      placeholder,
      value: defaultValue,
      maxLength: maxLength.toString(),
      style: {
        width: '100%',
        padding: '12px',
        marginBottom: '12px',
        background: 'var(--bg-black)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        color: 'var(--text-primary)',
        fontSize: '17px'
      }
    });
    
    // Feedback message
    const feedback = createElement('div', {
      className: 'hidden',
      style: {
        color: 'var(--destructive)',
        marginBottom: '12px',
        fontSize: '15px'
      }
    });
    
    content.appendChild(input);
    content.appendChild(feedback);
    
    // Button container
    const btnContainer = createElement('div', {
      style: {
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
        marginTop: '16px'
      }
    });
    
    // Cancel button
    const cancelBtn = createElement('button', {
      className: 'sheet-item-btn'
    }, [cancelText]);
    
    cancelBtn.addEventListener('click', () => {
      this.hide();
    });
    
    // Submit button
    const submitBtn = createElement('button', {
      className: 'sheet-item-btn',
      style: {
        background: 'var(--primary)',
        color: 'white',
        borderColor: 'var(--primary)'
      }
    }, [submitText]);
    
    const handleSubmit = () => {
      const value = input.value.trim();
      
      // Empty check
      if (!value) {
        feedback.textContent = 'This field cannot be empty';
        removeClass(feedback, 'hidden');
        input.focus();
        return;
      }
      
      // Custom validation
      if (validation) {
        const result = validation(value);
        if (!result.valid) {
          feedback.textContent = result.error;
          removeClass(feedback, 'hidden');
          input.focus();
          return;
        }
      }
      
      // All good - submit
      this.hide();
      if (onSubmit) onSubmit(value);
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    
    // Enter key to submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });
    
    // Clear feedback on input
    input.addEventListener('input', () => {
      addClass(feedback, 'hidden');
    });
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(submitBtn);
    content.appendChild(btnContainer);
    
    this._showModal(modal);
    
    // Auto-focus input
    setTimeout(() => input.focus(), 100);
  }
  
  // Create modal structure
  _createModalStructure() {
    const modal = createElement('div', {
      className: 'modal-container',
      style: { display: 'flex' }
    });
    
    const content = createElement('div', {
      className: 'modal-content'
    });
    
    const closeBtn = createElement('span', {
      className: 'modal-close'
    }, ['×']);
    
    closeBtn.addEventListener('click', () => this.hide());
    
    content.appendChild(closeBtn);
    modal.appendChild(content);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide();
      }
    });
    
    return modal;
  }
  
  // Show modal
  _showModal(modal) {
    if (!this._container) return;
    
    this._currentModal = modal;
    this._container.innerHTML = '';
    this._container.appendChild(modal);
    
    // Setup escape key handler
    this._escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    };
    document.addEventListener('keydown', this._escapeHandler);
  }
  
  // Hide modal
  hide() {
    if (this._currentModal) {
      this._currentModal.remove();
      this._currentModal = null;
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
