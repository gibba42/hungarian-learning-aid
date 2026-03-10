async function loadVocabulary() {
  const res = await fetch('data/vocabulary.json');
  const items = await res.json();

  const words = items.filter((item) => item.type === 'word').length;
  const phrases = items.filter((item) => item.type === 'phrase').length;
  document.getElementById('vocab-count').textContent = `${words} words · ${phrases} short phrases`;

  const container = document.getElementById('vocab-cards');
  for (const item of items) {
    const btn = document.createElement('button');
    btn.className = 'card-button';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');

    btn.innerHTML = `
      <div class="prompt">${item.hungarian}</div>
      <div class="hint">${item.type === 'phrase' ? 'Short phrase' : 'Vocabulary'} · click to reveal</div>
      <div class="answer hidden">${item.english}</div>
    `;

    btn.addEventListener('click', () => {
      const answer = btn.querySelector('.answer');
      const hidden = answer.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!hidden));
    });

    container.append(btn);
  }
}

loadVocabulary();
