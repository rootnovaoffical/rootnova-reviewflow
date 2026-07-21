import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchWorkflowTemplates,
  templateCategoryMeta,
  triggerTypeMeta,
} from "../../lib/workflow";
import type { WorkflowTemplate } from "../../lib/types";

export default function BusinessWorkflowTemplates() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link } = await supabase
        .from("business_admins")
        .select("business_id")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (link?.business_id) setBusinessId(link.business_id);
      const { data, error } = await fetchWorkflowTemplates();
      if (error) throw new Error(error);
      setTemplates(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];
  const filtered = selectedCategory === "all" ? templates : templates.filter((t) => t.category === selectedCategory);

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    if (!businessId || !profile) return;
    const { data, error } = await supabase.from("workflows").insert({
      business_id: businessId,
      name: template.name,
      description: template.description,
      status: "draft",
      trigger_type: template.trigger_type,
      trigger_config: template.trigger_config,
      canvas_data: {},
      variables: template.variables,
      is_ai_generated: template.is_ai_generated,
      ai_explanation: `Created from template: ${template.name}`,
    }).select().single();

    if (error) { showToast("Failed to create workflow from template", "error"); return; }

    // Copy nodes
    const templateNodes = template.nodes as { key: string; node_type: any; node_category: any; label: string; config: Record<string, unknown>; position_x: number; position_y: number }[];
    if (templateNodes.length > 0) {
      const nodes = templateNodes.map((n, i) => ({
        workflow_id: data.id,
        business_id: businessId,
        node_key: n.key,
        node_type: n.node_type,
        node_category: n.node_category,
        label: n.label,
        config: n.config,
        position_x: n.position_x,
        position_y: n.position_y,
        is_collapsed: false,
        sort_order: i,
      }));
      await supabase.from("workflow_nodes").insert(nodes);
    }

    // Copy edges
    const templateEdges = template.edges as { source: string; target: string; label?: string }[];
    if (templateEdges.length > 0) {
      const edges = templateEdges.map((e) => ({
        workflow_id: data.id,
        business_id: businessId,
        source_node_key: e.source,
        target_node_key: e.target,
        edge_label: e.label || null,
        edge_data: {},
      }));
      await supabase.from("workflow_edges").insert(edges);
    }

    // Increment template use count
    await supabase.from("workflow_templates").update({ use_count: template.use_count + 1 }).eq("id", template.id);

    await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "workflow_from_template", target_type: "workflow", target_id: data.id, metadata: { template_key: template.template_key } });
    showToast("Workflow created from template", "success");
    navigate(`/business/workflows/${data.id}`);
  };

  if (loading) return (
    <BusinessShell title="Templates">
      <div className="p-4 md:p-8 space-y-6">
        <SkeletonCard className="!min-h-[60px]" />
        <SkeletonList items={3} />
      </div>
    </BusinessShell>
  );

  if (error) return (
    <BusinessShell title="Templates">
      <div className="p-4 md:p-8"><ErrorState message={error} onRetry={load} /></div>
    </BusinessShell>
  );

  return (
    <BusinessShell title="Templates">
      <div className="p-4 md:p-8 space-y-6 page-enter">
        {/* Header */}
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold text-white">Workflow Templates</h2>
          <p className="text-sm text-slate-400 mt-1">Production-ready automations. Duplicate and customize.</p>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap animate-fade-up" style={{ animationDelay: "80ms" }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCategory === cat ? "btn-primary text-white" : "btn-ghost text-slate-300"}`}
            >
              {cat === "all" ? "All Templates" : `${templateCategoryMeta(cat).icon} ${templateCategoryMeta(cat).label}`}
            </button>
          ))}
        </div>

        {/* Templates grid */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-white mb-2">No templates available</h3>
            <p className="text-sm text-slate-400">Workflow templates will appear here when they are added.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template, i) => {
              const cm = templateCategoryMeta(template.category);
              const tm = triggerTypeMeta(template.trigger_type);
              const nodeCount = (template.nodes as unknown[]).length;
              return (
                <div
                  key={template.id}
                  className="glass rounded-2xl p-5 card-hover animate-fade-up border border-white/5"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cm.icon}</span>
                      <h3 className="text-white text-sm font-semibold">{template.name}</h3>
                    </div>
                    <span className="text-xs text-slate-600">{nodeCount} nodes</span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-3 mb-3">{template.description}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-500/15 text-warning-400">{tm.icon} {tm.label}</span>
                    {template.is_ai_generated && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/15 text-primary-300">✨ AI</span>}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-600">{template.use_count} uses</p>
                    <button onClick={() => handleUseTemplate(template)} className="btn-primary px-4 py-1.5 text-white text-xs font-medium rounded-lg">
                      Use Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BusinessShell>
  );
}
