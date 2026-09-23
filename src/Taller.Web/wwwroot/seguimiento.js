'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const root=document.querySelector('#portal-content');let csrf='',settings={currency:'GTQ'};
const date=v=>v?new Date(v).toLocaleString('es-GT',{dateStyle:'medium',timeStyle:'short'}):'Por confirmar';
const money=v=>new Intl.NumberFormat('es-GT',{style:'currency',currency:settings.currency}).format(v||0);
async function request(path,method='GET',data){const r=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json','X-CSRF-TOKEN':csrf},body:data?JSON.stringify(data):undefined});let body={};if(r.status!==204){try{body=await r.json();}catch{}}if(!r.ok)throw new Error(body.detail||'No se pudo completar la consulta. Intenta de nuevo más tarde.');return body;}
function login(message=''){
 root.innerHTML=`<section class="card portal-login"><div class="card-body"><p class="eyebrow">TU VEHÍCULO, PASO A PASO</p><h1>Consulta tu servicio</h1><p class="lead">Ingresa el folio y el código que te entregamos al recibir tu vehículo.</p><form id="access-form"><div class="stack"><div><label for="folio">Folio de la orden</label><input id="folio" name="folio" required maxlength="30" placeholder="OT-…" autocomplete="off"></div><div><label for="code">Código de seguimiento</label><input id="code" name="code" required maxlength="30" autocomplete="off" spellcheck="false"></div><div id="error" class="error ${message?'':'hidden'}" role="alert">${esc(message)}</div><button class="primary" type="submit">Consultar mi vehículo →</button></div></form><p class="helper">¿No tienes el código o dejó de funcionar? Solicita uno nuevo al personal del taller.</p></div></section>`;
 document.querySelector('#access-form').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await request('/tracking/access','POST',Object.fromEntries(new FormData(e.target)));await show();}catch(err){const box=document.querySelector('#error');box.textContent=err.message;box.classList.remove('hidden');}finally{button.disabled=false;}};
}
async function show(){
 const o=await request('/tracking/order');const stages=['Recibido','En diagnóstico','Cotización','En reparación','Verificación final','Listo para entrega','Entregado'];const current=stages.indexOf(o.status);
 root.innerHTML=`<div class="page-head"><div><p class="eyebrow">ESTADO DE TU SERVICIO</p><h1>${esc(o.vehicle.brand)} ${esc(o.vehicle.model)}</h1><p class="lead">${esc(o.vehicle.plate)} · ${o.vehicle.year} · ${esc(o.folio)}</p></div><div class="actions"><button id="refresh">Actualizar</button><button id="logout" class="subtle">Salir</button></div></div><section class="portal-status"><p class="eyebrow">${current===6?'SERVICIO COMPLETADO':'ESTAMOS AL PENDIENTE DE TU VEHÍCULO'}</p><h1>${esc(o.status)}</h1><p>Última actualización: ${date(o.updatedAt)}</p><div class="steps" aria-label="Etapa ${current+1} de ${stages.length}">${stages.map((_,i)=>`<div class="step ${i<=current?'done':''}"></div>`).join('')}</div></section><div class="meta"><div><small>Entrega estimada</small><strong>${date(o.estimatedDelivery)}</strong></div><div><small>Saldo pendiente</small><strong>${money(o.balance)}</strong></div><div><small>Folio</small><strong>${esc(o.folio)}</strong></div><div><small>Próximo paso</small><strong>${esc(stages[current+1]||'Servicio completado')}</strong></div></div><div class="grid"><div><section class="card"><div class="card-head"><h2>Noticias de tu vehículo</h2></div><div class="card-body">${o.updates.length?o.updates.map(u=>`<article class="record"><h3>${esc(u.title)}</h3><small>${date(u.createdAt)}</small><p>${esc(u.message)}</p></article>`).join(''):'<p class="muted">Tu vehículo ya está registrado. Aquí aparecerán las actualizaciones que comparta el taller.</p>'}</div></section>${o.quote?`<section class="card"><div class="card-head"><h2>Cotización · Versión ${o.quote.version}</h2><span class="badge">${esc(o.quote.status)}</span></div><div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Cantidad</th><th>Importe</th></tr></thead><tbody>${o.quote.lines.map(l=>`<tr><td class="wrap">${esc(l.description)}</td><td>${l.quantity}</td><td>${money(l.total)}</td></tr>`).join('')}</tbody></table></div><div class="totals"><div><span>Subtotal</span><span>${money(o.quote.subtotal)}</span></div><div><span>Descuento</span><span>${money(o.quote.discount)}</span></div><div><span>Impuesto</span><span>${money(o.quote.tax)}</span></div><div class="total"><span>Total</span><span>${money(o.quote.total)}</span></div></div><div class="card-body"><p class="helper">Vigencia: ${date(o.quote.expiresAt)}. Comunica tu respuesta al taller para que quede registrada.</p></div></section>`:''}</div><div><section class="card"><div class="card-head"><h2>Fotos y documentos</h2></div><div class="card-body">${o.evidence.length?o.evidence.map(e=>`<div class="record"><a href="/api/tracking/evidence/${e.id}" target="_blank" rel="noopener">${esc(e.description)} ↗</a><p class="helper">${esc(e.stage)} · ${date(e.createdAt)}</p></div>`).join(''):'<p class="muted">Las evidencias compartidas por el taller aparecerán aquí.</p>'}</div></section><div class="notice">Este acceso permite consultar únicamente esta orden. Conserva tu código en un lugar seguro.</div></div></div>`;
 document.querySelector('#logout').onclick=async()=>{await request('/tracking/logout','POST',{});login();};
 document.querySelector('#refresh').onclick=async()=>{try{await show();}catch(e){login(e.message);}};
}
(async()=>{csrf=(await request('/auth/csrf')).token;settings=await request('/settings');const token=location.hash.slice(1);if(token){history.replaceState(null,'','/seguimiento');try{await request('/tracking/access','POST',{token});await show();}catch(e){login(e.message);}}else{try{await show();}catch{login();}}})().catch(e=>login(e.message));


// ===== Smooth Animations =====
const fadeContent = () => new Promise(resolve => {
    const c = document.getElementById('portal-content');
    if (!c) { resolve(); return; }
    c.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    c.style.opacity = '0';
    c.style.transform = 'translateY(6px)';
    setTimeout(resolve, 300);
});
const showContent = () => {
    const c = document.getElementById('portal-content');
    if (!c) return;
    c.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
    c.style.opacity = '1';
    c.style.transform = 'translateY(0)';
};
const animatePortal = () => {
    document.querySelectorAll('.portal .card').forEach((el, i) => {
        el.style.opacity = '0'; el.style.transform = 'translateY(12px)';
        el.style.transition = 'opacity 0.4s ease-out, transform 0.4s ease-out';
        setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 100 + i * 80);
    });
    document.querySelectorAll('.portal .record, .portal article').forEach((el, i) => {
        el.style.opacity = '0'; el.style.transform = 'translateX(-8px)';
        el.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
        setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateX(0)'; }, 50 * i);
    });
};
const addRipple = (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const ripple = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    Object.assign(ripple.style, {
        position: 'absolute', borderRadius: '50%', background: 'rgba(72,138,153,0.2)',
        width: '20px', height: '20px',
        marginLeft: (e.clientX - rect.left - 10) + 'px',
        marginTop: (e.clientY - rect.top - 10) + 'px',
        transform: 'scale(0)', opacity: '1',
        pointerEvents: 'none', transition: 'transform 0.4s ease-out, opacity 0.4s ease-out'
    });
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(ripple);
    setTimeout(() => { ripple.style.transform = 'scale(4)'; ripple.style.opacity = '0'; }, 10);
    setTimeout(() => ripple.remove(), 500);
};
document.addEventListener('click', (e) => addRipple(e));
const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll('.portal .card, .portal .meta div').forEach(el => {
    if (el.style.opacity !== '1') {
        el.style.opacity = '0'; el.style.transform = 'translateY(16px)';
        el.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        obs.observe(el);
    }
});
animatePortal();
