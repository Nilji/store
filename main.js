import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Admin email list - Add your admin emails here
const ADMIN_EMAILS = [
    'admin@nexza.com',
    'developer@nexza.com',
    'rijanjoshi66@gmail.com',
    'xrta605@gmail.com'
    // Add more admin emails as needed
];

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

// Navigation functionality
function initializeNavigation() {
    const navToggleEl = document.getElementById('navToggle');
    const navMenuEl = document.getElementById('navMenu');
    const navLinksEl = document.querySelectorAll('.nav-link');
    const contentSectionsEl = document.querySelectorAll('.content-section');
    const contactFormEl = document.querySelector('.contact-form');
    
    // Mobile menu toggle
    if (navToggleEl && navMenuEl) {
        navToggleEl.addEventListener('click', () => {
            navMenuEl.classList.toggle('active');
        });
    }
    
    // Handle navigation links
    if (navLinksEl.length > 0) {
        navLinksEl.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const sectionId = link.getAttribute('data-section');
                
                if (sectionId) {
                    // Remove active class from all links and sections
                    navLinksEl.forEach(l => l.classList.remove('active'));
                    contentSectionsEl.forEach(s => s.classList.remove('active'));
                    
                    // Add active class to clicked link and corresponding section
                    link.classList.add('active');
                    const targetSection = document.getElementById(sectionId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                    }
                    
                    // Close mobile menu if open
                    if (navMenuEl) {
                        navMenuEl.classList.remove('active');
                    }
                }
            });
        });
    }
    
    // Handle contact form submission
    if (contactFormEl) {
        contactFormEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('contactName');
            const email = document.getElementById('contactEmail');
            const message = document.getElementById('contactMessage');
            
            // Simple form validation
            if (name && email && message && name.value && email.value && message.value) {
                alert('Thank you for your message! We will get back to you soon.');
                contactFormEl.reset();
            } else {
                alert('Please fill in all fields.');
            }
        });
    }
    
    // Handle "Add to Cart" buttons
    const buyButtons = document.querySelectorAll('.btn-buy');
    buyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const productCard = button.closest('.product-card');
            if (productCard) {
                const productName = productCard.querySelector('h3');
                if (productName) {
                    alert(`${productName.textContent} added to cart!`);
                }
            }
        });
    });
}

// Authentication functionality
function initializeAuth() {
    // Wait for Firebase to initialize
    waitForFirebase().then(() => {
        const userEmailEl = document.getElementById('userEmail');
        const displayEmailEl = document.getElementById('displayEmail');
        const userIdEl = document.getElementById('userId');
        const userInitialEl = document.getElementById('userInitial');
        const logoutBtnEl = document.getElementById('logoutBtn');
        const errorMsgEl = document.getElementById('errorMessage');
        
        if (!window.auth) {
            if (errorMsgEl) showError('Firebase Auth is not initialized. Please check your configuration.');
            return;
        }
        
        // Check authentication state
        onAuthStateChanged(window.auth, async (user) => {
            if (user) {
                // User is signed in
                const email = user.email;
                const uid = user.uid;
                
                // Check if user is banned
                const isBanned = await checkUserBanStatus(uid);
                if (isBanned) {
                    await signOut(window.auth);
                    alert('Your account has been banned. Please contact support.');
                    window.location.href = 'index.html';
                    return;
                }
                
                // Store user data in Firestore
                await storeUserData(uid, email);
                
                // Display user information
                if (userEmailEl) userEmailEl.textContent = email;
                if (displayEmailEl) displayEmailEl.textContent = email;
                if (userIdEl) userIdEl.textContent = uid;
                
                // Set user initial (first letter of email)
                if (email && userInitialEl) {
                    userInitialEl.textContent = email.charAt(0).toUpperCase();
                }
                
                // Check if user is admin and show developer button
                checkAdminAccess(email);
                
                hideError();
            } else {
                // User is not signed in, redirect to login
                window.location.href = 'index.html';
            }
        });
        
        // Handle logout
        if (logoutBtnEl) {
            logoutBtnEl.addEventListener('click', async () => {
                try {
                    await signOut(window.auth);
                    // Redirect will happen automatically via onAuthStateChanged
                    window.location.href = 'index.html';
                } catch (error) {
                    showError('Error signing out: ' + error.message);
                }
            });
        }
    }).catch((error) => {
        const errorMsgEl = document.getElementById('errorMessage');
        if (errorMsgEl) {
            showError(error.message);
        }
    });
}

function showError(message) {
    const errorMsgEl = document.getElementById('errorMessage');
    if (errorMsgEl) {
        errorMsgEl.textContent = message;
        errorMsgEl.classList.add('show');
    }
}

function hideError() {
    const errorMsgEl = document.getElementById('errorMessage');
    if (errorMsgEl) {
        errorMsgEl.classList.remove('show');
    }
}

// Check if user is admin
function checkAdminAccess(email) {
    const developerBtn = document.getElementById('developerBtn');
    if (!developerBtn) return;
    
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
        developerBtn.classList.add('active');
        // Remove existing listeners to avoid duplicates
        const newBtn = developerBtn.cloneNode(true);
        developerBtn.parentNode.replaceChild(newBtn, developerBtn);
        // Add click listener to new button
        document.getElementById('developerBtn').addEventListener('click', () => {
            window.location.href = 'admin.html';
        });
    } else {
        developerBtn.classList.remove('active');
    }
}

// Store user data in Firestore
async function storeUserData(uid, email) {
    try {
        if (!window.db) return;
        
        const userRef = doc(window.db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Create new user document
            await setDoc(userRef, {
                email: email,
                uid: uid,
                createdAt: new Date().toISOString(),
                isBanned: false,
                isAdmin: ADMIN_EMAILS.includes(email.toLowerCase()),
                lastLogin: new Date().toISOString()
            });
        } else {
            // Update last login
            await updateDoc(userRef, {
                lastLogin: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error storing user data:', error);
    }
}

// Check if user is banned
async function checkUserBanStatus(uid) {
    try {
        if (!window.db) return false;
        
        const userRef = doc(window.db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return userData.isBanned === true;
        }
        return false;
    } catch (error) {
        console.error('Error checking ban status:', error);
        return false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeAuth();
});
