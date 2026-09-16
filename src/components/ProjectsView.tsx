import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Bar, BarChart, Cell, Legend, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Designer, PrioriteId, Project, Task } from "../types";
import { PRIORITIES, STATUSES } from "../constants";
import { Avatar, PriorityDot } from "./atoms";
import ProjectPanel from "./ProjectPanel";
import { roundCharge } from "../capacity";

const STATUS_COLORS = ["#8B5E3C", "#B8862B", "#4F6D7A", "#A9762B", "#6B5B95", "#557153"];

export default function ProjectsView({
  tasks, designers, projects, onAddProject, onRenameProject, onSetProjectPriority, onEdit, readOnly,
}: {
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  onAddProject: (name: string) => Promise<string>;
  onRenameProject: (id: string, name: string) => void;
  onSetProjectPriority: (id: string, priorite: PrioriteId) => void;
  onEdit: (task: Task) => void;
  readOnly: boolean;
}) {
  const [newName, setNewName] = useState("");
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [projects]
  );

  const grouped = useMemo(
    () => PRIORITIES.map((prio) => ({ prio, items: sortedProjects.filter((p) => p.priorite === prio.id) })),
    [sortedProjects]
  );

  const onDropOnPriority = (e: React.DragEvent, priorite: PrioriteId) => {
    e.preventDefault();
    if (draggedProjectId) onSetProjectPriority(draggedProjectId, priorite);
    setDraggedProjectId(null);
  };

  const byProject = useMemo(
    () => sortedProjects.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      count: tasks.filter((t) => t.projet_ids.includes(p.id)).length,
    })),
    [sortedProjects, tasks]
  );

  const byStatus = useMemo(
    () => STATUSES.map((s, i) => ({
      id: s.id,
      label: s.label,
      count: tasks.filter((t) => t.statut === s.id).length,
      fill: STATUS_COLORS[i % STATUS_COLORS.length],
    })),
    [tasks]
  );

  const activeTasksCount = tasks.filter((t) => t.statut !== "livre").length;

  const addProject = async () => {
    const name = newName.trim();
    if (!name) return;
    await onAddProject(name);
    setNewName("");
  };

  return (
    <div>
      <div className="studio-calendar-intro">
        {projects.length} projets suivis par le studio — répartition des tâches actives par projet.
      </div>

      <div className="studio-panel" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.3 }}>
              Tâches au total
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 34, color: "var(--ink)", marginTop: 4 }}>
              {activeTasksCount}
            </div>
          </div>

          <div style={{ flex: "1 1 260px", minWidth: 260 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
              Répartition par projet
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byProject} margin={{ top: 8, right: 8, left: -12, bottom: 24 }}>
                <XAxis
                  dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false}
                  interval={0} angle={-25} textAnchor="end" height={40}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8 }}
                  formatter={(v: number) => [v, "Tâches"]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {byProject.map((p) => <Cell key={p.id} fill={p.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ flex: "1 1 260px", minWidth: 260 }}>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6 }}>
              Répartition par statut
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart data={byStatus} innerRadius="24%" outerRadius="100%" startAngle={180} endAngle={-180}>
                <RadialBar dataKey="count" background={{ fill: "var(--line)" }} cornerRadius={6} />
                <Tooltip
                  contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8 }}
                  formatter={(v: number, _key: string, item: any) => [v, item.payload.label]}
                />
                <Legend
                  iconSize={9} layout="vertical" verticalAlign="middle" align="right"
                  wrapperStyle={{ fontSize: 11.5, color: "var(--ink-soft)" }}
                  formatter={(_value, entry: any) => entry.payload.label}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {!readOnly && (
        <div className="studio-toolbar">
          <div className="studio-search" style={{ maxWidth: 340 }}>
            <Plus size={14} color="var(--ink-soft)" />
            <input
              placeholder="Ajouter un nouveau projet…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addProject(); }}
            />
          </div>
          <button className="studio-btn-primary" onClick={addProject}><Plus size={14} /> Ajouter</button>
        </div>
      )}

      {grouped.map(({ prio, items }) => (
        <div
          key={prio.id}
          onDragOver={(e) => { if (!readOnly) e.preventDefault(); }}
          onDrop={(e) => { if (!readOnly) onDropOnPriority(e, prio.id); }}
          style={{ marginBottom: 22 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <PriorityDot id={prio.id} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--ink)" }}>
              Priorité {prio.label.toLowerCase()}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>{items.length}</span>
          </div>
          <div className="studio-projects-grid studio-projects-dropzone">
            {items.length === 0 && (
              <div className="studio-empty-col">{readOnly ? "Aucun projet." : "Glisse un projet ici pour lui donner cette priorité."}</div>
            )}
            {items.map((p) => {
              const pTasks = tasks.filter((t) => t.projet_ids.includes(p.id));
              const active = pTasks.filter((t) => t.statut !== "livre");
              const charge = roundCharge(active.reduce((s, t) => s + (t.charge || 0), 0));
              const involved = [...new Set(active.flatMap((t) => t.designer_ids))]
                .map((id) => designers.find((d) => d.id === id))
                .filter((d): d is Designer => !!d);
              return (
                <div
                  key={p.id}
                  className="studio-project-card"
                  style={{ borderTopColor: p.color, opacity: draggedProjectId === p.id ? 0.5 : 1, cursor: readOnly ? "pointer" : "grab" }}
                  draggable={!readOnly}
                  onDragStart={() => setDraggedProjectId(p.id)}
                  onDragEnd={() => setDraggedProjectId(null)}
                  onClick={() => setOpenProjectId(p.id)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <input
                      className="studio-inline-name"
                      defaultValue={p.name}
                      readOnly={readOnly}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => { if (!readOnly && e.target.value.trim() && e.target.value !== p.name) onRenameProject(p.id, e.target.value.trim()); }}
                    />
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                  </div>
                  <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>
                    <span>{active.length} tâche{active.length > 1 ? "s" : ""} active{active.length > 1 ? "s" : ""}</span>
                    <span>{charge}j en cours</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                    {involved.length > 0 ? involved.map((d) => <Avatar key={d.id} designer={d} size={22} />) : (
                      <span style={{ fontSize: 11, color: "var(--ink-soft)", fontStyle: "italic" }}>Aucun designer assigné actuellement</span>
                    )}
                  </div>
                  {active.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
                      {active.slice(0, 4).map((t) => (
                        <div key={t.id} onClick={(e) => { e.stopPropagation(); onEdit(t); }} className="studio-sprint-row" style={{ padding: "5px 8px" }}>
                          <PriorityDot id={t.priorite} />
                          <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titre}</span>
                        </div>
                      ))}
                      {active.length > 4 && (
                        <div style={{ fontSize: 10.5, color: "var(--ink-soft)", textAlign: "center" }}>+ {active.length - 4} autre{active.length - 4 > 1 ? "s" : ""}</div>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    draggable={false}
                    onClick={(e) => { e.stopPropagation(); setOpenProjectId(p.id); }}
                    className="studio-btn-ghost"
                    style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 12, fontSize: 11.5, padding: "6px 8px" }}
                  >
                    Voir toutes les tâches →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {openProjectId && (() => {
        const project = projects.find((p) => p.id === openProjectId);
        if (!project) return null;
        return (
          <ProjectPanel
            project={project}
            tasks={tasks.filter((t) => t.projet_ids.includes(project.id))}
            designers={designers}
            onClose={() => setOpenProjectId(null)}
            onEditTask={(t) => { setOpenProjectId(null); onEdit(t); }}
          />
        );
      })()}
    </div>
  );
}
