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
  const container = document.getElementById('verb-cards');
  container.innerHTML = '';

  for (const item of items) {
    const button = document.createElement('button');
    button.className = 'card-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');

    button.innerHTML = `
      <div class="prompt">${item.infinitive}</div>
      <div>tense: <strong>${item.tense}</strong></div>
      <div>pronoun: <strong>${item.pronoun}</strong></div>
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

async function loadVerbs() {
  const response = await fetch('data/content/verbs.json');
  const { verbs } = await response.json();

  const conjugationCards = verbs.flatMap((verb) =>
    verb.forms.map((form) => ({
      infinitive: verb.englishInfinitive,
      tense: verb.tense,
      pronoun: form.pronoun,
      hungarian: form.hungarian
    }))
  );

  const verbFilter = document.getElementById('verb-filter');
  const tenseFilter = document.getElementById('tense-filter');
  const count = document.getElementById('verb-count');

  const verbOptions = [...new Set(conjugationCards.map((item) => item.infinitive))].sort();
  const tenseOptions = [...new Set(conjugationCards.map((item) => item.tense))].sort();

  buildOptions(verbFilter, verbOptions, 'All verbs');
  buildOptions(tenseFilter, tenseOptions, 'All tenses');

  const updateView = () => {
    const selectedVerb = verbFilter.value;
    const selectedTense = tenseFilter.value;

    const filteredItems = conjugationCards.filter((item) => {
      const verbMatch = selectedVerb === 'all' || item.infinitive === selectedVerb;
      const tenseMatch = selectedTense === 'all' || item.tense === selectedTense;
      return verbMatch && tenseMatch;
    });

    renderCards(filteredItems);
    count.textContent = `${filteredItems.length} cards shown · ${verbs.length} verb entries`;
  };

  verbFilter.addEventListener('change', updateView);
  tenseFilter.addEventListener('change', updateView);

  updateView();
}

loadVerbs();
