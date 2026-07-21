import { useEffect, useState, useCallback } from "react";
import BusinessShell from "./BusinessShell";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { SkeletonCard, SkeletonList } from "../../components/Skeleton";
import { ErrorState } from "../../components/States";
import { timeAgo } from "../../lib/utils";
import { insertAuditLog } from "../../lib/auth";
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  generateAIMessages,
  optimizeTemplate,
  categoryMeta,
  channelMeta,
  substituteVariables,
  extractVariables,
} from "../../lib/communication";
import type { MessageTemplate, TemplateCategory, CommunicationChannel } from "../../lib/types";

const categories: TemplateCategory[] = ["review_request", "thank_you", "recovery", "festival", "birthday", "coupon", "follow_up", "reminder", "general"];
const channels: CommunicationChannel[] = ["sms", "whatsapp", "email", "push", "in_app"];

export default function BusinessTemplates() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState<MessageTemplate | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setError(null);
    setLoading(true);
    try {
      const { data: link, error: linkErr } = await supabase
        .from("business_admins")
        .select("business_id, business:businesses!business_id(name)")
        .eq("user_id", profile.id)
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link?.business_id) { setTemplates([]); setLoading(false); return; }
      setBusinessId(link.business_id);
      setBusinessName((link as any).business?.name || "");
      const { data, error } = await fetchTemplates(link.business_id);
      if (error) throw new Error(error);
      setTemplates(data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (template: MessageTemplate) => {
    const { error } = await deleteTemplate(template.id);
    if (error) { showToast("Failed to delete template", "error"); return; }
    setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    showToast("Template deleted", "success");
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h2 className="text-xl font-bold text-white">Message Templates</h2>
            <p className="text-sm text-slate-400 mt-1">Reusable templates with variables, categories, and AI optimization.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setShowEditor(true); }}
            className="btn-primary px-5 py-2.5 text-white text-sm font-medium rounded-xl whitespace-nowrap"
          >
            + New Template
          </button>
        </div>

        {/* Templates grid */}
        {templates.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center animate-fade-up" style={{ animationDelay: "120ms" }}>
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-white mb-2">No templates yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Create reusable message templates with variables like {"{{customer_name}}"} and {"{{business_name}}"}. Use AI to generate and optimize them.
            </p>
            <button onClick={() => setShowEditor(true)} className="btn-primary px-6 py-2.5 text-white text-sm font-medium rounded-xl">
              Create your first template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template, i) => {
              const cm = categoryMeta(template.category);
              const chm = channelMeta(template.channel);
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
                    <div className="flex gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chm.bg} ${chm.color}`}>{chm.icon}</span>
                      {template.ai_optimized && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/15 text-primary-300">AI</span>}
                    </div>
                  </div>

                  {template.subject && <p className="text-xs text-slate-500 mb-1">{template.subject}</p>}
                  <p className="text-xs text-slate-300 line-clamp-3 mb-3">{template.body}</p>

                  {template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {template.variables.map((v) => (
                        <span key={v} className="px-1.5 py-0.5 rounded-md bg-white/5 text-xs text-primary-300">{`{{${v}}}`}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <p className="text-xs text-slate-600">{timeAgo(template.updated_at)} · v{template.version}</p>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(template); setShowEditor(true); }} className="text-xs text-slate-400 hover:text-white transition-colors">Edit</button>
                      <button onClick={() => handleDelete(template)} className="text-xs text-error-400 hover:text-error-300 transition-colors">Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {showEditor && businessId && (
        <TemplateEditor
          businessId={businessId}
          businessName={businessName}
          editing={editing}
          onClose={() => { setShowEditor(false); setEditing(null); }}
          onSaved={() => { setShowEditor(false); setEditing(null); load(); }}
        />
      )}
    </BusinessShell>
  );
}

function TemplateEditor({ businessId, businessName, editing, onClose, onSaved }: {
  businessId: string;
  businessName: string;
  editing: MessageTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(editing?.name || "");
  const [category, setCategory] = useState<TemplateCategory>(editing?.category || "general");
  const [channel, setChannel] = useState<CommunicationChannel>(editing?.channel || "sms");
  const [subject, setSubject] = useState(editing?.subject || "");
  const [body, setBody] = useState(editing?.body || "");
  const [locale, setLocale] = useState(editing?.locale || "en");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const detectedVars = extractVariables(body);

  const handleSave = async () => {
    if (!name.trim()) { showToast("Please enter a name", "error"); return; }
    if (!body.trim()) { showToast("Please enter a message body", "error"); return; }
    setSaving(true);

    const templateData = {
      business_id: businessId,
      name: name.trim(),
      category,
      channel,
      subject: subject.trim() || null,
      body: body.trim(),
      variables: detectedVars,
      locale,
      ai_optimized: editing?.ai_optimized || false,
      ai_optimization_score: editing?.ai_optimization_score || 0,
      is_active: true,
    };

    if (editing) {
      const { error } = await updateTemplate(editing.id, templateData);
      if (error) { showToast("Failed to update template", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "template_updated", target_type: "message_template", target_id: editing.id, metadata: { name: templateData.name } });
      }
      showToast("Template updated", "success");
    } else {
      const { error } = await createTemplate(templateData);
      if (error) { showToast("Failed to create template", "error"); setSaving(false); return; }
      if (profile) {
        await insertAuditLog({ actor_id: profile.id, actor_email: profile.email, action: "template_created", target_type: "business", target_id: businessId, metadata: { name: templateData.name } });
      }
      showToast("Template created", "success");
    }
    setSaving(false);
    onSaved();
  };

  const handleAIGenerate = async () => {
    setGenerating(true);
    const result = await generateAIMessages({ businessName, messageType: category, channel });
    if (result.error) { showToast(result.error, "error"); }
    else if (result.messages.length > 0) {
      const msg = result.messages[0];
      setBody(msg.body);
      if (msg.subject) setSubject(msg.subject);
      showToast("AI message generated", "success");
    }
    setGenerating(false);
  };

  const handleOptimize = async () => {
    if (!body.trim()) { showToast("Enter a body to optimize", "error"); return; }
    if (!editing) { showToast("Save template first to optimize", "info"); return; }
    setOptimizing(true);
    const result = await optimizeTemplate({ templateId: editing.id, businessName, body, category, channel });
    if (result.error) { showToast(result.error, "error"); }
    else {
      setBody(result.optimized_body);
      showToast(`Optimized (score: ${result.score}/100)`, "success");
    }
    setOptimizing(false);
  };

  const preview = substituteVariables(body, {
    customer_name: "John",
    business_name: businessName || "Your Business",
    rating: "5",
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="glass-strong rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto page-enter" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white">{editing ? "Edit Template" : "New Template"}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Template Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 5-star thank you message" className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none" />
          </div>

          {/* Category + Channel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory)} className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm">
                {categories.map((c) => <option key={c} value={c}>{categoryMeta(c).icon} {categoryMeta(c).label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Channel</label>
              <select value={channel} onChange={(e) => setChannel(e.target.value as CommunicationChannel)} className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm">
                {channels.map((ch) => <option key={ch} value={ch}>{channelMeta(ch).icon} {channelMeta(ch).label}</option>)}
              </select>
            </div>
          </div>

          {/* Subject (email only) */}
          {channel === "email" && (
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" className="input-field w-full p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none" />
            </div>
          )}

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-500 uppercase tracking-wide">Message Body</label>
              <div className="flex gap-2">
                <button onClick={handleAIGenerate} disabled={generating} className="text-xs text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50">
                  {generating ? "Generating..." : "✨ AI Generate"}
                </button>
                {editing && (
                  <button onClick={handleOptimize} disabled={optimizing} className="text-xs text-accent-400 hover:text-accent-300 transition-colors disabled:opacity-50">
                    {optimizing ? "Optimizing..." : "⚡ AI Optimize"}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message... Use {{customer_name}}, {{business_name}}, {{rating}} for variables"
              className="input-field w-full min-h-[120px] p-3 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none resize-none"
            />
          </div>

          {/* Detected variables */}
          {detectedVars.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Detected Variables</p>
              <div className="flex flex-wrap gap-1.5">
                {detectedVars.map((v) => (
                  <span key={v} className="px-2 py-0.5 rounded-md bg-primary-500/10 text-xs text-primary-300">{`{{${v}}}`}</span>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {body.trim() && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Preview (with sample data)</p>
              <div className="bg-slate-900/40 rounded-xl p-3 border border-white/5">
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{preview}</p>
              </div>
            </div>
          )}

          {/* Locale */}
          <div>
            <label className="text-xs text-slate-500 uppercase tracking-wide mb-1.5 block">Language/Locale</label>
            <input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en, hi, es..." className="input-field w-full p-2.5 bg-slate-900/50 border border-white/10 rounded-xl text-white text-sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-slate-300 text-sm font-medium rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2 text-white text-sm font-medium rounded-lg disabled:opacity-50">
            {saving ? "Saving..." : editing ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
