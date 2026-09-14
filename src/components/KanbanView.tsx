import { Search, X } from "lucide-react";
import type { Designer, Filters, Project, StatusId, Task } from "../types";
import { PRIORITIES, STATUSES } from "../constants";
import { toISODate } from "../dateUtils";
import { roundCharge } from "../capacity";
import TaskCard from "./TaskCard";

const EMPTY_FILTERS: Filters = { designerId: "all", projetId: "all", priorite: "all", epic: "all", search: "" };

export default function KanbanView({
  tasks, designers, projects, filters, setFilters, onEdit, onDrop, onDragStart, readOnly,
}: {
  tasks: Task[];
  designers: Designer[];
  projects: Project[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  onEdit: (task: Task) => void;
  onDrop: (e: React.DragEvent, statusId: StatusId) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  readOnly: boolean;
}) {
  const todayISO = toISODate(new Date());
  const filtered = tasks.filter((t) => {
    if (filters.designerId !== "all" && !t.designer_ids.includes(filters.designerId)) return false;
    if (filters.projetId !== "all" && t.projet_id !== filters.projetId) return false;
    if (filters.priorite !== "all" && t.priorite !== filters.priorite) return false;
    if (filters.epic === "epics" && !t.is_epic) return false;
    if (filters.epic === "non-epics" && t.is_epic) return false;
    if (filters.search && !`${t.titre} ${t.chef}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
  const hasActiveFilters = filters.designerId !== "all" || filters.projetId !== "all" || filters.priorite !== "all" || filters.epic !== "all" || filters.search !== "";

  return (
    <div>
      <div className="studio-toolbar">
        <div className="studio-search">
          <Search size={14} strokeWidth={1.5} color="var(--search-placeholder)" />
          <input
            placeholder="Rechercher une tâche ou un chef de projet…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select className="studio-select-sm" value={filters.designerId} onChange={(e) => setFilters({ ...filters, designerId: e.target.value })}>
          <option value="all">Tous les designers</option>
          {[...designers].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="studio-select-sm" value={filters.projetId} onChange={(e) => setFilters({ ...filters, projetId: e.target.value })}>
          <option value="all">Tous les projets</option>
          {[...projects].sort((a, b) => a.name.localeCompare(b.name, "fr")).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="studio-select-sm" value={filters.priorite} onChange={(e) => setFilters({ ...filters, priorite: e.target.value })}>
          <option value="all">Toutes priorités</option>
          {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="studio-select-sm" value={filters.epic} onChange={(e) => setFilters({ ...filters, epic: e.target.value as Filters["epic"] })}>
          <option value="all">Epics et tickets</option>
          <option value="epics">Epics uniquement</option>
          <option value="non-epics">Sans les epics</option>
        </select>
        {hasActiveFilters && (
          <button type="button" className="studio-btn-ghost studio-btn-reset" onClick={() => setFilters(EMPTY_FILTERS)}>
            <X size={13} /> Réinitialiser
          </button>
        )}
      </div>

      <div className="studio-board" style={{ gridTemplateColumns: `repeat(${STATUSES.length}, minmax(220px, 1fr))` }}>
        {STATUSES.map((status) => {
          const col = filtered
            .filter((t) => t.statut === status.id)
            .sort((a, b) => (a.date_livraison || "").localeCompare(b.date_livraison || ""));
          const chargeSum = roundCharge(col.reduce((s, t) => s + (t.charge || 0), 0));
          return (
            <div
              key={status.id}
              className="studio-column"
              onDragOver={(e) => { if (!readOnly) e.preventDefault(); }}
              onDrop={(e) => { if (!readOnly) onDrop(e, status.id); }}
            >
              <div className="studio-column-head">
                <span>{status.label}</span>
                <span className="studio-column-count">{col.length} · {chargeSum}j</span>
              </div>
              <div className="studio-column-body">
                {col.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    allTasks={tasks}
                    designers={designers}
                    project={projects.find((p) => p.id === t.projet_id)}
                    onEdit={onEdit}
                    onDragStart={onDragStart}
                    readOnly={readOnly}
                    overdue={t.statut !== "livre" && !!t.date_livraison && t.date_livraison < todayISO}
                  />
                ))}
                {col.length === 0 && <div className="studio-empty-col">Aucune tâche</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
