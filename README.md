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
- **Ctrl+Click nodes** to create edges between them
- **Search** with rich green highlighting and glow effects
- **Focus mode** with connection depth control (1-5 degrees)
- **Year filtering** with dual-handle slider and 50-year tick marks
- **Smart physics** with adaptive link distances and radial organization
- **Two layout modes**: Force-directed and Chronological Tiers

### Data Management
- **Live editing** with immediate visual updates
- **Auto-save** to server with backup versioning
- **Import/Export** JSON data for sharing/backup
- **Image support** via paste-to-add functionality
- **Relationship presets** with Select2 autocomplete
- **Proper momentum handling** when dragging nodes
- **Duplicate detection and cleanup** for nodes and edges
- **SFSFSS reading history** tracking support

### Visual Design
- **Clean modern UI** with CSS custom properties
- **Bootstrap-inspired buttons** with gradients and shadows
- **Contextual colors**: Black for edges, green for focus/search, blue for primary actions
- **Responsive layout** with fixed top controls and right sidebar
- **Professional typography** with proper hierarchy
- **Truncated labels** that expand on hover for long relationships

## 📁 File Structure

```
├── force.html              # Main HTML structure & layout
├── styles.css              # Complete styling system
├── graph-editor.js         # Core graph logic & interactions
├── duplicate-cleanup.js    # Data cleanup utilities
├── server.py               # Python server for uploads/saves
├── data.json               # Graph data storage
├── stories.json            # SFSFSS reading history (optional)
├── update_reading_data.py  # Script to sync reading data
├── images/                 # Uploaded images directory
├── backups/                # Automatic backup versions
├── README.md               # This documentation
└── AGENTS.md               # AI development guide
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

## 🔧 Running the Application

### Basic Usage
Start the lightweight web server from the repository root:

```bash
python server.py
```

Then open [http://localhost:8007/force.html](http://localhost:8007/force.html) in your browser. The script allows image uploads, so using `python -m http.server` will only provide read-only access.

### SFSFSS Reading Data Integration (Optional)
If you're tracking reading history from the SF Short Story Society:

1. Place your `stories.json` file in the project root
2. Run the update script:
   ```bash
   python update_reading_data.py
   ```
3. This will update `data.json` with:
   - Missing authors from your reading history
   - `sfsfss_has_read` boolean for each author
   - `story_links` array containing URLs to stories

## 📊 Data Format

### data.json Structure
The dataset is a single JSON object with two arrays:

```json
{
  "nodes": [ ... ],
  "links": [ ... ]
}
```

#### Node Structure
Each **node** represents an author with the following fields:

```javascript
{
  "id": 1,                    // Required: unique integer
  "name": "Author Name",      // Required: author's name
  "birth_year": "1850",       // Optional: year as string
  "images": [                 // Optional: array of image paths
    "images/1_0.png",
    "images/1_1.png"
  ],
  "sfsfss_has_read": true,    // Optional: reading status boolean
  "story_links": [            // Optional: array of story URLs
    "https://example.com/story1.html",
    "https://example.com/story2.pdf"
  ]
}
```

#### Link Structure
Each **link** describes a directed relationship between authors:

```javascript
{
  "id1": 1,                   // Required: source node id
  "id2": 2,                   // Required: target node id
  "label": "influenced"       // Required: relationship description
}
```

### stories.json Structure (Optional)
For SFSFSS reading history tracking:

```json
[
  {
    "number": "250",
    "date": "April 22, 2025",
    "title": "Story Title",
    "author": "Author Name",
    "year": "2019",
    "link": "https://example.com/story.html",
    "linkText": "HTML",
    "length": "1500",
    "weekId": "250",
    "storyIndex": 0
  }
]
```

## 🛠️ Key Implementation Details

### Graph Rendering
- Uses D3.js `forceSimulation()` with charge, center, link, and collision forces
- Nodes sized dynamically based on content length
- Arrow markers with proper positioning (`refX: 28`)
- Edge labels positioned at 65% along the edge with collision detection
- Adaptive link distances based on node degree
- Radial force layout in focus mode

### State Management
- Global objects: `nodeById`, `linkById`, `focusedNodeId`
- Event-driven updates with `updateGraph()` and `updateVisualization()`
- Debounced saves for performance
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
- **Alpha decay**: 0.001 for better settling time
- **Collision detection**: Variable radius based on node degree and layout mode

## 🎯 Feature Highlights

### Edge Creation Mode
- **Ctrl+Click** on source node to start
- Visual feedback with blue glow on source
- Green glow on valid targets
- Automatic edge popup after creation
- Escape key to cancel

### Search with Keyboard Navigation
- Rich dropdown with author images
- Arrow keys to navigate results
- Enter to select, Escape to close
- Automatic focus when selecting

### Data Cleanup Tools
- Detect duplicate edges (same nodes + label)
- Detect duplicate authors (same name)
- One-click merge/remove operations
- Visual status indicator

### Layout Options
1. **Force-Directed**: Classic physics simulation
2. **Chronological Tiers**: Authors arranged by birth year

## 🤝 Contributing Guidelines

### Making Changes
1. **Test thoroughly**: All interactions, edge cases
2. **Maintain consistency**: Follow established patterns
3. **Document decisions**: Update this README
4. **Progressive enhancement**: Don't break existing functionality
5. **Use targeted diffs**: Show exact before/after code blocks

### Line Endings
All text files use **CRLF** (`\r\n`) line terminators. The repository includes `.gitattributes` and `.editorconfig` files so Git and common editors enforce this automatically. No additional setup is required.

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