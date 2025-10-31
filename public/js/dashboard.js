/* eslint-disable no-console */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
const gridContainer = document.getElementById('gridContainer');

const diag = document.getElementById('editModal');
const form = document.getElementById('editForm');

const diagSupp = document.getElementById('suppModal');
const formSupp = document.getElementById('suppForm');

const diagAdd = document.getElementById('addModal');
const addForm = document.getElementById('addForm');
const addBtn = document.getElementById('addButton');

console.log('CACA PROUT');

const escapeHtml = (s) => (String(s ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;'));

const renderCard = (p) => {
  const id = Number(p.id);
  const name = String(p.name ?? '');
  const desc = String(p.description ?? '');
  const calo = Number(p.calocent ?? 0);
  const countryId = Number(p.country_id ?? p.pays_id ?? 0);

  return `
<article
  data-id="${id}"
  data-name="${escapeHtml(name)}"
  data-description="${escapeHtml(desc)}"
  data-calocent="${calo}"
  data-country-id="${countryId || ''}"
  class="card card-compact bg-base-300 flex-row justify-between p-2.5 border-accent border rounded-lg"
>
  <div id="listItemInfos" class="flex flex-col gap-2.5 flex-2">
    <p class="self-center">Name : ${escapeHtml(name)}</p>
    <p class="self-center">Calories/100g : ${Number.isFinite(calo) ? calo : ''}</p>
  </div>
  <div class="flex justify-end flex-1 self-center gap-2.5">
    <button type="button" class="btn btn-primary" data-action="delete" title="Supprimer">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
      </svg>
    </button>
    <button type="button" data-action="edit" class="btn btn-secondary" title="Modifier">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
        <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
        <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
      </svg>
    </button>
  </div>
</article>`;
};

gridContainer.addEventListener('click', (e) => {
  const card = e.target.closest('article[data-id]');
  if (card === null) return;

  const {
    id, name, description, calocent,
  } = card.dataset;

  if (e.target.closest('button[data-action="delete"]')) {
    formSupp.elements.id.value = id;
    formSupp.elements.name.value = name;
    formSupp.elements.description.value = description;
    formSupp.elements.calocent.value = calocent;

    diagSupp.showModal();
    return;
  }

  if (e.target.closest('button[data-action="edit"]')) {
    form.elements.id.value = id;
    form.elements.name.value = name;
    form.elements.description.value = description;
    form.elements.calocent.value = calocent;

    diag.showModal();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = form.elements.id.value;
  const name = form.elements.name.value;
  const description = form.elements.description.value;
  const calocent = Number(form.elements.calocent.value);

  if (!name) { alert('Nom requis'); diag.close(); return; }
  if (!calocent || !Number.isInteger(calocent)) { alert('Calories/100g requis et doit être un integer'); diag.close(); return; }

  const res = await fetch(`/api/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      calocent,
    }),
  });

  if (!res.ok) {
    alert(`Erreur : ${res.status}`);
    diag.close();
  }

  const card = gridContainer.querySelector(`article[data-id="${id}"]`);
  card.dataset.name = name;
  card.dataset.description = description;
  card.dataset.calocent = calocent;
  card.querySelector('#listItemInfos p:nth-child(1)').textContent = `Name : ${name}`;
  card.querySelector('#listItemInfos p:nth-child(2)').textContent = `Calories/100g : ${calocent}`;

  diag.close();
});

formSupp.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = formSupp.elements.id.value;

  const res = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    alert(`Erreur : ${res.status}`);
    diagSupp.close();
  }
  gridContainer.querySelector(`article[data-id="${id}"]`).remove();
  diagSupp.close();
});

diag.querySelector('[data-role="cancel"]').addEventListener('click', () => diag.close());
diag.addEventListener('click', (e) => {
  if (e.target === diag) diag.close(); // clic backdrop
});
diagSupp.querySelector('[data-role="cancel"]').addEventListener('click', () => diagSupp.close());
diagSupp.addEventListener('click', (e) => {
  if (e.target === diagSupp) diagSupp.close(); // clic backdrop
});

console.log('fields in form:', [...form.elements].map((fElt) => fElt.name));

addBtn.addEventListener('click', () => {
  addForm.reset();
  diagAdd.showModal();
});

addForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = addForm.elements.name.value;
  const description = addForm.elements.description.value;
  const calocent = Number(addForm.elements.calocent.value);
  const paysId = parseInt(addForm.elements.pays_id.value, 10);

  if (!name) { alert('Nom requis'); diagAdd.close(); return; }
  if (!calocent || !Number.isInteger(calocent)) { alert('Calories/100g requis et doit être un integer'); diagAdd.close(); return; }
  if (!Number.isInteger(paysId)) { alert('Pays non valide'); diagAdd.close(); return; }

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      calocent,
      country_id: paysId,
    }),
  });

  if (!res.ok) {
    alert(`Erreur : ${res.status}`);
    diagAdd.close();
    return;
  }

  const newProduct = await res.json();
  const dataProduct = newProduct.data;

  gridContainer.insertAdjacentHTML('beforeend', renderCard(dataProduct));
  diagAdd.close();
});
