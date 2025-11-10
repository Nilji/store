import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, query, where, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Admin email list - Must match main.js
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

// Check if user is admin
async function checkAdminAccess(email) {
    return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Initialize admin dashboard
async function initializeAdmin() {
    try {
        await waitForFirebase();
        
        const securityCheck = document.getElementById('securityCheck');
        const accessDenied = document.getElementById('accessDenied');
        const adminContent = document.getElementById('adminContent');
        const logoutBtn = document.getElementById('logoutBtn');
        
        // Check authentication
        onAuthStateChanged(window.auth, async (user) => {
            if (!user) {
                // Not signed in, redirect to login
                window.location.href = 'index.html';
                return;
            }
            
            const email = user.email;
            const isAdmin = await checkAdminAccess(email);
            
            if (!isAdmin) {
                // Not an admin, show access denied
                securityCheck.style.display = 'none';
                accessDenied.style.display = 'block';
                return;
            }
            
            // User is admin, show admin content
            securityCheck.style.display = 'none';
            adminContent.style.display = 'block';
            
            // Load users
            await loadUsers();
            
            // Setup event listeners
            setupEventListeners();
        });
        
        // Handle logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await signOut(window.auth);
                    window.location.href = 'index.html';
                } catch (error) {
                    showError('Error signing out: ' + error.message);
                }
            });
        }
        
    } catch (error) {
        console.error('Admin initialization error:', error);
        showError('Failed to initialize admin dashboard: ' + error.message);
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    const refreshBtn = document.getElementById('refreshBtn');
    const adminTabs = document.querySelectorAll('.admin-tab');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const adminSidebar = document.getElementById('adminSidebar');
    
    // Tab switching
    adminTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            adminTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabContent = document.getElementById(tabName + 'Tab');
            if (tabContent) tabContent.classList.add('active');
            
            // Load data for the active tab
            if (tabName === 'users') {
                loadUsers();
            } else if (tabName === 'messages') {
                loadMessages();
            }
        });
    });
    
    // Sidebar link switching (mobile/desktop)
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => {
            const tabName = link.getAttribute('data-tab');
            // Remove active state
            sidebarLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            // Set active
            link.classList.add('active');
            const tabContent = document.getElementById(tabName + 'Tab');
            if (tabContent) tabContent.classList.add('active');
            // Load tab data
            if (tabName === 'users') loadUsers();
            if (tabName === 'messages') loadMessages();
            if (tabName === 'transactions') loadTransactions && loadTransactions();
            // Close drawer on mobile
            if (adminSidebar) adminSidebar.classList.remove('open');
        });
    });

    // Mobile drawer toggle
    if (mobileMenuBtn && adminSidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            adminSidebar.classList.toggle('open');
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            loadUsers();
        });
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            loadUsers();
        });
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadUsers();
            loadMessages();
        });
    }
}

// Load users from Firestore
async function loadUsers() {
    try {
        const searchInput = document.getElementById('searchInput');
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading users...</td></tr>';
        
        const usersRef = collection(window.db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const users = [];
        usersSnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        // Filter users: accept email or username (if present) or userId
        const filterSelect = document.getElementById('filterSelect');
        
        let filteredUsers = users;
        
        // Apply search filter
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                (user.email && user.email.toLowerCase().includes(searchTerm)) ||
                (user.username && String(user.username).toLowerCase().includes(searchTerm)) ||
                (user.id && String(user.id).toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply status filter
        if (filterSelect) {
            const filter = filterSelect.value;
            if (filter === 'banned') {
                filteredUsers = filteredUsers.filter(user => user.isBanned === true);
            } else if (filter === 'active') {
                filteredUsers = filteredUsers.filter(user => user.isBanned !== true);
            } else if (filter === 'admin') {
                filteredUsers = filteredUsers.filter(user => user.isAdmin === true);
            }
        }
        
        // Update statistics
        updateStatistics(users);
        
        // Render users table
        renderUsersTable(filteredUsers);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users: ' + error.message);
        const tableBody = document.getElementById('usersTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Error loading users</td></tr>';
        }
    }
}

// Update statistics
function updateStatistics(users) {
    const totalUsers = users.length;
    const bannedUsers = users.filter(user => user.isBanned === true).length;
    const activeUsers = totalUsers - bannedUsers;
    const adminUsers = users.filter(user => user.isAdmin === true).length;
    
    const totalUsersEl = document.getElementById('totalUsers');
    const bannedUsersEl = document.getElementById('bannedUsers');
    const activeUsersEl = document.getElementById('activeUsers');
    const adminUsersEl = document.getElementById('adminUsers');
    
    if (totalUsersEl) totalUsersEl.textContent = totalUsers;
    if (bannedUsersEl) bannedUsersEl.textContent = bannedUsers;
    if (activeUsersEl) activeUsersEl.textContent = activeUsers;
    if (adminUsersEl) adminUsersEl.textContent = adminUsers;
}

// Render users table
function renderUsersTable(users) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    if (users.length === 0) {
        // Update statistics to 0 explicitly
        updateStatistics([]);
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No users registered yet</td></tr>';
        return;
    }
    
    tableBody.innerHTML = users.map(user => {
        const statusBadges = [];
        if (user.isBanned) {
            statusBadges.push('<span class="status-badge status-banned">Banned</span>');
        } else {
            statusBadges.push('<span class="status-badge status-active">Active</span>');
        }
        if (user.isAdmin) {
            statusBadges.push('<span class="status-badge status-admin">Admin</span>');
        }
        
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A';
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A';
        const userIdDisplay = (user.id || '').toString().substring(0, 6) || 'N/A';
        const onlineStatus = user.isOnline ? 'Online' : 'Offline';
        const lastOnline = user.lastOnlineAt ? new Date(user.lastOnlineAt).toLocaleString() : 'N/A';
        const lastOffline = user.lastOfflineAt ? new Date(user.lastOfflineAt).toLocaleString() : 'N/A';
        
        const banButton = user.isBanned 
            ? `<button class="btn-action btn-unban" onclick="unbanUser('${user.id}')">Unban</button>`
            : `<button class="btn-action btn-ban" onclick="banUser('${user.id}')">Ban</button>`;
        
        return `
            <tr>
                <td>${user.email || 'N/A'}</td>
                <td><strong>${userIdDisplay}</strong></td>
                <td>${onlineStatus}</td>
                <td>${lastOnline}</td>
                <td>${lastOffline}</td>
                <td>${createdAt}</td>
                <td>${lastLogin}</td>
                <td>
                    <div class="action-buttons">
                        ${banButton}
                        <button class="btn-action btn-delete" onclick="deleteUser('${user.id}', '${user.email || ''}')">Delete</button>
                        <button class="btn-action btn-view" onclick="viewUserDetails('${user.id}')">View</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Load transactions (scaffold)
async function loadTransactions() {
    const list = document.getElementById('transactionsList');
    if (!list) return;
    list.innerHTML = '<p class="loading-row">No transactions yet</p>';
}
// Ban user
window.banUser = async function(uid) {
    if (!confirm('Are you sure you want to ban this user?')) return;
    
    try {
        const userRef = doc(window.db, 'users', uid);
        await updateDoc(userRef, {
            isBanned: true,
            bannedAt: new Date().toISOString()
        });
        
        showSuccess('User banned successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error banning user:', error);
        showError('Failed to ban user: ' + error.message);
    }
};

// Unban user
window.unbanUser = async function(uid) {
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    try {
        const userRef = doc(window.db, 'users', uid);
        await updateDoc(userRef, {
            isBanned: false,
            unbannedAt: new Date().toISOString()
        });
        
        showSuccess('User unbanned successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error unbanning user:', error);
        showError('Failed to unban user: ' + error.message);
    }
};

// Delete user
window.deleteUser = async function(uid, email) {
    if (!confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone!`)) return;
    
    try {
        const userRef = doc(window.db, 'users', uid);
        await deleteDoc(userRef);
        
        showSuccess('User deleted successfully');
        await loadUsers();
    } catch (error) {
        console.error('Error deleting user:', error);
        showError('Failed to delete user: ' + error.message);
    }
};

// View user details
window.viewUserDetails = async function(uid) {
    try {
        const userRef = doc(window.db, 'users', uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const details = `
User Details:
Email: ${userData.email || 'N/A'}
User ID: ${uid}
Status: ${userData.isBanned ? 'Banned' : 'Active'}
Admin: ${userData.isAdmin ? 'Yes' : 'No'}
Created: ${userData.createdAt ? new Date(userData.createdAt).toLocaleString() : 'N/A'}
Last Login: ${userData.lastLogin ? new Date(userData.lastLogin).toLocaleString() : 'N/A'}
Banned At: ${userData.bannedAt ? new Date(userData.bannedAt).toLocaleString() : 'N/A'}
            `;
            alert(details);
        } else {
            alert('User not found');
        }
    } catch (error) {
        console.error('Error viewing user details:', error);
        showError('Failed to load user details: ' + error.message);
    }
};

// Load contact messages
async function loadMessages() {
    try {
        const messagesList = document.getElementById('messagesList');
        if (!messagesList) return;
        
        messagesList.innerHTML = '<p class="loading-row">Loading messages...</p>';
        
        const messagesRef = collection(window.db, 'contactMessages');
        const messagesSnapshot = await getDocs(messagesRef);
        
        const messages = [];
        messagesSnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date (newest first)
        messages.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<p class="loading-row">No messages yet</p>';
            return;
        }
        
        messagesList.innerHTML = messages.map(msg => {
            const date = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'N/A';
            const isUnread = !msg.read;
            
            return `
                <div class="message-card ${isUnread ? 'unread' : ''}" data-message-id="${msg.id}">
                    <div class="message-header">
                        <div>
                            <div class="message-name">${msg.name || 'Anonymous'}</div>
                            <div class="message-email">${msg.email || 'N/A'}</div>
                        </div>
                        <div class="message-date">${date}</div>
                    </div>
                    <div class="message-content">${msg.message || ''}</div>
                    <div class="message-actions">
                        ${isUnread ? `<button class="btn-mark-read" onclick="markMessageAsRead('${msg.id}')">Mark as Read</button>` : ''}
                        <button class="btn-delete-msg" onclick="deleteMessage('${msg.id}')">Delete</button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading messages:', error);
        const messagesList = document.getElementById('messagesList');
        if (messagesList) {
            messagesList.innerHTML = '<p class="loading-row">Error loading messages</p>';
        }
        showError('Failed to load messages: ' + error.message);
    }
}

// Mark message as read
window.markMessageAsRead = async function(messageId) {
    try {
        const messageRef = doc(window.db, 'contactMessages', messageId);
        await updateDoc(messageRef, {
            read: true,
            readAt: new Date().toISOString()
        });
        
        showSuccess('Message marked as read');
        await loadMessages();
    } catch (error) {
        console.error('Error marking message as read:', error);
        showError('Failed to mark message as read: ' + error.message);
    }
};

// Delete message
window.deleteMessage = async function(messageId) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
        const messageRef = doc(window.db, 'contactMessages', messageId);
        await deleteDoc(messageRef);
        
        showSuccess('Message deleted successfully');
        await loadMessages();
    } catch (error) {
        console.error('Error deleting message:', error);
        showError('Failed to delete message: ' + error.message);
    }
};

// Show error message
function showError(message) {
    const errorMsg = document.getElementById('errorMessage');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    if (successMsg) {
        successMsg.textContent = message;
        successMsg.style.display = 'block';
        setTimeout(() => {
            successMsg.style.display = 'none';
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeAdmin();
});

