import { Fragment, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Designer, Project, Task } from "../types";
import { STATUSES, PRIORITIES } from "../constants";
import { getMonday } from "../dateUtils";
import { Avatar, ProjectTags } from "./atoms";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

function monthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // lundi = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MiniCalendar({ tasks, monthOffset, setMonthOffset }: { tasks: Task[]; monthOffset: number; setMonthOffset: (fn: (o: number) => number) => void }) {
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const weeks = monthMatrix(year, month);
  const todayISO = isoDay(now);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    tasks.forEach((t) => {
      if (!t.date_livraison) return;
      map.set(t.date_livraison, (map.get(t.date_livraison) ?? 0) + 1);
    });
    return map;
  }, [tasks]);

  return (
    <div className="studio-panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, textTransform: "capitalize", color: "var(--ink)" }}>
          {ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="studio-icon-btn" onClick={() => setMonthOffset((o) => o - 1)}><ChevronLeft size={14} /></button>
          <button className="studio-icon-btn" onClick={() => setMonthOffset((o) => o + 1)}><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="studio-minical-grid">
        {WEEKDAYS.map((w, i) => <div key={i} className="studio-minical-weekday">{w}</div>)}
        {weeks.flat().map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = isoDay(d);
          const count = countsByDay.get(iso) ?? 0;
          return (
            <div key={i} className={`studio-minical-day ${iso === todayISO ? "today" : ""}`} title={count > 0 ? `${count} livraison${count > 1 ? "s" : ""}` : undefined}>
              <span>{d.getDate()}</span>
              {count > 0 && <span className="studio-minical-badge">{count}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S", "D"];

function GanttChart({ tasks, projects, monthOffset }: { tasks: Task[]; projects: Project[]; monthOffset: number }) {
  const now = new Date();
  const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStartISO = isoDay(new Date(year, month, 1));
  const monthEndISO = isoDay(new Date(year, month, daysInMonth));
  const todayISO = isoDay(now);
  const todayDay = todayISO >= monthStartISO && todayISO <= monthEndISO ? now.getDate() : null;

  const rows = tasks
    .filter((t) => t.date_livraison && t.date_livraison >= monthStartISO && t.date_livraison <= monthEndISO)
    .sort((a, b) => (a.date_livraison || "").localeCompare(b.date_livraison || ""));

  if (rows.length === 0) {
    return <div className="studio-empty-col">Aucune livraison ce mois-ci.</div>;
  }

  // Regroupe les tâches par projet, les groupes étant ordonnés par priorité
  // du projet (haute → basse) puis par nom.
  const PRIORITY_ORDER = PRIORITIES.map((p) => p.id);
  const byProject = new Map<string, Task[]>();
  rows.forEach((t) => {
    const keys = t.projet_ids.length > 0 ? t.projet_ids : ["none"];
    keys.forEach((key) => {
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(t);
    });
  });
  const projectGroups = Array.from(byProject.entries())
    .map(([key, items]) => ({ project: key === "none" ? null : projects.find((p) => p.id === key) ?? null, items }))
    .sort((a, b) => {
      const aPrio = a.project ? PRIORITY_ORDER.indexOf(a.project.priorite) : PRIORITY_ORDER.length;
      const bPrio = b.project ? PRIORITY_ORDER.indexOf(b.project.priorite) : PRIORITY_ORDER.length;
      if (aPrio !== bPrio) return aPrio - bPrio;
      return (a.project?.name ?? "Sans projet").localeCompare(b.project?.name ?? "Sans projet", "fr");
    });

  type Entry = { kind: "group"; label: string; color: string } | { kind: "task"; task: Task; groupProject: Project | null };
  const entries: Entry[] = [];
  projectGroups.forEach(({ project, items }) => {
    entries.push({ kind: "group", label: project?.name ?? "Sans projet", color: project?.color ?? "var(--ink-soft)" });
    items.forEach((t) => entries.push({ kind: "task", task: t, groupProject: project }));
  });

  // Regroupe les jours du mois par semaine (lundi → dimanche) pour l'en-tête.
  const weekGroups: { startDay: number; length: number; label: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const mondayISO = isoDay(getMonday(date));
    const last = weekGroups[weekGroups.length - 1];
    if (last && isoDay(getMonday(new Date(year, month, last.startDay))) === mondayISO) {
      last.length += 1;
    } else {
      weekGroups.push({ startDay: d, length: 1, label: getMonday(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) });
    }
  }

  const totalRows = 2 + entries.length; // en-tête semaines + en-tête jours + une ligne par groupe/tâche

  return (
    <div className="studio-gantt-scroll">
      <div className="studio-gantt" style={{ gridTemplateColumns: `160px repeat(${daysInMonth}, minmax(26px, 1fr))` }}>
        <div className="studio-gantt-corner" style={{ gridColumn: 1, gridRow: "1 / 3" }} />

        {weekGroups.map((w, i) => (
          <div key={i} className="studio-gantt-week-head" style={{ gridColumn: `${w.startDay + 1} / span ${w.length}`, gridRow: 1 }}>
            Sem. du {w.label}
          </div>
        ))}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const weekday = new Date(year, month, day).getDay();
          const isWeekend = weekday === 0 || weekday === 6;
          const isToday = day === todayDay;
          return (
            <div
              key={i}
              className={`studio-gantt-day-head ${isWeekend ? "weekend" : ""} ${isToday ? "today" : ""}`}
              style={{ gridColumn: day + 1, gridRow: 2 }}
            >
              <span className="weekday">{DAY_LETTERS[weekday]}</span>
              <span className="num">{day}</span>
            </div>
          );
        })}

        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const weekday = new Date(year, month, day).getDay();
          if (weekday !== 0 && weekday !== 6) return null;
          return <div key={`w${i}`} className="studio-gantt-col-tint" style={{ gridColumn: day + 1, gridRow: `1 / ${totalRows + 1}` }} />;
        })}

        {todayDay && (
          <div className="studio-gantt-today-col" style={{ gridColumn: todayDay + 1, gridRow: `1 / ${totalRows + 1}` }} />
        )}

        {entries.map((entry, entryIndex) => {
          const gridRow = entryIndex + 3;
          if (entry.kind === "group") {
            return (
              <div
                key={`group-${entryIndex}`}
                className="studio-gantt-group-head"
                style={{ gridColumn: `1 / ${daysInMonth + 2}`, gridRow }}
              >
                <span className="studio-dot" style={{ background: entry.color }} />
                {entry.label}
              </div>
            );
          }
          const t = entry.task;
          const project = entry.groupProject;
          const prio = PRIORITIES.find((p) => p.id === t.priorite)!;
          const deliveryDay = new Date(t.date_livraison + "T00:00:00").getDate();
          const startCandidate = t.sprint_debut || t.sprint || t.date_livraison!;
          const startClamped = startCandidate < monthStartISO ? monthStartISO : startCandidate;
          const startDay = new Date(startClamped + "T00:00:00").getDate();
          const span = Math.max(1, deliveryDay - startDay + 1);
          return (
            <Fragment key={t.id}>
              <div className="studio-gantt-label" title={t.titre} style={{ gridColumn: 1, gridRow }}>{t.titre}</div>
              <div
                className="studio-gantt-bar"
                style={{ gridColumn: `${startDay + 1} / span ${span}`, gridRow, background: `${(project?.color || prio.color)}30`, borderColor: project?.color || prio.color }}
                title={`${t.titre} — livraison ${t.date_livraison}`}
              >
                <span className="studio-dot" style={{ background: prio.color }} />
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarView({
  tasks, designers, projects, onEdit,
}: {
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  onEdit: (task: Task) => void;
}) {
  const [monthOffset, setMonthOffset] = useState(0);

  const grouped = useMemo(() => {
    const now = new Date();
    const ref = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const monthKeyFilter = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`;
    const sorted = [...tasks]
      .filter((t) => t.date_livraison && t.date_livraison.slice(0, 7) === monthKeyFilter)
      .sort((a, b) => (a.date_livraison || "").localeCompare(b.date_livraison || ""));
    const map = new Map<string, Task[]>();
    sorted.forEach((t) => {
      const monthKey = t.date_livraison!.slice(0, 7);
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey)!.push(t);
    });
    return Array.from(map.entries());
  }, [tasks, monthOffset]);

  return (
    <div>
      <div className="studio-calendar-intro">
        Calendrier de livraison partagé — vue à transmettre aux chefs de projet.
      </div>

      <div className="studio-calendar-top">
        <MiniCalendar tasks={tasks} monthOffset={monthOffset} setMonthOffset={setMonthOffset} />
        <div className="studio-panel" style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13.5, marginBottom: 10, color: "var(--ink)" }}>
            Répartition des tâches (type Gantt)
          </div>
          <GanttChart tasks={tasks} projects={projects} monthOffset={monthOffset} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 26 }}>
        {grouped.map(([monthKey, items]) => (
          <div key={monthKey}>
            <div className="studio-month-label">
              {new Date(monthKey + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </div>
            <div className="studio-calendar-list">
              {items.map((t) => {
                const assigned = t.designer_ids.map((id) => designers.find((x) => x.id === id)).filter((x): x is Designer => !!x)[0];
                const taskProjects = t.projet_ids.map((id) => projects.find((x) => x.id === id)).filter((x): x is Project => !!x);
                const prio = PRIORITIES.find((x) => x.id === t.priorite)!;
                const date = new Date(t.date_livraison + "T00:00:00");
                return (
                  <div key={t.id} className="studio-calendar-row" onClick={() => onEdit(t)}>
                    <div className="studio-calendar-date">
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>
                        {date.getDate()}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ink-soft)", textTransform: "uppercase" }}>
                        {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                      </div>
                    </div>
                    <div style={{ width: 3, alignSelf: "stretch", background: prio.color, borderRadius: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ink)" }}>{t.titre}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 2 }}>
                        {[t.chef, t.types.join(", ")].filter(Boolean).join(" · ")}
                      </div>
                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}><ProjectTags projects={taskProjects} /></div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="studio-chip">{STATUSES.find((s) => s.id === t.statut)?.label}</span>
                      <Avatar designer={assigned} size={24} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {grouped.length === 0 && <div className="studio-empty-col">Aucune livraison planifiée ce mois-ci.</div>}
      </div>
    </div>
  );
}
