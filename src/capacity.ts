import type { Conge, Meeting, Task } from "./types";
import { CAPACITY_PER_DESIGNER } from "./constants";
import { addDays, toISODate } from "./dateUtils";

/** Arrondit une charge (jours) à 2 décimales maximum. */
export function roundCharge(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Une tâche assignée à plusieurs designers répartit sa charge à parts égales entre eux. */
export function taskShare(task: Task): number {
  const n = task.designer_ids.length || 1;
  return roundCharge(task.charge / n);
}

/**
 * Liste des sprints (lundis, ISO) traversés par la tâche : de "sprint_debut"
 * (si renseigné) jusqu'à "sprint" (dérivé de la date de livraison). Sans
 * sprint_debut, la tâche tient sur son seul sprint de livraison.
 */
export function taskSprints(task: Task): string[] {
  const end = task.sprint;
  if (!end) return [];
  const start = task.sprint_debut && task.sprint_debut <= end ? task.sprint_debut : end;
  const weeks: string[] = [];
  let cur = start;
  while (cur <= end) {
    weeks.push(cur);
    cur = toISODate(addDays(cur, 7));
  }
  return weeks;
}

export function taskChargeForDesignerInSprint(tasks: Task[], designerId: string, sprint: string): number {
  const total = tasks
    .filter((t) => t.designer_ids.includes(designerId) && !t.is_epic)
    .reduce((s, t) => {
      const sprints = taskSprints(t);
      if (!sprints.includes(sprint)) return s;
      return s + taskShare(t) / sprints.length;
    }, 0);
  return roundCharge(total);
}

export function meetingChargeForDesignerInSprint(meetings: Meeting[], designerId: string, sprint: string): number {
  return meetings
    .filter((m) => m.designer_id === designerId && m.sprint === sprint)
    .reduce((s, m) => s + m.charge, 0);
}

export function congeChargeForDesignerInSprint(conges: Conge[], designerId: string, sprint: string): number {
  return conges
    .filter((c) => c.designer_id === designerId && c.sprint === sprint)
    .reduce((s, c) => s + c.charge, 0);
}

/** Les réunions et les congés réduisent la capacité disponible du designer pour ce sprint. */
export function effectiveCapacity(meetingCharge: number, congeCharge = 0): number {
  return roundCharge(Math.max(0, CAPACITY_PER_DESIGNER - meetingCharge - congeCharge));
}

export function subtaskProgress(task: Task): { done: number; total: number; pct: number } {
  const total = task.subtasks.length;
  const done = task.subtasks.filter((s) => s.fait).length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

/** Progression d'un epic : proportion de ses tickets enfants livrés. */
export function epicChildren(epic: Task, allTasks: Task[]): Task[] {
  return allTasks.filter((t) => t.epic_id === epic.id);
}

export function epicProgress(epic: Task, allTasks: Task[]): { done: number; total: number; pct: number } {
  const children = epicChildren(epic, allTasks);
  const done = children.filter((t) => t.statut === "livre").length;
  const total = children.length;
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}
