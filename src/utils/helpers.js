/**
 * Simple debounce utility to limit function execution frequency.
 * @param {Function} func - Function to debounce.
 * @param {number} wait - Milliseconds to wait.
 * @returns {Function}
 */
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Toggles the expanded class on an element and its associated icon.
 * @param {HTMLElement} list - The list element to toggle.
 * @param {HTMLElement} icon - The icon element to toggle.
 */
export const toggleCollapse = (list, icon) => {
  list?.classList.toggle("expanded");
  icon?.classList.toggle("expanded");
};
