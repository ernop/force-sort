# Project Info

This repository contains a small web project displaying a D3 force-directed graph of authors and their relationships. The main page is **force.html**, which bundles the HTML, CSS and JavaScript and pulls in external libraries from CDNs. Graph data lives in **data.json** and is loaded by the page at runtime.

## Usage

Run a simple webserver from the repository root:

```
python -m http.server 8007
```

Then open `http://localhost:8007/force.html` in your browser.

## Status

Development is active. At the moment the UI is broken and the graph layout looks bad due to a prior commit. Fixing this is the current focus.

Only two files exist:

- `force.html` – the main page with inline JS and CSS.
- `data.json` – the dataset consumed by the page.

