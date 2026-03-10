async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  return response.json();
}

function showFlashcardError(message) {
  const meta = document.getElementById('random-flashcard-meta');
  const card = document.getElementById('random-flashcard-card');
  const revealButton = document.getElementById('random-flashcard-reveal');
  const nextButton = document.getElementById('random-flashcard-next');
  const reshuffleButton = document.getElementById('random-flashcard-reshuffle');
  const typeFilter = document.getElementById('random-flashcard-content-type');
  const categoryFilter = document.getElementById('random-flashcard-category');

  meta.textContent = message;
  card.innerHTML = `<p class="empty-state">${message}</p>`;
  revealButton.disabled = true;
  nextButton.disabled = true;
  reshuffleButton.disabled = true;
  typeFilter.disabled = true;
  categoryFilter.disabled = true;
}

function normalizeVocabularyCards(vocabularyData) {
  return (vocabularyData.words ?? []).map((item) => ({
    prompt: item.hungarian,
    answer: item.english,
    category: item.category ?? 'General',
    contentType: 'word'
  }));
}

function normalizePhraseCards(phraseData) {
  return (phraseData.phrases ?? []).map((item) => ({
    prompt: item.hungarian,
    answer: item.english,
    category: item.category ?? 'General',
    contentType: 'phrase'
  }));
}

function formatContentType(contentType) {
  if (contentType === 'phrase') {
    return 'Phrase';
  }
  return 'Vocabulary';
}

function pickRandomIndex(total, previousIndex) {
  if (total <= 1) {
    return 0;
  }

  let randomIndex = Math.floor(Math.random() * total);
  if (randomIndex === previousIndex) {
    randomIndex = (randomIndex + 1 + Math.floor(Math.random() * (total - 1))) % total;
  }

  return randomIndex;
}

function setupRandomFlashcards(cards) {
  const meta = document.getElementById('random-flashcard-meta');
  const type = document.getElementById('random-flashcard-type');
  const prompt = document.getElementById('random-flashcard-prompt');
  const answer = document.getElementById('random-flashcard-answer');
  const revealButton = document.getElementById('random-flashcard-reveal');
  const nextButton = document.getElementById('random-flashcard-next');
  const reshuffleButton = document.getElementById('random-flashcard-reshuffle');
  const typeFilter = document.getElementById('random-flashcard-content-type');
  const categoryFilter = document.getElementById('random-flashcard-category');

  if (!cards.length) {
    showFlashcardError('No flashcards available right now.');
    return;
  }

  const categories = [...new Set(cards.map((card) => card.category))].sort((a, b) => a.localeCompare(b));
  categoryFilter.innerHTML = '<option value="all">All categories</option>';
  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.append(option);
  });

  if (!categories.length) {
    categoryFilter.disabled = true;
  }

  const state = {
    contentType: 'all',
    category: 'all',
    visibleCards: cards,
    currentIndex: -1
  };

  const updateMeta = () => {
    const totalCount = cards.length;
    const visibleCount = state.visibleCards.length;
    const typeLabel = state.contentType === 'all' ? 'Vocabulary + Phrases' : formatContentType(state.contentType);
    const categoryLabel = state.category === 'all' ? 'All categories' : state.category;
    meta.textContent = `${visibleCount}/${totalCount} cards · ${typeLabel} · ${categoryLabel}`;
  };

  const render = () => {
    if (!state.visibleCards.length) {
      type.textContent = 'No cards match this filter';
      prompt.textContent = 'Try choosing a different type or category.';
      answer.textContent = '';
      answer.classList.add('hidden');
      revealButton.disabled = true;
      nextButton.disabled = true;
      return;
    }

    const card = state.visibleCards[state.currentIndex];
    type.textContent = `${formatContentType(card.contentType)} · ${card.category}`;
    prompt.textContent = card.prompt;
    answer.textContent = card.answer;
    answer.classList.add('hidden');
    revealButton.disabled = false;
    nextButton.disabled = false;
  };

  const applyFilters = () => {
    state.visibleCards = cards.filter((card) => {
      const typeMatch = state.contentType === 'all' || card.contentType === state.contentType;
      const categoryMatch = state.category === 'all' || card.category === state.category;
      return typeMatch && categoryMatch;
    });

    state.currentIndex = state.visibleCards.length ? pickRandomIndex(state.visibleCards.length, -1) : -1;
    updateMeta();
    render();
  };

  revealButton.addEventListener('click', () => {
    answer.classList.remove('hidden');
  });

  nextButton.addEventListener('click', () => {
    state.currentIndex = pickRandomIndex(state.visibleCards.length, state.currentIndex);
    render();
  });

  reshuffleButton.addEventListener('click', () => {
    state.currentIndex = pickRandomIndex(state.visibleCards.length, state.currentIndex);
    render();
  });

  typeFilter.addEventListener('change', () => {
    state.contentType = typeFilter.value;
    applyFilters();
  });

  categoryFilter.addEventListener('change', () => {
    state.category = categoryFilter.value;
    applyFilters();
  });

  document.getElementById('random-flashcard-card').addEventListener('click', () => {
    answer.classList.remove('hidden');
  });

  applyFilters();
}

async function loadRandomFlashcards() {
  try {
    const vocabularyData = await fetchJson('data/content/vocabulary.json');
    const phraseData = await fetchJson('data/content/phrases.json');

    const cards = [
      ...normalizeVocabularyCards(vocabularyData),
      ...normalizePhraseCards(phraseData)
    ];

    setupRandomFlashcards(cards);
  } catch (error) {
    showFlashcardError('Could not load random flashcards. Please refresh and try again.');
    console.error(error);
  }
}

loadRandomFlashcards();
