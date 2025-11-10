import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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

// Generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store verification code (sessionStorage primary, Firestore optional)
async function storeVerificationCode(email, code) {
    try {
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + 60); // 1 minute expiry
        
        sessionStorage.setItem('verificationCode', code);
        sessionStorage.setItem('verificationEmail', email);
        sessionStorage.setItem('codeExpiresAt', expiresAt.toISOString());
        
        if (window.db) {
            try {
                const codeRef = doc(window.db, 'verificationCodes', email);
                await setDoc(codeRef, {
                    code: code,
                    email: email,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    verified: false
                });
            } catch (error) {
                console.error('Error storing verification code in Firestore (fallback to sessionStorage):', error);
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error storing verification code:', error);
        return false;
    }
}

// Send verification code via email (simulated)
async function sendVerificationCode(email) {
    try {
        const code = generateVerificationCode();
        const stored = await storeVerificationCode(email, code);
        
        if (stored) {
            console.log('=== VERIFICATION CODE (FOR TESTING) ===');
            console.log('Email:', email);
            console.log('Code:', code);
            console.log('Code expires in 1 minute');
            console.log('=======================================');
            return { success: true, code: code };
        }
        
        return { success: false };
    } catch (error) {
        console.error('Error sending verification code:', error);
        return { success: false, error: error.message };
    }
}

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
            // Sign up - send verification code first
            sessionStorage.setItem('pendingEmail', email);
            sessionStorage.setItem('pendingPassword', password);
            
            // Send verification code
            submitBtn.textContent = 'Sending verification code...';
            const codeResult = await sendVerificationCode(email);
            
            if (codeResult.success) {
                showSuccess('Verification code sent to your email! Redirecting...');
                // Redirect to verification page
                setTimeout(() => {
                    window.location.href = 'code.html';
                }, 1000);
            } else {
                showError('Failed to send verification code. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        } else {
            // Sign in without verification code
            try {
                await signInWithEmailAndPassword(window.auth, email, password);
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

