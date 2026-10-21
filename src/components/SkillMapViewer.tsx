"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Background, Controls, ReactFlow, type Edge, type Node, Position } from "@xyflow/react";
import { ArrowRight, Check, Circle, LockKeyhole } from "lucide-react";
import katex from "katex";
import type { EditableSkillNode, SkillMapEdge } from "@/lib/skill-maps";

type ViewNode = EditableSkillNode & { status: "mastered" | "in_progress" | "available" | "locked" };
const appearances = {
  mastered: { label: "ผ่านแล้ว", border: "#9bcbbb", bg: "#edf6f1", color: "#196e61", Icon: Check },
  in_progress: { label: "กำลังเรียน", border: "#86b8b0", bg: "#f0f7f5", color: "#167a72", Icon: Circle },
  available: { label: "พร้อมเรียน", border: "#d9b48e", bg: "#fbf4ec", color: "#925a2c", Icon: Circle },
  locked: { label: "ต้องผ่านพื้นฐานก่อน", border: "#d9dfda", bg: "#f7f8f5", color: "#788487", Icon: LockKeyhole },
};

function MapSkillNode({ data }: { data: ViewNode }) {
  const style = appearances[data.status];
  const Icon = style.Icon;
  return <div className="min-w-[175px] rounded-lg border-2 px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderColor: style.border, background: style.bg }}>
    <div className="flex items-center justify-between gap-3"><span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: style.color }}>{style.label}</span><Icon size={13} style={{ color: style.color }}/></div>
    <p className="mt-2 text-xs font-bold text-[var(--ink)]">{data.title}</p><p className="mt-1 max-w-[190px] truncate text-[9px] text-[var(--muted)]">{data.subtitle}</p>
  </div>;
}

export function SkillMapViewer({ mapId, nodes: sourceNodes, edges: sourceEdges, progress = [] }: { mapId: string; nodes: EditableSkillNode[]; edges: SkillMapEdge[]; progress?: { skill_id: string; status: string }[] }) {
  const [selectedId, setSelectedId] = useState(sourceNodes[0]?.id ?? "");
  const nodes = useMemo<Node<ViewNode>[]>(() => {
    const progressMap = new Map(progress.map((item) => [item.skill_id, item.status]));
    const mastered = new Set(progress.filter((item) => item.status === "completed").map((item) => item.skill_id));
    return sourceNodes.map((skill) => {
      const saved = progressMap.get(skill.id);
      const prereqs = sourceEdges.filter((edge) => edge.target === skill.id).map((edge) => edge.source);
      const prerequisitesMet = prereqs.every((id) => mastered.has(id));
      const status: ViewNode["status"] = saved === "completed" ? "mastered" : !prerequisitesMet ? "locked" : saved === "in_progress" ? "in_progress" : "available";
      return { id: skill.id, type: "skill", position: { x: skill.x, y: skill.y }, data: { ...skill, status }, sourcePosition: Position.Right, targetPosition: Position.Left };
    });
  }, [sourceNodes, sourceEdges, progress]);
  const graphEdges = useMemo<Edge[]>(() => {
    const progressMap = new Map(progress.map((item) => [item.skill_id, item.status]));
    return sourceEdges.map((edge, index) => ({ id: `${index}-${edge.source}-${edge.target}`, source: edge.source, target: edge.target, type: "smoothstep", animated: progressMap.get(edge.target) === "in_progress", style: { stroke: "#8aa99d", strokeWidth: 2 }, markerEnd: { type: "arrowclosed" as never, color: "#8aa99d", width: 16, height: 16 } }));
  }, [sourceEdges, progress]);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const selectedData = selected?.data;
  const prereqTitles = sourceEdges.filter((edge) => edge.target === selected?.id).map((edge) => sourceNodes.find((node) => node.id === edge.source)?.title).filter(Boolean);
  const formula = selectedData?.formula ? katex.renderToString(selectedData.formula, { throwOnError: false, output: "html" }) : null;

  return <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white">
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[var(--line)] px-4 py-3">{Object.entries(appearances).map(([key, value]) => <span key={key} className="inline-flex items-center gap-1.5 text-[10px] text-[var(--muted)]"><value.Icon size={12} style={{ color: value.color }}/>{value.label}</span>)}</div>
    <div className="hidden h-[620px] md:block"><ReactFlow nodes={nodes} edges={graphEdges} nodeTypes={{ skill: MapSkillNode }} onNodeClick={(_, node) => setSelectedId(node.id)} onNodeDoubleClick={(_, node) => { window.location.assign(`/skill-tree/map/${mapId}/skill/${node.id}`); }} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.22} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} proOptions={{ hideAttribution: true }} aria-label="แผนที่ Skill Tree"><Background color="#e6ebe7" gap={24} size={1}/><Controls showInteractive={false}/></ReactFlow></div>
    <div className="divide-y divide-[var(--line)] md:hidden">{nodes.map((node) => <button key={node.id} type="button" aria-pressed={selected?.id === node.id} onClick={() => setSelectedId(node.id)} className={`flex w-full items-start gap-3 px-4 py-3 text-left ${selected?.id === node.id ? "bg-[#f3f6f2]" : "bg-white"}`}><span className="mt-0.5 text-[10px] font-mono text-[var(--copper)]">{String(nodes.indexOf(node) + 1).padStart(2, "0")}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{node.data.title}</span><span className="mt-1 block text-[10px] text-[var(--muted)]">{node.data.subtitle}</span></span><span className="text-[9px] text-[var(--muted)]">{appearances[node.data.status].label}</span></button>)}</div>
    {selectedData && <section aria-live="polite" className="border-t border-[var(--line)] bg-[var(--paper)] px-4 py-4 sm:px-6 sm:py-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="eyebrow">{selectedData.subject}</p><h2 className="mt-1 text-base font-semibold">{selectedData.title}</h2><p className="mt-1 text-xs text-[var(--muted)]">{selectedData.subtitle}</p></div><span className="self-start rounded-sm border px-2.5 py-1.5 text-[10px]" style={{ borderColor: appearances[selectedData.status].border, color: appearances[selectedData.status].color }}>{appearances[selectedData.status].label}</span></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="border-l-2 border-[var(--accent)] pl-3"><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">สมการที่เกี่ยวข้อง</p>{formula ? <span className="mt-2 block text-sm" dangerouslySetInnerHTML={{ __html: formula }}/> : <p className="mt-2 text-xs text-[var(--muted)]">ยังไม่มีสมการกำกับ</p>}</div><div className="border-l-2 border-[var(--copper)] pl-3"><p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">Prerequisite</p><p className="mt-2 text-xs">{prereqTitles.length ? prereqTitles.join(" · ") : "ไม่มี — เริ่มจากหัวข้อนี้ได้"}</p></div></div><Link href={`/skill-tree/map/${mapId}/skill/${selected.id}`} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">เข้าไปดูรายละเอียดทักษะ <ArrowRight size={14}/></Link><p className="mt-1 text-[9px] text-[var(--muted)]">บนคอมพิวเตอร์ดับเบิลคลิกโหนดเพื่อเปิดรายละเอียด · บนมือถือแตะโหนดแล้วกดลิงก์นี้</p></section>}
  </div>;
}
