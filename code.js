import { doc, setDoc, getDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Wait for Firebase to initialize
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkFirebase = setInterval(() => {
            attempts++;
            if (window.firebaseInitialized && window.auth && window.db) {
                clearInterval(checkFirebase);
                resolve();
            } else if (attempts > 50) {
                clearInterval(checkFirebase);
                reject(new Error('Firebase initialization timeout.'));
            }
        }, 100);
    });
}

// Generate 6-digit code
function generateCode() {
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

// Verify code
async function verifyCode(email, code) {
    try {
        if (!window.db) return false;
        
        const codeRef = doc(window.db, 'verificationCodes', email);
        const codeDoc = await getDoc(codeRef);
        
        if (!codeDoc.exists()) {
            return { valid: false, message: 'Code not found or expired' };
        }
        
        const codeData = codeDoc.data();
        const expiresAt = new Date(codeData.expiresAt);
        const now = new Date();
        
        if (now > expiresAt) {
            await deleteDoc(codeRef);
            return { valid: false, message: 'Code has expired' };
        }
        
        if (codeData.code !== code) {
            return { valid: false, message: 'Invalid code' };
        }
        
        if (codeData.verified) {
            return { valid: false, message: 'Code already used' };
        }
        
        // Mark as verified
        await setDoc(codeRef, {
            ...codeData,
            verified: true,
            verifiedAt: new Date().toISOString()
        }, { merge: true });
        
        return { valid: true };
    } catch (error) {
        console.error('Error verifying code:', error);
        return { valid: false, message: 'Error verifying code' };
    }
}

// Send verification code (simulated - in production, use email service)
async function sendVerificationCode(email) {
    try {
        const code = generateCode();
        const stored = await storeVerificationCode(email, code);
        
        if (stored) {
            // In production, send email here
            // For now, we'll store it and show in console
            console.log('Verification code for', email, ':', code);
            
            // Store in sessionStorage for testing (remove in production)
            sessionStorage.setItem('verificationCode', code);
            sessionStorage.setItem('verificationEmail', email);
            
            return { success: true, code: code };
        }
        
        return { success: false, message: 'Failed to generate code' };
    } catch (error) {
        console.error('Error sending verification code:', error);
        return { success: false, message: error.message };
    }
}

// Initialize
let timerInterval = null;
let resendTimerInterval = null;
let timerSeconds = 60;
let resendTimerSeconds = 300; // 5 minutes

const verificationForm = document.getElementById('verificationForm');
const codeInputs = ['code1', 'code2', 'code3', 'code4', 'code5', 'code6'];
const emailDisplay = document.getElementById('emailDisplay');
const timerText = document.getElementById('timer');
const resendTimer = document.getElementById('resendTimer');
const resendBtn = document.getElementById('resendBtn');
const resendText = document.getElementById('resendText');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const verifyBtn = document.getElementById('verifyBtn');

// Get email from sessionStorage
const email = sessionStorage.getItem('pendingEmail') || sessionStorage.getItem('verificationEmail') || '';

if (!email) {
    // Redirect to login if no email
    window.location.href = 'index.html';
}

// Display email
if (emailDisplay) {
    emailDisplay.textContent = email;
}

// Code input handling
codeInputs.forEach((inputId, index) => {
    const input = document.getElementById(inputId);
    if (input) {
        input.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // Move to next input
            if (e.target.value && index < codeInputs.length - 1) {
                document.getElementById(codeInputs[index + 1]).focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                document.getElementById(codeInputs[index - 1]).focus();
            }
        });
    }
});

// Start timer
function startTimer() {
    timerSeconds = 60;
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        timerSeconds--;
        if (timerText) {
            timerText.textContent = timerSeconds;
        }
        
        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            if (verifyBtn) verifyBtn.disabled = true;
            showError('Verification code has expired. Please request a new one.');
        }
    }, 1000);
}

// Start resend timer
function startResendTimer() {
    resendTimerSeconds = 300; // 5 minutes
    if (resendTimerInterval) clearInterval(resendTimerInterval);
    
    if (resendBtn) resendBtn.style.display = 'none';
    if (resendText) resendText.style.display = 'block';
    
    resendTimerInterval = setInterval(() => {
        resendTimerSeconds--;
        if (resendTimer) {
            const minutes = Math.floor(resendTimerSeconds / 60);
            const seconds = resendTimerSeconds % 60;
            resendTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (resendTimerSeconds <= 0) {
            clearInterval(resendTimerInterval);
            if (resendBtn) resendBtn.style.display = 'block';
            if (resendText) resendText.style.display = 'none';
        }
    }, 1000);
}

// Handle form submission
if (verificationForm) {
    verificationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideMessages();
        
        // Get code from inputs
        const code = codeInputs.map(id => document.getElementById(id).value).join('');
        
        if (code.length !== 6) {
            showError('Please enter the complete 6-digit code');
            return;
        }
        
        if (verifyBtn) verifyBtn.disabled = true;
        if (verifyBtn) verifyBtn.textContent = 'Verifying...';
        
        try {
            await waitForFirebase();
            const result = await verifyCode(email, code);
            
            if (result.valid) {
                showSuccess('Verification successful! Completing sign in...');
                
                // Complete the sign up or sign in process
                const isLogin = sessionStorage.getItem('isLogin') === 'true';
                const email = sessionStorage.getItem('pendingEmail');
                const password = sessionStorage.getItem('pendingPassword');
                const username = sessionStorage.getItem('pendingUsername');
                
                try {
                    if (isLogin) {
                        // Sign in
                        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                        await signInWithEmailAndPassword(window.auth, email, password);
                    } else {
                        // Sign up
                        const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
                        const uid = userCredential.user.uid;
                        
                        // Store username in Firestore
                        if (window.db && username) {
                            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                            const userRef = doc(window.db, 'users', uid);
                            await setDoc(userRef, {
                                email: email,
                                uid: uid,
                                username: username,
                                createdAt: new Date().toISOString(),
                                isBanned: false,
                                lastLogin: new Date().toISOString(),
                                emailVerified: true
                            }, { merge: true });
                        }
                    }
                    
                    // Clean up
                    sessionStorage.setItem('emailVerified', 'true');
                    sessionStorage.removeItem('pendingEmail');
                    sessionStorage.removeItem('pendingPassword');
                    sessionStorage.removeItem('pendingUsername');
                    sessionStorage.removeItem('verificationCode');
                    sessionStorage.removeItem('isLogin');
                    
                    setTimeout(() => {
                        window.location.href = 'main.html';
                    }, 1000);
                } catch (authError) {
                    showError('Error completing authentication: ' + authError.message);
                    if (verifyBtn) verifyBtn.disabled = false;
                    if (verifyBtn) verifyBtn.textContent = 'Verify Code';
                }
            } else {
                showError(result.message || 'Invalid verification code');
                if (verifyBtn) verifyBtn.disabled = false;
                if (verifyBtn) verifyBtn.textContent = 'Verify Code';
                // Clear inputs
                codeInputs.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.value = '';
                });
                document.getElementById('code1').focus();
            }
        } catch (error) {
            showError('Error verifying code: ' + error.message);
            if (verifyBtn) verifyBtn.disabled = false;
            if (verifyBtn) verifyBtn.textContent = 'Verify Code';
        }
    });
}

// Handle resend code
if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
        try {
            await waitForFirebase();
            hideMessages();
            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';
            
            const result = await sendVerificationCode(email);
            
            if (result.success) {
                showSuccess('Verification code sent to your email!');
                // Reset timers
                startTimer();
                startResendTimer();
                // Clear inputs
                codeInputs.forEach(id => {
                    const input = document.getElementById(id);
                    if (input) input.value = '';
                });
                document.getElementById('code1').focus();
            } else {
                showError(result.message || 'Failed to send verification code');
            }
            
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
        } catch (error) {
            showError('Error sending code: ' + error.message);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend Code';
        }
    });
}

function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');
        if (successMessage) successMessage.classList.remove('show');
    }
}

function showSuccess(message) {
    if (successMessage) {
        successMessage.textContent = message;
        successMessage.classList.add('show');
        if (errorMessage) errorMessage.classList.remove('show');
    }
}

function hideMessages() {
    if (errorMessage) errorMessage.classList.remove('show');
    if (successMessage) successMessage.classList.remove('show');
}

// Initialize on load
waitForFirebase().then(() => {
    // Send initial code
    sendVerificationCode(email).then(result => {
        if (result.success) {
            showSuccess('Verification code sent to your email!');
            startTimer();
            startResendTimer();
        } else {
            showError('Failed to send verification code');
        }
    });
    
    // Focus first input
    document.getElementById('code1').focus();
}).catch(error => {
    showError('Initialization error: ' + error.message);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (timerInterval) clearInterval(timerInterval);
    if (resendTimerInterval) clearInterval(resendTimerInterval);
});

