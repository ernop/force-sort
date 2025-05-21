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
- Node editor popup now clears old images when switching between people so
  the interface always shows the correct pictures.

## Repository Overview
This section summarizes the purpose of each file and folder in the project.

- `README.md` – high level overview and instructions.
- `AGENTS.md` – contributor notes (this file).
- `server.py` – python server that saves `data.json` and accepts image uploads.
- `force.html` – browser-based graph editor with inline CSS and JS.
- `data.json` – graph dataset of nodes and links.
- `images/` – uploaded pictures referenced from nodes, ignored by Git.
- `backups/` – automatic copies of `data.json` made by the server.
- `.gitignore` – excludes transient folders from version control.

### `data.json` format
The dataset is a single JSON object with two arrays:

```
{
  "nodes": [ ... ],
  "links": [ ... ]
}
```

Each **node** has at least:

- `id` – unique integer.
- `name` – author name.

Optional fields are:

- `birth_year` – year of birth as a string.
- `images` – array of picture paths. The array may be empty.

Each **link** describes a relationship:

- `id1` – source node id.
- `id2` – target node id.
- `label` – text describing the connection.

Example snippet:

```
{
  "nodes": [
    {
      "id": 1,
      "name": "Example Author",
      "birth_year": "1900",
      "images": ["images/1.png"]
    }
  ],
  "links": [
    { "id1": 1, "id2": 2, "label": "influenced" }
  ]
}
```

## Contribution Guidelines

To avoid churn from inconsistent line endings, use **CRLF** (`\r\n`) line
terminators for all files in this repository. Configure your editor to save
files with Windows line endings and do not convert them to plain `\r` or
other styles.
