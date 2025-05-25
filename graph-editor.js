/* ============================================
   GRAPH EDITOR - Interactive Force-Directed Graph
   ============================================ */

/* ========== CONFIGURATION & CONSTANTS ========== */
const CONFIG = {
  // Visual constants
  NODE_RADIUS: 22,
  ARROW_REF_X: 28,
  LABEL_RADIUS: 28,
  LABEL_POSITION_FRACTION: 0.65,
  LABEL_DELTA: 10,
  
  // Layout constants
  TIER_ROW_HEIGHT: 80,
  TIER_START_Y: 100,
  MIN_NODE_SPACING: 200,
  
  // Physics constants
  PHYSICS: {
    ALPHA_DECAY: 0.0228,      // D3 default
    VELOCITY_DECAY: 0.4,      // D3 default
    COLLISION_RADIUS: 35,
    PERTURB_AMOUNT: 40,
    DAMPEN_FACTOR: 0.1
  },
  
  // Animation constants
  ANIMATION: {
    TRANSITION_DURATION: 200,
    HIGHLIGHT_DURATION: 3000,
    SIMULATION_RESTART_ALPHA: 0.8,
    SIMULATION_TARGET_ALPHA: 0.3
  },
  
  // UI constants
  UI: {
    EDGE_HIT_WIDTH: 14,
    POPUP_MIN_WIDTH: 200,
    SEARCH_RESULT_HEIGHT: 300,
    IMAGE_SIZE: 48,
    IMAGE_DISPLAY_SIZE: 44
  }
};

/* ========== GLOBAL STATE ========== */
let nodes = [];
let links = [];
let visibleLinks = [];
const nodeById = new Map();
let nextNodeId = 1;

// Centralized filter state
let currentFilters = {
  year: { min: null, max: null },
  focus: { nodeId: null, depth: 1 },
  searchTerm: '',
  showSFSFSS: true,
  onlySFSFSS: false
};

// Layout mode
let layoutMode = 'force';

// Edge creation state
let edgeCreationMode = {
  active: false,
  sourceNode: null,
  tempLine: null
};

// Popup state
let edgePopupLink = null;
let nodePopupId = null;

// Search state
let searchResultsState = {
  currentIndex: -1,
  results: []
};

/* ========== SVG SETUP & ELEMENTS ========== */
const graphDiv = document.getElementById('graph');
let width = graphDiv.clientWidth;
let height = graphDiv.clientHeight;

const svg = d3.select(graphDiv).append('svg')
  .attr('width', width)
  .attr('height', height);

// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.1, 4])
  .on('zoom', event => g.attr('transform', event.transform));

svg.call(zoom).on('dblclick.zoom', null);

// SVG definitions
const defs = svg.append('defs');

// Arrow marker
defs.append('marker')
  .attr('id', 'arrow')
  .attr('viewBox', '0 -3 8 6')
  .attr('refX', CONFIG.ARROW_REF_X)
  .attr('refY', 0)
  .attr('markerWidth', 10)
  .attr('markerHeight', 10)
  .attr('orient', 'auto')
  .append('path')
  .attr('d', 'M0,-3L8,0L0,3')
  .attr('fill', '#000000');

// Node image clip path
defs.append('clipPath')
  .attr('id', 'nodeClip')
  .append('circle')
  .attr('r', CONFIG.NODE_RADIUS);

// Main SVG group
const g = svg.append('g');
const linkGroup = g.append('g').attr('class', 'links');
const yearLabelGroup = g.append('g').attr('class', 'year-labels').style('display', 'none');

// D3 selections (will be populated by updateGraph)
let linkSel = linkGroup.selectAll('path.link');
let linkHitSel = linkGroup.selectAll('path.link-hit');
let labelSel = linkGroup.selectAll('g.label-group');
let yearLabelSel = yearLabelGroup.selectAll('text');
let nodeSel = g.selectAll('.node');

/* ========== FORCE SIMULATION ========== */
const chargeInput = document.getElementById('chargeRange');
const linkInput = document.getElementById('linkRange');
const layoutSelect = document.getElementById('layoutSelect');

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink().id(d => d.id).distance(() => +linkInput.value))
  .force('charge', d3.forceManyBody().strength(() => +chargeInput.value))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(CONFIG.PHYSICS.COLLISION_RADIUS))
  .alphaDecay(CONFIG.PHYSICS.ALPHA_DECAY)
  .velocityDecay(CONFIG.PHYSICS.VELOCITY_DECAY)
  .on('tick', ticked);

/* ========== DATA MANAGEMENT ========== */
function loadData() {
  return fetch("data/data.json")
    .then(r => r.json())
    .then(data => {
      nodes = data.nodes || [];
      links = data.links || [];
      
      nodes.forEach(n => {
        n.images = Array.isArray(n.images) ? n.images : [];
        n.image = n.images[0] || null;
        nodeById.set(n.id, n);
      });
      
      nextNodeId = Math.max(0, ...nodes.map(n => n.id)) + 1;
      
      // Check for duplicates if the function exists
      if (window.graphEditor && window.graphEditor.checkForDuplicates) {
        window.graphEditor.checkForDuplicates();
      }
    });
}

function saveDataToServer(text) {
  fetch('/save_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: text
  });
}

function refreshExport(markDirty = true) {
  const exportData = JSON.stringify({
    nodes: nodes.map(n => {
      const obj = { id: n.id, name: n.name };
      if (n.birth_year !== undefined && n.birth_year !== null && n.birth_year !== '') {
        obj.birth_year = n.birth_year;
      }
      obj.images = n.images ? n.images.slice() : [];
      // Preserve SFSFSS data
      if (n.sfsfss_has_read !== undefined) obj.sfsfss_has_read = n.sfsfss_has_read;
      if (n.story_links) obj.story_links = n.story_links;
      return obj;
    }),
    links
  }, null, 2);
  
  const exportArea = document.getElementById('export');
  const saveStatus = document.getElementById('saveStatus');
  
  exportArea.value = exportData;
  
  if (markDirty) {
    exportArea.classList.add('unsaved');
    saveStatus.className = 'status-indicator status-unsaved';
    saveStatus.innerHTML = '⚠ Saving...';
    
    if (typeof saveDataToServer === 'function') {
      saveDataToServer(exportData);
      setTimeout(() => {
        exportArea.classList.remove('unsaved');
        saveStatus.className = 'status-indicator status-saved';
        saveStatus.innerHTML = '✓ Saved';
      }, 500);
    }
  } else {
    exportArea.classList.remove('unsaved');
    saveStatus.className = 'status-indicator status-saved';
    saveStatus.innerHTML = '✓ Saved';
  }
}

function buildSimLinks(arr) {
  return arr.map(e => ({
    source: nodeById.get(e.id1),
    target: nodeById.get(e.id2),
    label: e.label,
    dir: e.id1 < e.id2 ? 1 : -1,
    link: e
  }));
}

/* ========== RENDERING & ANIMATION ========== */
function ticked() {
  updateLinkPositions();
  updateNodePositions();
  updateNodeLabels();
  updateEdgeLabels();
  
  if (simulation.alpha() < 0.005) {
    simulation.stop();
  }
}

function updateLinkPositions() {
  const pathD = d => {
    const dx = d.target.x - d.source.x;
    const dy = d.target.y - d.source.y;
    const dist = Math.hypot(dx, dy) || 1;
    const tEnd = (dist - CONFIG.NODE_RADIUS) / dist;
    return `M${d.source.x},${d.source.y}L${d.source.x + dx*tEnd},${d.source.y + dy*tEnd}`;
  };

  linkSel.attr('d', pathD);
  linkHitSel.attr('d', pathD);
}

function updateNodePositions() {
  nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
}

function updateNodeLabels() {
  // Calculate incident edges for each node
  const incident = new Map();
  (visibleLinks || []).forEach(l => {
    const src = nodeById.get(l.id1);
    const tgt = nodeById.get(l.id2);
    if (!src || !tgt || !src.x || !tgt.x) return;

    const angle = Math.atan2(tgt.y - src.y, tgt.x - src.x);
    (incident.get(src.id) || incident.set(src.id, []).get(src.id)).push(angle);
    (incident.get(tgt.id) || incident.set(tgt.id, []).get(tgt.id)).push(angle + Math.PI);
  });

  // Position labels to avoid edges
  const slots = Array.from({length: 8}, (_, i) => i * Math.PI / 4);
  
  nodeSel.select('text').each(function(d) {
    const edges = incident.get(d.id) || [];
    let bestAngle = 0;
    let bestScore = -1;
    
    slots.forEach(s => {
      const score = edges.length
        ? Math.min(...edges.map(e => Math.abs(Math.atan2(Math.sin(s - e), Math.cos(s - e)))))
        : Math.PI;
      if (score > bestScore) {
        bestScore = score;
        bestAngle = s;
      }
    });

    const tx = Math.cos(bestAngle) * CONFIG.LABEL_RADIUS;
    const ty = Math.sin(bestAngle) * CONFIG.LABEL_RADIUS;

    d3.select(this)
      .attr('x', tx)
      .attr('y', ty)
      .attr('dominant-baseline', 'central')
      .attr('text-anchor',
        Math.abs(Math.cos(bestAngle)) < 0.3 ? 'middle' :
        (Math.cos(bestAngle) > 0 ? 'start' : 'end'));
  });
}

function updateEdgeLabels() {
  labelSel.each(function(d) {
    const g = d3.select(this);
    const text = g.select('text');
    
    if (!d.source || !d.target || typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return;
    
    const forward = d.source.id < d.target.id;
    const s = forward ? d.source : d.target;
    const t = forward ? d.target : d.source;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.hypot(dx, dy) || 1;
    const px = -dy / dist;
    const py = dx / dist;
    const dir = forward ? 1 : -1;

    const lx = d.source.x + (d.target.x - d.source.x) * CONFIG.LABEL_POSITION_FRACTION;
    const ly = d.source.y + (d.target.y - d.source.y) * CONFIG.LABEL_POSITION_FRACTION;

    d.cx = lx + CONFIG.LABEL_DELTA * px * dir;
    d.cy = ly + CONFIG.LABEL_DELTA * py * dir;
    
    // Position the group
    g.attr('transform', `translate(${d.cx},${d.cy})`);
    
    // Rotate the text
    text.attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('transform', () => {
        let ang = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
        if (ang > 90 || ang < -90) ang += 180;
        return `rotate(${ang})`;
      });
  });
}

/* ========== PHYSICS & MOTION CONTROL ========== */

/* ========== LAYOUT ALGORITHMS ========== */
function computeYearLayout() {
  const years = nodes
    .map(n => parseInt(n.birth_year, 10))
    .filter(y => !isNaN(y));
  
  let minYear, maxYear;
  if (years.length === 0) {
    minYear = maxYear = new Date().getFullYear();
  } else {
    minYear = Math.min(...years);
    maxYear = Math.max(...years);
  }

  // Group nodes by year
  const yearGroups = new Map();
  nodes.forEach(n => {
    const y = parseInt(n.birth_year, 10);
    const key = isNaN(y) ? maxYear + 1 : y;
    if (!yearGroups.has(key)) yearGroups.set(key, []);
    yearGroups.get(key).push(n);
  });

  // Sort years and assign y positions
  const sortedYears = Array.from(yearGroups.keys()).sort((a, b) => a - b);
  
  sortedYears.forEach((year, rowIndex) => {
    const yPos = rowIndex * CONFIG.TIER_ROW_HEIGHT + CONFIG.TIER_START_Y;
    const nodesInYear = yearGroups.get(year);
    
    nodesInYear.forEach((node, i) => {
      const xSpacing = Math.max(CONFIG.MIN_NODE_SPACING, width / Math.max(nodesInYear.length, 4));
      node.x = (i - (nodesInYear.length - 1) / 2) * xSpacing + width / 2;
      node.y = yPos;
      node.fy = yPos; // Fix Y position
      node.fx = null; // Allow horizontal movement
      node._tierMode = true;
    });
  });

  // Update year labels
  const labelData = sortedYears.map((year, rowIndex) => ({
    year: year,
    yPos: rowIndex * CONFIG.TIER_ROW_HEIGHT + CONFIG.TIER_START_Y
  }));
  
  yearLabelSel = yearLabelGroup.selectAll('text').data(labelData, d => d.year)
    .join('text')
    .text(d => d.year > maxYear ? 'Unknown' : d.year)
    .attr('text-anchor', 'end')
    .attr('x', 80)
    .attr('y', d => d.yPos + 5);
}

function applyLayoutForces(restartAlpha = true) {
  simulation.stop();
  
  nodes.forEach(n => {
    if (layoutMode === 'force') {
      if (!currentFilters.focus.nodeId || n.id !== currentFilters.focus.nodeId) {
        n.fx = n.fy = null;
      }
    } else {
      n.fx = n.fy = null;
    }
  });

  if (layoutMode === 'tiers') {
    computeYearLayout();
    yearLabelGroup.style('display', null);
    simulation.alpha(1).restart();
  } else if (layoutMode === 'force') {
    simulation.force('tier', null);
    yearLabelGroup.style('display', 'none');
    if (restartAlpha) {
      simulation.alpha(1).restart();
    } else if (simulation.alpha() < 0.1) {
      simulation.alphaTarget(0.1).restart();
    }
  }
}

/* ========== GRAPH UPDATE & REFRESH ========== */
function updateGraph(skipSelectUpdate = false, highlightIdx = null, markDirty = true) {
  // Update node selections
  nodeSel = g.selectAll('.node').data(nodes, d => d.id)
    .join(
      enter => createNodeElement(enter),
      update => updateNodeElement(update),
      exit => exit.remove()
    );

  simulation.nodes(nodes);

  if (!skipSelectUpdate) populateSelects();
  refreshExport(markDirty);
  
  applyAllFiltersAndRefresh(true);

  // Highlight newly added edge if specified
  if (highlightIdx !== null) {
    highlightNewEdge(highlightIdx);
  }
}

function createNodeElement(enter) {
  const nodeG = enter.append('g')
    .attr('class', 'node')
    .on('click', handleNodeClick)
    .on('dblclick', handleNodeDoubleClick)
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended));

  nodeG.append('circle').attr('r', CONFIG.NODE_RADIUS);
  
  nodeG.append('image')
    .attr('class', 'node-image')
    .attr('clip-path', 'url(#nodeClip)')
    .attr('x', -CONFIG.NODE_RADIUS)
    .attr('y', -CONFIG.NODE_RADIUS)
    .attr('width', CONFIG.UI.IMAGE_DISPLAY_SIZE)
    .attr('height', CONFIG.UI.IMAGE_DISPLAY_SIZE)
    .attr('href', d => d.image || '')
    .style('display', d => d.image ? null : 'none');
  
  nodeG.append('text')
    .attr('dominant-baseline', 'central')
    .text(d => formatNodeLabel(d))
    .style('cursor', 'pointer')
    .on('mouseenter', handleNodeTextMouseEnter)
    .on('mouseleave', handleNodeTextMouseLeave)
    .on('click', handleNodeTextClick);
    
  return nodeG;
}

function updateNodeElement(update) {
  update.each(function(d) {
    const n = d3.select(this);
    n.select('text').text(formatNodeLabel(d));
    n.select('image.node-image')
      .attr('href', d.image || '')
      .style('display', d.image ? null : 'none');
  });
  return update;
}

function highlightNewEdge(linkIdx) {
  linkSel.filter(d_sim => links.indexOf(d_sim.link) === linkIdx)
    .classed('highlight', true)
    .style('stroke', '#2563eb')
    .style('stroke-width', '3px')
    .style('filter', 'drop-shadow(0 0 4px rgba(37, 99, 235, 0.6))')
    .transition()
    .duration(CONFIG.ANIMATION.HIGHLIGHT_DURATION)
    .style('stroke', null)
    .style('stroke-width', null)
    .style('filter', null)
    .on('end', function() {
      d3.select(this).classed('highlight', false);
    });
}

function refreshLinks(restartSim = true) {
  const simLinks = buildSimLinks(visibleLinks);

  // Update link paths
  linkSel = linkGroup.selectAll('path.link')
    .data(simLinks, d => links.indexOf(d.link))
    .join(
      enter => enter.append('path')
        .attr('class', 'link')
        .attr('stroke', '#64748b')
        .attr('stroke-width', 1.5)
        .attr('marker-end', 'url(#arrow)')
        .on('click', edgeMenu),
      update => update,
      exit => exit.remove()
    );

  // Update hit areas
  linkHitSel = linkGroup.selectAll('path.link-hit')
    .data(simLinks, d => links.indexOf(d.link))
    .join(
      enter => enter.append('path')
        .attr('class', 'link-hit')
        .on('click', edgeMenu),
      update => update,
      exit => exit.remove()
    );

  // Update labels
  labelSel = linkGroup.selectAll('g.label-group')
    .data(simLinks, d => links.indexOf(d.link))
    .join(
      enter => createLabelElement(enter),
      update => updateLabelElement(update),
      exit => exit.remove()
    );

  simulation.force('link').links(simLinks);
  
  if (restartSim) {
    applyLayoutForces(true);
  } else {
    if (layoutMode === 'force' && simulation.alpha() < 0.05) {
      simulation.alphaTarget(0.1).restart();
    }
    ticked();
  }
}

function createLabelElement(enter) {
  const g = enter.append('g').attr('class', 'label-group');
  
  g.append('rect')
    .attr('class', 'label-bg')
    .attr('rx', 4)
    .attr('ry', 4)
    .style('fill', 'white')
    .style('fill-opacity', 0)
    .style('stroke', 'none');
  
  const text = g.append('text')
    .attr('class', 'label')
    .text(d => truncateLabel(d))
    .attr('data-full-text', d => d.label)
    .on('dblclick', handleLabelDoubleClick)
    .on('click', edgeMenu);
  
  g.on('mouseenter', handleLabelMouseEnter)
    .on('mouseleave', handleLabelMouseLeave);
  
  return g;
}

function updateLabelElement(update) {
  update.each(function(d) {
    const g = d3.select(this);
    const text = g.select('text');
    text
      .text(truncateLabel(d))
      .attr('data-full-text', d.label);
  });
  return update;
}

function truncateLabel(d) {
  if (!d.source || !d.target) return d.label;
  
  const dx = d.target.x - d.source.x;
  const dy = d.target.y - d.source.y;
  const edgeLength = Math.sqrt(dx * dx + dy * dy);
  const maxLength = Math.max(15, Math.min(50, Math.floor(edgeLength / 8)));
  
  return d.label.length > maxLength ? 
    d.label.substring(0, maxLength) + '…' : 
    d.label;
}

/* ========== NODE INTERACTIONS ========== */
function handleNodeClick(event, d) {
  if (event.ctrlKey || event.metaKey) {
    event.stopPropagation();
    if (d && typeof d.x !== 'undefined' && typeof d.y !== 'undefined') {
      handleEdgeCreation(d);
    }
  } else {
    event.stopPropagation();
    openNodePopup(d.id, event.pageX, event.pageY);
  }
}

function handleNodeDoubleClick(event, d) {
  event.stopPropagation();
  if (currentFilters.focus.nodeId === d.id) {
    setFocus(null, 1);
  } else {
    setFocus(d.id, currentFilters.focus.depth);
  }
}

function handleNodeTextClick(event, d) {
  event.stopPropagation();
  openNodePopup(d.id, event.pageX, event.pageY);
}

function handleNodeTextMouseEnter(event, d) {
  if (edgeCreationMode.active && edgeCreationMode.sourceNode && d.id !== edgeCreationMode.sourceNode.id) {
    d3.select(this.parentNode).classed('edge-target-valid', true);
  }
}

function handleNodeTextMouseLeave(event, d) {
  if (edgeCreationMode.active) {
    d3.select(this.parentNode).classed('edge-target-valid', false);
  }
}

/* ========== EDGE INTERACTIONS ========== */
function handleLabelDoubleClick(event, d) {
  event.stopPropagation();
  openEdgePopup(d.link, event.pageX, event.pageY);
}

function handleLabelMouseEnter(event, d) {
  const textEl = d3.select(this).select('text');
  const bgEl = d3.select(this).select('rect');
  
  textEl.text(d.label);
  
  const bbox = textEl.node().getBBox();
  bgEl
    .attr('x', bbox.x - 4)
    .attr('y', bbox.y - 2)
    .attr('width', bbox.width + 8)
    .attr('height', bbox.height + 4)
    .transition()
    .duration(CONFIG.ANIMATION.TRANSITION_DURATION)
    .style('fill-opacity', 0.9)
    .style('stroke', '#000')
    .style('stroke-width', 0.5);
}

function handleLabelMouseLeave(event, d) {
  const textEl = d3.select(this).select('text');
  const bgEl = d3.select(this).select('rect');
  
  textEl.text(truncateLabel(d));
  
  bgEl
    .transition()
    .duration(CONFIG.ANIMATION.TRANSITION_DURATION)
    .style('fill-opacity', 0)
    .style('stroke', 'none');
}

function edgeMenu(event, d) {
  if (event.detail > 1) return;
  event.stopPropagation();
  if (!d || !d.link) return;
  openEdgePopup(d.link, event.pageX, event.pageY);
}

/* ========== DRAG BEHAVIOR ========== */
function dragstarted(event, d) {
  if (layoutMode === 'force') {
    if (d.id === currentFilters.focus.nodeId) return;
    if (!event.active) simulation.alphaTarget(CONFIG.ANIMATION.SIMULATION_TARGET_ALPHA).restart();
    d.fx = d.x;
    d.fy = d.y;
    d.vx = 0;
    d.vy = 0;
  }
}

function dragged(event, d) {
  if (layoutMode === 'force') {
    if (d.id === currentFilters.focus.nodeId) return;
    d.fx = event.x;
    d.fy = event.y;
  } else {
    if (d.id === currentFilters.focus.nodeId) return;
    d.x = event.x;
    d.y = event.y;
    ticked();
  }
}

function dragended(event, d) {
  if (layoutMode === 'force') {
    if (d.id === currentFilters.focus.nodeId) return;
    if (!event.active) simulation.alphaTarget(0);
    if (d.id !== currentFilters.focus.nodeId) {
      d.fx = null;
      d.fy = null;
      d.vx = 0;
      d.vy = 0;
    }
  } else {
    if (d.id === currentFilters.focus.nodeId) {
      const focusedNode = nodeById.get(d.id);
      computeYearLayout();
      d.fx = focusedNode.x;
      d.fy = focusedNode.y;
    }
    ticked();
  }
}

/* ========== EDGE CREATION MODE ========== */
function handleEdgeCreation(node) {
  if (!edgeCreationMode.active) {
    startEdgeCreation(node);
  } else if (edgeCreationMode.sourceNode && edgeCreationMode.sourceNode.id !== node.id) {
    completeEdgeCreation(node);
  }
}

function startEdgeCreation(node) {
  edgeCreationMode.active = true;
  edgeCreationMode.sourceNode = node;
  
  nodeSel.classed('edge-source', d => d.id === node.id);
  
  edgeCreationMode.tempLine = g.append('line')
    .attr('class', 'temp-edge')
    .attr('x1', node.x || 0)
    .attr('y1', node.y || 0)
    .attr('x2', node.x || 0)
    .attr('y2', node.y || 0);
  
  showEdgeCreationHint('Click on target node to create edge (Esc to cancel)');
}

function completeEdgeCreation(targetNode) {
  const sourceId = edgeCreationMode.sourceNode.id;
  const targetId = targetNode.id;
  
  const existingEdge = links.find(l => 
    (l.id1 === sourceId && l.id2 === targetId) || 
    (l.id1 === targetId && l.id2 === sourceId)
  );
  
  if (!existingEdge) {
    // Create new edge
    links.push({ 
      id1: sourceId, 
      id2: targetId, 
      label: 'connected to' 
    });
    
    // Visual feedback
    nodeSel.filter(d => d.id === targetId)
      .classed('edge-target-valid', true)
      .transition().duration(500)
      .on('end', function() { 
        d3.select(this).classed('edge-target-valid', false); 
      });
    
    updateGraph();
    
    // Dampen motion
    nodes.forEach(n => {
      n.vx = 0;
      n.vy = 0;
    });
    
    // Open edge popup for the new edge
    const sourceX = edgeCreationMode.sourceNode.x;
    const sourceY = edgeCreationMode.sourceNode.y;
    const targetX = targetNode.x;
    const targetY = targetNode.y;
    
    const newLink = links[links.length - 1];
    requestAnimationFrame(() => {
      const midX = (sourceX + targetX) / 2;
      const midY = (sourceY + targetY) / 2;
      const transform = d3.zoomTransform(svg.node());
      const pageX = midX * transform.k + transform.x;
      const pageY = midY * transform.k + transform.y;
      openEdgePopup(newLink, pageX + graphDiv.offsetLeft, pageY + graphDiv.offsetTop);
    });
  } else {
    // Edge already exists
    nodeSel.filter(d => d.id === targetId)
      .classed('edge-target-invalid', true)
      .transition().duration(500)
      .on('end', function() { 
        d3.select(this).classed('edge-target-invalid', false); 
      });
  }
  
  cancelEdgeCreation();
}

function cancelEdgeCreation() {
  if (edgeCreationMode.active) {
    edgeCreationMode.active = false;
    edgeCreationMode.sourceNode = null;
    
    if (edgeCreationMode.tempLine) {
      edgeCreationMode.tempLine.remove();
      edgeCreationMode.tempLine = null;
    }
    
    nodeSel.classed('edge-source', false);
    hideEdgeCreationHint();
  }
}

function showEdgeCreationHint(text) {
  let hint = d3.select('.edge-creation-hint');
  if (hint.empty()) {
    hint = d3.select('body').append('div')
      .attr('class', 'edge-creation-hint');
  }
  hint.text(text).classed('visible', true);
}

function hideEdgeCreationHint() {
  d3.select('.edge-creation-hint').classed('visible', false);
}

// Mouse move handler for edge creation
svg.on('mousemove', (event) => {
  if (edgeCreationMode.active && edgeCreationMode.tempLine && edgeCreationMode.sourceNode) {
    const [mx, my] = d3.pointer(event, g.node());
    edgeCreationMode.tempLine
      .attr('x2', mx)
      .attr('y2', my);
    
    // Highlight potential target
    const target = d3.select(event.target);
    if (target.classed('node') || target.node().parentNode?.classList?.contains('node')) {
      const nodeEl = target.classed('node') ? target : d3.select(target.node().parentNode);
      const nodeData = nodeEl.datum();
      if (nodeData && nodeData.id !== edgeCreationMode.sourceNode.id) {
        nodeSel.classed('edge-target-valid', d => d.id === nodeData.id);
      }
    } else {
      nodeSel.classed('edge-target-valid', false);
    }
  }
});

/* ========== POPUP MANAGEMENT ========== */
function openEdgePopup(linkObj, x, y) {
  hideNodePopup();
  const popup = document.getElementById('edgePopup');
  const label = document.getElementById('edgePopupLabel');
  
  edgePopupLink = linkObj;
  label.value = linkObj.label || '';
  popup.style.left = (x + 5) + 'px';
  popup.style.top = (y + 5) + 'px';
  popup.style.display = 'block';
}

function hideEdgePopup() {
  document.getElementById('edgePopup').style.display = 'none';
  edgePopupLink = null;
}

function openNodePopup(id, x, y) {
  hideEdgePopup();
  const n = nodeById.get(id);
  if (!n) return;
  
  const popup = document.getElementById('nodePopup');
  const nameInput = document.getElementById('nodePopupName');
  const yearInput = document.getElementById('nodePopupYear');
  
  nodePopupId = id;
  nameInput.value = n.name || '';
  yearInput.value = n.birth_year || '';
  renderNodeImages(n);
  
  popup.style.left = (x + 5) + 'px';
  popup.style.top = (y + 5) + 'px';
  popup.style.display = 'block';
  nameInput.focus();

  // Add SFSFSS story links if applicable
  addStoryLinksToPopup(n);
}

function hideNodePopup() {
  document.getElementById('nodePopup').style.display = 'none';
  nodePopupId = null;
}

function renderNodeImages(n) {
  const container = document.getElementById('nodePopupImages');
  container.innerHTML = '';
  
  (n.images || []).forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    
    const img = document.createElement('img');
    img.src = src;
    item.appendChild(img);
    
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    
    const leftBtn = document.createElement('button');
    leftBtn.textContent = '◀';
    leftBtn.addEventListener('click', () => moveImage(idx, -1));
    
    const rightBtn = document.createElement('button');
    rightBtn.textContent = '▶';
    rightBtn.addEventListener('click', () => moveImage(idx, 1));
    
    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.addEventListener('click', () => removeImage(idx));
    
    actions.appendChild(leftBtn);
    actions.appendChild(rightBtn);
    actions.appendChild(delBtn);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

function addStoryLinksToPopup(n) {
  const container = document.getElementById('nodePopupImages');
  const existingStoryLinks = container.parentNode.querySelector('.story-links');
  if (existingStoryLinks) {
    existingStoryLinks.remove();
  }

  if (currentFilters.showSFSFSS && n.sfsfss_has_read && n.story_links && n.story_links.length > 0) {
    const storySection = document.createElement('div');
    storySection.className = 'story-links';
    
    const title = document.createElement('div');
    title.className = 'story-links-title';
    title.textContent = 'SFSFSS Stories Read:';
    storySection.appendChild(title);
    
    n.story_links.forEach(url => {
      const linkItem = document.createElement('div');
      linkItem.className = 'story-link-item';
      
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.textContent = url.split('/').pop() || url;
      
      const type = document.createElement('span');
      type.className = 'story-link-type';
      type.textContent = url.endsWith('.pdf') ? 'PDF' : 'HTML';
      
      linkItem.appendChild(link);
      linkItem.appendChild(type);
      storySection.appendChild(linkItem);
    });
    
    container.parentNode.insertBefore(storySection, container.nextSibling);
  }
}

function moveImage(idx, delta) {
  const n = nodeById.get(nodePopupId);
  if (!n) return;
  
  const imgs = n.images;
  const newIdx = idx + delta;
  if (newIdx < 0 || newIdx >= imgs.length) return;
  
  [imgs[idx], imgs[newIdx]] = [imgs[newIdx], imgs[idx]];
  n.image = imgs[0] || null;
  renderNodeImages(n);
  updateGraph();
}

function removeImage(idx) {
  const n = nodeById.get(nodePopupId);
  if (!n) return;
  
  // Delete from server
  const imagePath = n.images[idx];
  fetch('/delete_image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ node_id: n.id, image: imagePath })
  });
  
  n.images.splice(idx, 1);
  n.image = n.images[0] || null;
  renderNodeImages(n);
  updateGraph();
}

/* ========== FILTERING SYSTEM ========== */
function applyAllFiltersAndRefresh(restartSimForcefully = false) {
  // Start with all nodes visible
  let visibleNodeIds = new Set(nodes.map(n => n.id));

  // Apply Year Filter
  if (currentFilters.year.min !== null && currentFilters.year.max !== null) {
    const yearFiltered = new Set();
    nodes.forEach(n => {
      const y = parseInt(n.birth_year, 10);
      // Include nodes without years OR within range
      if (isNaN(y) || (y >= currentFilters.year.min && y <= currentFilters.year.max)) {
        yearFiltered.add(n.id);
      }
    });
    // Intersect with current visible set
    visibleNodeIds = new Set([...visibleNodeIds].filter(id => yearFiltered.has(id)));
  }

  // Apply SFSFSS Only Filter (if active, further restrict visibility)
  if (currentFilters.onlySFSFSS) {
    const sfsfssFiltered = new Set();
    nodes.forEach(n => {
      if (n.sfsfss_has_read === true) {
        sfsfssFiltered.add(n.id);
      }
    });
    // Intersect with current visible set
    visibleNodeIds = new Set([...visibleNodeIds].filter(id => sfsfssFiltered.has(id)));
  }

  // Apply Focus Filter
  let isFocusActive = false;
  let finalVisibleNodeIds = new Set(visibleNodeIds);

  if (currentFilters.focus.nodeId !== null && nodeById.has(currentFilters.focus.nodeId)) {
    if (visibleNodeIds.has(currentFilters.focus.nodeId)) {
      isFocusActive = true;
      const focusNeighborhood = buildFocusNeighborhood(currentFilters.focus.nodeId, currentFilters.focus.depth);
      finalVisibleNodeIds = new Set([...visibleNodeIds].filter(id => focusNeighborhood.has(id)));
    }
  }
  
  // Update node positions and pinning
  updateNodePinning(isFocusActive);

  // Update visibility
  nodeSel.style('display', d => finalVisibleNodeIds.has(d.id) ? null : 'none');
  nodeSel.classed('focus-node', d => isFocusActive && d.id === currentFilters.focus.nodeId && finalVisibleNodeIds.has(d.id));

  // Update visible links
  visibleLinks = links.filter(l => finalVisibleNodeIds.has(l.id1) && finalVisibleNodeIds.has(l.id2));

  // Refresh rendering
  let needsStrongRestart = restartSimForcefully || (layoutMode === 'force' && (isFocusActive || currentFilters.focus.nodeId === null));
  refreshLinks(needsStrongRestart);

  // Style focused edges
  linkSel.classed('focus-edge', false);
  if (isFocusActive && finalVisibleNodeIds.has(currentFilters.focus.nodeId)) {
    linkSel.filter(d_sim => d_sim.link && (d_sim.link.id1 === currentFilters.focus.nodeId || d_sim.link.id2 === currentFilters.focus.nodeId))
      .classed('focus-edge', true);
  }

  // Apply highlighting
  highlightSearch();
  
  // SFSFSS highlighting is independent of visibility filter
  nodeSel.classed('sfsfss-read', d => currentFilters.showSFSFSS && d.sfsfss_has_read === true);

  // Update positions if needed
  if (!needsStrongRestart && layoutMode === 'tiers') {
    ticked();
  }
}

function buildFocusNeighborhood(nodeId, depth) {
  const focusNeighborhood = new Set([nodeId]);
  let frontier = [nodeId];
  const allNodeIds = new Set(nodes.map(n => n.id));

  for (let i = 0; i < depth; i++) {
    const nextFrontier = [];
    frontier.forEach(id => {
      links.forEach(l => {
        if (l.id1 === id || l.id2 === id) {
          const other = (l.id1 === id) ? l.id2 : l.id1;
          if (allNodeIds.has(other) && !focusNeighborhood.has(other)) {
            focusNeighborhood.add(other);
            nextFrontier.push(other);
          }
        }
      });
    });
    frontier = nextFrontier;
  }
  
  return focusNeighborhood;
}

function updateNodePinning(isFocusActive) {
  nodes.forEach(n => {
    if (layoutMode === 'force') {
      n.fx = null;
      n.fy = null;
    }
  });

  if (isFocusActive && nodeById.has(currentFilters.focus.nodeId)) {
    const focusNodeObject = nodeById.get(currentFilters.focus.nodeId);
    if (focusNodeObject && layoutMode === 'force') {
      focusNodeObject.fx = focusNodeObject.x;
      focusNodeObject.fy = focusNodeObject.y;
    }
  }
}

function setFocus(nodeId, depth) {
  hideEdgePopup();
  hideNodePopup();
  
  // Unpin old focus node
  const oldFocusNodeId = currentFilters.focus.nodeId;
  if (oldFocusNodeId && nodeById.has(oldFocusNodeId)) {
    const oldNode = nodeById.get(oldFocusNodeId);
    if (oldNode) {
      oldNode.fx = null;
      oldNode.fy = null;
    }
  }

  currentFilters.focus.nodeId = nodeId;
  const oldDepth = currentFilters.focus.depth;
  currentFilters.focus.depth = nodeId === null ? 1 : parseInt(depth, 10);
  
  // Position focus node if needed
  if (nodeId !== null) {
    const focusNode = nodeById.get(nodeId);
    if (focusNode && (typeof focusNode.x === 'undefined' || typeof focusNode.y === 'undefined')) {
      focusNode.x = width / 2;
      focusNode.y = height / 2;
    }
    
    // Position newly visible nodes
    if (nodeId === oldFocusNodeId && oldDepth !== currentFilters.focus.depth) {
      positionNewlyVisibleNodes(focusNode, oldDepth);
    }
  }

  updateFocusUI();
  updateURLFromFilters();
  applyAllFiltersAndRefresh();
}

function positionNewlyVisibleNodes(focusNode, oldDepth) {
  if (!focusNode || !focusNode.x || !focusNode.y) return;
  
  const focusNeighborhood = buildFocusNeighborhood(focusNode.id, currentFilters.focus.depth);
  
  links.forEach(l => {
    const isIncoming = l.id2 === focusNode.id;
    const other = isIncoming ? l.id1 : l.id2;
    
    if (focusNeighborhood.has(other)) {
      const otherNode = nodeById.get(other);
      if (otherNode && (typeof otherNode.x === 'undefined' || typeof otherNode.y === 'undefined')) {
        const angle = isIncoming ? 
          Math.PI + (Math.random() - 0.5) * Math.PI : 
          (Math.random() - 0.5) * Math.PI;
        
        const radius = 150 + (Math.floor(Math.random() * 3) * 80);
        otherNode.x = focusNode.x + Math.cos(angle) * radius;
        otherNode.y = focusNode.y + Math.sin(angle) * radius;
      }
    }
  });
}

function updateFocusUI() {
  const focusBox = document.getElementById('focusBox');
  const focusLabel = document.getElementById('focusLabel');
  const focusRange = document.getElementById('focusRange');
  const focusNum = document.getElementById('focusNum');
  const clearFocus = document.getElementById('clearFocus');

  if (currentFilters.focus.nodeId !== null) {
    const node = nodeById.get(currentFilters.focus.nodeId);
    if (node) {
      focusLabel.textContent = `Focused: ${node.name}`;
      focusBox.style.display = 'block';
      focusRange.value = currentFilters.focus.depth;
      focusNum.textContent = currentFilters.focus.depth;
      clearFocus.style.display = 'inline';
    } else {
      currentFilters.focus.nodeId = null;
      focusBox.style.display = 'none';
      clearFocus.style.display = 'none';
    }
  } else {
    focusLabel.textContent = 'No author focused';
    focusBox.style.display = 'none';
    clearFocus.style.display = 'none';
  }
}

function highlightSearch() {
  const term = currentFilters.searchTerm;
  nodeSel.classed('search-match', d => term !== '' && d.name.toLowerCase().includes(term));
}

/* ========== SEARCH FUNCTIONALITY ========== */
function setupSearchAndFilter() {
  setupYearSlider();
  setupSearchInput();
  setupFocusControls();
}

function setupYearSlider() {
  const years = nodes.map(n => parseInt(n.birth_year, 10)).filter(y => !isNaN(y));
  const yearSlider = document.getElementById('yearSlider');
  
  if (years.length) {
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    const startYear = Math.floor(minY / 50) * 50;
    const endYear = Math.ceil(maxY / 50) * 50;
    const tickValues = [];
    
    for (let year = startYear; year <= endYear; year += 50) {
      if (year >= minY && year <= maxY) tickValues.push(year);
    }

    noUiSlider.create(yearSlider, {
      start: [minY, maxY],
      connect: true,
      step: 1,
      range: { min: minY, max: maxY },
      tooltips: [true, true],
      format: { to: v => Math.round(v), from: v => +v },
      pips: {
        mode: 'values',
        values: tickValues,
        density: 2
      }
    });
    
    currentFilters.year.min = minY;
    currentFilters.year.max = maxY;

    yearSlider.noUiSlider.on('update', (values) => {
      currentFilters.year.min = parseInt(values[0], 10);
      currentFilters.year.max = parseInt(values[1], 10);
      applyAllFiltersAndRefresh();
      updateURLFromFilters();
    });
  } else {
    yearSlider.style.display = 'none';
  }
}

function setupSearchInput() {
  const searchInput = document.getElementById('searchInput');
  const searchResults = createSearchResults();
  
  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    currentFilters.searchTerm = term;
    
    if (term.length > 0) {
      showSearchResults(term, searchResults);
    } else {
      hideSearchResults(searchResults);
    }
    
    applyAllFiltersAndRefresh(false);
    updateURLFromFilters();
  });
  
  // Keyboard navigation
  searchInput.addEventListener('keydown', (e) => {
    if (searchResults.style.display === 'block') {
      switch(e.key) {
        case 'ArrowDown':
          e.preventDefault();
          navigateSearchResults('down', searchResults);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateSearchResults('up', searchResults);
          break;
        case 'Enter':
          e.preventDefault();
          selectCurrentSearchResult(searchResults);
          break;
        case 'Escape':
          e.preventDefault();
          hideSearchResults(searchResults);
          searchInput.blur();
          break;
      }
    }
  });
  
  // Click outside to hide
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      hideSearchResults(searchResults);
    }
  });
}

function setupFocusControls() {
  const focusRange = document.getElementById('focusRange');
  focusRange.addEventListener('input', () => {
    const newDepth = parseInt(focusRange.value, 10);
    if (currentFilters.focus.nodeId !== null) {
      setFocus(currentFilters.focus.nodeId, newDepth);
    } else {
      currentFilters.focus.depth = newDepth;
      document.getElementById('focusNum').textContent = newDepth;
    }
  });
}

function createSearchResults() {
  const resultsDiv = document.createElement('div');
  resultsDiv.className = 'search-results';
  resultsDiv.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-top: none;
    border-radius: 0 0 var(--border-radius) var(--border-radius);
    max-height: ${CONFIG.UI.SEARCH_RESULT_HEIGHT}px;
    overflow-y: auto;
    z-index: 1000;
    display: none;
    box-shadow: var(--shadow-lg);
  `;
  
  document.getElementById('searchInput').parentNode.appendChild(resultsDiv);
  document.getElementById('searchInput').style.position = 'relative';
  return resultsDiv;
}

function showSearchResults(term, resultsDiv) {
  const matchingNodes = nodes.filter(n => 
    n.name.toLowerCase().includes(term)
  ).sort((a, b) => a.name.localeCompare(b.name));
  
  searchResultsState.results = matchingNodes;
  searchResultsState.currentIndex = -1;
  
  if (matchingNodes.length === 0) {
    resultsDiv.innerHTML = '<div style="padding: 12px; color: var(--text-secondary);">No authors found</div>';
  } else {
    resultsDiv.innerHTML = matchingNodes.map((node, index) => 
      createSearchResultItem(node, index, term)
    ).join('');
  }
  
  resultsDiv.style.display = 'block';
  
  // Add event handlers
  resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      searchResultsState.currentIndex = -1;
      updateSearchSelection(resultsDiv);
      item.style.background = 'var(--bg-tertiary)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.background = 'transparent';
    });
    item.addEventListener('click', () => {
      selectSearchResult(item, resultsDiv);
    });
  });
  
  updateSearchSelection(resultsDiv);
}

function createSearchResultItem(node, index, term) {
  const name = node.name;
  const year = node.birth_year || '';
  const image = node.image || '';
  
  const regex = new RegExp(`(${term})`, 'gi');
  const highlightedName = name.replace(regex, '<mark>$1</mark>');
  
  return `
    <div class="search-result-item" data-node-id="${node.id}" data-index="${index}" style="
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border-bottom: 1px solid var(--border-color);
      transition: background 0.2s ease;
    ">
      <div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        margin-right: 12px;
        flex-shrink: 0;
        overflow: hidden;
      ">
        ${image ? `<img src="${image}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 500; color: var(--text-primary);">${highlightedName}</div>
        ${year ? `<div class="search-result-year" style="font-size: 12px; color: var(--text-secondary);">${year}</div>` : ''}
      </div>
    </div>
  `;
}

function updateSearchSelection(resultsDiv) {
  const items = resultsDiv.querySelectorAll('.search-result-item');
  items.forEach((item, index) => {
    if (index === searchResultsState.currentIndex) {
      item.style.background = 'var(--primary-color)';
      item.style.color = 'white';
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.style.background = 'transparent';
      item.style.color = '';
    }
  });
}

function navigateSearchResults(direction, resultsDiv) {
  if (searchResultsState.results.length === 0) return;
  
  if (direction === 'down') {
    searchResultsState.currentIndex = Math.min(
      searchResultsState.currentIndex + 1,
      searchResultsState.results.length - 1
    );
  } else if (direction === 'up') {
    searchResultsState.currentIndex = Math.max(
      searchResultsState.currentIndex - 1,
      -1
    );
  }
  
  updateSearchSelection(resultsDiv);
}

function selectCurrentSearchResult(resultsDiv) {
  if (searchResultsState.currentIndex >= 0 && searchResultsState.currentIndex < searchResultsState.results.length) {
    const selectedNode = searchResultsState.results[searchResultsState.currentIndex];
    const item = resultsDiv.querySelector(`[data-node-id="${selectedNode.id}"]`);
    if (item) {
      selectSearchResult(item, resultsDiv);
    }
  }
}

function selectSearchResult(item, resultsDiv) {
  const nodeId = parseInt(item.dataset.nodeId, 10);
  
  // Clear search state
  currentFilters.searchTerm = '';
  hideSearchResults(resultsDiv);
  
  // Clear input
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  
  // Position the focused node in center
  const focusNode = nodeById.get(nodeId);
  if (focusNode) {
    focusNode.x = width / 2;
    focusNode.y = height / 2;
    focusNode.fx = focusNode.x;
    focusNode.fy = focusNode.y;
  }
  
  // Set focus
  setFocus(nodeId, currentFilters.focus.depth);
}

function hideSearchResults(resultsDiv) {
  resultsDiv.style.display = 'none';
  searchResultsState.currentIndex = -1;
  searchResultsState.results = [];
}

/* ========== UI CONTROLS & EVENT HANDLERS ========== */

// Perturb and dampen controls
document.getElementById('perturb').addEventListener('click', () => {
  nodes.forEach(n => {
    n.x += (Math.random() - 0.5) * CONFIG.PHYSICS.PERTURB_AMOUNT;
    n.y += (Math.random() - 0.5) * CONFIG.PHYSICS.PERTURB_AMOUNT;
  });
  if (layoutMode === 'force') {
    simulation.alpha(CONFIG.ANIMATION.SIMULATION_RESTART_ALPHA).restart();
  } else {
    ticked();
  }
});

document.getElementById('dampen').addEventListener('click', () => {
  nodes.forEach(n => {
    n.vx = (n.vx || 0) * CONFIG.PHYSICS.DAMPEN_FACTOR;
    n.vy = (n.vy || 0) * CONFIG.PHYSICS.DAMPEN_FACTOR;
  });
});

// Physics controls
chargeInput.addEventListener('input', e => {
  const value = +e.target.value;
  simulation.force('charge').strength(value);
  document.getElementById('chargeValue').textContent = value;
  if (layoutMode === 'force') {
    simulation.alpha(CONFIG.ANIMATION.SIMULATION_RESTART_ALPHA).restart();
  } else {
    ticked();
  }
});

linkInput.addEventListener('input', e => {
  const value = +e.target.value;
  simulation.force('link').distance(value);
  document.getElementById('linkValue').textContent = value;
  simulation.alpha(0.3).restart();
});

// Layout mode control
layoutSelect.addEventListener('change', e => {
  layoutMode = e.target.value;
  applyLayoutForces();
  applyAllFiltersAndRefresh(true);
  updateURLFromFilters();
});

// Clear focus button
document.getElementById('clearFocus').addEventListener('click', () => {
  setFocus(null, 1);
});

// SFSFSS toggle handlers
document.getElementById('sfsfssToggle').addEventListener('change', (e) => {
  currentFilters.showSFSFSS = e.target.checked;
  applyAllFiltersAndRefresh(false);
  updateURLFromFilters();
  
  // Update any open popup
  if (nodePopupId !== null) {
    const n = nodeById.get(nodePopupId);
    if (n) {
      const popup = document.getElementById('nodePopup');
      openNodePopup(nodePopupId, parseInt(popup.style.left), parseInt(popup.style.top));
    }
  }
});

document.getElementById('onlySfsfssToggle').addEventListener('change', (e) => {
  currentFilters.onlySFSFSS = e.target.checked;
  applyAllFiltersAndRefresh(false);
  updateURLFromFilters();
});

// Node/edge addition controls
document.getElementById('addNodeBtn').addEventListener('click', addNode);
document.getElementById('newNodeName').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addNode();
  }
});
document.getElementById('newNodeYear').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addNode();
  }
});

document.getElementById('addEdgeBtn').addEventListener('click', () => {
  const id1 = parseInt(document.getElementById('edgeFrom').value, 10);
  const id2 = parseInt(document.getElementById('edgeTo').value, 10);
  const lbl = $('#edgeLabel').val() || '';

  if (isNaN(id1) || isNaN(id2) || id1 === id2) return;
  
  links.push({ id1, id2, label: lbl });
  updateGraph(true, links.length - 1);
});

document.getElementById('edgeLabel').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addEdgeBtn').click();
  }
});

// Flip relationship button
document.getElementById('flipRelationship').addEventListener('click', () => {
  const fromVal = $('#edgeFrom').val();
  const toVal = $('#edgeTo').val();
  $('#edgeFrom').val(toVal).trigger('change');
  $('#edgeTo').val(fromVal).trigger('change');
});

// Export area click to copy
document.getElementById('export').addEventListener('click', function() {
  navigator.clipboard.writeText(this.value)
    .then(() => {
      this.classList.remove('unsaved');
      const saveStatus = document.getElementById('saveStatus');
      saveStatus.className = 'status-indicator status-saved';
      saveStatus.innerHTML = '✓ Copied to clipboard';
      setTimeout(() => {
        saveStatus.innerHTML = '✓ Saved';
      }, 2000);
    });
});

// Popup event handlers
document.getElementById('edgePopupSave').addEventListener('click', e => {
  e.stopPropagation();
  if (!edgePopupLink) return;
  edgePopupLink.label = document.getElementById('edgePopupLabel').value;
  hideEdgePopup();
  updateGraph();
});

document.getElementById('edgePopupReverse').addEventListener('click', e => {
  e.stopPropagation();
  if (!edgePopupLink) return;
  const l = edgePopupLink;
  [l.id1, l.id2] = [l.id2, l.id1];
  hideEdgePopup();
  applyAllFiltersAndRefresh(false);
  refreshExport();
});

document.getElementById('edgePopupDelete').addEventListener('click', e => {
  e.stopPropagation();
  if (!edgePopupLink) return;
  const idx = links.indexOf(edgePopupLink);
  if (idx !== -1) links.splice(idx, 1);
  hideEdgePopup();
  updateGraph();
});

document.getElementById('edgePopupClose').addEventListener('click', e => {
  e.stopPropagation();
  hideEdgePopup();
});

document.getElementById('nodePopupSave').addEventListener('click', e => {
  e.stopPropagation();
  if (nodePopupId === null) return;
  const n = nodeById.get(nodePopupId);
  n.name = document.getElementById('nodePopupName').value.trim() || n.name;
  const year = document.getElementById('nodePopupYear').value.trim();
  if (year === '') {
    delete n.birth_year;
  } else {
    n.birth_year = year;
  }
  hideNodePopup();
  updateGraph();
});

document.getElementById('nodePopupDelete').addEventListener('click', e => {
  e.stopPropagation();
  if (nodePopupId === null) return;
  const id = nodePopupId;
  const idx = nodes.findIndex(n => n.id === id);
  if (idx !== -1) nodes.splice(idx, 1);
  links = links.filter(l => l.id1 !== id && l.id2 !== id);
  nodeById.delete(id);
  if (currentFilters.focus.nodeId === id) {
    setFocus(null, 1);
  }
  hideNodePopup();
  updateGraph();
});

document.getElementById('nodePopupClose').addEventListener('click', e => {
  e.stopPropagation();
  hideNodePopup();
});

// Click outside to close popups
document.body.addEventListener('click', e => {
  const edgePopup = document.getElementById('edgePopup');
  const nodePopup = document.getElementById('nodePopup');
  
  if (!edgePopup.contains(e.target)) hideEdgePopup();
  if (!nodePopup.contains(e.target)) hideNodePopup();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  switch(e.key) {
    case 'p':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('perturb').click();
      }
      break;
    case 'd':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('dampen').click();
      }
      break;
    case 'f':
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      break;
    case 'Escape':
      hideEdgePopup();
      hideNodePopup();
      cancelEdgeCreation();
      break;
  }
});

// Ctrl key hints
document.addEventListener('keyup', e => {
  if (!e.ctrlKey && !e.metaKey && !edgeCreationMode.active) {
    hideEdgeCreationHint();
  }
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && !edgeCreationMode.active) {
    showEdgeCreationHint('Ctrl+Click on a node to start creating an edge');
  }
});

// Paste image handling
document.addEventListener('paste', async e => {
  if (nodePopupId === null) return;
  const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
  if (!item) return;
  const file = item.getAsFile();
  
  const formData = new FormData();
  formData.append('image', file);
  formData.append('node_id', nodePopupId);
  
  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });
    
    if (response.ok) {
      const result = await response.text();
      if (result !== 'DUPLICATE') {
        const dataResponse = await fetch('data.json');
        const data = await dataResponse.json();
        const updatedNode = data.nodes.find(n => n.id === nodePopupId);
        if (updatedNode) {
          const n = nodeById.get(nodePopupId);
          n.images = updatedNode.images;
          n.image = n.images[0] || null;
          renderNodeImages(n);
          updateGraph();
        }
      }
    }
  } catch (error) {
    console.error('Upload failed:', error);
  }
});

// Window resize handling
function handleResize() {
  const newWidth = graphDiv.clientWidth;
  const newHeight = graphDiv.clientHeight;
  
  if (newWidth !== width || newHeight !== height) {
    width = newWidth;
    height = newHeight;
    
    svg.attr('width', width).attr('height', height);
    simulation.force('center', d3.forceCenter(width / 2, height / 2));
    
    if (layoutMode === 'force') {
      simulation.alpha(0.3).restart();
    }
  }
}

window.addEventListener('resize', handleResize);

// Browser back/forward
window.addEventListener('popstate', (event) => {
  loadFiltersFromURL();
  applyAllFiltersAndRefresh();
});

/* ========== HELPER FUNCTIONS ========== */
function formatNodeLabel(n) {
  return (n.birth_year !== undefined && n.birth_year !== null && n.birth_year !== '')
    ? `${n.name} (${n.birth_year})`
    : n.name;
}

function addNode() {
  const nameInput = document.getElementById('newNodeName');
  const yearInput = document.getElementById('newNodeYear');
  const name = nameInput.value.trim();
  const year = yearInput.value.trim();
  
  if (!name) {
    nameInput.focus();
    return;
  }

  const id = nextNodeId++;
  const newNodeData = { id, name, images: [] };
  if (year !== '') newNodeData.birth_year = year;
  
  nodes.push(newNodeData);
  nodeById.set(id, nodes[nodes.length - 1]);

  const fromVal = document.getElementById('edgeFrom').value;
  const toVal = document.getElementById('edgeTo').value;
  const labelVal = document.getElementById('edgeLabel').value;
  
  nameInput.value = '';
  yearInput.value = '';

  updateGraph(true);
  populateSelects();

  $('#edgeFrom').val(id).trigger('change');
  $('#edgeTo').val(toVal);
  $('#edgeLabel').val(labelVal).trigger('change');
}

function populateSelects() {
  const groups = new Map();
  nodes.forEach(n => {
    const key = n.birth_year && n.birth_year !== '' ? n.birth_year : 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  });
  
  const sortedYears = Array.from(groups.keys()).sort((a, b) => {
    const ay = a === 'Unknown' ? Infinity : parseInt(a, 10);
    const by = b === 'Unknown' ? Infinity : parseInt(b, 10);
    return ay - by;
  });

  const opts = sortedYears.map(y => {
    const items = groups.get(y).sort((a, b) => a.name.localeCompare(b.name))
      .map(n => `<option value="${n.id}">${formatNodeLabel(n)}</option>`)
      .join('');
    return `<optgroup label="${y}">${items}</optgroup>`;
  }).join('');

  const fromVal = document.getElementById('edgeFrom').value;
  const toVal = document.getElementById('edgeTo').value;

  if ($('#edgeFrom').hasClass('select2-hidden-accessible')) $('#edgeFrom').select2('destroy');
  if ($('#edgeTo').hasClass('select2-hidden-accessible')) $('#edgeTo').select2('destroy');

  document.getElementById('edgeFrom').innerHTML = opts;
  document.getElementById('edgeTo').innerHTML = opts;
  $('#edgeFrom').val(fromVal);
  $('#edgeTo').val(toVal);

  const select2Options = { width: '100%', minimumResultsForSearch: 0 };
  $('#edgeFrom').select2(select2Options);
  $('#edgeTo').select2(select2Options);
}

/* ========== URL STATE MANAGEMENT ========== */
function updateURLFromFilters() {
  const params = new URLSearchParams();
  
  if (currentFilters.focus.nodeId !== null) {
    params.set('focus', currentFilters.focus.nodeId);
    params.set('depth', currentFilters.focus.depth);
  }
  
  if (currentFilters.year.min !== null && currentFilters.year.max !== null) {
    const years = nodes.map(n => parseInt(n.birth_year, 10)).filter(y => !isNaN(y));
    if (years.length > 0) {
      const dataMin = Math.min(...years);
      const dataMax = Math.max(...years);
      if (currentFilters.year.min !== dataMin || currentFilters.year.max !== dataMax) {
        params.set('yearMin', currentFilters.year.min);
        params.set('yearMax', currentFilters.year.max);
      }
    }
  }
  
  if (currentFilters.searchTerm) {
    params.set('search', currentFilters.searchTerm);
  }
  
  if (!currentFilters.showSFSFSS) {
    params.set('showSFSFSS', 'false');
  }
  if (currentFilters.onlySFSFSS) {
    params.set('onlySFSFSS', 'true');
  }
  
  if (layoutMode !== 'force') {
    params.set('layout', layoutMode);
  }
  
  const newHash = '#' + params.toString();
  if (location.hash !== newHash) {
    history.replaceState(null, '', newHash);
  }
}

function loadFiltersFromURL() {
  const params = new URLSearchParams(location.hash.slice(1));
  
  if (params.has('layout')) {
    layoutMode = params.get('layout');
    document.getElementById('layoutSelect').value = layoutMode;
  }
  
  if (params.has('yearMin') && params.has('yearMax')) {
    const yearMin = parseInt(params.get('yearMin'), 10);
    const yearMax = parseInt(params.get('yearMax'), 10);
    if (!isNaN(yearMin) && !isNaN(yearMax)) {
      currentFilters.year.min = yearMin;
      currentFilters.year.max = yearMax;
      const yearSlider = document.getElementById('yearSlider');
      if (yearSlider.noUiSlider) {
        yearSlider.noUiSlider.set([yearMin, yearMax]);
      }
    }
  }
  
  if (params.has('search')) {
    currentFilters.searchTerm = params.get('search');
    document.getElementById('searchInput').value = currentFilters.searchTerm;
  }
  
  if (params.has('showSFSFSS')) {
    currentFilters.showSFSFSS = params.get('showSFSFSS') === 'true';
    document.getElementById('sfsfssToggle').checked = currentFilters.showSFSFSS;
  }
  if (params.has('onlySFSFSS')) {
    currentFilters.onlySFSFSS = params.get('onlySFSFSS') === 'true';
    document.getElementById('onlySfsfssToggle').checked = currentFilters.onlySFSFSS;
  }
  
  let focusNodeId = null;
  let focusDepth = 1;
  if (params.has('focus')) {
    focusNodeId = parseInt(params.get('focus'), 10);
    focusDepth = parseInt(params.get('depth') || '1', 10);
  }
  
  return { focusNodeId, focusDepth };
}

/* ========== INITIALIZATION ========== */
function initialize() {
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.innerHTML = '<div class="spinner"></div>Loading graph data...';
  graphDiv.appendChild(loadingDiv);

  loadData().then(() => {
    graphDiv.removeChild(loadingDiv);
    
    populateSelects();
    setupSearchAndFilter();
    updateGraph(false, null, false);

    const { focusNodeId: initialFocusNodeId, focusDepth: initialFocusDepth } = loadFiltersFromURL();

    if (initialFocusNodeId !== null && nodeById.has(initialFocusNodeId)) {
      const focusNode = nodeById.get(initialFocusNodeId);
      if (focusNode) {
        focusNode.x = width / 2;
        focusNode.y = height / 2;
        focusNode.fx = focusNode.x;
        focusNode.fy = focusNode.y;
      }
      setFocus(initialFocusNodeId, initialFocusDepth);
    } else {
      applyAllFiltersAndRefresh(false);
    }

    setTimeout(handleResize, 100);
  }).catch(error => {
    console.error('Failed to load data:', error);
    graphDiv.removeChild(loadingDiv);
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'loading';
    errorDiv.innerHTML = `<div style="color: var(--danger-color);">Error: Failed to load data.json<br><small>${error.message}</small></div>`;
    graphDiv.appendChild(errorDiv);
  });
}

// Initialize select2 after DOM is ready
$(document).ready(() => {
  $(document).on('select2:open', function() {
    const searchField = document.querySelector('.select2-container--open .select2-search__field');
    if (searchField) searchField.focus();
  });
  
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
  
  initialize();
});

/* ========== EXPORTS FOR DEBUGGING ========== */
window.graphEditor = window.graphEditor || {};
window.graphEditor.setFocus = setFocus;
window.graphEditor.addNode = addNode;
window.graphEditor.nodes = nodes;
window.graphEditor.links = links;
window.graphEditor.currentFilters = currentFilters;
window.graphEditor.simulation = simulation;

/* ========== DYNAMIC STYLES ========== */
if (!document.querySelector('#image-actions-style')) {
  const style = document.createElement('style');
  style.id = 'image-actions-style';
  style.textContent = `
    .image-actions {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .image-item:hover .image-actions {
      opacity: 1;
    }
    .image-actions button {
      flex: 1;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 2px;
      font-size: 12px;
      transition: background 0.2s ease;
    }
    .image-actions button:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .image-actions button:last-child {
      color: #ff4444;
    }
  `;
  document.head.appendChild(style);
}