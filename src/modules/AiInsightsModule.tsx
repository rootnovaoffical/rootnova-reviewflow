import DataManager from '../components/DataManager';
import type { ColumnDef } from '../components/DataManager';

// ai_recommendations: id, business_id, task_id, title, description, reasoning, evidence, confidence, expected_outcome, business_impact, category, status, created_at, updated_at
const recColumns: ColumnDef[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, showInTable: true },
  { key: 'description', label: 'Description', type: 'textarea', showInTable: true },
  { key: 'category', label: 'Category', type: 'select', options: ['growth', 'retention', 'reputation', 'operations', 'marketing'], required: true, showInTable: true },
  { key: 'confidence', label: 'Confidence', type: 'number', showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'accepted', 'rejected', 'implemented'], showInTable: true },
  { key: 'reasoning', label: 'Reasoning', type: 'textarea', showInTable: false },
  { key: 'expected_outcome', label: 'Expected Outcome', type: 'text', showInTable: false },
  { key: 'business_impact', label: 'Business Impact', type: 'text', showInTable: false },
];

// action_items: id, business_id, title, explanation, why_it_matters, recommended_action, priority_level, confidence, status, evidence, internal_notes, ai_generated_at, created_at, updated_at
const actionColumns: ColumnDef[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, showInTable: true },
  { key: 'priority_level', label: 'Priority', type: 'select', options: ['low', 'medium', 'high', 'critical'], required: true, showInTable: true },
  { key: 'confidence', label: 'Confidence', type: 'select', options: ['low', 'medium', 'high'], required: true, showInTable: true },
  { key: 'status', label: 'Status', type: 'select', options: ['open', 'in_progress', 'completed', 'dismissed'], required: true, showInTable: true },
  { key: 'explanation', label: 'Explanation', type: 'textarea', showInTable: false },
  { key: 'why_it_matters', label: 'Why It Matters', type: 'textarea', showInTable: false },
  { key: 'recommended_action', label: 'Recommended Action', type: 'textarea', showInTable: false },
];

// ai_briefings: id, business_id, period, briefing_date, summary, wins, risks, recommendations, progress, upcoming_opportunities, metrics_snapshot, created_at
const briefingColumns: ColumnDef[] = [
  { key: 'period', label: 'Period', type: 'select', options: ['daily', 'weekly', 'monthly'], required: true, showInTable: true },
  { key: 'briefing_date', label: 'Date', type: 'date', required: true, showInTable: true },
  { key: 'summary', label: 'Summary', type: 'textarea', required: true, showInTable: true },
  { key: 'wins', label: 'Wins (one per line)', type: 'array', showInTable: false },
  { key: 'risks', label: 'Risks (one per line)', type: 'array', showInTable: false },
  { key: 'recommendations', label: 'Recommendations (one per line)', type: 'array', showInTable: false },
];

// ai_simulations: id, business_id, simulation_type, scenario, current_state, projected_state, assumptions, projected_outcome, confidence, is_labelled_estimate, created_at
const simulationColumns: ColumnDef[] = [
  { key: 'simulation_type', label: 'Type', type: 'select', options: ['scenario', 'forecast', 'what_if', 'trend'], required: true, showInTable: true },
  { key: 'scenario', label: 'Scenario', type: 'text', required: true, showInTable: true },
  { key: 'current_state', label: 'Current State', type: 'json', showInTable: false },
  { key: 'projected_state', label: 'Projected State', type: 'json', showInTable: false },
  { key: 'projected_outcome', label: 'Projected Outcome', type: 'textarea', showInTable: true },
  { key: 'confidence', label: 'Confidence', type: 'number', showInTable: true },
];

interface Props { businessId: string; }
export function AiRecommendationsModule({ businessId }: Props) { return <DataManager table="ai_recommendations" businessId={businessId} columns={recColumns} defaultValues={{ category: 'growth', status: 'pending', confidence: 0.5, evidence: {} }} />; }
export function ActionItemsModule({ businessId }: Props) { return <DataManager table="action_items" businessId={businessId} columns={actionColumns} defaultValues={{ priority_level: 'medium', confidence: 'medium', status: 'open', evidence: {} }} />; }
export function AiBriefingsModule({ businessId }: Props) { return <DataManager table="ai_briefings" businessId={businessId} columns={briefingColumns} defaultValues={{ period: 'daily', wins: [], risks: [], recommendations: [], progress: [], upcoming_opportunities: [], metrics_snapshot: {} }} />; }
export function AiSimulationsModule({ businessId }: Props) { return <DataManager table="ai_simulations" businessId={businessId} columns={simulationColumns} defaultValues={{ simulation_type: 'scenario', confidence: 0.5, is_labelled_estimate: false, current_state: {}, projected_state: {}, assumptions: [] }} />; }
