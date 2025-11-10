import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

function qs(id){ return document.getElementById(id); }

function showMsg(el, text){ el.textContent = text; el.classList.add('show'); }
function hideMsgs(){ const e=qs('errorMessage'); const s=qs('successMessage'); if(e) e.classList.remove('show'); if(s) s.classList.remove('show'); }

function initDrawer(){
    const btn = qs('mobileMenuBtn'); const sidebar = qs('adminSidebar');
    if(btn && sidebar){ btn.addEventListener('click', ()=> sidebar.classList.toggle('open')); }
}

async function requireAuth(){
    return new Promise((resolve, reject)=>{
        onAuthStateChanged(window.auth, (user)=>{
            if(!user){ window.location.href='index.html'; return; }
            resolve(user);
        }, reject);
    });
}

async function loadMessages(){
    try{
        const list = qs('messagesList');
        const search = (qs('messageSearchInput')?.value || '').toLowerCase();
        const statusFilter = qs('messageStatusFilter')?.value || 'all';
        if(list) list.innerHTML = '<p class="loading-row">Loading messages...</p>';

        const ref = collection(window.db, 'contactMessages');
        // simple load all (can be optimized with indexes later)
        const snap = await getDocs(ref);
        let rows = [];
        snap.forEach(d => rows.push({ id: d.id, ...d.data() }));

        // filter
        if(search){
            rows = rows.filter(m =>
                (m.email && m.email.toLowerCase().includes(search)) ||
                (m.userId && String(m.userId).toLowerCase().includes(search))
            );
        }
        if(statusFilter !== 'all'){
            rows = rows.filter(m => (m.status || 'waiting') === statusFilter);
        }

        if(rows.length === 0){ if(list) list.innerHTML = '<p class="loading-row">No messages</p>'; return; }

        if(list){
            list.innerHTML = rows.map(m => {
                const created = m.createdAt ? new Date(m.createdAt).toLocaleString() : 'N/A';
                const status = (m.status || 'waiting');
                return `
                <div class="message-card">
                    <div class="message-header">
                        <div>
                            <div class="message-name">${m.name || 'Anonymous'}</div>
                            <div class="message-email">${m.email || 'N/A'} • <span class="message-meta">${created}</span></div>
                        </div>
                        <div class="message-meta">ID: ${m.id}</div>
                    </div>
                    <div class="message-content">${m.message || ''}</div>
                    <div class="message-actions">
                        <button class="btn-status s-waiting" data-id="${m.id}" data-status="waiting"${status==='waiting'?' disabled':''}>Waiting</button>
                        <button class="btn-status s-pending" data-id="${m.id}" data-status="pending"${status==='pending'?' disabled':''}>Pending</button>
                        <button class="btn-status s-approved" data-id="${m.id}" data-status="approved"${status==='approved'?' disabled':''}>Approved</button>
                        <button class="btn-status s-success" data-id="${m.id}" data-status="success"${status==='success'?' disabled':''}>Success</button>
                        <button class="btn-delete" data-id="${m.id}">Delete</button>
                    </div>
                </div>`;
            }).join('');
        }

        // wire actions
        document.querySelectorAll('.btn-status').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const newStatus = btn.getAttribute('data-status');
                await updateMessageStatus(id, newStatus);
                await loadMessages();
            });
        });
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if(!confirm('Delete this message?')) return;
                await deleteDoc(doc(window.db, 'contactMessages', id));
                await loadMessages();
                if(window.showToast) window.showToast('success','Deleted','Message removed');
            });
        });

    }catch(e){
        if(window.showToast) window.showToast('error','Load failed', e.message);
        console.error(e);
    }
}

async function updateMessageStatus(id, status){
    try{
        const ref = doc(window.db, 'contactMessages', id);
        const user = window.auth.currentUser;
        const adminEmail = user?.email || 'admin';
        const snap = await getDoc(ref);
        const hist = (snap.exists() && Array.isArray(snap.data().statusHistory)) ? snap.data().statusHistory : [];
        hist.push({ status, at: new Date().toISOString(), by: adminEmail });
        await updateDoc(ref, { status, statusHistory: hist });
        if(window.showToast) window.showToast('success','Updated','Status changed to ' + status);
    }catch(e){
        if(window.showToast) window.showToast('error','Update failed', e.message);
        console.error(e);
    }
}

function wireSearch(){
    const s = qs('messageSearchInput'); const f = qs('messageStatusFilter'); const r = qs('messagesRefreshBtn');
    if(s) s.addEventListener('input', () => loadMessages());
    if(f) f.addEventListener('change', () => loadMessages());
    if(r) r.addEventListener('click', () => loadMessages());
}

// ---- Admin message composer ----
let allUsersCache = [];
let selectedUserIds = new Set();

async function loadUsersForComposer(){
    const list = qs('userList');
    if(!list) return;
    list.innerHTML = '<div class="message-meta">Loading users...</div>';
    const snap = await getDocs(collection(window.db, 'users'));
    allUsersCache = [];
    snap.forEach(d => allUsersCache.push({ id:d.id, ...(d.data()) }));
    renderUserChips();
}

function renderUserChips(filter=''){
    const list = qs('userList'); if(!list) return;
    const f = (filter || '').toLowerCase();
    const filtered = allUsersCache.filter(u =>
        (u.email && u.email.toLowerCase().includes(f)) ||
        (u.id && String(u.id).toLowerCase().includes(f))
    );
    if(filtered.length === 0){ list.innerHTML = '<div class="message-meta">No users</div>'; return; }
    list.innerHTML = filtered.map(u => {
        const sel = selectedUserIds.has(u.id) ? 'selected' : '';
        const label = u.email || u.id;
        return `<div class="user-chip ${sel}" data-id="${u.id}">${label}</div>`;
    }).join('');
    list.querySelectorAll('.user-chip').forEach(chip => {
        chip.addEventListener('click', ()=>{
            const id = chip.getAttribute('data-id');
            if(selectedUserIds.has(id)) selectedUserIds.delete(id); else selectedUserIds.add(id);
            chip.classList.toggle('selected');
        });
    });
}

async function sendAdminMessage(){
    try{
        const title = (qs('msgTitle')?.value || '').trim();
        const body = (qs('msgBody')?.value || '').trim();
        if(!title || !body){ if(window.showToast) window.showToast('error','Missing fields','Title and message are required'); return; }
        if(selectedUserIds.size === 0){ if(window.showToast) window.showToast('error','No recipients','Select at least one user'); return; }
        const createdBy = window.auth.currentUser?.email || 'admin';
        const ref = collection(window.db, 'adminMessages');
        const tasks = [];
        selectedUserIds.forEach(uid => {
            tasks.push(addDoc(ref, { userId: uid, title, body, status:'new', createdAt: new Date().toISOString(), createdBy }));
        });
        await Promise.all(tasks);
        if(window.showToast) window.showToast('success','Sent', 'Message sent to ' + selectedUserIds.size + ' users');
        // reset
        selectedUserIds.clear();
        qs('messageComposer')?.classList.remove('show');
        qs('msgTitle').value = '';
        qs('msgBody').value = '';
        renderUserChips(qs('userSearch')?.value || '');
    }catch(e){
        if(window.showToast) window.showToast('error','Send failed', e.message);
        console.error(e);
    }
}

async function init(){
    initDrawer();
    await requireAuth();
    wireSearch();
    await loadMessages();

    // Composer wiring
    const addBtn = qs('btnAddMessage');
    const composer = qs('messageComposer');
    if(addBtn && composer){
        addBtn.addEventListener('click', async ()=>{
            composer.classList.toggle('show');
            if(composer.classList.contains('show')){
                await loadUsersForComposer();
            }
        });
    }
    const userSearch = qs('userSearch');
    if(userSearch) userSearch.addEventListener('input', ()=> renderUserChips(userSearch.value));
    const selectAllBtn = qs('selectAllBtn');
    const unselectAllBtn = qs('unselectAllBtn');
    if(selectAllBtn) selectAllBtn.addEventListener('click', ()=>{ allUsersCache.forEach(u=> selectedUserIds.add(u.id)); renderUserChips(userSearch?.value || ''); });
    if(unselectAllBtn) unselectAllBtn.addEventListener('click', ()=>{ selectedUserIds.clear(); renderUserChips(userSearch?.value || ''); });
    const sendBtn = qs('sendMsgBtn');
    if(sendBtn) sendBtn.addEventListener('click', sendAdminMessage);

    const logoutBtn = qs('logoutBtn'); const logoutBtnDesktop = qs('logoutBtnDesktop');
    const doLogout = async () => { try { await signOut(window.auth); window.location.href='index.html'; } catch(e){ alert('Logout failed'); } };
    if(logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if(logoutBtnDesktop) logoutBtnDesktop.addEventListener('click', doLogout);
}

document.addEventListener('DOMContentLoaded', init);


