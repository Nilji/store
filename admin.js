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
        });
    }
}

// Load users from Firestore
async function loadUsers() {
    try {
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">Loading users...</td></tr>';
        
        const usersRef = collection(window.db, 'users');
        const usersSnapshot = await getDocs(usersRef);
        
        const users = [];
        usersSnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        
        // Filter users
        const searchInput = document.getElementById('searchInput');
        const filterSelect = document.getElementById('filterSelect');
        
        let filteredUsers = users;
        
        // Apply search filter
        if (searchInput && searchInput.value) {
            const searchTerm = searchInput.value.toLowerCase();
            filteredUsers = filteredUsers.filter(user => 
                user.email && user.email.toLowerCase().includes(searchTerm)
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
        tableBody.innerHTML = '<tr><td colspan="6" class="loading-row">No users found</td></tr>';
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
        
        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
        const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A';
        
        const banButton = user.isBanned 
            ? `<button class="btn-action btn-unban" onclick="unbanUser('${user.id}')">Unban</button>`
            : `<button class="btn-action btn-ban" onclick="banUser('${user.id}')">Ban</button>`;
        
        return `
            <tr>
                <td>${user.email || 'N/A'}</td>
                <td><small>${user.id}</small></td>
                <td>${statusBadges.join(' ')}</td>
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

