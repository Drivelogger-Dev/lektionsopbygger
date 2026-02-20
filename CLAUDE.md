# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (requires Node 22+, use `nvm use 22`)
npm run build     # Production build to /dist
npm run lint      # ESLint on .js/.jsx files
npm run preview   # Preview production build
```

## Architecture

Single-page React app for Danish driving education lesson planning (BEK 1150, category B). All app logic lives in `src/Lektionsopbygger.jsx` (~2500 lines, monolithic component).

### Data Model

**MODULES_RAW** → 5 driving education modules, each with sections containing goals. `buildItems()` flattens these into draggable items — "both" type sections split into separate `-T` (theory) and `-P` (practice) items.

**Item UIDs** follow the pattern `{moduleId}-{sectionId}-{T|P}`. Repeatable items (currently only 7.22) get copy suffixes: `5-7.22-P#1`, `#2`, etc. The `findItem(uid)` helper resolves both originals and copies.

**Blocks** are lesson sessions (theory/practice/selfStudy) containing item UIDs. Lesson counts are distributed proportionally across modules when a block has mixed-module items (`getModuleLessonCounts`).

### Key Functions

- `validateBlocks()` — Enforces all regulatory rules (lesson limits, ordering, prerequisites, gate system). Changes here require testing all 7 rule categories.
- `autoAdjustBlockLessons()` — Auto-scales block lesson count when all module items are placed.
- `getModuleLessonCounts()` — Proportional lesson distribution per module from blocks.

### Lesson Limits

- Theory: max 4/day
- Practice: max 3/day (except KTA: max 4/day)
- Self-study: max 7 total, only allowed for sections 1, 3, 6(1), 6(2), 9, 10(2)

### Validation Rule Categories

1. Lesson count limits per block type
2. Self-study section restrictions
3. Theory-before-practice ordering for "both" sections
4. Module 1 prerequisite items (0, 10.1.1) must come first
5. Module 3 gate system: 7.1–7.8 practice before 7.4/7.10–7.15
6. Sequential module ordering (M1→M2→M3→M4→M5)
7. "mustBeFirst" items auto-sorted to block top

## Conventions

- All UI text is **Danish**
- **Inline styles only** (no CSS modules), dark theme
- Color-coded modules: blue(M1), green(M2), orange(M3), red(M4), purple(M5)
- Native HTML5 drag & drop with multi-select (Ctrl/Cmd+click)
- localStorage persistence under key `lektionsopbygger_plans`
- PDF export via dynamically loaded jsPDF + autoTable from CDN

## Git

- **Never** include `Co-Authored-By` lines in commit messages
- `cm` = shorthand for "commit"
- Commit messages must have a clear descriptive title AND a thorough body describing: what changed, the purpose, and important technical notes
