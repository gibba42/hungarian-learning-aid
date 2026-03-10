const VERB_QUIZ_STORAGE_KEY = 'hungarianAid.verbQuiz';
const STUDY_TENSES = ['present', 'past', 'future'];

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  return response.json();
}

function showVerbError(message) {
  const cards = document.getElementById('verb-cards');
  const count = document.getElementById('verb-count');
  const quizScore = document.getElementById('verb-quiz-score');
  const quizCard = document.getElementById('verb-quiz-card');
  const quizActions = document.querySelector('.quiz-actions');

  count.textContent = message;
  cards.innerHTML = `<div class="empty-state">${message}</div>`;
  quizScore.textContent = 'Quiz unavailable';
  quizCard.classList.add('hidden');
  quizActions.classList.add('hidden');
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

function toSentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildTenseButtons(container, selectedTense, onSelect) {
  container.innerHTML = '';

  for (const tense of STUDY_TENSES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tense-toggle';
    button.dataset.tense = tense;
    button.textContent = toSentenceCase(tense);
    button.setAttribute('aria-pressed', String(tense === selectedTense));

    button.addEventListener('click', () => {
      onSelect(tense);
    });

    container.append(button);
  }
}

function syncTenseButtons(container, selectedTense) {
  const buttons = container.querySelectorAll('.tense-toggle');
  buttons.forEach((button) => {
    const isSelected = button.dataset.tense === selectedTense;
    button.setAttribute('aria-pressed', String(isSelected));
  });
}

function renderCards(items) {
  const container = document.getElementById('verb-cards');
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<div class="empty-state">No verb cards match this filter. Try enabling all verbs or tenses.</div>';
    return;
  }

  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'card-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');

    button.innerHTML = `
      <div class="prompt">${item.infinitive}</div>
      <div class="card-meta">Tense: <strong>${toSentenceCase(item.tense)}</strong></div>
      <div class="card-meta">Pronoun: <strong>${item.pronoun}</strong></div>
      <div class="answer hidden">Hungarian: ${item.hungarian}</div>
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
    const raw = localStorage.getItem(VERB_QUIZ_STORAGE_KEY);
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
  localStorage.setItem(VERB_QUIZ_STORAGE_KEY, JSON.stringify(state));
}

function setupVerbQuiz(items) {
  const score = document.getElementById('verb-quiz-score');
  const prompt = document.getElementById('verb-quiz-prompt');
  const meta = document.getElementById('verb-quiz-meta');
  const answer = document.getElementById('verb-quiz-answer');

  const revealButton = document.getElementById('verb-quiz-reveal');
  const correctButton = document.getElementById('verb-quiz-correct');
  const incorrectButton = document.getElementById('verb-quiz-incorrect');
  const nextButton = document.getElementById('verb-quiz-next');
  const resetButton = document.getElementById('verb-quiz-reset');

  let state = readQuizState();
  let answerRevealed = false;

  const total = items.length;

  if (!total) {
    score.textContent = 'Quiz unavailable: no verb items loaded.';
    prompt.textContent = 'No prompt available';
    meta.textContent = '';
    answer.textContent = '';
    [revealButton, correctButton, incorrectButton, nextButton, resetButton].forEach((button) => {
      button.disabled = true;
    });
    return;
  }

  if (state.currentIndex >= total) {
    state.currentIndex = 0;
  }

  const renderScore = () => {
    score.textContent = `Score: ${state.correct} correct · ${state.incorrect} incorrect · ${state.asked} answered`;
  };

  const renderCurrent = () => {
    const item = items[state.currentIndex];

    prompt.textContent = item.infinitive;
    meta.innerHTML = `Tense: <strong>${item.tense}</strong> · Pronoun: <strong>${item.pronoun}</strong>`;
    answer.textContent = item.hungarian;

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

function normalizeVerbToCards(verb) {
  if (verb.conjugations && typeof verb.conjugations === 'object') {
    return Object.entries(verb.conjugations).flatMap(([tense, forms]) =>
      forms.map((form) => ({
        infinitive: verb.englishInfinitive,
        lemma: verb.hungarianLemma || '',
        tense,
        pronoun: form.pronoun,
        hungarian: form.hungarian
      }))
    );
  }

  if (verb.tense && Array.isArray(verb.forms)) {
    return verb.forms.map((form) => ({
      infinitive: verb.englishInfinitive,
      lemma: verb.hungarianLemma || '',
      tense: verb.tense,
      pronoun: form.pronoun,
      hungarian: form.hungarian
    }));
  }

  return [];
}

async function loadVerbs() {
  try {
    const { verbs } = await fetchJson('data/content/verbs.json');

    const conjugationCards = verbs.flatMap((verb) => normalizeVerbToCards(verb));

    const verbFilter = document.getElementById('verb-filter');
    const tenseFilter = document.getElementById('tense-filter');
    const count = document.getElementById('verb-count');
    let selectedTense = 'present';

    const verbOptions = [...new Set(conjugationCards.map((item) => item.infinitive))].sort();
    const tenseOptions = new Set(conjugationCards.map((item) => item.tense));

    buildOptions(verbFilter, verbOptions, 'All verbs');

    const fallbackTense = STUDY_TENSES.find((tense) => tenseOptions.has(tense));
    selectedTense = fallbackTense || STUDY_TENSES[0];
    buildTenseButtons(tenseFilter, selectedTense, (tense) => {
      selectedTense = tense;
      syncTenseButtons(tenseFilter, selectedTense);
      updateView();
    });

    const updateView = () => {
      const selectedVerb = verbFilter.value;

      const filteredItems = conjugationCards.filter((item) => {
        const verbMatch = selectedVerb === 'all' || item.infinitive === selectedVerb;
        const tenseMatch = item.tense === selectedTense;
        return verbMatch && tenseMatch;
      });

      renderCards(filteredItems);
      count.textContent = `${filteredItems.length} ${toSentenceCase(selectedTense)} tense cards shown · ${verbs.length} verb entries`;
    };

    verbFilter.addEventListener('change', updateView);

    updateView();
    setupVerbQuiz(conjugationCards);
  } catch (error) {
    showVerbError('Could not load verb content. Please refresh and try again.');
    console.error(error);
  }
}

loadVerbs();
