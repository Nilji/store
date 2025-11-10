import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
const usernameInput = document.getElementById('username');
const usernameGroup = document.getElementById('usernameGroup');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

let isSignUpMode = false;

// Username validation - only numbers, max 6 digits
if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
        // Remove any non-numeric characters
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        // Limit to 6 digits
        if (e.target.value.length > 6) {
            e.target.value = e.target.value.slice(0, 6);
        }
    });
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
            if (usernameGroup) usernameGroup.style.display = 'block';
            if (usernameInput) usernameInput.required = true;
        } else {
            submitBtn.textContent = 'Sign In';
            signUpBtn.textContent = 'Create New Account';
            document.querySelector('h1').textContent = 'Welcome Back';
            document.querySelector('.subtitle').textContent = 'Sign in to your account';
            if (usernameGroup) usernameGroup.style.display = 'none';
            if (usernameInput) {
                usernameInput.required = false;
                usernameInput.value = '';
            }
        }
        
        hideMessages();
    });
    
// Play sound (max 3 seconds)
function playSound() {
    try {
        const audio = document.getElementById('loginSound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
            // Stop after 3 seconds
            setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
            }, 3000);
        }
    } catch (error) {
        console.error('Error playing sound:', error);
    }
}

// Generate 6-digit verification code
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store verification code in Firestore
async function storeVerificationCode(email, code) {
    try {
        if (!window.db) return false;
        
        const codeRef = doc(window.db, 'verificationCodes', email);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 1); // 1 minute expiry
        
        await setDoc(codeRef, {
            code: code,
            email: email,
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt.toISOString(),
            verified: false
        });
        
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
            // In production, integrate with email service (SendGrid, Mailgun, etc.)
            // For now, log to console and store in session
            console.log('Verification code for', email, ':', code);
            
            // Store code in sessionStorage for testing
            sessionStorage.setItem('verificationCode', code);
            
            // Simulate sending email (in production, call your email service)
            // For testing, the code is logged to console
            return { success: true, code: code };
        }
        
        return { success: false };
    } catch (error) {
        console.error('Error sending verification code:', error);
        return { success: false, error: error.message };
    }
}

// Check if username already exists
async function checkUsernameExists(username) {
    try {
        if (!window.db || !username) return false;
        
        const usersRef = collection(window.db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);
        
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
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
    const username = usernameInput ? usernameInput.value.trim() : '';
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    // Validate username for sign up
    if (isSignUpMode) {
        if (!username) {
            showError('Please enter a username');
            return;
        }
        
        if (username.length !== 6) {
            showError('Username must be exactly 6 digits');
            return;
        }
        
        if (!/^\d{6}$/.test(username)) {
            showError('Username must contain only numbers (0-9)');
            return;
        }
        
        // Check if username already exists
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            showError('Username already taken. Please choose another one.');
            return;
        }
    }
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = isSignUpMode ? 'Signing Up...' : 'Signing In...';
    
    try {
        if (isSignUpMode) {
            // Sign up - send verification code first
            playSound(); // Play sound on signup attempt
            
            // Store email and username for verification page
            sessionStorage.setItem('pendingEmail', email);
            sessionStorage.setItem('pendingUsername', username);
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
            // Sign in - verify credentials first, then send code
            playSound(); // Play sound on login attempt
            
            try {
                // Try to sign in to verify credentials
                await signInWithEmailAndPassword(window.auth, email, password);
                
                // Credentials are correct, now send verification code
                submitBtn.textContent = 'Sending verification code...';
                
                // Sign out temporarily (we'll sign in again after verification)
                await window.auth.signOut();
                
                // Store email and password for after verification
                sessionStorage.setItem('pendingEmail', email);
                sessionStorage.setItem('pendingPassword', password);
                sessionStorage.setItem('isLogin', 'true');
                
                // Send verification code
                const codeResult = await sendVerificationCode(email);
                
                if (codeResult.success) {
                    showSuccess('Verification code sent to your email! Redirecting...');
                    setTimeout(() => {
                        window.location.href = 'code.html';
                    }, 1000);
                } else {
                    showError('Failed to send verification code. Please try again.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Sign In';
                }
            } catch (authError) {
                // Credentials are wrong
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

