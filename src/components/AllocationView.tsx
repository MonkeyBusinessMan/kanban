import { useState } from "react";
import type { Designer, Project, Task } from "../types";
import { STATUSES } from "../constants";
import { Avatar, PriorityDot } from "./atoms";

function TaskRow({ task, onEdit }: { task: Task; onEdit: (task: Task) => void }) {
  return (
    <div onClick={() => onEdit(task)} className="studio-sprint-row" style={{ padding: "6px 8px" }}>
      <PriorityDot id={task.priorite} />
      <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {task.titre}
      </span>
      <span style={{ fontSize: 10, color: "var(--ink-soft)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
        {STATUSES.find((s) => s.id === task.statut)?.label}
      </span>
    </div>
  );
}

function SubCard({
  color, avatar, title, count, tasks, onEdit,
}: {
  color: string;
  avatar?: React.ReactNode;
  title: string;
  count: number;
  tasks: Task[];
  onEdit: (task: Task) => void;
}) {
  return (
    <div className="studio-project-card" style={{ borderTopColor: color }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {avatar}
        <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{title}</span>
        <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>{count}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
        {tasks
          .slice()
          .sort((a, b) => (a.date_livraison || "").localeCompare(b.date_livraison || ""))
          .map((t) => <TaskRow key={t.id} task={t} onEdit={onEdit} />)}
      </div>
    </div>
  );
}

export default function AllocationView({
  tasks, designers, projects, onEdit,
}: {
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  onEdit: (task: Task) => void;
}) {
  const [mode, setMode] = useState<"projet" | "designer">("projet");

  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const sortedDesigners = [...designers].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div>
      <div className="studio-calendar-intro">
        Répartition des designers — qui travaille sur quoi, {mode === "projet" ? "projet par projet" : "designer par designer"}.
      </div>

      <div className="studio-multiselect" style={{ marginTop: 16, marginBottom: 22 }}>
        <button type="button" className={`studio-multiselect-chip ${mode === "projet" ? "active" : ""}`} onClick={() => setMode("projet")}>
          Par projet
        </button>
        <button type="button" className={`studio-multiselect-chip ${mode === "designer" ? "active" : ""}`} onClick={() => setMode("designer")}>
          Par designer
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {mode === "projet" && sortedProjects.map((p) => {
          const projectTasks = tasks.filter((t) => t.projet_ids.includes(p.id));

          const byDesigner = new Map<string, Task[]>();
          const unassigned: Task[] = [];
          projectTasks.forEach((t) => {
            if (t.designer_ids.length === 0) { unassigned.push(t); return; }
            t.designer_ids.forEach((id) => {
              if (!byDesigner.has(id)) byDesigner.set(id, []);
              byDesigner.get(id)!.push(t);
            });
          });

          const designerGroups = Array.from(byDesigner.entries())
            .map(([id, items]) => ({ designer: designers.find((d) => d.id === id), items }))
            .filter((g): g is { designer: Designer; items: Task[] } => !!g.designer)
            .sort((a, b) => a.designer.name.localeCompare(b.designer.name, "fr"));

          return (
            <div key={p.id} className="studio-panel">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                  {p.name}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>
                  {designerGroups.length} designer{designerGroups.length > 1 ? "s" : ""} · {projectTasks.length} tâche{projectTasks.length > 1 ? "s" : ""}
                </span>
              </div>

              {projectTasks.length === 0 ? (
                <div className="studio-empty-col">Aucune tâche sur ce projet.</div>
              ) : (
                <div className="studio-projects-grid">
                  {designerGroups.map(({ designer, items }) => (
                    <SubCard
                      key={designer.id}
                      color={designer.color}
                      avatar={<Avatar designer={designer} size={26} />}
                      title={designer.name}
                      count={items.length}
                      tasks={items}
                      onEdit={onEdit}
                    />
                  ))}
                  {unassigned.length > 0 && (
                    <SubCard color="var(--line)" title="Sans designer assigné" count={unassigned.length} tasks={unassigned} onEdit={onEdit} />
                  )}
                </div>
              )}
            </div>
          );
        })}

        {mode === "designer" && sortedDesigners.map((d) => {
          const designerTasks = tasks.filter((t) => t.designer_ids.includes(d.id));

          const byProject = new Map<string, Task[]>();
          designerTasks.forEach((t) => {
            const keys = t.projet_ids.length > 0 ? t.projet_ids : ["none"];
            keys.forEach((key) => {
              if (!byProject.has(key)) byProject.set(key, []);
              byProject.get(key)!.push(t);
            });
          });

          const projectGroups = Array.from(byProject.entries())
            .map(([key, items]) => ({ project: key === "none" ? null : projects.find((p) => p.id === key) ?? null, items }))
            .sort((a, b) => (a.project?.name ?? "Sans projet").localeCompare(b.project?.name ?? "Sans projet", "fr"));

          return (
            <div key={d.id} className="studio-panel">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Avatar designer={d} size={22} />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                  {d.name}
                </span>
                <span style={{ fontSize: 11.5, color: "var(--ink-soft)", fontFamily: "var(--font-mono)" }}>
                  {projectGroups.length} projet{projectGroups.length > 1 ? "s" : ""} · {designerTasks.length} tâche{designerTasks.length > 1 ? "s" : ""}
                </span>
              </div>

              {designerTasks.length === 0 ? (
                <div className="studio-empty-col">Aucune tâche assignée.</div>
              ) : (
                <div className="studio-projects-grid">
                  {projectGroups.map(({ project, items }) => (
                    <SubCard
                      key={project?.id ?? "none"}
                      color={project?.color ?? "var(--line)"}
                      avatar={project ? <span style={{ width: 10, height: 10, borderRadius: "50%", background: project.color, flexShrink: 0 }} /> : undefined}
                      title={project?.name ?? "Sans projet"}
                      count={items.length}
                      tasks={items}
                      onEdit={onEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
