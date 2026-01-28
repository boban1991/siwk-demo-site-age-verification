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

// Initialize Klarna Identity API flow
async function initiateKlarnaIdentityFlow() {
    const klarnaVerifyBtn = document.getElementById('klarna-verify-btn');
    const verificationResult = document.getElementById('verification-result');
    
    // Show loading state
    klarnaVerifyBtn.disabled = true;
    klarnaVerifyBtn.innerHTML = `
        <span class="klarna-button-content">
            <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32">
                    <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                    <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                </circle>
            </svg>
            <span class="klarna-button-text">Creating request...</span>
        </span>
    `;
    
    try {
        console.log('Creating identity request...');
        
        // Create identity request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch('/api/klarna/identity/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Response status:', response.status);
        
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            const text = await response.text();
            console.error('Failed to parse response:', text);
            throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
        }
        
        console.log('Response data:', data);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            // Log full error details for debugging
            console.error('Full error response:', JSON.stringify(data, null, 2));
            console.error('Error details:', data.details);
            console.error('Error hint:', data.hint);
            console.error('Account ID used:', data.accountIdUsed);
            console.error('API URL:', data.apiUrl);
            if (data.error_id) {
                console.error('🔴 Klarna Error ID:', data.error_id, '- Use this ID when contacting Klarna support');
            }
            
            // Show detailed error message with error_id prominently displayed
            let errorMessage = data.error || `Failed to create identity request: ${response.status}`;
            
            // Display Klarna error_id prominently if available
            if (data.error_id) {
                errorMessage += `\n\n🔴 Klarna Error ID: ${data.error_id}`;
                if (data.error_type) errorMessage += `\nError Type: ${data.error_type}`;
                if (data.error_code) errorMessage += `\nError Code: ${data.error_code}`;
                if (data.error_message) errorMessage += `\nError Message: ${data.error_message}`;
                errorMessage += `\n\nUse the Error ID above when contacting Klarna support.`;
            }
            
            if (data.details) {
                errorMessage += `\n\nDetails: ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details, null, 2)}`;
            }
            if (data.hint) {
                errorMessage += `\n\n💡 Hint: ${data.hint}`;
            }
            
            throw new Error(errorMessage);
        }
        
        // Redirect to Klarna identity flow
        if (data.identity_request_url) {
            console.log('Redirecting to:', data.identity_request_url);
            window.location.href = data.identity_request_url;
        } else {
            console.error('No identity_request_url in response:', data);
            throw new Error('Identity request URL not received. Response: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Klarna identity flow error:', error);
        
        let errorMessage = 'An error occurred. Please try again.';
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        // Show error message with details
        const resultEl = document.getElementById('verification-result');
        if (resultEl) {
            // Show a user-friendly message, but log full details to console
            const userMessage = errorMessage.length > 200 ? errorMessage.substring(0, 200) + '... (check console for full details)' : errorMessage;
            resultEl.innerHTML = `<div>${userMessage.replace(/\n/g, '<br>')}</div>`;
            resultEl.className = 'verification-result error';
            resultEl.style.display = 'block';
            
            // Scroll to error
            resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            alert(errorMessage);
        }
        
        // Reset button
        klarnaVerifyBtn.disabled = false;
        klarnaVerifyBtn.innerHTML = `
            <span class="klarna-button-content">
                <span class="klarna-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor"/>
                        <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </span>
                <span class="klarna-button-text">Continue with Klarna</span>
            </span>
        `;
    }
}

// Fetch and display identity request data
async function fetchAndDisplayIdentityData(identityRequestId) {
    try {
        // URL encode the identity request ID (it may contain special characters)
        const encodedId = encodeURIComponent(identityRequestId);
        console.log('Fetching identity data for:', identityRequestId);
        
        const response = await fetch(`/api/klarna/identity/request/${encodedId}`);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            
            // Extract and display Klarna error_id prominently
            let errorMsg = errorData.error || `HTTP ${response.status}: Failed to fetch identity data`;
            if (errorData.error_id) {
                errorMsg += `\n\n🔴 Klarna Error ID: ${errorData.error_id}`;
                if (errorData.error_type) errorMsg += `\nError Type: ${errorData.error_type}`;
                if (errorData.error_code) errorMsg += `\nError Code: ${errorData.error_code}`;
                if (errorData.error_message) errorMsg += `\nError Message: ${errorData.error_message}`;
                errorMsg += `\n\nUse the Error ID above when contacting Klarna support.`;
            }
            if (errorData.hint) {
                errorMsg += `\n\n💡 Hint: ${errorData.hint}`;
            }
            if (errorData.details) {
                errorMsg += `\n\nDetails:\n${typeof errorData.details === 'string' ? errorData.details : JSON.stringify(errorData.details, null, 2)}`;
            }
            
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        console.log('Identity data received:', data);
        
        // Check if request is completed
        if (data.state === 'COMPLETED' || data.state === 'APPROVED') {
            displayCustomerData(data);
            setVerificationStatus(true);
        } else {
            console.log('Identity request state:', data.state, '- polling...');
            showResult(`Identity request is in state: ${data.state}. Please wait...`, 'info');
            // Poll again after a delay if not completed
            setTimeout(() => fetchAndDisplayIdentityData(identityRequestId), 2000);
        }
    } catch (error) {
        console.error('Error fetching identity data:', error);
        
        // Try to extract error_id from error message if it's in the response
        let errorMessage = error.message;
        try {
            const errorData = await fetch(`/api/klarna/identity/request/${encodeURIComponent(identityRequestId)}`).then(r => r.json()).catch(() => null);
            if (errorData?.error_id) {
                errorMessage += `\n\nKlarna Error ID: ${errorData.error_id}\nError Type: ${errorData.error_type || 'N/A'}\nError Code: ${errorData.error_code || 'N/A'}\n\nUse the Error ID above when contacting Klarna support.`;
            }
        } catch (e) {
            // Ignore
        }
        
        showResult(`Failed to fetch identity data: ${errorMessage}`, 'error');
    }
}

// Helper function to calculate age
function calculateAgeFromDOB(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    return age;
}

// Display customer data on success screen
function displayCustomerData(identityData) {
    const successScreen = document.getElementById('success-screen');
    const ageModal = document.getElementById('age-verification-modal');
    const dataContent = document.getElementById('customer-data-content');
    
    if (!successScreen || !dataContent) return;
    
    // Hide age verification modal
    if (ageModal) ageModal.style.display = 'none';
    
    // Extract customer data from state_context
    const customerProfile = identityData.state_context?.klarna_customer?.customer_profile;
    const customerToken = identityData.state_context?.klarna_customer?.customer_token;
    
    let html = '';
    
    // Customer Token
    if (customerToken) {
        html += `
            <div class="data-item">
                <div class="data-label">Customer Token</div>
                <div class="data-value token-value">${customerToken.substring(0, 50)}...</div>
            </div>
        `;
    }
    
    // Name
    if (customerProfile?.name) {
        const fullName = `${customerProfile.name.given_name || ''} ${customerProfile.name.family_name || ''}`.trim();
        html += `
            <div class="data-item">
                <div class="data-label">Name</div>
                <div class="data-value">${fullName || 'N/A'}</div>
                ${customerProfile.name.name_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `;
    }
    
    // Email
    if (customerProfile?.email) {
        html += `
            <div class="data-item">
                <div class="data-label">Email</div>
                <div class="data-value">${customerProfile.email.email || 'N/A'}</div>
                ${customerProfile.email.email_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `;
    }
    
    // Phone
    if (customerProfile?.phone) {
        html += `
            <div class="data-item">
                <div class="data-label">Phone</div>
                <div class="data-value">${customerProfile.phone.phone || 'N/A'}</div>
                ${customerProfile.phone.phone_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `;
    }
    
    // Date of Birth
    if (customerProfile?.date_of_birth) {
        const dob = customerProfile.date_of_birth.date_of_birth;
        const age = dob ? calculateAgeFromDOB(dob) : null;
        html += `
            <div class="data-item">
                <div class="data-label">Date of Birth</div>
                <div class="data-value">${dob || 'N/A'} ${age !== null ? `(Age: ${age})` : ''}</div>
                ${customerProfile.date_of_birth.date_of_birth_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `;
    }
    
    
    // Customer ID
    if (customerProfile?.customer_id) {
        html += `
            <div class="data-item">
                <div class="data-label">Customer ID</div>
                <div class="data-value">${customerProfile.customer_id.customer_id || 'N/A'}</div>
            </div>
        `;
    }
    
    // Billing Address
    if (customerProfile?.billing_address) {
        const addr = customerProfile.billing_address;
        html += `
            <div class="data-item">
                <div class="data-label">Billing Address</div>
                <div class="data-value">
                    ${addr.street_address || ''} ${addr.street_address2 || ''}<br>
                    ${addr.postal_code || ''} ${addr.city || ''}<br>
                    ${addr.region || ''} ${addr.country || ''}
                </div>
            </div>
        `;
    }
    
    // Raw data (for debugging)
    html += `
        <div class="data-item full-width">
            <div class="data-label">Raw Response Data</div>
            <div class="data-value">
                <pre class="raw-data">${JSON.stringify(identityData, null, 2)}</pre>
            </div>
        </div>
    `;
    
    dataContent.innerHTML = html;
    successScreen.classList.remove('hidden');
}

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
    
    // Check for identity request ID in URL (from callback)
    const urlParams = new URLSearchParams(window.location.search);
    const identityRequestId = urlParams.get('identity_request_id');
    const state = urlParams.get('state');
    
    if (identityRequestId) {
        console.log('Identity request ID found in URL:', identityRequestId, 'State:', state);
        // Fetch and display identity data
        fetchAndDisplayIdentityData(identityRequestId);
        // Clean up URL after a short delay to ensure data is loaded
        setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 100);
    } else if (urlParams.get('reset') === 'true') {
        // Reset verification
        localStorage.removeItem(VERIFICATION_KEY);
        localStorage.removeItem(VERIFICATION_TIMESTAMP_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);
        showAgeVerification();
    } else if (checkVerificationStatus()) {
        // Already verified
        showMainContent();
    } else {
        // Show age verification
        showAgeVerification();
    }
    
    // Klarna Identity API button
    const klarnaVerifyBtn = document.getElementById('klarna-verify-btn');
    if (klarnaVerifyBtn) {
        klarnaVerifyBtn.addEventListener('click', initiateKlarnaIdentityFlow);
    }
    
    // Success screen buttons
    const continueBtn = document.getElementById('continue-btn');
    const resetBtn = document.getElementById('reset-btn');
    
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            const successScreen = document.getElementById('success-screen');
            if (successScreen) successScreen.classList.add('hidden');
            showMainContent();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            localStorage.removeItem(VERIFICATION_KEY);
            localStorage.removeItem(VERIFICATION_TIMESTAMP_KEY);
            const successScreen = document.getElementById('success-screen');
            if (successScreen) successScreen.classList.add('hidden');
            showAgeVerification();
        });
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
    
    // Make calculateAge available globally for displayCustomerData
    window.calculateAge = calculateAge;
    
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
