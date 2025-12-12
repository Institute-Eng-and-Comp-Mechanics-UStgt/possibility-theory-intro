// Tracker - Clean and Minimal
(function() {
    'use strict';

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // Create progress bar
        const tracker = document.createElement('div');
        tracker.className = 'tracker';
        tracker.innerHTML = '<div class="progress-bar"></div>';
        document.body.insertBefore(tracker, document.body.firstChild);

        // Create section navigation
        const sectionNav = document.createElement('div');
        sectionNav.className = 'section-nav';
        sectionNav.innerHTML = `
            <div class="current-section">Current Section</div>
            <div class="section-title"></div>
            <div class="section-list"></div>
        `;
        document.body.appendChild(sectionNav);

        // Get all h2 sections
        const sections = Array.from(document.querySelectorAll('dt-article h2'));

        if (sections.length === 0) {
            // If no sections, hide the nav
            return;
        }

        // Populate section list
        const sectionList = sectionNav.querySelector('.section-list');
        const sectionTitle = sectionNav.querySelector('.section-title');
        const sectionItems = [];

        sections.forEach((section, index) => {
            const item = document.createElement('div');
            item.className = 'section-item';
            item.textContent = section.textContent;
            item.dataset.index = index;

            // Click to scroll to section
            item.addEventListener('click', () => {
                const sectionTop = section.offsetTop;
                const offsetPosition = sectionTop - (window.innerHeight / 3);

                // Immediately update the active section
                currentSectionIndex = index;
                sectionTitle.textContent = section.textContent;
                sectionItems.forEach((item, i) => {
                    item.classList.toggle('active', i === index);
                });

                // Prevent scroll handler from overriding during smooth scroll
                isScrollingProgrammatically = true;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Re-enable scroll detection after animation completes
                setTimeout(() => {
                    isScrollingProgrammatically = false;
                }, 1000);
            });

            sectionItems.push(item);
            sectionList.appendChild(item);
        });

        // Track scroll position
        const progressBar = tracker.querySelector('.progress-bar');

        let currentSectionIndex = -1;
        let scrollTimeout;
        let isScrollingProgrammatically = false;

        function updateProgress() {
            // Calculate overall scroll progress
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;

            progressBar.style.width = Math.min(scrollPercent, 100) + '%';

            // Find current section
            let newSectionIndex = -1;
            const scrollPosition = scrollTop + windowHeight / 3; // Trigger earlier for better UX

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                const sectionTop = section.offsetTop;

                if (scrollPosition >= sectionTop) {
                    newSectionIndex = i;
                    break;
                }
            }

            // Update section navigation (skip if programmatically scrolling)
            if (!isScrollingProgrammatically && newSectionIndex !== currentSectionIndex && newSectionIndex >= 0) {
                currentSectionIndex = newSectionIndex;
                sectionTitle.textContent = sections[newSectionIndex].textContent;

                // Update active state
                sectionItems.forEach((item, index) => {
                    item.classList.toggle('active', index === newSectionIndex);
                });
            }

            // Show/hide section nav based on scroll position
            if (scrollTop > 200) {
                sectionNav.classList.add('visible');
            } else {
                sectionNav.classList.remove('visible');
            }
        }

        // Debounced scroll handler
        function handleScroll() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(updateProgress, 10);
        }

        // Listen to scroll events
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });

        // Initial update
        updateProgress();
    }
})();
