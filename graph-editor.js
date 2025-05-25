/* ---------- Core Variables ---------- */
let nodes = [];
let links = [];
let visibleLinks = [];
const nodeById = new Map();
let nextNodeId = 1;

// Centralized filter state
let currentFilters = {
    year: { min: null, max: null },
    focus: { nodeId: null, depth: 1 },
    searchTerm: ''
};

/* ---------- Initialize Data ---------- */
function loadData() {
  return fetch("data.json")
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
    });
}

function saveDataToServer(text) {
  fetch('/save_data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: text
  });
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

/* ---------- SVG Setup ---------- */
const graphDiv = document.getElementById('graph');
let width = graphDiv.clientWidth;
let height = graphDiv.clientHeight;

const svg = d3.select(graphDiv).append('svg')
              .attr('width', width)
              .attr('height', height);

// Zoom and pan
const zoom = d3.zoom()
  .scaleExtent([0.1, 4])
  .on('zoom', event => g.attr('transform', event.transform));

svg.call(zoom).on('dblclick.zoom', null);

// Definitions
const defs = svg.append('defs');
defs.append('marker')
  .attr('id', 'arrow')
  .attr('viewBox', '0 -3 8 6')
  .attr('refX', 28).attr('refY', 0)
  .attr('markerWidth', 10).attr('markerHeight', 10)
  .attr('orient', 'auto')
  .append('path').attr('d', 'M0,-3L8,0L0,3').attr('fill', '#000000');

defs.append('clipPath')
    .attr('id', 'nodeClip')
    .append('circle')
    .attr('r', 22);

const g = svg.append('g');
const linkGroup = g.append('g').attr('class', 'links');
let linkSel = linkGroup.selectAll('path.link');
let linkHitSel = linkGroup.selectAll('path.link-hit');
let labelSel = linkGroup.selectAll('text.label');
const yearLabelGroup = g.append('g').attr('class', 'year-labels').style('display', 'none');
let yearLabelSel = yearLabelGroup.selectAll('text');
let nodeSel = g.selectAll('.node');

/* ---------- Simulation ---------- */
const chargeInput = document.getElementById('chargeRange');
const linkInput = document.getElementById('linkRange');
const layoutSelect = document.getElementById('layoutSelect');
let layoutMode = layoutSelect.value;
const tierSpacing = 100;
const yearSpacing = 60;

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink().id(d => d.id).distance(() => +linkInput.value))
  .force('charge', d3.forceManyBody().strength(() => +chargeInput.value).distanceMax(1000000))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(40))
  .alphaDecay(0.001)
  .on('tick', ticked);

/* ---------- Tick Function ---------- */
function ticked() {
  const r = 22;
  const pathD = d => {
    const dx = d.target.x - d.source.x,
          dy = d.target.y - d.source.y,
          dist = Math.hypot(dx, dy) || 1,
          tEnd = (dist - r) / dist;
    return `M${d.source.x},${d.source.y}L${d.source.x + dx*tEnd},${d.source.y + dy*tEnd}`;
  };

  linkSel.attr('d', pathD);
  linkHitSel.attr('d', pathD);
  nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
  
  // Position node labels to avoid overlapping edges
  const incident = new Map();
  (visibleLinks || []).forEach(l => {
    const src = nodeById.get(l.id1),
          tgt = nodeById.get(l.id2);
    if (!src || !tgt || !src.x || !tgt.x) return;

    const a = Math.atan2(tgt.y - src.y, tgt.x - src.x);
    (incident.get(src.id) || incident.set(src.id, []).get(src.id)).push(a);
    (incident.get(tgt.id) || incident.set(tgt.id, []).get(tgt.id)).push(a + Math.PI);
  });

  const slots = Array.from({length:8}, (_,i) => i*Math.PI/4);
  const labelRadius = 28;

  nodeSel.select('text').each(function(d) {
    const edges = incident.get(d.id) || [];
    let bestAng = 0, bestScore = -1;
    slots.forEach(s => {
      const score = edges.length
        ? Math.min(...edges.map(e => Math.abs(Math.atan2(Math.sin(s-e), Math.cos(s-e)))))
        : Math.PI;
      if (score > bestScore) { bestScore = score; bestAng = s; }
    });

    const tx = Math.cos(bestAng) * labelRadius,
          ty = Math.sin(bestAng) * labelRadius;

    d3.select(this)
      .attr('x', tx)
      .attr('y', ty)
      .attr('dominant-baseline', 'central')
      .attr('text-anchor',
            Math.abs(Math.cos(bestAng)) < 0.3 ? 'middle' :
            (Math.cos(bestAng) > 0 ? 'start' : 'end'));
  });
    
  // Position edge labels
  const delta = 10;
  const fracToTgt = 0.65;

  labelSel.each(function (d) {
    if (!d.source || !d.target || typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return;
    const forward = d.source.id < d.target.id;
    const s = forward ? d.source : d.target;
    const t = forward ? d.target : d.source;
    const dx = t.x - s.x,
          dy = t.y - s.y,
          dist = Math.hypot(dx, dy) || 1,
          px = -dy / dist,
          py = dx / dist,
          dir = forward ? 1 : -1;

    const lx = d.source.x + (d.target.x - d.source.x) * fracToTgt;
    const ly = d.source.y + (d.target.y - d.source.y) * fracToTgt;

    d.cx = lx + delta * px * dir;
    d.cy = ly + delta * py * dir;
  })
  .attr('x', d => d.cx)
  .attr('y', d => d.cy)
  .attr('text-anchor', 'middle')
  .attr('dominant-baseline', 'central')
  .attr('transform', d => {
    if (!d.source || !d.target || typeof d.source.x === 'undefined' || typeof d.target.x === 'undefined') return '';
    let ang = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
    if (ang > 90 || ang < -90) ang += 180;
    return `rotate(${ang},${d.cx},${d.cy})`;
  });
}

/* ---------- Helper Functions ---------- */
function formatNodeLabel(n) {
  return (n.birth_year !== undefined && n.birth_year !== null && n.birth_year !== '')
         ? `${n.name} (${n.birth_year})`
         : n.name;
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
    const items = groups.get(y).sort((a,b) => a.name.localeCompare(b.name))
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

/* ---------- Data Export ---------- */
const exportArea = document.getElementById('export');
const saveStatus = document.getElementById('saveStatus');

exportArea.addEventListener('click', () => {
  navigator.clipboard.writeText(exportArea.value)
    .then(() => {
      exportArea.classList.remove('unsaved');
      saveStatus.className = 'status-indicator status-saved';
      saveStatus.innerHTML = '✓ Copied to clipboard';
      setTimeout(() => {
        saveStatus.innerHTML = '✓ Saved';
      }, 2000);
    });
});

function refreshExport(markDirty = true) {
  const exportData = JSON.stringify({
    nodes: nodes.map(n => {
      const obj = { id: n.id, name: n.name };
      if (n.birth_year !== undefined && n.birth_year !== null && n.birth_year !== '') obj.birth_year = n.birth_year;
      obj.images = n.images ? n.images.slice() : [];
      return obj;
    }),
    links
  }, null, 2);
  
  exportArea.value = exportData;
  
  if (markDirty) {
    exportArea.classList.add('unsaved');
    saveStatus.className = 'status-indicator status-unsaved';
    saveStatus.innerHTML = '⚠ Saving...';
    
    // Auto-save to server if available
    if (typeof saveDataToServer === 'function') {
      saveDataToServer(exportData);
      // Show saved status after a brief delay
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

/* ---------- Layout Functions ---------- */
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

  const rows = new Map();
  nodes.forEach(n => {
    const y = parseInt(n.birth_year, 10);
    const key = isNaN(y) ? 'unknown' : y;
    if (!rows.has(key)) rows.set(key, []);
    rows.get(key).push(n);
  });

  rows.forEach((row, key) => {
    row.forEach((n, i) => {
      const yr = parseInt(n.birth_year, 10);
      const line = isNaN(yr) ? maxYear + 1 : yr;
      n.x = tierSpacing + i * 150;
      n.y = (line - minYear) * yearSpacing + 40;
    });
  });

  const labelData = Array.from(rows.keys()).map(k => ({
    key: k,
    line: isNaN(parseInt(k,10)) ? maxYear + 1 : parseInt(k,10)
  }));
  
  yearLabelSel = yearLabelGroup.selectAll('text').data(labelData, d => d.key)
    .join('text')
      .text(d => d.key === 'unknown' ? 'Unknown' : d.key)
      .attr('text-anchor', 'end');
  yearLabelSel.attr('x', 80)
              .attr('y', d => (d.line - minYear) * yearSpacing + 55);
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
    nodes.forEach(n => {
      n.fx = n.x;
      n.fy = n.y;
    });
    ticked();
  } else if (layoutMode === 'force') {
    simulation.force('tier', null);
    yearLabelGroup.style('display', 'none');
    if (restartAlpha) simulation.alpha(1).restart();
    else if (simulation.alpha() < 0.1) simulation.alphaTarget(0.1).restart();
  }
}

/* ---------- Graph Update ---------- */
function updateGraph(skipSelectUpdate = false, highlightIdx = null, markDirty = true) {
  nodeSel = g.selectAll('.node').data(nodes, d => d.id)
    .join(
      enter => {
        const nodeG = enter.append('g').attr('class', 'node')
          .on('click', (event,d) => {
            event.stopPropagation();
            openNodePopup(d.id, event.pageX, event.pageY);
          })
          .on('dblclick', (event,d) => {
            event.stopPropagation();
            if(currentFilters.focus.nodeId === d.id) {
              setFocus(null, 1);
            } else {
              setFocus(d.id, currentFilters.focus.depth);
            }
          })
          .call(d3.drag().on('start', dragstarted)
                       .on('drag', dragged)
                       .on('end', dragended));

        nodeG.append('circle').attr('r', 22);
        nodeG.append('image').attr('class','node-image')
             .attr('clip-path','url(#nodeClip)')
             .attr('x',-22).attr('y',-22)
             .attr('width',44).attr('height',44)
             .attr('href', d => d.image || '')
             .style('display', d => d.image ? null : 'none');
        nodeG.append('text').attr('dominant-baseline', 'central')
			 .text(d => formatNodeLabel(d))
			 .style('cursor', 'pointer')
			 .on('click', (event, d) => {
			   event.stopPropagation();
			   openNodePopup(d.id, event.pageX, event.pageY);
			 });
        return nodeG;
      },
      update => update.each(function(d) {
        const n = d3.select(this);
        n.on('click', (event) => {
          event.stopPropagation();
          openNodePopup(d.id, event.pageX, event.pageY);
        })
        .on('dblclick', (event) => {
          event.stopPropagation();
          if(currentFilters.focus.nodeId === d.id) {
            setFocus(null, 1);
          } else {
            setFocus(d.id, currentFilters.focus.depth);
          }
        });
        n.select('text').text(formatNodeLabel(d));
        n.select('image.node-image')
         .attr('href', d.image || '')
         .style('display', d.image ? null : 'none');
      }),
      exit => exit.remove()
    );

  simulation.nodes(nodes); 

  if (!skipSelectUpdate) populateSelects();
  refreshExport(markDirty);
  
  applyAllFiltersAndRefresh(true);

  if (highlightIdx !== null) {
    linkSel.filter(d_sim => links.indexOf(d_sim.link) === highlightIdx)
           .classed('highlight', true)
           .transition().delay(10000)
           .on('end', function () { d3.select(this).classed('highlight', false); });
  }
}

/* ---------- Event Handlers ---------- */

// Drag handlers
function dragstarted(event, d) {
  if(layoutMode === 'force') {
    if(d.id === currentFilters.focus.nodeId) return;
    if(!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
    // Clear momentum when dragging starts
    d.vx = 0; d.vy = 0;
  }
}

function dragged(event, d) {
  if(layoutMode === 'force') {
    if(d.id === currentFilters.focus.nodeId) return;
    d.fx = event.x; d.fy = event.y;
  } else {
    if(d.id === currentFilters.focus.nodeId) return;
    d.x = event.x; d.y = event.y;
    ticked();
  }
}

function dragended(event, d) {
  if(layoutMode === 'force') {
    if(d.id === currentFilters.focus.nodeId) return;
    if(!event.active) simulation.alphaTarget(0);
    if (d.id !== currentFilters.focus.nodeId) {
      d.fx = null; d.fy = null;
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

/* ---------- Popup Management ---------- */
let edgePopupLink = null;
let nodePopupId = null;

function openEdgePopup(linkObj, x, y) {
  hideNodePopup(); // Close other popup first
  const popup = document.getElementById('edgePopup');
  const label = document.getElementById('edgePopupLabel');
  
  edgePopupLink = linkObj;
  label.value = linkObj.label || '';
  popup.style.left = (x + 5) + 'px';
  popup.style.top = (y + 5) + 'px';
  popup.style.display = 'block';
}

function edgeMenu(event, d) {
  if (event.detail > 1) return; 
  event.stopPropagation();
  if (!d || !d.link) return;
  openEdgePopup(d.link, event.pageX, event.pageY);
}

function hideEdgePopup() {
  document.getElementById('edgePopup').style.display = 'none';
  edgePopupLink = null;
}

function openNodePopup(id, x, y) {
  hideEdgePopup(); // Close other popup first
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

function moveImage(idx, delta) {
  const n = nodeById.get(nodePopupId);
  if(!n) return;
  const imgs = n.images;
  const newIdx = idx + delta;
  if(newIdx < 0 || newIdx >= imgs.length) return;
  [imgs[idx], imgs[newIdx]] = [imgs[newIdx], imgs[idx]];
  n.image = imgs[0] || null;
  renderNodeImages(n);
  updateGraph();
}

function removeImage(idx) {
  const n = nodeById.get(nodePopupId);
  if(!n) return;
  
  // Delete image from server
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

/* ---------- UI Controls ---------- */
document.getElementById('perturb').addEventListener('click', () => {
  nodes.forEach(n => {
    n.x += (Math.random()-0.5)*40;
    n.y += (Math.random()-0.5)*40;
  });
  if (layoutMode === 'force') simulation.alpha(0.8).restart();
  else ticked();
});

document.getElementById('dampen').addEventListener('click', () => {
  nodes.forEach(n => {
    n.vx = (n.vx || 0) * 0.5;
    n.vy = (n.vy || 0) * 0.5;
  });
});

chargeInput.addEventListener('input', e => {
  simulation.force('charge').strength(+e.target.value);
  if (layoutMode === 'force') simulation.alpha(0.8).restart(); 
  else ticked();
});

linkInput.addEventListener('input', e => {
  simulation.force('link').distance(+e.target.value);
  if (layoutMode === 'force') simulation.alpha(0.8).restart(); 
  else ticked();
});

layoutSelect.addEventListener('change', e => {
  layoutMode = e.target.value;
  applyLayoutForces();
  applyAllFiltersAndRefresh(true);
});

// Enter key handlers for adding nodes
document.getElementById('newNodeName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addNodeBtn').click();
  }
});

document.getElementById('newNodeYear').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addNodeBtn').click();
  }
});

// Enter key handler for adding relationships
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

// Clear focus button
document.getElementById('clearFocus').addEventListener('click', () => {
  focusedNodeId = null;
  focusedConnections = [];
  document.getElementById('focusLabel').textContent = 'No author focused';
  document.getElementById('clearFocus').style.display = 'none';
  document.getElementById('focusBox').style.display = 'none';
  updateGraph();
});

// Add node functionality
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

document.getElementById('addNodeBtn').addEventListener('click', addNode);
document.getElementById('newNodeName').addEventListener('keydown', e => {
  if (e.key === 'Enter') addNode();
});
document.getElementById('newNodeYear').addEventListener('keydown', e => {
  if (e.key === 'Enter') addNode();
});

// Add edge functionality
document.getElementById('addEdgeBtn').addEventListener('click', () => {
  const id1 = parseInt(document.getElementById('edgeFrom').value, 10);
  const id2 = parseInt(document.getElementById('edgeTo').value, 10);
  const lbl = $('#edgeLabel').val() || '';

  if (isNaN(id1) || isNaN(id2) || id1 === id2) return;
  
  links.push({ id1, id2, label: lbl });
  // Don't clear the label - keep it for convenience
  updateGraph(true, links.length - 1);
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
  if (year === '') delete n.birth_year; 
  else n.birth_year = year;
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

// Paste image handling
document.addEventListener('paste', async e => {
  if(nodePopupId === null) return;
  const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
  if(!item) return;
  const file = item.getAsFile();
  
  // Upload to server
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
        // Reload data to get the updated image path
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

// Responsive sidebar toggle
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.querySelector('.sidebar-toggle');

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}

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
      break;
  }
});

/* ---------- Filter Functions ---------- */
function highlightSearch() {
  const term = currentFilters.searchTerm;
  nodeSel.classed('search-match', d => term !== '' && d.name.toLowerCase().includes(term));
}

function updateHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  if(currentFilters.focus.nodeId !== null) {
    params.set('focus', currentFilters.focus.nodeId);
    params.set('depth', currentFilters.focus.depth);
  } else {
    params.delete('focus');
    params.delete('depth');
  }
  history.replaceState(null, '', '#'+params.toString());
}

function setFocus(nodeId, depth) {
  const oldFocusNodeId = currentFilters.focus.nodeId;
  if (oldFocusNodeId && nodeById.has(oldFocusNodeId)) {
    const oldNode = nodeById.get(oldFocusNodeId);
    if (oldNode) {
       oldNode.fx = null;
       oldNode.fy = null;
    }
  }

  currentFilters.focus.nodeId = nodeId;
  currentFilters.focus.depth = nodeId === null ? 1 : parseInt(depth, 10);

  const focusBox = document.getElementById('focusBox');
  const focusLabel = document.getElementById('focusLabel');
  const focusRange = document.getElementById('focusRange');
  const focusNum = document.getElementById('focusNum');

  if (nodeId !== null) {
    const node = nodeById.get(nodeId);
    if (node) {
      focusLabel.textContent = `Focused: ${node.name}`;
      focusBox.style.display = 'block';
      focusRange.value = currentFilters.focus.depth;
      focusNum.textContent = currentFilters.focus.depth;
    } else { 
      currentFilters.focus.nodeId = null; 
      focusBox.style.display = 'none';
    }
  } else {
    focusLabel.textContent = 'No author focused';
    focusBox.style.display = 'none';
  }
  updateHash(); 
  applyAllFiltersAndRefresh(); 
}

function applyAllFiltersAndRefresh(restartSimForcefully = false) {
  let visibleNodeIds = new Set(nodes.map(n => n.id));

  // Apply Year Filter
  const yearSlider = document.getElementById('yearSlider');
  if (yearSlider.noUiSlider && currentFilters.year.min !== null && currentFilters.year.max !== null) {
    const [minY, maxY] = [currentFilters.year.min, currentFilters.year.max];
    let yearFilteredNodes = new Set();
    nodes.forEach(n => {
      const y = parseInt(n.birth_year, 10);
      if (isNaN(y) || (y >= minY && y <= maxY)) {
        yearFilteredNodes.add(n.id);
      }
    });
    visibleNodeIds = yearFilteredNodes;
  }

  // Apply Focus Filter
  let isFocusActive = false;
  let finalVisibleNodeIds = new Set(visibleNodeIds);

  if (currentFilters.focus.nodeId !== null && nodeById.has(currentFilters.focus.nodeId)) {
    const focusNodeObject = nodeById.get(currentFilters.focus.nodeId);
    if (visibleNodeIds.has(currentFilters.focus.nodeId)) {
      isFocusActive = true;
      const focusNeighborhood = new Set([currentFilters.focus.nodeId]);
      let frontier = [currentFilters.focus.nodeId];
      const allNodeIdsInData = new Set(nodes.map(n => n.id));

      for (let i = 0; i < currentFilters.focus.depth; i++) {
        const nextFrontier = [];
        frontier.forEach(id => {
          links.forEach(l => {
            if (l.id1 === id || l.id2 === id) {
              const other = (l.id1 === id) ? l.id2 : l.id1;
              if (allNodeIdsInData.has(other) && !focusNeighborhood.has(other)) {
                focusNeighborhood.add(other);
                nextFrontier.push(other);
              }
            }
          });
        });
        frontier = nextFrontier;
      }
      finalVisibleNodeIds = new Set([...visibleNodeIds].filter(id => focusNeighborhood.has(id)));
    }
  }
  
  // Unpin all nodes first, then pin the focus node if active and visible
  nodes.forEach(n => {
    if (layoutMode === 'force') {
       n.fx = null; n.fy = null;
    }
  });

  if (isFocusActive && finalVisibleNodeIds.has(currentFilters.focus.nodeId)) {
    const focusNodeObject = nodeById.get(currentFilters.focus.nodeId);
    if (focusNodeObject && (layoutMode === 'force')) {
      focusNodeObject.fx = focusNodeObject.x; 
      focusNodeObject.fy = focusNodeObject.y;
    }
  }

  // Update Node Selections and Styles
  nodeSel.style('display', d => finalVisibleNodeIds.has(d.id) ? null : 'none');
  nodeSel.classed('focus-node', d => isFocusActive && d.id === currentFilters.focus.nodeId && finalVisibleNodeIds.has(d.id));

  // Determine Global visibleLinks
  visibleLinks = links.filter(l => finalVisibleNodeIds.has(l.id1) && finalVisibleNodeIds.has(l.id2));

  // Refresh Link Selections
  let needsStrongRestart = restartSimForcefully || (layoutMode === 'force' && (isFocusActive || currentFilters.focus.nodeId === null));
  refreshLinks(needsStrongRestart); 

  // Style Focused Edges
  linkSel.classed('focus-edge', false); 
  if (isFocusActive && finalVisibleNodeIds.has(currentFilters.focus.nodeId)) {
    linkSel.filter(d_sim => d_sim.link && (d_sim.link.id1 === currentFilters.focus.nodeId || d_sim.link.id2 === currentFilters.focus.nodeId))
           .classed('focus-edge', true);
  }

  // Apply search term highlighting
  highlightSearch();

  // If layout is static and sim wasn't restarted, ensure positions are updated
  if (!needsStrongRestart && layoutMode === 'tiers') {
    ticked();
  }
}

function setupSearchAndFilter() {
  const years = nodes.map(n => parseInt(n.birth_year, 10)).filter(y => !isNaN(y));
  const yearSlider = document.getElementById('yearSlider');
  
  if(years.length) {
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
	  range: {min: minY, max: maxY}, 
	  tooltips: [true, true],
	  format: {to: v => Math.round(v), from: v => +v},
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
    });
  } else {
    yearSlider.style.display = 'none';
  }

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    currentFilters.searchTerm = searchInput.value.trim().toLowerCase();
    applyAllFiltersAndRefresh(false);
  });

  const focusRange = document.getElementById('focusRange');
  focusRange.addEventListener('input', () => {
    const newDepth = parseInt(focusRange.value, 10);
    if(currentFilters.focus.nodeId !== null) {
      setFocus(currentFilters.focus.nodeId, newDepth);
    } else {
      currentFilters.focus.depth = newDepth;
      document.getElementById('focusNum').textContent = newDepth;
    }
  });
}

function refreshLinks(restartSim = true) {
  const simLinks = buildSimLinks(visibleLinks);

  linkSel = linkGroup.selectAll('path.link').data(simLinks, d => links.indexOf(d.link))
    .join(
      enter => enter.append('path').attr('class','link')
                   .attr('stroke','#64748b').attr('stroke-width',1.5)
                   .attr('marker-end','url(#arrow)')
                   .on('click', edgeMenu),
      update => update,
      exit => exit.remove()
    );

  linkHitSel = linkGroup.selectAll('path.link-hit').data(simLinks, d => links.indexOf(d.link))
    .join(
      enter => enter.append('path').attr('class','link-hit').on('click', edgeMenu),
      update => update,
      exit => exit.remove()
    );

  labelSel = linkGroup.selectAll('text.label').data(simLinks, d => links.indexOf(d.link))
  .join(
    enter => enter.append('text').attr('class','label')
                  .text(d => d.label)
                  .on('dblclick', (event,d) => {
                    event.stopPropagation();
                    openEdgePopup(d.link, event.pageX, event.pageY);
                  })
                  .on('click', edgeMenu),
    update => update.text(d => d.label),
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

/* ---------- Initialization ---------- */
function initialize() {
  // Show loading state
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'loading';
  loadingDiv.innerHTML = '<div class="spinner"></div>Loading graph data...';
  graphDiv.appendChild(loadingDiv);

  loadData().then(() => {
    // Remove loading state
    graphDiv.removeChild(loadingDiv);
    
    populateSelects();
    setupSearchAndFilter();
    updateGraph(false, null, false);

    // Parse URL hash for focus
    const params = new URLSearchParams(location.hash.slice(1));
    let initialFocusNodeId = null;
    let initialFocusDepth = 1;

    if (params.has('focus')) {
      initialFocusNodeId = parseInt(params.get('focus'), 10);
      initialFocusDepth = parseInt(params.get('depth') || '1', 10);
    }

    if (initialFocusNodeId !== null && nodeById.has(initialFocusNodeId)) {
      setFocus(initialFocusNodeId, initialFocusDepth);
    } else {
      applyAllFiltersAndRefresh(false);
    }

    // Initial resize check
    setTimeout(handleResize, 100);
  }).catch(error => {
    console.error('Failed to load data:', error);
    // Remove loading state
    graphDiv.removeChild(loadingDiv);
    
    // Show error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'loading';
    errorDiv.innerHTML = `<div style="color: var(--danger-color);">Error: Failed to load data.json<br><small>${error.message}</small></div>`;
    graphDiv.appendChild(errorDiv);
  });
}

// Initialize select2 after DOM is ready
$(document).ready(() => {
  // Enhanced select2 configuration
  $(document).on('select2:open', function() {
    const searchField = document.querySelector('.select2-container--open .select2-search__field');
    if (searchField) searchField.focus();
  });
  
  // Initialize Select2 for relationship type with tags
  $('#edgeLabel').select2({
    tags: true,
    width: '100%',
    placeholder: 'Relationship type',
    data: [
      'influenced by',
      'inspired by',
      'mentored by',
      'mentored',
      'collaborated with',
      'friend of',
      'contemporary of',
      'studied under',
      'rival of',
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

// Export some functions for console debugging
window.graphEditor = {
  setFocus,
  addNode,
  nodes,
  links,
  currentFilters,
  simulation
};

// Add styles for image actions dynamically if not present
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