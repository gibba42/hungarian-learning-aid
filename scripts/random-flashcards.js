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
  const markCorrectButton = document.getElementById('random-flashcard-mark-correct');
  const markIncorrectButton = document.getElementById('random-flashcard-mark-incorrect');
  const nextButton = document.getElementById('random-flashcard-next');
  const reshuffleButton = document.getElementById('random-flashcard-reshuffle');
  const typeFilter = document.getElementById('random-flashcard-content-type');
  const categoryFilter = document.getElementById('random-flashcard-category');
  const includeVerbsFilter = document.getElementById('random-flashcard-include-verbs');
  const sessionLengthFilter = document.getElementById('random-flashcard-session-length');

  meta.textContent = message;
  card.innerHTML = `<p class="empty-state">${message}</p>`;
  revealButton.disabled = true;
  markCorrectButton.disabled = true;
  markIncorrectButton.disabled = true;
  nextButton.disabled = true;
  reshuffleButton.disabled = true;
  typeFilter.disabled = true;
  categoryFilter.disabled = true;
  includeVerbsFilter.disabled = true;
  sessionLengthFilter.disabled = true;
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

function normalizeVerbCards(verbData) {
  return (verbData.verbs ?? []).flatMap((verb) => {
    const conjugations = verb.conjugations ?? {};
    return Object.entries(conjugations).flatMap(([tense, forms]) =>
      (forms ?? []).map((form) => ({
        prompt: `${verb.englishInfinitive} · ${tense} · ${form.pronoun}`,
        answer: form.hungarian,
        category: 'Verb',
        contentType: 'verb'
      }))
    );
  });
}

function formatContentType(contentType) {
  if (contentType === 'phrase') {
    return 'Phrase';
  }
  if (contentType === 'verb') {
    return 'Verb';
  }
  return 'Vocabulary';
}

function formatContentTypeSummary(contentType, includeVerbs) {
  if (contentType === 'all') {
    return includeVerbs ? 'Vocabulary + Phrases + Verbs' : 'Vocabulary + Phrases';
  }

  return formatContentType(contentType);
}

function parseSessionLength(value) {
  if (value === 'unlimited') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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
  const progress = document.getElementById('random-flashcard-progress');
  const type = document.getElementById('random-flashcard-type');
  const prompt = document.getElementById('random-flashcard-prompt');
  const answer = document.getElementById('random-flashcard-answer');
  const revealButton = document.getElementById('random-flashcard-reveal');
  const markCorrectButton = document.getElementById('random-flashcard-mark-correct');
  const markIncorrectButton = document.getElementById('random-flashcard-mark-incorrect');
  const nextButton = document.getElementById('random-flashcard-next');
  const reshuffleButton = document.getElementById('random-flashcard-reshuffle');
  const typeFilter = document.getElementById('random-flashcard-content-type');
  const categoryFilter = document.getElementById('random-flashcard-category');
  const includeVerbsFilter = document.getElementById('random-flashcard-include-verbs');
  const sessionLengthFilter = document.getElementById('random-flashcard-session-length');
  const summaryPanel = document.getElementById('random-flashcard-summary');
  const summarySeen = document.getElementById('random-flashcard-summary-seen');
  const summaryCorrect = document.getElementById('random-flashcard-summary-correct');
  const summaryIncorrect = document.getElementById('random-flashcard-summary-incorrect');

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
    includeVerbs: false,
    sessionLength: parseSessionLength(sessionLengthFilter.value),
    visibleCards: cards,
    currentIndex: -1,
    shownCardIds: new Set(),
    currentCardSeen: false,
    marksByCardId: new Map(),
    seenCount: 0,
    correctCount: 0,
    incorrectCount: 0,
    isSessionComplete: false
  };

  const getCardId = (card) => `${card.contentType}::${card.category}::${card.prompt}::${card.answer}`;

  const updateMeta = () => {
    const totalCount = cards.length;
    const visibleCount = state.visibleCards.length;
    const typeLabel = formatContentTypeSummary(state.contentType, state.includeVerbs);
    const categoryLabel = state.category === 'all' ? 'All categories' : state.category;
    const sessionLabel = state.sessionLength === null ? 'Unlimited session' : `${state.sessionLength} cards`;
    meta.textContent = `${visibleCount}/${totalCount} cards · ${typeLabel} · ${categoryLabel} · ${sessionLabel}`;
  };

  const updateProgress = () => {
    const target = state.sessionLength;
    const seenText = target === null ? `${state.seenCount} seen` : `${state.seenCount}/${target} seen`;
    progress.textContent = `${seenText} · ${state.correctCount} correct · ${state.incorrectCount} incorrect`;
  };

  const updateSummary = () => {
    summarySeen.textContent = `${state.seenCount}`;
    summaryCorrect.textContent = `${state.correctCount}`;
    summaryIncorrect.textContent = `${state.incorrectCount}`;
  };

  const setAnswerControlsState = (enabled) => {
    markCorrectButton.disabled = !enabled;
    markIncorrectButton.disabled = !enabled;
  };

  const hideSummary = () => {
    summaryPanel.classList.add('hidden');
  };

  const completeSession = () => {
    state.isSessionComplete = true;
    type.textContent = 'Session complete';
    prompt.textContent = 'Nice work. Review your summary below or reshuffle to start again.';
    answer.textContent = '';
    answer.classList.add('hidden');
    revealButton.disabled = true;
    nextButton.disabled = true;
    setAnswerControlsState(false);
    updateSummary();
    summaryPanel.classList.remove('hidden');
  };

  const render = () => {
    if (!state.visibleCards.length) {
      type.textContent = 'No cards match this filter';
      prompt.textContent = 'Try choosing a different type, category, or verb option.';
      answer.textContent = '';
      answer.classList.add('hidden');
      revealButton.disabled = true;
      nextButton.disabled = true;
      setAnswerControlsState(false);
      hideSummary();
      return;
    }

    if (state.isSessionComplete) {
      completeSession();
      return;
    }

    const card = state.visibleCards[state.currentIndex];
    type.textContent = `${formatContentType(card.contentType)} · ${card.category}`;
    prompt.textContent = card.prompt;
    answer.textContent = card.answer;
    answer.classList.add('hidden');
    revealButton.disabled = false;
    nextButton.disabled = false;
    setAnswerControlsState(false);
    hideSummary();
  };

  const refreshProgress = () => {
    updateMeta();
    updateProgress();
  };

  const beginFreshSession = () => {
    state.shownCardIds = new Set();
    state.currentCardSeen = false;
    state.marksByCardId = new Map();
    state.seenCount = 0;
    state.correctCount = 0;
    state.incorrectCount = 0;
    state.isSessionComplete = false;
    state.currentIndex = state.visibleCards.length ? pickRandomIndex(state.visibleCards.length, -1) : -1;
    refreshProgress();
    render();
  };

  const recordSeenForCurrentCard = () => {
    if (!state.visibleCards.length || state.currentIndex < 0) {
      return;
    }

    const card = state.visibleCards[state.currentIndex];
    const cardId = getCardId(card);
    if (!state.currentCardSeen && !state.shownCardIds.has(cardId)) {
      state.shownCardIds.add(cardId);
      state.currentCardSeen = true;
      state.seenCount += 1;
      updateProgress();
    }
  };

  const updateMarkForCurrentCard = (mark) => {
    const card = state.visibleCards[state.currentIndex];
    const cardId = getCardId(card);
    const previousMark = state.marksByCardId.get(cardId);

    if (previousMark === 'correct') {
      state.correctCount -= 1;
    }
    if (previousMark === 'incorrect') {
      state.incorrectCount -= 1;
    }

    state.marksByCardId.set(cardId, mark);
    if (mark === 'correct') {
      state.correctCount += 1;
    }
    if (mark === 'incorrect') {
      state.incorrectCount += 1;
    }

    updateProgress();
  };

  const moveToNextCard = () => {
    if (!state.visibleCards.length) {
      return;
    }

    if (state.sessionLength !== null && state.seenCount >= state.sessionLength) {
      completeSession();
      return;
    }

    state.currentIndex = pickRandomIndex(state.visibleCards.length, state.currentIndex);
    state.currentCardSeen = false;
    render();
  };

  const applyFilters = () => {
    state.visibleCards = cards.filter((card) => {
      const verbsAllowed = state.includeVerbs || card.contentType !== 'verb';
      const typeMatch = state.contentType === 'all' || card.contentType === state.contentType;
      const categoryMatch = state.category === 'all' || card.category === state.category;
      return verbsAllowed && typeMatch && categoryMatch;
    });

    beginFreshSession();
  };

  revealButton.addEventListener('click', () => {
    if (state.isSessionComplete) {
      return;
    }

    answer.classList.remove('hidden');
    setAnswerControlsState(true);
    recordSeenForCurrentCard();
  });

  markCorrectButton.addEventListener('click', () => {
    updateMarkForCurrentCard('correct');
    moveToNextCard();
  });

  markIncorrectButton.addEventListener('click', () => {
    updateMarkForCurrentCard('incorrect');
    moveToNextCard();
  });

  nextButton.addEventListener('click', () => {
    moveToNextCard();
  });

  reshuffleButton.addEventListener('click', () => {
    beginFreshSession();
  });

  typeFilter.addEventListener('change', () => {
    state.contentType = typeFilter.value;
    applyFilters();
  });

  includeVerbsFilter.addEventListener('change', () => {
    state.includeVerbs = includeVerbsFilter.value === 'include';
    applyFilters();
  });

  categoryFilter.addEventListener('change', () => {
    state.category = categoryFilter.value;
    applyFilters();
  });

  sessionLengthFilter.addEventListener('change', () => {
    state.sessionLength = parseSessionLength(sessionLengthFilter.value);
    beginFreshSession();
  });

  document.getElementById('random-flashcard-card').addEventListener('click', () => {
    if (revealButton.disabled) {
      return;
    }
    answer.classList.remove('hidden');
    setAnswerControlsState(true);
    recordSeenForCurrentCard();
  });

  applyFilters();
}

async function loadRandomFlashcards() {
  try {
    const vocabularyData = await fetchJson('data/content/vocabulary.json');
    const phraseData = await fetchJson('data/content/phrases.json');
    const verbData = await fetchJson('data/content/verbs.json');

    const cards = [
      ...normalizeVocabularyCards(vocabularyData),
      ...normalizePhraseCards(phraseData),
      ...normalizeVerbCards(verbData)
    ];

    setupRandomFlashcards(cards);
  } catch (error) {
    showFlashcardError('Could not load random flashcards. Please refresh and try again.');
    console.error(error);
  }
}

loadRandomFlashcards();
