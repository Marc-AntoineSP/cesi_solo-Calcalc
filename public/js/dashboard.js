const gridContainer = document.getElementById('gridContainer');
const diag = document.getElementById('editModal');
const form = document.getElementById('editForm');

gridContainer.addEventListener('click', (e) => {
  const submitBtn = e.target.closest('button[data-action="edit"]');
  if (submitBtn === null) return;

  const card = submitBtn.closest('article');
  if (card === null) return;
  const { id } = card.dataset;
  const { name } = card.dataset;
  const { description } = card.dataset;
  const { calocent } = card.dataset;

  form.elements.id.value = id;
  form.elements.name.value = name;
  form.elements.description.value = description;
  form.elements.calocent.value = calocent;

  diag.showModal();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = form.elements.id.value;
  const name = form.elements.name.value;
  const description = form.elements.description.value;
  const calocent = Number(form.elements.calocent.value);

  if (!name) {alert('Nom requis'); diag.close(); return; }
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

diag.querySelector('[data-role="cancel"]').addEventListener('click', () => diag.close());
diag.addEventListener('click', (e) => {
  if (e.target === diag) diag.close(); // clic backdrop
});

console.log('fields in form:', [...form.elements].map((fElt) => fElt.name));
