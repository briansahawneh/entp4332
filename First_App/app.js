const STORAGE_KEY = 'cadence_contacts';

let contacts = loadContacts();

function loadContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    // Contacts saved before touchpoints existed won't have this field.
    parsed.forEach(c => { if (!c.touchpoints) c.touchpoints = []; });
    return parsed;
  } catch (e) {
    return [];
  }
}

function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Full text, with a fallback for empty descriptions. The Today row itself
// clips this with CSS (nowrap + ellipsis) so short text shows in full and
// only long text gets cropped — the Edit button opens the whole thing.
function descriptionPreview(description) {
  return description && description.trim() ? description : '(no description)';
}

function touchpointDueDate(contact, touchpoint) {
  const due = new Date(contact.cadenceStartDate + 'T00:00:00');
  due.setDate(due.getDate() + touchpoint.dayOffset);
  return due.toISOString().slice(0, 10);
}

function setTouchpointStatus(contact, touchpointId, status) {
  const tp = contact.touchpoints.find(t => t.id === touchpointId);
  if (!tp) return;
  tp.doneStatus = status;
  tp.doneDate = status === 'pending' ? null : new Date().toISOString().slice(0, 10);
  saveContacts();
}

const TODAY_ORDER_KEY = 'cadence_today_order';
let todayOrder = loadTodayOrder();

function loadTodayOrder() {
  try {
    const raw = localStorage.getItem(TODAY_ORDER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveTodayOrder() {
  localStorage.setItem(TODAY_ORDER_KEY, JSON.stringify(todayOrder));
}

function renderToday() {
  const today = new Date().toISOString().slice(0, 10);
  const list = document.getElementById('todayList');
  const emptyState = document.getElementById('todayEmptyState');

  const dueItems = [];
  contacts.forEach(contact => {
    if (contact.status !== 'active') return;
    contact.touchpoints.forEach(tp => {
      if (tp.doneStatus !== 'pending') return;
      const dueDate = touchpointDueDate(contact, tp);
      if (dueDate > today) return;
      dueItems.push({ contact, touchpoint: tp, dueDate, isOverdue: dueDate < today });
    });
  });

  dueItems.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    return a.contact.name.localeCompare(b.contact.name);
  });

  // Anything the user has manually dragged keeps that position; anything
  // new just tacks onto the end in the default urgency order above.
  const byId = new Map(dueItems.map(item => [item.touchpoint.id, item]));
  const orderedItems = [
    ...todayOrder.map(id => byId.get(id)).filter(Boolean),
    ...dueItems.filter(item => !todayOrder.includes(item.touchpoint.id)),
  ];

  if (orderedItems.length === 0) {
    emptyState.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }
  emptyState.classList.add('hidden');

  list.innerHTML = orderedItems.map(({ contact, touchpoint, isOverdue }) => `
    <li class="touchpoint-row" data-tp-id="${touchpoint.id}">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-due-today'}">${isOverdue ? 'Overdue' : 'Due today'}</span>
      <span class="today-contact">
        <span class="name">${escapeHtml(contact.name)}</span>
        <span class="company">${escapeHtml(contact.company)}</span>
      </span>
      <span class="touchpoint-channel">${CHANNEL_LABELS[touchpoint.channel] || escapeHtml(touchpoint.channel)}</span>
      <span class="touchpoint-description today-description" title="Click to expand">${escapeHtml(descriptionPreview(touchpoint.description))}</span>
      <span class="touchpoint-actions">
        <button type="button" class="today-done-btn" data-contact-id="${contact.id}" data-tp-id="${touchpoint.id}">Mark done</button>
        <button type="button" class="today-skip-btn" data-contact-id="${contact.id}" data-tp-id="${touchpoint.id}">Skip</button>
        <button type="button" class="today-edit-btn" data-contact-id="${contact.id}" data-tp-id="${touchpoint.id}">Edit</button>
      </span>
    </li>
  `).join('');
}

function renderContacts() {
  const grid = document.getElementById('contactGrid');
  const emptyState = document.getElementById('emptyState');

  if (contacts.length === 0) {
    emptyState.classList.remove('hidden');
    grid.innerHTML = '';
    return;
  }
  emptyState.classList.add('hidden');

  grid.innerHTML = contacts.map(c => {
    const jobTitleLine = c.jobTitle ? `<p class="card-jobtitle">${escapeHtml(c.jobTitle)}</p>` : '';
    const emailLine = c.email ? `<p class="card-meta">${escapeHtml(c.email)}</p>` : '';
    const phoneLine = c.phone ? `<p class="card-meta">${escapeHtml(c.phone)}</p>` : '';
    const linkedinLine = c.linkedin
      ? `<p class="card-meta"><a href="${escapeHtml(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></p>`
      : '';
    const notesLine = c.notes ? `<p class="card-notes">${escapeHtml(c.notes)}</p>` : '';
    return `
      <div class="card">
        <h3>${escapeHtml(c.name)}</h3>
        ${jobTitleLine}
        <p class="card-company">${escapeHtml(c.company)}</p>
        ${emailLine}
        ${phoneLine}
        ${linkedinLine}
        <p class="card-meta">Cadence starts ${formatDate(c.cadenceStartDate)}</p>
        ${notesLine}
        <button type="button" class="btn-secondary view-cadence-btn" data-id="${c.id}">View cadence</button>
      </div>
    `;
  }).join('');
}

const modal = document.getElementById('addContactModal');
const form = document.getElementById('addContactForm');

document.getElementById('addContactBtn').addEventListener('click', () => {
  document.getElementById('fieldStartDate').value = new Date().toISOString().slice(0, 10);
  modal.classList.remove('hidden');
});

document.getElementById('cancelAddBtn').addEventListener('click', () => {
  modal.classList.add('hidden');
  form.reset();
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const contact = {
    id: crypto.randomUUID(),
    name: document.getElementById('fieldName').value.trim(),
    jobTitle: document.getElementById('fieldJobTitle').value.trim(),
    company: document.getElementById('fieldCompany').value.trim(),
    email: document.getElementById('fieldEmail').value.trim(),
    phone: document.getElementById('fieldPhone').value.trim(),
    linkedin: document.getElementById('fieldLinkedIn').value.trim(),
    cadenceStartDate: document.getElementById('fieldStartDate').value,
    notes: document.getElementById('fieldNotes').value.trim(),
    status: 'active',
    touchpoints: [],
  };

  contacts.push(contact);
  saveContacts();
  renderContacts();
  renderToday();

  form.reset();
  modal.classList.add('hidden');
});

document.getElementById('todayList').addEventListener('click', (e) => {
  const desc = e.target.closest('.today-description');
  if (desc) {
    desc.classList.toggle('expanded');
    return;
  }

  const editBtn = e.target.closest('.today-edit-btn');
  if (editBtn) {
    const contact = contacts.find(c => c.id === editBtn.dataset.contactId);
    if (!contact) return;
    const tp = contact.touchpoints.find(t => t.id === editBtn.dataset.tpId);
    if (!tp) return;

    openContactDetail(contact);
    startEditingTouchpoint(tp);
    return;
  }

  const btn = e.target.closest('.today-done-btn, .today-skip-btn');
  if (!btn) return;

  const contact = contacts.find(c => c.id === btn.dataset.contactId);
  if (!contact) return;

  setTouchpointStatus(contact, btn.dataset.tpId, btn.classList.contains('today-done-btn') ? 'done' : 'skipped');
  renderToday();
  if (activeContactId === contact.id) renderTouchpoints(contact);
});

// --- Today view drag-to-reorder ---
// Pointer-based rather than HTML5 drag-and-drop: the dragged row follows the
// cursor while the others slide out of the way, which native DnD can't animate.

const todayListEl = document.getElementById('todayList');
const ROW_GAP = 8; // matches the .touchpoint-list gap
const SETTLE_MS = 180;
let drag = null;

function insertionIndex(draggedCenter) {
  let index = 0;
  drag.rects.forEach((rect, i) => {
    if (i === drag.fromIndex) return;
    if (draggedCenter > rect.top + rect.height / 2) index++;
  });
  return index;
}

function shiftOtherRows() {
  const vacated = drag.rects[drag.fromIndex].height + ROW_GAP;
  drag.rows.forEach((row, i) => {
    if (i === drag.fromIndex) return;
    let shift = 0;
    if (i > drag.fromIndex && i <= drag.toIndex) shift = -vacated;
    else if (i < drag.fromIndex && i >= drag.toIndex) shift = vacated;
    row.style.transform = shift ? `translateY(${shift}px)` : '';
  });
}

function settleOffset() {
  const from = drag.rects[drag.fromIndex];
  const to = drag.rects[drag.toIndex];
  if (drag.toIndex === drag.fromIndex) return 0;
  return drag.toIndex > drag.fromIndex
    ? (to.top + to.height) - (from.top + from.height)
    : to.top - from.top;
}

todayListEl.addEventListener('pointerdown', (e) => {
  const handle = e.target.closest('.drag-handle');
  if (!handle || e.button !== 0) return;

  const row = handle.closest('.touchpoint-row');
  const rows = [...todayListEl.querySelectorAll('.touchpoint-row')];
  if (!row || rows.length < 2) return;

  e.preventDefault();
  const fromIndex = rows.indexOf(row);
  drag = {
    row,
    rows,
    fromIndex,
    toIndex: fromIndex,
    startY: e.clientY,
    rects: rows.map(r => r.getBoundingClientRect()),
    pointerId: e.pointerId,
  };

  row.classList.add('dragging');
  todayListEl.classList.add('reordering');

  // Keeps pointer events flowing if the cursor leaves the row mid-drag, but
  // it throws when the pointer isn't active — never let that break the drag.
  try {
    handle.setPointerCapture(e.pointerId);
  } catch (err) {
    /* capture is an optimization, not a requirement */
  }
});

todayListEl.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointerId) return;

  const dy = e.clientY - drag.startY;
  drag.row.style.transform = `translateY(${dy}px) scale(1.02)`;

  const rect = drag.rects[drag.fromIndex];
  const nextIndex = insertionIndex(rect.top + rect.height / 2 + dy);
  if (nextIndex !== drag.toIndex) {
    drag.toIndex = nextIndex;
    shiftOtherRows();
  }
});

function endDrag(commit) {
  if (!drag) return;
  const { row, rows, fromIndex, toIndex } = drag;

  const finish = () => {
    todayListEl.classList.remove('reordering');
    row.classList.remove('dragging', 'settling');
    rows.forEach(r => { r.style.transform = ''; });

    if (commit && toIndex !== fromIndex) {
      const ids = rows.map(r => r.dataset.tpId);
      ids.splice(toIndex, 0, ids.splice(fromIndex, 1)[0]);
      todayOrder = ids;
      saveTodayOrder();
      renderToday();
    }
    drag = null;
  };

  if (commit && toIndex !== fromIndex) {
    const offset = settleOffset();
    row.classList.add('settling');
    row.style.transform = `translateY(${offset}px) scale(1)`;
    setTimeout(finish, SETTLE_MS);
  } else {
    row.classList.add('settling');
    row.style.transform = '';
    setTimeout(finish, SETTLE_MS);
  }
}

todayListEl.addEventListener('pointerup', () => endDrag(true));
todayListEl.addEventListener('pointercancel', () => endDrag(false));

// --- Today / Contacts view switching ---

document.querySelectorAll('.view-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach(t => t.classList.toggle('active', t === tab));
    document.getElementById('todayView').classList.toggle('hidden', tab.dataset.view !== 'today');
    document.getElementById('contactsView').classList.toggle('hidden', tab.dataset.view !== 'contacts');
  });
});

// --- Contact detail / custom cadence ---

const detailModal = document.getElementById('contactDetailModal');
const touchpointForm = document.getElementById('addTouchpointForm');
let activeContactId = null;

const CHANNEL_LABELS = { email: 'Email', call: 'Call', linkedin: 'LinkedIn', other: 'Other' };

function renderTouchpoints(contact) {
  const list = document.getElementById('touchpointList');
  const emptyState = document.getElementById('touchpointEmptyState');
  const sorted = [...contact.touchpoints].sort((a, b) => a.dayOffset - b.dayOffset);

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }
  emptyState.classList.add('hidden');

  list.innerHTML = sorted.map(tp => {
    const statusActions = tp.doneStatus === 'pending'
      ? `<button type="button" class="mark-done-tp-btn" data-id="${tp.id}">Mark done</button>
         <button type="button" class="mark-skip-tp-btn" data-id="${tp.id}">Skip</button>`
      : `<span class="touchpoint-status">${tp.doneStatus === 'done' ? '✓ Done' : 'Skipped'} ${formatDate(tp.doneDate)}</span>
         <button type="button" class="reopen-tp-btn" data-id="${tp.id}">Reopen</button>`;

    return `
      <li class="touchpoint-row ${tp.doneStatus !== 'pending' ? 'touchpoint-resolved' : ''}">
        <span class="touchpoint-day">Day ${tp.dayOffset}</span>
        <span class="touchpoint-channel">${CHANNEL_LABELS[tp.channel] || escapeHtml(tp.channel)}</span>
        <span class="touchpoint-description">${tp.description ? escapeHtml(tp.description) : '<span class="no-description">(no description)</span>'}</span>
        <span class="touchpoint-actions">
          ${statusActions}
          <button type="button" class="edit-tp-btn" data-id="${tp.id}">Edit</button>
          <button type="button" class="delete-tp-btn" data-id="${tp.id}">Delete</button>
        </span>
      </li>
    `;
  }).join('');
}

const tpChannelSelect = document.getElementById('tpChannel');
const tpChannelOtherLabel = document.getElementById('tpChannelOtherLabel');
const tpChannelOtherInput = document.getElementById('tpChannelOther');
const tpSubmitBtn = document.getElementById('tpSubmitBtn');
const tpCancelEditBtn = document.getElementById('tpCancelEditBtn');
let editingTouchpointId = null;

function exitEditMode() {
  editingTouchpointId = null;
  touchpointForm.reset();
  tpChannelOtherLabel.classList.add('hidden');
  tpSubmitBtn.textContent = '+ Add Touchpoint';
  tpCancelEditBtn.classList.add('hidden');
}

function openContactDetail(contact) {
  activeContactId = contact.id;
  document.getElementById('detailName').textContent = contact.name;
  document.getElementById('detailCompany').textContent = contact.company;
  renderTouchpoints(contact);
  exitEditMode();
  detailModal.classList.remove('hidden');
}

tpChannelSelect.addEventListener('change', () => {
  tpChannelOtherLabel.classList.toggle('hidden', tpChannelSelect.value !== 'other');
});

tpCancelEditBtn.addEventListener('click', exitEditMode);

function startEditingTouchpoint(tp) {
  editingTouchpointId = tp.id;
  document.getElementById('tpDayOffset').value = tp.dayOffset;
  document.getElementById('tpDescription').value = tp.description;

  const isStandardChannel = CHANNEL_LABELS.hasOwnProperty(tp.channel);
  tpChannelSelect.value = isStandardChannel ? tp.channel : 'other';
  tpChannelOtherLabel.classList.toggle('hidden', isStandardChannel);
  tpChannelOtherInput.value = isStandardChannel ? '' : tp.channel;

  tpSubmitBtn.textContent = 'Save Changes';
  tpCancelEditBtn.classList.remove('hidden');
  document.getElementById('tpDescription').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('touchpointList').addEventListener('click', (e) => {
  const contact = contacts.find(c => c.id === activeContactId);
  if (!contact) return;

  const editBtn = e.target.closest('.edit-tp-btn');
  if (editBtn) {
    const tp = contact.touchpoints.find(t => t.id === editBtn.dataset.id);
    if (tp) startEditingTouchpoint(tp);
    return;
  }

  const deleteBtn = e.target.closest('.delete-tp-btn');
  if (deleteBtn) {
    if (!confirm('Delete this touchpoint? This cannot be undone.')) return;
    contact.touchpoints = contact.touchpoints.filter(t => t.id !== deleteBtn.dataset.id);
    saveContacts();
    renderTouchpoints(contact);
    renderToday();
    if (editingTouchpointId === deleteBtn.dataset.id) exitEditMode();
    return;
  }

  const doneBtn = e.target.closest('.mark-done-tp-btn');
  const skipBtn = e.target.closest('.mark-skip-tp-btn');
  const reopenBtn = e.target.closest('.reopen-tp-btn');
  const statusBtn = doneBtn || skipBtn || reopenBtn;
  if (statusBtn) {
    const status = doneBtn ? 'done' : skipBtn ? 'skipped' : 'pending';
    setTouchpointStatus(contact, statusBtn.dataset.id, status);
    renderTouchpoints(contact);
    renderToday();
  }
});

document.getElementById('contactGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.view-cadence-btn');
  if (!btn) return;

  const contact = contacts.find(c => c.id === btn.dataset.id);
  if (contact) openContactDetail(contact);
});

document.getElementById('closeDetailBtn').addEventListener('click', () => {
  detailModal.classList.add('hidden');
  activeContactId = null;
});

touchpointForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const contact = contacts.find(c => c.id === activeContactId);
  if (!contact) return;

  const channel = tpChannelSelect.value === 'other'
    ? tpChannelOtherInput.value.trim() || 'Other'
    : tpChannelSelect.value;
  const dayOffset = parseInt(document.getElementById('tpDayOffset').value, 10);
  const description = document.getElementById('tpDescription').value.trim();

  if (editingTouchpointId) {
    const tp = contact.touchpoints.find(t => t.id === editingTouchpointId);
    if (tp) {
      tp.dayOffset = dayOffset;
      tp.channel = channel;
      tp.description = description;
    }
  } else {
    contact.touchpoints.push({
      id: crypto.randomUUID(),
      dayOffset,
      channel,
      description,
      doneStatus: 'pending',
      doneDate: null,
    });
  }

  saveContacts();
  renderTouchpoints(contact);
  renderToday();
  exitEditMode();
});

renderContacts();
renderToday();
