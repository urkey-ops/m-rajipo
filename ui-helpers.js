// ui-helpers.js

/**
 * Ensures text output to the DOM is safe from XSS.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m];
  });
}

/**
 * Toggles a CSS class on a given element.
 * Includes a null check and condition logic for convenience.
 * @param {HTMLElement | null} el The element to modify.
 * @param {string} className The class name to toggle.
 * @param {boolean | null} condition If provided, forces adding (true) or removing (false).
 */
export function toggleClass(el, className, condition = null) {
  // Use global DOM object, which should be cached in app.js
  if (!el) return;

  if (condition === true) {
    el.classList.add(className);
  } else if (condition === false) {
    el.classList.remove(className);
  } else {
    el.classList.toggle(className);
  }
}

/**
 * Displays a temporary notification toast at the bottom of the screen.
 * NOTE: Assumes DOM.toast is available and CONFIG.toastDuration is imported from state.js.
 * @param {string} message The message to display.
 */
export function showToast(message) {
  // This module must assume DOM is available in the global/imported scope,
  // and CONFIG is imported where showToast is used (e.g., in app.js or player.js)
  // For now, we will assume DOM.toast is available.
  const DOM = window.DOM || {}; // Fallback for testing/scoping
  const CONFIG = window.CONFIG || { toastDuration: 4000 }; // Fallback

  if (!DOM.toast) {
    console.warn('Toast element not found.');
    return;
  }

  DOM.toast.textContent = message;
  toggleClass(DOM.toast, 'active', true);

  setTimeout(() => {
    toggleClass(DOM.toast, 'active', false);
  }, CONFIG.toastDuration);
}


/**
 * Displays a modal dialog with an optional confirm/cancel action.
 * @param {string} message The message to show in the modal.
 * @param {function} [onConfirm=null] Callback executed when 'Confirm' is clicked. If null, displays only an 'OK' button.
 */
export function showModal(message, onConfirm = null) {
  const DOM = window.DOM || {}; // Fallback
  if (!DOM.modalContainer) {
    console.error('Modal container element not found.');
    return;
  }

  // Clear any existing modal to prevent stacking
  DOM.modalContainer.innerHTML = '';

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop fade-in';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const buttonsHtml = onConfirm
    ? `<div class="mt-6 flex justify-end space-x-3">
         <button id="modal-cancel" class="btn-rounded btn-secondary">Cancel</button>
         <button id="modal-confirm" class="btn-rounded btn-primary">Confirm</button>
       </div>`
    : `<div class="mt-6"><button id="modal-cancel" class="btn-rounded btn-primary">OK</button></div>`;

  modal.innerHTML = `
    <div class="modal-content" role="document">
      <button class="modal-close" aria-label="Close" tabindex="0">&times;</button>
      <p class="text-lg">${escapeHtml(message)}</p>
      ${buttonsHtml}
    </div>
  `;

  DOM.modalContainer.appendChild(modal);

  // Focus trap for accessibility
  setTimeout(() => {
    const focusable = modal.querySelector('button, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }, 0);

  const closeModal = () => {
    toggleClass(modal, 'fade-in', false);
    toggleClass(modal, 'fade-out', true);
    // Remove the modal from the DOM after the fade-out animation completes
    modal.addEventListener('animationend', () => modal.remove(), { once: true });
  };

  // Setup event listeners for closing the modal
  modal.querySelector('.modal-close').onclick = closeModal;
  const cancelBtn = document.getElementById('modal-cancel');
  if (cancelBtn) cancelBtn.onclick = closeModal;

  if (onConfirm) {
    document.getElementById('modal-confirm').onclick = () => {
      onConfirm();
      closeModal();
    };
  }
}
