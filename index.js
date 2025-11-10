import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Wait for Firebase to initialize
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkFirebase = setInterval(() => {
            attempts++;
            if (window.firebaseInitialized && window.auth) {
                clearInterval(checkFirebase);
                resolve();
            } else if (attempts > 50) { // 5 seconds timeout
                clearInterval(checkFirebase);
                reject(new Error('Firebase initialization timeout. Please check your Firebase configuration.'));
            }
        }, 100);
    });
}

const loginForm = document.getElementById('loginForm');
const signUpBtn = document.getElementById('signUpBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

let isSignUpMode = false;

const allowedEmailDomains = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.in',
    'yahoo.co.uk',
    'outlook.com',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'protonmail.com'
];

const blockedEmailDomains = [
    'mailinator.com',
    'tempmail.com',
    '10minutemail.com',
    'guerrillamail.com',
    'sharklasers.com',
    'trashmail.com',
    'yopmail.com',
    'fakeinbox.com',
    'temporary-mail.net',
    'mintemail.com',
    'dispostable.com',
    'getairmail.com'
];

function isEmailAllowed(email) {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1].toLowerCase();
    if (!domain) return false;
    if (blockedEmailDomains.includes(domain)) return false;
    if (allowedEmailDomains.includes(domain)) return true;
    // Allow other domains that look legitimate (e.g. company domains), but block obvious temporary ones
    const trustedTlds = ['.com', '.net', '.org', '.edu', '.gov'];
    return trustedTlds.some(tld => domain.endsWith(tld));
}

// Initialize after Firebase is ready
waitForFirebase().then(() => {
    initializeApp();
}).catch((error) => {
    showError(error.message);
    loginForm.querySelector('button[type="submit"]').disabled = true;
    signUpBtn.disabled = true;
});

function initializeApp() {
    if (!window.auth) {
        showError('Firebase Auth is not initialized. Please check your configuration.');
        return;
    }
    
    // Toggle between sign in and sign up
    signUpBtn.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        
        if (isSignUpMode) {
            submitBtn.textContent = 'Sign Up';
            signUpBtn.textContent = 'Already have an account? Sign In';
            document.querySelector('h1').textContent = 'Create Account';
            document.querySelector('.subtitle').textContent = 'Sign up to get started';
        } else {
            submitBtn.textContent = 'Sign In';
            signUpBtn.textContent = 'Create New Account';
            document.querySelector('h1').textContent = 'Welcome Back';
            document.querySelector('.subtitle').textContent = 'Sign in to your account';
        }
        
        hideMessages();
    });
    
// (sound system removed)

// OTP verification system removed for direct signup

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();
    
    if (!window.auth) {
        showError('Firebase Auth is not initialized. Please check your Firebase configuration, especially the apiKey.');
        return;
    }
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    // Additional validation for sign up
    if (isSignUpMode) {
        if (!isEmailAllowed(email)) {
            showError('Please use a trusted email provider (Gmail, Yahoo, Microsoft, iCloud, etc.). Temporary email domains are not allowed.');
            return;
        }
    }
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpMode ? 'Signing Up...' : 'Signing In...';
    
    try {
        if (isSignUpMode) {
            // Direct sign up without email OTP
            try {
                await createUserWithEmailAndPassword(window.auth, email, password);
                // Set session for mobile if needed
                try {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
                    if (isMobile) {
                        localStorage.setItem('sessionStart', Date.now().toString());
                    }
                } catch (e) {}
                showSuccess('Account created! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 800);
            } catch (authError) {
                let errorMsg = authError.message || 'Failed to create account';
                if (authError.code === 'auth/email-already-in-use') errorMsg = 'An account with this email already exists';
                if (authError.code === 'auth/weak-password') errorMsg = 'Password is too weak';
                showError(errorMsg);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        } else {
            // Sign in without verification code
            try {
                await signInWithEmailAndPassword(window.auth, email, password);
                // Set/refresh session start time for mobile session expiry
                try {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
                    if (isMobile) {
                        localStorage.setItem('sessionStart', Date.now().toString());
                    }
                } catch (e) {}
                showSuccess('Sign in successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 1000);
            } catch (authError) {
                let errorMsg = 'An error occurred';

                switch (authError.code) {
                    case 'auth/user-not-found':
                        errorMsg = 'No account found with this email';
                        break;
                    case 'auth/wrong-password':
                        errorMsg = 'Incorrect email or password';
                        break;
                    case 'auth/invalid-email':
                        errorMsg = 'Invalid email address';
                        break;
                    case 'auth/network-request-failed':
                        errorMsg = 'Network error. Please check your connection';
                        break;
                    default:
                        errorMsg = authError.message || 'Invalid email or password';
                }

                showError(errorMsg);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        }
    } catch (error) {
        let errorMsg = 'An error occurred';
        
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMsg = 'An account with this email already exists';
                break;
            case 'auth/invalid-email':
                errorMsg = 'Invalid email address';
                break;
            case 'auth/weak-password':
                errorMsg = 'Password is too weak';
                break;
            case 'auth/network-request-failed':
                errorMsg = 'Network error. Please check your connection';
                break;
            default:
                errorMsg = error.message || 'An error occurred during authentication';
        }
        
        showError(errorMsg);
        submitBtn.disabled = false;
        submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
    }
});
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
    // sound removed
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.classList.add('show');
    errorMessage.classList.remove('show');
}

function hideMessages() {
    errorMessage.classList.remove('show');
    successMessage.classList.remove('show');
}

