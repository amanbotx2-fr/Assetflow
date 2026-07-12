/**
 * organization.js
 * Frontend-only interactivity for the Organization Setup page.
 * No backend calls. All data is placeholder UI only.
 */

document.addEventListener('DOMContentLoaded', () => {

  /* =========================================================
     TAB NAVIGATION
  ========================================================= */
  const tabBtns = document.querySelectorAll('[data-tab-btn]');
  const tabPanels = document.querySelectorAll('[data-tab-panel]');

  function activateTab(tabId) {
    tabBtns.forEach(btn => {
      const isActive = btn.dataset.tabBtn === tabId;
      btn.classList.toggle('tab-btn--active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });
    tabPanels.forEach(panel => {
      const isActive = panel.dataset.tabPanel === tabId;
      panel.hidden = !isActive;
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tabBtn));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateTab(btn.dataset.tabBtn);
      }
    });
  });

  /* =========================================================
     MODAL SYSTEM (open / close / ESC dismiss)
  ========================================================= */
  const allModals = document.querySelectorAll('[data-modal]');

  function openModal(modalId) {
    const modal = document.querySelector(`[data-modal="${modalId}"]`);
    const overlay = document.getElementById('orgModalOverlay');
    if (!modal || !overlay) return;
    overlay.classList.remove('d-none');
    modal.classList.remove('d-none');
    modal.setAttribute('aria-hidden', 'false');
    // Focus first focusable element
    const focusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
  }

  function closeAllModals() {
    const overlay = document.getElementById('orgModalOverlay');
    if (overlay) overlay.classList.add('d-none');
    allModals.forEach(m => {
      m.classList.add('d-none');
      m.setAttribute('aria-hidden', 'true');
    });
  }

  // Open triggers
  document.querySelectorAll('[data-open-modal]').forEach(trigger => {
    trigger.addEventListener('click', () => openModal(trigger.dataset.openModal));
  });

  // Close triggers
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });

  // Overlay click closes modals
  const orgOverlay = document.getElementById('orgModalOverlay');
  if (orgOverlay) {
    orgOverlay.addEventListener('click', (e) => {
      if (e.target === orgOverlay) closeAllModals();
    });
  }

  // ESC key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });

  /* =========================================================
     SEARCH FILTER (client-side UI only, filters table rows)
  ========================================================= */
  function bindSearch(inputId, tableBodyId) {
    const input = document.getElementById(inputId);
    const tbody = document.getElementById(tableBodyId);
    if (!input || !tbody) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      Array.from(tbody.rows).forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
      updateEmptyState(tableBodyId);
    });
  }

  function updateEmptyState(tableBodyId) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) return;
    const visibleRows = Array.from(tbody.rows).filter(r => r.style.display !== 'none');
    const emptyEl = tbody.closest('section')?.querySelector('[data-empty-state]');
    if (emptyEl) emptyEl.classList.toggle('d-none', visibleRows.length > 0);
  }

  bindSearch('deptSearch', 'deptTableBody');
  bindSearch('empSearch',  'empTableBody');
  bindSearch('catSearch',  'catTableBody');

  /* =========================================================
     STATUS FILTER DROPDOWNS
  ========================================================= */
  function bindStatusFilter(selectId, tableBodyId, colIndex) {
    const select = document.getElementById(selectId);
    const tbody  = document.getElementById(tableBodyId);
    if (!select || !tbody) return;
    select.addEventListener('change', () => {
      const val = select.value.toLowerCase();
      Array.from(tbody.rows).forEach(row => {
        const cell = row.cells[colIndex];
        if (!cell) return;
        row.style.display = (!val || cell.textContent.toLowerCase().includes(val)) ? '' : 'none';
      });
      updateEmptyState(tableBodyId);
    });
  }

  bindStatusFilter('deptStatusFilter', 'deptTableBody', 3);
  bindStatusFilter('empStatusFilter',  'empTableBody',  4);
  bindStatusFilter('catStatusFilter',  'catTableBody',  3);

  /* =========================================================
     RESET FILTERS
  ========================================================= */
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    ['deptSearch','empSearch','catSearch'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['deptStatusFilter','empStatusFilter','catStatusFilter'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Show all rows
    document.querySelectorAll('[id$="TableBody"]').forEach(tbody => {
      Array.from(tbody.rows).forEach(r => r.style.display = '');
      updateEmptyState(tbody.id);
    });
    showToast('Filters cleared.', 'info');
  });

  /* =========================================================
     TOAST NOTIFICATION (frontend only)
  ========================================================= */
  function showToast(message, type = 'success') {
    const toast = document.getElementById('orgToast');
    const toastMsg = document.getElementById('orgToastMsg');
    const toastIcon = document.getElementById('orgToastIcon');
    if (!toast || !toastMsg) return;

    const colors = { success: 'var(--color-success)', danger: 'var(--color-danger)', info: 'var(--color-info)', warning: 'var(--color-warning)' };
    const icons  = { success: 'check-circle', danger: 'x-circle', info: 'info', warning: 'alert-triangle' };
    toast.style.borderLeftColor = colors[type] || colors.success;
    toastMsg.textContent = message;
    toastIcon.setAttribute('data-lucide', icons[type] || 'check-circle');
    lucide.createIcons({ nodes: [toastIcon] });

    toast.classList.remove('d-none');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.add('d-none'), 3500);
  }

  // Expose globally so form submit buttons can call it
  window.showOrgToast = showToast;

  // Toast dismiss button
  document.getElementById('orgToastClose')?.addEventListener('click', () => {
    document.getElementById('orgToast')?.classList.add('d-none');
  });

  /* =========================================================
     MOCK FORM SUBMISSIONS (frontend only — no API)
  ========================================================= */
  document.querySelectorAll('[data-mock-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const action = form.dataset.mockForm; // e.g. "add-dept"
      closeAllModals();
      const labels = { 'add-dept': 'Department added!', 'edit-dept': 'Department updated!', 'add-emp': 'Employee added!', 'edit-emp': 'Employee updated!', 'add-cat': 'Category added!', 'edit-cat': 'Category updated!' };
      showToast(labels[action] || 'Saved!', 'success');
    });
  });

  document.querySelectorAll('[data-mock-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
      showToast('Record deleted.', 'danger');
    });
  });

  /* =========================================================
     HIDE LOADING SKELETONS AFTER BRIEF DELAY (UI simulation)
  ========================================================= */
  setTimeout(() => {
    document.querySelectorAll('[data-skeleton]').forEach(sk => sk.classList.add('d-none'));
    document.querySelectorAll('[data-table-content]').forEach(tc => tc.classList.remove('d-none'));
  }, 800);

  /* =========================================================
     LIVE DATE IN HEADER
  ========================================================= */
  const dateEl = document.getElementById('orgCurrentDate');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* =========================================================
     SORT COLUMN HEADERS (toggle sort indicator UI only)
  ========================================================= */
  document.querySelectorAll('[data-sort-col]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const current = th.dataset.sortDir || 'none';
      document.querySelectorAll('[data-sort-col]').forEach(h => { h.dataset.sortDir = 'none'; h.querySelector('.sort-indicator')?.remove(); });
      th.dataset.sortDir = current === 'asc' ? 'desc' : 'asc';
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.textContent = th.dataset.sortDir === 'asc' ? ' ↑' : ' ↓';
      th.appendChild(indicator);
    });
  });

});
