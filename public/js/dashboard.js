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

console.log('fields in form:', [...form.elements].map((fElt) => fElt.name));
