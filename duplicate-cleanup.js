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
    updateGraph();
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
    updateGraph();
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