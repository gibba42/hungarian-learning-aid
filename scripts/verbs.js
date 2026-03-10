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

  document.getElementById('verb-count').textContent = `${verbs.length} verbs · ${conjugationCards.length} conjugation cards`;

  const container = document.getElementById('verb-cards');
  for (const item of conjugationCards) {
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

loadVerbs();
