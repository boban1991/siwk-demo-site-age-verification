// Age Verification State Management
const VERIFICATION_KEY = 'age_verified';
const VERIFICATION_TIMESTAMP_KEY = 'age_verified_timestamp';
const VERIFICATION_EXPIRY_HOURS = 24; // Verification expires after 24 hours

// Cart Management
const CART_KEY = 'pharmacy_cart';

function getCart() {
    const cartJson = localStorage.getItem(CART_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(productId, productName, price, ageRestricted) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: parseFloat(price),
            ageRestricted: ageRestricted === 'true',
            quantity: 1
        });
    }
    
    saveCart(cart);
    updateCartUI();
    return cart;
}

function removeFromCart(productId) {
    const cart = getCart();
    const filteredCart = cart.filter(item => item.id !== productId);
    saveCart(filteredCart);
    updateCartUI();
    return filteredCart;
}

function updateCartQuantity(productId, quantity) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (quantity <= 0) {
            return removeFromCart(productId);
        }
        item.quantity = quantity;
        saveCart(cart);
        updateCartUI();
    }
    return cart;
}

function getCartTotal() {
    const cart = getCart();
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

function hasAgeRestrictedProducts() {
    const cart = getCart();
    return cart.some(item => item.ageRestricted);
}

function updateCartUI() {
    const cart = getCart();
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountEl = document.getElementById('cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = cartCount;
        cartCountEl.style.display = cartCount > 0 ? 'inline-flex' : 'none';
    }
    
    // Update cart modal
    const cartItemsEl = document.getElementById('cart-items');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    
    if (cartItemsEl) {
        if (cart.length === 0) {
            cartItemsEl.innerHTML = '<div class="cart-empty">Your cart is empty</div>';
        } else {
            cartItemsEl.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>$${item.price.toFixed(2)} ${item.ageRestricted ? '<span class="age-restricted-badge">18+</span>' : ''}</p>
                    </div>
                    <div class="cart-item-controls">
                        <button class="cart-qty-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span class="cart-qty">${item.quantity}</span>
                        <button class="cart-qty-btn" onclick="updateCartQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        <button class="cart-remove-btn" onclick="removeFromCart('${item.id}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }
    
    if (cartTotalPriceEl) {
        cartTotalPriceEl.textContent = `$${getCartTotal().toFixed(2)}`;
    }
}

// Make functions available globally for onclick handlers
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;

// Checkout function - must be defined before DOMContentLoaded
function proceedToCheckout() {
    try {
        console.log('proceedToCheckout called');
        // This would normally redirect to a checkout page
        // For demo, we'll show a success message
        alert('Checkout would proceed here. This is a demo - no actual payment will be processed.');
        // Clear cart after checkout
        saveCart([]);
        updateCartUI();
        const cartModal = document.getElementById('cart-modal');
        if (cartModal) cartModal.classList.add('hidden');
        sessionStorage.removeItem('checkout_pending');
    } catch (error) {
        console.error('Error in proceedToCheckout:', error);
        alert('An error occurred during checkout. Please try again.');
    }
}

// Make proceedToCheckout globally accessible
window.proceedToCheckout = proceedToCheckout;

// Age verification UI functions - must be globally accessible
function showAgeVerification() {
    const ageModal = document.getElementById('age-verification-modal');
    const mainContent = document.getElementById('main-content');
    if (ageModal) ageModal.style.display = 'flex';
    if (mainContent) mainContent.classList.add('hidden');
}

function showMainContent() {
    const ageModal = document.getElementById('age-verification-modal');
    const mainContent = document.getElementById('main-content');
    if (ageModal) ageModal.style.display = 'none';
    if (mainContent) mainContent.classList.remove('hidden');
}

// Make functions globally accessible
window.showAgeVerification = showAgeVerification;
window.showMainContent = showMainContent;

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
        <svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: white;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="32" stroke-dashoffset="32">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-16;-32;-32" repeatCount="indefinite"/>
            </circle>
        </svg>
        <span class="klarna-button-text">Creating request...</span>
        <span class="klarna-pill">Klarna</span>
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
            <span class="klarna-button-text">Continue with</span>
            <span class="klarna-pill">Klarna</span>
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
    
    // Name - Most prominent
    if (customerProfile?.name) {
        const fullName = `${customerProfile.name.given_name || ''} ${customerProfile.name.family_name || ''}`.trim();
        if (fullName) {
            html += `
                <div class="data-item data-item-featured">
                    <div class="data-item-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="data-item-content">
                        <div class="data-label">Full Name</div>
                        <div class="data-value data-value-large">${fullName}</div>
                    </div>
                    ${customerProfile.name.name_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                </div>
            `;
        }
    }
    
    // Date of Birth & Age - Important for pharmacy
    if (customerProfile?.date_of_birth) {
        const dob = customerProfile.date_of_birth.date_of_birth;
        const age = dob ? calculateAgeFromDOB(dob) : null;
        if (dob) {
            const formattedDate = new Date(dob).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            html += `
                <div class="data-item">
                    <div class="data-item-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="data-item-content">
                        <div class="data-label">Date of Birth</div>
                        <div class="data-value">${formattedDate}${age !== null ? ` <span class="age-badge">Age: ${age}</span>` : ''}</div>
                    </div>
                    ${customerProfile.date_of_birth.date_of_birth_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
                </div>
            `;
        }
    }
    
    // Email
    if (customerProfile?.email?.email) {
        html += `
            <div class="data-item">
                <div class="data-item-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="data-item-content">
                    <div class="data-label">Email Address</div>
                    <div class="data-value">${customerProfile.email.email}</div>
                </div>
                ${customerProfile.email.email_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `;
    }
    
    // Phone
    if (customerProfile?.phone?.phone) {
        html += `
            <div class="data-item">
                <div class="data-item-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="data-item-content">
                    <div class="data-label">Phone Number</div>
                    <div class="data-value">${customerProfile.phone.phone}</div>
                </div>
                ${customerProfile.phone.phone_verified ? '<span class="verified-badge">✓ Verified</span>' : ''}
            </div>
        `;
    }
    
    // Billing Address
    if (customerProfile?.billing_address) {
        const addr = customerProfile.billing_address;
        const addressParts = [
            addr.street_address,
            addr.street_address2,
            `${addr.postal_code || ''} ${addr.city || ''}`.trim(),
            `${addr.region || ''} ${addr.country || ''}`.trim()
        ].filter(part => part && part.trim());
        
        if (addressParts.length > 0) {
            html += `
                <div class="data-item">
                    <div class="data-item-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 13C13.6569 13 15 11.6569 15 10C15 8.34315 13.6569 7 12 7C10.3431 7 9 8.34315 9 10C9 11.6569 10.3431 13 12 13Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="data-item-content">
                        <div class="data-label">Billing Address</div>
                        <div class="data-value">${addressParts.join('<br>')}</div>
                    </div>
                </div>
            `;
        }
    }
    
    // Customer ID (less prominent)
    if (customerProfile?.customer_id?.customer_id) {
        html += `
            <div class="data-item data-item-minor">
                <div class="data-item-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 6H5C4.46957 6 3.96086 6.21071 3.58579 6.58579C3.21071 6.96086 3 7.46957 3 8V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H16C16.5304 21 17.0391 20.7893 17.4142 20.4142C17.7893 20.0391 18 19.5304 18 19V14M21 3H15M21 3L18 6M21 3L18 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="data-item-content">
                    <div class="data-label">Customer ID</div>
                    <div class="data-value data-value-small">${customerProfile.customer_id.customer_id}</div>
                </div>
            </div>
        `;
    }
    
    dataContent.innerHTML = html;
    successScreen.classList.remove('hidden');
    
    // Scroll to top of success screen
    successScreen.scrollTo({ top: 0, behavior: 'smooth' });
    
    // If checkout was pending, update button text and proceed after verification
    if (sessionStorage.getItem('checkout_pending') === 'true') {
        // Wait a moment for user to see success, then update button
        setTimeout(() => {
            const continueBtn = document.getElementById('continue-btn');
            if (continueBtn) {
                const span = continueBtn.querySelector('span');
                if (span) {
                    span.textContent = 'Continue to Checkout';
                } else {
                    continueBtn.innerHTML = '<span>Continue to Checkout</span>';
                }
            }
        }, 500);
    }
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
    }
    
    // Always show main content (no automatic age verification)
    // Age verification will be triggered during checkout if needed
    showMainContent();
    
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
            
            // If checkout was pending, proceed to checkout
            const checkoutPending = sessionStorage.getItem('checkout_pending') === 'true';
            console.log('Continue button clicked, checkout pending:', checkoutPending);
            
            if (checkoutPending) {
                console.log('Proceeding to checkout from success screen');
                proceedToCheckout();
            } else {
                showMainContent();
            }
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
    
    // Functions are now defined globally above, but we can still use local references
    // showAgeVerification and showMainContent are now global functions
    
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

// Product Filter Functionality
document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.game-card'); // Using same class name for products
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active filter button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filter = button.getAttribute('data-filter');
            
            // Filter product cards
            productCards.forEach(card => {
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
    
    // Initialize product cards with transition
    productCards.forEach(card => {
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
            if (button.textContent.includes('View Products') || button.textContent.includes('Products')) {
                const productsSection = document.getElementById('products');
                if (productsSection) {
                    const offset = 80;
                    const elementPosition = productsSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            } else {
                // "Shop Now" button - could open product catalog
                console.log('Shop Now clicked');
            }
        });
    });
    
    // Handle "Add to Cart" buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const productCard = button.closest('.game-card');
            if (productCard) {
                const productId = productCard.getAttribute('data-product-id');
                const productName = productCard.getAttribute('data-product-name');
                const price = productCard.getAttribute('data-product-price');
                const ageRestricted = productCard.getAttribute('data-age-restricted');
                
                addToCart(productId, productName, price, ageRestricted);
                
                // Show cart modal
                const cartModal = document.getElementById('cart-modal');
                if (cartModal) {
                    cartModal.classList.remove('hidden');
                }
                
                // Visual feedback
                button.textContent = 'Added!';
                button.style.background = 'var(--success-color)';
                setTimeout(() => {
                    button.textContent = 'Add to Cart';
                    button.style.background = '';
                }, 1000);
            }
        });
    });
    
    // Handle product and offer buttons (non-cart buttons)
    gameButtons.forEach(button => {
        if (!button.classList.contains('add-to-cart-btn')) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Product/action clicked:', button.textContent);
            });
        }
    });
    
    // Cart modal functionality
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCartBtn = document.getElementById('close-cart-btn');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartOverlay = document.querySelector('.cart-overlay');
    
    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', () => {
            cartModal.classList.remove('hidden');
        });
    }
    
    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () => {
            if (cartModal) cartModal.classList.add('hidden');
        });
    }
    
    if (cartOverlay) {
        cartOverlay.addEventListener('click', () => {
            if (cartModal) cartModal.classList.add('hidden');
        });
    }
    
    // Checkout button - trigger age verification if needed
    // Use event delegation to ensure it works even if button is recreated
    const handleCheckout = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Checkout button clicked');
        
        const cart = getCart();
        console.log('Cart:', cart);
        
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }
        
        // Check if cart has age-restricted products
        const hasAgeRestricted = hasAgeRestrictedProducts();
        console.log('Has age-restricted products:', hasAgeRestricted);
        
        if (hasAgeRestricted) {
            // Check if user is already verified
            const isVerified = checkVerificationStatus();
            console.log('Is verified:', isVerified);
            
            if (!isVerified) {
                // Show age verification modal
                if (cartModal) cartModal.classList.add('hidden');
                showAgeVerification();
                // Store that we're in checkout flow
                sessionStorage.setItem('checkout_pending', 'true');
            } else {
                // Already verified, proceed to checkout
                console.log('Proceeding to checkout (already verified)');
                proceedToCheckout();
            }
        } else {
            // No age-restricted products, proceed directly to checkout
            console.log('Proceeding to checkout (no age-restricted products)');
            proceedToCheckout();
        }
    };
    
    // Attach directly if button exists
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', handleCheckout);
        console.log('Checkout button event listener attached');
    } else {
        console.error('Checkout button not found on page load!');
    }
    
    // Also use event delegation on the cart modal as a fallback
    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target && (e.target.id === 'checkout-btn' || e.target.closest('#checkout-btn'))) {
                handleCheckout(e);
            }
        });
    }
    
    // Initialize cart UI
    updateCartUI();
    
    // Debug: Log button status after a short delay
    setTimeout(() => {
        const checkoutBtnCheck = document.getElementById('checkout-btn');
        console.log('Checkout button check after init:', checkoutBtnCheck);
        if (checkoutBtnCheck) {
            console.log('Button is visible:', checkoutBtnCheck.offsetParent !== null);
            console.log('Button is disabled:', checkoutBtnCheck.disabled);
            console.log('Button computed style:', window.getComputedStyle(checkoutBtnCheck).pointerEvents);
        }
    }, 1000);
});

// Add spinner animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .klarna-button .spinner {
        animation: spin 1s linear infinite;
        color: #FFFFFF;
    }
`;
document.head.appendChild(style);
