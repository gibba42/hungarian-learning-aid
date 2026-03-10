async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  return response.json();
}

const DAILY_STORAGE_KEY = 'hungarianAid.dailyChallenge';
const DAILY_COUNTS = {
  vocabulary: 5,
  verb: 3,
  grammar: 2
};

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashSeed(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seedString) {
  let state = hashSeed(seedString) || 123456789;
  return () => {
    state = Math.imul(state, 1664525) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
}

function seededShuffle(items, seedString) {
  const copy = [...items];
  const random = createSeededRandom(seedString);

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function normalizeVocabularyCards(vocabularyData, phraseData) {
  const words = (vocabularyData.words ?? []).map((item) => ({
    id: `word::${item.hungarian}::${item.english}`,
    questionType: 'vocabulary',
    prompt: item.hungarian,
    answer: item.english,
    meta: `${item.category ?? 'General'} · Word`
  }));

  const phrases = (phraseData.phrases ?? []).map((item) => ({
    id: `phrase::${item.hungarian}::${item.english}`,
    questionType: 'vocabulary',
    prompt: item.hungarian,
    answer: item.english,
    meta: `${item.category ?? 'General'} · Phrase`
  }));

  return [...words, ...phrases];
}

function normalizeVerbCards(verbData) {
  return (verbData.verbs ?? []).flatMap((verb) => {
    const conjugations = verb.conjugations ?? {};
    return Object.entries(conjugations).flatMap(([tense, forms]) =>
      (forms ?? []).map((form) => ({
        id: `verb::${verb.englishInfinitive}::${tense}::${form.pronoun}::${form.hungarian}`,
        questionType: 'verb',
        prompt: `${verb.englishInfinitive} (${form.pronoun})`,
        answer: form.hungarian,
        meta: `${tense} tense`
      }))
    );
  });
}

function normalizeGrammarStyleCards(phraseData) {
  return (phraseData.phrases ?? []).map((item) => ({
    id: `sentence::${item.hungarian}::${item.english}`,
    questionType: 'grammar',
    prompt: item.english,
    answer: item.hungarian,
    meta: `${item.category ?? 'General'} · Sentence build`
  }));
}

function pickStableSubset(items, count, seedKey) {
  if (!items.length) {
    return [];
  }

  const shuffled = seededShuffle(items, seedKey);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function generateDailyQuestions(vocabCards, verbCards, grammarCards, dayKey) {
  const vocabSelected = pickStableSubset(vocabCards, DAILY_COUNTS.vocabulary, `${dayKey}:vocabulary`);
  const verbSelected = pickStableSubset(verbCards, DAILY_COUNTS.verb, `${dayKey}:verb`);
  let grammarSelected = pickStableSubset(grammarCards, DAILY_COUNTS.grammar, `${dayKey}:grammar`);

  if (grammarSelected.length < DAILY_COUNTS.grammar) {
    const fallbackPool = seededShuffle([...vocabCards, ...verbCards], `${dayKey}:fallback`);
    const needed = DAILY_COUNTS.grammar - grammarSelected.length;
    const fallback = fallbackPool.slice(0, needed).map((item) => ({
      ...item,
      questionType: item.questionType === 'grammar' ? 'grammar' : item.questionType
    }));
    grammarSelected = [...grammarSelected, ...fallback];
  }

  return [...vocabSelected, ...verbSelected, ...grammarSelected];
}

function readStoredState() {
  try {
    const raw = localStorage.getItem(DAILY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch {
    // Ignore invalid storage values.
  }
  return null;
}

function writeStoredState(state) {
  localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(state));
}

function defaultProgress(total) {
  return {
    currentIndex: 0,
    correct: 0,
    incorrect: 0,
    completed: false,
    total,
    answers: {}
  };
}

function showDailyError(message) {
  const panel = document.getElementById('daily-question-panel');
  panel.innerHTML = `<p class="empty-state">${message}</p>`;
}

function checkTypedAnswer(input, expected) {
  const normalize = (value) => value.trim().toLowerCase();
  return normalize(input) === normalize(expected);
}

function setupDailyChallenge(questions, dayKey) {
  const date = document.getElementById('daily-date');
  const status = document.getElementById('daily-status');
  const progressBar = document.getElementById('daily-progress');
  const position = document.getElementById('daily-position');
  const type = document.getElementById('daily-type');
  const prompt = document.getElementById('daily-prompt');
  const meta = document.getElementById('daily-meta');
  const input = document.getElementById('daily-input');
  const answer = document.getElementById('daily-answer');
  const feedback = document.getElementById('daily-feedback');

  const revealButton = document.getElementById('daily-reveal');
  const correctButton = document.getElementById('daily-correct');
  const incorrectButton = document.getElementById('daily-incorrect');
  const nextButton = document.getElementById('daily-next');
  const restartButton = document.getElementById('daily-restart');

  const summaryPanel = document.getElementById('daily-summary');
  const summaryScore = document.getElementById('daily-summary-score');
  const summaryTotal = document.getElementById('daily-summary-total');
  const summaryCorrect = document.getElementById('daily-summary-correct');
  const summaryIncorrect = document.getElementById('daily-summary-incorrect');
  const summaryPercent = document.getElementById('daily-summary-percent');

  if (!questions.length) {
    showDailyError('No challenge questions are available right now.');
    return;
  }

  date.textContent = `Date: ${dayKey}`;

  const stored = readStoredState();
  let state;

  if (stored && stored.dayKey === dayKey && stored.progress) {
    state = stored.progress;
    if (typeof state.total !== 'number' || state.total !== questions.length) {
      state = defaultProgress(questions.length);
    }
  } else {
    state = defaultProgress(questions.length);
  }

  const store = () => {
    writeStoredState({
      dayKey,
      progress: state
    });
  };

  const updateSummary = () => {
    const total = questions.length;
    const percent = total ? Math.round((state.correct / total) * 100) : 0;

    summaryTotal.textContent = String(total);
    summaryCorrect.textContent = String(state.correct);
    summaryIncorrect.textContent = String(state.incorrect);
    summaryPercent.textContent = `${percent}%`;
    summaryScore.textContent = `Score: ${state.correct}/${total} (${percent}%)`;
  };

  const updateHeader = () => {
    progressBar.max = questions.length;
    progressBar.value = Math.min(state.currentIndex, questions.length);
    status.textContent = `${state.correct} correct · ${state.incorrect} incorrect · ${questions.length} total`;
  };

  const getCurrentQuestion = () => questions[state.currentIndex];

  const showCompletion = () => {
    state.completed = true;
    store();
    updateHeader();
    updateSummary();

    document.getElementById('daily-question-panel').classList.add('hidden');
    summaryPanel.classList.remove('hidden');
  };

  const renderCurrentQuestion = () => {
    if (state.completed || state.currentIndex >= questions.length) {
      showCompletion();
      return;
    }

    const current = getCurrentQuestion();
    const humanType = current.questionType === 'grammar' ? 'Grammar/Sentence' : current.questionType;

    position.textContent = `Question ${state.currentIndex + 1} of ${questions.length}`;
    type.textContent = `Type: ${humanType}`;
    prompt.textContent = current.prompt;
    meta.textContent = current.meta;

    answer.textContent = current.answer;
    answer.classList.add('hidden');
    feedback.textContent = '';

    input.value = state.answers[current.id]?.typed ?? '';
    input.disabled = false;

    revealButton.disabled = false;
    correctButton.disabled = true;
    incorrectButton.disabled = true;
    nextButton.disabled = true;

    summaryPanel.classList.add('hidden');
    document.getElementById('daily-question-panel').classList.remove('hidden');
    updateHeader();
  };

  const revealCurrentAnswer = () => {
    const current = getCurrentQuestion();
    const typed = input.value;
    const match = checkTypedAnswer(typed, current.answer);

    answer.classList.remove('hidden');
    feedback.textContent = typed.trim()
      ? match
        ? 'Nice! Your typed answer matches.'
        : 'Keep going. Compare your answer with the correct one.'
      : 'Answer revealed. Mark how you did and move to the next question.';

    state.answers[current.id] = {
      typed,
      revealed: true,
      match,
      marked: null
    };
    store();

    revealButton.disabled = true;
    correctButton.disabled = false;
    incorrectButton.disabled = false;
    nextButton.disabled = true;
  };

  const markCurrent = (isCorrect) => {
    const current = getCurrentQuestion();
    const answerState = state.answers[current.id] ?? {};

    if (answerState.marked === true) {
      state.correct -= 1;
    }
    if (answerState.marked === false) {
      state.incorrect -= 1;
    }

    answerState.marked = isCorrect;
    state.answers[current.id] = answerState;

    if (isCorrect) {
      state.correct += 1;
    } else {
      state.incorrect += 1;
    }

    store();
    updateHeader();

    correctButton.disabled = true;
    incorrectButton.disabled = true;
    nextButton.disabled = false;
  };

  const moveNext = () => {
    state.currentIndex += 1;
    if (state.currentIndex >= questions.length) {
      showCompletion();
      return;
    }

    store();
    renderCurrentQuestion();
  };

  revealButton.addEventListener('click', revealCurrentAnswer);
  correctButton.addEventListener('click', () => markCurrent(true));
  incorrectButton.addEventListener('click', () => markCurrent(false));
  nextButton.addEventListener('click', moveNext);

  restartButton.addEventListener('click', () => {
    state = defaultProgress(questions.length);
    store();
    renderCurrentQuestion();
  });

  renderCurrentQuestion();
}

async function loadDailyChallenge() {
  try {
    const [vocabularyData, phraseData, verbData] = await Promise.all([
      fetchJson('data/content/vocabulary.json'),
      fetchJson('data/content/phrases.json'),
      fetchJson('data/content/verbs.json')
    ]);

    const dayKey = getDateKey();
    const vocabularyCards = normalizeVocabularyCards(vocabularyData, phraseData);
    const verbCards = normalizeVerbCards(verbData);
    const grammarCards = normalizeGrammarStyleCards(phraseData);

    const questions = generateDailyQuestions(vocabularyCards, verbCards, grammarCards, dayKey);
    setupDailyChallenge(questions, dayKey);
  } catch (error) {
    showDailyError('Could not load challenge content. Please refresh and try again.');
    console.error(error);
  }
}

loadDailyChallenge();
