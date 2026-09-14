import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Conge, Designer, DifficulteId, Meeting, Task } from "../types";
import { taskChargeForDesignerInSprint, taskShare, taskSprints, meetingChargeForDesignerInSprint, congeChargeForDesignerInSprint, effectiveCapacity, roundCharge } from "../capacity";
import { DIFFICULTIES } from "../constants";
import { getMonday, sprintLabel, toISODate } from "../dateUtils";
import { Avatar } from "./atoms";

const DIFFICULTY_COLORS: Record<DifficulteId, string> = {
  XS: "#6E8378", S: "#8CA36B", M: "#C9A227", L: "#C98A2B", XL: "#C2632B", XXL: "#D6462E",
};
const NONE_COLOR = "var(--surface-neutral-border)";
const DIFFICULTY_KEYS = [...DIFFICULTIES.map((d) => d.id), "none"] as const;

export default function TeamView({
  tasks, designers, meetings, conges, onRenameDesigner, readOnly,
}: {
  tasks: Task[];
  designers: Designer[];
  meetings: Meeting[];
  conges: Conge[];
  onRenameDesigner: (id: string, name: string) => void;
  readOnly: boolean;
}) {
  const currentSprint = toISODate(getMonday(new Date()));
  const data = designers.map((d) => {
    const charge = taskChargeForDesignerInSprint(tasks, d.id, currentSprint);
    const meetingCharge = meetingChargeForDesignerInSprint(meetings, d.id, currentSprint);
    const congeCharge = congeChargeForDesignerInSprint(conges, d.id, currentSprint);
    const capacity = effectiveCapacity(meetingCharge, congeCharge);
    const total = tasks.filter((t) => t.designer_ids.includes(d.id) && t.statut !== "livre").length;

    const byDifficulty: Record<string, number> = { none: 0 };
    DIFFICULTIES.forEach((diff) => { byDifficulty[diff.id] = 0; });
    tasks
      .filter((t) => t.designer_ids.includes(d.id) && taskSprints(t).includes(currentSprint))
      .forEach((t) => {
        const key = t.difficulte ?? "none";
        const sprints = taskSprints(t).length || 1;
        byDifficulty[key] += taskShare(t) / sprints;
      });

    return { name: d.name, charge, capacity, meetingCharge, congeCharge, total, color: d.color, id: d.id, ...byDifficulty };
  });

  return (
    <div>
      <div className="studio-calendar-intro">
        Charge planifiée par designer pour le sprint en cours ({sprintLabel(currentSprint)}) — capacité de référence : 5j / semaine, réduite du temps de réunion et de congés.
      </div>
      <div className="studio-panel" style={{ marginBottom: 22 }}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--ink-soft)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--ink-soft)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontFamily: "var(--font-body)", fontSize: 12, border: "1px solid var(--line)", borderRadius: 8 }}
              formatter={(v: number, key: string) => {
                if (key === "capacité") return [`${v} j`, "Capacité"];
                const diff = DIFFICULTIES.find((d) => d.id === key);
                return [`${roundCharge(v)} j`, diff ? `${diff.id} — ${diff.label}` : "Sans difficulté"];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const diff = DIFFICULTIES.find((d) => d.id === value);
                return diff ? diff.id : value === "none" ? "Sans difficulté" : "Capacité";
              }}
              wrapperStyle={{ fontSize: 11.5 }}
            />
            {DIFFICULTY_KEYS.map((key, i) => (
              <Bar
                key={key}
                dataKey={key}
                name={key}
                stackId="charge"
                fill={key === "none" ? NONE_COLOR : DIFFICULTY_COLORS[key as DifficulteId]}
                radius={i === DIFFICULTY_KEYS.length - 1 ? [6, 6, 0, 0] : undefined}
              />
            ))}
            <Line dataKey="capacity" name="capacité" stroke="var(--ink)" strokeDasharray="4 3" strokeWidth={1.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="studio-team-grid">
        {designers.map((d) => {
          const stats = data.find((x) => x.id === d.id)!;
          const extras = [
            stats.meetingCharge > 0 ? `${stats.meetingCharge}j de réunions` : null,
            stats.congeCharge > 0 ? `${stats.congeCharge}j de congés` : null,
          ].filter(Boolean).join(", ");
          return (
            <div key={d.id} className="studio-team-card">
              <Avatar designer={d} size={40} />
              <div style={{ flex: 1 }}>
                <input
                  className="studio-inline-name"
                  defaultValue={d.name}
                  readOnly={readOnly}
                  onBlur={(e) => { if (!readOnly && e.target.value.trim() && e.target.value !== d.name) onRenameDesigner(d.id, e.target.value.trim()); }}
                />
                <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                  {stats.total} tâche{stats.total > 1 ? "s" : ""} active{stats.total > 1 ? "s" : ""} · {stats.charge}j / {stats.capacity}j ce sprint
                  {extras ? ` (dont ${extras})` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
