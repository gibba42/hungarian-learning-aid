function toSentenceCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeAnswer(value) {
  return value.trim().toLocaleLowerCase();
}

function buildSelectOptions(select, options) {
  select.innerHTML = '';
  for (const option of options) {
    const element = document.createElement('option');
    element.value = option.value;
    element.textContent = option.label;
    select.append(element);
  }
}

function showTrainerError(message) {
  const feedback = document.getElementById('trainer-feedback');
  const rows = document.getElementById('trainer-rows');
  feedback.textContent = message;
  rows.innerHTML = `<tr><td colspan="3"><div class="empty-state">${message}</div></td></tr>`;
}

async function loadConjugationTrainer() {
  try {
    const verbs = await window.VerbData.loadVerbDataset();
    if (!verbs.length) {
      showTrainerError('No verb dataset available.');
      return;
    }

    const verbSelect = document.getElementById('trainer-verb');
    const tenseSelect = document.getElementById('trainer-tense');
    const title = document.getElementById('trainer-title');
    const feedback = document.getElementById('trainer-feedback');
    const rows = document.getElementById('trainer-rows');

    const allTenses = window.VerbData.SUPPORTED_TENSES.filter((tense) =>
      verbs.some((verb) => window.VerbData.getConjugationForms(verb, tense).length)
    );

    const verbOptions = verbs
      .map((verb, index) => ({
        value: String(index),
        label: `${verb.englishInfinitive} (${verb.hungarianLemma || '—'})`
      }));

    buildSelectOptions(verbSelect, verbOptions);
    buildSelectOptions(
      tenseSelect,
      allTenses.map((tense) => ({ value: tense, label: toSentenceCase(tense) }))
    );

    const answerState = new Map();
    let resultsState = new Map();
    let revealed = false;

    const getStateKey = () => `${verbSelect.value}:${tenseSelect.value}`;

    const getCurrentForms = () => {
      const selectedVerb = verbs[Number(verbSelect.value)];
      const selectedTense = tenseSelect.value;
      return {
        verb: selectedVerb,
        tense: selectedTense,
        forms: window.VerbData.getConjugationForms(selectedVerb, selectedTense)
      };
    };

    const clearResults = () => {
      resultsState = new Map();
      revealed = false;
      feedback.textContent = 'Fill each row, then check your answers.';
    };

    const renderRows = () => {
      const { verb, tense, forms } = getCurrentForms();
      title.textContent = `${verb.englishInfinitive} · ${verb.hungarianLemma || ''} · ${toSentenceCase(tense)}`;

      const key = getStateKey();
      const answers = answerState.get(key) || {};

      rows.innerHTML = '';

      if (!forms.length) {
        rows.innerHTML = '<tr><td colspan="3">No forms found for this tense.</td></tr>';
        return;
      }

      forms.forEach((form, index) => {
        const row = document.createElement('tr');
        const value = answers[index] || '';
        const result = resultsState.get(index);

        const resultLabel = result
          ? result.correct
            ? '✅ Correct'
            : `❌ Incorrect · Correct: ${form.hungarian}`
          : revealed
            ? `Answer: ${form.hungarian}`
            : '—';

        row.innerHTML = `
          <td>${form.pronoun}</td>
          <td>
            <input class="trainer-input ${result ? (result.correct ? 'is-correct' : 'is-incorrect') : ''}" data-index="${index}" value="${value}" type="text" autocomplete="off" />
          </td>
          <td>${resultLabel}</td>
        `;

        rows.append(row);
      });

      rows.querySelectorAll('.trainer-input').forEach((input) => {
        input.addEventListener('input', (event) => {
          const nextAnswers = answerState.get(key) || {};
          nextAnswers[event.target.dataset.index] = event.target.value;
          answerState.set(key, nextAnswers);
        });
      });
    };

    const checkAnswers = () => {
      const { forms } = getCurrentForms();
      const key = getStateKey();
      const answers = answerState.get(key) || {};
      resultsState = new Map();

      let correct = 0;
      forms.forEach((form, index) => {
        const userAnswer = normalizeAnswer(answers[index] || '');
        const expected = normalizeAnswer(form.hungarian);
        const isCorrect = userAnswer === expected;
        if (isCorrect) {
          correct += 1;
        }
        resultsState.set(index, { correct: isCorrect });
      });

      revealed = false;
      feedback.textContent = `${correct} / ${forms.length} correct`;
      renderRows();
    };

    const revealAnswers = () => {
      resultsState = new Map();
      revealed = true;
      feedback.textContent = 'Answers revealed. Your entries are kept so you can compare.';
      renderRows();
    };

    const pickRandomVerb = () => {
      const randomIndex = Math.floor(Math.random() * verbs.length);
      verbSelect.value = String(randomIndex);
      clearResults();
      renderRows();
    };

    document.getElementById('trainer-check').addEventListener('click', checkAnswers);
    document.getElementById('trainer-reveal').addEventListener('click', revealAnswers);
    document.getElementById('trainer-random').addEventListener('click', pickRandomVerb);

    verbSelect.addEventListener('change', () => {
      clearResults();
      renderRows();
    });

    tenseSelect.addEventListener('change', () => {
      clearResults();
      renderRows();
    });

    clearResults();
    renderRows();
  } catch (error) {
    showTrainerError('Could not load conjugation trainer data.');
    console.error(error);
  }
}

loadConjugationTrainer();
