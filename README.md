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



# Interactive Graph Network Editor

A sophisticated web-based tool for creating, editing, and visualizing networks of relationships between people (authors, thinkers, etc.) across time. Built with D3.js force simulation for dynamic, interactive graph visualization.

## 🎯 Core Philosophy & Design Principles

### User Experience Priorities
1. **Visual Clarity**: Black edges/text, rich green highlights, clean typography
2. **Intuitive Interaction**: Click anything that looks clickable (names, edges, arrows)
3. **Contextual Controls**: Year filtering, focus mode, search highlighting
4. **Responsive Feedback**: Hover effects, smooth transitions, immediate visual responses
5. **Minimal UI Friction**: Placeholders over labels, X buttons over Cancel, auto-close popups

### Technical Architecture
- **Frontend Only**: Pure HTML/CSS/JavaScript - no backend required
- **Local Storage**: All data persists in browser localStorage
- **Force Simulation**: D3.js physics for natural node positioning
- **Component Separation**: Distinct files for structure, styling, and logic

## 🚀 Key Features

### Graph Interaction
- **Drag nodes** to reposition
- **Click nodes/names** to edit author details
- **Click edges/edge-labels** to edit relationships
- **Search** with rich green highlighting and glow effects
- **Focus mode** with connection depth control (1-5 degrees)
- **Year filtering** with dual-handle slider and 50-year tick marks

### Data Management
- **Live editing** with immediate visual updates
- **Auto-save** to localStorage with status indicators
- **Import/Export** JSON data for sharing/backup
- **Image support** via paste-to-add functionality
- **Relationship presets** (influenced by, mentored, etc.)

### Visual Design
- **Clean modern UI** with CSS custom properties
- **Bootstrap-inspired buttons** with gradients and shadows
- **Contextual colors**: Black for edges, green for focus/search, blue for primary actions
- **Responsive layout** with fixed top controls and right sidebar
- **Professional typography** with proper hierarchy

## 📁 File Structure

```
├── force.html          # Main HTML structure & layout
├── styles.css          # Complete styling system
├── graph-editor.js     # Core graph logic & interactions
├── nouislider.min.js   # Year range slider component
├── nouislider.min.css  # Slider styling
└── README.md           # This documentation
```

## 🎨 Design System

### Colors (CSS Custom Properties)
```css
--primary-color: #2563eb      /* Blue for primary actions */
--success-color: #10b981      /* Green for focus mode */
--warning-color: #f59e0b      /* Amber for search highlights */
--danger-color: #ef4444       /* Red for delete actions */
--text-primary: #1e293b       /* Dark gray for main text */
--text-secondary: #64748b     /* Medium gray for labels */
```

### Interactive Elements
- **Hover effects** on all clickable elements
- **Drop shadows** for search highlights
- **Gradient buttons** with subtle animations
- **Smooth transitions** (0.2s ease) throughout

## 🔧 Key Implementation Details

### Graph Rendering
- Uses D3.js `forceSimulation()` with charge, center, and link forces
- Nodes sized dynamically based on content length
- Arrow markers with proper positioning (`refX: 28`)
- Edge labels positioned at midpoint with collision detection

### State Management
- Global objects: `nodeById`, `linkById`, `focusedNodeId`
- Event-driven updates with `updateGraph()` and `updateVisualization()`
- Debounced localStorage saves for performance

### Popup System
- **Single popup rule**: Close others when opening new
- **Click-away dismiss**: Event listeners on document
- **X button positioning**: Absolute positioned top-right
- **Form styling**: Consistent with main UI theme

### Year Filtering
- **NoUISlider** dual-handle range control
- **50-year intervals** for tick marks
- **Dynamic range** based on data min/max
- **Real-time filtering** with smooth transitions

## 🛠️ Development Guidelines

### Code Style Preferences
- **Modern JavaScript**: ES6+ features, const/let over var
- **Descriptive naming**: `openNodePopup()` not `openPopup()`
- **Event delegation**: Efficient DOM event handling
- **Modular functions**: Single responsibility principle
- **CSS organization**: Logical grouping, consistent naming

### UI/UX Patterns
- **Placeholders over labels**: Cleaner forms, less visual noise
- **Progressive disclosure**: Hide complexity until needed
- **Consistent interactions**: Same action patterns throughout
- **Visual hierarchy**: Size, color, and spacing for importance
- **Error prevention**: Validation and helpful defaults

### Performance Considerations
- **Debounced operations**: Search, save, filter updates
- **Efficient DOM updates**: Minimize redraws, batch changes
- **Event cleanup**: Remove listeners to prevent memory leaks
- **Selective rendering**: Only update changed elements

## 🎯 Feature Priorities & Roadmap

### High Priority Improvements
1. **Arrow positioning fixes** for focus mode connections=1
2. **Enhanced search** with fuzzy matching and history
3. **Batch operations** for multiple node/edge editing
4. **Export formats** (CSV, GraphML, Cytoscape)
5. **Undo/redo system** for complex editing sessions

### UI Polish
- **Keyboard shortcuts** for common operations
- **Drag-to-create** edges between nodes
- **Mini-map** for large graph navigation
- **Zoom controls** with fit-to-screen option
- **Grid snap** for precise positioning

### Data Features
- **Relationship types** with visual styling
- **Node categories** with color coding
- **Timeline visualization** mode
- **Statistical analysis** (centrality, clustering)
- **Collaborative editing** with conflict resolution

## 🚨 Known Issues & Solutions

### Current Bugs
1. **Arrow positioning** when connections=1 in focus mode
   - *Fix*: Adjust `refX` value based on connection depth
2. **Popup z-index conflicts** with other UI elements
   - *Fix*: Consistent z-index hierarchy (1001 for popups)
3. **Year input validation** allows invalid dates
   - *Fix*: Add regex validation and input constraints

### Browser Compatibility
- **Modern browsers only**: Uses ES6+, CSS Grid, Custom Properties
- **LocalStorage dependency**: Graceful fallback needed
- **Touch device support**: Mobile interaction improvements needed

## 📊 Data Format

### Node Structure
```javascript
{
  id: "unique-id",
  name: "Author Name",
  birth_year: 1850,
  images: ["data:image/jpeg;base64,..."]
}
```

### Edge Structure
```javascript
{
  source: "node-id-1",
  target: "node-id-2",
  label: "influenced by",
  year: 1875  // Optional relationship timing
}
```

## 🤝 Contributing Guidelines

### Making Changes
1. **Test thoroughly**: All interactions, edge cases
2. **Maintain consistency**: Follow established patterns
3. **Document decisions**: Update this README
4. **Progressive enhancement**: Don't break existing functionality

### Code Review Checklist
- [ ] Follows established naming conventions
- [ ] Maintains visual design consistency
- [ ] Handles edge cases gracefully
- [ ] Updates documentation as needed
- [ ] Tests in multiple browsers
- [ ] Preserves accessibility features

---

*This project emphasizes thoughtful interaction design, clean code architecture, and extensible data structures for long-term maintainability and user satisfaction.*