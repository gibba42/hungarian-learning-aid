const RANDOM_FLASHCARD_CONTENT_TYPES = ['word', 'phrase'];

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

  meta.textContent = message;
  card.innerHTML = `<p class="empty-state">${message}</p>`;
  revealButton.disabled = true;
  nextButton.disabled = true;
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
  if (contentType === 'verb') {
    return 'Verb';
  }
  return 'Word';
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

  if (!cards.length) {
    showFlashcardError('No flashcards available right now.');
    return;
  }

  meta.textContent = `${cards.length} cards loaded · ${RANDOM_FLASHCARD_CONTENT_TYPES.join(' + ')}`;

  let currentIndex = pickRandomIndex(cards.length, -1);

  const render = () => {
    const card = cards[currentIndex];
    type.textContent = `${formatContentType(card.contentType)} · ${card.category}`;
    prompt.textContent = card.prompt;
    answer.textContent = card.answer;
    answer.classList.add('hidden');
    revealButton.disabled = false;
  };

  revealButton.addEventListener('click', () => {
    answer.classList.remove('hidden');
  });

  nextButton.addEventListener('click', () => {
    currentIndex = pickRandomIndex(cards.length, currentIndex);
    render();
  });

  document.getElementById('random-flashcard-card').addEventListener('click', () => {
    answer.classList.remove('hidden');
  });

  render();
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
