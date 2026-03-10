async function fetchJson(path) {
  const response = await fetch(path);
  return response.json();
}

function buildOptions(select, options, allLabel) {
  select.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = allLabel;
  select.append(allOption);

  for (const option of options) {
    const element = document.createElement('option');
    element.value = option;
    element.textContent = option;
    select.append(element);
  }
}

function renderCards(items) {
  const container = document.getElementById('vocab-cards');
  container.innerHTML = '';

  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'card-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');

    button.innerHTML = `
      <div class="prompt">${item.hungarian}</div>
      <div class="hint">${item.type === 'phrase' ? 'Phrase' : 'Word'} · ${item.category} · click to reveal</div>
      <div class="answer hidden">${item.english}</div>
    `;

    button.addEventListener('click', () => {
      const answer = button.querySelector('.answer');
      const hidden = answer.classList.toggle('hidden');
      button.setAttribute('aria-expanded', String(!hidden));
    });

    container.append(button);
  }
}

async function loadVocabularyCards() {
  const vocabularyData = await fetchJson('data/content/vocabulary.json');
  const phraseData = await fetchJson('data/content/phrases.json');

  const words = (vocabularyData.words ?? []).map((item) => ({
    ...item,
    type: 'word',
    category: item.category ?? 'General'
  }));
  const phrases = (phraseData.phrases ?? []).map((item) => ({
    ...item,
    type: 'phrase',
    category: item.category ?? 'General'
  }));

  const flashcardItems = [...words, ...phrases];
  const categories = [...new Set(flashcardItems.map((item) => item.category))].sort();

  const typeFilter = document.getElementById('type-filter');
  const categoryFilter = document.getElementById('category-filter');
  const count = document.getElementById('vocab-count');

  buildOptions(typeFilter, ['word', 'phrase'], 'All content');
  buildOptions(categoryFilter, categories, 'All categories');

  const updateView = () => {
    const selectedType = typeFilter.value;
    const selectedCategory = categoryFilter.value;

    const filteredItems = flashcardItems.filter((item) => {
      const typeMatch = selectedType === 'all' || item.type === selectedType;
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      return typeMatch && categoryMatch;
    });

    renderCards(filteredItems);
    count.textContent = `${filteredItems.length} cards shown · ${words.length} words · ${phrases.length} short phrases`;
  };

  typeFilter.addEventListener('change', updateView);
  categoryFilter.addEventListener('change', updateView);

  updateView();
}

loadVocabularyCards();
