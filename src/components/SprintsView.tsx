import { useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Palmtree, Users, X } from "lucide-react";
import type { Conge, Designer, Meeting, Project, Task } from "../types";
import { taskChargeForDesignerInSprint, taskSprints, meetingChargeForDesignerInSprint, congeChargeForDesignerInSprint, effectiveCapacity } from "../capacity";
import { addDays, getMonday, sprintLabel, toISODate } from "../dateUtils";
import { Avatar, PriorityDot } from "./atoms";

export default function SprintsView({
  tasks, designers, projects, meetings, conges, onEdit, onSetMeetingCharge, onSetCongeCharge, readOnly,
}: {
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  meetings: Meeting[];
  conges: Conge[];
  onEdit: (task: Task) => void;
  onSetMeetingCharge: (designerId: string, sprint: string, charge: number) => void;
  onSetCongeCharge: (designerId: string, sprint: string, charge: number) => void;
  readOnly: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [projetFilter, setProjetFilter] = useState("all");
  const sprints = useMemo(() => {
    const base = getMonday(new Date());
    return [0, 1, 2].map((i) => toISODate(addDays(base, (i + offset) * 7)));
  }, [offset]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select className="studio-select-sm" value={projetFilter} onChange={(e) => setProjetFilter(e.target.value)}>
            <option value="all">Tous les projets</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {projetFilter !== "all" && (
            <button type="button" className="studio-btn-ghost studio-btn-reset" onClick={() => setProjetFilter("all")}>
              <X size={13} /> Réinitialiser
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="studio-icon-btn" onClick={() => setOffset((o) => o - 1)}><ChevronLeft size={16} /></button>
          <button className="studio-icon-btn" onClick={() => setOffset((o) => o + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="studio-sprint-grid">
        {sprints.map((mondayISO) => {
          const sprintTasks = tasks.filter((t) => taskSprints(t).includes(mondayISO) && (projetFilter === "all" || t.projet_ids.includes(projetFilter)));
          const isCurrent = mondayISO === toISODate(getMonday(new Date()));
          return (
            <div key={mondayISO} className="studio-sprint-card">
              <div className="studio-sprint-head">
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {isCurrent ? "Sprint en cours" : "Sprint"}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>
                    {sprintLabel(mondayISO)}
                  </div>
                </div>
                {isCurrent && <span className="studio-badge-current">EN COURS</span>}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                {designers.map((d) => {
                  const taskCharge = taskChargeForDesignerInSprint(tasks.filter((t) => projetFilter === "all" || t.projet_ids.includes(projetFilter)), d.id, mondayISO);
                  const meetingCharge = meetingChargeForDesignerInSprint(meetings, d.id, mondayISO);
                  const congeCharge = congeChargeForDesignerInSprint(conges, d.id, mondayISO);
                  const capacity = effectiveCapacity(meetingCharge, congeCharge);
                  const pct = capacity === 0 ? 100 : Math.min(100, (taskCharge / capacity) * 100);
                  const over = taskCharge > capacity;
                  return (
                    <div key={d.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Avatar designer={d} size={18} />
                          <span style={{ fontSize: 12, color: "var(--ink)" }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: over ? "#D6462E" : "var(--ink-soft)", fontWeight: over ? 700 : 400 }}>
                          {taskCharge}j / {capacity}j
                        </span>
                      </div>
                      <div className="studio-bar-track">
                        <div className="studio-bar-fill" style={{ width: `${pct}%`, background: over ? "#D6462E" : d.color }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Users size={11} color="var(--ink-soft)" />
                          <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Réunions</span>
                          <input
                            type="number" min={0} step={0.5}
                            value={meetingCharge}
                            disabled={readOnly}
                            onChange={(e) => onSetMeetingCharge(d.id, mondayISO, Math.max(0, parseFloat(e.target.value) || 0))}
                            className="studio-meeting-input"
                          />
                          <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>j</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Palmtree size={11} color="var(--ink-soft)" />
                          <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Congés</span>
                          <input
                            type="number" min={0} step={0.5}
                            value={congeCharge}
                            disabled={readOnly}
                            onChange={(e) => onSetCongeCharge(d.id, mondayISO, Math.max(0, parseFloat(e.target.value) || 0))}
                            className="studio-meeting-input"
                          />
                          <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>j</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                {sprintTasks.length === 0 && <div className="studio-empty-col">Aucune tâche planifiée</div>}
                {sprintTasks.map((t) => {
                  const assigned = t.designer_ids.map((id) => designers.find((x) => x.id === id)).filter((x): x is Designer => !!x);
                  const taskProjects = t.projet_ids.map((id) => projects.find((x) => x.id === id)).filter((x): x is Project => !!x);
                  return (
                    <div key={t.id} onClick={() => onEdit(t)} className="studio-sprint-row">
                      <PriorityDot id={t.priorite} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.titre}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 1 }}>
                          {taskProjects.length > 0 && (
                            <span style={{ fontSize: 10, color: taskProjects[0].color }}>
                              {taskProjects.map((p) => p.name).join(", ")}
                            </span>
                          )}
                          {mondayISO !== t.sprint && <span style={{ fontSize: 9.5, color: "var(--ink-soft)", fontStyle: "italic" }}>sur plusieurs sprints</span>}
                        </div>
                      </div>
                      {assigned[0] && <Avatar designer={assigned[0]} size={18} />}
                      {t.statut === "livre" && <CheckCircle2 size={13} color="#2E7D5B" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
