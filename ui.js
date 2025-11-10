// Global toast helper
(function(){
  function ensureContainer(){
    let c = document.querySelector('.toast-container');
    if(!c){
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }
  function showToast(type, title, message, duration=3000){
    const c = ensureContainer();
    const t = document.createElement('div');
    t.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    const icon = type === 'error' ? '⚠' : '✔';
    t.innerHTML = `
      <div class="icon">${icon}</div>
      <div>
        <div class="title">${title || (type==='error'?'Error':'Success')}</div>
        <div class="message">${message || ''}</div>
      </div>
      <button class="close" aria-label="Close">×</button>
    `;
    t.querySelector('.close').addEventListener('click', ()=> remove());
    c.appendChild(t);
    let timeout = setTimeout(remove, duration);
    function remove(){
      clearTimeout(timeout);
      t.style.animation = 'toastOut .2s ease forwards';
      setTimeout(()=> t.remove(), 180);
    }
    return remove;
  }
  window.showToast = showToast;
})();

