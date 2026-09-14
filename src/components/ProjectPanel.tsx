import { X } from "lucide-react";
import type { Designer, Project, Task } from "../types";
import { STATUSES } from "../constants";
import { fmtShort } from "../dateUtils";
import { roundCharge } from "../capacity";
import { AvatarStack, DifficultyBadge, PriorityDot } from "./atoms";

export default function ProjectPanel({
  project,
  tasks,
  designers,
  onClose,
  onEditTask,
}: {
  project: Project;
  tasks: Task[];
  designers: Designer[];
  onClose: () => void;
  onEditTask: (task: Task) => void;
}) {
  const charge = roundCharge(tasks.reduce((s, t) => s + (t.charge || 0), 0));
  const sorted = [...tasks].sort((a, b) => (a.date_livraison || "").localeCompare(b.date_livraison || ""));

  return (
    <div className="studio-modal-overlay" onClick={onClose}>
      <div className="studio-modal" onClick={(e) => e.stopPropagation()}>
        <div className="studio-modal-scroll">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: project.color, flexShrink: 0 }} />
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                {project.name}
              </h2>
            </div>
            <button type="button" onClick={onClose} className="studio-icon-btn"><X size={18} /></button>
          </div>

          <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 18 }}>
            {tasks.length} tâche{tasks.length > 1 ? "s" : ""} · {charge}j au total
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.length === 0 && <div className="studio-empty-col">Aucune tâche pour ce projet.</div>}
            {sorted.map((t) => {
              const assigned = t.designer_ids.map((id) => designers.find((d) => d.id === id));
              return (
                <div key={t.id} onClick={() => onEditTask(t)} className="studio-sprint-row" style={{ padding: "9px 10px" }}>
                  <PriorityDot id={t.priorite} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.titre}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>
                      {STATUSES.find((s) => s.id === t.statut)?.label}
                      {t.date_livraison ? ` · ${fmtShort(t.date_livraison)}` : ""}
                    </div>
                  </div>
                  <DifficultyBadge id={t.difficulte} />
                  <AvatarStack designers={assigned} size={22} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
