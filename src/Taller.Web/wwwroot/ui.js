'use strict';
// Shared line icons; no remote resources or icon fonts.
window.workshopUI = {
  icon(name) {
    const paths = {
      workshop: '<path d="m3 9 9-6 9 6v12H3Z"/><path d="M7 21v-9h10v9M7 16h10"/>',
      dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
      orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9ZM9 12h6M9 16h4"/>',
      appointments: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M7 15h3M14 15h3"/>',
      customers: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
      vehicles: '<path d="m5 10 2-6h10l2 6M3 10h18v8H3ZM5 18v3M19 18v3M6 14h2M16 14h2"/>',
      services: '<path d="M14 6a5 5 0 0 0-6 6L3 17a3 3 0 0 0 4 4l5-5a5 5 0 0 0 6-6l-3 3-4-4Z"/>',
      users: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 4a3 3 0 0 1 0 6M19 14a6 6 0 0 1 3 5v2"/>',
      audit: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>'
    };
    return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.workshop}</svg>`;
  }
};
document.addEventListener('pointerdown', () => document.documentElement.dataset.input = 'pointer');
document.addEventListener('keydown', () => document.documentElement.dataset.input = 'keyboard');
