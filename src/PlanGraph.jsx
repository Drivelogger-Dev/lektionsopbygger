import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { MODULES_RAW } from "./data.js";

// ─────────────────────────────────────────────────────────
// SHARED DATA (mirrors Forløbsplanlægger)
// ─────────────────────────────────────────────────────────

function buildItems(modules) {
  const items = [];
  modules.forEach(mod => {
    mod.sections.forEach(sec => {
      if (sec.type === "both") {
        items.push({
          uid: `${mod.id}-${sec.id}-T`,
          moduleId: mod.id, sectionId: sec.id, mode: "theory",
          title: sec.title, mustBeFirst: sec.mustBeFirst,
        });
        items.push({
          uid: `${mod.id}-${sec.id}-P`,
          moduleId: mod.id, sectionId: sec.id, mode: "practice",
          title: sec.title, mustBeFirst: sec.mustBeFirst,
        });
      } else {
        items.push({
          uid: `${mod.id}-${sec.id}-${sec.type === "theory" ? "T" : "P"}`,
          moduleId: mod.id, sectionId: sec.id, mode: sec.type,
          title: sec.title, mustBeFirst: sec.mustBeFirst,
        });
      }
    });
  });
  return items;
}

const ALL_ITEMS = buildItems(MODULES_RAW);

function findItem(uid) {
  return ALL_ITEMS.find(i => i.uid === uid) || ALL_ITEMS.find(i => i.uid === uid.replace(/#\d+$/, ""));
}

// ─────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────

const C = {
  theory: "#3B82F6",
  practice: "#22C55E",
  selfStudy: "#A78BFA",
  bg: "#0F172A",
  nodeBg: "#1E293B",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  border: "#475569",
};

const MODULE_COLORS = Object.fromEntries(MODULES_RAW.map(m => [m.id, m.color]));

const BLOCK_TYPE_COLORS = {
  theory: C.theory,
  practice: C.practice,
  selfStudy: C.selfStudy,
};

const BLOCK_TYPE_LABELS = {
  theory: "Teori",
  practice: "Kørsel",
  selfStudy: "Selvstudium",
};

const BLOCK_TYPE_ICONS = {
  theory: "📖",
  practice: "🚗",
  selfStudy: "📚",
};

// ─────────────────────────────────────────────────────────
// GRAPH BUILDING
// ─────────────────────────────────────────────────────────

const MOD_NODE_W = 220;
const MOD_NODE_H = 80;
const FINAL_NODE_W = 200;
const FINAL_NODE_H = 60;
const EXAM_NODE_W = 180;
const EXAM_NODE_H = 54;
const BLOCK_NODE_W = 170;
const BLOCK_NODE_H = 64;

// Compute rule-based dependencies between blocks within the same module
function computeIntraModuleDeps(modId, modBlocks, blocks) {
  const deps = []; // { from: blockIdx, to: blockIdx }
  const blockIndices = new Set(modBlocks.map(b => b.blockIdx));

  // Helper: which block index contains a given UID?
  const uidToBlockIdx = {};
  blocks.forEach((block, bIdx) => {
    block.items.forEach(uid => { uidToBlockIdx[uid] = bIdx; });
  });

  // Rule 1: Theory before practice for "both" sections
  ALL_ITEMS.forEach(item => {
    if (item.moduleId !== modId || item.mode !== "practice") return;
    const theoryUid = item.uid.replace(/-P$/, "-T");
    const pIdx = uidToBlockIdx[item.uid];
    const tIdx = uidToBlockIdx[theoryUid];
    if (pIdx !== undefined && tIdx !== undefined && pIdx !== tIdx
        && blockIndices.has(pIdx) && blockIndices.has(tIdx)) {
      deps.push({ from: tIdx, to: pIdx });
    }
  });
  // Also repeatable copies
  blocks.forEach((block, bIdx) => {
    if (!blockIndices.has(bIdx)) return;
    block.items.forEach(uid => {
      if (!uid.includes("#")) return;
      const baseUid = uid.replace(/#\d+$/, "");
      const item = findItem(baseUid);
      if (!item || item.moduleId !== modId || item.mode !== "practice") return;
      const theoryUid = baseUid.replace(/-P$/, "-T");
      const tIdx = uidToBlockIdx[theoryUid];
      if (tIdx !== undefined && tIdx !== bIdx && blockIndices.has(tIdx)) {
        deps.push({ from: tIdx, to: bIdx });
      }
    });
  });

  // Helper: set of practice-type block indices (these only get T→P edges, no rule 2/3 edges)
  const practiceBlockIndices = new Set(
    modBlocks.filter(({ block }) => block.type === "practice").map(({ blockIdx }) => blockIdx)
  );

  // Rule 2: M1 mustBeFirst — blocks with sections 0/10.1.1 must come before other M1 blocks
  // Only targets non-practice blocks (practice blocks get their deps from Rule 1 T→P matching)
  if (modId === 1) {
    const mustFirstBlocks = new Set();
    const otherBlocks = new Set();
    modBlocks.forEach(({ blockIdx, block }) => {
      block.items.forEach(uid => {
        const item = findItem(uid);
        if (!item || item.moduleId !== 1) return;
        if (item.sectionId === "0" || item.sectionId === "10.1.1") {
          mustFirstBlocks.add(blockIdx);
        } else if (!practiceBlockIndices.has(blockIdx)) {
          otherBlocks.add(blockIdx);
        }
      });
    });
    mustFirstBlocks.forEach(from => {
      otherBlocks.forEach(to => {
        if (from !== to) deps.push({ from, to });
      });
    });
  }

  // Rule 3: M3 regel — praksis fra 7.1-7.3, 7.6-7.8 skal gennemføres før øvrige M3-emner
  // Kun teori/selvstudieblokke som targets (praksis-blokke får deps fra Rule 1 T→P matching)
  if (modId === 3) {
    const mod3 = MODULES_RAW.find(m => m.id === 3);
    if (mod3) {
      const gateUids = (mod3.gateIds || []).map(id => `3-${id}-P`);
      const blockedUids = (mod3.gateBlockedIds || []).flatMap(id => [`3-${id}-T`, `3-${id}-P`]);
      const gateBlockSet = new Set();
      const blockedBlockSet = new Set();
      gateUids.forEach(uid => {
        if (uidToBlockIdx[uid] !== undefined && blockIndices.has(uidToBlockIdx[uid]))
          gateBlockSet.add(uidToBlockIdx[uid]);
      });
      blockedUids.forEach(uid => {
        const bIdx = uidToBlockIdx[uid];
        if (bIdx !== undefined && blockIndices.has(bIdx) && !practiceBlockIndices.has(bIdx))
          blockedBlockSet.add(bIdx);
      });
      gateBlockSet.forEach(from => {
        blockedBlockSet.forEach(to => {
          if (from !== to) deps.push({ from, to });
        });
      });
    }
  }

  // Deduplicate
  const seen = new Set();
  return deps.filter(d => {
    const key = `${d.from}->${d.to}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildGraph(blocks) {
  const nodes = [];
  const edges = [];

  // Group blocks by module
  const blocksByModule = {};
  blocks.forEach((block, bIdx) => {
    const mods = new Set();
    block.items.forEach(uid => {
      const item = findItem(uid);
      if (item) mods.add(item.moduleId);
    });
    mods.forEach(modId => {
      if (!blocksByModule[modId]) blocksByModule[modId] = [];
      if (!blocksByModule[modId].some(b => b.blockIdx === bIdx)) {
        blocksByModule[modId].push({ blockIdx: bIdx, block });
      }
    });
  });

  const activeModules = MODULES_RAW.filter(m => blocksByModule[m.id]?.length > 0);

  activeModules.forEach((mod) => {
    const modNodeId = `mod-${mod.id}`;
    const modBlocks = blocksByModule[mod.id] || [];

    // Module node
    const lessonParts = [];
    if (mod.theory) lessonParts.push(`${mod.theory} teori`);
    if (mod.practice) lessonParts.push(`${mod.practice} praksis`);

    nodes.push({
      id: modNodeId,
      type: "moduleNode",
      data: {
        modId: mod.id,
        label: `Modul ${mod.id}`,
        title: mod.title,
        color: mod.color,
        blockCount: modBlocks.length,
        lessons: lessonParts.join(" + "),
        sectionCount: mod.sections.length,
        sections: mod.sections.map(s => ({
          id: s.id, title: s.title, type: s.type,
          goalCount: s.goals?.length || 0,
        })),
      },
      position: { x: 0, y: 0 },
    });

    // Block nodes
    modBlocks.forEach(({ blockIdx, block }) => {
      const items = block.items.map(uid => {
        const item = findItem(uid);
        return item ? { uid, title: item.title, sectionId: item.sectionId, mode: item.mode, mustBeFirst: !!item.mustBeFirst } : null;
      }).filter(Boolean);

      const hasMustBeFirst = items.some(i => i.mustBeFirst);

      nodes.push({
        id: `block-${blockIdx}`,
        type: "blockNode",
        data: {
          label: block.name,
          blockType: block.type,
          lessons: block.lessons,
          itemCount: block.items.length,
          items,
          hasMustBeFirst,
        },
        position: { x: 0, y: 0 },
      });
    });

    // Compute rule-based intra-module dependencies
    const intraDeps = computeIntraModuleDeps(mod.id, modBlocks, blocks);
    const hasIncoming = new Set(intraDeps.map(d => d.to));

    // Roots = blocks with no incoming edges within this module → module points to them
    modBlocks.forEach(({ blockIdx }) => {
      if (!hasIncoming.has(blockIdx)) {
        edges.push({
          id: `e-${modNodeId}-to-${blockIdx}`,
          source: modNodeId,
          sourceHandle: "bottom",
          target: `block-${blockIdx}`,
          type: "smoothstep",
          style: { stroke: mod.color, strokeWidth: 2 },
          markerEnd: { type: "arrowclosed", color: mod.color },
        });
      }
    });

    // Intra-module dependency edges
    intraDeps.forEach((dep, i) => {
      edges.push({
        id: `e-intra-${mod.id}-${i}`,
        source: `block-${dep.from}`,
        target: `block-${dep.to}`,
        type: "smoothstep",
        style: { stroke: `${mod.color}90`, strokeWidth: 1.5 },
        markerEnd: { type: "arrowclosed", color: `${mod.color}90` },
      });
    });
  });

  // Inter-module: sink blocks (no outgoing within module) → next module
  for (let i = 0; i < activeModules.length - 1; i++) {
    const curMod = activeModules[i];
    const nextMod = activeModules[i + 1];
    const curBlocks = blocksByModule[curMod.id] || [];
    if (curBlocks.length === 0) continue;

    const intraDeps = computeIntraModuleDeps(curMod.id, curBlocks, blocks);
    const hasOutgoing = new Set(intraDeps.map(d => d.from));

    // Sinks = blocks with no outgoing edges
    const sinks = curBlocks.filter(({ blockIdx }) => !hasOutgoing.has(blockIdx));

    sinks.forEach(({ blockIdx }) => {
      edges.push({
        id: `e-mod-${curMod.id}-sink-${blockIdx}-to-${nextMod.id}`,
        source: `block-${blockIdx}`,
        target: `mod-${nextMod.id}`,
        type: "smoothstep",
        style: { stroke: nextMod.color, strokeWidth: 2.5, strokeDasharray: "8 4" },
        markerEnd: { type: "arrowclosed", color: nextMod.color },
      });
    });
  }

  // Teoriprøve node: directly from Modul 4 node, points to Køreprøve
  const mod4 = activeModules.find(m => m.id === 4);
  if (mod4) {
    nodes.push({
      id: "theory-exam",
      type: "examNode",
      data: {},
      position: { x: 0, y: 0 },
    });

    edges.push({
      id: "e-mod4-to-exam",
      source: "mod-4",
      sourceHandle: "right",
      target: "theory-exam",
      type: "smoothstep",
      style: { stroke: "#3B82F6", strokeWidth: 2.5, strokeDasharray: "8 4" },
      markerEnd: { type: "arrowclosed", color: "#3B82F6" },
    });
  }

  // Final node: Køreprøve after M5 sinks + Teoriprøve
  const lastMod = activeModules[activeModules.length - 1];
  if (lastMod) {
    const lastBlocks = blocksByModule[lastMod.id] || [];
    const lastDeps = computeIntraModuleDeps(lastMod.id, lastBlocks, blocks);
    const lastHasOutgoing = new Set(lastDeps.map(d => d.from));
    const lastSinks = lastBlocks.filter(({ blockIdx }) => !lastHasOutgoing.has(blockIdx));

    nodes.push({
      id: "final",
      type: "finalNode",
      data: {},
      position: { x: 0, y: 0 },
    });

    lastSinks.forEach(({ blockIdx }) => {
      edges.push({
        id: `e-final-${blockIdx}`,
        source: `block-${blockIdx}`,
        target: "final",
        type: "smoothstep",
        style: { stroke: "#22C55E", strokeWidth: 2.5, strokeDasharray: "8 4" },
        markerEnd: { type: "arrowclosed", color: "#22C55E" },
      });
    });

  }

  // Layout with dagre
  const SIZES = {
    moduleNode: { w: MOD_NODE_W, h: MOD_NODE_H },
    blockNode: { w: BLOCK_NODE_W, h: BLOCK_NODE_H },
    examNode: { w: EXAM_NODE_W, h: EXAM_NODE_H },
    finalNode: { w: FINAL_NODE_W, h: FINAL_NODE_H },
  };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "BT", nodesep: 40, ranksep: 70, marginx: 40, marginy: 40 });

  // Exclude theory-exam from dagre layout — position it manually
  const dagreNodes = nodes.filter(n => n.id !== "theory-exam");
  const dagreEdges = edges.filter(e => e.source !== "theory-exam" && e.target !== "theory-exam");

  dagreNodes.forEach(n => {
    const s = SIZES[n.type] || { w: 170, h: 64 };
    g.setNode(n.id, { width: s.w, height: s.h });
  });
  dagreEdges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const laidOut = dagreNodes.map(n => {
    const pos = g.node(n.id);
    const s = SIZES[n.type] || { w: 170, h: 64 };
    return { ...n, position: { x: pos.x - s.w / 2, y: pos.y - s.h / 2 } };
  });

  // Position theory-exam to the right of mod-4
  const examNode = nodes.find(n => n.id === "theory-exam");
  if (examNode) {
    const mod4Pos = g.node("mod-4");
    if (mod4Pos) {
      laidOut.push({
        ...examNode,
        position: {
          x: mod4Pos.x + MOD_NODE_W / 2 + 60,
          y: mod4Pos.y - EXAM_NODE_H / 2,
        },
      });
    }
  }

  return { nodes: laidOut, edges };
}

// ─────────────────────────────────────────────────────────
// CUSTOM NODES
// ─────────────────────────────────────────────────────────

const SEC_TYPE_LABEL = { theory: "T", practice: "P", both: "T+P" };

function ModuleNode({ data }) {
  const [expanded, setExpanded] = useState(false);

  // Styres via data.onModuleClick fra onNodeClick — toggle kun hvis allerede fokuseret
  return (
    <div
      onClick={() => {
        if (data.isFocused) setExpanded(!expanded);
      }}
      style={{
        position: "relative",
        background: `${data.color}18`,
        border: `2.5px solid ${data.color}`,
        borderRadius: 14,
        padding: "10px 24px",
        textAlign: "center",
        width: MOD_NODE_W,
        height: MOD_NODE_H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow: expanded ? `0 0 20px ${data.color}40` : `0 6px 24px ${data.color}25`,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle type="target" position={Position.Bottom} style={{ background: data.color, width: 8, height: 8 }} />
      {data.modId === 4 && <Handle id="right" type="source" position={Position.Right} style={{ background: data.color, width: 7, height: 7 }} />}
      <div style={{ fontSize: 16, fontWeight: 800, color: data.color }}>
        {data.label}
      </div>
      <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>
        {data.title}
      </div>
      <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>
        {data.lessons} · {data.blockCount} {data.blockCount === 1 ? "blok" : "blokke"}
      </div>

      {expanded && data.sections && (
        <div style={{
          position: "absolute", bottom: MOD_NODE_H + 6, left: 0, right: 0,
          background: "#141820", border: `1.5px solid ${data.color}60`, borderRadius: 10,
          padding: "10px 12px", textAlign: "left", zIndex: 50,
          boxShadow: `0 8px 28px rgba(0,0,0,0.6)`,
          maxHeight: 280, overflowY: "auto",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: data.color, marginBottom: 6 }}>
            {data.sectionCount} emner
          </div>
          {data.sections.map(sec => (
            <div key={sec.id} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "3px 0", borderBottom: "1px solid #1F2937",
            }}>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                background: sec.type === "theory" ? `${C.theory}25` : sec.type === "practice" ? `${C.practice}25` : "#8B5CF625",
                color: sec.type === "theory" ? C.theory : sec.type === "practice" ? C.practice : "#8B5CF6",
                minWidth: 22, textAlign: "center",
              }}>
                {SEC_TYPE_LABEL[sec.type]}
              </span>
              <span style={{ fontSize: 10, color: C.text, flex: 1 }}>{sec.id} {sec.title}</span>
              <span style={{ fontSize: 8, color: C.textMuted }}>{sec.goalCount} mål</span>
            </div>
          ))}
        </div>
      )}

      <Handle id="bottom" type="source" position={Position.Top} style={{ background: data.color, width: 8, height: 8 }} />
    </div>
  );
}

function BlockNode({ data }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = BLOCK_TYPE_COLORS[data.blockType] || "#888";

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        position: "relative",
        background: C.nodeBg,
        border: `2px solid ${typeColor}`,
        borderRadius: 10,
        padding: "6px 12px",
        width: BLOCK_NODE_W,
        height: BLOCK_NODE_H,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxShadow: expanded ? `0 0 16px ${typeColor}40` : `0 3px 12px ${typeColor}15`,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}
    >
      <Handle type="target" position={Position.Bottom} style={{ background: typeColor, width: 7, height: 7 }} />

      <div style={{
        fontSize: 12, fontWeight: 700, color: C.text,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        marginBottom: 3,
      }}>
        {BLOCK_TYPE_ICONS[data.blockType] || ""} {data.label}{data.hasMustBeFirst ? " ⚡" : ""}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
          background: `${typeColor}25`, color: typeColor,
        }}>
          {BLOCK_TYPE_LABELS[data.blockType]}
        </span>
        <span style={{ fontSize: 9, color: C.textMuted }}>
          {data.lessons} lekt. · {data.itemCount} mål
        </span>
      </div>

      {expanded && data.items && data.items.length > 0 && (
        <div style={{
          position: "absolute", bottom: BLOCK_NODE_H + 6, left: 0, right: 0,
          background: "#141820", border: `1.5px solid ${typeColor}60`, borderRadius: 10,
          padding: "10px 12px", textAlign: "left", zIndex: 50,
          boxShadow: `0 8px 28px rgba(0,0,0,0.6)`,
          maxHeight: 240, overflowY: "auto",
        }}>
          {data.items.map(item => (
            <div key={item.uid} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "3px 0", borderBottom: "1px solid #1F2937",
            }}>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: "1px 4px", borderRadius: 3,
                background: item.mode === "theory" ? `${C.theory}25` : `${C.practice}25`,
                color: item.mode === "theory" ? C.theory : C.practice,
                minWidth: 14, textAlign: "center",
              }}>
                {item.mode === "theory" ? "T" : "P"}
              </span>
              <span style={{ fontSize: 10, color: C.text }}>{item.sectionId} {item.title}</span>
              {item.mustBeFirst && (
                <span title="Skal først" style={{ fontSize: 10, marginLeft: "auto" }}>⚡</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Handle type="source" position={Position.Top} style={{ background: typeColor, width: 7, height: 7 }} />
    </div>
  );
}

function ExamNode() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        position: "relative",
        background: `${C.theory}12`,
        border: `2.5px solid ${C.theory}`,
        borderRadius: 14,
        padding: "8px 20px",
        width: EXAM_NODE_W,
        height: EXAM_NODE_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        boxShadow: expanded ? `0 0 16px ${C.theory}40` : `0 6px 24px ${C.theory}25`,
        cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}>
      <Handle type="target" position={Position.Left} style={{ background: C.theory, width: 8, height: 8 }} />
      <span style={{ fontSize: 20 }}>📝</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.theory }}>Teoriprøve</div>
      </div>
      {expanded && (
        <div style={{
          position: "absolute", bottom: EXAM_NODE_H + 6, left: 0, right: 0,
          background: "#141820", border: `1.5px solid ${C.theory}60`, borderRadius: 10,
          padding: "10px 12px", textAlign: "left", zIndex: 50,
          boxShadow: "0 8px 28px rgba(0,0,0,0.6)",
        }}>
          <div style={{ fontSize: 10, color: C.text }}>
            Må tages efter modul 4 er godkendt
          </div>
        </div>
      )}
    </div>
  );
}

function FinalNode() {
  return (
    <div style={{
      background: `${C.practice}12`,
      border: `2.5px solid ${C.practice}`,
      borderRadius: 14,
      padding: "10px 24px",
      width: FINAL_NODE_W,
      height: FINAL_NODE_H,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      boxShadow: `0 6px 24px ${C.practice}25`,
    }}>
      <Handle type="target" position={Position.Bottom} style={{ background: C.practice, width: 8, height: 8 }} />
      <span style={{ fontSize: 22 }}>🏁</span>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.practice }}>Køreprøve</div>
        <div style={{ fontSize: 9, color: C.textMuted }}>Klar til teori- og praktisk prøve</div>
      </div>
    </div>
  );
}

const nodeTypes = {
  moduleNode: ModuleNode,
  blockNode: BlockNode,
  examNode: ExamNode,
  finalNode: FinalNode,
};

// ─────────────────────────────────────────────────────────
// GRAPH VIEW
// ─────────────────────────────────────────────────────────

// Compute bounding box for a set of node IDs
function getNodesBounds(nodes, ids) {
  const subset = nodes.filter(n => ids.includes(n.id));
  if (subset.length === 0) return null;
  const SIZES = { moduleNode: { w: MOD_NODE_W, h: MOD_NODE_H }, blockNode: { w: BLOCK_NODE_W, h: BLOCK_NODE_H }, examNode: { w: EXAM_NODE_W, h: EXAM_NODE_H }, finalNode: { w: FINAL_NODE_W, h: FINAL_NODE_H } };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  subset.forEach(n => {
    const s = SIZES[n.type] || { w: 170, h: 64 };
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + s.w);
    maxY = Math.max(maxY, n.position.y + s.h);
  });
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function GraphViewInner({ blocks }) {
  const { initNodes, initEdges, moduleNodeIds } = useMemo(() => {
    const { nodes, edges } = buildGraph(blocks);
    // Group node IDs by module for navigation
    const moduleNodeIds = {};
    nodes.forEach(n => {
      const match = n.id.match(/^mod-(\d+)$/);
      if (match) {
        const modId = parseInt(match[1]);
        if (!moduleNodeIds[modId]) moduleNodeIds[modId] = [];
        moduleNodeIds[modId].push(n.id);
      }
    });
    // Also include block nodes in their module group
    nodes.forEach(n => {
      const blockMatch = n.id.match(/^block-(\d+)$/);
      if (blockMatch) {
        const blockIdx = parseInt(blockMatch[1]);
        const block = blocks[blockIdx];
        if (block) {
          block.items.forEach(uid => {
            const item = findItem(uid);
            if (item) {
              if (!moduleNodeIds[item.moduleId]) moduleNodeIds[item.moduleId] = [];
              if (!moduleNodeIds[item.moduleId].includes(n.id)) {
                moduleNodeIds[item.moduleId].push(n.id);
              }
            }
          });
        }
      }
    });
    // Special entries
    const examNode = nodes.find(n => n.id === "theory-exam");
    if (examNode) moduleNodeIds["exam"] = ["theory-exam"];
    const finalNode = nodes.find(n => n.id === "final");
    if (finalNode) moduleNodeIds["final"] = ["final"];

    return { initNodes: nodes, initEdges: edges, moduleNodeIds };
  }, [blocks]);

  const [rawNodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);
  const { fitBounds } = useReactFlow();
  const [activeNav, setActiveNav] = useState(1);
  const [showHelp, setShowHelp] = useState(true);

  // Injectér isFocused i modul-noder baseret på activeNav
  const nodes = useMemo(() => rawNodes.map(n => {
    const match = n.id.match(/^mod-(\d+)$/);
    if (match) {
      return { ...n, data: { ...n.data, isFocused: activeNav === parseInt(match[1]) } };
    }
    return n;
  }), [rawNodes, activeNav]);
  const hasInitialized = useRef(false);

  const navigateTo = useCallback((key, nodeIds) => {
    const bounds = getNodesBounds(nodes, nodeIds);
    if (bounds) {
      fitBounds({ ...bounds, y: bounds.y - bounds.height * 0.2 }, { padding: 0.8, duration: 800 });
      setActiveNav(key);
    }
  }, [nodes, fitBounds]);

  const navigateAll = useCallback(() => {
    const allIds = nodes.map(n => n.id);
    const bounds = getNodesBounds(nodes, allIds);
    if (bounds) {
      fitBounds(bounds, { padding: 0.25, duration: 800 });
      setActiveNav("all");
    }
  }, [nodes, fitBounds]);

  // Build nav items from active modules
  const activeModules = MODULES_RAW.filter(m => moduleNodeIds[m.id] && moduleNodeIds[m.id].length > 0);

  // Navigér til et modul med korrekt bounds (inkl. næste moduls node)
  const navigateToModule = useCallback((modId) => {
    if (!moduleNodeIds[modId]) return;
    const bounds = getNodesBounds(nodes, moduleNodeIds[modId]);
    if (!bounds) return;
    const nextModNode = nodes.find(n => n.id === `mod-${modId + 1}`);
    if (nextModNode) {
      const nextTop = nextModNode.position.y;
      if (bounds.y > nextTop) {
        bounds.height += (bounds.y - nextTop);
        bounds.y = nextTop;
      }
    }
    fitBounds({ ...bounds, y: bounds.y - bounds.height * 0.05 }, { padding: 0.3, duration: 800 });
    setActiveNav(modId);
  }, [nodes, moduleNodeIds, fitBounds]);

  // Start på Modul 1 ved load
  const onInit = useCallback(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    if (moduleNodeIds[1] && moduleNodeIds[1].length > 0) {
      setTimeout(() => navigateToModule(1), 100);
    }
  }, [moduleNodeIds, navigateToModule]);

  // Klik på modul-node i grafen → navigér som i panelet
  const onNodeClick = useCallback((_, node) => {
    const match = node.id.match(/^mod-(\d+)$/);
    if (match) {
      navigateToModule(parseInt(match[1]));
    }
  }, [navigateToModule]);

  return (
    <ReactFlow
      onInit={onInit}
      onNodeClick={onNodeClick}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      minZoom={0.15}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      style={{ background: C.bg }}
    >
      <Background color="#1E293B" gap={20} size={1} />
      <Controls
        position="bottom-left"
        style={{ background: C.nodeBg, borderRadius: 8, border: `1px solid ${C.border}` }}
      />

      {/* Navigation — til venstre */}
      <div style={{
        position: "absolute", top: 60, left: 16, zIndex: 10,
      }}>
        <div style={{
          background: `${C.nodeBg}F0`, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "10px 12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            Navigation
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <button
              onClick={navigateAll}
              style={{
                padding: "6px 10px", fontSize: 10, fontWeight: 600,
                background: activeNav === "all" ? "#374151" : "transparent",
                color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 6, cursor: "pointer", textAlign: "left",
                transition: "background 0.15s",
              }}
            >
              📊 Overblik
            </button>
            {moduleNodeIds["final"] && (
              <button
                onClick={() => navigateTo("final", moduleNodeIds["final"])}
                style={{
                  padding: "6px 10px", fontSize: 10, fontWeight: 600,
                  background: activeNav === "final" ? `${C.practice}30` : "transparent",
                  color: C.practice, border: `1px solid ${activeNav === "final" ? C.practice : C.border}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                🏁 Køreprøve
              </button>
            )}
            {moduleNodeIds["exam"] && (
              <button
                onClick={() => navigateTo("exam", moduleNodeIds["exam"])}
                style={{
                  padding: "6px 10px", fontSize: 10, fontWeight: 600,
                  background: activeNav === "exam" ? `${C.theory}30` : "transparent",
                  color: C.theory, border: `1px solid ${activeNav === "exam" ? C.theory : C.border}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                📝 Teoriprøve
              </button>
            )}
            {[...activeModules].reverse().map(mod => (
              <button
                key={mod.id}
                onClick={() => navigateToModule(mod.id)}
                style={{
                  padding: "6px 10px", fontSize: 10, fontWeight: 600,
                  background: activeNav === mod.id ? `${mod.color}30` : "transparent",
                  color: mod.color, border: `1px solid ${activeNav === mod.id ? mod.color : C.border}`,
                  borderRadius: 6, cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                }}
              >
                Modul {mod.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Forklaring — til højre */}
      <div style={{
        position: "absolute", top: 60, right: 16, zIndex: 10,
      }}>
        <div style={{
          background: `${C.nodeBg}F0`, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "14px 16px", maxWidth: 220,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          <div
            onClick={() => setShowHelp(h => !h)}
            style={{ fontSize: 12, fontWeight: 700, color: C.text, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            Sådan læser du grafen
            <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 8 }}>{showHelp ? "▲" : "▼"}</span>
          </div>
          {showHelp && (
            <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.6, marginTop: 8 }}>
              <p style={{ margin: "0 0 6px" }}>
                Diagrammet viser rækkefølgen for dit undervisningsforløb.
                Start i <b style={{ color: C.text }}>bunden</b> og følg pilene opad.
              </p>
              <p style={{ margin: "0 0 6px" }}>
                En <b style={{ color: C.text }}>pil</b> fra en blok til en anden betyder,
                at den nederste blok skal gennemføres <b style={{ color: C.text }}>før</b> den øverste.
              </p>
              <p style={{ margin: "0 0 6px" }}>
                <b style={{ color: C.text }}>⚡ = Skal først</b> — disse lektioner
                skal afholdes før andre i samme modul.
              </p>
              <p style={{ margin: "0 0 2px" }}>
                <b style={{ color: C.text }}>Klik</b> på en boks for at se detaljer
                om lektionerne i den.
              </p>
            </div>
          )}
        </div>
      </div>
    </ReactFlow>
  );
}

function GraphView({ blocks }) {
  return (
    <ReactFlowProvider>
      <GraphViewInner blocks={blocks} />
    </ReactFlowProvider>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────

const STORAGE_KEY = "lektionsopbygger_plans";

export default function PlanGraph() {
  const [savedPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const planNames = Object.keys(savedPlans);
  const lastPlan = localStorage.getItem("lektionsopbygger_lastPlan");
  const [selectedPlan, setSelectedPlan] = useState(
    lastPlan && savedPlans[lastPlan] ? lastPlan : planNames.length > 0 ? planNames[0] : null
  );

  const blocks = selectedPlan && savedPlans[selectedPlan] ? savedPlans[selectedPlan].blocks : [];
  const hasBlocks = blocks.length > 0;

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
          <a href="#" style={{
            padding: "5px 12px", background: C.nodeBg, color: "#93C5FD",
            borderRadius: 6, textDecoration: "none", fontSize: 12,
            border: `1px solid ${C.border}`,
          }}>&#8592; Forløbsplanlægger</a>

          <span style={{
            fontSize: 15, fontWeight: 800, color: C.text,
            letterSpacing: "-0.02em",
          }}>
            Forløbsoverblik
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {planNames.length > 0 && (
            <select
              value={selectedPlan || ""}
              onChange={e => setSelectedPlan(e.target.value)}
              style={{
                background: C.nodeBg, color: C.text, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: "5px 10px", fontSize: 12,
                fontFamily: "inherit", cursor: "pointer",
              }}
            >
              {planNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}

          {selectedPlan && (
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {blocks.length} blokke
            </span>
          )}

          {/* Legend */}
          <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
            {[
              { label: "Modul", color: "#9CA3AF", border: true },
              { label: "Teori", color: C.theory },
              { label: "Kørsel", color: C.practice },
              { label: "Selvstudium", color: C.selfStudy },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{
                  width: 10, height: 10,
                  borderRadius: l.border ? 3 : 3,
                  background: l.border ? "transparent" : l.color,
                  border: l.border ? `2px solid ${l.color}` : "none",
                }} />
                <span style={{ fontSize: 10, color: C.textMuted }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Graph or empty state */}
      {!hasBlocks ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", flexDirection: "column", gap: 12,
        }}>
          <span style={{ fontSize: 48, opacity: 0.3 }}>📊</span>
          <span style={{ fontSize: 14, color: C.textMuted }}>
            {planNames.length === 0
              ? "Ingen gemte planer fundet. Opret og gem en plan i Forløbsplanlægger først."
              : "Den valgte plan har ingen blokke."}
          </span>
          <a href="#" style={{
            padding: "8px 16px", background: C.nodeBg, color: "#93C5FD",
            borderRadius: 8, textDecoration: "none", fontSize: 13,
            border: `1px solid ${C.border}`,
          }}>Gå til Forløbsplanlægger</a>
        </div>
      ) : (
        <GraphView blocks={blocks} />
      )}
    </div>
  );
}
