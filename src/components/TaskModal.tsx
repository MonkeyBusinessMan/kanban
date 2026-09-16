import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import type { Designer, DifficulteId, PrioriteId, Project, StatusId, Task, TaskDraft } from "../types";
import { DIFFICULTIES, PRIORITIES, STATUSES, TYPES } from "../constants";
import { sprintKeyFor, toISODate } from "../dateUtils";
import { epicChildren, epicProgress, subtaskProgress } from "../capacity";
import MultiSelect from "./MultiSelect";
import { ProgressBar } from "./atoms";

export default function TaskModal({
  initial,
  tasks,
  designers,
  projects,
  onAddProject,
  onClose,
  onSave,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onReorderSubtasks,
  onOpenTask,
  readOnly,
}: {
  initial: Task | null;
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  onAddProject: (name: string) => Promise<string>;
  onClose: () => void;
  onSave: (draft: TaskDraft) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (taskId: string, titre: string) => void;
  onToggleSubtask: (id: string, fait: boolean) => void;
  onDeleteSubtask: (id: string) => void;
  onReorderSubtasks: (orderedIds: string[]) => void;
  onOpenTask: (task: Task) => void;
  readOnly: boolean;
}) {
  const blank: TaskDraft = {
    titre: "", chef: "", types: [], designer_ids: [], projet_ids: [], difficulte: null,
    projet_id: null, charge: 1, charge_reelle: 0, date_livraison: toISODate(new Date()),
    sprint: null, sprint_debut: null, is_epic: false, epic_id: null, priorite: "moyenne", statut: "backlog", notes: "",
  };
  const [form, setForm] = useState<TaskDraft>(() => {
    if (!initial) return blank;
    const { subtasks: _subtasks, ...draft } = initial;
    return draft;
  });
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [saving, setSaving] = useState(false);
  const [draggedSubtaskId, setDraggedSubtaskId] = useState<string | null>(null);

  const set = <K extends keyof TaskDraft>(k: K, v: TaskDraft[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleIn = (k: "types" | "designer_ids" | "projet_ids", id: string) => {
    setForm((f) => ({ ...f, [k]: f[k].includes(id) ? f[k].filter((x) => x !== id) : [...f[k], id] }));
  };

  const confirmNewProject = async () => {
    const name = newProjectName.trim();
    if (!name) { setAddingProject(false); return; }
    const id = await onAddProject(name);
    setForm((f) => ({ ...f, projet_ids: [...f.projet_ids, id] }));
    setNewProjectName("");
    setAddingProject(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) return;
    setSaving(true);
    const sprint = sprintKeyFor(form.date_livraison);
    const sprint_debut = form.sprint_debut ? sprintKeyFor(form.sprint_debut) : null;
    await onSave({ ...form, sprint, sprint_debut, id: initial?.id });
    setSaving(false);
  };

  const addSubtask = () => {
    const titre = newSubtask.trim();
    if (!titre || !initial) return;
    onAddSubtask(initial.id, titre);
    setNewSubtask("");
  };

  const dropSubtask = (targetId: string) => {
    if (!initial || !draggedSubtaskId || draggedSubtaskId === targetId) { setDraggedSubtaskId(null); return; }
    const ordered = initial.subtasks.slice().sort((a, b) => a.position - b.position).map((s) => s.id);
    const fromIndex = ordered.indexOf(draggedSubtaskId);
    const toIndex = ordered.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) { setDraggedSubtaskId(null); return; }
    ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, draggedSubtaskId);
    onReorderSubtasks(ordered);
    setDraggedSubtaskId(null);
  };

  const progress = initial ? subtaskProgress(initial) : null;
  const children = initial?.is_epic ? epicChildren(initial, tasks) : [];
  const childrenStats = initial?.is_epic ? epicProgress(initial, tasks) : { done: 0, total: 0, pct: 0 };

  return (
    <div className="studio-modal-overlay" onClick={onClose}>
      <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-scroll">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
            {initial ? "Modifier la demande" : "Nouvelle demande"}
          </h2>
          <button type="button" onClick={onClose} className="studio-icon-btn"><X size={18} /></button>
        </div>

        <form id="task-form" onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <fieldset disabled={readOnly} style={{ border: "none", padding: 0, margin: 0, display: "contents" }}>
          <label className="studio-field">
            <span>Projet(s)</span>
            {!addingProject ? (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <MultiSelect
                    options={[...projects].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((p) => ({ id: p.id, label: p.name, color: p.color }))}
                    selected={form.projet_ids}
                    onToggle={(id) => toggleIn("projet_ids", id)}
                  />
                </div>
                <button type="button" onClick={() => setAddingProject(true)} className="studio-icon-btn" title="Ajouter un projet">
                  <Plus size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  autoFocus
                  placeholder="Nom du nouveau projet"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmNewProject(); } if (e.key === "Escape") setAddingProject(false); }}
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={confirmNewProject} className="studio-btn-primary" style={{ padding: "8px 12px" }}>OK</button>
                <button type="button" onClick={() => { setAddingProject(false); setNewProjectName(""); }} className="studio-icon-btn"><X size={15} /></button>
              </div>
            )}
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)" }}>
            <input
              type="checkbox"
              checked={form.is_epic}
              onChange={(e) => set("is_epic", e.target.checked)}
            />
            Ceci est un epic (regroupe d'autres tickets)
          </label>

          {!form.is_epic && (
            <label className="studio-field">
              <span>Epic parent (optionnel)</span>
              <select value={form.epic_id ?? ""} onChange={(e) => set("epic_id", e.target.value || null)}>
                <option value="">Aucun</option>
                {tasks.filter((t) => t.is_epic && t.id !== initial?.id).sort((a, b) => a.titre.localeCompare(b.titre, "fr")).map((e) => (
                  <option key={e.id} value={e.id}>{e.titre}</option>
                ))}
              </select>
            </label>
          )}

          <label className="studio-field">
            <span>Intitulé de la tâche</span>
            <input required value={form.titre} onChange={(e) => set("titre", e.target.value)} placeholder="Ex : Cadrage UX — espace client" />
          </label>

          <label className="studio-field">
            <span>Chef de projet (optionnel)</span>
            <input value={form.chef} onChange={(e) => set("chef", e.target.value)} placeholder="Nom du chef de projet" />
          </label>

          <label className="studio-field">
            <span>Type(s) de demande</span>
            <MultiSelect
              options={TYPES.map((t) => ({ id: t, label: t }))}
              selected={form.types}
              onToggle={(id) => toggleIn("types", id)}
            />
          </label>

          <label className="studio-field">
            <span>Designer(s) assigné(s)</span>
            <MultiSelect
              options={designers.map((d) => ({ id: d.id, label: d.name, color: d.color }))}
              selected={form.designer_ids}
              onToggle={(id) => toggleIn("designer_ids", id)}
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <label className="studio-field">
              <span>Charge (jours)</span>
              <input type="number" min={0.5} step={0.5} value={form.charge} onChange={(e) => set("charge", parseFloat(e.target.value) || 0)} />
            </label>
            <label className="studio-field">
              <span>Charge réelle (jours)</span>
              <input type="number" min={0} step={0.5} value={form.charge_reelle} onChange={(e) => set("charge_reelle", parseFloat(e.target.value) || 0)} />
            </label>
            <label className="studio-field">
              <span>Date de livraison</span>
              <input type="date" required value={form.date_livraison ?? ""} onChange={(e) => set("date_livraison", e.target.value)} />
            </label>
            <label className="studio-field">
              <span>Priorité</span>
              <select value={form.priorite} onChange={(e) => set("priorite", e.target.value as PrioriteId)}>
                {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
          </div>

          <label className="studio-field">
            <span>Sprint de début (optionnel)</span>
            <input type="date" value={form.sprint_debut ?? ""} onChange={(e) => set("sprint_debut", e.target.value || null)} />
            <span style={{ fontSize: 11, color: "var(--ink-soft)", textTransform: "none", fontWeight: 400 }}>
              À renseigner si la tâche s'étale sur plusieurs sprints — la charge sera répartie entre le sprint de début et le sprint de livraison.
            </span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="studio-field">
              <span>Statut</span>
              <select value={form.statut} onChange={(e) => set("statut", e.target.value as StatusId)}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <label className="studio-field">
              <span>Difficulté</span>
              <select
                value={form.difficulte ?? ""}
                onChange={(e) => set("difficulte", (e.target.value || null) as DifficulteId | null)}
              >
                <option value="">—</option>
                {DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id} title={d.description}>{d.id} — {d.label} — {d.description}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="studio-field">
            <span>Notes (optionnel)</span>
            <textarea rows={10} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Contexte, lien vers le brief..." />
          </label>

          {initial?.is_epic && (
            <div className="studio-field">
              <span>Tickets enfants{childrenStats.total > 0 ? ` (${childrenStats.done}/${childrenStats.total} livrés)` : ""}</span>
              {childrenStats.total > 0 && <ProgressBar pct={childrenStats.pct} label={`${childrenStats.pct}%`} />}
              {children.length === 0 ? (
                <div className="studio-empty-col" style={{ padding: "8px 0" }}>Aucun ticket rattaché à cet epic pour l'instant.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
                  {children.map((c) => (
                    <div key={c.id} onClick={() => onOpenTask(c)} className="studio-sprint-row" style={{ padding: "6px 8px" }}>
                      <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.titre}</span>
                      <span className="studio-chip">{STATUSES.find((s) => s.id === c.statut)?.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="studio-field">
            <span>Sous-tâches{progress && progress.total > 0 ? ` (${progress.done}/${progress.total})` : ""}</span>
            {!initial ? (
              <div className="studio-empty-col" style={{ padding: "8px 0" }}>Enregistre la tâche pour ajouter des sous-tâches.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {progress && progress.total > 0 && <ProgressBar pct={progress.pct} label={`${progress.pct}%`} />}
                {initial.subtasks.slice().sort((a, b) => a.position - b.position).map((s) => (
                  <div
                    key={s.id}
                    draggable={!readOnly}
                    onDragStart={() => setDraggedSubtaskId(s.id)}
                    onDragOver={(e) => { if (!readOnly) e.preventDefault(); }}
                    onDrop={() => { if (!readOnly) dropSubtask(s.id); }}
                    onDragEnd={() => setDraggedSubtaskId(null)}
                    style={{ display: "flex", alignItems: "center", gap: 8, opacity: draggedSubtaskId === s.id ? 0.5 : 1 }}
                  >
                    <GripVertical size={14} color="var(--line)" style={{ cursor: "grab", flexShrink: 0 }} />
                    <input type="checkbox" checked={s.fait} onChange={(e) => onToggleSubtask(s.id, e.target.checked)} />
                    <span style={{ flex: 1, fontSize: 13, textDecoration: s.fait ? "line-through" : "none", color: s.fait ? "var(--ink-soft)" : "var(--ink)" }}>
                      {s.titre}
                    </span>
                    <button type="button" className="studio-icon-btn" style={{ width: 24, height: 24 }} onClick={() => onDeleteSubtask(s.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    placeholder="Nouvelle sous-tâche…"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="studio-icon-btn" onClick={addSubtask}><Plus size={15} /></button>
                </div>
              </div>
            )}
          </div>
        </fieldset>
        </form>
        </div>

        <div className="studio-modal-footer">
          {!readOnly && initial ? (
            <button type="button" onClick={() => onDelete(initial.id)} className="studio-btn-ghost-danger">
              <Trash2 size={14} /> Supprimer
            </button>
          ) : <span />}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onClose} className="studio-btn-ghost">{readOnly ? "Fermer" : "Annuler"}</button>
            {!readOnly && (
              <button type="submit" form="task-form" className="studio-btn-primary" disabled={saving}>
                {saving ? "Enregistrement…" : initial ? "Enregistrer" : "Créer la demande"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
