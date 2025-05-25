# AI Agent Development Guide

This document provides specific guidance for AI assistants working on the Interactive Graph Network Editor project.

## 📋 Project Overview

This repository contains a web-based graph editor for visualizing relationships between authors and thinkers across time. The main page is **force.html**, which displays a D3.js force-directed graph with nodes (authors) and edges (relationships). The application supports image uploads, automatic data persistence, and optional integration with SFSFSS reading history.

### Current Status

Development is active. The repository contains:

- `force.html` – Main page with graph visualization
- `graph-editor.js` – Core D3.js graph logic and interactions
- `duplicate-cleanup.js` – Data cleanup utilities
- `styles.css` – Complete styling system
- `server.py` – HTTP server for image uploads and auto-saves
- `data.json` – Graph dataset consumed by the page
- `stories.json` – Optional SFSFSS reading history
- `update_reading_data.py` – Script to sync reading data
- `images/` – Uploaded image files (ignored by Git)
- `backups/` – Automatic versioned backups of data.json

### Recent Improvements
- Edge creation via Ctrl+Click on nodes
- Duplicate detection and cleanup for nodes/edges
- Search with keyboard navigation and author images
- Two layout modes: Force-directed and Chronological Tiers
- SFSFSS reading history integration
- Smart label truncation with hover expansion
- Physics-based decluttering instead of hiding data

## 🎯 Project Context & User Preferences

### User's Core Values
- **Efficiency over perfection**: Practical solutions that work immediately
- **Visual polish matters**: Clean, professional appearance is essential  
- **Interaction paradigms**: Click anything that looks clickable
- **Minimal friction**: Reduce steps, use placeholders, auto-dismiss dialogs
- **Consistency**: Established patterns should be maintained throughout
- **Data preservation**: Never hide information - use physics to organize better
- **Targeted changes**: Prefer small diffs over full file rewrites

### Technical Stack Constraints
- **Frontend-focused**: Minimal backend, pure web technologies where possible
- **Server support**: Python server for image uploads and auto-saves only
- **D3.js**: Force simulation for graph physics
- **Modern CSS**: Custom properties, flexbox, grid
- **Vanilla JavaScript**: ES6+ features, no frameworks
- **External libraries**: jQuery, Select2, NoUISlider from CDNs

## 📊 Data Schemas

### data.json Schema
```typescript
{
  nodes: Array<{
    id: number;                    // Required: unique integer
    name: string;                  // Required: author's name
    birth_year?: string;           // Optional: year as string
    images?: string[];             // Optional: array of image paths
    sfsfss_has_read?: boolean;     // Optional: reading status
    story_links?: string[];        // Optional: array of story URLs
  }>;
  links: Array<{
    id1: number;                   // Required: source node id
    id2: number;                   // Required: target node id
    label: string;                 // Required: relationship description
  }>;
}
```

### stories.json Schema (Optional)
```typescript
Array<{
  number: string;         // Story number
  date: string;           // Publication date
  title: string;          // Story title
  author: string;         // Author name
  year: string;           // Story year
  link: string;           // URL to story
  linkText: string;       // Link type (HTML/PDF)
  length: string;         // Word count
  weekId: string;         // Week identifier
  storyIndex: number;     // Story index in week
}>
```

## 🛠️ Development Approach

### Code Changes - Preferred Method
1. **Targeted diffs** rather than full file rewrites
2. **Exact matching**: Use precise "Find this section" and "Replace with" blocks
3. **Line context**: Show enough surrounding code to identify location
4. **Multiple small changes** over single large refactors
5. **Test incrementally**: Each change should be verifiable
6. **Preserve existing functionality**: Don't break what works

Example of good diff format:
```
**Find this section** (around line 642):
```javascript
  $('#edgeFrom').val(fromVal);
  $('#edgeTo').val(id).trigger('change');
```

**Replace with:**
```javascript
  $('#edgeFrom').val(id).trigger('change');
  $('#edgeTo').val(toVal);
```

### UI/UX Design Patterns
```css
/* Preferred color scheme */
--primary-color: #2563eb;     /* Blue for actions */
--success-color: #10b981;     /* Green for focus/search */
--text-primary: #1e293b;      /* Dark text */
--border-color: #e2e8f0;      /* Subtle borders */

/* Node styling */
stroke: #000000;              /* Black outlines */
stroke-width: 2px;            /* Consistent weight */

/* Interaction feedback */
transition: all 0.2s ease;    /* Smooth animations */
cursor: pointer;              /* Clear affordances */
hover states with color/shadow changes
```

### JavaScript Architecture
- **Global state objects**: `nodeById`, `links`, `nodes`, `currentFilters`
- **Event-driven updates**: Call `updateGraph()` after data changes
- **Function naming**: Descriptive verbs (`openNodePopup`, `hideEdgePopup`)
- **Error handling**: Graceful degradation, console warnings
- **Performance**: Debounce rapid operations (search, save)
- **Momentum handling**: Clear velocity on drag end

## 🎨 Visual Design Guidelines

### Typography & Layout
- **Headers**: 16-18px, font-weight 600, appropriate margins
- **Body text**: 14px, line-height 1.5, readable contrast
- **Form inputs**: 8-12px padding, consistent border radius
- **Buttons**: Gradient backgrounds, subtle shadows, hover animations
- **Label truncation**: Dynamic based on edge length, expand on hover

### Color Usage Patterns
- **Black**: Edges, edge labels, node strokes, primary text (`#000000`)
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

// Label expansion on hover
.on('mouseenter', function(event, d) {
  const textEl = d3.select(this).select('text');
  textEl.text(d.label); // Show full text
})
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
// Standard force configuration with physics improvements
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink().id(d => d.id).distance(() => +linkInput.value))
  .force('charge', d3.forceManyBody().strength(() => layoutMode === 'tiers' ? +chargeInput.value * 2 : +chargeInput.value))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(layoutMode === 'tiers' ? 60 : 40))
  .alphaDecay(layoutMode === 'tiers' ? 0.01 : 0.001)
  .velocityDecay(layoutMode === 'tiers' ? 0.8 : 0.4)
  .on('tick', ticked);
```

### Select2 Integration
```javascript
// For autocomplete with custom tags
$('#edgeLabel').select2({
  tags: true,
  width: '100%',
  placeholder: 'Relationship type',
  data: [
    'influenced',
    'inspired',
    'mentored',
    'collaborated with',
    'friend of',
    'contemporary of',
    'studied under',
    'rival of',
    'edited',
    'married',
    'corresponded with'
  ],
  createTag: function(params) {
    return {
      id: params.term,
      text: params.term,
      newOption: true
    };
  }
});
```

### CSS Organization
```css
/* Order: Variables → Base → Layout → Components → States → Interactions */
:root { /* variables */ }
* { /* reset */ }
.main-content { /* layout */ }
.popup { /* components */ }
.popup:hover { /* states */ }
.label-group:hover { /* interactions */ }
```

## 🚨 Critical Requirements

### Must Always Do
1. **Single popup rule**: Close others when opening new
2. **Click affordances**: Cursor pointer, hover effects for interactive elements
3. **Color consistency**: Black edges/strokes, green highlights, blue actions
4. **Responsive feedback**: Immediate visual changes on interaction
5. **Error prevention**: Validate inputs, provide helpful defaults
6. **Physics solutions**: Use forces to declutter, don't hide data
7. **Proper diffs**: Show exact code to find and replace
8. **Maintain data integrity**: Preserve all fields when updating nodes

### Must Never Do
1. **Break existing functionality**: Test before confirming changes
2. **Ignore accessibility**: Maintain keyboard navigation, proper contrast
3. **Hardcode values**: Use CSS custom properties for colors/spacing
4. **Create memory leaks**: Clean up event listeners properly
5. **Overcomplicate simple fixes**: Prefer minimal viable solutions
6. **Use fake data fallbacks**: Show proper error messages instead
7. **Store images as binary**: Always use server for image uploads
8. **Lose data fields**: Preserve optional fields even if not displayed

## 🎯 Feature Development Priorities

### High Impact, Low Effort
- Hover effects and visual feedback
- Consistent button styling
- Input validation and constraints
- Keyboard shortcuts for common actions
- Better error messages and user guidance
- Smart label truncation with expansion

### Medium Priority Features
- Enhanced search with fuzzy matching
- Export formats (CSV, JSON, GraphML)
- Undo/redo functionality
- Curved edges that actually avoid obstacles
- Group selection and batch operations
- Timeline visualization improvements

### Complex Features (Plan Carefully)
- Real-time collaboration
- Plugin system for extensions
- Advanced graph algorithms
- Mobile touch interaction redesign
- Force-based label collision detection
- AI-assisted relationship suggestions

## 🐛 Debugging Guidelines

### Common Issues & Solutions
```javascript
// Arrow positioning problems
// Fix: Adjust refX based on node radius
.attr('refX', 28)

// Popup z-index conflicts  
// Fix: Consistent hierarchy (popups: 1001, controls: 100, graph: 1)

// Performance issues with large graphs
// Fix: Debounce updates, use requestAnimationFrame
const debouncedUpdate = debounce(updateGraph, 100);

// Momentum issues after dragging
// Fix: Clear velocity in dragended
d.vx = 0; d.vy = 0;

// Select2 not updating
// Fix: Use jQuery methods and trigger('change')
$('#edgeFrom').val(id).trigger('change');

// Edge creation visual feedback
// Fix: Use filter with drop-shadow for glow effects
.classed('edge-source', true)
.style('filter', 'drop-shadow(0 0 8px rgba(37, 99, 235, 0.8))')
```

### Testing Checklist
- [ ] All clickable elements respond correctly
- [ ] Popups open/close properly
- [ ] Search highlighting works
- [ ] Focus mode filters correctly
- [ ] Data persists through server
- [ ] Hover effects are smooth
- [ ] No console errors
- [ ] Momentum clears on drag release
- [ ] Labels truncate and expand properly
- [ ] Edge creation mode works
- [ ] Duplicate cleanup functions correctly
- [ ] Optional data fields preserved

## 📋 Code Review Standards

### Before Submitting Changes
1. **Visual consistency**: Matches existing design patterns
2. **Functional correctness**: All interactions work as expected
3. **Performance impact**: No unnecessary DOM manipulation
4. **Code readability**: Clear naming, appropriate comments
5. **Documentation updates**: README/AGENTS reflects new functionality
6. **Diff quality**: Clear before/after with line numbers
7. **Data integrity**: All node/link fields preserved

### Diff Quality Standards
```javascript
// GOOD: Specific, actionable change with context
// Find this section (around line 635):
const fromVal = document.getElementById('edgeFrom').value;
const labelVal = document.getElementById('edgeLabel').value;

// Replace with:
const fromVal = document.getElementById('edgeFrom').value;
const toVal = document.getElementById('edgeTo').value;
const labelVal = document.getElementById('edgeLabel').value;

// BAD: Vague or incomplete
// Update the variable declarations to include toVal
```

## 🎨 Style Guide Summary

### CSS Patterns
- Use CSS custom properties for theming
- Consistent border-radius (8px standard)
- Box shadows for depth (--shadow-md, --shadow-lg)
- Smooth transitions (0.2s ease) for interactivity
- Flexbox for layouts, Grid for complex arrangements
- Black strokes for nodes, black text for edges

### JavaScript Patterns
- Const/let over var
- Arrow functions for callbacks
- Descriptive function names
- Event delegation for efficiency
- Error handling with try/catch
- Proper momentum handling (clear vx/vy)

### HTML Structure
- Semantic elements (main, section, header)
- Accessible form labels and ARIA attributes
- Logical document outline
- Minimal inline styles (prefer CSS classes)
- Select2 for enhanced dropdowns

### Physics & Layout
- Adaptive link distances based on node degree
- Radial forces for focus mode organization
- Collision detection with variable radius
- Different settings for Force vs Tiers layout
- Velocity decay for natural friction
- Label truncation instead of hiding

## 🚧 Current Known Issues

1. **Label overlap** in dense graphs
   - *Solution in progress*: Force-based label repulsion
2. **Performance with 500+ nodes**
   - *Fix*: Implement viewport culling
3. **Mobile touch support** needs improvement
   - *Fix*: Add proper touch event handlers

## 📦 External Dependencies

All loaded from CDNs in force.html:
- D3.js v7.9.0
- jQuery 3.6.0
- Select2 4.0.13
- NoUISlider 15.7.0

## 🤝 Contribution Guidelines

### Making Changes
To avoid churn from inconsistent line endings, use **CRLF** (`\r\n`) line terminators for all files in this repository. Configure your editor to save files with Windows line endings and do not convert them to plain `\n` or other styles. Line endings are automatically enforced by the repository's `.gitattributes` and `.editorconfig` files so most editors will handle them correctly without extra setup.

---

## 🚀 Quick Start for AI Agents

When asked to modify this project:

1. **Understand the request** in context of existing patterns
2. **Identify affected files** (usually 1-3 files max)
3. **Create targeted diffs** with exact find/replace blocks
4. **Maintain visual consistency** with established design
5. **Test the logic flow** before presenting changes
6. **Update documentation** if adding new features
7. **Use physics to solve layout issues**, don't hide data
8. **Preserve all data fields** including optional ones

Remember: This user values **working solutions over perfect theory**, **targeted diffs over full rewrites**, and **physics-based decluttering over hiding information**. Provide implementable code changes that respect the existing architecture and design philosophy.

### Key Recent Learnings
- User prefers small, targeted diffs with clear before/after
- Black strokes for nodes are important for consistency
- Don't create fake data fallbacks - show proper errors
- Select2 integration needs proper jQuery handling
- Physics solutions are preferred over hiding/truncating data
- Label truncation with hover expansion is acceptable compromise
- Edge creation via Ctrl+Click is intuitive
- Duplicate cleanup is essential for data quality
- Optional fields (sfsfss_has_read, story_links) must be preserved