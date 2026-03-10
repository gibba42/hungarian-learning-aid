# Hungarian Learning Aid (MVP)

A lightweight static web app for beginner Hungarian study from English.

## Stack
- HTML + CSS + vanilla JavaScript
- Local JSON content files (easy to expand)
- Any static server (example below uses Python)

## Run locally
From this folder:

```bash
python3 -m http.server 8000
```

Then open:

- http://localhost:8000/index.html

## Pages
- Home
- Vocabulary (click-to-reveal flashcards)
- Verbs (click-to-reveal conjugation cards)
- Grammar Reference (explanations + conjugation table)

## Content structure
All learning content lives in `data/content/`:
- `vocabulary.json` for words
- `phrases.json` for short expressions
- `verbs.json` for conjugation practice
- `grammar-reference.json` for grammar notes/table

See `data/content/README.md` for quick editing notes.
