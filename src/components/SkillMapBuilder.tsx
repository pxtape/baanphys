"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addEdge, Background, Controls, Handle, Position, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { ArrowLeft, Link2, Plus, Save, Trash2 } from "lucide-react";
import { saveSkillMapAction, type SkillMapActionState } from "@/app/teacher/skill-trees/actions";
import type { EditableSkillNode, SkillMapDraft } from "@/lib/skill-maps";

type BuilderNode = Node<EditableSkillNode>;
const stages = [{ id: "pre-camp-1", label: "Pre-Camp 1" }, { id: "camp-1", label: "Camp 1" }, { id: "camp-2", label: "Camp 2" }, { id: "olympiad", label: "Olympiad" }];

function BuilderSkillNode({ data, selected }: NodeProps<BuilderNode>) {
  return <div className={`min-w-[175px] rounded-lg border-2 bg-white px-3 py-2.5 shadow-sm ${selected ? "border-[#167a72] ring-4 ring-[#167a72]/10" : "border-[#bfd0c7]"}`}>
    <Handle type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-white !bg-[#ad713e]"/>
    <p className="text-[8px] font-bold uppercase tracking-wide text-[#167a72]">{data.subject || "Physics"}</p><p className="mt-1.5 text-xs font-bold text-[var(--ink)]">{data.title}</p><p className="mt-1 max-w-[190px] truncate text-[9px] text-[var(--muted)]">{data.subtitle}</p>
    <Handle type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-white !bg-[#167a72]"/>
  </div>;
}
const builderNodeTypes = { skill: BuilderSkillNode };

export function SkillMapBuilder({ initial }: { initial?: SkillMapDraft }) {
  const router = useRouter();
  const seedNodes: BuilderNode[] = useMemo(() => initial?.nodes.map((item) => ({ id: item.id, type: "skill", position: { x: item.x, y: item.y }, data: item })) ?? [], [initial]);
  const seedEdges: Edge[] = useMemo(() => initial?.edges.map((edge, index) => ({ id: `edge-${index}-${edge.source}-${edge.target}`, source: edge.source, target: edge.target, label: "ต้องผ่านก่อน", type: "smoothstep", animated: false, style: { stroke: "#71998b", strokeWidth: 2 } })) ?? [], [initial]);
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNode>(seedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(seedEdges);
  const [selectedId, setSelectedId] = useState<string | null>(seedNodes[0]?.id ?? null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [readinessStage, setReadinessStage] = useState(initial?.readinessStage ?? "pre-camp-1");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [action, formAction, pending] = useActionState<SkillMapActionState, FormData>(saveSkillMapAction, {});
  const selected = nodes.find((node) => node.id === selectedId);

  useEffect(() => {
    if (!action.mapId) return;
    if (initial?.mapId !== action.mapId) router.replace(`/teacher/skill-trees/${action.mapId}/edit`);
    else router.refresh();
  }, [action.mapId, initial?.mapId, router]);

  function addNode() {
    const id = `skill-${Math.random().toString(36).slice(2, 10)}`;
    const data: EditableSkillNode = { id, title: "ทักษะใหม่", subtitle: "คำอธิบายทักษะ", subject: "mechanics", formula: "", x: 120 + (nodes.length % 4) * 210, y: 100 + Math.floor(nodes.length / 4) * 140 };
    setNodes((current) => [...current, { id, type: "skill", position: { x: data.x, y: data.y }, data }]);
    setSelectedId(id);
  }

  function updateSelected(field: keyof EditableSkillNode, value: string) {
    if (!selectedId) return;
    setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, [field]: field === "x" || field === "y" ? Number(value) : value } } : node));
  }

  function removeSelected() {
    if (!selectedId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId(null);
  }

  function handleConnect(connection: Connection) {
    setEdges((current) => addEdge({ ...connection, id: `edge-${crypto.randomUUID()}`, label: "ต้องผ่านก่อน", type: "smoothstep", style: { stroke: "#71998b", strokeWidth: 2 } }, current));
  }

  const draft: SkillMapDraft = {
    mapId: initial?.mapId ?? null,
    title,
    description,
    readinessStage,
    isPublished,
    nodes: nodes.map((node) => ({ ...node.data, id: node.id, x: Math.round(node.position.x), y: Math.round(node.position.y) })),
    edges: edges.flatMap((edge) => edge.source && edge.target ? [{ source: edge.source, target: edge.target }] : []),
  };

  return <form action={formAction} className="space-y-5">
    <input type="hidden" name="draft" value={JSON.stringify(draft)}/>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_220px_auto]">
      <label className="text-xs font-medium">ชื่อ Skill Tree<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={120} placeholder="เช่น กลศาสตร์ ค่าย 1" className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-medium">คำอธิบาย<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="ภาพรวมของเส้นทางนี้" className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-medium">ระดับหลักสูตร<select value={readinessStage} onChange={(event) => setReadinessStage(event.target.value)} className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm">{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
      <label className="flex items-center gap-2 self-end rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-xs"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)}/>เผยแพร่ให้นักเรียนเห็น</label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-3">
      <p className="text-xs leading-5 text-[var(--muted)]">ลากโหนดเพื่อจัดตำแหน่ง · ลากจากจุดกลมของโหนดหนึ่งไปอีกโหนดเพื่อกำหนด prerequisite</p>
      <div className="flex gap-2"><button type="button" onClick={addNode} className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"><Plus size={14}/>เพิ่มทักษะ</button><button disabled={pending} className="button-primary px-3 py-2 text-xs"><Save size={14}/>{pending ? "กำลังบันทึก…" : "บันทึกแผนที่"}</button></div>
    </div>
    {action.error && <p role="alert" className="border-l-2 border-[var(--copper)] bg-[#F5F1E9] px-4 py-3 text-sm">{action.error}</p>}
    <div className="grid overflow-hidden rounded-lg border border-[var(--line)] bg-[#f4f6f3] lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="h-[570px] min-h-[420px] border-b border-[var(--line)] lg:border-b-0 lg:border-r lg:h-[650px]">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={builderNodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={handleConnect} onNodeClick={(_, node) => setSelectedId(node.id)} onNodeDragStop={(_, node) => setNodes((current) => current.map((item) => item.id === node.id ? { ...item, position: node.position } : item))} fitView fitViewOptions={{ padding: 0.18 }} minZoom={0.25} maxZoom={1.8} nodesConnectable nodesDraggable deleteKeyCode={null} proOptions={{ hideAttribution: true }}>
          <Background color="#dce4de" gap={24} size={1}/><Controls showInteractive={false}/>
        </ReactFlow>
      </div>
      <aside className="bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold"><Link2 size={15} className="text-[var(--accent)]"/>รายละเอียดทักษะ</div>
        {!selected ? <p className="mt-4 text-xs leading-6 text-[var(--muted)]">เลือกโหนดบนแผนที่เพื่อแก้ชื่อ รายละเอียด และสมการ</p> : <div className="mt-4 space-y-3">
          <label className="block text-[10px] font-medium text-[var(--muted)]">รหัสทักษะ<input value={selected.id} readOnly className="mt-1 w-full rounded border border-[var(--line)] bg-[#f6f7f5] px-2.5 py-2 font-mono text-[10px]"/></label>
          <label className="block text-[10px] font-medium text-[var(--muted)]">ชื่อ<input value={selected.data.title} onChange={(event) => updateSelected("title", event.target.value)} maxLength={120} className="mt-1 w-full rounded border border-[var(--line)] px-2.5 py-2 text-xs text-[var(--ink)]"/></label>
          <label className="block text-[10px] font-medium text-[var(--muted)]">คำอธิบาย<input value={selected.data.subtitle} onChange={(event) => updateSelected("subtitle", event.target.value)} maxLength={240} className="mt-1 w-full rounded border border-[var(--line)] px-2.5 py-2 text-xs text-[var(--ink)]"/></label>
          <label className="block text-[10px] font-medium text-[var(--muted)]">สาขาวิชา<input value={selected.data.subject} onChange={(event) => updateSelected("subject", event.target.value)} maxLength={80} className="mt-1 w-full rounded border border-[var(--line)] px-2.5 py-2 text-xs text-[var(--ink)]"/></label>
          <label className="block text-[10px] font-medium text-[var(--muted)]">สมการ LaTeX<input value={selected.data.formula} onChange={(event) => updateSelected("formula", event.target.value)} maxLength={500} placeholder="v=u+at" className="mt-1 w-full rounded border border-[var(--line)] px-2.5 py-2 font-mono text-xs text-[var(--ink)]"/></label>
          <div className="border-t border-[var(--line)] pt-3"><p className="text-[10px] font-semibold">Prerequisites ของทักษะนี้</p><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">{edges.filter((edge) => edge.target === selectedId).map((edge) => nodes.find((node) => node.id === edge.source)?.data.title).filter(Boolean).join(" · ") || "ไม่มี — เป็นจุดเริ่มต้นของเส้นทาง"}</p></div>
          <button type="button" onClick={removeSelected} className="inline-flex items-center gap-2 rounded border border-[#ead6ce] px-2.5 py-2 text-[10px] font-semibold text-[#9c513c]"><Trash2 size={13}/>นำทักษะออกจากแผนที่</button>
        </div>}
        <div className="mt-5 border-t border-[var(--line)] pt-4"><p className="text-[10px] font-semibold">วิธีเชื่อม</p><p className="mt-1 text-[10px] leading-5 text-[var(--muted)]">เส้นจาก A ไป B หมายถึงนักเรียนต้องผ่าน A ก่อนเรียน B · เชื่อมได้หลายเส้นเพื่อกำหนด prerequisite หลายทักษะ</p></div>
        <p className="mt-5 text-[10px] leading-5 text-[var(--muted)]"><ArrowLeft className="mr-1 inline" size={12}/>บนมือถือ แตะโหนดเพื่อเลือกและแก้รายละเอียดในแผงนี้</p>
      </aside>
    </div>
    <p className="text-[10px] leading-5 text-[var(--muted)]">การลบโหนดจะซ่อนออกจากแผนที่ แต่ระบบเก็บประวัติความคืบหน้าของนักเรียนไว้</p>
  </form>;
}
