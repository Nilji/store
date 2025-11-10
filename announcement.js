import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

function qs(id){ return document.getElementById(id); }
function show(el, text){ if(!el) return; el.textContent = text; el.classList.add('show'); }
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

function readBgChoice(){
    const type = [...document.querySelectorAll('input[name="bgType"]')].find(r=>r.checked)?.value || 'none';
    const color = qs('bgColor')?.value || '';
    const imageUrl = qs('bgImageUrl')?.value || '';
    const blur = !!qs('bgBlur')?.checked;
    return { type, color, imageUrl, blur };
}

function applyPreview(){
    const { type, color, imageUrl, blur } = readBgChoice();
    const card = qs('previewCard');
    const title = qs('annTitle')?.value || 'Preview title';
    const content = qs('annContent')?.value || 'Your announcement preview will appear here.';
    if(!card) return;
    card.style.background = '#fff';
    card.style.backgroundImage = 'none';
    card.style.backdropFilter = 'none';
    card.style.color = '#111827';
    if(type === 'color'){
        card.style.background = color || '#eef2ff';
    }else if(type === 'image' && imageUrl){
        card.style.backgroundImage = `url('${imageUrl}')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        if(blur){ card.style.backdropFilter = 'blur(6px)'; }
    }
    qs('previewTitle').textContent = title;
    qs('previewContent').textContent = content;
}

function wireBgChooser(){
    const radios = document.querySelectorAll('input[name="bgType"]');
    const color = qs('bgColor'); const url = qs('bgImageUrl');
    const updateVisibility = ()=>{
        const type = [...radios].find(r=>r.checked)?.value || 'none';
        if(type === 'color'){ color.classList.remove('hide'); url.classList.add('hide'); }
        else if(type === 'image'){ url.classList.remove('hide'); color.classList.add('hide'); }
        else { color.classList.add('hide'); url.classList.add('hide'); }
        applyPreview();
    };
    radios.forEach(r=> r.addEventListener('change', updateVisibility));
    if(color) color.addEventListener('input', applyPreview);
    if(url) url.addEventListener('input', applyPreview);
    const blur = qs('bgBlur'); if(blur) blur.addEventListener('change', applyPreview);
    updateVisibility();
}

async function loadAnnouncements(){
    const list = qs('annList');
    const q = (qs('annSearchInput')?.value || '').toLowerCase();
    if(list) list.innerHTML = '<p class="loading-row">Loading announcements...</p>';
    const ref = collection(window.db, 'announcements');
    const snap = await getDocs(ref);
    let items = [];
    snap.forEach(d => items.push({ id:d.id, ...d.data() }));
    if(q){ items = items.filter(i => (i.title || '').toLowerCase().includes(q)); }
    if(items.length === 0){ if(list) list.innerHTML = '<p class="loading-row">No announcements</p>'; return; }
    if(list){
        list.innerHTML = items.map(a => {
            const when = a.createdAt?.toDate ? a.createdAt.toDate().toLocaleString() : (a.createdAt || 'N/A');
            return `<div class="ann-card">
                <div class="ann-title">${a.title || '(no title)'}</div>
                <div class="ann-meta">By ${a.createdBy || 'admin'} • ${when}</div>
                <div class="ann-actions">
                    <button class="btn-delete" data-id="${a.id}">Delete</button>
                </div>
            </div>`;
        }).join('');
    }
    document.querySelectorAll('.btn-delete').forEach(b=>{
        b.addEventListener('click', async ()=>{
            const id = b.getAttribute('data-id');
            if(!confirm('Delete this announcement?')) return;
            await deleteDoc(doc(window.db, 'announcements', id));
            await loadAnnouncements();
        });
    });
}

async function saveAnnouncement(){
    try{
        hideMsgs();
        const title = (qs('annTitle')?.value || '').trim();
        const content = (qs('annContent')?.value || '').trim();
        if(!title || !content){ show(qs('errorMessage'), 'Title and content are required.'); return; }
        const { type, color, imageUrl, blur } = readBgChoice();
        const user = window.auth.currentUser;
        await addDoc(collection(window.db, 'announcements'), {
            title, content, bgType:type, bgColor:color, bgImageUrl:imageUrl, bgBlur:blur,
            createdAt: serverTimestamp(),
            createdBy: user?.email || 'admin'
        });
        if(window.showToast) window.showToast('success','Saved','Announcement created.');
        qs('composer')?.classList.add('hidden');
        qs('annTitle').value = '';
        qs('annContent').value = '';
        await loadAnnouncements();
    }catch(e){
        console.error(e);
        if(window.showToast) window.showToast('error','Save failed', e.message);
    }
}

function wireActions(){
    const addBtn = qs('btnAdd');
    const composer = qs('composer');
    const previewBtn = qs('btnPreview');
    const saveBtn = qs('btnSave');
    const search = qs('annSearchInput');
    const refresh = qs('annRefreshBtn');
    if(addBtn && composer){
        addBtn.addEventListener('click', ()=>{
            composer.classList.toggle('hidden');
            applyPreview();
        });
    }
    if(previewBtn) previewBtn.addEventListener('click', applyPreview);
    if(saveBtn) saveBtn.addEventListener('click', saveAnnouncement);
    if(search) search.addEventListener('input', loadAnnouncements);
    if(refresh) refresh.addEventListener('click', loadAnnouncements);
}

async function init(){
    initDrawer();
    await requireAuth();
    wireBgChooser();
    wireActions();
    await loadAnnouncements();
    const logoutBtn = qs('logoutBtn'); const logoutBtnDesktop = qs('logoutBtnDesktop');
    const doLogout = async ()=>{ try{ await signOut(window.auth); window.location.href='index.html'; }catch(e){ alert('Logout failed'); } };
    if(logoutBtn) logoutBtn.addEventListener('click', doLogout);
    if(logoutBtnDesktop) logoutBtnDesktop.addEventListener('click', doLogout);
}
document.addEventListener('DOMContentLoaded', init);


