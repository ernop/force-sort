/* ---------- Duplicate Data Cleanup Functions ---------- */

function checkForDuplicates() {
  // Check for duplicate links
  const duplicateLinks = [];
  const linkSet = new Set();
  
  links.forEach((link, index) => {
    const key = `${Math.min(link.id1, link.id2)}-${Math.max(link.id1, link.id2)}-${link.label.toLowerCase().trim()}`;
    if (linkSet.has(key)) {
      duplicateLinks.push(index);
    } else {
      linkSet.add(key);
    }
  });
  
  // Check for duplicate nodes
  const nameMap = new Map();
  nodes.forEach(n => {
    const key = n.name.toLowerCase().trim();
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key).push(n);
  });
  
  const duplicateNodes = [];
  nameMap.forEach((nodeList) => {
    if (nodeList.length > 1) {
      duplicateNodes.push(nodeList);
    }
  });
  
  // Update UI
  updateDuplicateUI(duplicateLinks.length, duplicateNodes.length);
}

function updateDuplicateUI(linkCount, nodeCount) {
  const statusEl = document.getElementById('duplicateStatus');
  if (!statusEl) return;
  
  if (linkCount > 0 || nodeCount > 0) {
    statusEl.innerHTML = `⚠️ ${linkCount} duplicate edges, ${nodeCount} duplicate authors`;
    statusEl.style.color = '#dc2626';
  } else {
    statusEl.innerHTML = '✓ No duplicates';
    statusEl.style.color = '#22c55e';
  }
}

function removeDuplicateEdges() {
  const seen = new Set();
  const toRemove = [];
  
  links.forEach((link, index) => {
    const key = `${Math.min(link.id1, link.id2)}-${Math.max(link.id1, link.id2)}-${link.label.toLowerCase().trim()}`;
    if (seen.has(key)) {
      toRemove.push(index);
    } else {
      seen.add(key);
    }
  });
  
  // Remove from end to start to maintain indices
  for (let i = toRemove.length - 1; i >= 0; i--) {
    links.splice(toRemove[i], 1);
  }
  
  if (toRemove.length > 0) {
    redrawGraph();
  saveToServer();
    checkForDuplicates(); // Refresh duplicate status
    alert(`Removed ${toRemove.length} duplicate edges`);
  } else {
    alert('No duplicate edges found');
  }
}

function mergeDuplicateNodes() {
  const nameMap = new Map();
  nodes.forEach(n => {
    const key = n.name.toLowerCase().trim();
    if (!nameMap.has(key)) {
      nameMap.set(key, []);
    }
    nameMap.get(key).push(n);
  });
  
  let mergeCount = 0;
  nameMap.forEach((nodeList) => {
    if (nodeList.length > 1) {
      // Keep the first node, merge others into it
      const keepNode = nodeList[0];
      for (let i = 1; i < nodeList.length; i++) {
        const removeNode = nodeList[i];
        
        // Transfer all edges
        links.forEach(link => {
          if (link.id1 === removeNode.id) link.id1 = keepNode.id;
          if (link.id2 === removeNode.id) link.id2 = keepNode.id;
        });
        
        // Merge images
        if (removeNode.images && removeNode.images.length > 0) {
          if (!keepNode.images) keepNode.images = [];
          removeNode.images.forEach(img => {
            if (!keepNode.images.includes(img)) {
              keepNode.images.push(img);
            }
          });
          keepNode.image = keepNode.images[0] || null;
        }
        
        // Remove the duplicate node
        const idx = nodes.findIndex(n => n.id === removeNode.id);
        if (idx !== -1) {
          nodes.splice(idx, 1);
          nodeById.delete(removeNode.id);
          mergeCount++;
        }
      }
    }
  });
  
  if (mergeCount > 0) {
    // Clean up any duplicate edges created by merging
    removeDuplicateEdges();
    redrawGraph();
  saveToServer();
    alert(`Merged ${mergeCount} duplicate authors`);
  } else {
    alert('No duplicate authors found');
  }
}

// Export functions to global scope
window.graphEditor = window.graphEditor || {};
window.graphEditor.checkForDuplicates = checkForDuplicates;
window.graphEditor.updateDuplicateUI = updateDuplicateUI;
window.graphEditor.removeDuplicateEdges = removeDuplicateEdges;
window.graphEditor.mergeDuplicateNodes = mergeDuplicateNodes;

function reviewAndRemoveDuplicateEdges() {
  // Group edges by their connection (considering direction)
  const edgeGroups = new Map();
  
  links.forEach((link, index) => {
    // Use directed key (id1->id2 is different from id2->id1)
    const key = `${link.id1}->${link.id2}`;
    if (!edgeGroups.has(key)) {
      edgeGroups.set(key, []);
    }
    edgeGroups.get(key).push({ link, index });
  });
  
  // Find groups with duplicates
  const duplicateGroups = [];
  edgeGroups.forEach((group, key) => {
    if (group.length > 1) {
      const [sourceId, targetId] = key.split('->').map(id => parseInt(id, 10));
      const sourceNode = nodeById.get(sourceId);
      const targetNode = nodeById.get(targetId);
      
      duplicateGroups.push({
        key,
        source: sourceNode ? sourceNode.name : `Unknown (${sourceId})`,
        target: targetNode ? targetNode.name : `Unknown (${targetId})`,
        edges: group
      });
    }
  });
  
  if (duplicateGroups.length === 0) {
    alert('No duplicate edges found!');
    return;
  }
  
  // Create a review dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 10000;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  `;
  
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 9999;
  `;
  
  let html = `
    <h2 style="margin: 0 0 20px 0; color: #1e293b;">Review Duplicate Edges</h2>
    <p style="color: #64748b; margin-bottom: 20px;">Found ${duplicateGroups.length} sets of duplicate edges. Choose which to keep:</p>
  `;
  
  const selections = new Map();
  
  duplicateGroups.forEach((group, groupIndex) => {
    html += `
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-bottom: 15px; background: #f8fafc;">
        <div style="font-weight: 600; margin-bottom: 10px; color: #1e293b;">
          ${group.source} → ${group.target}
        </div>
        <div style="font-size: 14px; color: #64748b; margin-bottom: 10px;">
          ${group.edges.length} duplicate edges:
        </div>
    `;
    
    // Group by label to make selection easier
    const labelGroups = new Map();
    group.edges.forEach(edge => {
      const label = edge.link.label;
      if (!labelGroups.has(label)) {
        labelGroups.set(label, []);
      }
      labelGroups.get(label).push(edge);
    });
    
    let optionIndex = 0;
    labelGroups.forEach((edges, label) => {
      const count = edges.length;
      const radioName = `group_${groupIndex}`;
      const isFirst = optionIndex === 0;
      
      // Default to keeping the first unique label
      if (isFirst) {
        selections.set(group.key, edges[0].index);
      }
      
      html += `
        <label style="display: block; margin: 5px 0; padding: 8px; background: white; border-radius: 4px; cursor: pointer; border: 1px solid ${isFirst ? '#2563eb' : '#e2e8f0'};">
          <input type="radio" name="${radioName}" value="${edges[0].index}" ${isFirst ? 'checked' : ''} 
                 onchange="this.parentElement.parentElement.querySelectorAll('label').forEach(l => l.style.borderColor = '#e2e8f0'); this.parentElement.style.borderColor = '#2563eb';">
          <span style="margin-left: 8px; font-weight: 500;">"${label}"</span>
          ${count > 1 ? `<span style="color: #ef4444; font-size: 12px; margin-left: 8px;">(${count} copies)</span>` : ''}
        </label>
      `;
      optionIndex++;
    });
    
    html += `</div>`;
  });
  
  html += `
    <div style="display: flex; gap: 10px; margin-top: 20px;">
      <button id="applyDuplicateRemoval" style="flex: 1; padding: 10px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Remove Duplicates
      </button>
      <button id="cancelDuplicateRemoval" style="flex: 1; padding: 10px; background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-weight: 600;">
        Cancel
      </button>
    </div>
  `;
  
  dialog.innerHTML = html;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(dialog);
  
  // Handle radio changes
  dialog.addEventListener('change', (e) => {
    if (e.target.type === 'radio') {
      const groupIndex = parseInt(e.target.name.split('_')[1], 10);
      const group = duplicateGroups[groupIndex];
      selections.set(group.key, parseInt(e.target.value, 10));
    }
  });
  
  // Handle button clicks
  document.getElementById('applyDuplicateRemoval').addEventListener('click', () => {
    const toKeep = new Set(Array.from(selections.values()));
    const toRemove = [];
    
    // Find all edges to remove
    duplicateGroups.forEach(group => {
      group.edges.forEach(edge => {
        if (!toKeep.has(edge.index)) {
          toRemove.push(edge.index);
        }
      });
    });
    
    // Sort in descending order to maintain indices while removing
    toRemove.sort((a, b) => b - a);
    
    // Remove the edges
    toRemove.forEach(index => {
      links.splice(index, 1);
    });
    
    // Clean up UI
    document.body.removeChild(backdrop);
    document.body.removeChild(dialog);
    
    // Update graph and force save
    redrawGraph();
  saveToServer();
    checkForDuplicates();
    
    alert(`Removed ${toRemove.length} duplicate edges!`);
  });
  
  document.getElementById('cancelDuplicateRemoval').addEventListener('click', () => {
    document.body.removeChild(backdrop);
    document.body.removeChild(dialog);
  });
  
  // Close on backdrop click
  backdrop.addEventListener('click', () => {
    document.body.removeChild(backdrop);
    document.body.removeChild(dialog);
  });
}

// Export the new function
window.graphEditor.reviewAndRemoveDuplicateEdges = reviewAndRemoveDuplicateEdges;