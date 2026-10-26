import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import cytoscape from 'cytoscape';
import {
  Search,
  SlidersHorizontal,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Target,
  Folder,
  Layers,
  Share2,
  ArrowRight,
} from 'lucide-react';
import GalaxyBackground2D from './GalaxyBackground2D.jsx';
import {
  calculateNodeDimensions,
  computeForceDirectedLayout,
  computeHierarchicalLayout,
} from './graphLayouts.js';

export default function CytoscapeGalaxyGraph({
  graphData,
  selectedNodeId,
  onSelectNode,
  onSelectCluster,
  className = '',
}) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [clusterBoxes, setClusterBoxes] = useState([]);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const animFrameRef = useRef(null);
  const selectedNodeIdRef = useRef(selectedNodeId);
  const hoverTargetRef = useRef(null);

  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);

  // Centralized visual state manager for selection, hover previews, and clean restoration
  const applyVisualState = useCallback((targetHover = hoverTargetRef.current, targetSelected = selectedNodeIdRef.current) => {
    const cy = cyRef.current;
    if (!cy) return;

    // Reset previous classes
    cy.elements().removeClass('selected hovered edge-hovered connected-neighbor edge-incoming edge-outgoing dimmed');

    // Case A: Hovering an edge (preview relationship endpoints & direction)
    if (targetHover?.type === 'edge') {
      const edge = cy.getElementById(targetHover.id);
      if (edge && edge.length > 0) {
        cy.elements().addClass('dimmed');
        edge.removeClass('dimmed').addClass('edge-hovered');

        const sNode = edge.source();
        const tNode = edge.target();
        if (sNode.length > 0) sNode.removeClass('dimmed').addClass('connected-neighbor');
        if (tNode.length > 0) tNode.removeClass('dimmed').addClass('connected-neighbor');

        // If a node was persistently selected, keep it marked with .selected
        if (targetSelected) {
          const selNode = cy.getElementById(targetSelected);
          if (selNode.length > 0) selNode.removeClass('dimmed').addClass('selected');
        }
        return;
      }
    }

    // Case B: Hovering a node (temporary preview of connections without destroying persistent selection)
    if (targetHover?.type === 'node') {
      const hNode = cy.getElementById(targetHover.id);
      if (hNode && hNode.length > 0) {
        cy.elements().addClass('dimmed');
        hNode.removeClass('dimmed').addClass('hovered');

        const inEdges = hNode.incomers('edge');
        inEdges.removeClass('dimmed').addClass('edge-incoming');

        const outEdges = hNode.outgoers('edge');
        outEdges.removeClass('dimmed').addClass('edge-outgoing');

        const neighbors = hNode.neighborhood('node');
        neighbors.removeClass('dimmed').addClass('connected-neighbor');

        // If a persistent node is selected (and not the hovered node), keep it visible as selected
        if (targetSelected && targetSelected !== targetHover.id) {
          const selNode = cy.getElementById(targetSelected);
          if (selNode.length > 0) selNode.removeClass('dimmed').addClass('selected');
        }
        return;
      }
    }

    // Case C: Persistent selection
    if (targetSelected) {
      const selNode = cy.getElementById(targetSelected);
      if (selNode && selNode.length > 0) {
        cy.elements().addClass('dimmed');
        selNode.removeClass('dimmed').addClass('selected');

        const inEdges = selNode.incomers('edge');
        inEdges.removeClass('dimmed').addClass('edge-incoming');

        const outEdges = selNode.outgoers('edge');
        outEdges.removeClass('dimmed').addClass('edge-outgoing');

        const neighbors = selNode.neighborhood('node');
        neighbors.removeClass('dimmed').addClass('connected-neighbor');
        return;
      }
    }

    // Case D: Neither selected nor hovered => all elements restored to normal
  }, []);

  // Toolbar & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState('all'); // 'all' | 'file' | 'symbol'
  const [languageFilter, setLanguageFilter] = useState('python'); // 'all' | 'python' | 'javascript'
  const [dependencyFilter, setDependencyFilter] = useState('all'); // 'all' | 'imports' | 'calls' | 'defines' | 'contains' | 'cross'
  const [activeLayout, setActiveLayout] = useState('force'); // 'force' | 'hierarchical'

  // Available languages extracted dynamically from graph
  const availableLanguages = useMemo(() => {
    if (!graphData?.nodes) return ['python'];
    const langs = new Set(graphData.nodes.map((n) => n.language).filter(Boolean));
    return ['all', ...Array.from(langs)];
  }, [graphData]);

  // Compute Cytoscape elements (File & Symbol child nodes + Directed edges)
  // Containers are rendered via pure dynamic CSS overlay to match the reference design 100%
  const elements = useMemo(() => {
    if (!graphData || !Array.isArray(graphData.nodes)) return [];

    const elems = [];
    const activeNodeIds = new Set();

    // 1. Filter nodes based on toolbar controls
    const validNodes = graphData.nodes.filter((node) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = node.label?.toLowerCase().includes(q);
        const matchesPath = node.path?.toLowerCase().includes(q);
        const matchesCluster = node.cluster?.toLowerCase().includes(q);
        if (!matchesLabel && !matchesPath && !matchesCluster) return false;
      }

      // Node type filter
      if (nodeTypeFilter !== 'all') {
        if (nodeTypeFilter === 'file' && node.type !== 'file') return false;
        if (nodeTypeFilter === 'symbol' && node.type === 'file') return false;
      }

      // Language filter
      if (languageFilter !== 'all' && node.language && node.language.toLowerCase() !== languageFilter.toLowerCase()) {
        return false;
      }

      return true;
    });

    validNodes.forEach((n) => activeNodeIds.add(n.id));

    // 2. Add Code Nodes with dynamically calculated dimensions
    validNodes.forEach((node) => {
      const dim = calculateNodeDimensions(node);
      elems.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label,
          path: node.path,
          cluster: node.cluster,
          type: node.type,
          language: node.language,
          loc: node.metrics?.loc || 0,
          centrality: node.metrics?.centrality || 0,
          complexity: node.metrics?.complexity || 0,
          ai_summary: node.ai_summary,
          width: dim.width,
          height: dim.height,
          cornerRadius: dim.cornerRadius,
          fontSize: dim.fontSize,
          textMaxWidth: dim.textMaxWidth,
          borderColor: dim.borderColor,
          bgColor: dim.bgColor,
          typeColor: dim.typeColor,
          typeBadge: dim.badge,
          icon: dim.icon,
        },
      });
    });

    // 3. Add Direct Directed Edges
    if (Array.isArray(graphData.edges)) {
      graphData.edges.forEach((edge) => {
        if (!activeNodeIds.has(edge.source) || !activeNodeIds.has(edge.target)) return;

        // Dependency relation filter
        if (dependencyFilter !== 'all') {
          if (dependencyFilter === 'cross' && !edge.is_cross_cluster) return;
          if (dependencyFilter !== 'cross' && edge.relation !== dependencyFilter) return;
        }

        elems.push({
          group: 'edges',
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relation: edge.relation || 'imports',
            weight: edge.weight,
            is_cross_cluster: edge.is_cross_cluster,
          },
        });
      });
    }

    return elems;
  }, [graphData, searchQuery, nodeTypeFilter, languageFilter, dependencyFilter]);

  // Update visual cluster container boxes based on rendered node bounding boxes
  const updateClusterBoxes = useCallback(() => {
    const cy = cyRef.current;
    if (!cy || !graphData?.clusters) return;

    const boxes = [];
    graphData.clusters.forEach((cluster) => {
      const nodesInCluster = cy.nodes(`[cluster = "${cluster.path}"]`);
      if (nodesInCluster.length === 0) return;

      const rbb = nodesInCluster.renderedBoundingBox();
      if (!rbb || rbb.w <= 0 || rbb.h <= 0) return;

      const padX = 26;
      const padTop = 50;
      const padBottom = 22;

      boxes.push({
        id: cluster.id,
        path: cluster.path,
        name: cluster.name,
        color: cluster.color,
        bg: cluster.bg,
        textColor: cluster.textColor || '#fff',
        count: nodesInCluster.length,
        x: rbb.x1 - padX,
        y: rbb.y1 - padTop,
        width: rbb.w + padX * 2,
        height: rbb.h + padTop + padBottom,
      });
    });

    setClusterBoxes(boxes);
  }, [graphData]);

  // Throttled update to maintain 60fps on continuous pan/zoom/drag
  const updateClusterBoxesThrottled = useCallback(() => {
    if (animFrameRef.current) return;
    animFrameRef.current = requestAnimationFrame(() => {
      animFrameRef.current = null;
      updateClusterBoxes();
    });
  }, [updateClusterBoxes]);

  // Apply Cytoscape Layout (Spacious Force-Directed or Topological Hierarchical)
  const applyLayout = useCallback(
    (layoutType = activeLayout) => {
      const cy = cyRef.current;
      if (!cy || cy.nodes().length === 0) return;

      if (layoutType === 'force') {
        computeForceDirectedLayout(cy, graphData);
      } else if (layoutType === 'hierarchical') {
        computeHierarchicalLayout(cy, graphData);
      }

      cy.animate({
        fit: { eles: cy.elements(), padding: 75 },
        duration: 350,
      });

      // Synchronize visual cluster boxes immediately and after animation finishes
      updateClusterBoxes();
      setTimeout(updateClusterBoxes, 360);
    },
    [activeLayout, graphData, updateClusterBoxes]
  );

  // Initialize Cytoscape Instance
  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      boxSelectionEnabled: false,
      autounselectify: false,
      wheelSensitivity: 0.25,
      minZoom: 0.2,
      maxZoom: 3.5,
      style: [
        // ─── CODE NODES (Dynamically dimensioned per label & type) ───────────
        {
          selector: 'node',
          style: {
            'shape': 'round-rectangle',
            'width': 'data(width)',
            'height': 'data(height)',
            'corner-radius': 'data(cornerRadius)',
            'background-color': 'data(bgColor)',
            'background-opacity': 0.95,
            'border-width': 1.6,
            'border-color': 'data(borderColor)',
            'border-opacity': 0.85,
            'label': 'data(label)',
            'color': '#f8fafc',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-family': 'JetBrains Mono, Plus Jakarta Sans, monospace',
            'font-size': 'data(fontSize)',
            'font-weight': 600,
            'background-image': 'data(icon)',
            'background-fit': 'contain',
            'background-width': '15px',
            'background-height': '15px',
            'background-position-x': '11px',
            'background-position-y': '50%',
            'text-margin-x': '9px',
            'text-max-width': 'data(textMaxWidth)',
            'text-wrap': 'ellipsis',
            'text-outline-color': '#080e1e',
            'text-outline-width': 1.5,
            'transition-property': 'border-color, border-width, opacity, underlay-opacity',
            'transition-duration': '0.18s',
            'z-index': 10,
          },
        },

        // ─── BASE DIRECTED EDGES (Smooth, restrained bezier curves) ─────────
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'curve-style': 'bezier',
            'control-point-step-size': 32, // Distinguishes parallel and reverse edges with dedicated curvature
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.82, // Clean, restrained arrowheads
            'line-opacity': 0.45,
            'target-arrow-fill': 'filled',
            'transition-property': 'line-color, width, line-opacity, z-index',
            'transition-duration': '0.18s',
            'z-index': 5,
          },
        },

        // Relationship-specific styling matching codebase conventions
        {
          selector: 'edge[relation = "imports"]',
          style: {
            'line-color': '#f97316', // Orange
            'target-arrow-color': '#f97316',
            'line-style': 'solid',
            'line-opacity': 0.50,
          },
        },
        {
          selector: 'edge[relation = "calls"]',
          style: {
            'line-color': '#38bdf8', // Cyan / Light Blue
            'target-arrow-color': '#38bdf8',
            'line-style': 'solid',
            'line-opacity': 0.50,
          },
        },
        {
          selector: 'edge[relation = "defines"]',
          style: {
            'line-color': '#a855f7', // Purple
            'target-arrow-color': '#a855f7',
            'line-style': 'dashed',
            'line-dash-pattern': [5, 4],
            'line-opacity': 0.45,
          },
        },
        {
          selector: 'edge[relation = "contains"]',
          style: {
            'line-color': '#10b981', // Emerald Green
            'target-arrow-color': '#10b981',
            'line-style': 'dotted',
            'line-dash-pattern': [2, 3],
            'line-opacity': 0.38,
          },
        },

        // ─── SELECTION & HOVER HIGHLIGHTING ──────────────────────────────────
        {
          selector: 'node.selected',
          style: {
            'border-color': '#f43f5e', // Neon rose/pink border
            'border-width': 2.8,
            'border-opacity': 1.0,
            'background-color': '#1c102a',
            'underlay-color': '#f43f5e',
            'underlay-padding': 7,
            'underlay-opacity': 0.45,
            'underlay-shape': 'round-rectangle',
            'z-index': 99,
          },
        },
        {
          selector: 'node.hovered',
          style: {
            'border-width': 2.4,
            'border-opacity': 1.0,
            'underlay-color': '#38bdf8',
            'underlay-padding': 5,
            'underlay-opacity': 0.35,
            'underlay-shape': 'round-rectangle',
            'z-index': 90,
          },
        },
        {
          selector: 'node.connected-neighbor',
          style: {
            'border-width': 2.2,
            'border-opacity': 1.0,
            'opacity': 1.0,
            'z-index': 80,
          },
        },
        // Directional edge glows
        {
          selector: 'edge.edge-incoming',
          style: {
            'line-color': '#38bdf8', // Glowing cyan incoming
            'target-arrow-color': '#38bdf8',
            'width': 2.8,
            'line-opacity': 1.0,
            'arrow-scale': 1.25,
            'z-index': 95,
          },
        },
        {
          selector: 'edge.edge-outgoing',
          style: {
            'line-color': '#fb923c', // Glowing amber/orange outgoing
            'target-arrow-color': '#fb923c',
            'width': 2.8,
            'line-opacity': 1.0,
            'arrow-scale': 1.25,
            'z-index': 95,
          },
        },
        {
          selector: 'edge.edge-hovered',
          style: {
            'width': 3.2,
            'line-opacity': 1.0,
            'arrow-scale': 1.35,
            'z-index': 98,
          },
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.16,
            'line-opacity': 0.12,
          },
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0,
          },
        },
      ],
    });

    cyRef.current = cy;
    if (typeof window !== 'undefined') {
      window.__cy = cy;
    }

    // Synchronize cluster boxes on pan, zoom, render, or drag throttled to 60fps
    cy.on('render pan zoom position drag', () => {
      updateClusterBoxesThrottled();
    });

    // Node click handler
    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      onSelectNode?.(node.id());
    });

    // Node hover preview (independent of active persistent selection)
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      hoverTargetRef.current = { type: 'node', id: node.id() };
      applyVisualState();
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'node', () => {
      hoverTargetRef.current = null;
      applyVisualState();
      if (containerRef.current) containerRef.current.style.cursor = 'default';
    });

    // Edge hover inspection tooltip & highlight preview
    cy.on('mouseover', 'edge', (evt) => {
      const edge = evt.target;
      const sNode = edge.source();
      const tNode = edge.target();
      setHoveredEdge({
        id: edge.id(),
        source: sNode.data('label') || sNode.id(),
        target: tNode.data('label') || tNode.id(),
        relation: edge.data('relation') || 'imports',
        isCross: edge.data('is_cross_cluster'),
      });
      hoverTargetRef.current = { type: 'edge', id: edge.id() };
      applyVisualState();
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';
    });

    cy.on('mouseout', 'edge', () => {
      setHoveredEdge(null);
      hoverTargetRef.current = null;
      applyVisualState();
      if (containerRef.current) containerRef.current.style.cursor = 'default';
    });

    // Background click (deselect)
    cy.on('tap', (evt) => {
      if (evt.target === cy) {
        onSelectNode?.(null);
      }
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [onSelectNode, updateClusterBoxesThrottled]);

  // Keep Cytoscape canvas sized correctly when sidebar/panel expands or window resizes
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (cyRef.current) {
        cyRef.current.resize();
        updateClusterBoxesThrottled();
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [updateClusterBoxesThrottled]);

  // Update elements on change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().remove();
    cy.add(elements);
    applyLayout(activeLayout);
  }, [elements, graphData]);

  // Synchronize selection state with Cytoscape styling
  useEffect(() => {
    applyVisualState();
  }, [selectedNodeId, applyVisualState]);

  // Center on selected node when triggered
  const handleCenterOnSelected = () => {
    const cy = cyRef.current;
    if (!cy) return;
    if (selectedNodeId) {
      const target = cy.getElementById(selectedNodeId);
      if (target.length > 0) {
        cy.animate({
          center: { eles: target },
          zoom: 1.25,
          duration: 400,
        });
        return;
      }
    }
    cy.fit(undefined, 70);
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('astro-graph-search-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`graph2d-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#050813',
      }}
    >
      {/* ─── TOP FILTER & SEARCH TOOLBAR ───────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 30,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.65rem 1.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(7, 11, 22, 0.90)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '320px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
                pointerEvents: 'none',
              }}
            />
            <input
              id="astro-graph-search-input"
              type="text"
              style={{
                width: '100%',
                backgroundColor: '#0d1424',
                color: '#ffffff',
                fontSize: '0.78rem',
                paddingLeft: '34px',
                paddingRight: '50px',
                paddingTop: '7px',
                paddingBottom: '7px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                outline: 'none',
                fontFamily: 'var(--font-mono, monospace)',
                boxSizing: 'border-box',
              }}
              placeholder="Search files, symbols, folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '10px',
                color: '#64748b',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '2px 5px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                pointerEvents: 'none',
              }}
            >
              ⌘ K
            </span>
          </div>

          {/* Node Type Filter */}
          <select
            style={{
              backgroundColor: '#0d1424',
              color: '#d1d5db',
              fontSize: '0.75rem',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              outline: 'none',
              cursor: 'pointer',
            }}
            value={nodeTypeFilter}
            onChange={(e) => setNodeTypeFilter(e.target.value)}
          >
            <option value="all">All nodes</option>
            <option value="file">Files only</option>
            <option value="symbol">Symbols / Functions</option>
          </select>

          {/* Language Filter */}
          <select
            style={{
              backgroundColor: '#0d1424',
              color: '#d1d5db',
              fontSize: '0.75rem',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              outline: 'none',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
          >
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'all' ? 'All languages' : lang}
              </option>
            ))}
          </select>

          {/* Dependency Filter */}
          <select
            style={{
              backgroundColor: '#0d1424',
              color: '#d1d5db',
              fontSize: '0.75rem',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              outline: 'none',
              cursor: 'pointer',
            }}
            value={dependencyFilter}
            onChange={(e) => setDependencyFilter(e.target.value)}
          >
            <option value="all">All dependencies</option>
            <option value="imports">Imports only</option>
            <option value="calls">Function calls</option>
            <option value="defines">Defines</option>
            <option value="contains">Contains / Uses</option>
            <option value="cross">Cross-folder only</option>
          </select>
        </div>

        {/* Layout Toggle Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: activeLayout === 'force' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: activeLayout === 'force' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: activeLayout === 'force' ? '#38bdf8' : '#9ca3af',
              boxShadow: activeLayout === 'force' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => {
              setActiveLayout('force');
              applyLayout('force');
            }}
          >
            <Share2 size={13} />
            <span>Force Directed</span>
          </button>

          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '8px',
              border: activeLayout === 'hierarchical' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
              backgroundColor: activeLayout === 'hierarchical' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: activeLayout === 'hierarchical' ? '#38bdf8' : '#9ca3af',
              boxShadow: activeLayout === 'hierarchical' ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onClick={() => {
              setActiveLayout('hierarchical');
              applyLayout('hierarchical');
            }}
          >
            <Layers size={13} />
            <span>Hierarchical</span>
          </button>

          <button
            type="button"
            style={{
              padding: '7px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#9ca3af',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Reset Filters"
            onClick={() => {
              setSearchQuery('');
              setNodeTypeFilter('all');
              setLanguageFilter('all');
              setDependencyFilter('all');
            }}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* ─── MAIN CYTOSCAPE CANVAS AREA ────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        {/* Cinematic deep space starry background */}
        <GalaxyBackground2D />

        {/* ─── VISUAL CLUSTER CONTAINERS (BEHIND NODES & EDGES) ─────────────── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {clusterBoxes.map((box) => (
            <div
              key={box.id}
              style={{
                position: 'absolute',
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                backgroundColor: box.bg,
                border: `1.6px solid ${box.color}`,
                borderRadius: '16px',
                boxShadow: `0 0 20px ${box.color}22, inset 0 0 15px ${box.color}0c`,
                pointerEvents: 'auto',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background-color 0.2s',
                zIndex: 2,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectCluster?.({
                  id: box.id,
                  path: box.path,
                  name: box.name,
                  color: box.color,
                });
              }}
            >
              {/* Cluster Header matching reference image: folder icon + name on left, file count badge on right */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Folder size={14} style={{ color: box.color }} />
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', 'Plus Jakarta Sans', monospace",
                      fontSize: '12px',
                      fontWeight: 700,
                      color: box.color,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {box.name}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: '10.5px',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    border: `1px solid ${box.color}66`,
                    color: '#e2e8f0',
                  }}
                >
                  {box.count} files
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Edge Info Tooltip */}
        {hoveredEdge && (
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(10, 16, 30, 0.94)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              color: '#e2e8f0',
              pointerEvents: 'none',
            }}
          >
            <span style={{ color: '#38bdf8', fontWeight: 600 }}>{hoveredEdge.source}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
              <ArrowRight size={12} />
              <span
                style={{
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  color:
                    hoveredEdge.relation === 'imports'
                      ? '#f97316'
                      : hoveredEdge.relation === 'calls'
                      ? '#38bdf8'
                      : hoveredEdge.relation === 'defines'
                      ? '#a855f7'
                      : '#10b981',
                }}
              >
                {hoveredEdge.relation}
              </span>
              <ArrowRight size={12} />
            </div>
            <span style={{ color: '#fb923c', fontWeight: 600 }}>{hoveredEdge.target}</span>
            {hoveredEdge.isCross && (
              <span
                style={{
                  fontSize: '9.5px',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(244, 63, 94, 0.2)',
                  color: '#fda4af',
                  border: '1px solid rgba(244, 63, 94, 0.4)',
                }}
              >
                cross-cluster
              </span>
            )}
          </div>
        )}

        {/* Cytoscape DOM container (File & Symbol nodes + Directed arrows) */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
          }}
        />

        {/* ─── FLOATING BOTTOM-LEFT CONTROLS ───────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '24px',
            zIndex: 25,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(10, 16, 30, 0.92)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          }}
        >
          <button
            type="button"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              color: '#d1d5db',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Zoom In"
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              color: '#d1d5db',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Zoom Out"
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              color: '#d1d5db',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Fit to Screen"
            onClick={() => cyRef.current?.fit(undefined, 70)}
          >
            <Maximize2 size={15} />
          </button>
          <button
            type="button"
            style={{
              padding: '6px 8px',
              borderRadius: '8px',
              color: '#d1d5db',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Center on Node"
            onClick={handleCenterOnSelected}
          >
            <Target size={15} />
          </button>
          <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />
          <span style={{ fontSize: '11px', fontFamily: 'monospace', padding: '0 8px', color: '#38bdf8', textTransform: 'capitalize' }}>
            {activeLayout === 'force' ? 'Force Directed' : 'Hierarchical'}
          </span>
        </div>

        {/* ─── BOTTOM GRAPH LEGEND MATCHING REFERENCE SNAPSHOT ─────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            zIndex: 25,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '12px',
            maxWidth: 'calc(100% - 320px)',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            background: 'rgba(10, 16, 30, 0.90)',
            backdropFilter: 'blur(12px)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {/* Node Types */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'rgba(244, 63, 94, 0.2)', border: '1px solid #f43f5e', display: 'inline-block' }} />
            <span style={{ color: '#d1d5db' }}>Folder</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '8px', borderRadius: '2px', backgroundColor: '#080e1e', border: '1.2px solid #38bdf8', display: 'inline-block' }} />
            <span style={{ color: '#d1d5db' }}>File</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '8px', borderRadius: '2px', backgroundColor: '#0c0e24', border: '1.2px solid #a855f7', display: 'inline-block' }} />
            <span style={{ color: '#d1d5db' }}>Class</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '8px', borderRadius: '2px', backgroundColor: '#061a1a', border: '1.2px solid #10b981', display: 'inline-block' }} />
            <span style={{ color: '#d1d5db' }}>Function</span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Relationship Types */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '2px', backgroundColor: '#f97316', display: 'inline-block' }} />
            <span style={{ color: '#f97316' }}>Imports</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '2px', backgroundColor: '#38bdf8', display: 'inline-block' }} />
            <span style={{ color: '#38bdf8' }}>Calls</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '0px', borderTop: '2px dashed #a855f7', display: 'inline-block' }} />
            <span style={{ color: '#a855f7' }}>Defines</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '14px', height: '0px', borderTop: '2px dotted #10b981', display: 'inline-block' }} />
            <span style={{ color: '#10b981' }}>Contains</span>
          </div>

          <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }} />

          {/* Focus Direction Hint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fb923c', boxShadow: '0 0 6px #fb923c', display: 'inline-block' }} />
            <span style={{ color: '#fdba74' }}>Outgoing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 6px #38bdf8', display: 'inline-block' }} />
            <span style={{ color: '#7dd3fc' }}>Incoming</span>
          </div>
        </div>
      </div>
    </div>
  );
}
