import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchWorkflow,
  fetchWorkflowNodes,
  fetchWorkflowEdges,
  saveWorkflowNodes,
  saveWorkflowEdges,
  updateWorkflow,
  createWorkflowVersion,
  fetchExecutions,
  fetchExecutionLogs,
  getNodeDefinition,
  getNodesByCategory,
  nodeCategoryMeta,
  workflowStatusMeta,
  executionStatusMeta,
  type NodeDefinition,
} from "../../lib/workflow";
import type { Workflow, WorkflowExecution, WorkflowLog, WorkflowNode, WorkflowEdge, WorkflowVersion, NodeType, NodeCategory } from "../../lib/types";

interface CanvasNode {
  key: string;
  node_type: NodeType;
  node_category: NodeCategory;
  label: string;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  is_collapsed: boolean;
}

interface CanvasEdge {
  source: string;
  target: string;
  label?: string;
}

export default function BusinessWorkflowEditor() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNodePalette, setShowNodePalette] = useState(false);
  const [showExecutions, setShowExecutions] = useState(false);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [selectedExec, setSelectedExec] = useState<string | null>(null);
  const [execLogs, setExecLogs] = useState<WorkflowLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const load = useCallback(async () => {
    if (!profile || !id) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (!link?.business_id) { setError("No business found"); setLoading(false); return; }
      setBusinessId(link.business_id);

      const [wfRes, nodesRes, edgesRes] = await Promise.all([
        fetchWorkflow(id),
        fetchWorkflowNodes(id),
        fetchWorkflowEdges(id),
      ]);
      if (wfRes.error) throw new Error(wfRes.error);
      if (nodesRes.error) throw new Error(nodesRes.error);
      if (edgesRes.error) throw new Error(edgesRes.error);
      setWorkflow(wfRes.data);
      setNodes((nodesRes.data || []).map((n) => ({
        key: n.node_key,
        node_type: n.node_type as NodeType,
        node_category: n.node_category as NodeCategory,
        label: n.label,
        config: n.config || {},
        position_x: Number(n.position_x),
        position_y: Number(n.position_y),
        is_collapsed: n.is_collapsed,
      })) as CanvasNode[]);
      setEdges((edgesRes.data || []).map((e) => ({
        source: e.source_node_key,
        target: e.target_node_key,
        label: e.edge_label || undefined,
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useEffect(() => { load(); }, [load]);

  // Pan handlers
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    }
  };

  const handlePanMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: panStart.current.panX + (e.clientX - panStart.current.x), y: panStart.current.panY + (e.clientY - panStart.current.y) });
    }
  };
  const handlePanEnd = () => setIsPanning(false);

  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(0.3, Math.min(2, z + delta)));
  };

  // Node operations
  const addNode = (def: NodeDefinition) => {
    const key = `${def.type}_${Date.now().toString(36)}`;
    const offset = nodes.length * 300;
    const newNode: CanvasNode = {
      key,
      node_type: def.type,
      node_category: def.category,
      label: def.label,
      config: {},
      position_x: offset,
      position_y: 200,
      is_collapsed: false,
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNode(key);
    setShowNodePalette(false);
  };

  const deleteNode = (key: string) => {
    setNodes((prev) => prev.filter((n) => n.key !== key));
    setEdges((prev) => prev.filter((e) => e.source !== key && e.target !== key));
    if (selectedNode === key) setSelectedNode(null);
  };

  const duplicateNode = (key: string) => {
    const node = nodes.find((n) => n.key === key);
    if (!node) return;
    const newKey = `${node.node_type}_${Date.now().toString(36)}`;
    setNodes((prev) => [...prev, { ...node, key: newKey, position_x: node.position_x + 50, position_y: node.position_y + 50 }]);
  };

  const updateNodeConfig = (key: string, configKey: string, value: unknown) => {
    setNodes((prev) => prev.map((n) => n.key === key ? { ...n, config: { ...n.config, [configKey]: value } } : n));
  };

  const updateNodeLabel = (key: string, label: string) => {
    setNodes((prev) => prev.map((n) => n.key === key ? { ...n, label } : n));
  };



  // Edge operations
  const addEdge = (source: string, target: string, label?: string) => {
    if (source === target) return;
    if (edges.some((e) => e.source === source && e.target === target)) return;
    setEdges((prev) => [...prev, { source, target, label }]);
  };

  const removeEdge = (source: string, target: string) => {
    setEdges((prev) => prev.filter((e) => !(e.source === source && e.target === target)));
  };

  // Save
  const handleSave = async () => {
    if (!workflow || !businessId) return;
    setSaving(true);
    const { error: wfErr } = await updateWorkflow(workflow.id, {
      canvas_data: { pan, zoom },
      variables: workflow.variables || [],
    });
    if (wfErr) { showToast("Failed to save canvas", "error"); setSaving(false); return; }

    const nodesData = nodes.map((n, i) => ({
      node_key: n.key,
      node_type: n.node_type,
      node_category: n.node_category,
      label: n.label,
      config: n.config,
      position_x: n.position_x,
      position_y: n.position_y,
      is_collapsed: n.is_collapsed,
      sort_order: i,
    })) as Omit<WorkflowNode, "id" | "created_at" | "updated_at" | "business_id" | "workflow_id">[];
    const { error: nodeErr } = await saveWorkflowNodes(workflow.id, businessId, nodesData);
    if (nodeErr) { showToast("Failed to save nodes", "error"); setSaving(false); return; }

    const edgesData = edges.map((e) => ({
      source_node_key: e.source,
      target_node_key: e.target,
      edge_label: e.label || null,
      edge_data: {},
    })) as unknown as Omit<WorkflowEdge, "id" | "created_at" | "updated_at" | "business_id" | "workflow_id">[];
    const { error: edgeErr } = await saveWorkflowEdges(workflow.id, businessId, edgesData as unknown as Omit<WorkflowEdge, "id" | "created_at" | "workflow_id" | "business_id">[]);
    if (edgeErr) { showToast("Failed to save connections", "error"); setSaving(false); return; }

    // Create version snapshot
    await createWorkflowVersion({
      workflow_id: workflow.id,
      version_number: workflow.version,
      canvas_data: { pan, zoom },
      nodes: nodes as unknown as Record<string, unknown>[],
      edges: edges as unknown as Record<string, unknown>[],
      variables: workflow.variables || [],
      change_notes: "Manual save",
      created_by: profile?.id || null,
    } as Omit<WorkflowVersion, "id" | "created_at">);

    if (profile) {
      await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "workflow_saved", target_type: "workflow", target_id: workflow.id, metadata: { node_count: nodes.length, edge_count: edges.length } });
    }
    showToast("Workflow saved", "success");
    setSaving(false);
  };

  // Load executions
  const loadExecutions = useCallback(async () => {
    if (!businessId || !id) return;
    const { data } = await fetchExecutions(businessId, id, 20);
    setExecutions(data || []);
  }, [businessId, id]);

  // Load execution logs
  const loadExecLogs = useCallback(async (execId: string) => {
    if (!businessId) return;
    setLogsLoading(true);
    const { data } = await fetchExecutionLogs(businessId, execId);
    setExecLogs(data || []);
    setLogsLoading(false);
  }, [businessId]);

  if (loading) return (
    <BusinessShell title="Workflow Editor">
      <div className="p-4 md:p-8"><SkeletonCard className="!min-h-[400px]" /></div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Workflow Editor">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  if (!workflow) return (
    <BusinessShell title="Workflow Editor">
      <div className="p-4 md:p-8"><ErrorState message="Workflow not found" /></div>
    </BusinessShell>
  );

  const selectedNodeData = selectedNode ? nodes.find((n) => n.key === selectedNode) : null;
  const selectedNodeDef = selectedNodeData ? getNodeDefinition(selectedNodeData.node_type) : null;

  return (
    <BusinessShell title="Workflow Editor">
      <div className="flex flex-col h-[calc(100vh-64px)] page-enter">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/business/workflows")} className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Back
            </button>
            <div className="h-4 w-px bg-white/10" />
            <input
              value={workflow.name}
              onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
              className="bg-transparent text-white text-sm font-semibold focus:outline-none border-b border-transparent focus:border-primary-500/30 transition-colors"
            />
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${workflowStatusMeta(workflow.status).bg} ${workflowStatusMeta(workflow.status).color}`}>
              {workflowStatusMeta(workflow.status).label}
            </span>
            {workflow.is_ai_generated && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/15 text-primary-300">✨ AI</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowExecutions(true); loadExecutions(); }} className="btn-ghost px-3 py-1.5 text-slate-300 text-xs font-medium rounded-lg">
              📋 Executions
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-1.5 text-white text-xs font-medium rounded-lg disabled:opacity-50">
              {saving ? "Saving..." : "💾 Save"}
            </button>
          </div>
        </div>

        {/* AI Explanation */}
        {workflow.ai_explanation && (
          <div className="px-4 py-2 bg-primary-500/5 border-b border-primary-500/10">
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">🧠</span>
              <p className="text-xs text-slate-400 leading-relaxed">{workflow.ai_explanation}</p>
            </div>
          </div>
        )}

        {/* Canvas + Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden cursor-grab"
            style={{
              background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.03) 0%, transparent 70%)",
              cursor: isPanning ? "grabbing" : "grab",
            }}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
          >
            {/* Grid pattern */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              }}
            />

            {/* SVG edges */}
            <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
              {edges.map((edge, i) => {
                const sourceNode = nodes.find((n) => n.key === edge.source);
                const targetNode = nodes.find((n) => n.key === edge.target);
                if (!sourceNode || !targetNode) return null;
                const x1 = (sourceNode.position_x + 160) * zoom + pan.x;
                const y1 = (sourceNode.position_y + 30) * zoom + pan.y;
                const x2 = targetNode.position_x * zoom + pan.x;
                const y2 = (targetNode.position_y + 30) * zoom + pan.y;
                const midX = (x1 + x2) / 2;
                return (
                  <g key={i}>
                    <path
                      d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="rgba(99,102,241,0.4)"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                    {edge.label && (
                      <text x={midX} y={(y1 + y2) / 2 - 5} fill="rgba(148,163,184,0.8)" fontSize="11" textAnchor="middle">
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
              {nodes.map((node) => {
                const def = getNodeDefinition(node.node_type);
                const isSelected = selectedNode === node.key;
                return (
                  <div
                    key={node.key}
                    className={`absolute w-40 glass-strong rounded-xl p-3 cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary-500/50" : "hover:scale-[1.02]"}`}
                    style={{ left: node.position_x, top: node.position_y }}
                    onClick={(e) => { e.stopPropagation(); setSelectedNode(node.key); }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{def?.icon || "📌"}</span>
                      <span className="text-xs text-slate-500 uppercase tracking-wide">{def?.label || node.node_type}</span>
                    </div>
                    <p className="text-sm text-white font-medium truncate">{node.label}</p>
                    {Object.keys(node.config).length > 0 && !node.is_collapsed && (
                      <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                        {Object.entries(node.config).slice(0, 3).map(([k, v]) => (
                          <p key={k} className="text-xs text-slate-500 truncate">
                            <span className="text-slate-600">{k}:</span> {String(v).slice(0, 30)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1">
              <button onClick={() => handleZoom(0.1)} className="glass w-8 h-8 rounded-lg text-white text-sm hover:scale-110 transition-transform">+</button>
              <button onClick={() => handleZoom(-0.1)} className="glass w-8 h-8 rounded-lg text-white text-sm hover:scale-110 transition-transform">−</button>
              <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="glass w-8 h-8 rounded-lg text-white text-xs hover:scale-110 transition-transform">⟲</button>
            </div>

            {/* Add node button */}
            <button
              onClick={() => setShowNodePalette(true)}
              className="absolute bottom-4 left-4 btn-primary px-4 py-2 text-white text-sm font-medium rounded-xl"
            >
              + Add Node
            </button>
          </div>

          {/* Right sidebar - node config */}
          {selectedNodeData && selectedNodeDef && (
            <div className="w-80 bg-slate-900/80 border-l border-white/5 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedNodeDef.icon}</span>
                  <h3 className="text-sm font-semibold text-white">Node Settings</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => duplicateNode(selectedNodeData.key)} className="text-xs text-slate-400 hover:text-white transition-colors p-1" title="Duplicate">📋</button>
                  <button onClick={() => deleteNode(selectedNodeData.key)} className="text-xs text-error-400 hover:text-error-300 transition-colors p-1" title="Delete">🗑️</button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Label</label>
                <input
                  value={selectedNodeData.label}
                  onChange={(e) => updateNodeLabel(selectedNodeData.key, e.target.value)}
                  className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
                />
              </div>

              {selectedNodeDef.configFields.map((field) => (
                <div key={field.key}>
                  <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      value={(selectedNodeData.config[field.key] as string) || field.defaultValue as string || ""}
                      onChange={(e) => updateNodeConfig(selectedNodeData.key, field.key, e.target.value)}
                      className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                    >
                      {field.options?.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      value={(selectedNodeData.config[field.key] as string) || ""}
                      onChange={(e) => updateNodeConfig(selectedNodeData.key, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input-field w-full min-h-[60px] p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
                    />
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      value={(selectedNodeData.config[field.key] as number) || field.defaultValue as number || 0}
                      onChange={(e) => updateNodeConfig(selectedNodeData.key, field.key, parseInt(e.target.value) || 0)}
                      className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                    />
                  ) : (
                    <input
                      value={(selectedNodeData.config[field.key] as string) || ""}
                      onChange={(e) => updateNodeConfig(selectedNodeData.key, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}

              {/* Connections */}
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Connect to</label>
                <select
                  value=""
                  onChange={(e) => { if (e.target.value) addEdge(selectedNodeData.key, e.target.value); }}
                  className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-lg text-white text-sm"
                >
                  <option value="">Select target node...</option>
                  {nodes.filter((n) => n.key !== selectedNodeData.key).map((n) => (
                    <option key={n.key} value={n.key}>{n.label}</option>
                  ))}
                </select>
              </div>

              {/* Existing connections */}
              {edges.filter((e) => e.source === selectedNodeData.key).length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Outgoing Connections</p>
                  <div className="space-y-1">
                    {edges.filter((e) => e.source === selectedNodeData.key).map((e, i) => {
                      const target = nodes.find((n) => n.key === e.target);
                      return (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-white/5">
                          <span className="text-xs text-slate-300">→ {target?.label || e.target}</span>
                          <button onClick={() => removeEdge(e.source, e.target)} className="text-xs text-error-400 hover:text-error-300">✕</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Node Palette Modal */}
      {showNodePalette && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowNodePalette(false)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Add Node</h3>
              <button onClick={() => setShowNodePalette(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {(["trigger", "condition", "action", "delay", "ai_decision"] as NodeCategory[]).map((cat) => {
                const cm = nodeCategoryMeta(cat);
                const catNodes = getNodesByCategory(cat);
                if (catNodes.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className={`text-xs font-medium ${cm.color} mb-2`}>{cm.icon} {cm.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {catNodes.map((def) => (
                        <button
                          key={def.type}
                          onClick={() => addNode(def)}
                          className={`p-3 rounded-xl text-left border border-white/5 hover:border-white/15 transition-all ${def.bg}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{def.icon}</span>
                            <span className="text-sm text-white font-medium">{def.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{def.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Executions Modal */}
      {showExecutions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowExecutions(false)}>
          <div className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Execution History</h3>
              <button onClick={() => setShowExecutions(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {executions.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No executions yet. This workflow has not been triggered.</p>
            ) : (
              <div className="space-y-2">
                {executions.map((exec) => {
                  const sm = executionStatusMeta(exec.status as any);
                  return (
                    <div
                      key={exec.id}
                      className="p-3 rounded-xl bg-slate-900/40 border border-white/5 cursor-pointer hover:border-white/10 transition-all"
                      onClick={() => { setSelectedExec(exec.id); loadExecLogs(exec.id); }}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sm.bg} ${sm.color}`}>{sm.icon} {sm.label}</span>
                        <span className="text-xs text-slate-600">{new Date(exec.started_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {exec.duration_ms !== null && <p className="text-xs text-slate-500 mt-1">Duration: {exec.duration_ms}ms</p>}
                      {exec.error_message && <p className="text-xs text-error-400 mt-1 line-clamp-2">{exec.error_message}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Execution logs */}
            {selectedExec && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-xs text-slate-500 uppercase tracking-wide mb-3">Execution Logs</h4>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                  </div>
                ) : execLogs.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No logs recorded.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {execLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/30">
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${log.log_level === "error" ? "bg-error-500/15 text-error-400" : log.log_level === "warn" ? "bg-warning-500/15 text-warning-400" : "bg-primary-500/15 text-primary-300"}`}>
                          {log.log_level}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300">{log.message}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{log.node_label} · {new Date(log.created_at).toLocaleTimeString()}</p>
                          {log.ai_reasoning && <p className="text-xs text-primary-300 mt-1 italic">AI: {log.ai_reasoning}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </BusinessShell>
  );
}
