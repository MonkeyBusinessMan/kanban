import { AlertTriangle, GripVertical, Layers, Paperclip } from "lucide-react";
import type { Designer, Project, Task } from "../types";
import { PRIORITIES } from "../constants";
import { fmtShort } from "../dateUtils";
import { taskShare, subtaskProgress, epicProgress, roundCharge } from "../capacity";
import { AvatarStack, DifficultyBadge, ProgressBar, ProjectTags } from "./atoms";

export default function TaskCard({
  task,
  allTasks,
  designers,
  taskProjects,
  onEdit,
  onDragStart,
  readOnly,
  overdue,
}: {
  task: Task;
  allTasks: Task[];
  designers: Designer[];
  taskProjects: Project[];
  onEdit: (task: Task) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  readOnly: boolean;
  overdue: boolean;
}) {
  const prio = PRIORITIES.find((p) => p.id === task.priorite) || PRIORITIES[1];
  const assigned = task.designer_ids.map((id) => designers.find((d) => d.id === id));
  const progress = task.is_epic ? epicProgress(task, allTasks) : subtaskProgress(task);
  const share = taskShare(task);
  const charge = roundCharge(task.charge);

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onEdit(task)}
      className="studio-card"
      style={{ "--card-priority-color": prio.color } as React.CSSProperties}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div className="studio-card-title">{task.titre}</div>
        <GripVertical size={14} color="var(--line)" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>
      {task.chef && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 0 }}>{task.chef}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        {task.is_epic && (
          <span className="studio-chip" style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "var(--accent-soft)", color: "var(--accent)" }}>
            <Layers size={10} /> Epic
          </span>
        )}
        <ProjectTags projects={taskProjects} />
        {task.types.map((t) => <span key={t} className="studio-chip">{t}</span>)}
        <DifficultyBadge id={task.difficulte} />
      </div>

      {progress.total > 0 && (
        <div style={{ marginTop: 8 }}>
          <ProgressBar pct={progress.pct} label={`${progress.done}/${progress.total}`} />
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <AvatarStack designers={assigned} size={24} />
          <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            {share === charge ? `${charge}j` : `${share}j / ${charge}j`}
            {task.charge_reelle > 0 && ` · ${roundCharge(task.charge_reelle)}j réel`}
          </span>
        </div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 4, fontSize: 12,
            fontFamily: "var(--font-mono)", color: overdue ? "#D6462E" : "var(--text-secondary)",
            fontWeight: overdue ? 700 : 400,
          }}
        >
          {overdue && <AlertTriangle size={11} />}
          {fmtShort(task.date_livraison)}
          {task.attachments.length > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <Paperclip size={11} /> {task.attachments.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
