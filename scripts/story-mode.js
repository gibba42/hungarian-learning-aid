async function fetchStories() {
  const response = await fetch('data/content/stories.json');
  if (!response.ok) {
    throw new Error(`Failed to load stories (${response.status})`);
  }
  const data = await response.json();
  return data.stories ?? [];
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function renderStoryList(stories, activeId, onSelect) {
  const list = document.getElementById('story-list');
  list.innerHTML = '';

  stories.forEach((story) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'story-list-item';
    button.dataset.storyId = story.id;
    button.setAttribute('aria-pressed', String(story.id === activeId));
    button.innerHTML = `<strong>${story.title}</strong><span>${story.focus}</span>`;
    button.addEventListener('click', () => onSelect(story.id));
    list.append(button);
  });
}

function createFeedback() {
  const feedback = document.createElement('p');
  feedback.className = 'question-feedback hidden';
  feedback.setAttribute('aria-live', 'polite');
  return feedback;
}

function buildQuestion(question) {
  const article = document.createElement('article');
  article.className = 'story-question';

  const title = document.createElement('h4');
  title.textContent = question.prompt;
  article.append(title);

  const feedback = createFeedback();

  if (question.type === 'multiple_choice') {
    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'question-options';

    question.choices.forEach((choice, index) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${question.id}`;
      radio.value = choice;
      if (index === 0) {
        radio.checked = true;
      }

      label.append(radio, document.createTextNode(` ${choice}`));
      optionsWrap.append(label);
    });

    const checkButton = document.createElement('button');
    checkButton.type = 'button';
    checkButton.className = 'button-link';
    checkButton.textContent = 'Check answer';

    checkButton.addEventListener('click', () => {
      const selected = optionsWrap.querySelector('input:checked');
      const isCorrect = selected && selected.value === question.answer;
      feedback.textContent = isCorrect ? 'Correct!' : `Not yet. Correct answer: ${question.answer}`;
      feedback.classList.remove('hidden');
      feedback.classList.toggle('correct', Boolean(isCorrect));
      feedback.classList.toggle('incorrect', !isCorrect);
    });

    article.append(optionsWrap, checkButton, feedback);
    return article;
  }

  if (question.type === 'true_false') {
    const optionsWrap = document.createElement('div');
    optionsWrap.className = 'question-options inline-options';

    [
      { label: 'True', value: true },
      { label: 'False', value: false }
    ].forEach((option) => {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${question.id}`;
      radio.value = String(option.value);
      label.append(radio, document.createTextNode(` ${option.label}`));
      optionsWrap.append(label);
    });

    const checkButton = document.createElement('button');
    checkButton.type = 'button';
    checkButton.className = 'button-link';
    checkButton.textContent = 'Check answer';

    checkButton.addEventListener('click', () => {
      const selected = optionsWrap.querySelector('input:checked');
      if (!selected) {
        feedback.textContent = 'Please select True or False first.';
        feedback.classList.remove('hidden', 'correct');
        feedback.classList.add('incorrect');
        return;
      }

      const selectedValue = selected.value === 'true';
      const isCorrect = selectedValue === question.answer;
      feedback.textContent = isCorrect
        ? 'Correct!'
        : `Not yet. Correct answer: ${question.answer ? 'True' : 'False'}`;
      feedback.classList.remove('hidden');
      feedback.classList.toggle('correct', isCorrect);
      feedback.classList.toggle('incorrect', !isCorrect);
    });

    article.append(optionsWrap, checkButton, feedback);
    return article;
  }

  if (question.type === 'type_answer') {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'story-input';
    input.placeholder = 'Type your answer in Hungarian';

    const checkButton = document.createElement('button');
    checkButton.type = 'button';
    checkButton.className = 'button-link';
    checkButton.textContent = 'Check answer';

    checkButton.addEventListener('click', () => {
      const userAnswer = normalizeText(input.value);
      const validAnswers = [question.answer, ...(question.acceptedAnswers ?? [])].map(normalizeText);
      const isCorrect = validAnswers.includes(userAnswer);

      feedback.textContent = isCorrect ? 'Correct!' : `Try again. Suggested answer: ${question.answer}`;
      feedback.classList.remove('hidden');
      feedback.classList.toggle('correct', isCorrect);
      feedback.classList.toggle('incorrect', !isCorrect);
    });

    article.append(input, checkButton, feedback);
    return article;
  }

  if (question.type === 'match') {
    const list = document.createElement('ul');
    list.className = 'match-list';

    question.pairs.forEach((pair) => {
      const item = document.createElement('li');
      item.textContent = `${pair.left} → ${pair.right}`;
      list.append(item);
    });

    article.append(list);
    return article;
  }

  const unsupported = document.createElement('p');
  unsupported.className = 'meta';
  unsupported.textContent = 'Question type not supported yet.';
  article.append(unsupported);
  return article;
}

function renderStory(story) {
  const title = document.getElementById('story-title');
  const focus = document.getElementById('story-focus');
  const hungarianText = document.getElementById('story-hungarian-text');
  const englishText = document.getElementById('story-english-text');
  const questionsContainer = document.getElementById('story-questions');
  const translationContainer = document.getElementById('translation-container');

  title.textContent = story.title;
  focus.textContent = story.focus;

  hungarianText.innerHTML = '';
  story.hungarian.forEach((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    hungarianText.append(paragraph);
  });

  englishText.innerHTML = '';
  story.english.forEach((line) => {
    const paragraph = document.createElement('p');
    paragraph.textContent = line;
    englishText.append(paragraph);
  });

  translationContainer.open = false;

  questionsContainer.innerHTML = '';
  story.questions.forEach((question, index) => {
    const element = buildQuestion(question);
    const number = document.createElement('p');
    number.className = 'meta';
    number.textContent = `Question ${index + 1}`;
    element.prepend(number);
    questionsContainer.append(element);
  });
}

function showStoryError() {
  const storyList = document.getElementById('story-list');
  const storyPanel = document.getElementById('story-panel');

  storyList.innerHTML = '<p class="empty-state">Stories could not be loaded. Please refresh and try again.</p>';
  storyPanel.innerHTML = '<div class="empty-state">Story Mode is unavailable right now.</div>';
}

async function initStoryMode() {
  try {
    const stories = await fetchStories();
    if (!stories.length) {
      showStoryError();
      return;
    }

    let activeStoryId = stories[0].id;

    const updateActiveStory = (storyId) => {
      activeStoryId = storyId;
      const selectedStory = stories.find((story) => story.id === activeStoryId) ?? stories[0];
      renderStoryList(stories, selectedStory.id, updateActiveStory);
      renderStory(selectedStory);
    };

    updateActiveStory(activeStoryId);
  } catch (error) {
    console.error(error);
    showStoryError();
  }
}

initStoryMode();
