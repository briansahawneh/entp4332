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

  form.reset();
  modal.classList.add('hidden');
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

  list.innerHTML = sorted.map(tp => `
    <li class="touchpoint-row">
      <span class="touchpoint-day">Day ${tp.dayOffset}</span>
      <span class="touchpoint-channel">${CHANNEL_LABELS[tp.channel] || escapeHtml(tp.channel)}</span>
      <span class="touchpoint-description">${escapeHtml(tp.description)}</span>
      <span class="touchpoint-actions">
        <button type="button" class="edit-tp-btn" data-id="${tp.id}">Edit</button>
        <button type="button" class="delete-tp-btn" data-id="${tp.id}">Delete</button>
      </span>
    </li>
  `).join('');
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

document.getElementById('touchpointList').addEventListener('click', (e) => {
  const contact = contacts.find(c => c.id === activeContactId);
  if (!contact) return;

  const editBtn = e.target.closest('.edit-tp-btn');
  if (editBtn) {
    const tp = contact.touchpoints.find(t => t.id === editBtn.dataset.id);
    if (!tp) return;

    editingTouchpointId = tp.id;
    document.getElementById('tpDayOffset').value = tp.dayOffset;
    document.getElementById('tpDescription').value = tp.description;

    const isStandardChannel = CHANNEL_LABELS.hasOwnProperty(tp.channel);
    tpChannelSelect.value = isStandardChannel ? tp.channel : 'other';
    tpChannelOtherLabel.classList.toggle('hidden', isStandardChannel);
    tpChannelOtherInput.value = isStandardChannel ? '' : tp.channel;

    tpSubmitBtn.textContent = 'Save Changes';
    tpCancelEditBtn.classList.remove('hidden');
    return;
  }

  const deleteBtn = e.target.closest('.delete-tp-btn');
  if (deleteBtn) {
    if (!confirm('Delete this touchpoint? This cannot be undone.')) return;
    contact.touchpoints = contact.touchpoints.filter(t => t.id !== deleteBtn.dataset.id);
    saveContacts();
    renderTouchpoints(contact);
    if (editingTouchpointId === deleteBtn.dataset.id) exitEditMode();
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
  exitEditMode();
});

renderContacts();
