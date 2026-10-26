/**
 * Automated test suite for graphLayouts.js layout engine and collision resolution.
 */

import assert from 'node:assert';
import {
  calculateNodeDimensions,
  calculateClusterDimensions,
  computeForceDirectedLayout,
  computeHierarchicalLayout,
} from './graphLayouts.js';

console.log('--- STARTING GRAPH LAYOUT TESTS ---');

// Mock Cytoscape node and instance for headless simulation testing
class MockCyNode {
  constructor(id, data = {}) {
    this._id = id;
    this._data = { id, ...data };
    this._pos = { x: 0, y: 0 };
  }
  id() { return this._id; }
  data(key) { return key ? this._data[key] : this._data; }
  position(pos) {
    if (pos) {
      this._pos = { ...pos };
      return this;
    }
    return this._pos;
  }
}

class MockCy {
  constructor(nodes = []) {
    this._nodes = nodes;
  }
  nodes(selector) {
    if (!selector) return this._nodes;
    const match = selector.match(/\[cluster\s*=\s*"([^"]+)"\]/);
    if (match) {
      const clusterPath = match[1];
      return this._nodes.filter((n) => n.data('cluster') === clusterPath);
    }
    return this._nodes;
  }
  layout(opts) {
    return { run: () => {} };
  }
}

// 1. Test Node Dimensions
console.log('1. Testing calculateNodeDimensions...');
const fileNode = calculateNodeDimensions({ label: 'main.py', type: 'file', language: 'python' });
assert(fileNode.width >= 140, 'File node width should be >= 140');
assert(fileNode.height === 36, 'File node height should be 36');
assert(fileNode.textMaxWidth < fileNode.width, 'textMaxWidth should fit inside node');

const longLabelNode = calculateNodeDimensions({ label: 'super_long_service_controller_name.ts', type: 'file', language: 'typescript' });
assert(longLabelNode.width > fileNode.width, 'Long label should produce wider node');
assert(longLabelNode.width <= 240, 'Max width cap should be respected');

const classNode = calculateNodeDimensions({ label: 'SolarFluxEngine', type: 'class' });
assert(classNode.borderColor === '#a855f7', 'Class node should have purple accent');

const fnNode = calculateNodeDimensions({ label: 'calculateFlux', type: 'function' });
assert(fnNode.borderColor === '#06b6d4', 'Function node should have cyan accent');
console.log('   calculateNodeDimensions passed.');

// 2. Test Cluster Dimensions
console.log('2. Testing calculateClusterDimensions...');
const testClusterNodes = [
  { label: 'engine.py', type: 'file' },
  { label: 'magnetosphere.py', type: 'file' },
  { label: 'solar.py', type: 'file' },
  { label: 'prediction.py', type: 'file' },
];
const clusterDims = calculateClusterDimensions(testClusterNodes);
assert(clusterDims.cols === 2, '4 nodes should be arranged in 2 columns');
assert(clusterDims.rows === 2, '4 nodes should be arranged in 2 rows');
assert(clusterDims.width >= 260, 'Cluster width should be >= 260');
assert(clusterDims.height >= 160, 'Cluster height should be >= 160');
assert(clusterDims.padTop >= 50, 'Cluster padTop should clear folder header');
console.log('   calculateClusterDimensions passed.');

// 3. Test Force-Directed Layout on Sample Repository
console.log('3. Testing computeForceDirectedLayout...');
const sampleGraphData = {
  clusters: [
    { id: 'c_src', path: 'src', name: 'src/' },
    { id: 'c_services', path: 'services', name: 'services/' },
    { id: 'c_models', path: 'models', name: 'models/' },
    { id: 'c_utils', path: 'utils', name: 'utils/' },
  ],
  nodes: [
    { id: 'n1', label: 'main.py', cluster: 'src', type: 'file' },
    { id: 'n2', label: 'routes.py', cluster: 'src', type: 'file' },
    { id: 'n3', label: 'telemetry.py', cluster: 'src', type: 'file' },
    { id: 'n4', label: 'data_fetcher.py', cluster: 'services', type: 'file' },
    { id: 'n5', label: 'processing.py', cluster: 'services', type: 'file' },
    { id: 'n6', label: 'base.py', cluster: 'models', type: 'file' },
    { id: 'n7', label: 'forecast.py', cluster: 'models', type: 'file' },
    { id: 'n8', label: 'helpers.py', cluster: 'utils', type: 'file' },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n3', relation: 'imports', weight: 2 },
    { id: 'e2', source: 'n3', target: 'n4', relation: 'imports', weight: 2 },
    { id: 'e3', source: 'n4', target: 'n5', relation: 'calls', weight: 2 },
    { id: 'e4', source: 'n2', target: 'n6', relation: 'imports', weight: 1 },
    { id: 'e5', source: 'n5', target: 'n8', relation: 'calls', weight: 1 },
  ],
};

const mockNodes = sampleGraphData.nodes.map((n) => new MockCyNode(n.id, n));
const cyMock = new MockCy(mockNodes);

computeForceDirectedLayout(cyMock, sampleGraphData);

// Check node-node separation inside each cluster
sampleGraphData.clusters.forEach((cl) => {
  const nodes = cyMock.nodes(`[cluster = "${cl.path}"]`);
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const p1 = nodes[i].position();
      const p2 = nodes[j].position();
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      assert(dist >= 50, `Nodes in cluster ${cl.path} should not overlap (dist: ${dist})`);
    }
  }
});

// Check cluster-cluster separation in Force-Directed layout
const clusterCenters = {};
sampleGraphData.clusters.forEach((cl) => {
  const nodes = cyMock.nodes(`[cluster = "${cl.path}"]`);
  const xs = nodes.map((n) => n.position().x);
  const ys = nodes.map((n) => n.position().y);
  const minX = Math.min(...xs) - 32;
  const maxX = Math.max(...xs) + 32;
  const minY = Math.min(...ys) - 60;
  const maxY = Math.max(...ys) + 28;
  clusterCenters[cl.path] = { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
});

const clusterPaths = Object.keys(clusterCenters);
for (let i = 0; i < clusterPaths.length; i++) {
  for (let j = i + 1; j < clusterPaths.length; j++) {
    const b1 = clusterCenters[clusterPaths[i]];
    const b2 = clusterCenters[clusterPaths[j]];

    const overlapX = (b1.w + b2.w) / 2 - Math.abs((b1.minX + b1.maxX) / 2 - (b2.minX + b2.maxX) / 2);
    const overlapY = (b1.h + b2.h) / 2 - Math.abs((b1.minY + b1.maxY) / 2 - (b2.minY + b2.maxY) / 2);

    assert(
      overlapX <= 0 || overlapY <= 0,
      `Cluster boxes ${clusterPaths[i]} and ${clusterPaths[j]} should not overlap!`
    );
  }
}
console.log('   computeForceDirectedLayout passed (zero node overlap, zero cluster overlap).');

// 4. Test Hierarchical Layout
console.log('4. Testing computeHierarchicalLayout...');
computeHierarchicalLayout(cyMock, sampleGraphData);

// Verify that tiers maintain strict top-to-bottom vertical ranking
const hierClusterY = {};
sampleGraphData.clusters.forEach((cl) => {
  const nodes = cyMock.nodes(`[cluster = "${cl.path}"]`);
  const ys = nodes.map((n) => n.position().y);
  hierClusterY[cl.path] = ys.reduce((a, b) => a + b, 0) / ys.length;
});

// 'src' should be above 'models' and 'utils'
assert(hierClusterY['src'] < hierClusterY['models'], 'src tier should be above models tier');
assert(hierClusterY['src'] < hierClusterY['utils'], 'src tier should be above utils tier');

// Verify cluster-cluster separation in Hierarchical mode
const hierBoxes = {};
sampleGraphData.clusters.forEach((cl) => {
  const nodes = cyMock.nodes(`[cluster = "${cl.path}"]`);
  const xs = nodes.map((n) => n.position().x);
  const ys = nodes.map((n) => n.position().y);
  const minX = Math.min(...xs) - 32;
  const maxX = Math.max(...xs) + 32;
  const minY = Math.min(...ys) - 60;
  const maxY = Math.max(...ys) + 28;
  hierBoxes[cl.path] = { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY };
});

for (let i = 0; i < clusterPaths.length; i++) {
  for (let j = i + 1; j < clusterPaths.length; j++) {
    const b1 = hierBoxes[clusterPaths[i]];
    const b2 = hierBoxes[clusterPaths[j]];

    const overlapX = (b1.w + b2.w) / 2 - Math.abs((b1.minX + b1.maxX) / 2 - (b2.minX + b2.maxX) / 2);
    const overlapY = (b1.h + b2.h) / 2 - Math.abs((b1.minY + b1.maxY) / 2 - (b2.minY + b2.maxY) / 2);

    assert(
      overlapX <= 0 || overlapY <= 0,
      `Hierarchical cluster boxes ${clusterPaths[i]} and ${clusterPaths[j]} should not overlap!`
    );
  }
}
console.log('   computeHierarchicalLayout passed (clear architectural hierarchy, zero overlap).');

// 5. Test Large Graph (50 nodes across 8 clusters)
console.log('5. Testing large graph (8 clusters, 48 nodes)...');
const largeClusters = [];
const largeNodes = [];
const largeEdges = [];

for (let c = 0; c < 8; c++) {
  const cPath = `package_${c}`;
  largeClusters.push({ id: `c_${c}`, path: cPath, name: `${cPath}/` });
  for (let n = 0; n < 6; n++) {
    const nId = `node_${c}_${n}`;
    largeNodes.push({
      id: nId,
      label: `item_${c}_${n}.py`,
      cluster: cPath,
      type: n === 0 ? 'class' : 'function',
    });
    if (c > 0 && n === 0) {
      largeEdges.push({
        id: `e_${c}_0`,
        source: `node_${c - 1}_0`,
        target: nId,
        relation: 'calls',
        weight: 1,
      });
    }
  }
}

const largeMockNodes = largeNodes.map((n) => new MockCyNode(n.id, n));
const largeCyMock = new MockCy(largeMockNodes);
const largeGraphData = { clusters: largeClusters, nodes: largeNodes, edges: largeEdges };

computeForceDirectedLayout(largeCyMock, largeGraphData);
computeHierarchicalLayout(largeCyMock, largeGraphData);
console.log('   Large graph layout executed successfully.');

console.log('--- ALL GRAPH LAYOUT TESTS PASSED PERFECTLY ---');
