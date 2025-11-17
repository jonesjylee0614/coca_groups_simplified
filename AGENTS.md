# Repository Guidelines

## Project Structure & Module Organization
This repository ships a static site served directly from the root. `index.html` is the dashboard, `viewer.html` renders a single learning group, `app.js` covers book switching plus Markdown parsing, and `styles.css` holds layout tokens. Reading data stays in `reading_materials/` (ordered 1‑100) or `reading_materials_shuffled/` (200 shuffled groups referenced by `BOOK_CONFIGS`). Prompt inputs and seeds belong in `prompts_for_ai/`, `seed_files/`, and `seed_shuffled/`, while helper scripts at the root emit new `groupNN_reading.md` files beside the existing ones—run them from the repo root so their relative paths resolve.

## Build, Test, and Development Commands
- `python start_server.py` — start a local HTTP server on port 8000 and auto-open the browser for manual QA.
- `python test_vocab.py` — verify every `reading_materials/group*_reading.md` still exposes the “重点词汇注释” block and log the word count.
- `python fix_bold_formatting.py` — scrub non-vocabulary bold text across all lessons after manual edits.
- `python shuffle_and_split_words.py` / `python generate_missing_readings.py` — rebuild or backfill lessons; adjust the constants inside each script before running.

## Coding Style & Naming Conventions
JavaScript uses 4-space indent, `const`/`let`, camelCase functions, and SCREAMING_SNAKE_CASE configs (see `STORAGE_KEYS`). Keep template literals for file paths so `BOOK_CONFIGS` remains the single source of truth, and favor descriptive class or `data-*` names for DOM hooks. Python utilities follow PEP 8 with snake_case helpers and explicit UTF-8 reads/writes. Markdown lessons retain the canonical heading order (`# Title`, `## 📖 Reading Passage`, `## 📝 重点词汇注释`, etc.) and the `groupNN_reading.md` naming pattern (zero-pad when ≥100).

## Testing Guidelines
Extend `test_vocab.py` instead of duplicating regex helpers; new suites should be named `test_<feature>.py` at the repo root so we can later run `python -m pytest`. After UI work, run `python start_server.py`, flip between Book 1 and Book 2, and watch the browser console for fetch or LocalStorage errors. Parsing utilities should keep full coverage, and any fixture Markdown snippets can live in a lightweight `tests/fixtures` folder if needed.

## Commit & Pull Request Guidelines
History favors imperative, scope-first subjects (e.g., “Update reading materials: …”). Keep subjects under 72 characters, explain the motivation in the body, and mention regenerated assets. Every PR should list affected groups or scripts, describe validation (`python test_vocab.py`, manual browser run), attach screenshots when HTML/CSS shifts, and link issues or design docs. Call out content migrations so reviewers know large diffs are expected.
