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

  card.innerHTML = `
    <p><strong>Hungarian:</strong> ${example.hungarian}</p>
    <p><strong>Breakdown:</strong> ${example.breakdown}</p>
    <p><strong>English:</strong> ${example.english}</p>
  `;

  return card;
}

async function loadGrammarReference() {
  const response = await fetch('data/content/grammar-reference.json');
  const grammarReference = await response.json();
  const root = document.getElementById('grammar-root');

  const introPanel = document.createElement('section');
  introPanel.className = 'panel';
  introPanel.innerHTML = `<p class="meta">${grammarReference.pageIntro}</p>`;
  root.append(introPanel);

  grammarReference.sections.forEach((section) => {
    const article = document.createElement('article');
    article.className = 'panel grammar-section';

    const title = document.createElement('h2');
    title.textContent = section.title;
    article.append(title);

    if (section.intro) {
      const intro = document.createElement('p');
      intro.textContent = section.intro;
      article.append(intro);
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
}

loadGrammarReference();
