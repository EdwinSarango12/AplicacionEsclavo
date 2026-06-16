/* =============================================
   AUTO ELITE — CRUD JAVASCRIPT
   Tabla: autos (id, marca, modelo, anio, color, precio)
   Conecta a /api/autos  (server.js Express)
   Fallback a localStorage para demo offline
   ============================================= */

// ──────────────────────────────────────────────
// CONFIG
// Ruta relativa: funciona cuando el frontend
// es servido por el mismo contenedor Node.
// Para abrir index.html directamente fuera de
// Docker usa: http://localhost:3000/api/autosdb
// ──────────────────────────────────────────────
const BASE_URL = '/api/autosdb';

// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
let vehicles       = [];
let filteredVehicles = [];
let currentSearch  = '';
let currentMarca   = '';
let currentColor   = '';
let currentAnio    = '';
let deleteTargetId = null;
let editTargetId   = null;

// ──────────────────────────────────────────────
// DOM REFS
// ──────────────────────────────────────────────
const vehicleGrid  = document.getElementById('vehicleGrid');
const emptyState   = document.getElementById('emptyState');
const vehicleCount = document.getElementById('vehicleCount');
const statTotal    = document.getElementById('statTotal');
const statAvail    = document.getElementById('statAvail');    // precio promedio
const statReserved = document.getElementById('statReserved'); // precio mínimo
const statSold     = document.getElementById('statSold');     // precio máximo
const searchInput  = document.getElementById('searchInput');
const filterMarca  = document.getElementById('filterMarca');
const filterColor  = document.getElementById('filterColor');
const filterAnio   = document.getElementById('filterAnio');

const formModal    = document.getElementById('formModal');
const detailModal  = document.getElementById('detailModal');
const deleteModal  = document.getElementById('deleteModal');

const formId      = document.getElementById('formId');
const formMarca   = document.getElementById('formMarca');
const formModelo  = document.getElementById('formModelo');
const formAnio    = document.getElementById('formAnio');
const formColor   = document.getElementById('formColor');
const formPrecio  = document.getElementById('formPrecio');
const formError   = document.getElementById('formError');
const modalTitle  = document.getElementById('modalTitle');

// ──────────────────────────────────────────────
// API LAYER — con fallback a localStorage
// ──────────────────────────────────────────────
const LS_KEY = 'autoelite_autos_v2';

function localLoad() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
  catch { return []; }
}
function localSave(data) { localStorage.setItem(LS_KEY, JSON.stringify(data)); }
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

async function apiGet() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch {
    return localLoad();
  }
}

async function apiCreate(payload) {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch {
    const item = { ...payload, id: genId() };
    const list = localLoad(); list.push(item); localSave(list);
    return item;
  }
}

async function apiUpdate(id, payload) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch {
    const list = localLoad();
    const idx  = list.findIndex(v => String(v.id) === String(id));
    if (idx !== -1) { list[idx] = { ...list[idx], ...payload }; localSave(list); return list[idx]; }
    throw new Error('Not found');
  }
}

async function apiDelete(id) {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
  } catch {
    localSave(localLoad().filter(v => String(v.id) !== String(id)));
  }
}

// ──────────────────────────────────────────────
// SEED — 15 autos idénticos a tu BD MySQL
// Solo se cargan si localStorage está vacío
// ──────────────────────────────────────────────
function seedIfEmpty() {
  if (localLoad().length > 0) return;
  const seed = [
    { id: genId(), marca:'Toyota',     modelo:'Corolla', anio:2020, color:'Blanco',   precio:22000 },
    { id: genId(), marca:'Honda',      modelo:'Civic',   anio:2021, color:'Negro',    precio:24500 },
    { id: genId(), marca:'Ford',       modelo:'Focus',   anio:2019, color:'Azul',     precio:18500 },
    { id: genId(), marca:'Chevrolet',  modelo:'Cruze',   anio:2018, color:'Rojo',     precio:17000 },
    { id: genId(), marca:'Nissan',     modelo:'Sentra',  anio:2022, color:'Gris',     precio:26000 },
    { id: genId(), marca:'Hyundai',    modelo:'Elantra', anio:2021, color:'Plata',    precio:23000 },
    { id: genId(), marca:'Kia',        modelo:'Rio',     anio:2020, color:'Blanco',   precio:19500 },
    { id: genId(), marca:'Volkswagen', modelo:'Jetta',   anio:2019, color:'Negro',    precio:21000 },
    { id: genId(), marca:'Mazda',      modelo:'Mazda3',  anio:2022, color:'Rojo',     precio:27500 },
    { id: genId(), marca:'Subaru',     modelo:'Impreza', anio:2021, color:'Azul',     precio:25000 },
    { id: genId(), marca:'Renault',    modelo:'Logan',   anio:2018, color:'Gris',     precio:14500 },
    { id: genId(), marca:'Peugeot',    modelo:'208',     anio:2020, color:'Amarillo', precio:18000 },
    { id: genId(), marca:'Fiat',       modelo:'Cronos',  anio:2021, color:'Blanco',   precio:19000 },
    { id: genId(), marca:'Mitsubishi', modelo:'Lancer',  anio:2019, color:'Verde',    precio:20000 },
    { id: genId(), marca:'Suzuki',     modelo:'Swift',   anio:2022, color:'Rojo',     precio:21500 },
  ];
  localSave(seed);
}

// ──────────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────────
function applyFilters() {
  let result = [...vehicles];

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    result = result.filter(v =>
      (v.marca  || '').toLowerCase().includes(q) ||
      (v.modelo || '').toLowerCase().includes(q) ||
      (v.color  || '').toLowerCase().includes(q) ||
      String(v.anio  || '').includes(q)
    );
  }
  if (currentMarca) result = result.filter(v => v.marca  === currentMarca);
  if (currentColor) result = result.filter(v => v.color  === currentColor);
  if (currentAnio)  result = result.filter(v => String(v.anio) === currentAnio);

  filteredVehicles = result;
  renderGrid();
}

function fmt(n) { return Number(n || 0).toLocaleString('es-EC'); }

function renderGrid() {
  vehicleGrid.innerHTML = '';

  // ── Stats ──
  const precios = vehicles.map(v => Number(v.precio || 0));
  statTotal.textContent    = vehicles.length;
  statAvail.textContent    = precios.length
    ? '$' + fmt(precios.reduce((a, b) => a + b, 0) / precios.length)
    : '—';
  statReserved.textContent = precios.length ? '$' + fmt(Math.min(...precios)) : '—';
  statSold.textContent     = precios.length ? '$' + fmt(Math.max(...precios)) : '—';
  vehicleCount.textContent = `${vehicles.length} unidad${vehicles.length !== 1 ? 'es' : ''}`;

  // ── Dropdowns dinámicos ──
  const marcas  = [...new Set(vehicles.map(v => v.marca).filter(Boolean))].sort();
  const colores = [...new Set(vehicles.map(v => v.color).filter(Boolean))].sort();
  const anios   = [...new Set(vehicles.map(v => String(v.anio)).filter(Boolean))].sort().reverse();

  filterMarca.innerHTML = '<option value="">Todas las marcas</option>' +
    marcas.map(m => `<option value="${m}" ${m === currentMarca ? 'selected':''}>${m}</option>`).join('');
  filterColor.innerHTML = '<option value="">Todos los colores</option>' +
    colores.map(c => `<option value="${c}" ${c === currentColor ? 'selected':''}>${c}</option>`).join('');
  filterAnio.innerHTML  = '<option value="">Todos los años</option>' +
    anios.map(a => `<option value="${a}" ${a === currentAnio ? 'selected':''}>${a}</option>`).join('');

  // ── Cards ──
  if (filteredVehicles.length === 0) {
    emptyState.style.display = 'flex';
    vehicleGrid.style.display = 'none';
    return;
  }
  emptyState.style.display = 'none';
  vehicleGrid.style.display = 'grid';

  filteredVehicles.forEach(v => {
    const card = document.createElement('div');
    card.className = 'vehicle-card';
    card.dataset.id = v.id;

    card.innerHTML = `
      <div class="card-image-placeholder">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="4" y="20" width="56" height="30" rx="4"/>
          <path d="M12 20 L18 8 H46 L52 20"/>
          <circle cx="16" cy="50" r="5"/><circle cx="48" cy="50" r="5"/>
        </svg>
      </div>
      <div class="card-body">
        <div class="card-header-row">
          <div>
            <div class="card-brand">${escHtml(v.marca || '')}</div>
            <div class="card-model">${escHtml(v.modelo || '')}</div>
            <div class="card-year">${v.anio || '—'}</div>
          </div>
          <span class="color-dot" title="${escHtml(v.color || '')}" style="background:${colorHex(v.color)}; width:22px; height:22px; border-radius:50%; border:2px solid rgba(255,255,255,0.15); flex-shrink:0; display:inline-block;"></span>
        </div>
        <div class="card-meta">
          <div class="meta-item">
            <span class="meta-label">Color</span>
            <span class="meta-value">${escHtml(v.color || '—')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Año</span>
            <span class="meta-value">${v.anio || '—'}</span>
          </div>
        </div>
        <div class="card-price">$${fmt(v.precio)} <span>USD</span></div>
        <div class="card-actions">
          <button class="card-btn card-btn-detail" data-action="detail" data-id="${v.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>
            Detalles
          </button>
          <button class="card-btn card-btn-edit" data-action="edit" data-id="${v.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="card-btn card-btn-delete" data-action="delete" data-id="${v.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>`;

    vehicleGrid.appendChild(card);
  });
}

// Convierte nombres de color en español a hex aproximado para el dot visual
function colorHex(name) {
  const map = {
    blanco:'#f5f5f0', negro:'#1a1a1a', rojo:'#c94444', azul:'#3b82f6',
    gris:'#6b7280', plata:'#cbd5e1', amarillo:'#eab308', verde:'#22c55e',
    naranja:'#f97316', morado:'#a855f7', marron:'#92400e', beige:'#d4c5a9',
  };
  const key = (name || '').toLowerCase().split(' ')[0];
  return map[key] || '#4a4a5a';
}

// ──────────────────────────────────────────────
// MODAL: ADD / EDIT
// ──────────────────────────────────────────────
function openFormModal(vehicle = null) {
  formError.textContent = '';
  editTargetId = vehicle ? vehicle.id : null;
  modalTitle.textContent = vehicle ? 'Editar Auto' : 'Nuevo Auto';

  formId.value     = vehicle?.id     ?? '';
  formMarca.value  = vehicle?.marca  ?? '';
  formModelo.value = vehicle?.modelo ?? '';
  formAnio.value   = vehicle?.anio   ?? '';
  formColor.value  = vehicle?.color  ?? '';
  formPrecio.value = vehicle?.precio ?? '';

  formModal.classList.add('open');
  formMarca.focus();
}

function closeFormModal() { formModal.classList.remove('open'); editTargetId = null; }

document.getElementById('openAddModal').addEventListener('click',   () => openFormModal());
document.getElementById('emptyAddBtn').addEventListener('click',    () => openFormModal());
document.getElementById('closeFormModal').addEventListener('click',  closeFormModal);
document.getElementById('cancelFormModal').addEventListener('click', closeFormModal);

document.getElementById('saveVehicle').addEventListener('click', async () => {
  formError.textContent = '';

  const marca  = formMarca.value.trim();
  const modelo = formModelo.value.trim();
  const anio   = parseInt(formAnio.value);
  const precio = parseFloat(formPrecio.value);
  const color  = formColor.value.trim();

  if (!marca)              { formError.textContent = 'La marca es requerida.'; return; }
  if (!modelo)             { formError.textContent = 'El modelo es requerido.'; return; }
  if (!anio || isNaN(anio)){ formError.textContent = 'Ingresa un año válido.'; return; }
  if (!precio||isNaN(precio)){ formError.textContent = 'Ingresa un precio válido.'; return; }

  const payload = { marca, modelo, anio, color: color || null, precio };

  try {
    if (editTargetId) {
      const updated = await apiUpdate(editTargetId, payload);
      const idx = vehicles.findIndex(v => String(v.id) === String(editTargetId));
      if (idx !== -1) vehicles[idx] = updated;
      showToast('Auto actualizado correctamente.', 'success');
    } else {
      const created = await apiCreate(payload);
      vehicles.push(created);
      showToast('Auto agregado al inventario.', 'success');
    }
    applyFilters();
    closeFormModal();
  } catch {
    formError.textContent = 'Error al guardar. Intenta de nuevo.';
  }
});

// ──────────────────────────────────────────────
// MODAL: DETAIL
// ──────────────────────────────────────────────
function openDetailModal(v) {
  const content = document.getElementById('detailContent');
  content.innerHTML = `
    <div class="detail-hero-placeholder">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="4" y="20" width="56" height="30" rx="4"/>
        <path d="M12 20 L18 8 H46 L52 20"/>
        <circle cx="16" cy="50" r="5"/><circle cx="48" cy="50" r="5"/>
      </svg>
    </div>
    <div class="detail-body">
      <div class="detail-brand">${escHtml(v.marca || '')}</div>
      <div class="detail-title">${escHtml(v.modelo || '')} ${v.anio || ''}</div>
      <div class="detail-price">$${fmt(v.precio)} <span style="font-size:16px;color:var(--gray-mid)">USD</span></div>
      <div class="detail-grid">
        <div class="detail-field">
          <div class="detail-field-label">Marca</div>
          <div class="detail-field-value">${escHtml(v.marca || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Modelo</div>
          <div class="detail-field-value">${escHtml(v.modelo || '—')}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Año</div>
          <div class="detail-field-value">${v.anio || '—'}</div>
        </div>
        <div class="detail-field">
          <div class="detail-field-label">Color</div>
          <div class="detail-field-value" style="display:flex;align-items:center;gap:8px;">
            <span style="width:14px;height:14px;border-radius:50%;background:${colorHex(v.color)};border:1px solid rgba(255,255,255,0.2);display:inline-block;flex-shrink:0;"></span>
            ${escHtml(v.color || '—')}
          </div>
        </div>
        <div class="detail-field" style="grid-column: span 2">
          <div class="detail-field-label">Precio</div>
          <div class="detail-field-value" style="color:var(--gold);font-size:20px;font-family:var(--font-display);font-weight:700;">$${fmt(v.precio)} USD</div>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-primary" id="detailEditBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Editar Auto
        </button>
        <button class="btn-ghost" id="closeDetailBtn">Cerrar</button>
      </div>
    </div>`;

  document.getElementById('detailEditBtn').addEventListener('click', () => { closeDetailModal(); openFormModal(v); });
  document.getElementById('closeDetailBtn').addEventListener('click', closeDetailModal);
  detailModal.classList.add('open');
}

function closeDetailModal() { detailModal.classList.remove('open'); }
document.getElementById('closeDetailModal').addEventListener('click', closeDetailModal);

// ──────────────────────────────────────────────
// MODAL: DELETE
// ──────────────────────────────────────────────
function openDeleteModal(v) {
  deleteTargetId = v.id;
  document.getElementById('deleteCarName').textContent = `${v.marca} ${v.modelo} ${v.anio}`;
  deleteModal.classList.add('open');
}
function closeDeleteModal() { deleteModal.classList.remove('open'); deleteTargetId = null; }

document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    await apiDelete(deleteTargetId);
    vehicles = vehicles.filter(v => String(v.id) !== String(deleteTargetId));
    applyFilters();
    showToast('Auto eliminado del inventario.', 'success');
  } catch { showToast('Error al eliminar.', 'error'); }
  closeDeleteModal();
});

// ──────────────────────────────────────────────
// DELEGACIÓN DE EVENTOS — cards
// ──────────────────────────────────────────────
vehicleGrid.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  e.stopPropagation();
  const v = vehicles.find(x => String(x.id) === String(btn.dataset.id));
  if (!v) return;
  if (btn.dataset.action === 'detail') openDetailModal(v);
  if (btn.dataset.action === 'edit')   openFormModal(v);
  if (btn.dataset.action === 'delete') openDeleteModal(v);
});

// Click en card (no en botones) → detail
vehicleGrid.addEventListener('click', e => {
  if (e.target.closest('[data-action]')) return;
  const card = e.target.closest('.vehicle-card');
  if (!card) return;
  const v = vehicles.find(x => String(x.id) === String(card.dataset.id));
  if (v) openDetailModal(v);
});

// ──────────────────────────────────────────────
// FILTROS
// ──────────────────────────────────────────────
searchInput.addEventListener('input', () => { currentSearch = searchInput.value.trim(); applyFilters(); });
filterMarca.addEventListener('change', () => { currentMarca = filterMarca.value; applyFilters(); });
filterColor.addEventListener('change', () => { currentColor = filterColor.value; applyFilters(); });
filterAnio.addEventListener('change',  () => { currentAnio  = filterAnio.value;  applyFilters(); });

// Cerrar modales al hacer clic en overlay o presionar Escape
[formModal, detailModal, deleteModal].forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') [formModal, detailModal, deleteModal].forEach(m => m.classList.remove('open'));
});

// Sidebar nav
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    item.classList.add('active');
    const sec = item.dataset.section;
    if (sec === 'add')    openFormModal();
    if (sec === 'search') searchInput.focus();
  });
});

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3000);
}

// ──────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
async function init() {
  seedIfEmpty();
  vehicles = await apiGet();
  applyFilters();
}

init();