const SUPPORTED_TENSES = ['present', 'past', 'future'];

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  return response.json();
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

function getConjugationForms(verb, tense) {
  if (verb.conjugations && Array.isArray(verb.conjugations[tense])) {
    return verb.conjugations[tense];
  }

  if (verb.tense === tense && Array.isArray(verb.forms)) {
    return verb.forms;
  }

  return [];
}

async function loadVerbDataset() {
  const { verbs } = await fetchJson('data/content/verbs.json');
  return Array.isArray(verbs) ? verbs : [];
}

window.VerbData = {
  SUPPORTED_TENSES,
  loadVerbDataset,
  normalizeVerbToCards,
  getConjugationForms
};
