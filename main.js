import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, getDoc, setDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

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
        contactFormEl.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameEl = document.getElementById('contactName');
            const emailEl = document.getElementById('contactEmail');
            const messageEl = document.getElementById('contactMessage');
            
            const name = nameEl ? nameEl.value.trim() : '';
            const email = emailEl ? emailEl.value.trim() : '';
            const message = messageEl ? messageEl.value.trim() : '';
            
            // Simple form validation
            if (!name || !email || !message) {
                alert('Please fill in all fields.');
                return;
            }
            
            // Store message in Firestore
            try {
                if (window.db) {
                    const { collection, addDoc, doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                    const messagesRef = collection(window.db, 'contactMessages');
                    
                    await addDoc(messagesRef, {
                        name: name,
                        email: email,
                        message: message,
                        createdAt: new Date().toISOString(),
                        read: false
                    });
                    
                    alert('Thank you for your message! We will get back to you soon.');
                    contactFormEl.reset();
                } else {
                    alert('Thank you for your message! We will get back to you soon.');
                    contactFormEl.reset();
                }
            } catch (error) {
                console.error('Error storing contact message:', error);
                alert('Thank you for your message! We will get back to you soon.');
                contactFormEl.reset();
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
                
                // Get user data from Firestore
                const userData = await getUserData(uid);
                const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
                
                // Store/update user data in Firestore
                await storeUserData(uid, email, isAdmin);
                
                // Display user information
                if (userEmailEl) userEmailEl.textContent = email;
                if (displayEmailEl) displayEmailEl.textContent = email;
                if (userIdEl) userIdEl.textContent = uid.substring(0, 6);
                
                // Set user initial (first letter of email)
                if (email && userInitialEl) {
                    userInitialEl.textContent = email.charAt(0).toUpperCase();
                }
                
                // Show developer badge and access level
                const developerBadge = document.getElementById('developerBadge');
                const userAccessLevel = document.getElementById('userAccessLevel');
                const userStatus = document.getElementById('userStatus');
                
                if (isAdmin) {
                    // Show developer badge
                    if (developerBadge) developerBadge.style.display = 'inline-flex';
                    if (userAccessLevel) {
                        userAccessLevel.textContent = 'VIP - Developer Access';
                        userAccessLevel.className = 'access-level vip';
                    }
                    if (userStatus) {
                        userStatus.textContent = '👑 Developer Account Active';
                        userStatus.style.color = '#f5576c';
                    }
                } else {
                    // Hide developer badge, show normal access
                    if (developerBadge) developerBadge.style.display = 'none';
                    if (userAccessLevel) {
                        userAccessLevel.textContent = 'Normal Access';
                        userAccessLevel.className = 'access-level normal';
                    }
                    if (userStatus) {
                        userStatus.textContent = '✓ Account Active';
                        userStatus.style.color = '#28a745';
                    }
                }
                
                // Check if user is admin and show developer button
                checkAdminAccess(email);

                // Start mobile session timeout (30 minutes)
                startMobileSessionTimer();

                // Load user messages and announcements
                try {
                    await Promise.all([loadUserInbox(uid), loadAnnouncements()]);
                } catch (e) {
                    console.warn('Notification load error', e);
                }
                
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

// Get user data from Firestore
async function getUserData(uid) {
    try {
        if (!window.db) return null;
        
        const userRef = doc(window.db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            return userDoc.data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

// Store user data in Firestore
async function storeUserData(uid, email, isAdmin) {
    try {
        if (!window.db) return;
        
        const userRef = doc(window.db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            // Create new user document
            await setDoc(userRef, {
                email: email,
                uid: uid,
                username: null,
                createdAt: new Date().toISOString(),
                isBanned: false,
                isAdmin: isAdmin,
                lastLogin: new Date().toISOString()
            });
        } else {
            // Update last login and preserve existing data
            await updateDoc(userRef, {
                lastLogin: new Date().toISOString(),
                isAdmin: isAdmin
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

// Load announcements (public for all users)
async function loadAnnouncements() {
    try {
        if (!window.db) return;
        const list = document.getElementById('announcementsList');
        if (list) list.innerHTML = '<div class="loading-row">Loading...</div>';
        const annRef = collection(window.db, 'announcements');
        const snap = await getDocs(annRef);
        const items = [];
        snap.forEach(d => items.push({ id:d.id, ...d.data() }));
        // simple newest-first based on createdAt if available
        items.sort((a,b)=> (b.createdAt || '').localeCompare(a.createdAt || ''));
        if (list) {
            if (items.length === 0) {
                list.innerHTML = '<div class="loading-row">No announcements</div>';
            } else {
                list.innerHTML = items.map(a => {
                    const when = a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : (a.createdAt || '');
                    const bg = a.bgType === 'color' ? `style="background:${a.bgColor || '#eef2ff'}"` : '';
                    const img = a.bgType === 'image' && a.bgImageUrl ? `style="background-image:url('${a.bgImageUrl}');background-size:cover;background-position:center;${a.bgBlur?'backdrop-filter:blur(6px);':''}"` : '';
                    return `<div class="message-card" ${bg || img}>
                        <div class="message-header">
                            <div>
                                <div class="message-name">${a.title || 'Announcement'}</div>
                                <div class="message-email">${a.createdBy || 'admin'} • <span class="message-meta">${when}</span></div>
                            </div>
                        </div>
                        <div class="message-content">${a.content || ''}</div>
                    </div>`;
                }).join('');
            }
        }
    } catch (e) {
        console.error('Failed to load announcements', e);
    }
}

// Load inbox messages for logged-in user
async function loadUserInbox(uid) {
    try {
        if (!window.db || !uid) return;
        const list = document.getElementById('inboxList');
        if (list) list.innerHTML = '<div class="loading-row">Loading...</div>';
        const ref = collection(window.db, 'adminMessages');
        const qRef = query(ref, where('userId','==', uid));
        const snap = await getDocs(qRef);
        const rows = [];
        snap.forEach(d => rows.push({ id:d.id, ...d.data() }));
        rows.sort((a,b)=> (b.createdAt || '').localeCompare(a.createdAt || ''));
        if (list) {
            if (rows.length === 0) {
                list.innerHTML = '<div class="loading-row">No messages</div>';
            } else {
                list.innerHTML = rows.map(m => {
                    const when = m.createdAt ? new Date(m.createdAt).toLocaleString() : '';
                    return `<div class="message-card">
                        <div class="message-header">
                            <div>
                                <div class="message-name">${m.title || 'Message'}</div>
                                <div class="message-email">${m.createdBy || 'admin'} • <span class="message-meta">${when}</span></div>
                            </div>
                        </div>
                        <div class="message-content">${m.body || ''}</div>
                    </div>`;
                }).join('');
            }
        }
    } catch (e) {
        console.error('Failed to load inbox', e);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeAuth();
});

// Mobile session timeout (30 minutes)
function startMobileSessionTimer() {
    try {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        if (!isMobile) return;

        // Set session start if not set
        if (!localStorage.getItem('sessionStart')) {
            localStorage.setItem('sessionStart', Date.now().toString());
        }

        const THIRTY_MIN_MS = 30 * 60 * 1000;

        // Clear previous interval if any
        if (window.__sessionInterval) {
            clearInterval(window.__sessionInterval);
        }

        window.__sessionInterval = setInterval(async () => {
            const startStr = localStorage.getItem('sessionStart');
            const start = startStr ? parseInt(startStr, 10) : Date.now();
            const elapsed = Date.now() - start;
            if (elapsed >= THIRTY_MIN_MS) {
                clearInterval(window.__sessionInterval);
                try {
                    await signOut(window.auth);
                } catch (e) {}
                alert('Session Expired Please Relogin to continue');
                // Reset session start
                localStorage.removeItem('sessionStart');
                // Redirect with flag
                const url = new URL(window.location.origin + '/index.html');
                url.searchParams.set('expired', '1');
                window.location.href = url.toString();
            }
        }, 60000); // check every minute
    } catch (error) {
        console.error('Error starting session timer:', error);
    }
}
