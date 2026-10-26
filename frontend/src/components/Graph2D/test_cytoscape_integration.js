import assert from 'assert';
import {
  calculateNodeDimensions,
  calculateClusterDimensions,
  computeForceDirectedLayout,
  computeHierarchicalLayout,
  RELATIONSHIP_STYLES,
} from './graphLayouts.js';

console.log('--- RUNNING CYTOSCAPE GRAPH INTEGRATION VERIFICATION ---');

// Mock Cytoscape node and graph
function createMockCy(nodes, edges) {
  const nodeMap = new Map();
  nodes.forEach((n) => {
    nodeMap.set(n.id, {
      ...n,
      _pos: { x: 0, y: 0 },
      position(pos) {
        if (pos) {
          this._pos = { ...pos };
        }
        return this._pos;
      },
      data(key) {
        return this.dataObj ? this.dataObj[key] : n[key];
      },
      id() {
        return n.id;
      },
      renderedBoundingBox() {
        return {
          x1: this._pos.x - 65,
          y1: this._pos.y - 18,
          x2: this._pos.x + 65,
          y2: this._pos.y + 18,
          w: 130,
          h: 36,
        };
      },
    });
  });

  const edgeList = edges.map((e) => ({
    ...e,
    source() {
      return nodeMap.get(e.source);
    },
    target() {
      return nodeMap.get(e.target);
    },
    data(key) {
      return e[key];
    },
    id() {
      return e.id;
    },
  }));

  return {
    nodes(selector) {
      const all = Array.from(nodeMap.values());
      if (!selector) return all;
      const match = selector.match(/\[cluster\s*=\s*"([^"]+)"\]/);
      if (match) {
        const clusterName = match[1];
        const filtered = all.filter((n) => (n.cluster === clusterName || (n.dataObj && n.dataObj.cluster === clusterName)));
        filtered.renderedBoundingBox = function () {
          if (this.length === 0) return { x1: 0, y1: 0, x2: 0, y2: 0, w: 0, h: 0 };
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          this.forEach((child) => {
            const p = child.position();
            minX = Math.min(minX, p.x - 70);
            maxX = Math.max(maxX, p.x + 70);
            minY = Math.min(minY, p.y - 20);
            maxY = Math.max(maxY, p.y + 20);
          });
          return { x1: minX, y1: minY, x2: maxX, y2: maxY, w: maxX - minX, h: maxY - minY };
        };
        return filtered;
      }
      return all;
    },
    edges() {
      return edgeList;
    },
    getElementById(id) {
      return nodeMap.get(id);
    },
    animate() {},
    fit() {},
  };
}

// 1. Verify element generation and dimension assignment
const sampleNodes = [
  { id: 'f1', label: 'application.js', path: 'lib/application.js', cluster: 'lib', type: 'file' },
  { id: 'c1', label: 'Application', path: 'lib/application.js', cluster: 'lib', type: 'class' },
  { id: 'fn1', label: 'handle', path: 'lib/application.js', cluster: 'lib', type: 'function' },
  { id: 'm1', label: 'listen', path: 'lib/application.js', cluster: 'lib', type: 'method' },
];

sampleNodes.forEach((node) => {
  const dim = calculateNodeDimensions(node);
  assert(dim.width >= 110, `Width should be >= 110, got ${dim.width}`);
  assert(dim.height >= 26, `Height should be >= 26, got ${dim.height}`);
  assert(dim.borderColor, 'Border color must be defined');
  assert(dim.bgColor, 'Background color must be defined');
  assert(dim.icon, 'Icon must be defined');
});
console.log('✓ Element generation & dynamic dimensions validated');

// 2. Test Force-Directed Layout on multi-cluster repo
const clusters = [
  { id: 'c_lib', path: 'lib', name: 'lib/' },
  { id: 'c_router', path: 'router', name: 'router/' },
  { id: 'c_middleware', path: 'middleware', name: 'middleware/' },
];

const cyNodes = [
  { id: 'n1', cluster: 'lib', label: 'application.js' },
  { id: 'n2', cluster: 'lib', label: 'express.js' },
  { id: 'n3', cluster: 'router', label: 'index.js' },
  { id: 'n4', cluster: 'router', label: 'route.js' },
  { id: 'n5', cluster: 'router', label: 'layer.js' },
  { id: 'n6', cluster: 'middleware', label: 'init.js' },
  { id: 'n7', cluster: 'middleware', label: 'query.js' },
];

const cyEdges = [
  { id: 'e1', source: 'n1', target: 'n3', relation: 'imports' },
  { id: 'e2', source: 'n3', target: 'n4', relation: 'defines' },
  { id: 'e3', source: 'n4', target: 'n5', relation: 'contains' },
  { id: 'e4', source: 'n1', target: 'n6', relation: 'calls' },
];

const mockCy = createMockCy(cyNodes, cyEdges);
const graphData = {
  clusters,
  nodes: cyNodes,
  edges: cyEdges,
};

// Test force directed layout
computeForceDirectedLayout(mockCy, graphData);
// Check that each cluster's rendered bounding box does not overlap another cluster's
const boxLib = mockCy.nodes('[cluster = "lib"]').renderedBoundingBox();
const boxRouter = mockCy.nodes('[cluster = "router"]').renderedBoundingBox();
const boxMiddleware = mockCy.nodes('[cluster = "middleware"]').renderedBoundingBox();

function checkOverlap(b1, b2, margin = 20) {
  const overlapX = (b1.x1 - margin < b2.x2) && (b1.x2 + margin > b2.x1);
  const overlapY = (b1.y1 - margin < b2.y2) && (b1.y2 + margin > b2.y1);
  return overlapX && overlapY;
}

assert(!checkOverlap(boxLib, boxRouter), 'lib and router containers should not overlap in force layout');
assert(!checkOverlap(boxLib, boxMiddleware), 'lib and middleware containers should not overlap in force layout');
assert(!checkOverlap(boxRouter, boxMiddleware), 'router and middleware containers should not overlap in force layout');
console.log('✓ Force-directed layout produced 0 container overlaps');

// Test hierarchical layout
computeHierarchicalLayout(mockCy, graphData);
const hBoxLib = mockCy.nodes('[cluster = "lib"]').renderedBoundingBox();
const hBoxRouter = mockCy.nodes('[cluster = "router"]').renderedBoundingBox();
const hBoxMiddleware = mockCy.nodes('[cluster = "middleware"]').renderedBoundingBox();

assert(!checkOverlap(hBoxLib, hBoxRouter), 'lib and router should not overlap in hierarchical layout');
assert(!checkOverlap(hBoxLib, hBoxMiddleware), 'lib and middleware should not overlap in hierarchical layout');
assert(!checkOverlap(hBoxRouter, hBoxMiddleware), 'router and middleware should not overlap in hierarchical layout');
console.log('✓ Hierarchical layout produced 0 container overlaps');

// 3. Test relationship style configs
assert.strictEqual(RELATIONSHIP_STYLES.imports.lineColor, '#f97316');
assert.strictEqual(RELATIONSHIP_STYLES.calls.lineColor, '#38bdf8');
assert.strictEqual(RELATIONSHIP_STYLES.defines.lineStyle, 'dashed');
assert.strictEqual(RELATIONSHIP_STYLES.contains.lineStyle, 'dotted');
console.log('✓ Relationship-specific styles verified');

console.log('--- ALL CYTOSCAPE INTEGRATION CHECKS PASSED ---');
