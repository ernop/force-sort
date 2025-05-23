# Force-Sort Graph Editor

This project is a minimal editor for an author relationship graph.  The page
`force.html` displays a D3 force‑directed diagram and lets you add or edit
nodes and edges directly in the browser.  Uploaded images are stored in the
`images/` folder via `server.py` and referenced by the graph data file
`data.json`.

## Running

Start the lightweight web server from the repository root:

```bash
python server.py
```

Then open [http://localhost:8007/force.html](http://localhost:8007/force.html)
 in your browser.  The script allows image uploads, so using `python -m
http.server` will only provide read‑only access.

## Product Goals

* **Simple editing.**  Nodes and edges can be created, deleted and renamed
  without leaving the page.
* **Copy‑to‑save workflow.**  All changes are reflected in the data view in the
  bottom‑right corner.  The text area turns yellow whenever the data differs
  from what you've copied.  Click the area to copy the JSON to your clipboard
  and it turns white again.  The page now also sends the data to
  `server.py` each time it changes so it is written to `data.json`
  automatically.  Previous versions are stored in the `backups/` folder.
* **Image support.**  Each node can hold multiple images.  Paste or upload
  pictures while the editor popup is open, rearrange or remove them, and
  identical uploads are detected automatically. Image paths are stored in an
  `images` array on each node.
The popup now reliably resets when switching between nodes so you never
  see another person's pictures by mistake.
* **Layout options.**  A "tiers" layout is available in addition to the default
  force simulation. A new "force+direction" mode keeps edges mostly pointing
  downward while still using forces.
* **Filter persistence.**  Active focus or year filters stay applied while you
  edit nodes or edges. The selected filters only change when you interact with
  the filter controls themselves.

## Data Format

The `data.json` file contains two arrays: `nodes` and `links`. Each node holds
an `id`, a `name`, an optional `birth_year`, and an `images` array. The
`images` array may be empty or contain multiple file paths. Links store `id1`,
`id2` and a `label` describing the connection.


The application aims to remain single‑page and self‑contained.  Styling is kept
minimal and everything is bundled inside `force.html` for easy hosting.

## Line Endings

All text files use **CRLF** (`\r\n`) line terminators. The repository includes
`.gitattributes` and `.editorconfig` files so Git and common editors enforce this
automatically. No additional setup is required.

