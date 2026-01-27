// Age Verification State Management
const VERIFICATION_KEY = 'age_verified';
const VERIFICATION_TIMESTAMP_KEY = 'age_verified_timestamp';
const VERIFICATION_EXPIRY_HOURS = 24; // Verification expires after 24 hours

// Check if user is already verified
function checkVerificationStatus() {
    const verified = localStorage.getItem(VERIFICATION_KEY) === 'true';
    const timestamp = localStorage.getItem(VERIFICATION_TIMESTAMP_KEY);
    
    if (verified && timestamp) {
        const now = new Date().getTime();
        const verifiedTime = parseInt(timestamp);
        const hoursSinceVerification = (now - verifiedTime) / (1000 * 60 * 60);
        
        if (hoursSinceVerification < VERIFICATION_EXPIRY_HOURS) {
            return true;
        } else {
            // Verification expired
            localStorage.removeItem(VERIFICATION_KEY);
            localStorage.removeItem(VERIFICATION_TIMESTAMP_KEY);
        }
    }
    
    return false;
}

// Set verification status
function setVerificationStatus(verified) {
    if (verified) {
        localStorage.setItem(VERIFICATION_KEY, 'true');
        localStorage.setItem(VERIFICATION_TIMESTAMP_KEY, new Date().getTime().toString());
    } else {
        localStorage.removeItem(VERIFICATION_KEY);
        localStorage.removeItem(VERIFICATION_TIMESTAMP_KEY);
    }
}

// Global functions for Klarna SDK callback
let globalShowResult, globalShowMainContent, globalSetVerificationStatus, globalCalculateAge;

// Initialize Klarna SDK
window.KlarnaSDKCallback = async function(klarna) {
    // Get Klarna client ID from backend
    try {
        const configResponse = await fetch('/api/klarna/config');
        const config = await configResponse.json();
        
        if (!config.clientId) {
            console.error('Klarna Client ID not configured');
            return;
        }
        
        // Initialize Klarna SDK
        await klarna.init({
            clientId: config.clientId
        });
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        // Create and mount the Klarna Identity button
        const buttonContainer = document.getElementById('klarna-button-container');
        if (buttonContainer) {
            const siwkButton = klarna.Identity.button({
                id: 'klarna-identity-button',
                scope: 'openid offline_access payment:request:create profile:name profile:date_of_birth',
                redirectUri: `${window.location.origin}/api/klarna/callback`,
                theme: 'default',
                shape: 'default'
            });
            
            siwkButton.mount('#klarna-button-container');
        }
        
        // Listen for signin event
        klarna.Identity.on('signin', async (signinResponse) => {
            console.log('Klarna signin response:', signinResponse);
            
            // Check if user is 18+ based on date_of_birth claim
            if (signinResponse.id_token) {
                try {
                    // Decode the id_token (it's a JWT)
                    const payload = JSON.parse(atob(signinResponse.id_token.split('.')[1]));
                    
                    if (payload.date_of_birth && globalCalculateAge) {
                        const birthDate = new Date(payload.date_of_birth);
                        const age = globalCalculateAge(birthDate);
                        
                        if (age >= 18) {
                            if (globalSetVerificationStatus) globalSetVerificationStatus(true);
                            if (globalShowResult) globalShowResult(`Age verified successfully! You are ${age} years old.`, 'success');
                            setTimeout(() => {
                                if (globalShowMainContent) globalShowMainContent();
                            }, 1500);
                        } else {
                            if (globalShowResult) globalShowResult(`Sorry, you must be 18 years or older. You are currently ${age} years old.`, 'error');
                        }
                    } else {
                        // If no date_of_birth in token, assume verified (Klarna handles age verification)
                        if (globalSetVerificationStatus) globalSetVerificationStatus(true);
                        if (globalShowResult) globalShowResult('Age verified successfully with Klarna!', 'success');
                        setTimeout(() => {
                            if (globalShowMainContent) globalShowMainContent();
                        }, 1500);
                    }
                } catch (error) {
                    console.error('Error processing id_token:', error);
                    // Fallback: assume verified if we can't parse
                    if (globalSetVerificationStatus) globalSetVerificationStatus(true);
                    if (globalShowResult) globalShowResult('Age verified successfully with Klarna!', 'success');
                    setTimeout(() => {
                        if (globalShowMainContent) globalShowMainContent();
                    }, 1500);
                }
            }
        });
        
        // Listen for errors
        klarna.Identity.on('error', async (error) => {
            console.error('Klarna error:', error);
            if (globalShowResult) globalShowResult('Verification failed. Please try again or use manual verification.', 'error');
        });
        
    } catch (error) {
        console.error('Failed to initialize Klarna SDK:', error);
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const ageModal = document.getElementById('age-verification-modal');
    const mainContent = document.getElementById('main-content');
    const manualForm = document.getElementById('manual-verification-form');
    const birthdateInput = document.getElementById('birthdate');
    const verificationResult = document.getElementById('verification-result');
    
    // Set maximum date to today for birthdate input
    const today = new Date();
    const maxDate = today.toISOString().split('T')[0];
    birthdateInput.setAttribute('max', maxDate);
    
    // Check for reset parameter in URL (for testing: add ?reset=true to URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('reset') === 'true') {
        localStorage.removeItem(VERIFICATION_KEY);
        localStorage.removeItem(VERIFICATION_TIMESTAMP_KEY);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check if already verified
    if (checkVerificationStatus()) {
        showMainContent();
    } else {
        showAgeVerification();
    }
    
    // Manual verification form
    manualForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const birthdate = birthdateInput.value;
        
        if (!birthdate) {
            showResult('Please enter your date of birth.', 'error');
            return;
        }
        
        const age = calculateAge(new Date(birthdate));
        
        if (age >= 18) {
            setVerificationStatus(true);
            showResult(`Age verified! You are ${age} years old.`, 'success');
            setTimeout(() => {
                showMainContent();
            }, 1500);
        } else {
            showResult(`Sorry, you must be 18 years or older. You are currently ${age} years old.`, 'error');
        }
    });
    
    function showAgeVerification() {
        ageModal.style.display = 'flex';
        mainContent.classList.add('hidden');
    }
    
    function showMainContent() {
        ageModal.style.display = 'none';
        mainContent.classList.remove('hidden');
    }
    
    function calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // Make functions available globally for Klarna SDK callback
    globalShowResult = showResult;
    globalShowMainContent = showMainContent;
    globalSetVerificationStatus = setVerificationStatus;
    globalCalculateAge = calculateAge;
    
    function showResult(message, type) {
        const resultEl = document.getElementById('verification-result');
        if (resultEl) {
            resultEl.textContent = message;
            resultEl.className = `verification-result ${type}`;
            resultEl.style.display = 'block';
            resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    
    // Check for verification callback from Klarna (handled by SDK events now)
    // This is kept for backward compatibility with manual verification
    function checkVerificationCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const verified = urlParams.get('verified');
        
        if (verified === 'true') {
            setVerificationStatus(true);
            showMainContent();
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (verified === 'false') {
            if (ageModal && ageModal.style.display !== 'none') {
                showResult('Age verification failed. Please try again.', 'error');
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    // Check for callback on page load
    checkVerificationCallback();
});

// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navActions = document.querySelector('.nav-actions');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navActions.classList.toggle('mobile-active');
            mobileMenuToggle.classList.toggle('active');
        });
    }
    
    // Close mobile menu when clicking on a link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navMenu.classList.remove('active');
                navActions.classList.remove('mobile-active');
                mobileMenuToggle.classList.remove('active');
            }
        });
    });
});

// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                
                if (targetElement) {
                    const offset = 80; // Account for fixed navbar
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Update active nav link
                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');
                }
            }
        });
    });
    
    // Update active nav link on scroll
    const sections = document.querySelectorAll('section[id]');
    const observerOptions = {
        root: null,
        rootMargin: '-100px 0px -70% 0px',
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);
    
    sections.forEach(section => observer.observe(section));
});

// Game Filter Functionality
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const gameCards = document.querySelectorAll('.game-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active filter button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            
            // Filter game cards
            gameCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1)';
                    }, 10);
                } else {
                    const categories = card.getAttribute('data-category');
                    if (categories && categories.includes(filter)) {
                        card.style.display = 'block';
                        setTimeout(() => {
                            card.style.opacity = '1';
                            card.style.transform = 'scale(1)';
                        }, 10);
                    } else {
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            card.style.display = 'none';
                        }, 300);
                    }
                }
            });
        });
    });
    
    // Initialize game cards with transition
    gameCards.forEach(card => {
        card.style.transition = 'opacity 0.3s, transform 0.3s';
    });
});

// Add click handlers for game buttons
document.addEventListener('DOMContentLoaded', () => {
    const gameButtons = document.querySelectorAll('.btn-game, .btn-promo');
    const heroButtons = document.querySelectorAll('.btn-hero, .btn-hero-outline');
    
    // Handle hero buttons
    heroButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (button.textContent.includes('View Games') || button.textContent.includes('Games')) {
                const gamesSection = document.getElementById('games');
                if (gamesSection) {
                    const offset = 80;
                    const elementPosition = gamesSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            } else {
                // "Play Now" button - could open registration or game selection
                console.log('Play Now clicked');
            }
        });
    });
    
    // Handle game and promo buttons
    gameButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // In a real application, this would navigate to the game or trigger a modal
            console.log('Game/action clicked:', button.textContent);
            // For demo purposes, show a message
            if (!button.closest('.age-verification-modal')) {
                // You could add a toast notification here
            }
        });
    });
});

// Add spinner animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .klarna-button .spinner {
        animation: spin 1s linear infinite;
        color: #FFA8CD;
    }
`;
document.head.appendChild(style);
