const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const names = {
    Ingresado: 'Ingresado', EnEspera: 'En espera', Diagnostico: 'Diagnóstico', Cotizacion: 'Cotización',
    Autorizacion: 'Autorización', EnReparacion: 'En reparación', Pruebas: 'Pruebas', Reparado: 'Reparado',
    ListoParaEntrega: 'Listo para entrega', Entregado: 'Entregado', Recepcion: 'Recepción', Mecanico: 'Mecánico',
    ManoDeObra: 'Mano de obra', Refaccion: 'Refacción', NoAsistio: 'No asistió',
    RequiereRevision: 'Requiere revisión', NoSatisfactorio: 'No satisfactorio'
};

const label = s => names[s] || s;

const state = {
    user: null, settings: { currency: 'GTQ' },
    orders: [], customers: [], vehicles: [], services: [], appointments: [], mechanics: [],
    view: 'dashboard', tab: 'resumen', filters: {}
};

let csrf = '', currentOrder = null, toastTimer, renderVersion = 0, recoveringSession = null;
const icon = window.workshopUI?.icon || (() => '');

const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const office = () => state.user?.roles.some(r => ['Administrador', 'Recepcion'].includes(r));
const admin = () => state.user?.roles.includes('Administrador');

const money = v => new Intl.NumberFormat('es-GT', { style: 'currency', currency: state.settings.currency }).format(v || 0);
const date = v => v ? new Date(v).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin definir';
const day = v => new Date(v).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' });
const localInput = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const badge = s => {
    const colors = {
        Entregado: 'green', Autorizada: 'green', Satisfactorio: 'green', Atendida: 'green',
        Diagnostico: 'blue', Pruebas: 'blue', Confirmada: 'blue',
        Autorizacion: 'amber', Pendiente: 'amber', Alta: 'amber',
        Urgente: 'red', Rechazada: 'red', NoSatisfactorio: 'red', Cancelada: 'red',
        EnReparacion: 'teal', ListoParaEntrega: 'teal'
    };
    return `<span class="badge ${colors[s] || ''}">${esc(label(s))}</span>`;
};

const btn = (text, action, id = '', cls = '') => {
    let aria = '';
    if (action === 'close' && cls.includes('close')) aria = 'aria-label="Cerrar ventana"';
    else if (action === 'menu') aria = 'aria-label="Abrir menú" aria-haspopup="dialog" aria-expanded="false" aria-controls="nav-dialog"';
    return `<button type="button" class="${cls}" data-action="${action}" data-id="${esc(id)}" ${aria}>${text}</button>`;
};

const empty = (title, text = 'Los registros aparecerán aquí cuando los agregues.') => `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`;
const card = (title, body, action = '', sub = '') => `<section class="card"><div class="card-head"><div><h2>${title}</h2>${sub ? `<small>${sub}</small>` : ''}</div>${action}</div>${body}</section>`;
const table = (headers, rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla de registros"><table><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const field = (name, text, type = 'text', value = '', attrs = '') => `<div><label for="f-${name}">${text}</label><input id="f-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
const area = (name, text, value = '', required = true) => `<div class="full"><label for="f-${name}">${text}</label><textarea id="f-${name}" name="${name}" maxlength="2000" ${required ? 'required' : ''}>${esc(value)}</textarea></div>`;
const select = (name, text, items, value = '') => `<div><label for="f-${name}">${text}</label><select id="f-${name}" name="${name}" required>${items.map(i => { const [v, l] = Array.isArray(i) ? i : [i, label(i)]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></div>`;
const check = (name, text, value = false) => `<label class="checkbox"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}>${text}</label>`;

const FETCH_TIMEOUT = 10000;
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

const skeleton = (type = 'card', count = 3) => {
    const skeletons = {
        card: `<div class="skeleton-card"><div class="skel skel-h skel-w60"></div><div class="skel skel-h skel-w40"></div><div class="skel skel-h skel-w80"></div><div class="skel skel-h skel-w100"></div></div>`,
        stat: `<div class="skeleton-stat"><div class="skel skel-h skel-w50"></div><div class="skel skel-h skel-w30"></div></div>`,
        row: `<div class="skeleton-row"><div class="skel skel-h skel-w100"></div><div class="skel skel-h skel-w70"></div><div class="skel skel-h skel-w50"></div></div>`,
        table: `<div class="skeleton-table"><div class="skel-row"><div class="skel skel-h skel-w100"></div></div></div>`
    };
    return Array.from({ length: count }, (_, i) => `<div class="skel-wrap skel-delay-${i + 1}">${skeletons[type]}</div>`).join('');
};

function toast(text, type = 'default') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = text;
    el.className = type === 'error' ? 'show error' : 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.add('hiding');
        setTimeout(() => el.classList.remove('show', 'hiding', 'error'), 200);
    }, 4500);
}

function staggerReveal(container, selector = '.order-item,.mini-appointment,.record,.skeleton-row,tbody tr') {
    if (!container || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const items = [...container.querySelectorAll(selector)];
    items.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(12px)';
        el.style.transition = 'opacity 300ms var(--ease-out), transform 300ms var(--ease-out)';
        el.style.transitionDelay = `${i * 40}ms`;
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    });
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
        }
    });
}, { rootMargin: '0px 0px -50px 0px', threshold: 0.1 });

function observeReveal(container, selector = '.card,.stat,.progress-row') {
    if (!container) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        container.querySelectorAll(selector).forEach(el => el.classList.add('in-view'));
        return;
    }
    container.querySelectorAll(selector).forEach(el => observer.observe(el));
}

async function api(path, method = 'GET', body) {
    const headers = {};
    if (method !== 'GET') headers['X-CSRF-TOKEN'] = csrf;
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    let response;
    try {
        response = await fetchWithTimeout('/api' + path, { method, headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('La petición tardó demasiado. Verifica que el servidor esté corriendo.');
        throw new Error(method === 'GET' ? 'No hay conexión con el taller. Revisa tu conexión y vuelve a intentar.' : 'Se perdió la conexión. Comprueba si el registro se guardó antes de enviarlo.');
    }
    if (!response.ok) {
        let data; try { data = await response.json(); } catch { data = {}; }
        if (response.status === 401 && !path.startsWith('/auth')) {
            if (!recoveringSession) recoveringSession = (async () => {
                ++renderVersion; state.user = null; currentOrder = null; state.filters = {}; closeMenu(); $('#modal')?.close();
                try { csrf = (await api('/auth/csrf')).token; } catch { }
                renderLogin(false); const error = $('#login-error'); if (error) { error.textContent = 'La sesión terminó. Inicia sesión de nuevo.'; error.classList.remove('hidden'); }
            })().finally(() => recoveringSession = null);
            await recoveringSession; throw new Error('La sesión terminó. Inicia sesión de nuevo.');
        }
        throw new Error(data.detail || Object.values(data.errors || {}).flat().join(' ') || (response.status === 403 ? 'Tu rol no permite realizar esta acción.' : response.status === 429 ? 'Demasiados intentos. Espera un minuto.' : 'No se pudo completar la operación. Intenta de nuevo.'));
    }
    return response.status === 204 ? null : response.json();
}

async function refresh() {
    const keys = office() ? ['orders', 'customers', 'vehicles', 'services', 'appointments', 'mechanics'] : ['orders'];
    const values = await Promise.all(keys.map(key => api('/' + key)));
    // CORRECCIÓN CLAVE: Agregamos "|| []" para asegurar que nunca se asigne "null" al state
    keys.forEach((key, i) => state[key] = values[i] || []);
}

async function boot() {
    try {
        csrf = (await api('/auth/csrf')).token;
        const session = await api('/auth/session');
        state.user = session.user;
        state.settings = await api('/settings');
        if (!state.user) { renderLogin(session.needsSetup); return; }
        await render();
    } catch (e) {
        $('#app').innerHTML = `<div class="loading"><div><h1>No se pudo abrir el taller</h1><p>${esc(e.message)}</p><button class="primary" data-action="reload">Reintentar</button></div></div>`;
        actions.reload = () => location.reload();
    }
}

function renderLogin(setup) {
    $('#app').innerHTML = `<main class="auth-layout"><section class="auth-story"><div class="auth-brand-box"><div class="brand"><span class="brand-mark">${icon("workshop")}</span><div>Taller<small>GESTIÓN AUTOMOTRIZ</small></div></div></div><h1>Cada vehículo.<br>Cada detalle.<br>Todo en orden.</h1><p>Un espacio para coordinar el taller y acompañar cada servicio, desde la recepción hasta la entrega.</p><div class="auth-art"><strong>Tu operación, en un solo lugar.</strong></div></section><section class="auth-form"><div class="auth-box"><h2>${setup ? 'Prepara tu taller' : 'Bienvenido de nuevo'}</h2><p class="lead">${setup ? 'Crea la primera cuenta de administrador.' : 'Ingresa con tu cuenta para continuar.'}</p><form id="login-form">${setup ? field('fullName', 'Nombre completo', 'text', '', 'required maxlength="150" autocomplete="name"') : ''}${field('email', 'Correo electrónico', 'email', '', 'required autocomplete="username"')}${field('password', 'Contraseña', 'password', '', 'required autocomplete="' + (setup ? 'new-password' : 'current-password') + '" ' + (setup ? 'minlength="12"' : ''))}${setup ? '<p class="helper">Usa 12 caracteres o más, con mayúsculas, minúsculas, un número y un símbolo.</p>' : ''}<div id="login-error" class="error hidden" role="alert"></div><button class="primary" type="submit">${setup ? 'Crear administrador' : 'Iniciar sesión'} →</button></form><footer>¿Vienes a consultar tu vehículo? <a href="/seguimiento">Consulta tu orden</a></footer></div></section></main>`;
    $('#login-form').onsubmit = async e => {
        e.preventDefault(); const submit = $('button[type=submit]', e.target); submit.disabled = true;
        try { await api(setup ? '/auth/setup' : '/auth/login', 'POST', { ...Object.fromEntries(new FormData(e.target)), role: 'Administrador' }); await boot(); }
        catch (err) { $('#login-error').textContent = err.message; $('#login-error').classList.remove('hidden'); }
        finally { submit.disabled = false; }
    };
}

const navigation = [['dashboard', 'Resumen'], ['orders', 'Órdenes de servicio'], ['appointments', 'Agenda'], ['customers', 'Clientes'], ['vehicles', 'Vehículos'], ['services', 'Servicios'], ['users', 'Equipo'], ['audit', 'Bitácora']];

async function render() {
    if (!state.user) return;
    closeMenu(); const version = ++renderVersion;
    const view = location.hash.slice(1) || 'dashboard'; state.view = view;
    $('#app').innerHTML = `<div class="shell"><aside class="sidebar" id="sidebar">${btn(icon("close"), "close-menu", "", "menu-close subtle").replace('data-action', 'aria-label="Cerrar menú" data-action')}<div class="brand"><span class="brand-mark">${icon("workshop")}</span><div>Taller<small>GESTIÓN AUTOMOTRIZ</small></div></div><div class="nav-label">ESPACIO DE TRABAJO</div><nav aria-label="Navegación principal">${navigation.filter(([v]) => office() || ['dashboard', 'orders'].includes(v)).filter(([v]) => admin() || !['users', 'audit'].includes(v)).map(([v, title]) => btn(`${icon(v)}${title}`, 'navigate', v, `nav-item ${(view === v || view.startsWith('order/') && v === 'orders') ? 'active' : ''}`)).join('')}</nav><div class="sidebar-bottom">SEGUIMIENTO DEL CLIENTE<a href="/seguimiento" target="_blank" rel="noopener">Abrir portal ↗</a><p>Información clara en cada etapa.</p></div></aside><main class="main"><header class="topbar">${btn(icon('menu'), 'menu', '', 'icon mobile-menu')}<span class="topbar-label">${esc(state.settings.name)} <span class="muted"> / </span> Operación</span>${btn('Actualizar', 'refresh', '', 'subtle small')}<div class="user"><span class="avatar">${esc(state.user.fullName.slice(0, 2).toUpperCase())}</span><div>${esc(state.user.fullName)}<small>${esc(state.user.roles.map(label).join(', '))}</small></div>${btn('Mi cuenta', 'account', '', 'subtle small') + btn('Salir', 'logout', '', 'subtle small')}</div></header><div class="content" id="content" tabindex="-1"></div></main></div><dialog id="nav-dialog" aria-label="Menú del taller"></dialog>`;
    document.querySelectorAll('.nav-item.active').forEach(el => el.setAttribute('aria-current', 'page'));
    const contentEl = $('#content');
    if (view.startsWith('order/')) {
        contentEl.innerHTML = skeleton('card', 1); await renderOrder(Number(view.split('/')[1]), version); return;
    }
    contentEl.innerHTML = skeletonPage(view);
    try {
        if (view === 'dashboard') { await refresh(); dashboard(); }
        else if (view === 'orders') { await refresh(); ordersPage(); }
        else if (view === 'customers') { await refresh(); customersPage(); }
        else if (view === 'vehicles') { await refresh(); vehiclesPage(); }
        else if (view === 'services') { await refresh(); servicesPage(); }
        else if (view === 'appointments') { await refresh(); appointmentsPage(); }
        else if (view === 'users') { await usersPage(); }
        else if (view === 'audit') { await auditPage(); }
        else { location.hash = 'dashboard'; }
    } catch (err) {
        if (version === renderVersion && state.user) contentEl.innerHTML = empty('No se pudo cargar esta sección', err.message) + btn('Reintentar', 'refresh', '', 'primary');
    }
}

function skeletonPage(view) {
    const sk = {
        dashboard: `<div class="stats">${skeleton('stat', 4)}</div><div class="grid"><div>${skeleton('card', 2)}</div><div>${skeleton('card', 2)}</div></div>`,
        orders: `<div class="toolbar"><input type="search" placeholder="Buscando…" disabled><select disabled><option>Cargando…</option></select></div>${skeleton('table', 5)}`,
        customers: `<div class="toolbar"><input type="search" placeholder="Buscando…" disabled><select disabled><option>Cargando…</option></select></div>${skeleton('table', 5)}`,
        vehicles: `<div class="toolbar"><input type="search" placeholder="Buscando…" disabled><select disabled><option>Cargando…</option></select></div>${skeleton('table', 5)}`,
        services: `<div class="toolbar"><input type="search" placeholder="Buscando…" disabled><select disabled><option>Cargando…</option></select></div>${skeleton('table', 5)}`,
        appointments: `<div class="toolbar"><input type="search" placeholder="Buscando…" disabled><select disabled><option>Cargando…</option></select></div>${skeleton('table', 5)}`,
        users: skeleton('card', 1), audit: skeleton('card', 1)
    };
    return sk[view] || skeleton('card', 2);
}

const head = (title, sub, action = '') => `<div class="page-head"><div><p class="eyebrow">GESTIÓN OPERATIVA</p><h1>${title}</h1><p class="lead">${sub}</p></div><div class="actions">${action}</div></div>`;

function orderRows(orders) { return orders.map(o => `<tr><td><a href="#order/${o.id}"><strong>${esc(o.folio)}</strong></a><small>${day(o.enteredAt)}</small></td><td>${esc(o.vehicle)}<small>${esc(o.plate)}</small></td><td>${esc(o.customer)}</td><td>${badge(o.status)}</td><td>${badge(o.priority)}</td><td>${btn('Ver orden →', 'order', o.id, 'subtle small')}</td></tr>`); }

function orderTable(orders, compact = false) {
    const rows = compact ? orders.map(o => `<tr><td><a href="#order/${o.id}"><strong>${esc(o.folio)}</strong></a><small>${day(o.enteredAt)}</small></td><td><strong>${esc(o.vehicle)}</strong><small>${esc(o.plate)}</small><small class="order-customer">${esc(o.customer)}</small></td><td>${badge(o.status)}<small>${label(o.priority)}</small></td><td>${btn('Ver orden →', 'order', o.id, 'subtle small')}</td></tr>`) : orderRows(orders);
    return `<div class="orders-desktop">${table(compact ? ['Orden', 'Vehículo y cliente', 'Estado', ''] : ['Orden', 'Vehículo', 'Cliente', 'Estado', 'Prioridad', ''], rows)}</div><div class="orders-mobile">${orders.map(o => `<article class="order-item"><a href="#order/${o.id}">${esc(o.folio)}</a><strong>${esc(o.vehicle)} · ${esc(o.plate)}</strong><p>${esc(o.customer)}</p><div class="order-item-status">${badge(o.status)}${badge(o.priority)}<small>${day(o.enteredAt)}</small></div></article>`).join('')}</div>`;
}

function dashboard() {
    const open = state.orders.filter(o => o.status !== 'Entregado'), diagnostics = open.filter(o => o.status === 'Diagnostico'), repair = open.filter(o => o.status === 'EnReparacion'), ready = open.filter(o => o.status === 'ListoParaEntrega');
    const late = open.filter(o => o.estimatedDelivery && new Date(o.estimatedDelivery) < new Date());
    const today = state.appointments.filter(a => new Date(a.startsAt).toDateString() === new Date().toDateString() && !['Cancelada', 'NoAsistio', 'Atendida'].includes(a.status)).sort((a, b) => String(a.startsAt || '').localeCompare(String(b.startsAt || '')));
    const firstName = esc(state.user.fullName.trim().split(/\s+/)[0]);
    const formattedToday = new Intl.DateTimeFormat('es-GT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    const distribution = [
        ['Recepción', open.filter(o => ['Ingresado', 'EnEspera'].includes(o.status)).length],
        ['Diagnóstico', diagnostics.length],
        ['Cotización', open.filter(o => ['Cotizacion', 'Autorizacion'].includes(o.status)).length],
        ['Reparación', repair.length],
        ['Pruebas y entrega', open.filter(o => ['Pruebas', 'Reparado', 'ListoParaEntrega'].includes(o.status)).length]
    ];

    let html = `<section class="dashboard-hero"><div class="hero-copy"><p class="eyebrow">CENTRO DE OPERACIONES</p><h1>Todo el taller,<br><span>bajo control.</span></h1><p>Hola, ${firstName}. Revisa el ritmo de trabajo, atiende prioridades y mantén cada entrega en marcha.</p><div class="hero-actions">${office() ? btn('Recibir vehículo →', 'receive', '', 'primary') : ''}${btn('Ver órdenes', 'navigate', 'orders', 'hero-secondary')}</div></div><div class="hero-status"><span><i></i> Operación en línea</span><strong>${esc(formattedToday)}</strong></div></section>`;
    html += `<div class="stats"><div class="stat"><span class="stat-index">01</span><div class="stat-label">Vehículos en taller</div><div class="stat-number">${open.length}</div><small>Órdenes activas</small></div><div class="stat"><span class="stat-index">02</span><div class="stat-label">En diagnóstico</div><div class="stat-number">${diagnostics.length}</div><small>Revisión y evaluación</small></div><div class="stat"><span class="stat-index">03</span><div class="stat-label">En reparación</div><div class="stat-number">${repair.length}</div><small>Trabajos en proceso</small></div><div class="stat"><span class="stat-index">04</span><div class="stat-label">Listos para entrega</div><div class="stat-number">${ready.length}</div><small>Último paso del servicio</small></div></div><div class="grid"><div>`;
    html += card('Órdenes en curso', open.length ? orderTable(open.slice(0, 6), true) : empty('Tu primera orden comienza aquí', 'Recibe un vehículo para iniciar su seguimiento.'), btn('Ver todas →', 'navigate', 'orders', 'subtle small'), `${open.length} ${open.length === 1 ? 'orden activa' : 'órdenes activas'}`);
    if (late.length > 0) html += card('Entregas con retraso', `<div class="card-body">${late.map(o => `<div class="record"><a href="#order/${o.id}">${esc(o.folio)} · ${esc(o.vehicle)}</a><small>Entrega estimada: ${date(o.estimatedDelivery)}</small></div>`).join('')}</div>`, '', `${late.length} ${late.length === 1 ? 'entrega requiere' : 'entregas requieren'} atención`);
    html += `</div><div>`;
    html += card('Agenda de hoy', today.length ? `<div class="card-body">${today.map(a => `<div class="mini-appointment"><div class="date-tile">${new Date(a.startsAt).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}</div><div><strong>${esc(a.customer)}</strong><p>${esc(a.vehicle)} · ${esc(a.plate)}</p><p>${esc(a.service)}</p></div></div>`).join('')}</div>` : empty('Sin citas pendientes', 'La agenda está libre para nuevos ingresos.'), btn('+ Nueva cita', 'appointment', '', 'subtle small'), `${today.length} ${today.length === 1 ? 'cita programada' : 'citas programadas'}`);
    html += card('Distribución del trabajo', `<div class="card-body">${distribution.map(([title, count]) => `<div class="progress-row"><div><span>${title}</span><strong>${count}</strong></div><progress value="${count}" max="${Math.max(1, open.length)}" aria-label="${title}"></progress></div>`).join('')}</div>`, '', 'Carga actual por etapa');
    html += `</div></div>`;

    $('#content').innerHTML = html;
    requestAnimationFrame(() => { observeReveal($('#content')); staggerReveal($('#content'), '.mini-appointment,.record,.order-item'); });
}

function ordersPage() {
    const filter = state.filters.orders || { query: '', status: '' };
    $('#content').innerHTML = head('Órdenes de servicio', 'Controla el proceso completo de cada vehículo.', office() ? btn('+ Recibir vehículo', 'receive', '', 'primary') : '') + `<div class="toolbar"><input id="search" type="search" placeholder="Buscar folio, cliente o placa…" aria-label="Buscar órdenes" value="${esc(filter.query)}"><select id="status-filter" aria-label="Filtrar estado"><option value="">Todos los estados</option>${Object.keys(names).slice(0, 10).map(s => `<option value="${s}" ${filter.status === s ? 'selected' : ''}>${label(s)}</option>`).join('')}</select><span id="result-count" class="result-count" role="status"></span>${btn('Limpiar filtros', 'clear-filters', '', 'subtle small')}</div><section class="card" id="orders-table"></section>`;
    const update = () => {
        const query = $('#search').value, status = $('#status-filter').value; state.filters.orders = { query, status };
        const list = state.orders.filter(o => (!status || o.status === status) && normalize([o.folio, o.customer, o.plate, o.vehicle].join(' ')).includes(normalize(query)));
        $('#result-count').textContent = `${list.length} de ${state.orders.length} órdenes`;
        $('#orders-table').innerHTML = list.length ? orderTable(list) : empty('No hay órdenes para mostrar', query || status ? 'Prueba otra búsqueda o limpia los filtros.' : 'Recibe un vehículo para crear la primera orden.');
        staggerReveal($('#orders-table'), '.order-item,tbody tr');
    };
    $('#search').oninput = update; $('#status-filter').onchange = update; update();
    requestAnimationFrame(() => observeReveal($('#content')));
}

function catalogToolbar(key, placeholder) {
    const f = state.filters[key] || {};
    return `<div class="toolbar"><input id="catalog-search" type="search" aria-label="Buscar registros" placeholder="${placeholder}" value="${esc(f.query || '')}"><select id="catalog-filter" aria-label="Filtrar registros">${(key === 'appointments' ? [['', 'Todos los estados'], ['Pendiente', 'Pendiente'], ['Confirmada', 'Confirmada'], ['EnEspera', 'En espera'], ['Atendida', 'Atendida'], ['Cancelada', 'Cancelada'], ['NoAsistio', 'No asistió']] : [['', 'Todos los registros'], ['Activo', 'Activos'], ['Inactivo', 'Inactivos']]).map(([v, l]) => `<option value="${v}" ${f.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span id="catalog-count" class="result-count" role="status"></span></div>`;
}

function bindCatalog(key) {
    const rows = [...document.querySelectorAll('#content tbody tr')];
    const noResults = document.createElement('div'); noResults.className = 'empty hidden'; noResults.textContent = 'No hay coincidencias. Prueba otra búsqueda o cambia el filtro.'; $('#content').append(noResults);
    const update = () => {
        const query = $('#catalog-search').value, status = $('#catalog-filter').value; state.filters[key] = { query, status }; let count = 0;
        rows.forEach(row => {
            const match = normalize(row.textContent).includes(normalize(query)) && (!status || [...row.querySelectorAll('.badge')].some(b => b.textContent === label(status)));
            row.hidden = !match; if (match) count++;
        });
        $('#catalog-count').textContent = `${count} de ${rows.length} registros`;
        noResults.classList.toggle('hidden', count > 0 || rows.length === 0);
        staggerReveal($('#content table'), 'tbody tr');
    };
    $('#catalog-search').oninput = update; $('#catalog-filter').onchange = update; update();
    requestAnimationFrame(() => observeReveal($('#content')));
}

function customersPage() {
    $('#content').innerHTML = head('Clientes', 'La información de contacto de quienes confían en tu taller.', btn('+ Nuevo cliente', 'customer', '', 'primary')) + catalogToolbar('customers', 'Buscar nombre, teléfono o correo…') + card('Directorio de clientes', state.customers.length ? table(['Nombre', 'Teléfono', 'Correo', 'Estado', ''], state.customers.map(c => `<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.phone)}</td><td>${esc(c.email || '—')}</td><td>${badge(c.active ? 'Activo' : 'Inactivo')}</td><td>${btn('Editar', 'customer', c.id, 'small')}</td></tr>`)) : empty('Agrega tu primer cliente'));
    bindCatalog('customers');
}

function vehiclesPage() {
    // CORRECCIÓN CLAVE: (v.mileage || 0).toLocaleString() protege contra kilometrajes nulos
    $('#content').innerHTML = head('Vehículos', 'Identificación e historial de los vehículos registrados.', btn('+ Nuevo vehículo', 'vehicle', '', 'primary')) + catalogToolbar('vehicles', 'Buscar placa, marca, modelo o cliente…') + card('Vehículos registrados', state.vehicles.length ? table(['Vehículo', 'Placa / VIN', 'Cliente', 'Kilometraje', 'Estado', ''], state.vehicles.map(v => `<tr><td><strong>${esc(v.brand + ' ' + v.model)}</strong><small>${v.year} · ${esc(v.color || 'Sin color')}</small></td><td>${esc(v.plate)}<small>${esc(v.vin || 'VIN no registrado')}</small></td><td>${esc(v.customer)}</td><td>${Number(v.mileage || 0).toLocaleString()} km</td><td>${badge(v.active ? 'Activo' : 'Inactivo')}</td><td>${btn('Editar', 'vehicle', v.id, 'small')}</td></tr>`)) : empty('Registra el primer vehículo', 'Primero agrega al cliente propietario.'));
    bindCatalog('vehicles');
}

function servicesPage() {
    $('#content').innerHTML = head('Catálogo de servicios', 'Define los servicios, precios de referencia y duración.', btn('+ Nuevo servicio', 'service', '', 'primary')) + catalogToolbar('services', 'Buscar servicio…') + card('Servicios del taller', table(['Servicio', 'Precio base', 'Duración', 'Estado', ''], state.services.map(s => `<tr><td><strong>${esc(s.name)}</strong><small class="wrap">${esc(s.description)}</small></td><td>${money(s.basePrice)}</td><td>${s.estimatedMinutes} min</td><td>${badge(s.active ? 'Activo' : 'Inactivo')}</td><td>${btn('Editar', 'service', s.id, 'small')}</td></tr>`)));
    bindCatalog('services');
}

function appointmentsPage() {
    // CORRECCIÓN CLAVE: Protección de nulos en localeCompare para ordenar correctamente
    $('#content').innerHTML = head('Agenda del taller', 'Planifica los ingresos y confirma la atención de cada cita.', btn('+ Nueva cita', 'appointment', '', 'primary')) + catalogToolbar('appointments', 'Buscar cliente, placa, servicio o estado…') + card('Citas programadas', state.appointments.length ? table(['Horario', 'Cliente / vehículo', 'Servicio', 'Estado', ''], [...state.appointments].sort((a, b) => String(a.startsAt || '').localeCompare(String(b.startsAt || ''))).map(a => `<tr><td>${date(a.startsAt)}<small>Hasta ${date(a.endsAt)}</small></td><td>${esc(a.customer)}<small>${esc(a.vehicle)} · ${esc(a.plate)}</small></td><td>${esc(a.service)}</td><td>${badge(a.status)}</td><td>${!['Atendida', 'Cancelada', 'NoAsistio'].includes(a.status) ? `${btn('Recibir', 'receive-appointment', a.id, 'small')}${btn('Estado', 'appointment-status', a.id, 'subtle small')}` : ''}</td></tr>`)) : empty('Tu agenda está disponible', 'Crea una cita para programar el siguiente ingreso.'));
    bindCatalog('appointments');
}

async function usersPage() {
    const version = renderVersion; const users = await api('/users'); if (version !== renderVersion) return;
    state.users = users || []; // Protección de lista
    $('#content').innerHTML = head('Equipo del taller', 'Cuentas personales y responsabilidades claras.', btn('+ Agregar usuario', 'user', '', 'primary')) + card('Personal', table(['Nombre', 'Correo', 'Rol', 'Estado', ''], state.users.map(u => `<tr><td>${esc(u.fullName)}</td><td>${esc(u.email)}</td><td>${u.roles.map(badge).join(' ')}</td><td>${badge(u.active ? 'Activo' : 'Inactivo')}</td><td>${u.active && u.id !== state.user.id ? btn('Desactivar', 'deactivate-user', u.id, 'small danger') : ''}</td></tr>`)));
    requestAnimationFrame(() => { observeReveal($('#content')); staggerReveal($('#content table'), 'tbody tr'); });
}

async function auditPage() {
    const version = renderVersion; const entries = await api('/audit') || []; // Protección de lista
    if (version !== renderVersion) return;
    $('#content').innerHTML = head('Bitácora de auditoría', 'Últimas 200 operaciones registradas en el sistema.') + card('Actividad del equipo', entries.length ? table(['Fecha', 'Usuario', 'Acción', 'Registro'], entries.map(e => `<tr><td>${date(e.createdAt)}</td><td>${esc(e.actor)}</td><td>${esc(e.action)}</td><td>${esc(e.resource)} ${e.resourceId || ''}</td></tr>`)) : empty('Sin actividad registrada'));
    requestAnimationFrame(() => { observeReveal($('#content')); staggerReveal($('#content table'), 'tbody tr'); });
}

function openForm(title, html, onSubmit, submitText = 'Guardar') {
    const modal = $('#modal'); modal.dataset.saving = 'false';
    $('#modal-content').innerHTML = `<div class="modal-head"><h2 id="modal-title">${title}</h2>${btn(icon('close'), 'close', '', 'close subtle')}</div><form id="modal-form" class="modal-body"><div class="form-grid">${html}</div><div id="form-error" class="error hidden" role="alert" tabindex="-1"></div><div class="form-actions">${btn('Cancelar', 'close', '', 'subtle')}<button class="primary" type="submit">${submitText}</button></div></form>`;
    const form = $('#modal-form'), error = $('#form-error'), submit = $('button[type=submit]', form);
    form.onsubmit = async e => {
        e.preventDefault(); if (modal.dataset.saving === 'true') return;
        const data = Object.fromEntries(new FormData(form)); form.querySelectorAll('input[type=checkbox]').forEach(i => data[i.name] = i.checked);
        modal.dataset.saving = 'true'; form.setAttribute('aria-busy', 'true'); error.classList.add('hidden');
        const buttons = [...modal.querySelectorAll('button')]; buttons.forEach(b => b.disabled = true); submit.textContent = 'Guardando…';
        $('.form-grid', form).inert = true;
        try { await onSubmit(data, form); }
        catch (err) { error.textContent = err.message; error.classList.remove('hidden'); error.focus(); return; }
        finally { modal.dataset.saving = 'false'; form.removeAttribute('aria-busy'); $('.form-grid', form).inert = false; buttons.forEach(b => b.disabled = false); submit.textContent = submitText; }
        modal.close();
        if (state.pendingRoute) { history.replaceState(null, '', '#' + state.pendingRoute); state.pendingRoute = null; state.tab = 'resumen'; }
        try { await refresh(); await render(); toast('Cambios guardados.'); } catch { toast('El registro se guardó. No se pudo actualizar la lista; pulsa Actualizar para verla.'); }
        if (state.pendingAccess) { const access = state.pendingAccess; state.pendingAccess = null; showAccess(access); }
    };
    modal.showModal();
}

function closeMenu() { const menu = $('#nav-dialog'); if (menu?.open) menu.close(); }
function openMenu() { const menu = $('#nav-dialog'), sidebar = $('#sidebar'), trigger = $('[data-action=menu]'), shell = $('.shell'); menu.append(sidebar); trigger.setAttribute('aria-expanded', 'true'); menu.onclose = () => { shell.prepend(sidebar); trigger.setAttribute('aria-expanded', 'false'); }; menu.onclick = e => { if (e.target === menu) menu.close(); }; menu.showModal(); }
matchMedia('(min-width:761px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
$('#modal')?.addEventListener('cancel', e => { if ($('#modal').dataset.saving === 'true') e.preventDefault(); });

function customerForm(id) { const c = state.customers.find(c => c.id === +id) || {}; openForm(id ? 'Editar cliente' : 'Nuevo cliente', field('name', 'Nombre completo', 'text', c.name, 'required maxlength="150"') + field('phone', 'Teléfono', 'tel', c.phone, 'required maxlength="30"') + field('email', 'Correo electrónico', 'email', c.email, 'maxlength="254"') + field('address', 'Dirección', 'text', c.address, 'maxlength="400"') + (id ? check('active', 'Cliente activo', c.active) : ''), d => api('/customers' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', { ...d, email: d.email?.trim() || null, active: id ? d.active : true })); }
function vehicleForm(id) { if (!state.customers.some(c => c.active)) { toast('Primero registra un cliente activo.'); return; } const v = state.vehicles.find(v => v.id === +id) || {}; openForm(id ? 'Editar vehículo' : 'Nuevo vehículo', select('customerId', 'Propietario', state.customers.filter(c => c.active).map(c => [c.id, c.name]), v.customerId) + field('plate', 'Placa', 'text', v.plate, 'required maxlength="20"') + field('brand', 'Marca', 'text', v.brand, 'required maxlength="60"') + field('model', 'Modelo', 'text', v.model, 'required maxlength="80"') + field('year', 'Año', 'number', v.year || new Date().getFullYear(), 'required min="1900" max="2100"') + field('mileage', 'Kilometraje', 'number', v.mileage || 0, 'required min="0" max="10000000"') + field('vin', 'VIN (opcional)', 'text', v.vin, 'minlength="17" maxlength="17"') + field('color', 'Color', 'text', v.color, 'maxlength="40"') + field('fuel', 'Combustible', 'text', v.fuel, 'maxlength="40"') + field('transmission', 'Transmisión', 'text', v.transmission, 'maxlength="40"') + (id ? check('active', 'Vehículo activo', v.active) : ''), d => api('/vehicles' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', { ...d, customerId: +d.customerId, year: +d.year, mileage: +d.mileage, vin: d.vin.trim().toUpperCase() || null, active: id ? d.active : true })); }
function serviceForm(id) { const s = state.services.find(s => s.id === +id) || {}; openForm(id ? 'Editar servicio' : 'Nuevo servicio', field('name', 'Nombre', 'text', s.name, 'required maxlength="120"') + field('basePrice', 'Precio base', 'number', s.basePrice || 0, 'required min="0" max="10000000" step="0.01"') + field('estimatedMinutes', 'Duración estimada (minutos)', 'number', s.estimatedMinutes || 60, 'required min="1" max="10080"') + area('description', 'Descripción', s.description, false) + (id ? check('active', 'Servicio activo', s.active) : ''), d => api('/services' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', { ...d, basePrice: +d.basePrice, estimatedMinutes: +d.estimatedMinutes, active: id ? d.active : true })); }
const vehicleOptions = () => state.vehicles.filter(v => v.active && state.customers.some(c => c.id === v.customerId && c.active)).map(v => [v.id, `${v.plate} · ${v.brand} ${v.model} · ${v.customer}`]);
function appointmentForm() { if (!vehicleOptions().length) { toast('Registra un cliente y su vehículo primero.'); return; } const start = new Date(Date.now() + 86400000); openForm('Nueva cita', select('vehicleId', 'Vehículo', vehicleOptions()) + select('serviceId', 'Servicio', state.services.filter(s => s.active).map(s => [s.id, s.name])) + field('startsAt', 'Inicio (hora local)', 'datetime-local', localInput(start), 'required') + field('endsAt', 'Fin (hora local)', 'datetime-local', localInput(new Date(start.getTime() + 3600000)), 'required') + area('reason', 'Motivo de la visita'), d => api('/appointments', 'POST', { ...d, vehicleId: +d.vehicleId, serviceId: +d.serviceId, startsAt: new Date(d.startsAt).toISOString(), endsAt: new Date(d.endsAt).toISOString() })); }

const checklistItems = ['Carrocería', 'Cristales y espejos', 'Luces', 'Neumáticos', 'Interior y tablero'];
function receiveForm(appointmentId) {
    if (!vehicleOptions().length) { toast('Registra un cliente y su vehículo primero.'); return; }
    const a = state.appointments.find(a => a.id === +appointmentId);
    const options = a ? vehicleOptions().filter(([id]) => id === a.vehicleId) : vehicleOptions();
    openForm('Recepción del vehículo', select('vehicleId', 'Vehículo', options, a?.vehicleId) + select('priority', 'Prioridad', ['Normal', 'Alta', 'Urgente']) + field('entryMileage', 'Kilometraje de ingreso', 'number', state.vehicles.find(v => v.id === (a?.vehicleId || options[0]?.[0]))?.mileage || 0, 'required min="0" max="10000000"') + field('estimatedDelivery', 'Entrega estimada (opcional)', 'datetime-local', '') + area('reason', 'Motivo de ingreso', a?.reason) + field('fuelPercent', 'Combustible (%)', 'number', 50, 'required min="0" max="100"') + field('keyCount', 'Cantidad de llaves', 'number', 1, 'required min="0" max="20"') + `<div class="full actions">${check('spareTire', 'Llanta de refacción')}${check('jack', 'Gato')}${check('tools', 'Herramientas')}</div>` + area('belongings', 'Objetos personales declarados', '', false) + area('existingDamage', 'Daños y observaciones de ingreso', '', false) + `<div class="full"><h3>Checklist de recepción</h3>${checklistItems.map((item, i) => `<div class="checklist-row"><label for="check-${i}">${item}</label><select id="check-${i}" name="condition${i}"><option>Bien</option><option>Daño</option><option>No aplica</option></select><input name="notes${i}" placeholder="Observaciones" maxlength="500" aria-label="Observaciones de ${item}"></div>`).join('')}</div>`, async d => {
        const result = await api('/orders', 'POST', { vehicleId: +d.vehicleId, appointmentId: a?.id || null, priority: d.priority, entryMileage: +d.entryMileage, estimatedDelivery: d.estimatedDelivery ? new Date(d.estimatedDelivery).toISOString() : null, reason: d.reason, fuelPercent: +d.fuelPercent, keyCount: +d.keyCount, spareTire: d.spareTire, jack: d.jack, tools: d.tools, belongings: d.belongings, existingDamage: d.existingDamage, checklist: checklistItems.map((item, i) => ({ item, condition: d['condition' + i], notes: d['notes' + i] })) });
        state.pendingAccess = result.access; state.pendingRoute = 'order/' + result.id;
    }, 'Crear orden');
    $('#f-vehicleId').onchange = e => { $('#f-entryMileage').value = state.vehicles.find(v => v.id === +e.target.value)?.mileage || 0; };
}
function showAccess(access) { $('#modal').close(); $('#modal-content').innerHTML = `<div class="modal-head"><h2 id="modal-title">Acceso de seguimiento</h2>${btn(icon('close'), 'close', '', 'close subtle')}</div><div class="modal-body qr-card"><p>Comparte estos datos con el cliente. El código se muestra únicamente al generarlo.</p><img src="data:image/svg+xml;base64,${btoa((encodeURIComponent(access.qrSvg)))}" alt="Código QR de seguimiento de la orden"><p><strong>${esc(access.folio)}</strong></p><div class="code">${esc(access.code)}</div><p class="helper">Vigente hasta ${date(access.expiresAt)}. Un nuevo código revoca el anterior.</p><p><a href="${esc(access.url)}" target="_blank" rel="noopener">Abrir seguimiento ↗</a></p><div class="actions">${btn('Copiar enlace y código', 'copy-access', '', 'primary')}${btn('Descargar QR', 'download-qr')}</div><p id="access-feedback" class="helper" role="status"></p></div>`; state.lastAccess = access; $('#modal').showModal(); }

async function renderOrder(id, version = renderVersion) {
    const o = await api('/orders/' + id); if (version !== renderVersion || state.view !== 'order/' + id) return; currentOrder = o;
    const next = office() ? o.nextStatuses : o.nextStatuses.filter(s => ['Diagnostico', 'EnReparacion', 'Pruebas', 'Reparado'].includes(s));
    $('#content').innerHTML = btn('← Volver a órdenes', 'navigate', 'orders', 'back subtle') + head(esc(o.folio), `${esc(o.vehicle.brand)} ${esc(o.vehicle.model)} · ${esc(o.vehicle.plate)} · ${esc(o.customer.name)}`, `${badge(o.status)} ${next.length ? btn('Cambiar estado', 'transition', '', 'primary') : ''}${office() && o.status === 'ListoParaEntrega' ? btn('Entregar vehículo', 'delivery', '', 'primary') : ''}`, 'ORDEN DE SERVICIO') + `<div class="meta"><div><small>Ingreso</small><strong>${date(o.enteredAt)}</strong></div><div><small>Entrega estimada</small><strong>${date(o.estimatedDelivery)}</strong></div><div><small>Prioridad</small>${badge(o.priority)}</div><div><small>Saldo pendiente</small><strong>${money(o.balance)}</strong></div></div><nav class="tabs" aria-label="Secciones de la orden">${[['resumen', 'Resumen'], ['diagnostico', 'Diagnóstico'], ['cotizaciones', 'Cotizaciones'], ['trabajos', 'Trabajos y pruebas'], ['evidencias', 'Evidencias'], ['comunicacion', 'Actualizaciones'], ...(office() ? [['pagos', 'Pagos y entrega']] : [])].map(([v, l]) => btn(l, 'tab', v, 'tab ' + (state.tab === v ? 'active' : ''))).join('')}</nav><div id="order-panel"></div>`;
    updateTabs(); orderPanel();
}
function updateTabs() { document.querySelectorAll('[data-action=tab]').forEach(el => { const active = el.dataset.id === state.tab; el.classList.toggle('active', active); if (active) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current'); }); }

const record = (title, body, extra = '') => `<div class="record"><div class="record-top"><h3>${title}</h3>${extra}</div>${body}</div>`;
const frozen = () => currentOrder.status === 'Entregado';
function orderPanel() {
    const o = currentOrder, p = $('#order-panel'), editable = !frozen();
    if (state.tab === 'resumen') p.innerHTML = `<div class="grid"><div>${card('Recepción del vehículo', `<div class="card-body"><h3>Motivo de ingreso</h3><p>${esc(o.reason)}</p><div class="meta"><div><small>Kilometraje</small><strong>${Number(o.entryMileage || 0).toLocaleString()} km</strong></div><div><small>Combustible</small><strong>${o.reception.fuelPercent}%</strong></div><div><small>Llaves</small><strong>${o.reception.keyCount}</strong></div><div><small>Accesorios</small><strong>${[['spareTire', 'Refacción'], ['jack', 'Gato'], ['tools', 'Herramientas']].filter(([key]) => o.reception[key]).map(([, name]) => name).join(', ') || 'Ninguno'}</strong></div></div><h3>Checklist</h3>${table(['Elemento', 'Estado', 'Observación'], o.reception.checklist.map(c => `<tr><td>${esc(c.item)}</td><td>${esc(c.condition)}</td><td class="wrap">${esc(c.notes || '—')}</td></tr>`))}<p><strong>Daños registrados:</strong> ${esc(o.reception.existingDamage || 'Sin observaciones')}</p><p><strong>Objetos declarados:</strong>${esc(o.reception.belongings || 'Ninguno')}</p></div>`)
}${card('Historial de estados', `<div class="card-body timeline">${o.history.map(h => record(esc(label(h.current)), `<small>${date(h.createdAt)} · ${esc(h.author)}</small><p>${esc(h.comment || '')}</p>`)).join('')}</div>`)}</div><div>${card('Equipo asignado', o.assignments.length ? `<div class="card-body">${o.assignments.map(a => record(esc(a.mechanic), `<small>${a.endedAt ? 'Finalizó ' + date(a.endedAt) : 'Asignación activa'}</small>`, !a.endedAt && office() && editable ? btn('Finalizar', 'end-assignment', a.id, 'small subtle') : '')).join('')}</div>` : empty('Sin mecánico asignado', 'Asigna al responsable para habilitar su acceso a esta orden.'), office() && editable ? btn('+ Asignar', 'assign', '', 'small') : '')}${office() ? card('Seguimiento del cliente', `<div class="card-body"><p class="helper">${o.tracking ? 'Acceso vigente hasta ' + date(o.tracking.expiresAt) : 'No hay un acceso de seguimiento activo.'}</p><div class="actions">${btn('Generar nuevo QR', 'tracking', '', 'small primary')}${o.tracking ? btn('Revocar acceso', 'revoke-tracking', '', 'small danger') : ''}</div><p class="helper">Al generar un nuevo QR, el código anterior deja de funcionar.</p></div>`) : ''}</div></div>`;
  if (state.tab === 'diagnostico') p.innerHTML = card('Diagnósticos y fallas', o.diagnoses.length ? `<div class="card-body">${o.diagnoses.map(d => record(esc(d.description), `<small>${date(d.createdAt)} · ${esc(d.author)}</small><p><strong>Causa:</strong> ${esc(d.cause)}</p><p><strong>Recomendación:</strong> ${esc(d.recommendation)}</p>${d.faults.map(f => `<p>${badge(f.priority)} ${esc(f.description)}</p>`).join('')}<span class="private-label">Información interna · Publica un resumen en Actualizaciones para el cliente.</span>`)).join('')}</div>` : empty('Sin diagnóstico registrado', 'Cambia la orden a Diagnóstico para registrar los hallazgos.'), o.status === 'Diagnostico' ? btn('+ Diagnóstico', 'diagnosis', '', 'primary small') : '');
  if (state.tab === 'cotizaciones') p.innerHTML = (office() && o.status === 'Cotizacion' ? `<div class="toolbar">${btn('+ Nueva versión', 'quote', '', 'primary')}<span class="helper">Cada versión reemplaza la propuesta completa y conserva las anteriores.</span></div>` : '') + (o.quotes.length ? o.quotes.map((q, index) => card(`Cotización · Versión ${q.version}`, `${table(['Concepto', 'Tipo', 'Cantidad', 'Precio', 'Importe'], q.lines.map(l => `<tr><td class="wrap">${esc(l.description)}</td><td>${esc(label(l.type))}</td><td>${l.quantity}</td><td>${money(l.unitPrice)}</td><td>${money(l.total)}</td></tr>`))}<div class="totals"><div><span>Subtotal</span><span>${money(q.subtotal)}</span></div><div><span>Descuento</span><span>− ${money(q.discount)}</span></div><div><span>Impuesto (${q.taxPercent}%)</span><span>${money(q.tax)}</span></div><div class="total"><span>Total</span><span>${money(q.total)}</span></div></div><div class="card-body"><p class="helper">Vence: ${date(q.expiresAt)}</p>${q.authorization ? `<div class="notice"><strong>${q.authorization.approved ? 'Consentimiento registrado' : 'Rechazo registrado'}</strong><br>${esc(q.authorization.consentEvidence)}<br>${date(q.authorization.createdAt)} · ${esc(q.authorization.recordedBy)}</div>` : ''}${office() && index === 0 && q.status === 'Pendiente' && o.status === 'Autorizacion' ? btn('Registrar respuesta del cliente', 'authorize', q.id, 'primary') : ''}</div>`, badge(q.status))).join('') : card('Cotizaciones', empty('Aún no hay una cotización', 'Registra un diagnóstico y cambia la orden a Cotización.')));
  if (state.tab === 'trabajos') p.innerHTML = `<div class="grid"><div>${card('Trabajos de reparación', o.repairs.length ? `<div class="card-body">${o.repairs.map(r => record(esc(r.description), `<small>${esc(r.author)} · ${date(r.createdAt)}</small><p>${r.completedAt ? 'Terminado: ' + date(r.completedAt) : 'En proceso'}</p>`, !r.completedAt && o.status === 'EnReparacion' ? btn('Finalizar', 'complete-repair', r.id, 'small primary') : badge('Terminado'))).join('')}</div>` : empty('Sin trabajos registrados', 'Los trabajos deben corresponder a conceptos autorizados.'), o.status === 'EnReparacion' ? btn('+ Trabajo', 'repair', '', 'small primary') : '')}</div><div>${card('Pruebas del vehículo', o.tests.length ? `<div class="card-body">${o.tests.map(t => record(esc(t.type), `<small>${date(t.createdAt)}</small><p>${esc(t.notes)}</p>`, badge(t.result))).join('')}</div>` : empty('Sin pruebas registradas', 'Al terminar los trabajos, cambia la orden a Pruebas.'), o.status === 'Pruebas' ? btn('+ Prueba', 'test', '', 'small primary') : '')}</div></div>`;
  if (state.tab === 'evidencias') p.innerHTML = card('Fotografías y documentos', o.evidence.length ? `<div class="card-body">${o.evidence.map(e => record(esc(e.description), `<small>${esc(label(e.stage))} · ${date(e.createdAt)}</small><p>${e.visibleToCustomer ? '<span class="public-label">Visible para el cliente</span>' : '<span class="private-label">Uso interno</span>'}</p>`, `<a href="/api/orders/${o.id}/evidence/${e.id}" target="_blank" rel="noopener">Descargar ↗</a>`)).join('')}</div>` : empty('Agrega la primera evidencia', 'JPEG, PNG o PDF, hasta 5 MB por archivo.'), editable ? btn('+ Adjuntar', 'evidence', '', 'primary small') : '');
  if (state.tab === 'comunicacion') p.innerHTML = card('Actualizaciones de la orden', o.updates.length ? `<div class="card-body">${o.updates.map(u => record(esc(u.title), `<small>${date(u.createdAt)}</small><p>${esc(u.message)}</p>`, u.visibleToCustomer ? '<span class="public-label">Visible para el cliente</span>' : '<span class="private-label">Nota interna</span>')).join('')}</div>` : empty('Mantén informado al cliente', 'Solo verá los mensajes que marques como visibles.'), editable ? btn('+ Actualización', 'update', '', 'primary small') : '');
  if (state.tab === 'pagos') p.innerHTML = `<div class="grid"><div>${card('Pagos registrados', o.payments.length ? table(['Fecha', 'Método', 'Referencia', 'Monto'], o.payments.map(p => `<tr><td>${date(p.createdAt)}</td><td>${esc(p.method)}</td><td>${esc(p.reference || '—')}</td><td>${money(p.amount)}</td></tr>`)) : empty('No hay pagos registrados'), editable && o.quotes[0]?.status === 'Autorizada' && o.balance > 0 ? btn('+ Registrar pago', 'payment', '', 'primary small') : '')}${o.delivery ? card('Entrega completada', `<div class="card-body"><p><strong>Recibió:</strong> ${esc(o.delivery.receivedBy)}</p><p><strong>Fecha:</strong> ${date(o.delivery.createdAt)}</p><p><strong>Kilometraje de salida:</strong> ${o.delivery.exitMileage}</p><p>${esc(o.delivery.notes || 'Entrega con conformidad del cliente.')}</p></div>`) : ''}</div><div>${card('Resumen de la cuenta', `<div class="totals"><div><span>Total autorizado</span><span>${money(o.balance + o.paid)}</span></div><div><span>Pagos recibidos</span><span>${money(o.paid)}</span></div><div class="total"><span>Saldo</span><span>${money(o.balance)}</span></div></div><div class="card-body"><p class="helper">${state.settings.requirePayment ? 'La entrega requiere saldo liquidado.' : 'El taller permite entregar con saldo pendiente.'}</p>${o.status === 'ListoParaEntrega' ? btn('Entregar vehículo', 'delivery', '', 'primary') : ''}</div>`)}</div></div>`;
}

const orderPost = (suffix, data = {}) => api('/orders/' + currentOrder.id + '/' + suffix, 'POST', data);
function transitionForm() { const list = office() ? currentOrder.nextStatuses : currentOrder.nextStatuses.filter(s => ['Diagnostico', 'EnReparacion', 'Pruebas', 'Reparado'].includes(s)); openForm('Cambiar estado', select('status', 'Siguiente estado', list) + area('comment', 'Comentario', '', false), d => orderPost('status', d)); }
function diagnosisForm() { openForm('Registrar diagnóstico', area('description', 'Problema encontrado') + area('cause', 'Causa probable o identificada') + area('recommendation', 'Recomendación') + area('faults', 'Fallas adicionales (una por línea)', '', false) + select('priority', 'Prioridad de las fallas', ['Normal', 'Alta', 'Urgente']), d => orderPost('diagnoses', { description: d.description, cause: d.cause, recommendation: d.recommendation, faults: d.faults.split('\n').map(f => f.trim()).filter(Boolean).map(description => ({ description, priority: d.priority })) })); }
function addQuoteLine(line = {}) {
    const div = document.createElement('div'); div.className = 'quote-line';
    div.innerHTML = `<label>Tipo<select aria-label="Tipo de concepto" data-key="type"><option value="Servicio">Servicio</option><option value="ManoDeObra">Mano de obra</option><option value="Refaccion">Refacción</option></select></label><label>Descripción<input data-key="description" aria-label="Descripción del concepto" placeholder="Ej. Cambio de aceite" value="${esc(line.description)}" required maxlength="500"></label><label>Cantidad<input data-key="quantity" aria-label="Cantidad" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" value="${line.quantity || 1}" required></label><label>Precio<input data-key="unitPrice" aria-label="Precio unitario" type="number" inputmode="decimal" min="0" max="10000000" step="0.01" value="${line.unitPrice || 0}" required></label><button type="button" data-action="remove-line" class="icon subtle" aria-label="Eliminar concepto">${icon('close')}</button><output class="line-total"></output>`;
    $('[data-key=type]', div).value = line.type || 'Servicio'; $('#quote-lines').append(div); updateQuoteTotals();
}

const cents = value => { const [whole, fraction = ''] = String(value || '0').split('.'); return BigInt(whole || 0) * 100n + BigInt((fraction + '00').slice(0, 2)); };
function updateQuoteTotals() {
    if (!$('#quote-totals')) return;
    let subtotal = 0n;
    for (const row of document.querySelectorAll('#quote-lines .quote-line')) {
        const quantity = $('[data-key=quantity]', row), price = $('[data-key=unitPrice]', row);
        const amount = quantity.validity.valid && price.validity.valid ? (cents(quantity.value) * cents(price.value) + 50n) / 100n : 0n;
        subtotal += amount; $('.line-total', row).textContent = 'Importe: ' + money(Number(amount) / 100);
    }
    const discountInput = $('#f-discount'), taxInput = $('#f-taxPercent');
    discountInput.setCustomValidity('');
    const discount = discountInput.validity.valid ? cents(discountInput.value) : 0n;
    const rate = taxInput.validity.valid ? cents(taxInput.value) : 0n;
    const base = subtotal - discount, tax = base >= 0n ? (base * rate + 5000n) / 10000n : 0n;
    discountInput.setCustomValidity(discount > subtotal ? 'El descuento no puede superar el subtotal.' : '');
    $('#quote-totals').innerHTML = `<div><span>Subtotal</span><span>${money(Number(subtotal) / 100)}</span></div><div><span>Impuesto</span><span>${money(Number(tax) / 100)}</span></div><div class="total"><span>Total estimado</span><span>${base < 0n ? 'Revisa el descuento' : money(Number(base + tax) / 100)}</span></div>`;
}

function quoteForm() {
    const latest = currentOrder.quotes[0];
    openForm('Nueva versión de cotización', `<p class="form-note full">Incluye la propuesta completa. Las versiones anteriores y sus autorizaciones se conservarán.</p><div class="full"><div id="quote-lines"></div>${btn('+ Agregar concepto', 'add-line', '', 'small')}</div>` + field('discount', 'Descuento', 'number', latest?.discount || 0, 'required min="0" max="10000000" step="0.01" inputmode="decimal"') + field('taxPercent', 'Impuesto (%)', 'number', state.settings.taxPercent, 'required min="0" max="100" step="0.01" inputmode="decimal"') + field('expiresAt', 'Vigencia (hora local)', 'datetime-local', localInput(new Date(Date.now() + 7 * 86400000)), 'required') + '<div id="quote-totals" class="totals full" role="status" aria-live="polite" aria-atomic="true"></div>', (d, form) => {
        const lines = [...form.querySelectorAll('#quote-lines .quote-line')].map(row => Object.fromEntries([...row.querySelectorAll('[data-key]')].map(i => [i.dataset.key, i.type === 'number' ? +i.value : i.value])));
        if (!lines.length) throw new Error('Agrega al menos un concepto.');
        return orderPost('quotes', { lines, discount: +d.discount, taxPercent: +d.taxPercent, expiresAt: new Date(d.expiresAt).toISOString() });
    }, 'Guardar cotización');
    if (latest) latest.lines.forEach(addQuoteLine); else addQuoteLine();
    $('#modal-form').addEventListener('input', updateQuoteTotals); updateQuoteTotals();
}

function authorizationForm(id) { openForm('Respuesta del cliente', select('approved', 'Respuesta', [['true', 'Autoriza todos los conceptos'], ['false', 'Rechaza la cotización']]) + area('consentEvidence', 'Evidencia del consentimiento o rechazo') + '<p class="form-note full">Describe quién respondió, fecha, medio de contacto y referencia a la constancia. Adjunta la constancia en Evidencias cuando corresponda.</p>', d => orderPost('quotes/' + id + '/authorization', { approved: d.approved === 'true', consentEvidence: d.consentEvidence }), 'Registrar respuesta'); }
function repairForm() { const q = currentOrder.quotes[0]; openForm('Registrar trabajo', select('quoteLineId', 'Concepto autorizado', q.lines.map(l => [l.id, l.description])) + area('description', 'Trabajo a realizar'), d => orderPost('repairs', { quoteLineId: +d.quoteLineId, description: d.description })); }
function testForm() { openForm('Registrar prueba', select('type', 'Tipo', ['Carretera', 'Frenado', 'Electrónica', 'Funcionamiento', 'Inspección visual']) + select('result', 'Resultado', ['Satisfactorio', 'RequiereRevision', 'NoSatisfactorio']) + area('notes', 'Resultado y observaciones'), d => orderPost('tests', d)); }
function evidenceForm() { openForm('Adjuntar evidencia', field('file', 'Archivo JPEG, PNG o PDF', 'file', '', 'required accept="image/jpeg,image/png,application/pdf"') + select('stage', 'Etapa', ['Recepcion', 'Daño', 'Diagnostico', 'Refaccion', 'Reparacion', 'Prueba', 'Entrega']) + area('description', 'Descripción') + check('visibleToCustomer', 'Mostrar al cliente'), (_, form) => { const data = new FormData(form); data.set('visibleToCustomer', form.elements.visibleToCustomer.checked ? 'true' : 'false'); return orderPost('evidence', data); }); }
function updateForm() { openForm('Nueva actualización', field('title', 'Título', 'text', '', 'required maxlength="150"') + area('message', 'Mensaje') + check('visibleToCustomer', 'Mostrar esta actualización al cliente'), d => orderPost('updates', d)); }
function paymentForm() { openForm('Registrar pago', `<p class="notice full">Saldo pendiente: ${money(currentOrder.balance)}</p>` + field('amount', 'Monto recibido', 'number', currentOrder.balance, 'required min="0.01" max="' + currentOrder.balance + '" step="0.01"') + select('method', 'Método', ['Efectivo', 'Tarjeta', 'Transferencia', 'Otro']) + field('reference', 'Referencia (opcional)', 'text', '', 'maxlength="100"'), d => orderPost('payments', { ...d, amount: +d.amount })); }
function deliveryForm() { openForm('Entregar vehículo', `<p class="notice full">Saldo pendiente: ${money(currentOrder.balance)}</p>` + field('exitMileage', 'Kilometraje de salida', 'number', currentOrder.entryMileage, 'required min="' + currentOrder.entryMileage + '" max="10000000"') + field('receivedBy', 'Nombre de quien recibe', 'text', currentOrder.customer.name, 'required maxlength="150"') + area('notes', 'Observaciones de entrega', '', false) + check('customerAccepted', 'El cliente recibió el vehículo y manifestó su conformidad'), d => orderPost('delivery', { ...d, exitMileage: +d.exitMileage }), 'Confirmar entrega'); }
function userForm() { openForm('Agregar usuario', field('fullName', 'Nombre completo', 'text', '', 'required maxlength="150"') + field('email', 'Correo electrónico', 'email', '', 'required') + field('password', 'Contraseña inicial', 'password', '', 'required minlength="12" autocomplete="new-password"') + select('role', 'Rol', ['Recepcion', 'Mecanico', 'Administrador']) + '<p class="form-note full">Contraseña de 12 caracteres o más, con mayúsculas, minúsculas, números y símbolos.</p>', d => api('/users', 'POST', d)); }
async function confirmAction(title, text, operation) { openForm(title, `<p class="full">${esc(text)}</p>`, operation, 'Confirmar'); }

const actions = {
    account: () => openForm('Cambiar mi contraseña', field('currentPassword', 'Contraseña actual', 'password', '', 'required autocomplete="current-password"') + field('newPassword', 'Nueva contraseña', 'password', '', 'required minlength="12" autocomplete="new-password"'), async d => { await api('/auth/password', 'POST', d); csrf = (await api('/auth/csrf')).token; }),
    navigate: id => { closeMenu(); state.tab = 'resumen'; location.hash = id; }, order: id => { state.tab = 'resumen'; location.hash = 'order/' + id; }, menu: openMenu, 'close-menu': closeMenu, close: () => { if ($('#modal').dataset.saving !== 'true') $('#modal').close(); },
    refresh: async () => { await refresh(); await render(); }, 'clear-filters': () => { state.filters.orders = { query: '', status: '' }; ordersPage(); $('#search').focus(); },
    logout: async () => { await api('/auth/logout', 'POST'); ++renderVersion; state.user = null; state.filters = {}; history.replaceState(null, '', location.pathname); await boot(); }, customer: customerForm, vehicle: vehicleForm, service: serviceForm, appointment: appointmentForm, receive: () => receiveForm(), 'receive-appointment': receiveForm,
    'appointment-status': id => openForm('Estado de cita', select('status', 'Estado', ['Pendiente', 'Confirmada', 'EnEspera', 'Cancelada', 'NoAsistio']), d => api('/appointments/' + id + '/status', 'POST', d)),
    tab: id => { state.tab = id; updateTabs(); orderPanel(); }, transition: transitionForm, diagnosis: diagnosisForm, quote: quoteForm, 'add-line': () => { addQuoteLine(); $('#quote-lines .quote-line:last-child [data-key=description]').focus(); }, 'remove-line': (_, el) => { const row = el.closest('.quote-line'), next = row.nextElementSibling || row.previousElementSibling; row.remove(); updateQuoteTotals(); (next?.querySelector('[data-key=description]') || $('[data-action=add-line]')).focus(); }, authorize: authorizationForm, repair: repairForm, test: testForm, evidence: evidenceForm, update: updateForm, payment: paymentForm, delivery: deliveryForm, user: userForm,
    assign: () => { if (!state.mechanics.length) { toast('Agrega un usuario con rol Mecánico en Equipo.'); return; } openForm('Asignar mecánico', select('mechanicId', 'Mecánico', state.mechanics.map(m => [m.id, m.fullName])), d => orderPost('assignments', d)); },
    'end-assignment': id => confirmAction('Finalizar asignación', 'El mecánico dejará de tener acceso a esta orden.', () => orderPost('assignments/' + id + '/end')),
    'complete-repair': id => confirmAction('Finalizar trabajo', 'Confirma que el trabajo está terminado. Se conservará la fecha y el responsable.', () => orderPost('repairs/' + id + '/complete')),
    tracking: () => confirmAction('Generar seguimiento', 'El QR y código anteriores dejarán de funcionar.', async () => { const access = await orderPost('tracking'); state.pendingAccess = access; }),
    'revoke-tracking': () => confirmAction('Revocar seguimiento', 'El cliente dejará de tener acceso con sus credenciales actuales.', () => orderPost('tracking/revoke')),
    'copy-access': async () => { const a = state.lastAccess; try { await navigator.clipboard.writeText(`Orden: ${a.folio}\nCódigo: ${a.code}\nSeguimiento: ${a.url}`); $('#access-feedback').textContent = 'Enlace y código copiados.'; } catch { $('#access-feedback').textContent = 'El navegador no permite copiar. Puedes seleccionar el código y descargar el QR.'; } },
    'download-qr': () => { const url = URL.createObjectURL(new Blob([state.lastAccess.qrSvg], { type: 'image/svg+xml' })); const link = document.createElement('a'); link.href = url; link.download = 'seguimiento-' + state.lastAccess.folio + '.svg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); },
    'deactivate-user': id => confirmAction('Desactivar cuenta', 'La cuenta perderá el acceso y se conservará su historial.', () => api('/users/' + id + '/deactivate', 'POST'))
};

document.addEventListener('click', async e => { const el = e.target.closest('[data-action]'); if (!el || el.disabled) return; e.preventDefault(); try { await actions[el.dataset.action]?.(el.dataset.id, el); } catch (err) { toast(err.message); } });
document.querySelector('.skip-link')?.addEventListener('click', e => { e.preventDefault(); ($('#content') || $('input'))?.focus(); });
window.addEventListener('hashchange', () => render().catch(e => toast(e.message)));

boot();
