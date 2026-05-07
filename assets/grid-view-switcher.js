/**
 * Grid View Switcher Functionality
 *
 * Adds event listeners to grid view buttons and updates the target grid's class
 * to change the number of columns displayed. Stores preference in localStorage.
 */

(function() {
  const GRID_VIEW_STORAGE_KEY = 'shopGridViewPreference';

  function initGridViewSwitcher(switcherElement) {
    const buttons = switcherElement.querySelectorAll('.grid-view-button');
    const gridTargetSelector = switcherElement.dataset.gridTarget;
    const gridElement = gridTargetSelector ? document.querySelector(gridTargetSelector) : null;

    if (!buttons.length || !gridElement) {
      // console.warn('Grid view switcher buttons or target grid not found for:', switcherElement);
      return;
    }

    // Function to apply the grid view class
    function applyGridView(viewType, clickedButton = null) {
      if (!viewType) return;

      // Remove existing grid view classes
      gridElement.classList.remove('grid--1-col', 'grid--2-col', 'grid--3-col');
      // Add the new class
      gridElement.classList.add(viewType);

      // Update active button state
      buttons.forEach(btn => {
        btn.classList.remove('is-active');
        if (clickedButton && btn === clickedButton) {
          btn.classList.add('is-active');
        } else if (!clickedButton && btn.dataset.viewType === viewType) {
           // Set active state based on loaded preference
           btn.classList.add('is-active');
        }
      });

      // Save preference to localStorage
      try {
        localStorage.setItem(GRID_VIEW_STORAGE_KEY, viewType);
      } catch (e) {
        console.warn('Could not save grid view preference to localStorage:', e);
      }
    }

    // Add click listeners to buttons
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const viewType = button.dataset.viewType;
        applyGridView(viewType, button);
      });
    });

    // Load preference on initial load
    let savedView = null;
    try {
        savedView = localStorage.getItem(GRID_VIEW_STORAGE_KEY);
    } catch (e) {
        console.warn('Could not read grid view preference from localStorage:', e);
    }

    // Apply saved view or default to 2 columns if nothing saved
    const initialView = savedView || 'grid--2-col'; // Default to 2 columns
    applyGridView(initialView);
  }

  // Initialize all switchers on the page when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const switchers = document.querySelectorAll('.grid-view-switcher');
    switchers.forEach(initGridViewSwitcher);
  });

  // Re-initialize if sections are loaded dynamically (e.g., in theme editor or quick view)
   document.addEventListener('shopify:section:load', () => {
       // Use setTimeout to allow DOM changes to settle
       setTimeout(() => {
           document.querySelectorAll('.grid-view-switcher').forEach(initGridViewSwitcher);
       }, 50);
   });

   // Also re-initialize if filters cause content update (Dawn uses 'filter:changed' event)
   document.addEventListener('filter:changed', () => {
        // Use setTimeout to allow DOM changes to settle
       setTimeout(() => {
           document.querySelectorAll('.grid-view-switcher').forEach(initGridViewSwitcher);
       }, 50);
   });


})();
