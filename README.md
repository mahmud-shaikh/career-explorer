# Career Explorer

A completely offline career guidance web application built from NCERT "Exploring Career Cards" PDFs.

## Project Structure

- `index.html` — Application shell and page structure
- `style.css` — Responsive visual design and dark mode
- `script.js` — Search, filters, navigation, bookmarks, compare, and offline behavior
- `careers.json` — Structured career dataset with 503 careers
- `assets/` — Icons and images for UI polish

## Features

- Advanced search with fuzzy matching, autocomplete, keyboard navigation, and instant suggestions
- Browse careers by stream and sort them by name or salary
- Career detail pages with hero stats, education pathway, scholarships, work opportunities, and related careers
- Bookmark careers using local storage
- Compare two careers side-by-side
- Dark mode with preference retention
- Responsive design for desktop, tablet, and mobile

## How to run

1. Open `CareerExplorer/index.html` in a browser.
2. The app works entirely offline; no server or build process is required.

## Search Behavior

- Type partial words or career names in the main search bar
- Keyboard support: Arrow Up/Arrow Down/Enter/Escape
- Suggestions are prioritized by match relevance
- Search matches career name, stream, and introduction

## Bookmarks

- Click the bookmark button on career cards or career details
- Bookmarks persist in local storage
- View bookmarked careers in the `Bookmarks` page

## Adding new careers

1. Add the new career object to `careers.json`
2. Include required fields like `id`, `name`, `stream`, `introduction`, `educational_pathway`, `course_duration`, `course_fees`, `scholarships`, `income`, `where_to_work`, `where_to_study`, `growth`, `example`, `related_careers`, `skills`, and `traits`
3. Refresh `index.html`

## Notes

- The app is designed to be opened directly in browser without `npm` or any backend.
- If `careers.json` is large, use a local simple HTTP server to avoid browser file loading restrictions.
