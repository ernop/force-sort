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
- Focus and year filters persist through node or edge updates. These states only
  change when the filter controls themselves are used.

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
other styles. Line endings are automatically enforced by the repository's
`.gitattributes` and `.editorconfig` files so most editors will handle them
correctly without extra setup.


# AI Agent Development Guide

This document provides specific guidance for AI assistants working on the Interactive Graph Network Editor project.

## 🎯 Project Context & User Preferences

### User's Core Values
- **Efficiency over perfection**: Practical solutions that work immediately
- **Visual polish matters**: Clean, professional appearance is essential  
- **Interaction paradigms**: Click anything that looks clickable
- **Minimal friction**: Reduce steps, use placeholders, auto-dismiss dialogs
- **Consistency**: Established patterns should be maintained throughout

### Technical Stack Constraints
- **Frontend-only**: No backend, no Node.js, pure web technologies
- **LocalStorage**: All persistence happens in browser
- **D3.js**: Force simulation for graph physics
- **Modern CSS**: Custom properties, flexbox, grid
- **Vanilla JavaScript**: ES6+ features, no frameworks

## 🛠️ Development Approach

### Code Changes - Preferred Method
1. **Targeted diffs** rather than full file rewrites
2. **Exact matching**: Use precise `// REPLACE THIS:` and `// WITH THIS:` blocks
3. **Multiple small changes** over single large refactors
4. **Test incrementally**: Each change should be verifiable
5. **Preserve existing functionality**: Don't break what works

### UI/UX Design Patterns
```css
/* Preferred color scheme */
--primary-color: #2563eb;     /* Blue for actions */
--success-color: #10b981;     /* Green for focus/search */
--text-primary: #1e293b;      /* Dark text */
--border-color: #e2e8f0;      /* Subtle borders */

/* Interaction feedback */
transition: all 0.2s ease;    /* Smooth animations */
cursor: pointer;               /* Clear affordances */
hover states with color/shadow changes
```

### JavaScript Architecture
- **Global state objects**: `nodeById`, `linkById`, `focusedNodeId`
- **Event-driven updates**: Call `updateGraph()` after data changes
- **Function naming**: Descriptive verbs (`openNodePopup`, `hideEdgePopup`)
- **Error handling**: Graceful degradation, console warnings
- **Performance**: Debounce rapid operations (search, save)

## 🎨 Visual Design Guidelines

### Typography & Layout
- **Headers**: 16-18px, font-weight 600, appropriate margins
- **Body text**: 14px, line-height 1.5, readable contrast
- **Form inputs**: 8-12px padding, consistent border radius
- **Buttons**: Gradient backgrounds, subtle shadows, hover animations

### Color Usage Patterns
- **Black**: Edges, edge labels, primary text (`#000000`)
- **Blue**: Primary actions, hover states (`#2563eb`)
- **Green**: Search highlights, focus mode (`#16a34a` - rich green)
- **Red**: Delete actions, warnings (`#ef4444`)
- **Gray**: Secondary text, borders, disabled states

### Interactive Elements
```javascript
// Hover effects pattern
element.style.transition = 'all 0.2s ease';
element.addEventListener('mouseenter', () => {
  element.style.color = 'var(--primary-color)';
  element.style.filter = 'drop-shadow(0 0 3px rgba(37, 99, 235, 0.3))';
});
```

## 🔧 Common Implementation Patterns

### Popup Management
```javascript
// Always close other popups first
function openNodePopup(id, x, y) {
  hideEdgePopup(); // Single popup rule
  // ... popup logic
}

// Click-away dismiss pattern
document.addEventListener('click', (e) => {
  if (!popup.contains(e.target)) {
    hidePopup();
  }
});
```

### D3.js Force Simulation
```javascript
// Standard force configuration
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(80))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width/2, height/2));
```

### CSS Organization
```css
/* Order: Variables → Base → Layout → Components → States */
:root { /* variables */ }
* { /* reset */ }
.main-content { /* layout */ }
.popup { /* components */ }
.popup:hover { /* states */ }
```

## 🚨 Critical Requirements

### Must Always Do
1. **Single popup rule**: Close others when opening new
2. **Click affordances**: Cursor pointer, hover effects for interactive elements
3. **Color consistency**: Black edges, green highlights, blue actions
4. **Responsive feedback**: Immediate visual changes on interaction
5. **Error prevention**: Validate inputs, provide helpful defaults

### Must Never Do
1. **Break existing functionality**: Test before confirming changes
2. **Ignore accessibility**: Maintain keyboard navigation, proper contrast
3. **Hardcode values**: Use CSS custom properties for colors/spacing
4. **Create memory leaks**: Clean up event listeners properly
5. **Overcomplicate simple fixes**: Prefer minimal viable solutions

## 🎯 Feature Development Priorities

### High Impact, Low Effort
- Hover effects and visual feedback
- Consistent button styling
- Input validation and constraints
- Keyboard shortcuts for common actions
- Better error messages and user guidance

### Medium Priority Features
- Drag-to-create edges between nodes
- Batch operations for multiple selections
- Enhanced search with fuzzy matching
- Export formats (CSV, JSON, GraphML)
- Undo/redo functionality

### Complex Features (Plan Carefully)
- Real-time collaboration
- Plugin system for extensions
- Advanced graph algorithms
- Timeline visualization modes
- Mobile touch interaction redesign

## 🐛 Debugging Guidelines

### Common Issues & Solutions
```javascript
// Arrow positioning problems
// Fix: Adjust refX based on node radius and connection depth
.attr('refX', nodeRadius + 8)

// Popup z-index conflicts  
// Fix: Consistent hierarchy (popups: 1001, controls: 100, graph: 1)

// Performance issues with large graphs
// Fix: Debounce updates, use requestAnimationFrame
const debouncedUpdate = debounce(updateGraph, 100);
```

### Testing Checklist
- [ ] All clickable elements respond correctly
- [ ] Popups open/close properly
- [ ] Search highlighting works
- [ ] Focus mode filters correctly
- [ ] Data persists in localStorage
- [ ] Hover effects are smooth
- [ ] No console errors

## 📋 Code Review Standards

### Before Submitting Changes
1. **Visual consistency**: Matches existing design patterns
2. **Functional correctness**: All interactions work as expected
3. **Performance impact**: No unnecessary DOM manipulation
4. **Code readability**: Clear naming, appropriate comments
5. **Documentation updates**: README reflects new functionality

### Diff Quality Standards
```javascript
// GOOD: Specific, actionable change
// REPLACE THIS:
function openPopup() {
  popup.style.display = 'block';
}

// WITH THIS:
function openPopup() {
  hideOtherPopups(); // Single popup rule
  popup.style.display = 'block';
}

// BAD: Vague or incomplete
// Update the popup function to be better
```

## 🎨 Style Guide Summary

### CSS Patterns
- Use CSS custom properties for theming
- Consistent border-radius (8px standard)
- Box shadows for depth (--shadow-md, --shadow-lg)
- Smooth transitions (0.2s ease) for interactivity
- Flexbox for layouts, Grid for complex arrangements

### JavaScript Patterns
- Const/let over var
- Arrow functions for callbacks
- Descriptive function names
- Event delegation for efficiency
- Error handling with try/catch

### HTML Structure
- Semantic elements (main, section, header)
- Accessible form labels and ARIA attributes
- Logical document outline
- Minimal inline styles (prefer CSS classes)

---

## 🚀 Quick Start for AI Agents

When asked to modify this project:

1. **Understand the request** in context of existing patterns
2. **Identify affected files** (usually 1-3 files max)
3. **Create targeted diffs** with exact find/replace blocks
4. **Maintain visual consistency** with established design
5. **Test the logic flow** before presenting changes
6. **Update documentation** if adding new features

Remember: This user values **working solutions over perfect theory**. Provide implementable code changes that respect the existing architecture and design philosophy.