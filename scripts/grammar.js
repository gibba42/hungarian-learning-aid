async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path} (${response.status})`);
  }
  return response.json();
}

function showGrammarError(message) {
  const root = document.getElementById('grammar-root');
  root.innerHTML = `<section class="panel"><p class="empty-state">${message}</p></section>`;
}

function renderTable(tableData) {
  const section = document.createElement('section');
  section.className = 'table-block';

  const title = document.createElement('h3');
  title.textContent = tableData.title;
  section.append(title);

  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';

  const table = document.createElement('table');
  table.className = 'table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  tableData.columns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = column;
    headRow.append(th);
  });
  thead.append(headRow);

  const tbody = document.createElement('tbody');
  tableData.rows.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  wrap.append(table);
  section.append(wrap);

  return section;
}

function renderExample(example) {
  const card = document.createElement('article');
  card.className = 'example-card';

  const hungarian = document.createElement('p');
  hungarian.innerHTML = `<strong>Hungarian:</strong> ${example.hungarian}`;
  const breakdown = document.createElement('p');
  breakdown.innerHTML = `<strong>Breakdown:</strong> ${example.breakdown}`;
  const english = document.createElement('p');
  english.innerHTML = `<strong>English:</strong> ${example.english}`;

  card.append(hungarian, breakdown, english);

  return card;
}

async function loadGrammarReference() {
  const root = document.getElementById('grammar-root');

  try {
    const grammarReference = await fetchJson('data/content/grammar-reference.json');

    const introPanel = document.createElement('section');
    introPanel.className = 'panel';
    const intro = document.createElement('p');
    intro.className = 'meta';
    intro.textContent = grammarReference.pageIntro;
    introPanel.append(intro);
    root.append(introPanel);

    grammarReference.sections.forEach((section) => {
      const article = document.createElement('article');
      article.className = 'panel grammar-section';

      const title = document.createElement('h2');
      title.textContent = section.title;
      article.append(title);

      if (section.intro) {
        const sectionIntro = document.createElement('p');
        sectionIntro.textContent = section.intro;
        article.append(sectionIntro);
      }

      if (section.points?.length) {
        const list = document.createElement('ul');
        section.points.forEach((point) => {
          const item = document.createElement('li');
          item.textContent = point;
          list.append(item);
        });
        article.append(list);
      }

      if (section.tables?.length) {
        section.tables.forEach((tableData) => {
          article.append(renderTable(tableData));
        });
      }

      if (section.examples?.length) {
        const examplesWrap = document.createElement('div');
        examplesWrap.className = 'examples-grid';
        section.examples.forEach((example) => {
          examplesWrap.append(renderExample(example));
        });
        article.append(examplesWrap);
      }

      root.append(article);
    });
  } catch (error) {
    showGrammarError('Could not load grammar reference content. Please refresh and try again.');
    console.error(error);
  }
}

loadGrammarReference();
