async function fetchJson(path) {
  const response = await fetch(path);
  return response.json();
}

const VOCAB_QUIZ_STORAGE_KEY = 'hungarianAid.vocabularyQuiz';

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

function readQuizState() {
  try {
    const raw = localStorage.getItem(VOCAB_QUIZ_STORAGE_KEY);
    if (!raw) {
      return { asked: 0, correct: 0, incorrect: 0, currentIndex: 0 };
    }

    const parsed = JSON.parse(raw);
    if (
      typeof parsed.asked === 'number' &&
      typeof parsed.correct === 'number' &&
      typeof parsed.incorrect === 'number' &&
      typeof parsed.currentIndex === 'number'
    ) {
      return parsed;
    }
  } catch {
    // Fall back to defaults.
  }

  return { asked: 0, correct: 0, incorrect: 0, currentIndex: 0 };
}

function writeQuizState(state) {
  localStorage.setItem(VOCAB_QUIZ_STORAGE_KEY, JSON.stringify(state));
}

function setupVocabularyQuiz(items) {
  const score = document.getElementById('vocab-quiz-score');
  const prompt = document.getElementById('vocab-quiz-prompt');
  const hint = document.getElementById('vocab-quiz-hint');
  const answer = document.getElementById('vocab-quiz-answer');

  const revealButton = document.getElementById('vocab-quiz-reveal');
  const correctButton = document.getElementById('vocab-quiz-correct');
  const incorrectButton = document.getElementById('vocab-quiz-incorrect');
  const nextButton = document.getElementById('vocab-quiz-next');
  const resetButton = document.getElementById('vocab-quiz-reset');

  let state = readQuizState();
  let answerRevealed = false;

  const total = items.length;

  if (state.currentIndex >= total) {
    state.currentIndex = 0;
  }

  const renderScore = () => {
    score.textContent = `Score: ${state.correct} correct · ${state.incorrect} incorrect · ${state.asked} answered`;
  };

  const renderCurrent = () => {
    const item = items[state.currentIndex];

    prompt.textContent = item.hungarian;
    hint.textContent = `${item.type === 'phrase' ? 'Phrase' : 'Word'} · ${item.category}`;
    answer.textContent = item.english;

    answer.classList.add('hidden');
    answerRevealed = false;

    correctButton.disabled = true;
    incorrectButton.disabled = true;
  };

  const nextItem = () => {
    state.currentIndex = (state.currentIndex + 1) % total;
    writeQuizState(state);
    renderCurrent();
  };

  revealButton.addEventListener('click', () => {
    answer.classList.remove('hidden');
    answerRevealed = true;
    correctButton.disabled = false;
    incorrectButton.disabled = false;
  });

  correctButton.addEventListener('click', () => {
    if (!answerRevealed) {
      return;
    }

    state.correct += 1;
    state.asked += 1;
    writeQuizState(state);
    renderScore();
    nextItem();
  });

  incorrectButton.addEventListener('click', () => {
    if (!answerRevealed) {
      return;
    }

    state.incorrect += 1;
    state.asked += 1;
    writeQuizState(state);
    renderScore();
    nextItem();
  });

  nextButton.addEventListener('click', () => {
    nextItem();
  });

  resetButton.addEventListener('click', () => {
    state = { asked: 0, correct: 0, incorrect: 0, currentIndex: 0 };
    writeQuizState(state);
    renderScore();
    renderCurrent();
  });

  renderScore();
  renderCurrent();
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
  setupVocabularyQuiz(flashcardItems);
}

loadVocabularyCards();
