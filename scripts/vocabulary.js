async function fetchJson(path) {
  const response = await fetch(path);
  return response.json();
}

async function loadVocabularyCards() {
  const vocabularyData = await fetchJson('data/content/vocabulary.json');
  const phraseData = await fetchJson('data/content/phrases.json');

  const words = vocabularyData.words ?? [];
  const phrases = phraseData.phrases ?? [];
  const flashcardItems = [
    ...words.map((item) => ({ ...item, type: 'word' })),
    ...phrases.map((item) => ({ ...item, type: 'phrase' }))
  ];

  document.getElementById('vocab-count').textContent = `${words.length} words · ${phrases.length} short phrases`;

  const container = document.getElementById('vocab-cards');
  for (const item of flashcardItems) {
    const button = document.createElement('button');
    button.className = 'card-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');

    button.innerHTML = `
      <div class="prompt">${item.hungarian}</div>
      <div class="hint">${item.type === 'phrase' ? 'Short phrase' : 'Vocabulary'} · click to reveal</div>
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

loadVocabularyCards();
