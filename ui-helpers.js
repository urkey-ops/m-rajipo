// ui-helpers.js (Patched)

// NOTE: Assumes global DOM object is set up in app.js
const DOM = window.DOM || {}; 

/**
 * Ensures text output to the DOM is safe from XSS.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>\"']/g, function (m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      "\'": '&#39;'
    }[m];
  });
}

/**
 * Toggles a CSS class on a given element.
 * @param {HTMLElement | null} el The element to modify.
 * @param {string} className The class name to toggle.
 * @param {boolean | null} condition If provided, forces adding (true) or removing (false).
 */
export function toggleClass(el, className, condition = null) {
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
 * CRITICAL FIX: Uses escapeHtml for safety.
 * @param {string} message The message to display.
 */
export function showToast(message) {
  if (!DOM.toast) {
    console.warn("Toast element not found.");
    return;
  }
  
  const toastDuration = window.CONFIG?.toastDuration || 4000;
  
  DOM.toast.innerHTML = `<p>${escapeHtml(message)}</p>`; // XSS FIX: Use escaped message
  toggleClass(DOM.toast, 'visible', true);

  // Clear any existing timeout
  if (DOM.toast.hideTimeout) {
    clearTimeout(DOM.toast.hideTimeout);
  }

  DOM.toast.hideTimeout = setTimeout(() => {
    toggleClass(DOM.toast, 'visible', false);
    DOM.toast.hideTimeout = null;
  }, toastDuration);
}

/**
 * Displays a custom confirmation or alert modal.
 * CRITICAL FIX: Generates unique IDs for buttons to prevent collision.
 * @param {string} message The message to display.
 * @param {function} [onConfirm] Optional callback for confirmation. If provided, shows Confirm/Cancel.
 */
export function showModal(message, onConfirm = null) {
  if (!DOM.modalContainer) {
    console.warn("Modal container element not found.");
    return;
  }

  // Remove existing modals before adding a new one (cleanup for robustness)
  Array.from(DOM.modalContainer.children).forEach(child => child.remove());

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop fade-in';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  
  // CRITICAL FIX: Generate unique IDs for buttons
  const uniqueId = Date.now();
  const cancelId = `modal-cancel-${uniqueId}`;
  const confirmId = `modal-confirm-${uniqueId}`;

  const buttonsHtml = onConfirm
    ? `<div class="mt-6 flex justify-end space-x-3">
         <button id="${cancelId}" class="btn-rounded btn-secondary">Cancel</button>
         <button id="${confirmId}" class="btn-rounded btn-primary">Confirm</button>
       </div>`
    : `<div class="mt-6"><button id="${cancelId}" class="btn-rounded btn-primary">OK</button></div>`;

  modal.innerHTML = `
    <div class="modal-content" role="document">
      <button class="modal-close" aria-label="Close" tabindex="0">&times;</button>
      <p class="text-lg">${escapeHtml(message)}</p>
      ${buttonsHtml}
    </div>
  `;

  DOM.modalContainer.appendChild(modal);

  // ... (Focus trap and event listener setup remains, using the new unique IDs) ...
  
  const closeModal = () => {
    toggleClass(modal, 'fade-in', false);
    toggleClass(modal, 'fade-out', true);
    // Remove the modal from the DOM after the fade-out animation completes
    modal.addEventListener('animationend', () => modal.remove(), { once: true });
  };

  // Setup event listeners for closing the modal
  modal.querySelector('.modal-close').onclick = closeModal;
  
  const cancelBtn = document.getElementById(cancelId);
  if (cancelBtn) cancelBtn.onclick = closeModal;

  if (onConfirm) {
    const confirmBtn = document.getElementById(confirmId);
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        onConfirm();
        closeModal();
      };
    }
  }
}

// Export the escapeHtml function for use in other modules (e.g., selection.js for playlist names)
export { escapeHtml };
