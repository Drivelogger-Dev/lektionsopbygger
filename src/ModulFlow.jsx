import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { MODULES_RAW } from "./data.js";

// ─────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────
const C = {
  theory: "#3B82F6",
  practice: "#22C55E",
  both: "#8B5CF6",
  selfStudy: "#A78BFA",
  gate: "#F59E0B",
  bg: "#0F172A",
  nodeBg: "#1E293B",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "#475569",
};

function typeColor(d) {
  const t = d.secType || d.type;
  if (t === "both") return C.both;
  if (t === "theory") return C.theory;
  return C.practice;
}

function typeLabel(d) {
  const t = d.secType || d.type;
  if (t === "both") return "T+P";
  if (t === "theory") return "T";
  return "P";
}

// ─────────────────────────────────────────────────────────
// OVERVIEW: 5 module nodes in a vertical chain
// ─────────────────────────────────────────────────────────

function buildOverview() {
  const nodes = [];
  const edges = [];
  const spacing = 120;

  MODULES_RAW.forEach((mod, idx) => {
    const id = `mod-${mod.id}`;
    const lessonParts = [];
    if (mod.theory) lessonParts.push(`${mod.theory} teori`);
    if (mod.practice) {
      let p = `${mod.practice} praksis`;
      if (mod.practiceNote) p += ` (${mod.practiceNote})`;
      lessonParts.push(p);
    }
    nodes.push({
      id,
      type: "overviewModule",
      data: {
        modId: mod.id,
        label: `Modul ${mod.id}`,
        title: mod.title,
        lessons: lessonParts.join(" · "),
        color: mod.color,
        sectionCount: mod.sections.length,
      },
      position: { x: 0, y: idx * spacing },
    });

    if (idx > 0) {
      edges.push({
        id: `e-overview-${idx}`,
        source: `mod-${MODULES_RAW[idx - 1].id}`,
        target: id,
        type: "smoothstep",
        style: { stroke: mod.color, strokeWidth: 2, strokeDasharray: "8 5" },
        markerEnd: { type: "arrowclosed", color: mod.color },
      });
    }
  });

  // Final node
  nodes.push({
    id: "final",
    type: "finalNode",
    data: {},
    position: { x: 0, y: MODULES_RAW.length * spacing },
  });
  edges.push({
    id: "e-overview-final",
    source: `mod-${MODULES_RAW[MODULES_RAW.length - 1].id}`,
    target: "final",
    type: "smoothstep",
    style: { stroke: C.practice, strokeWidth: 2, strokeDasharray: "8 5" },
    markerEnd: { type: "arrowclosed", color: C.practice },
  });

  return { nodes, edges };
}

// ─────────────────────────────────────────────────────────
// DETAIL: single module's internal structure
// ─────────────────────────────────────────────────────────

function buildModuleDetail(mod) {
  const nodes = [];
  const edges = [];
  const tpPairs = [];
  const gateSet = new Set(mod.gateIds || []);
  const blockedSet = new Set(mod.gateBlockedIds || []);
  const headerId = "header";

  // Header
  const lessonParts = [];
  if (mod.theory) lessonParts.push(`${mod.theory} teori`);
  if (mod.practice) {
    let p = `${mod.practice} praksis`;
    if (mod.practiceNote) p += ` (${mod.practiceNote})`;
    lessonParts.push(p);
  }
  nodes.push({
    id: headerId,
    type: "moduleHeader",
    data: { label: `Modul ${mod.id}`, title: mod.title, lessons: lessonParts.join(" · "), color: mod.color },
    position: { x: 0, y: 0 },
  });

  // Classify
  const mustFirst = mod.sections.filter(s => s.mustBeFirst);
  const gateSections = mod.sections.filter(s => gateSet.has(s.id) && !s.mustBeFirst);
  const allGate = [...mustFirst.filter(s => gateSet.has(s.id)), ...gateSections];
  const blocked = mod.sections.filter(s => blockedSet.has(s.id));
  const free = mod.sections.filter(s => !s.mustBeFirst && !gateSet.has(s.id) && !blockedSet.has(s.id));

  // Split free into main + revisited (practice-only "Genoptaget fra M3")
  const revisited = free.filter(s => s.type === "practice" && s.context && s.context.includes("Genoptaget"));
  const freeMain = free.filter(s => !(s.type === "practice" && s.context && s.context.includes("Genoptaget")));
  const hasMustFirst = mustFirst.length > 0;
  const hasGate = allGate.length > 0;
  const freeMainIsFirstTier = !hasMustFirst && !hasGate && freeMain.length > 0;
  const freeMainNeedsGrid = freeMain.length > 4;

  // Make section nodes
  const makeSecNode = (sec) => {
    const isGate = gateSet.has(sec.id);
    const isBlocked = blockedSet.has(sec.id);
    const baseData = {
      secId: sec.id, title: sec.title, goals: sec.goals || [],
      selfStudy: sec.selfStudy, mustBeFirst: sec.mustBeFirst,
      context: sec.context, highlight: sec.highlight || sec.highlightPractice,
      repeatable: sec.repeatable, modColor: mod.color, isGate, isBlocked,
    };

    if (sec.type === "both") {
      const tId = `${sec.id}-T`;
      const pId = `${sec.id}-P`;
      nodes.push({ id: tId, type: "sectionNode", position: { x: 0, y: 0 }, data: { ...baseData, secType: "theory" } });
      nodes.push({ id: pId, type: "sectionNode", position: { x: 0, y: 0 }, data: { ...baseData, secType: "practice", selfStudy: false } });
      const tpEdge = {
        id: `e-tp-${sec.id}`, source: tId, target: pId, type: "smoothstep",
        style: { stroke: C.practice, strokeWidth: 2 },
        markerEnd: { type: "arrowclosed", color: C.practice },
      };
      if (freeMainNeedsGrid) {
        tpEdge.sourceHandle = "right";
        tpEdge.targetHandle = "left";
      }
      edges.push(tpEdge);
      tpPairs.push({ tId, pId });
      return { firstId: tId, endId: pId };
    }

    const suffix = sec.type === "theory" ? "T" : "P";
    const nId = `${sec.id}-${suffix}`;
    nodes.push({ id: nId, type: "sectionNode", position: { x: 0, y: 0 }, data: { ...baseData, secType: sec.type } });
    return { firstId: nId, endId: nId };
  };

  const secMap = {};
  mod.sections.forEach(sec => { secMap[sec.id] = makeSecNode(sec); });

  // Header → first tier
  {
    const firstTier = hasMustFirst ? mustFirst : (hasGate ? allGate : freeMain.length > 0 ? freeMain : free.length > 0 ? free : blocked);
    firstTier.forEach((sec) => {
      const edge = {
        id: `e-h-${secMap[sec.id].firstId}`, source: headerId, target: secMap[sec.id].firstId,
        type: "smoothstep",
        style: { stroke: `${mod.color}70`, strokeWidth: 1.5 },
        markerEnd: { type: "arrowclosed", color: `${mod.color}70` },
      };
      if (freeMainNeedsGrid) {
        edge.sourceHandle = "right";
        edge.targetHandle = "left";
      }
      edges.push(edge);
    });
  }

  // mustFirst → prereq bar → freeMain (+ revisited below)
  if (hasMustFirst && (freeMain.length > 0 || revisited.length > 0)) {
    const barId = "prereq-bar";
    nodes.push({ id: barId, type: "gateBar", data: { color: mod.color, label: "ALLE FORRIGE SKAL VÆRE GENNEMFØRT" }, position: { x: 0, y: 0 } });
    mustFirst.forEach((sec) => {
      edges.push({
        id: `e-${secMap[sec.id].endId}-bar`, source: secMap[sec.id].endId, target: barId,
        type: "smoothstep", style: { stroke: mod.color, strokeWidth: 2 },
        markerEnd: { type: "arrowclosed", color: mod.color },
      });
    });
    freeMain.forEach((sec) => {
      edges.push({
        id: `e-bar-${secMap[sec.id].firstId}`, source: barId, target: secMap[sec.id].firstId,
        type: "smoothstep", style: { stroke: `${mod.color}80`, strokeWidth: 1.5, strokeDasharray: "6 3" },
        markerEnd: { type: "arrowclosed", color: `${mod.color}80` },
      });
    });
  }

  // Revisited sections → left side of header with labels
  if (revisited.length > 0) {
    nodes.push({
      id: "revisited-label",
      type: "labelNode",
      data: { label: "Genoptaget fra Modul 3 (tæt trafik)", color: `${mod.color}90` },
      position: { x: 0, y: 0 },
    });
    nodes.push({
      id: "revisited-order-label",
      type: "labelNode",
      data: { label: "Kan tages i vilkårlig rækkefølge", color: C.textMuted },
      position: { x: 0, y: 0 },
    });
    // Edges from header left → revisited sections
    if (freeMainNeedsGrid) {
      revisited.forEach((sec) => {
        edges.push({
          id: `e-h-rev-${secMap[sec.id].firstId}`,
          source: headerId, target: secMap[sec.id].firstId,
          sourceHandle: "left", targetHandle: "right",
          type: "smoothstep",
          style: { stroke: `${mod.color}50`, strokeWidth: 1.5 },
          markerEnd: { type: "arrowclosed", color: `${mod.color}50` },
        });
      });
    }
  }

  // Gate system
  if (allGate.length > 0 && blocked.length > 0) {
    const gateBarId = "gate-bar";
    nodes.push({ id: gateBarId, type: "gateBar", data: { color: C.gate, label: "ALLE FORRIGE SKAL VÆRE GENNEMFØRT" }, position: { x: 0, y: 0 } });
    allGate.forEach((sec) => {
      edges.push({
        id: `e-${secMap[sec.id].endId}-gate`, source: secMap[sec.id].endId, target: gateBarId,
        type: "smoothstep", style: { stroke: C.gate, strokeWidth: 2 },
        markerEnd: { type: "arrowclosed", color: C.gate },
      });
    });
    blocked.forEach((sec) => {
      edges.push({
        id: `e-gate-${secMap[sec.id].firstId}`, source: gateBarId, target: secMap[sec.id].firstId,
        type: "smoothstep", style: { stroke: `${C.gate}90`, strokeWidth: 1.5, strokeDasharray: "6 3" },
        markerEnd: { type: "arrowclosed", color: `${C.gate}90` },
      });
    });
  }

  const revisitedIds = revisited.map(s => secMap[s.id].firstId);
  const freeMainFirstIds = freeMainNeedsGrid ? freeMain.map(s => secMap[s.id].firstId) : [];
  const horizontal = freeMainNeedsGrid;
  return { nodes, edges, tpPairs, revisitedIds, freeMainFirstIds, horizontal };
}

// ─────────────────────────────────────────────────────────
// DAGRE LAYOUT
// ─────────────────────────────────────────────────────────

const SIZES = {
  overviewModule: { w: 300, h: 72 },
  moduleHeader: { w: 260, h: 56 },
  sectionNode: { w: 160, h: 72 },
  gateBar: { w: 340, h: 30 },
  labelNode: { w: 180, h: 20 },
  finalNode: { w: 200, h: 46 },
};

function layoutGraph(nodes, edges, tpPairs = [], revisitedIds = [], freeMainFirstIds = [], horizontal = false) {
  // Build lookup: T → P
  const tToPMap = {};
  tpPairs.forEach(({ tId, pId }) => { tToPMap[tId] = pId; });
  const freeSet = new Set(freeMainFirstIds);
  const revSet = new Set(revisitedIds);

  // ── Horizontal layout (M4-style: header → col1 → col2) ──
  if (horizontal && freeMainFirstIds.length > 0) {
    const posMap = {};
    const nodeW = SIZES.sectionNode.w;   // 160
    const nodeH = SIZES.sectionNode.h;   // 72
    const tpHGap = 20;                    // horizontal gap T → P
    const rowGap = 14;                    // vertical gap between rows
    const colGap = 80;                    // horizontal gap between column groups
    const rowH = nodeH + rowGap;

    // Header at origin
    posMap["header"] = { x: 0, y: 0 };

    // FreeMain: vertical stack to the right of header, T on left, P to its right
    const col1TX = SIZES.moduleHeader.w + 60;
    const col1PX = col1TX + nodeW + tpHGap;

    let curY = 0;
    freeMainFirstIds.forEach((id) => {
      const hasP = !!tToPMap[id];
      posMap[id] = { x: col1TX, y: curY };
      if (hasP) {
        posMap[tToPMap[id]] = { x: col1PX, y: curY };
      }
      curY += rowH;
    });

    // Center the header vertically
    const totalH = curY - rowGap;
    const centerY = totalH / 2;
    posMap["header"].y = centerY - SIZES.moduleHeader.h / 2;

    // Revisited: column to the LEFT of header
    if (revisitedIds.length > 0) {
      const revColX = -(nodeW + 60);
      const labelW = SIZES.labelNode.w;

      // Center revisited group around header's center
      const revGroupH = revisitedIds.length * rowH - rowGap;
      const revStartY = centerY - revGroupH / 2;
      const labelX = revColX + (nodeW - labelW) / 2;

      posMap["revisited-label"] = { x: labelX, y: revStartY - 50 };
      posMap["revisited-order-label"] = { x: labelX, y: revStartY - 34 };

      let revY = revStartY;
      revisitedIds.forEach((id) => {
        posMap[id] = { x: revColX, y: revY };
        revY += rowH;
      });
    }

    return nodes.map((n) => ({ ...n, position: posMap[n.id] || { x: 0, y: 0 } }));
  }

  // ── Standard vertical (TB) layout via dagre ──
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 60, marginx: 30, marginy: 30 });

  nodes.forEach((n) => {
    const s = SIZES[n.type] || { w: 160, h: 70 };
    g.setNode(n.id, { width: s.w, height: s.h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const posMap = {};
  nodes.forEach((n) => {
    const pos = g.node(n.id);
    const s = SIZES[n.type] || { w: 160, h: 70 };
    posMap[n.id] = { x: pos.x - s.w / 2, y: pos.y - s.h / 2 };
  });

  // Align P node X with its T node
  tpPairs.forEach(({ tId, pId }) => {
    if (posMap[tId] && posMap[pId]) {
      posMap[pId].x = posMap[tId].x;
    }
  });

  return nodes.map((n) => ({ ...n, position: posMap[n.id] }));
}

// ─────────────────────────────────────────────────────────
// CUSTOM NODES
// ─────────────────────────────────────────────────────────

function OverviewModuleNode({ data }) {
  return (
    <div style={{
      background: `${data.color}15`,
      border: `2px solid ${data.color}`,
      borderRadius: 14,
      padding: "12px 28px",
      textAlign: "center",
      width: 320,
      cursor: "pointer",
      boxShadow: `0 4px 24px ${data.color}20`,
      transition: "transform 0.15s, box-shadow 0.15s",
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 18, fontWeight: 800, color: data.color }}>{data.label}</div>
      <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{data.title}</div>
      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
        {data.lessons} &middot; {data.sectionCount} emner
      </div>
      <div style={{ fontSize: 10, color: `${data.color}90`, marginTop: 4 }}>
        Klik for at se opbygning &#8594;
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function ModuleHeaderNode({ data }) {
  return (
    <div style={{
      background: `${data.color}20`,
      border: `2px solid ${data.color}`,
      borderRadius: 12,
      padding: "8px 20px",
      textAlign: "center",
      minWidth: 240,
      boxShadow: `0 4px 20px ${data.color}25`,
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 15, fontWeight: 800, color: data.color }}>{data.label}</div>
      <div style={{ fontSize: 11, color: C.text }}>{data.title}</div>
      <div style={{ fontSize: 10, color: C.textMuted }}>{data.lessons}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" id="right" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" id="left" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  );
}

const NODE_H = 72;

function SectionNode({ data }) {
  const [expanded, setExpanded] = useState(false);
  const color = typeColor(data);
  const borderColor = data.isGate ? C.gate : data.isBlocked ? `${C.gate}80` : `${color}80`;
  const hasBadge = data.selfStudy || data.isGate || data.repeatable;

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        position: "relative",
        background: C.nodeBg,
        border: `2px solid ${borderColor}`,
        borderRadius: 10,
        padding: "6px 10px",
        textAlign: "center",
        width: 160,
        height: NODE_H,
        cursor: "pointer",
        boxShadow: expanded ? `0 0 16px ${borderColor}50` : `0 2px 6px rgba(0,0,0,0.3)`,
        transition: "box-shadow 0.15s",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Handle id="top" type="target" position={Position.Top} style={{ background: borderColor, width: 7, height: 7 }} />
      <Handle id="left" type="target" position={Position.Left} style={{ background: borderColor, width: 7, height: 7 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{data.secId}</span>
        <span style={{
          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
          background: `${color}30`, color,
        }}>{typeLabel(data)}</span>
      </div>

      <div style={{ fontSize: 10, color: "#CBD5E1", lineHeight: 1.3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.title}</div>

      {hasBadge && (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 3, marginTop: 3 }}>
          {data.selfStudy && (
            <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 4px", borderRadius: 3, background: `${C.selfStudy}25`, color: C.selfStudy }}>Selvstudium</span>
          )}
          {data.isGate && (
            <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 4px", borderRadius: 3, background: `${C.gate}25`, color: C.gate }}>Gate</span>
          )}
          {data.repeatable && (
            <span style={{ fontSize: 8, fontWeight: 600, padding: "1px 4px", borderRadius: 3, background: "#F472B625", color: "#F472B6" }}>Gentagelig</span>
          )}
        </div>
      )}

      {expanded && data.goals.length > 0 && (
        <div style={{
          position: "absolute", top: NODE_H + 4, left: 0, right: 0,
          background: C.nodeBg, border: `1px solid ${borderColor}`, borderRadius: 8,
          padding: "8px 10px", textAlign: "left", zIndex: 50,
          boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
        }}>
          {data.context && <div style={{ fontSize: 8, color: C.textMuted, fontStyle: "italic", marginBottom: 3 }}>{data.context}</div>}
          {data.highlight && <div style={{ fontSize: 8, color: "#FBBF24", marginBottom: 3, fontStyle: "italic" }}>{data.highlight}</div>}
          {data.goals.map((g, i) => (
            <div key={i} style={{ fontSize: 9, color: "#CBD5E1", padding: "1px 0" }}>{g}</div>
          ))}
        </div>
      )}

      <Handle id="bottom" type="source" position={Position.Bottom} style={{ background: borderColor, width: 7, height: 7 }} />
      <Handle id="right" type="source" position={Position.Right} style={{ background: borderColor, width: 7, height: 7 }} />
    </div>
  );
}

function GateBarNode({ data }) {
  const color = data.color || C.gate;
  const label = data.label || "ALLE FORRIGE SKAL VÆRE GENNEMFØRT";
  const vertical = data.vertical;

  if (vertical) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        minHeight: 200, padding: "14px 4px",
      }}>
        <Handle type="target" position={Position.Left} style={{ background: color, width: 7, height: 7 }} />
        <div style={{ flex: 1, width: 2, background: `${color}50` }} />
        <div style={{
          fontSize: 10, fontWeight: 700, color, letterSpacing: 1,
          writingMode: "vertical-lr", textOrientation: "mixed", whiteSpace: "nowrap",
        }}>{label}</div>
        <div style={{ flex: 1, width: 2, background: `${color}50` }} />
        <Handle type="source" position={Position.Right} style={{ background: color, width: 7, height: 7 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 320, padding: "4px 14px" }}>
      <Handle type="target" position={Position.Top} style={{ background: color, width: 7, height: 7 }} />
      <div style={{ flex: 1, height: 2, background: `${color}50` }} />
      <div style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 1 }}>{label}</div>
      <div style={{ flex: 1, height: 2, background: `${color}50` }} />
      <Handle type="source" position={Position.Bottom} style={{ background: color, width: 7, height: 7 }} />
    </div>
  );
}

function FinalNode() {
  return (
    <div style={{
      background: `${C.practice}18`, border: `2px solid ${C.practice}`, borderRadius: 12,
      padding: "10px 24px", textAlign: "center", boxShadow: `0 4px 20px ${C.practice}25`,
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ fontSize: 14, fontWeight: 800, color: C.practice }}>Klar til k&#248;repr&#248;ve!</div>
    </div>
  );
}

function LabelNode({ data }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 700, color: data.color || C.textMuted,
      letterSpacing: 0.5, textAlign: "center", padding: "2px 8px",
      whiteSpace: "nowrap",
    }}>
      {data.label}
    </div>
  );
}

const overviewNodeTypes = {
  overviewModule: OverviewModuleNode,
  finalNode: FinalNode,
};

const detailNodeTypes = {
  moduleHeader: ModuleHeaderNode,
  sectionNode: SectionNode,
  gateBar: GateBarNode,
  labelNode: LabelNode,
};

// ─────────────────────────────────────────────────────────
// OVERVIEW VIEW
// ─────────────────────────────────────────────────────────

function OverviewFlow({ onSelectModule }) {
  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    const { nodes, edges } = buildOverview();
    return { nodes, edges };
  }, []);

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  const onNodeClick = useCallback((_, node) => {
    if (node.type === "overviewModule") {
      onSelectModule(node.data.modId);
    }
  }, [onSelectModule]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={overviewNodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.5}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: C.bg }}
      nodesDraggable={false}
    >
      <Background color="#1E293B" gap={20} size={1} />
    </ReactFlow>
  );
}

// ─────────────────────────────────────────────────────────
// DETAIL VIEW
// ─────────────────────────────────────────────────────────

function DetailFlow({ mod }) {
  const { initNodes, initEdges } = useMemo(() => {
    const { nodes: raw, edges, tpPairs, revisitedIds, freeMainFirstIds, horizontal } = buildModuleDetail(mod);
    const nodes = layoutGraph(raw, edges, tpPairs, revisitedIds, freeMainFirstIds, horizontal);
    return { initNodes: nodes, initEdges: edges };
  }, [mod]);

  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={detailNodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: C.bg }}
    >
      <Background color="#1E293B" gap={20} size={1} />
      <Controls
        position="bottom-left"
        style={{ background: C.nodeBg, borderRadius: 8, border: `1px solid ${C.border}` }}
      />
    </ReactFlow>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

export default function ModulFlow() {
  const [selectedModId, setSelectedModId] = useState(null);
  const selectedMod = selectedModId ? MODULES_RAW.find(m => m.id === selectedModId) : null;
  const modIdx = selectedMod ? MODULES_RAW.findIndex(m => m.id === selectedModId) : -1;
  const prevMod = modIdx > 0 ? MODULES_RAW[modIdx - 1] : null;
  const nextMod = modIdx >= 0 && modIdx < MODULES_RAW.length - 1 ? MODULES_RAW[modIdx + 1] : null;

  return (
    <div style={{ width: "100vw", height: "100vh", background: C.bg }}>
      {/* Top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        background: `${C.bg}E0`, backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${C.border}40`,
        padding: "8px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {selectedMod ? (
            <button
              onClick={() => setSelectedModId(null)}
              style={{
                padding: "5px 12px", background: C.nodeBg, color: "#93C5FD",
                borderRadius: 6, fontSize: 12, border: `1px solid ${C.border}`,
                cursor: "pointer",
              }}
            >&#8592; Alle moduler</button>
          ) : (
            <a href="#" style={{
              padding: "5px 12px", background: C.nodeBg, color: "#93C5FD",
              borderRadius: 6, textDecoration: "none", fontSize: 12,
              border: `1px solid ${C.border}`,
            }}>&#8592; Lektionsopbygger</a>
          )}
          {selectedMod && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => prevMod && setSelectedModId(prevMod.id)}
                disabled={!prevMod}
                title={prevMod ? `Modul ${prevMod.id}` : undefined}
                style={{
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  background: prevMod ? C.nodeBg : "transparent",
                  color: prevMod ? prevMod.color : `${C.border}80`,
                  borderRadius: 6, fontSize: 14, border: prevMod ? `1px solid ${prevMod.color}50` : `1px solid ${C.border}40`,
                  cursor: prevMod ? "pointer" : "default", opacity: prevMod ? 1 : 0.4,
                }}
              >&#9650;</button>
              <button
                onClick={() => nextMod && setSelectedModId(nextMod.id)}
                disabled={!nextMod}
                title={nextMod ? `Modul ${nextMod.id}` : undefined}
                style={{
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  background: nextMod ? C.nodeBg : "transparent",
                  color: nextMod ? nextMod.color : `${C.border}80`,
                  borderRadius: 6, fontSize: 14, border: nextMod ? `1px solid ${nextMod.color}50` : `1px solid ${C.border}40`,
                  cursor: nextMod ? "pointer" : "default", opacity: nextMod ? 1 : 0.4,
                }}
              >&#9660;</button>
            </div>
          )}
          <span style={{ fontSize: 14, fontWeight: 700, color: selectedMod ? selectedMod.color : C.text }}>
            {selectedMod
              ? `Modul ${selectedMod.id} \u2014 ${selectedMod.title}`
              : "Modulflow \u2014 k\u00F8reuddannelsen"}
          </span>
        </div>
        {selectedMod && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {[
              { c: C.theory, l: "Teori" },
              { c: C.practice, l: "Praksis" },
              { c: C.selfStudy, l: "Selvstudium" },
              { c: C.gate, l: "Gate" },
            ].map(({ c, l }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.textMuted }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
                {l}
              </div>
            ))}
          </div>
        )}
        {!selectedMod && (
          <span style={{ fontSize: 11, color: C.textMuted }}>Klik p&#229; et modul for at se detaljer</span>
        )}
      </div>

      {selectedMod ? <DetailFlow key={selectedMod.id} mod={selectedMod} /> : <OverviewFlow onSelectModule={setSelectedModId} />}
    </div>
  );
}
