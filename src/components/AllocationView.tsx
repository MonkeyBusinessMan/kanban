import type { Designer, Project, Task } from "../types";
import { STATUSES } from "../constants";
import { fmtShort } from "../dateUtils";
import { Avatar, PriorityDot } from "./atoms";

export default function AllocationView({
  tasks, designers, projects, onEdit,
}: {
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  onEdit: (task: Task) => void;
}) {
  const sortedProjects = [...projects].sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div>
      <div className="studio-calendar-intro">
        Répartition des designers par projet — qui travaille sur quoi, projet par projet.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 22 }}>
        {sortedProjects.map((p) => {
          const projectTasks = tasks.filter((t) => t.projet_id === p.id);

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
                    <div key={designer.id} className="studio-project-card" style={{ borderTopColor: designer.color }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Avatar designer={designer} size={26} />
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{designer.name}</span>
                        <span style={{ fontSize: 11, color: "var(--ink-soft)", marginLeft: "auto", fontFamily: "var(--font-mono)" }}>
                          {items.length}
                        </span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                        {items
                          .slice()
                          .sort((a, b) => (a.date_livraison || "").localeCompare(b.date_livraison || ""))
                          .map((t) => (
                            <div key={t.id} onClick={() => onEdit(t)} className="studio-sprint-row" style={{ padding: "6px 8px" }}>
                              <PriorityDot id={t.priorite} />
                              <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {t.titre}
                              </span>
                              <span style={{ fontSize: 10, color: "var(--ink-soft)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                                {STATUSES.find((s) => s.id === t.statut)?.label}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}

                  {unassigned.length > 0 && (
                    <div className="studio-project-card" style={{ borderTopColor: "var(--line)" }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink-soft)", fontStyle: "italic" }}>
                        Sans designer assigné
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 10 }}>
                        {unassigned.map((t) => (
                          <div key={t.id} onClick={() => onEdit(t)} className="studio-sprint-row" style={{ padding: "6px 8px" }}>
                            <PriorityDot id={t.priorite} />
                            <span style={{ flex: 1, fontSize: 11.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.titre}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--ink-soft)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                              {fmtShort(t.date_livraison)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
