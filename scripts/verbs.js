async function loadVerbs() {
  const res = await fetch('data/verbs.json');
  const verbs = await res.json();

  const cardData = verbs.flatMap((verb) =>
    verb.forms.map((form) => ({
      infinitive: verb.englishInfinitive,
      tense: verb.tense,
      pronoun: form.pronoun,
      hungarian: form.hungarian
    }))
  );

  document.getElementById('verb-count').textContent = `${verbs.length} verbs · ${cardData.length} conjugation cards`;

  const container = document.getElementById('verb-cards');
  for (const item of cardData) {
    const btn = document.createElement('button');
    btn.className = 'card-button';
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');

    btn.innerHTML = `
      <div class="prompt">${item.infinitive}</div>
      <div>tense: <strong>${item.tense}</strong></div>
      <div>pronoun: <strong>${item.pronoun}</strong></div>
      <div class="answer hidden">Hungarian: ${item.hungarian}</div>
    `;

    btn.addEventListener('click', () => {
      const answer = btn.querySelector('.answer');
      const hidden = answer.classList.toggle('hidden');
      btn.setAttribute('aria-expanded', String(!hidden));
    });

    container.append(btn);
  }
}

loadVerbs();
