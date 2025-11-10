import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

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
        
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = isSignUpMode ? 'Signing Up...' : 'Signing In...';
        
        try {
            if (isSignUpMode) {
                // Sign up
                await createUserWithEmailAndPassword(window.auth, email, password);
                showSuccess('Account created successfully! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 1000);
            } else {
                // Sign in
                await signInWithEmailAndPassword(window.auth, email, password);
                showSuccess('Sign in successful! Redirecting...');
                setTimeout(() => {
                    window.location.href = 'main.html';
                }, 1000);
            }
        } catch (error) {
            let errorMsg = 'An error occurred';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMsg = 'No account found with this email';
                    break;
                case 'auth/wrong-password':
                    errorMsg = 'Incorrect password';
                    break;
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
                case 'auth/invalid-api-key':
                    errorMsg = 'Invalid Firebase API Key. Please check your Firebase configuration.';
                    break;
                case 'auth/api-key-not-valid':
                    errorMsg = 'Firebase API Key is not valid. Please get the correct Web API Key from Firebase Console.';
                    break;
                default:
                    errorMsg = error.message || 'An error occurred during authentication';
            }
            
            showError(errorMsg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
        }
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    successMessage.classList.remove('show');
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

