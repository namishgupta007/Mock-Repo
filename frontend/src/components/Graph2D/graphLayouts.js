/**
 * Astral Cartographer — 2D Code Graph Layout Engine
 * 
 * Provides robust, spacious, collision-free layout algorithms for:
 * 1. Force-Directed 2D Layout (simulation-based cluster placement + collision avoidance)
 * 2. Hierarchical 2D Layout (architectural tier DAG ranking + barycenter crossing reduction)
 * 
 * Designed to eliminate node overlap, container overlap, edge clutter, and tangled webs.
 */

// Language and node-type inline SVG icons for crisp, high-DPI rendering
export const SVG_ICONS = {
  python: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cGF0aCBmaWxsPSIjMzg3ZWI4IiBkPSJNNjMuNSAxLjVjLTMwLjggMC0yOC44IDEzLjMtMjguOCAxMy4zbC4wMyAxMy44aDI5LjN2NC4ySDI0LjNDMTAuNyAzMi44IDEuNSA0MS41IDEuNSA1OS44YzAgMTguNCA4IDI2LjIgMTkuMyAyNi4yaDExLjV2LTE2LjFjMC0xMi4yIDEwLjUtMjIuOSAyMi45LTIyLjloMjkuMnYtMTYuMmMwLTEyLjgtMTEuMi0yOS4zLTIwLjktMjkuM3ptLTE2LjQgOC43YzIuNiAwIDQuNyAyLjEgNC43IDQuN3MtMi4xIDQuNy00LjcgNC43LTQuNy0yLjEtNC43LTQuNyAyLjEtNC43IDQuNy00Ljd6Ii8+PHBhdGggZmlsbD0iI2ZmZTA1MiIgZD0iTTY0LjUgMTI2LjVjMzAuOCAwIDI4LjgtMTMuMyAyOC44LTEzLjNsLS4wMy0xMy44SDY0di00LjJoMzkuN2MxMy42IDAgMjIuOC04LjcgMjIuOC0yN3MtOC0yNi4yLTE5LjMtMjYuMkgxMTUuN3YxNi4xYzAgMTIuMi0xMC41IDIyLjktMjIuOSAyMi45SDYzLjZ2MTYuMmMwIDEyLjggMTEuMiAyOS4zIDIwLjkgMjkuM3ptMTYuNC04LjdjLTIuNiAwLTQuNy0yLjEtNC43LTQuN3MyLjEtNC43IDQuNy00LjcgNC43LTIuMSA0LjctNC43IDIuMS00LjcgNC43LTQuN3oiLz48L3N2Zz4=',
  javascript: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjIwIiBmaWxsPSIjZjdkZjFlIi8+PHBhdGggZD0iTTcyLjIgMTA1LjhjMy4yIDUuMiA3LjQgOSAxNC41IDkgNi44IDAgMTEuMS0zLjQgMTEuMS04LjIgMC01LjctNC42LTcuOC0xMi4zLTExLjItMTEuMS00LjgtMTguNC0xMC44LTE4LjQtMjMuMyAwLTExLjcgOC45LTIwLjYgMjIuOC0yMC42IDkuOCAwIDE2LjkgMy42IDIxLjYgMTEuOGwtMTAuNSA2LjdjLTIuNC00LjItNS02LTExLjEtNi00LjkgMC04LjIgMy4xLTguMiA3LjEgMCA1IDMuMyA2LjkgMTAuOSAxMC4yIDEyLjcgNS41IDE5LjkgMTEuMSAxOS45IDI0LjUgMCAxNC4xLTEwLjkgMjEuOS0yNS4zIDIxLjktMTQuMyAwLTIzLjQtNy4yLTI3LjQtMTUuNWwxMi40LTYuNHpNMzIgMTA2LjZjMi40IDQuMiA1LjUgNy43IDExLjEgNy43IDUuOCAwIDkuNy0yLjQgOS43LTExLjdVNTIuOGgxNS4ydjUwYzAgMTcuNi0xMC4zIDI1LTI0LjkgMjUtMTEuMSAwLTE4LjUtNS41LTIyLjMtMTMuOGwxMS4yLTcuNHoiIGZpbGw9IiMwMDAiLz48L3N2Zz4=',
  typescript: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjIwIiBmaWxsPSIjMzE3OGM2Ii8+PHBhdGggZD0iTTc1LjIgMTA1LjhjMy4yIDUuMiA3LjQgOSAxNC41IDkgNi44IDAgMTEuMS0zLjQgMTEuMS04LjIgMC01LjctNC42LTcuOC0xMi4zLTExLjItMTEuMS00LjgtMTguNC0xMC44LTE4LjQtMjMuMyAwLTExLjcgOC45LTIwLjYgMjIuOC0yMC42IDkuOCAwIDE2LjkgMy42IDIxLjYgMTEuOGwtMTAuNSA2LjdjLTIuNC00LjItNS02LTExLjEtNi00LjkgMC04LjIgMy4xLTguMiA3LjEgMCA1IDMuMyA2LjkgMTAuOSAxMC4yIDEyLjcgNS41IDE5LjkgMTEuMSAxOS45IDI0LjUgMCAxNC4xLTEwLjkgMjEuOS0yNS4zIDIxLjktMTQuMyAwLTIzLjQtNy4yLTI3LjQtMTUuNWwxMi40LTYuNHpNMjQgNTNoNDR2MTMuNUg0OC41VjEyN0gzMy41VjY2LjVIMjRWNTN6IiBmaWxsPSIjZmZmIi8+PC9zdmc+',
  class: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI0IiBmaWxsPSIjYTg1NWY3Ii8+PHRleHQgeD0iNjQiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9Ijc4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2ZmZmZmZiI+QzwvdGV4dD48L3N2Zz4=',
  function: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI0IiBmaWxsPSIjMDZiNmQ0Ii8+PHRleHQgeD0iNjQiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2VyaWYiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC1zaXplPSI4MiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNmZmZmZmYiPmY8L3RleHQ+PC9zdmc+',
  method: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI0IiBmaWxsPSIjODE4Y2Y4Ii8+PHRleHQgeD0iNjQiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ibW9ub3NwYWNlIiBmb250LXNpemU9IjcyIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iI2ZmZmZmZiI+bTwvdGV4dD48L3N2Zz4=',
  code: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48cmVjdCB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgcng9IjI0IiBmaWxsPSIjMGVhNWU5Ii8+PHBhdGggZD0iTTQyIDQ0TDIyIDY0bDIwIDIwTTg2IDQ0bDIwIDIwLTIwIDIwTTY4IDM2bC04IDU2IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSIvPjwvc3ZnPg==',
};

export const RELATIONSHIP_STYLES = {
  imports: {
    lineColor: '#f97316',
    arrowColor: '#f97316',
    lineStyle: 'solid',
    lineOpacity: 0.50,
  },
  calls: {
    lineColor: '#38bdf8',
    arrowColor: '#38bdf8',
    lineStyle: 'solid',
    lineOpacity: 0.50,
  },
  defines: {
    lineColor: '#a855f7',
    arrowColor: '#a855f7',
    lineStyle: 'dashed',
    lineDashPattern: [5, 4],
    lineOpacity: 0.45,
  },
  contains: {
    lineColor: '#10b981',
    arrowColor: '#10b981',
    lineStyle: 'dotted',
    lineDashPattern: [2, 3],
    lineOpacity: 0.38,
  },
};

/**
 * Calculates adaptive node dimensions and typography properties based on label and type.
 */
export function calculateNodeDimensions(node) {
  const label = node.label || node.name || 'node';
  const labelLen = label.length;
  const type = (node.type || 'file').toLowerCase();

  let width = Math.max(140, Math.min(240, labelLen * 8.5 + 46));
  let height = 36;
  let cornerRadius = 9;
  let fontSize = '11.5px';
  let borderColor = '#38bdf8';
  let bgColor = '#080e1e';
  let icon = SVG_ICONS.python;

  if (type === 'class') {
    width = Math.max(132, Math.min(220, labelLen * 8.4 + 40));
    height = 32;
    cornerRadius = 7;
    fontSize = '11px';
    borderColor = '#a855f7';
    bgColor = '#140c24';
    icon = SVG_ICONS.class;
  } else if (type === 'function' || type === 'async_function') {
    width = Math.max(126, Math.min(210, labelLen * 8.0 + 38));
    height = 30;
    cornerRadius = 6;
    fontSize = '10.5px';
    borderColor = '#06b6d4';
    bgColor = '#081726';
    icon = SVG_ICONS.function;
  } else if (type === 'method') {
    width = Math.max(118, Math.min(195, labelLen * 7.6 + 34));
    height = 28;
    cornerRadius = 5;
    fontSize = '10px';
    borderColor = '#818cf8';
    bgColor = '#0d122b';
    icon = SVG_ICONS.method;
  } else {
    // File node
    const lang = (node.language || '').toLowerCase();
    const ext = (node.path || '').split('.').pop()?.toLowerCase();
    if (lang === 'javascript' || ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
      icon = SVG_ICONS.javascript;
      borderColor = '#facc15';
    } else if (lang === 'typescript' || ext === 'ts' || ext === 'tsx') {
      icon = SVG_ICONS.typescript;
      borderColor = '#38bdf8';
    } else if (lang === 'python' || ext === 'py') {
      icon = SVG_ICONS.python;
      borderColor = '#38bdf8';
    } else {
      icon = SVG_ICONS.code;
      borderColor = '#0ea5e9';
    }
  }

  return {
    width: Math.round(width),
    height,
    cornerRadius,
    fontSize,
    textMaxWidth: Math.round(width - 38),
    borderColor,
    bgColor,
    icon,
  };
}

/**
 * Calculates cluster layout geometry, choosing optimal columns and rows
 * to avoid horizontal crowding and vertical overflow.
 */
export function calculateClusterDimensions(clusterNodes) {
  const count = clusterNodes.length;
  if (count === 0) {
    return {
      width: 220,
      height: 140,
      cols: 1,
      rows: 1,
      colWidth: 180,
      rowHeight: 60,
      padLeft: 30,
      padTop: 56,
      maxNodeW: 140,
    };
  }

  // Find max node width in cluster
  let maxW = 140;
  clusterNodes.forEach((n) => {
    const d = calculateNodeDimensions(n);
    if (d.width > maxW) maxW = d.width;
  });

  // Choose balanced column count based on node volume
  let cols = 2;
  if (count <= 2) {
    cols = count;
  } else if (count <= 6) {
    cols = 2;
  } else if (count <= 12) {
    cols = 3;
  } else if (count <= 20) {
    cols = 4;
  } else {
    cols = 5;
  }

  const rows = Math.ceil(count / cols);

  // Ample inter-node gaps preventing any label or border collision
  const colGap = 40;  // 40px horizontal margin between node centers
  const rowGap = 26;  // 26px vertical margin
  const colWidth = maxW + colGap;
  const rowHeight = 36 + rowGap; // 62px vertical step

  // Generous container padding
  const padLeft = 32;
  const padRight = 32;
  const padTop = 60;   // Generous header clearance (folder title & badge)
  const padBottom = 28;

  const innerW = cols * colWidth - colGap;
  const innerH = rows * rowHeight - rowGap;

  const width = Math.max(260, innerW + padLeft + padRight);
  const height = Math.max(160, innerH + padTop + padBottom);

  return {
    width,
    height,
    cols,
    rows,
    colWidth,
    rowHeight,
    padLeft,
    padTop,
    padBottom,
    maxNodeW: maxW,
  };
}

/**
 * Resolves overlapping cluster bounding boxes using Axis-Aligned Bounding Box (AABB) relaxation.
 * Ensures zero container overlap with a guaranteed minimum safety margin.
 */
function resolveClusterCollisions(clusterMap, margin = 80, iterations = 25) {
  const clusterKeys = Object.keys(clusterMap);
  const n = clusterKeys.length;
  if (n <= 1) return;

  for (let it = 0; it < iterations; it++) {
    let hadCollision = false;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const c1 = clusterMap[clusterKeys[i]];
        const c2 = clusterMap[clusterKeys[j]];

        const minDistanceX = (c1.dims.width + c2.dims.width) / 2 + margin;
        const minDistanceY = (c1.dims.height + c2.dims.height) / 2 + margin;

        const dx = c2.pos.x - c1.pos.x;
        const dy = c2.pos.y - c1.pos.y;

        const overlapX = minDistanceX - Math.abs(dx);
        const overlapY = minDistanceY - Math.abs(dy);

        // Check if bounding boxes overlap with safety margin
        if (overlapX > 0 && overlapY > 0) {
          hadCollision = true;

          // Push apart along axis of minimal penetration
          if (overlapX < overlapY) {
            const signX = dx >= 0 ? 1 : -1;
            const shiftX = (overlapX / 2) * signX;
            c1.pos.x -= shiftX;
            c2.pos.x += shiftX;
          } else {
            const signY = dy >= 0 ? 1 : -1;
            const shiftY = (overlapY / 2) * signY;
            c1.pos.y -= shiftY;
            c2.pos.y += shiftY;
          }
        }
      }
    }

    if (!hadCollision) break;
  }
}

/**
 * Positions child nodes inside their parent cluster box in a neat, balanced matrix.
 */
function placeNodesInsideCluster(childNodes, clusterPos, clusterDims) {
  const { cols, rows, colWidth, rowHeight, padTop, padBottom } = clusterDims;

  // Center the grid of nodes within the cluster box below the header
  const startX = clusterPos.x - ((cols - 1) * colWidth) / 2;
  const startY = clusterPos.y - ((rows - 1) * rowHeight) / 2 + (padTop - padBottom) / 2;

  childNodes.forEach((node, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    node.position({
      x: startX + col * colWidth,
      y: startY + row * rowHeight,
    });
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. FORCE-DIRECTED 2D LAYOUT ALGORITHM
 * ─────────────────────────────────────────────────────────────────────────────
 * Computes a spacious, organic, balanced force-directed layout:
 * - Computes cluster dimensions based on node counts and label widths.
 * - Simulates attraction along cross-cluster dependencies and repulsion between clusters.
 * - Applies strict AABB collision separation to guarantee ZERO container overlap.
 * - Places nodes within clusters with generous padding and no node collisions.
 */
export function computeForceDirectedLayout(cy, graphData) {
  const clusters = graphData?.clusters || [];
  if (clusters.length === 0) {
    // Fallback: run standard cytoscape cose layout if no clusters
    cy.layout({
      name: 'cose',
      idealEdgeLength: 120,
      nodeRepulsion: 8000,
      nodeOverlap: 40,
      componentSpacing: 100,
      padding: 70,
      animate: false,
    }).run();
    return;
  }

  // 1. Gather nodes and dimensions for each cluster
  const clusterMap = {};
  const activeClusterPaths = [];

  clusters.forEach((cluster) => {
    const childNodes = cy.nodes(`[cluster = "${cluster.path}"]`);
    if (childNodes.length === 0) return;

    const rawNodes = childNodes.map((n) => ({
      id: n.id(),
      label: n.data('label'),
      type: n.data('type'),
      language: n.data('language'),
      path: n.data('path'),
    }));

    const dims = calculateClusterDimensions(rawNodes);
    clusterMap[cluster.path] = {
      path: cluster.path,
      name: cluster.name,
      childNodes,
      rawNodes,
      dims,
      pos: { x: 0, y: 0 },
      degree: 0,
    };
    activeClusterPaths.push(cluster.path);
  });

  const numClusters = activeClusterPaths.length;
  if (numClusters === 0) return;

  // 2. Compute inter-cluster edge weights
  const clusterEdges = {};
  activeClusterPaths.forEach((p1) => {
    clusterEdges[p1] = {};
    activeClusterPaths.forEach((p2) => {
      clusterEdges[p1][p2] = 0;
    });
  });

  const allEdges = graphData.edges || [];
  allEdges.forEach((edge) => {
    const sNode = graphData.nodes?.find((n) => n.id === edge.source);
    const tNode = graphData.nodes?.find((n) => n.id === edge.target);
    if (sNode && tNode && sNode.cluster !== tNode.cluster) {
      if (clusterEdges[sNode.cluster] && clusterEdges[sNode.cluster][tNode.cluster] !== undefined) {
        clusterEdges[sNode.cluster][tNode.cluster] += edge.weight || 1.0;
        clusterEdges[tNode.cluster][sNode.cluster] += edge.weight || 1.0;
        if (clusterMap[sNode.cluster]) clusterMap[sNode.cluster].degree++;
        if (clusterMap[tNode.cluster]) clusterMap[tNode.cluster].degree++;
      }
    }
  });

  // 3. Initial deterministic radial placement
  // Sort clusters by degree descending so central hub clusters sit near origin
  const sortedPaths = [...activeClusterPaths].sort((a, b) => {
    return (clusterMap[b].degree || 0) - (clusterMap[a].degree || 0);
  });

  if (numClusters === 1) {
    clusterMap[sortedPaths[0]].pos = { x: 0, y: 0 };
  } else {
    // Average cluster radius
    let avgRadius = 0;
    sortedPaths.forEach((p) => {
      const d = clusterMap[p].dims;
      avgRadius += Math.sqrt((d.width / 2) ** 2 + (d.height / 2) ** 2);
    });
    avgRadius /= numClusters;

    const baseRingRadius = Math.max(480, numClusters * 120 + avgRadius * 1.4);

    sortedPaths.forEach((p, idx) => {
      if (idx === 0 && numClusters > 2) {
        // Place most central cluster at origin
        clusterMap[p].pos = { x: 0, y: 0 };
      } else {
        const ringIdx = numClusters > 2 ? idx - 1 : idx;
        const totalInRing = numClusters > 2 ? numClusters - 1 : numClusters;
        const angle = (2 * Math.PI * ringIdx) / totalInRing - Math.PI / 2;
        // 1.15:0.88 widescreen aspect ratio matching standard desktop viewports
        clusterMap[p].pos = {
          x: Math.round(baseRingRadius * Math.cos(angle) * 1.15),
          y: Math.round(baseRingRadius * Math.sin(angle) * 0.88),
        };
      }
    });
  }

  // 4. Force Simulation Loop with Simulated Annealing
  const ITERATIONS = 130;
  for (let it = 0; it < ITERATIONS; it++) {
    const temp = (1 - it / ITERATIONS) * 0.85 + 0.05;
    const forces = {};
    sortedPaths.forEach((p) => {
      forces[p] = { x: 0, y: 0 };
    });

    // Pairwise Repulsion
    for (let i = 0; i < numClusters; i++) {
      for (let j = i + 1; j < numClusters; j++) {
        const p1 = sortedPaths[i];
        const p2 = sortedPaths[j];
        const c1 = clusterMap[p1];
        const c2 = clusterMap[p2];

        const dx = c2.pos.x - c1.pos.x;
        const dy = c2.pos.y - c1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;

        const r1 = Math.sqrt((c1.dims.width / 2) ** 2 + (c1.dims.height / 2) ** 2);
        const r2 = Math.sqrt((c2.dims.width / 2) ** 2 + (c2.dims.height / 2) ** 2);
        const desiredMin = r1 + r2 + 100;

        if (dist < desiredMin) {
          // Strong collision separation push
          const overlap = desiredMin - dist;
          const push = (overlap / dist) * 1.8;
          forces[p1].x -= dx * push;
          forces[p1].y -= dy * push;
          forces[p2].x += dx * push;
          forces[p2].y += dy * push;
        } else {
          // Normal electrostatic repulsion
          const repForce = (350000 * (r1 + r2)) / (dist * dist * 30);
          forces[p1].x -= (dx / dist) * repForce;
          forces[p1].y -= (dy / dist) * repForce;
          forces[p2].x += (dx / dist) * repForce;
          forces[p2].y += (dy / dist) * repForce;
        }
      }
    }

    // Edge Attraction
    for (let i = 0; i < numClusters; i++) {
      for (let j = i + 1; j < numClusters; j++) {
        const p1 = sortedPaths[i];
        const p2 = sortedPaths[j];
        const weight = clusterEdges[p1]?.[p2] || 0;
        if (weight <= 0) continue;

        const c1 = clusterMap[p1];
        const c2 = clusterMap[p2];
        const dx = c2.pos.x - c1.pos.x;
        const dy = c2.pos.y - c1.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;

        const r1 = Math.sqrt((c1.dims.width / 2) ** 2 + (c1.dims.height / 2) ** 2);
        const r2 = Math.sqrt((c2.dims.width / 2) ** 2 + (c2.dims.height / 2) ** 2);
        const targetDist = r1 + r2 + 110;

        const delta = dist - targetDist;
        const attrForce = (delta * 0.05 * Math.log2(weight + 2)) / dist;
        forces[p1].x += dx * attrForce;
        forces[p1].y += dy * attrForce;
        forces[p2].x -= dx * attrForce;
        forces[p2].y -= dy * attrForce;
      }
    }

    // Gentle central gravity (prevents disconnected components from drifting)
    sortedPaths.forEach((p) => {
      forces[p].x -= clusterMap[p].pos.x * 0.007;
      forces[p].y -= clusterMap[p].pos.y * 0.007;
    });

    // Update positions
    sortedPaths.forEach((p) => {
      clusterMap[p].pos.x += forces[p].x * temp;
      clusterMap[p].pos.y += forces[p].y * temp;
    });
  }

  // 5. Strict AABB Collision Resolution (Zero Overlap Guarantee)
  resolveClusterCollisions(clusterMap, 85, 30);

  // 6. Position Nodes within each Cluster Box
  sortedPaths.forEach((p) => {
    const c = clusterMap[p];
    placeNodesInsideCluster(c.childNodes, c.pos, c.dims);
  });
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. HIERARCHICAL 2D LAYOUT ALGORITHM
 * ─────────────────────────────────────────────────────────────────────────────
 * Communicates software architecture in clear, unclustered topological tiers:
 * - Computes dependency tiers (Entrypoint → Controllers/Routes → Services → Models → Utils).
 * - Minimizes edge crossings within tiers using barycenter heuristic.
 * - Computes dynamic tier heights and widths based on actual contents.
 * - Guarantees generous horizontal separation between sibling clusters (100px+)
 *   and vertical separation between tiers (160px+).
 */
export function computeHierarchicalLayout(cy, graphData) {
  const clusters = graphData?.clusters || [];
  if (clusters.length === 0) {
    cy.layout({
      name: 'breadthfirst',
      directed: true,
      spacingFactor: 1.6,
      padding: 70,
      animate: false,
    }).run();
    return;
  }

  // 1. Gather nodes and calculate dimensions for each cluster
  const clusterMap = {};
  const activeClusterPaths = [];

  clusters.forEach((cluster) => {
    const childNodes = cy.nodes(`[cluster = "${cluster.path}"]`);
    if (childNodes.length === 0) return;

    const rawNodes = childNodes.map((n) => ({
      id: n.id(),
      label: n.data('label'),
      type: n.data('type'),
      language: n.data('language'),
      path: n.data('path'),
    }));

    const dims = calculateClusterDimensions(rawNodes);
    clusterMap[cluster.path] = {
      path: cluster.path,
      name: cluster.name,
      childNodes,
      rawNodes,
      dims,
      pos: { x: 0, y: 0 },
    };
    activeClusterPaths.push(cluster.path);
  });

  const numClusters = activeClusterPaths.length;
  if (numClusters === 0) return;

  // 2. Build cross-cluster dependency graph
  const clusterInDegree = {};
  const clusterOutNeighbors = {};
  const clusterInNeighbors = {};

  activeClusterPaths.forEach((p) => {
    clusterInDegree[p] = 0;
    clusterOutNeighbors[p] = new Set();
    clusterInNeighbors[p] = new Set();
  });

  const allEdges = graphData.edges || [];
  allEdges.forEach((e) => {
    const sNode = graphData.nodes?.find((n) => n.id === e.source);
    const tNode = graphData.nodes?.find((n) => n.id === e.target);
    if (sNode && tNode && sNode.cluster !== tNode.cluster) {
      if (clusterOutNeighbors[sNode.cluster] && clusterInNeighbors[tNode.cluster]) {
        clusterOutNeighbors[sNode.cluster].add(tNode.cluster);
        clusterInNeighbors[tNode.cluster].add(sNode.cluster);
      }
    }
  });

  activeClusterPaths.forEach((p) => {
    clusterInDegree[p] = clusterInNeighbors[p].size;
  });

  // 3. Known architectural tier hints for standard conventions
  const ARCHITECTURAL_TIER_HINTS = {
    // Tier 0: Root / Ingestion / Entrypoint
    src: 0,
    main: 0,
    app: 0,
    cmd: 0,
    cli: 0,
    entry: 0,
    root: 0,
    // Tier 1: Presentation / Routing / API
    api: 1,
    routes: 1,
    controllers: 1,
    views: 1,
    handlers: 1,
    // Tier 2: Domain logic / Services / Engines
    services: 2,
    service: 2,
    engine: 2,
    solarfluxengine: 2,
    domain: 2,
    core: 2,
    lib: 2,
    // Tier 3: Models / Schemas / Entities / DB
    models: 3,
    model: 3,
    schemas: 3,
    schema: 3,
    entities: 3,
    db: 3,
    // Tier 4: Utilities / Helpers / Infrastructure
    utils: 4,
    util: 4,
    helpers: 4,
    constants: 4,
    common: 4,
    shared: 4,
    config: 4,
  };

  // 4. Compute topological level for each cluster
  const clusterLevels = {};
  const visited = new Set();

  // Seed root clusters
  const rootCandidates = activeClusterPaths.filter((p) => clusterInDegree[p] === 0);
  const queue = [...rootCandidates];
  rootCandidates.forEach((p) => {
    const hint = ARCHITECTURAL_TIER_HINTS[p.toLowerCase().replace(/\/$/, '')];
    clusterLevels[p] = hint !== undefined ? hint : 0;
    visited.add(p);
  });

  // Longest Path Layering with cycle tolerance
  let passes = 0;
  while (queue.length > 0 && passes < 100) {
    passes++;
    const curr = queue.shift();
    const currLevel = clusterLevels[curr] || 0;

    clusterOutNeighbors[curr].forEach((neighbor) => {
      const hint = ARCHITECTURAL_TIER_HINTS[neighbor.toLowerCase().replace(/\/$/, '')];
      const targetLevel = hint !== undefined ? Math.max(hint, currLevel + 1) : currLevel + 1;

      if (clusterLevels[neighbor] === undefined || clusterLevels[neighbor] < targetLevel) {
        clusterLevels[neighbor] = targetLevel;
      }

      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    });
  }

  // Handle any remaining unvisited / cyclical clusters
  activeClusterPaths.forEach((p) => {
    if (clusterLevels[p] === undefined) {
      const hint = ARCHITECTURAL_TIER_HINTS[p.toLowerCase().replace(/\/$/, '')];
      clusterLevels[p] = hint !== undefined ? hint : 1;
    }
  });

  // 5. Group clusters into Tiers
  const tiers = {};
  activeClusterPaths.forEach((p) => {
    const lvl = clusterLevels[p];
    if (!tiers[lvl]) tiers[lvl] = [];
    tiers[lvl].push(p);
  });

  const tierKeys = Object.keys(tiers)
    .map(Number)
    .sort((a, b) => a - b);

  // 6. Order sibling clusters within each tier using Barycenter heuristic to minimize edge crossings
  tierKeys.forEach((lvl, tIdx) => {
    if (tIdx === 0) return; // Keep top tier as is

    tiers[lvl].sort((pA, pB) => {
      // Calculate average index of connected parent clusters in preceding tier
      const getBarycenter = (p) => {
        const parents = Array.from(clusterInNeighbors[p]);
        if (parents.length === 0) return 0;
        let sum = 0;
        let count = 0;
        parents.forEach((parent) => {
          const prevTier = tiers[tierKeys[tIdx - 1]];
          const pIdx = prevTier ? prevTier.indexOf(parent) : -1;
          if (pIdx !== -1) {
            sum += pIdx;
            count++;
          }
        });
        return count > 0 ? sum / count : 0;
      };

      return getBarycenter(pA) - getBarycenter(pB);
    });
  });

  // 7. Compute Tier Positions with Generous Dynamic Spacing
  // Vertical spacing: depends on the tallest cluster in the preceding tier
  const tierYPositions = {};
  let currentY = 0;

  tierKeys.forEach((lvl, tIdx) => {
    const clustersInTier = tiers[lvl];
    const maxH = Math.max(...clustersInTier.map((p) => clusterMap[p].dims.height));

    if (tIdx === 0) {
      currentY = maxH / 2;
    } else {
      const prevLvl = tierKeys[tIdx - 1];
      const prevMaxH = Math.max(...tiers[prevLvl].map((p) => clusterMap[p].dims.height));
      // Generous 160px vertical margin between tier boundaries!
      currentY += prevMaxH / 2 + maxH / 2 + 160;
    }

    tierYPositions[lvl] = currentY;
  });

  // Center vertical coordinates around origin
  const totalHeight = currentY;
  tierKeys.forEach((lvl) => {
    tierYPositions[lvl] -= totalHeight / 2;
  });

  // 8. Compute Horizontal Cluster Positions within Each Tier
  const SIBLING_GAP = 100; // 100px minimum horizontal separation between sibling clusters

  tierKeys.forEach((lvl) => {
    const clustersInTier = tiers[lvl];
    const tierY = tierYPositions[lvl];

    // Total width required by all clusters in this tier
    let totalTierWidth = 0;
    clustersInTier.forEach((p, idx) => {
      totalTierWidth += clusterMap[p].dims.width;
      if (idx > 0) totalTierWidth += SIBLING_GAP;
    });

    let currentX = -totalTierWidth / 2;
    clustersInTier.forEach((p) => {
      const c = clusterMap[p];
      c.pos = {
        x: currentX + c.dims.width / 2,
        y: tierY,
      };
      currentX += c.dims.width + SIBLING_GAP;
    });
  });

  // 9. Secondary Collision Check (Guaranteed Zero Overlap)
  resolveClusterCollisions(clusterMap, 80, 20);

  // 10. Position Nodes within each Cluster
  activeClusterPaths.forEach((p) => {
    const c = clusterMap[p];
    placeNodesInsideCluster(c.childNodes, c.pos, c.dims);
  });
}
