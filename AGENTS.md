# Project Info

This repository contains a small web project displaying a D3 force-directed graph of authors and their relationships. The main page is **force.html**, which bundles the HTML, CSS and JavaScript and pulls in external libraries from CDNs. Graph data lives in **data.json** and is loaded by the page at runtime.

## Usage

Run the custom webserver from the repository root:

```
python server.py
```

This script extends `http.server` so the page can upload images. The old
`python -m http.server 8007` command will still serve the page read-only.
Then open `http://localhost:8007/force.html` in your browser.

After making changes in the page, copy the contents of the small data view in
the lower-right corner.  It turns yellow when your edits are newer than the
last copied text.

## Status

Development is active. The repository now also contains:

- `server.py` – simple HTTP server that accepts image uploads.
- `images/` – uploaded image files.
- `force.html` – the main page with inline JS and CSS.
- `data.json` – the dataset consumed by the page.
