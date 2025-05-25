# Force-Sort Graph Editor

This project is a minimal editor for an author relationship graph. The page `force.html` displays a D3 force‑directed diagram and lets you add or edit nodes and edges directly in the browser. Uploaded images are stored in the `images/` folder via `server.py` and referenced by the graph data file `data.json`.

## Running

Start the lightweight web server from the repository root:

```bash
python server.py
```

Then open [http://localhost:8007/force.html](http://localhost:8007/force.html) in your browser. The script allows image uploads, so using `python -m http.server` will only provide read‑only access.

## Product Goals

* **Simple editing.** Nodes and edges can be created, deleted and renamed without leaving the page.
* **Copy‑to‑save workflow.** All changes are reflected in the data view in the bottom‑right corner. The text area turns yellow whenever the data differs from what you've copied. Click the area to copy the JSON to your clipboard and it turns white again. The page now also sends the data to `server.py` each time it changes so it is written to `data.json` automatically. Previous versions are stored in the `backups/` folder.
* **Image support.** Each node can hold multiple images. Paste or upload pictures while the editor popup is open, rearrange or remove them, and identical uploads are detected automatically. Image paths are stored in an `images` array on each node. The popup now reliably resets when switching between nodes so you never see another person's pictures by mistake.
* **Layout options.** A "tiers" layout is available in addition to the default force simulation. A new "force+direction" mode keeps edges mostly pointing downward while still using forces.
* **Filter persistence.** Active focus or year filters stay applied while you edit nodes or edges. The selected filters only change when you interact with the filter controls themselves.
* **Physics-based decluttering.** The force simulation uses adaptive link distances based on node degree, radial forces in focus mode, and proper momentum clearing when dragging nodes.
* **Smart label handling.** Long relationship labels are truncated with ellipsis and expand smoothly on hover with a subtle background for readability.

## Data Format

The `data.json` file contains two arrays: `nodes` and `links`. Each node holds an `id`, a `name`, an optional `birth_year`, and an `images` array. The `images` array may be empty or contain multiple file paths. Links store `id1`, `id2` and a `label` describing the connection.

The application aims to remain single‑page and self‑contained. Styling is kept minimal and everything is bundled inside `force.html` for easy hosting.

## Line Endings

All text files use **CRLF** (`\r\n`) line terminators. The repository includes `.gitattributes` and `.editorconfig` files so Git and common editors enforce this automatically. No additional setup is required.

# Interactive Graph Network Editor

A sophisticated web-based tool for creating, editing, and visualizing networks of relationships between people (authors, thinkers, etc.) across time. Built with D3.js force simulation for dynamic, interactive graph visualization.

## 🎯 Core Philosophy & Design Principles

### User Experience Priorities
1. **Visual Clarity**: Black edges/text, rich green highlights, clean typography
2. **Intuitive Interaction**: Click anything that looks clickable (names, edges, arrows)
3. **Contextual Controls**: Year filtering, focus mode, search highlighting
4. **Responsive Feedback**: Hover effects, smooth transitions, immediate visual responses
5. **Minimal UI Friction**: Placeholders over labels, X buttons over Cancel, auto-close popups
6. **Data Integrity**: Never hide or lose information - use physics to organize better layouts

### Technical Architecture
- **Frontend Only**: Pure HTML/CSS/JavaScript - no backend required
- **Server Support**: Python server for image uploads and automatic saves
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
- **Smart physics** with adaptive link distances and radial organization

### Data Management
- **Live editing** with immediate visual updates
- **Auto-save** to server with backup versioning
- **Import/Export** JSON data for sharing/backup
- **Image support** via paste-to-add functionality
- **Relationship presets** with Select2 autocomplete
- **Proper momentum handling** when dragging nodes

### Visual Design
- **Clean modern UI** with CSS custom properties
- **Bootstrap-inspired buttons** with gradients and shadows
- **Contextual colors**: Black for edges, green for focus/search, blue for primary actions
- **Responsive layout** with fixed top controls and right sidebar
- **Professional typography** with proper hierarchy
- **Truncated labels** that expand on hover for long relationships

## 📁 File Structure

```
├── force.html          # Main HTML structure & layout
├── styles.css          # Complete styling system
├── graph-editor.js     # Core graph logic & interactions
├── server.py           # Python server for uploads/saves
├── data.json           # Graph data storage
├── images/             # Uploaded images directory
├── backups/            # Automatic backup versions
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
- **Black strokes** for nodes and edges
- **Truncated labels** with hover expansion

## 🔧 Key Implementation Details

### Graph Rendering
- Uses D3.js `forceSimulation()` with charge, center, link, and collision forces
- Nodes sized dynamically based on content length
- Arrow markers with proper positioning (`refX: 28`)
- Edge labels positioned at midpoint with collision detection
- Adaptive link distances based on node degree
- Radial force layout in focus mode

### State Management
- Global objects: `nodeById`, `linkById`, `focusedNodeId`
- Event-driven updates with `updateGraph()` and `updateVisualization()`
- Debounced localStorage saves for performance
- Proper momentum clearing on drag release

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

### Physics Improvements
- **Adaptive link distance**: Nodes with more connections get more space
- **Radial forces**: Focus mode arranges connected nodes in clean patterns
- **Velocity decay**: 0.4 friction for natural movement
- **Alpha decay**: 0.005 for better settling time
- **Collision detection**: Variable radius based on node degree

## 🛠️ Development Guidelines

### Code Style Preferences
- **Modern JavaScript**: ES6+ features, const/let over var
- **Descriptive naming**: `openNodePopup()` not `openPopup()`
- **Event delegation**: Efficient DOM event handling
- **Modular functions**: Single responsibility principle
- **CSS organization**: Logical grouping, consistent naming
- **Targeted diffs**: Prefer small, specific changes over full rewrites

### UI/UX Patterns
- **Placeholders over labels**: Cleaner forms, less visual noise
- **Progressive disclosure**: Hide complexity until needed
- **Consistent interactions**: Same action patterns throughout
- **Visual hierarchy**: Size, color, and spacing for importance
- **Error prevention**: Validation and helpful defaults
- **Physics over hiding**: Use forces to declutter, don't remove data

### Performance Considerations
- **Debounced operations**: Search, save, filter updates
- **Efficient DOM updates**: Minimize redraws, batch changes
- **Event cleanup**: Remove listeners to prevent memory leaks
- **Selective rendering**: Only update changed elements
- **Smart label truncation**: Show full text only on hover

## 🎯 Feature Priorities & Roadmap

### Recently Implemented
- ✅ Black node strokes for consistency
- ✅ Fixed relationship controls layout (2-line wrap)
- ✅ Proper error handling (no fake data fallback)
- ✅ Select2 for relationship type with autocomplete
- ✅ Swap source/target button functionality
- ✅ Momentum clearing on node release
- ✅ Numerical display for charge/link sliders
- ✅ Label truncation with hover expansion

### High Priority Improvements
1. **Smart curved edges** that actually avoid overlaps
2. **Label collision detection** with automatic repositioning
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
1. **Label overlap** in dense graphs
   - *Solution in progress*: Force-based label repulsion
2. **Performance with 500+ nodes**
   - *Fix*: Implement viewport culling
3. **Mobile touch support** needs improvement
   - *Fix*: Add proper touch event handlers

### Browser Compatibility
- **Modern browsers only**: Uses ES6+, CSS Grid, Custom Properties
- **Server dependency**: Requires Python server for full functionality
- **Touch device support**: Basic functionality, needs enhancement

## 📊 Data Format

### Node Structure
```javascript
{
  id: "unique-id",
  name: "Author Name",
  birth_year: 1850,
  images: ["images/1_0.png", "images/1_1.png"]
}
```

### Edge Structure
```javascript
{
  id1: "source-node-id",
  id2: "target-node-id",
  label: "influenced by"
}
```

## 🤝 Contributing Guidelines

### Making Changes
1. **Test thoroughly**: All interactions, edge cases
2. **Maintain consistency**: Follow established patterns
3. **Document decisions**: Update this README
4. **Progressive enhancement**: Don't break existing functionality
5. **Use targeted diffs**: Show exact before/after code blocks

### Code Review Checklist
- [ ] Follows established naming conventions
- [ ] Maintains visual design consistency
- [ ] Handles edge cases gracefully
- [ ] Updates documentation as needed
- [ ] Tests in multiple browsers
- [ ] Preserves accessibility features
- [ ] Uses physics to solve layout issues
- [ ] Provides clear diff instructions

---

*This project emphasizes thoughtful interaction design, clean code architecture, and physics-based solutions for maintaining data visibility while reducing visual clutter.*