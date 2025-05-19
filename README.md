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
  and it turns white again.  Saving the clipboard contents back to
  `data.json` is manual to avoid accidental loss.
* **Image support.**  While a node editor popup is open you can paste an image.
  It will be uploaded to the server and shown as the node's icon.
* **Layout options.**  A "tiers" layout is available in addition to the default
  force simulation.

The application aims to remain single‑page and self‑contained.  Styling is kept
minimal and everything is bundled inside `force.html` for easy hosting.

