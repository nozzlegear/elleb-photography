const sideNavClass = 'has-sidenav';

/**
 * Opens the side nav by adding the requisite CSS classes.
 */
export function openSideNav() {
  document.body.classList.add(sideNavClass);
}

/**
 * Closes the side nav by removing the requisite CSS classes.
 */
export function closeSideNav() {
  document.body.classList.remove(sideNavClass);
}

/**
 * Toggles the side nav by toggling the requisite CSS classes.
 */
export function toggleSideNav() {
  document.body.classList.toggle(sideNavClass);
}
