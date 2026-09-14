const STORAGE_KEY = 'cadence_contacts';

let contacts = loadContacts();

function loadContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
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
  };

  contacts.push(contact);
  saveContacts();
  renderContacts();

  form.reset();
  modal.classList.add('hidden');
});

renderContacts();
