/**
 * Shared Application Layout Interactions
 * Handles Responsive Sidebar toggling, Dropdowns, and overlay logic for mobile
 */
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Responsive Sidebar Toggle ---
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    /**
     * Toggles the sidebar visibility on mobile/tablet viewports
     */
    function toggleSidebar() {
        if (!sidebar) return;
        const isOpen = sidebar.classList.contains('open');
        
        if (isOpen) {
            sidebar.classList.remove('open');
            if (sidebarOverlay) sidebarOverlay.classList.add('d-none');
            // Accessibility Updates
            if(openSidebarBtn) openSidebarBtn.setAttribute('aria-expanded', 'false');
        } else {
            sidebar.classList.add('open');
            if (sidebarOverlay) sidebarOverlay.classList.remove('d-none');
            // Accessibility Updates
            if(openSidebarBtn) openSidebarBtn.setAttribute('aria-expanded', 'true');
        }
    }

    // Bind sidebar events
    if (openSidebarBtn) openSidebarBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);


    // --- Shared Dropdowns (Notifications & Profile) ---
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationDropdown = document.getElementById('notificationDropdown');
    
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    /**
     * Toggles a specific dropdown while ensuring others are closed
     */
    function toggleDropdown(btn, dropdown) {
        if (!dropdown) return;
        const isHidden = dropdown.classList.contains('d-none');
        
        // Close all dropdowns to maintain a clean UI state
        closeAllDropdowns();

        if (isHidden) {
            dropdown.classList.remove('d-none');
            if (btn) btn.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Closes all active dropdowns in the layout
     */
    function closeAllDropdowns() {
        if (notificationDropdown && !notificationDropdown.classList.contains('d-none')) {
            notificationDropdown.classList.add('d-none');
            if (notificationBtn) notificationBtn.setAttribute('aria-expanded', 'false');
        }
        if (profileDropdown && !profileDropdown.classList.contains('d-none')) {
            profileDropdown.classList.add('d-none');
            if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
        }
    }

    // Bind Notification Dropdown
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent document click from immediately closing it
            toggleDropdown(notificationBtn, notificationDropdown);
        });
    }

    // Bind Profile Dropdown
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(profileBtn, profileDropdown);
        });
    }

    // Global listeners for accessibility and ease of use
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (notificationDropdown && !notificationDropdown.classList.contains('d-none')) {
            if (!notificationDropdown.contains(e.target) && e.target !== notificationBtn) {
                closeAllDropdowns();
            }
        }
        if (profileDropdown && !profileDropdown.classList.contains('d-none')) {
            if (!profileDropdown.contains(e.target) && e.target !== profileBtn) {
                closeAllDropdowns();
            }
        }
    });

    // Support Keyboard Navigation (Escape key to dismiss overlays/dropdowns)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllDropdowns();
            // Also dismiss sidebar if open on mobile
            if (sidebar && sidebar.classList.contains('open')) {
                toggleSidebar();
            }
        }
    });
});
