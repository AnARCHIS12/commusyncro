document.addEventListener('DOMContentLoaded', function() {
    // Navigation
    const navLinks = document.querySelectorAll('.nav-links a');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Update active link
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetId) {
                    section.classList.add('active');
                }
            });

            // Smooth scroll
            const targetSection = document.getElementById(targetId);
            const offset = 70; // Height of fixed nav
            const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        });
    });

    // Search functionality
    const searchInput = document.getElementById('search');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase();
            const content = document.querySelectorAll('.section h2, .section h3, .section p, .feature-card');
            
            content.forEach(element => {
                const text = element.textContent.toLowerCase();
                const parent = element.closest('.section') || element;
                
                if (text.includes(searchTerm)) {
                    parent.style.display = 'block';
                    if (!element.classList.contains('feature-card')) {
                        const regex = new RegExp(searchTerm, 'gi');
                        element.innerHTML = element.textContent.replace(regex, match => `<mark>${match}</mark>`);
                    }
                } else {
                    if (!Array.from(parent.querySelectorAll('h2, h3, p')).some(el => 
                        el.textContent.toLowerCase().includes(searchTerm))) {
                        parent.style.display = 'none';
                    }
                }
            });
        }, 300);
    });
});
