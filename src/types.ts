export type StatusId = "backlog" | "cadrage" | "encours" | "attente" | "revision" | "livre";
export type PrioriteId = "haute" | "moyenne" | "basse";
export type DifficulteId = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export interface Designer {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  priorite: PrioriteId;
}

export interface TaskRow {
  id: string;
  titre: string;
  chef: string;
  types: string[];
  difficulte: DifficulteId | null;
  projet_id: string | null;
  charge: number;
  charge_reelle: number;
  date_livraison: string | null;
  sprint: string | null;
  sprint_debut: string | null;
  is_epic: boolean;
  epic_id: string | null;
  priorite: PrioriteId;
  statut: StatusId;
  notes: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  titre: string;
  fait: boolean;
  position: number;
}

export interface Attachment {
  id: string;
  task_id: string;
  label: string;
  url: string;
  position: number;
}

export interface Meeting {
  id: string;
  designer_id: string;
  sprint: string;
  titre: string;
  charge: number;
}

export interface Conge {
  id: string;
  designer_id: string;
  sprint: string;
  titre: string;
  charge: number;
}

/** Une TaskRow enrichie côté client avec ses designers assignés et ses sous-tâches. */
export interface Task extends TaskRow {
  designer_ids: string[];
  projet_ids: string[];
  subtasks: Subtask[];
  attachments: Attachment[];
}

export type TaskDraft = Omit<TaskRow, "id"> & { id?: string; designer_ids: string[]; projet_ids: string[] };

export interface Filters {
  designerId: string;
  projetId: string;
  priorite: string;
  epic: "all" | "epics" | "non-epics";
  search: string;
}
