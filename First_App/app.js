const STORAGE_KEY = 'cadence_contacts';

let dayOffsetsMigrated = false;
let contacts = loadContacts();
// Write the 1-based day numbers back once, so storage matches what's shown.
if (dayOffsetsMigrated) saveContacts();

function loadContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    parsed.forEach(c => {
      // Contacts saved before touchpoints existed won't have this field.
      if (!c.touchpoints) c.touchpoints = [];
      // Day numbering used to start at 0; nothing should render as "Day 0".
      c.touchpoints.forEach(tp => {
        if (!Number.isInteger(tp.dayOffset) || tp.dayOffset < 1) {
          tp.dayOffset = 1;
          dayOffsetsMigrated = true;
        }
      });
    });
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
// only long text gets cropped. The Edit button opens the whole thing.
function descriptionPreview(description) {
  return description && description.trim() ? description : '(no description)';
}

// --- Icons, voice, and motion helpers ---

const ICON_VIEWBOX = { 'i-cow': '0 0 40 40', 'i-grip': '0 0 16 16' };

function icon(id, className = 'icon') {
  const viewBox = ICON_VIEWBOX[id] || '0 0 20 20';
  return `<svg class="${className}" viewBox="${viewBox}" aria-hidden="true"><use href="#${id}"/></svg>`;
}

const CHANNEL_ICONS = { email: 'i-mail', call: 'i-phone', linkedin: 'i-linkedin', other: 'i-dot' };
const channelIcon = (channel) => icon(CHANNEL_ICONS[channel] || 'i-dot');

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let toastTimer = null;
function showToast(message) {
  const el = document.getElementById('toast');
  el.innerHTML = `${icon('i-cow', 'cow-mark')}<span>${escapeHtml(message)}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// Only items that weren't on screen last render get an entrance, so marking
// one touchpoint done doesn't restage the entire list every time.
function tagNewItems(container, selector, seen) {
  const current = new Set();
  let position = 0;

  container.querySelectorAll(selector).forEach(el => {
    const id = el.dataset.enterId;
    current.add(id);
    if (seen.has(id)) return;

    el.classList.add('row-enter');
    el.style.animationDelay = `${Math.min(position, 5) * 45}ms`;
    position++;
    el.addEventListener('animationend', () => {
      el.classList.remove('row-enter');
      el.style.animationDelay = '';
    }, { once: true });
  });

  seen.clear();
  current.forEach(id => seen.add(id));
}

const seenTodayIds = new Set();
const seenContactIds = new Set();

// Day numbering is 1-based: Day 1 is the cadence start date itself, Day 3 is
// two days later, and so on.
function touchpointDueDate(contact, touchpoint) {
  const due = new Date(contact.cadenceStartDate + 'T00:00:00');
  due.setDate(due.getDate() + touchpoint.dayOffset - 1);
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
    seenTodayIds.clear();
    return;
  }
  emptyState.classList.add('hidden');

  list.innerHTML = orderedItems.map(({ contact, touchpoint, isOverdue }) => `
    <li class="touchpoint-row" data-tp-id="${touchpoint.id}" data-enter-id="${touchpoint.id}">
      <span class="drag-handle" title="Drag to reorder">${icon('i-grip')}</span>
      <span class="badge ${isOverdue ? 'badge-overdue' : 'badge-due-today'}">${isOverdue ? 'Overdue' : 'Due today'}</span>
      <span class="today-contact">
        <span class="name">${escapeHtml(contact.name)}</span>
        <span class="company">${escapeHtml(contact.company)}</span>
      </span>
      <span class="touchpoint-channel">${channelIcon(touchpoint.channel)}${CHANNEL_LABELS[touchpoint.channel] || escapeHtml(touchpoint.channel)}</span>
      <span class="touchpoint-description today-description" title="Click to expand">${escapeHtml(descriptionPreview(touchpoint.description))}</span>
      <span class="touchpoint-actions">
        <button type="button" class="today-done-btn" data-contact-id="${contact.id}" data-tp-id="${touchpoint.id}">${icon('i-check')}Mark done</button>
        <button type="button" class="today-skip-btn" data-contact-id="${contact.id}" data-tp-id="${touchpoint.id}">${icon('i-skip')}Skip</button>
        <button type="button" class="today-edit-btn" data-contact-id="${contact.id}" data-tp-id="${touchpoint.id}">${icon('i-pencil')}Edit</button>
      </span>
    </li>
  `).join('');

  tagNewItems(list, '.touchpoint-row', seenTodayIds);
}

// Skipped touchpoints count as handled, otherwise a cadence you
// deliberately skipped part of could never reach 100%.
function touchpointProgress(contact) {
  const total = contact.touchpoints.length;
  const handled = contact.touchpoints.filter(tp => tp.doneStatus !== 'pending').length;
  return { total, handled, percent: total ? Math.round((handled / total) * 100) : 0 };
}

function renderContactPanel() {
  const list = document.getElementById('contactPanelList');
  const empty = document.getElementById('contactPanelEmpty');

  empty.classList.toggle('hidden', contacts.length > 0);

  list.innerHTML = contacts.map(c => {
    const { total, handled } = touchpointProgress(c);
    return `
      <li class="panel-contact">
        <button type="button" class="panel-contact-main" data-id="${c.id}">
          <span class="panel-contact-top">
            <span class="panel-contact-name">${escapeHtml(c.name)}</span>
            <span class="badge badge-status-${c.status}">${STATUS_LABELS[c.status] || escapeHtml(c.status)}</span>
          </span>
          <span class="panel-contact-company">${escapeHtml(c.company)}</span>
          <span class="panel-contact-progress">${total ? `${handled} of ${total} done` : 'No touchpoints yet'}</span>
        </button>
        <span class="panel-contact-actions">
          <button type="button" class="panel-edit-btn" data-id="${c.id}">${icon('i-pencil')}Edit</button>
          <button type="button" class="panel-delete-btn" data-id="${c.id}">${icon('i-trash')}Delete</button>
        </span>
      </li>
    `;
  }).join('');
}

let contactSearchTerm = '';

// Searches the contact's own details plus everything in their cadence, so
// "pricing" finds the person whose day-7 call is about pricing.
function contactMatchesSearch(contact, term) {
  if (!term) return true;
  const haystack = [
    contact.name, contact.jobTitle, contact.company,
    contact.email, contact.phone, contact.notes,
    ...contact.touchpoints.flatMap(tp => [tp.description, tp.channel]),
  ];
  return haystack.some(value => (value || '').toLowerCase().includes(term));
}

function renderContacts() {
  const grid = document.getElementById('contactGrid');
  const emptyState = document.getElementById('emptyState');
  const searchCount = document.getElementById('contactSearchCount');

  renderContactPanel();

  const visible = contacts.filter(c => contactMatchesSearch(c, contactSearchTerm));

  searchCount.classList.toggle('hidden', !contactSearchTerm);
  if (contactSearchTerm) {
    searchCount.textContent = `${visible.length} of ${contacts.length} contact${contacts.length === 1 ? '' : 's'}`;
  }

  if (visible.length === 0) {
    const noneAtAll = contacts.length === 0;
    document.getElementById('emptyStateTitle').textContent =
      noneAtAll ? 'No contacts yet' : 'Nothing matches that';
    document.getElementById('emptyStateSub').textContent =
      noneAtAll
        ? 'Round up your first lead to get started.'
        : `No contact or cadence mentions "${contactSearchTerm}".`;
    emptyState.classList.remove('hidden');
    grid.innerHTML = '';
    seenContactIds.clear();
    return;
  }
  emptyState.classList.add('hidden');

  grid.innerHTML = visible.map(c => {
    const jobTitleLine = c.jobTitle ? `<p class="card-jobtitle">${escapeHtml(c.jobTitle)}</p>` : '';
    const emailLine = c.email ? `<p class="card-meta">${escapeHtml(c.email)}</p>` : '';
    const phoneLine = c.phone ? `<p class="card-meta">${escapeHtml(c.phone)}</p>` : '';
    const linkedinLine = c.linkedin
      ? `<p class="card-meta"><a href="${escapeHtml(c.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></p>`
      : '';
    const notesLine = c.notes ? `<p class="card-notes">${escapeHtml(c.notes)}</p>` : '';

    const { total, handled, percent } = touchpointProgress(c);
    const progress = total
      ? `<div class="card-progress">
           <div class="card-progress-bar" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="--fill: ${handled / total}"></span></div>
           <p class="card-progress-label">${handled} of ${total} touchpoint${total === 1 ? '' : 's'} done</p>
         </div>`
      : `<p class="card-progress-label card-progress-empty">No touchpoints yet</p>`;

    return `
      <div class="card" data-enter-id="${c.id}">
        <div class="card-header">
          <h3>${escapeHtml(c.name)}</h3>
          <span class="badge badge-status-${c.status}">${STATUS_LABELS[c.status] || escapeHtml(c.status)}</span>
        </div>
        ${jobTitleLine}
        <p class="card-company">${escapeHtml(c.company)}</p>
        ${emailLine}
        ${phoneLine}
        ${linkedinLine}
        <p class="card-meta">Cadence starts ${formatDate(c.cadenceStartDate)}</p>
        ${notesLine}
        ${progress}
        <button type="button" class="btn-secondary view-cadence-btn" data-id="${c.id}">View cadence</button>
      </div>
    `;
  }).join('');

  tagNewItems(grid, '.card', seenContactIds);
}

const modal = document.getElementById('addContactModal');
const form = document.getElementById('addContactForm');
const contactFormTitle = document.getElementById('contactFormTitle');
const contactSubmitBtn = document.getElementById('contactSubmitBtn');
let editingContactId = null;

const CONTACT_FIELDS = {
  name: 'fieldName',
  jobTitle: 'fieldJobTitle',
  company: 'fieldCompany',
  email: 'fieldEmail',
  phone: 'fieldPhone',
  linkedin: 'fieldLinkedIn',
  cadenceStartDate: 'fieldStartDate',
  notes: 'fieldNotes',
};

function closeContactForm() {
  modal.classList.add('hidden');
  form.reset();
  editingContactId = null;
  contactFormTitle.textContent = 'Add contact';
  contactSubmitBtn.textContent = 'Add';
}

document.getElementById('addContactBtn').addEventListener('click', () => {
  closeContactForm();
  document.getElementById('fieldStartDate').value = new Date().toISOString().slice(0, 10);
  modal.classList.remove('hidden');
});

document.getElementById('cancelAddBtn').addEventListener('click', closeContactForm);

function openContactForEditing(contact) {
  editingContactId = contact.id;
  Object.entries(CONTACT_FIELDS).forEach(([key, fieldId]) => {
    document.getElementById(fieldId).value = contact[key] || '';
  });
  contactFormTitle.textContent = 'Edit contact';
  contactSubmitBtn.textContent = 'Save changes';
  modal.classList.remove('hidden');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const values = {};
  Object.entries(CONTACT_FIELDS).forEach(([key, fieldId]) => {
    const raw = document.getElementById(fieldId).value;
    values[key] = key === 'cadenceStartDate' ? raw : raw.trim();
  });

  if (editingContactId) {
    // Status and touchpoints belong to the cadence, not this form, so keep them.
    const contact = contacts.find(c => c.id === editingContactId);
    if (contact) Object.assign(contact, values);
  } else {
    contacts.push({
      id: crypto.randomUUID(),
      ...values,
      status: 'active',
      touchpoints: [],
    });
  }

  saveContacts();
  renderContacts();
  renderToday();
  closeContactForm();
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

  const row = btn.closest('.touchpoint-row');
  if (row && row.classList.contains('row-leaving')) return; // already on its way out

  const done = btn.classList.contains('today-done-btn');
  const clearsTheDay = todayListEl.querySelectorAll('.touchpoint-row:not(.row-leaving)').length === 1;

  const commit = () => {
    setTouchpointStatus(contact, btn.dataset.tpId, done ? 'done' : 'skipped');
    renderToday();
    renderContacts();
    if (activeContactId === contact.id) renderTouchpoints(contact);
    showToast(clearsTheDay
      ? "That's the last one. The herd's all caught up."
      : done ? 'Touchpoint done.' : 'Touchpoint skipped.');
  };

  // The row stamps and collapses before the data changes, so the list doesn't
  // jump out from under the click.
  if (row && !reduceMotion()) {
    row.classList.add('row-leaving', done ? 'is-done' : 'is-skipped');
    setTimeout(commit, 240);
  } else {
    commit();
  }
});

// --- Today view drag-to-reorder ---
// Pointer-based rather than HTML5 drag-and-drop: the dragged row follows the
// cursor while the others slide out of the way, which native DnD can't animate.

const todayListEl = document.getElementById('todayList');
const ROW_GAP = 10; // must match the .touchpoint-list-today gap in style.css
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
  // it throws when the pointer isn't active, so never let that break the drag.
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
      ? `<button type="button" class="mark-done-tp-btn" data-id="${tp.id}">${icon('i-check')}Mark done</button>
         <button type="button" class="mark-skip-tp-btn" data-id="${tp.id}">${icon('i-skip')}Skip</button>`
      : `<span class="touchpoint-status ${tp.doneStatus === 'skipped' ? 'is-skipped' : ''}">${tp.doneStatus === 'done' ? icon('i-check') : icon('i-skip')}${tp.doneStatus === 'done' ? 'Done' : 'Skipped'} ${formatDate(tp.doneDate)}</span>
         <button type="button" class="reopen-tp-btn" data-id="${tp.id}">${icon('i-undo')}Reopen</button>`;

    // A non-active contact isn't being chased any more, so its still-pending
    // touchpoints are shown paused rather than as live work.
    const paused = tp.doneStatus === 'pending' && contact.status !== 'active';

    return `
      <li class="touchpoint-row ${tp.doneStatus !== 'pending' ? 'touchpoint-resolved' : ''} ${paused ? 'touchpoint-paused' : ''}">
        <span class="touchpoint-day">Day ${tp.dayOffset}</span>
        <span class="touchpoint-channel">${channelIcon(tp.channel)}${CHANNEL_LABELS[tp.channel] || escapeHtml(tp.channel)}</span>
        <span class="touchpoint-description">${tp.description ? escapeHtml(tp.description) : '<span class="no-description">(no description)</span>'}</span>
        <span class="touchpoint-actions">
          ${statusActions}
          <button type="button" class="edit-tp-btn" data-id="${tp.id}">${icon('i-pencil')}Edit</button>
          <button type="button" class="delete-tp-btn" data-id="${tp.id}">${icon('i-trash')}Delete</button>
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
  tpSubmitBtn.textContent = 'Add touchpoint';
  tpCancelEditBtn.classList.add('hidden');
}

const detailStatusSelect = document.getElementById('detailStatus');
const detailStatusNote = document.getElementById('detailStatusNote');

const STATUS_LABELS = {
  active: 'Active',
  replied: 'Replied',
  no_response: 'No response',
  won: 'Won',
};

function renderStatusNote(contact) {
  const paused = contact.status !== 'active';
  detailStatusNote.classList.toggle('hidden', !paused);
  if (paused) {
    detailStatusNote.textContent =
      `Marked ${STATUS_LABELS[contact.status]}. Remaining touchpoints are paused and won't show up on Today.`;
  }
}

function openContactDetail(contact) {
  activeContactId = contact.id;
  document.getElementById('detailName').textContent = contact.name;
  document.getElementById('detailCompany').textContent = contact.company;
  detailStatusSelect.value = contact.status;
  renderStatusNote(contact);
  renderTouchpoints(contact);
  exitEditMode();
  detailModal.classList.remove('hidden');
}

detailStatusSelect.addEventListener('change', () => {
  const contact = contacts.find(c => c.id === activeContactId);
  if (!contact) return;

  contact.status = detailStatusSelect.value;
  saveContacts();
  renderStatusNote(contact);
  renderTouchpoints(contact);
  renderContacts();
  renderToday();
});

tpChannelSelect.addEventListener('change', () => {
  tpChannelOtherLabel.classList.toggle('hidden', tpChannelSelect.value !== 'other');
});

// Clear the custom message as soon as they start fixing it, or it sticks
// and blocks the next submit.
document.getElementById('tpDayOffset').addEventListener('input', (e) => {
  e.target.setCustomValidity('');
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

  tpSubmitBtn.textContent = 'Save changes';
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
    renderContacts();
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
    renderContacts();
    if (status === 'done') showToast('Touchpoint done.');
    else if (status === 'skipped') showToast('Touchpoint skipped.');
  }
});

document.getElementById('contactGrid').addEventListener('click', (e) => {
  const btn = e.target.closest('.view-cadence-btn');
  if (!btn) return;

  const contact = contacts.find(c => c.id === btn.dataset.id);
  if (contact) openContactDetail(contact);
});

document.getElementById('contactSearch').addEventListener('input', (e) => {
  contactSearchTerm = e.target.value.trim().toLowerCase();
  renderContacts();
});

// --- The cow's speech bubble ---

const brandBtn = document.getElementById('brandBtn');
const brandMark = document.querySelector('.brand-mark');
const cowChat = document.getElementById('cowChat');

function setCowChatOpen(open) {
  cowChat.classList.toggle('open', open);
  brandBtn.setAttribute('aria-expanded', String(open));
}

// Nudge a first-time visitor toward the cow with a brief pulse, then never
// show it again once they've actually clicked it.
const INTRO_HINT_KEY = 'cadence_intro_seen';
try {
  if (!localStorage.getItem(INTRO_HINT_KEY)) brandMark.classList.add('hint');
} catch (e) { /* localStorage unavailable; skip the hint */ }

function dismissIntroHint() {
  brandMark.classList.remove('hint');
  try { localStorage.setItem(INTRO_HINT_KEY, '1'); } catch (e) { /* not fatal */ }
}

brandBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // the document handler below would close it again
  dismissIntroHint();
  setCowChatOpen(!cowChat.classList.contains('open'));
});

document.getElementById('cowChatClose').addEventListener('click', () => {
  setCowChatOpen(false);
  brandBtn.focus();
});

cowChat.addEventListener('click', (e) => e.stopPropagation());

document.addEventListener('click', () => setCowChatOpen(false));

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !cowChat.classList.contains('open')) return;
  setCowChatOpen(false);
  brandBtn.focus();
});

// --- Slide-out contact panel ---

const contactPanel = document.getElementById('contactPanel');
const contactPanelToggle = document.getElementById('contactPanelToggle');

function setContactPanelOpen(open) {
  contactPanel.classList.toggle('open', open);
  contactPanelToggle.classList.toggle('open', open);
  contactPanel.setAttribute('aria-hidden', String(!open));
  contactPanelToggle.setAttribute('aria-expanded', String(open));
}

contactPanelToggle.addEventListener('click', () => {
  setContactPanelOpen(!contactPanel.classList.contains('open'));
});

document.getElementById('contactPanelClose').addEventListener('click', () => setContactPanelOpen(false));

document.getElementById('contactPanelList').addEventListener('click', (e) => {
  const btn = e.target.closest('.panel-edit-btn, .panel-delete-btn, .panel-contact-main');
  if (!btn) return;

  const contact = contacts.find(c => c.id === btn.dataset.id);
  if (!contact) return;

  if (btn.classList.contains('panel-delete-btn')) {
    deleteContact(contact);
    return;
  }

  setContactPanelOpen(false);
  if (btn.classList.contains('panel-edit-btn')) openContactForEditing(contact);
  else openContactDetail(contact);
});

document.getElementById('closeDetailBtn').addEventListener('click', () => {
  detailModal.classList.add('hidden');
  activeContactId = null;
});

document.getElementById('editContactBtn').addEventListener('click', () => {
  const contact = contacts.find(c => c.id === activeContactId);
  if (!contact) return;

  detailModal.classList.add('hidden');
  activeContactId = null;
  openContactForEditing(contact);
});

function deleteContact(contact) {
  const count = contact.touchpoints.length;
  const warning = count
    ? `Delete ${contact.name} and their ${count} touchpoint${count === 1 ? '' : 's'}? This cannot be undone.`
    : `Delete ${contact.name}? This cannot be undone.`;
  if (!confirm(warning)) return;

  contacts = contacts.filter(c => c.id !== contact.id);
  saveContacts();

  if (activeContactId === contact.id) {
    detailModal.classList.add('hidden');
    activeContactId = null;
  }
  renderContacts();
  renderToday();
}

document.getElementById('deleteContactBtn').addEventListener('click', () => {
  const contact = contacts.find(c => c.id === activeContactId);
  if (contact) deleteContact(contact);
});

touchpointForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const contact = contacts.find(c => c.id === activeContactId);
  if (!contact) return;

  const channel = tpChannelSelect.value === 'other'
    ? tpChannelOtherInput.value.trim() || 'Other'
    : tpChannelSelect.value;
  const dayField = document.getElementById('tpDayOffset');
  const dayOffset = parseInt(dayField.value, 10);
  const description = document.getElementById('tpDescription').value.trim();

  // The input carries min="1", but never trust the field alone.
  if (!Number.isInteger(dayOffset) || dayOffset < 1) {
    dayField.setCustomValidity('Day must be 1 or higher.');
    dayField.reportValidity();
    return;
  }
  dayField.setCustomValidity('');

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
  renderContacts();
  exitEditMode();
});

// --- Scratch pad: the cow holding a note board ---

const NOTES_KEY = 'cadence_notes';
const NOTES_HIDDEN_KEY = 'cadence_notes_hidden';
const NOTES_POS_KEY = 'cadence_notes_pos';
const NOTES_SIZE_KEY = 'cadence_notes_size';

const NOTES_MIN_W = 200;
const NOTES_MIN_H = 90;
const NOTES_EDGE = 8;

const cowNotes = document.getElementById('cowNotes');
const cowNotesText = document.getElementById('cowNotesText');
const cowNotesShow = document.getElementById('cowNotesShow');

function readStored(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    /* storage unavailable; notes just won't persist */
  }
}

cowNotesText.value = readStored(NOTES_KEY) || '';

cowNotesText.addEventListener('input', () => {
  writeStored(NOTES_KEY, cowNotesText.value);
});

function setNotesVisible(visible) {
  writeStored(NOTES_HIDDEN_KEY, visible ? '' : '1');
  cowNotes.classList.toggle('hidden', !visible);
  cowNotesShow.classList.toggle('hidden', visible);
  if (visible) keepNotesOnScreen();
}

document.getElementById('cowNotesDismiss').addEventListener('click', () => setNotesVisible(false));
cowNotesShow.addEventListener('click', () => setNotesVisible(true));

// --- Moving and resizing the pad ---

function applyNotesSize(width, height) {
  cowNotesText.style.width = Math.round(width) + 'px';
  cowNotesText.style.height = Math.round(height) + 'px';
}

// Pin the pad by its top-left corner so dragging and clamping share one system.
function applyNotesPos(left, top) {
  cowNotes.style.left = Math.round(left) + 'px';
  cowNotes.style.top = Math.round(top) + 'px';
  cowNotes.style.bottom = 'auto';
}

function keepNotesOnScreen() {
  const box = cowNotes.getBoundingClientRect();
  // Zero size means it isn't on screen (hidden, or below the phone breakpoint).
  if (!box.width) return;
  const maxLeft = Math.max(NOTES_EDGE, window.innerWidth - box.width - NOTES_EDGE);
  const maxTop = Math.max(NOTES_EDGE, window.innerHeight - box.height - NOTES_EDGE);
  const left = Math.min(Math.max(box.left, NOTES_EDGE), maxLeft);
  const top = Math.min(Math.max(box.top, NOTES_EDGE), maxTop);
  if (left !== box.left || top !== box.top) applyNotesPos(left, top);
}

function storeNotesPos() {
  const box = cowNotes.getBoundingClientRect();
  writeStored(NOTES_POS_KEY, JSON.stringify({ left: Math.round(box.left), top: Math.round(box.top) }));
}

function readJson(key) {
  try {
    return JSON.parse(readStored(key) || 'null');
  } catch (e) {
    return null;
  }
}

const savedNotesSize = readJson(NOTES_SIZE_KEY);
if (savedNotesSize) applyNotesSize(savedNotesSize.width, savedNotesSize.height);

const savedNotesPos = readJson(NOTES_POS_KEY);
if (savedNotesPos) applyNotesPos(savedNotesPos.left, savedNotesPos.top);

// Drag the dark header bar to move the whole cow-and-board.
document.getElementById('cowNotesHandle').addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || e.target.closest('button')) return;
  const box = cowNotes.getBoundingClientRect();
  const offsetX = e.clientX - box.left;
  const offsetY = e.clientY - box.top;
  cowNotes.classList.add('dragging');

  function onMove(ev) {
    const maxLeft = Math.max(NOTES_EDGE, window.innerWidth - box.width - NOTES_EDGE);
    const maxTop = Math.max(NOTES_EDGE, window.innerHeight - box.height - NOTES_EDGE);
    applyNotesPos(
      Math.min(Math.max(ev.clientX - offsetX, NOTES_EDGE), maxLeft),
      Math.min(Math.max(ev.clientY - offsetY, NOTES_EDGE), maxTop)
    );
  }

  function onUp() {
    cowNotes.classList.remove('dragging');
    storeNotesPos();
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  e.preventDefault();
});

// Drag the corner grip to resize the note area.
document.getElementById('cowNotesResize').addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const startW = cowNotesText.offsetWidth;
  const startH = cowNotesText.offsetHeight;
  // Don't let it grow past the window edges.
  const textBox = cowNotesText.getBoundingClientRect();
  const maxW = Math.max(NOTES_MIN_W, window.innerWidth - textBox.left - NOTES_EDGE);
  const maxH = Math.max(NOTES_MIN_H, window.innerHeight - textBox.top - NOTES_EDGE);
  cowNotes.classList.add('dragging');

  function onMove(ev) {
    applyNotesSize(
      Math.min(Math.max(NOTES_MIN_W, startW + (ev.clientX - startX)), maxW),
      Math.min(Math.max(NOTES_MIN_H, startH + (ev.clientY - startY)), maxH)
    );
  }

  function onUp() {
    cowNotes.classList.remove('dragging');
    writeStored(NOTES_SIZE_KEY, JSON.stringify({
      width: cowNotesText.offsetWidth,
      height: cowNotesText.offsetHeight
    }));
    keepNotesOnScreen();
    storeNotesPos();
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
  }

  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
  e.preventDefault();
});

window.addEventListener('resize', keepNotesOnScreen);

// Restore whichever state they left it in.
if (readStored(NOTES_HIDDEN_KEY) === '1') {
  cowNotes.classList.add('hidden');
  cowNotesShow.classList.remove('hidden');
} else {
  keepNotesOnScreen();
}

renderContacts();
renderToday();
