async function loadGrammar() {
  const res = await fetch('data/grammar.json');
  const data = await res.json();
  const root = document.getElementById('grammar-root');

  data.sections.forEach((section) => {
    const article = document.createElement('article');
    article.className = 'panel';

    article.innerHTML = `
      <h2>${section.title}</h2>
      <ul>${section.points.map((point) => `<li>${point}</li>`).join('')}</ul>
    `;

    root.append(article);
  });

  const tablePanel = document.createElement('section');
  tablePanel.className = 'panel';
  tablePanel.innerHTML = `
    <h2>${data.conjugationTable.title}</h2>
    <p class="meta">${data.conjugationTable.subtitle}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr><th>Pronoun</th><th>Hungarian form</th><th>English meaning</th></tr>
        </thead>
        <tbody>
          ${data.conjugationTable.rows
            .map(
              (row) =>
                `<tr><td>${row.pronoun}</td><td>${row.hungarian}</td><td>${row.english}</td></tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  root.append(tablePanel);
}

loadGrammar();
