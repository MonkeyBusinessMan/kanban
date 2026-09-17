import { useEffect, useState, useCallback, useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { CalendarDays, FolderKanban, GripVertical, LayoutGrid, LogOut, Plus, Table2, Users } from "lucide-react";
import { supabase } from "./supabaseClient";
import type { Attachment, Conge, Designer, Filters, Meeting, PrioriteId, Project, StatusId, Subtask, Task, TaskDraft, TaskRow } from "./types";
import { PROJECT_COLORS } from "./constants";
import { applyTheme, getInitialTheme, type Theme } from "./theme";
import { createDefaultSubtasks } from "./subtaskGenerator";
import { sprintKeyFor, toISODate } from "./dateUtils";
import Auth from "./components/Auth";
import ThemeToggle from "./components/ThemeToggle";
import TaskModal from "./components/TaskModal";
import KanbanView from "./components/KanbanView";
import SprintsView from "./components/SprintsView";
import CalendarView from "./components/CalendarView";
import TeamView from "./components/TeamView";
import ProjectsView from "./components/ProjectsView";
import AllocationView from "./components/AllocationView";

type ViewId = "kanban" | "sprints" | "calendrier" | "projets" | "repartition" | "equipe";

const TABS: { id: ViewId; label: string; icon: typeof LayoutGrid }[] = [
  { id: "kanban", label: "Kanban", icon: LayoutGrid },
  { id: "sprints", label: "Sprints", icon: GripVertical },
  { id: "calendrier", label: "Calendrier", icon: CalendarDays },
  { id: "projets", label: "Projets", icon: FolderKanban },
  { id: "repartition", label: "Répartition", icon: Table2 },
  { id: "equipe", label: "Équipe", icon: Users },
];

interface TaskDesignerLink { task_id: string; designer_id: string; }
interface TaskProjectLink { task_id: string; projet_id: string; }

function upsertById<T extends { id: string }>(list: T[], row: T): T[] {
  const idx = list.findIndex((x) => x.id === row.id);
  if (idx >= 0) { const copy = list.slice(); copy[idx] = row; return copy; }
  return [...list, row];
}
function removeById<T extends { id: string }>(list: T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => { applyTheme(theme); }, [theme]);

  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [role, setRole] = useState<"editor" | "viewer" | null>(null);
  const readOnly = role !== "editor";
  const [dataLoading, setDataLoading] = useState(true);
  const [taskRows, setTaskRows] = useState<TaskRow[]>([]);
  const [taskDesignerLinks, setTaskDesignerLinks] = useState<TaskDesignerLink[]>([]);
  const [taskProjectLinks, setTaskProjectLinks] = useState<TaskProjectLink[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [conges, setConges] = useState<Conge[]>([]);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<ViewId>("kanban");
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [filters, setFilters] = useState<Filters>({ designerId: "all", projetId: "all", priorite: "all", epic: "all", search: "" });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    (async () => {
      setDataLoading(true);
      const [
        { data: d, error: dErr },
        { data: p, error: pErr },
        { data: t, error: tErr },
        { data: td, error: tdErr },
        { data: tp, error: tpErr },
        { data: st, error: stErr },
        { data: at, error: atErr },
        { data: mt, error: mtErr },
        { data: cg, error: cgErr },
        { data: pr, error: prErr },
      ] = await Promise.all([
        supabase.from("designers").select("*").order("created_at"),
        supabase.from("projects").select("*").order("created_at"),
        supabase.from("tasks").select("*").order("created_at"),
        supabase.from("task_designers").select("*"),
        supabase.from("task_projects").select("*"),
        supabase.from("subtasks").select("*").order("position"),
        supabase.from("task_attachments").select("*").order("position"),
        supabase.from("meetings").select("*"),
        supabase.from("conges").select("*"),
        supabase.from("profiles").select("role").eq("id", session.user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const err = dErr || pErr || tErr || tdErr || tpErr || stErr || atErr || mtErr || cgErr;
      if (err) setErrorMsg(err.message);
      setDesigners(d ?? []);
      setProjects(p ?? []);
      setTaskRows((t ?? []) as TaskRow[]);
      setTaskDesignerLinks((td ?? []) as TaskDesignerLink[]);
      setTaskProjectLinks((tp ?? []) as TaskProjectLink[]);
      setSubtasks((st ?? []) as Subtask[]);
      setAttachments((at ?? []) as Attachment[]);
      setMeetings((mt ?? []) as Meeting[]);
      setConges((cg ?? []) as Conge[]);
      // Pas de ligne "profiles" ou erreur → lecture seule par défaut, par sécurité.
      setRole(!prErr && pr?.role === "editor" ? "editor" : "viewer");
      setDataLoading(false);
    })();

    const channel = supabase
      .channel("le-studio-kanban")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") setTaskRows((cur) => removeById(cur, (payload.old as TaskRow).id));
        else setTaskRows((cur) => upsertById(cur, payload.new as TaskRow));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "designers" }, (payload) => {
        if (payload.eventType === "DELETE") setDesigners((cur) => removeById(cur, (payload.old as Designer).id));
        else setDesigners((cur) => upsertById(cur, payload.new as Designer));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        if (payload.eventType === "DELETE") setProjects((cur) => removeById(cur, (payload.old as Project).id));
        else setProjects((cur) => upsertById(cur, payload.new as Project));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_designers" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as TaskDesignerLink;
          setTaskDesignerLinks((cur) => cur.filter((l) => !(l.task_id === old.task_id && l.designer_id === old.designer_id)));
        } else {
          const row = payload.new as TaskDesignerLink;
          setTaskDesignerLinks((cur) => (cur.some((l) => l.task_id === row.task_id && l.designer_id === row.designer_id) ? cur : [...cur, row]));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_projects" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const old = payload.old as TaskProjectLink;
          setTaskProjectLinks((cur) => cur.filter((l) => !(l.task_id === old.task_id && l.projet_id === old.projet_id)));
        } else {
          const row = payload.new as TaskProjectLink;
          setTaskProjectLinks((cur) => (cur.some((l) => l.task_id === row.task_id && l.projet_id === row.projet_id) ? cur : [...cur, row]));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "subtasks" }, (payload) => {
        if (payload.eventType === "DELETE") setSubtasks((cur) => removeById(cur, (payload.old as Subtask).id));
        else setSubtasks((cur) => upsertById(cur, payload.new as Subtask));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "task_attachments" }, (payload) => {
        if (payload.eventType === "DELETE") setAttachments((cur) => removeById(cur, (payload.old as Attachment).id));
        else setAttachments((cur) => upsertById(cur, payload.new as Attachment));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, (payload) => {
        if (payload.eventType === "DELETE") setMeetings((cur) => removeById(cur, (payload.old as Meeting).id));
        else setMeetings((cur) => upsertById(cur, payload.new as Meeting));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conges" }, (payload) => {
        if (payload.eventType === "DELETE") setConges((cur) => removeById(cur, (payload.old as Conge).id));
        else setConges((cur) => upsertById(cur, payload.new as Conge));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [session]);

  const tasks: Task[] = useMemo(() => {
    return taskRows.map((row) => {
      const projectLinks = taskProjectLinks.filter((l) => l.task_id === row.id).map((l) => l.projet_id);
      return {
        ...row,
        designer_ids: taskDesignerLinks.filter((l) => l.task_id === row.id).map((l) => l.designer_id),
        // Repli sur l'ancien champ projet_id unique (tâches créées par demande-form,
        // ou avant l'ajout de task_projects) quand aucune ligne n'existe encore.
        projet_ids: projectLinks.length > 0 ? projectLinks : row.projet_id ? [row.projet_id] : [],
        subtasks: subtasks.filter((s) => s.task_id === row.id),
        attachments: attachments.filter((a) => a.task_id === row.id),
      };
    });
  }, [taskRows, taskDesignerLinks, taskProjectLinks, subtasks, attachments]);

  const modalTask = modalTaskId ? tasks.find((t) => t.id === modalTaskId) ?? null : null;
  const showModal = creatingTask || modalTaskId !== null;

  const addProject = useCallback(async (name: string): Promise<string> => {
    if (readOnly) throw new Error("Lecture seule");
    const color = PROJECT_COLORS[projects.length % PROJECT_COLORS.length];
    const { data, error } = await supabase.from("projects").insert({ name, color }).select().single();
    if (error) { setErrorMsg(error.message); throw error; }
    setProjects((cur) => upsertById(cur, data as Project));
    return (data as Project).id;
  }, [projects.length, readOnly]);

  const renameProject = useCallback(async (id: string, name: string) => {
    if (readOnly) return;
    const { error } = await supabase.from("projects").update({ name }).eq("id", id);
    if (error) setErrorMsg(error.message);
    else setProjects((cur) => cur.map((p) => (p.id === id ? { ...p, name } : p)));
  }, [readOnly]);

  /** Déplacer un projet vers une nouvelle priorité aligne aussi tous ses tickets existants. */
  const setProjectPriority = useCallback(async (id: string, priorite: PrioriteId) => {
    if (readOnly) return;
    const { error } = await supabase.from("projects").update({ priorite }).eq("id", id);
    if (error) { setErrorMsg(error.message); return; }
    setProjects((cur) => cur.map((p) => (p.id === id ? { ...p, priorite } : p)));

    const affectedIds = new Set(taskProjectLinks.filter((l) => l.projet_id === id).map((l) => l.task_id));
    taskRows.forEach((t) => { if (t.projet_id === id) affectedIds.add(t.id); });
    if (affectedIds.size === 0) return;
    const ids = [...affectedIds];
    const { error: tasksError } = await supabase.from("tasks").update({ priorite }).in("id", ids);
    if (tasksError) { setErrorMsg(tasksError.message); return; }
    setTaskRows((cur) => cur.map((t) => (affectedIds.has(t.id) ? { ...t, priorite } : t)));
  }, [readOnly, taskProjectLinks, taskRows]);

  const renameDesigner = useCallback(async (id: string, name: string) => {
    if (readOnly) return;
    const { error } = await supabase.from("designers").update({ name }).eq("id", id);
    if (error) setErrorMsg(error.message);
    else setDesigners((cur) => cur.map((d) => (d.id === id ? { ...d, name } : d)));
  }, [readOnly]);

  const syncTaskDesigners = useCallback(async (taskId: string, designerIds: string[]) => {
    const { error: delErr } = await supabase.from("task_designers").delete().eq("task_id", taskId);
    if (delErr) { setErrorMsg(delErr.message); return; }
    setTaskDesignerLinks((cur) => cur.filter((l) => l.task_id !== taskId));
    if (designerIds.length === 0) return;
    const rows = designerIds.map((designer_id) => ({ task_id: taskId, designer_id }));
    const { data, error } = await supabase.from("task_designers").insert(rows).select();
    if (error) { setErrorMsg(error.message); return; }
    setTaskDesignerLinks((cur) => [...cur, ...((data ?? []) as TaskDesignerLink[])]);
  }, []);

  const syncTaskProjects = useCallback(async (taskId: string, projetIds: string[]) => {
    const { error: delErr } = await supabase.from("task_projects").delete().eq("task_id", taskId);
    if (delErr) { setErrorMsg(delErr.message); return; }
    setTaskProjectLinks((cur) => cur.filter((l) => l.task_id !== taskId));
    if (projetIds.length === 0) return;
    const rows = projetIds.map((projet_id) => ({ task_id: taskId, projet_id }));
    const { data, error } = await supabase.from("task_projects").insert(rows).select();
    if (error) { setErrorMsg(error.message); return; }
    setTaskProjectLinks((cur) => [...cur, ...((data ?? []) as TaskProjectLink[])]);
  }, []);

  const addEpic = useCallback(async (titre: string, projetIds: string[]): Promise<string> => {
    if (readOnly) throw new Error("Lecture seule");
    const rest: Omit<TaskRow, "id"> = {
      titre, chef: "", types: [], difficulte: null, projet_id: projetIds[0] ?? null,
      charge: 1, charge_reelle: 0, date_livraison: toISODate(new Date()),
      sprint: sprintKeyFor(toISODate(new Date())), sprint_debut: null,
      is_epic: true, epic_id: null, priorite: "moyenne", statut: "backlog", notes: "",
    };
    const { data, error } = await supabase.from("tasks").insert(rest).select().single();
    if (error) { setErrorMsg(error.message); throw error; }
    const newTask = data as TaskRow;
    setTaskRows((cur) => upsertById(cur, newTask));
    await syncTaskProjects(newTask.id, projetIds);
    return newTask.id;
  }, [readOnly, syncTaskProjects]);

  const saveTask = useCallback(async (draft: TaskDraft) => {
    if (readOnly) return;
    const { id, designer_ids, projet_ids } = draft;
    const rest: Omit<TaskRow, "id"> = {
      titre: draft.titre,
      chef: draft.chef,
      types: draft.types,
      difficulte: draft.difficulte,
      projet_id: projet_ids[0] ?? null,
      charge: draft.charge,
      charge_reelle: draft.charge_reelle,
      date_livraison: draft.date_livraison,
      sprint: draft.sprint,
      sprint_debut: draft.sprint_debut,
      is_epic: draft.is_epic,
      epic_id: draft.is_epic ? null : draft.epic_id,
      priorite: draft.priorite,
      statut: draft.statut,
      notes: draft.notes,
    };
    if (id) {
      const { data, error } = await supabase.from("tasks").update(rest).eq("id", id).select().single();
      if (error) { setErrorMsg(error.message); return; }
      setTaskRows((cur) => upsertById(cur, data as TaskRow));
      await syncTaskDesigners(id, designer_ids);
      await syncTaskProjects(id, projet_ids);
    } else {
      const { data, error } = await supabase.from("tasks").insert(rest).select().single();
      if (error) { setErrorMsg(error.message); return; }
      const newTask = data as TaskRow;
      setTaskRows((cur) => upsertById(cur, newTask));
      await syncTaskDesigners(newTask.id, designer_ids);
      await syncTaskProjects(newTask.id, projet_ids);
      await createDefaultSubtasks(newTask.id);
    }
    setCreatingTask(false);
    setModalTaskId(null);
  }, [syncTaskDesigners, syncTaskProjects, readOnly]);

  const deleteTask = useCallback(async (id: string) => {
    if (readOnly) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) setErrorMsg(error.message);
    else {
      setTaskRows((cur) => removeById(cur, id));
      setTaskDesignerLinks((cur) => cur.filter((l) => l.task_id !== id));
      setSubtasks((cur) => cur.filter((s) => s.task_id !== id));
      setAttachments((cur) => cur.filter((a) => a.task_id !== id));
    }
    setCreatingTask(false);
    setModalTaskId(null);
  }, [readOnly]);

  const moveTask = useCallback(async (id: string, statut: StatusId) => {
    if (readOnly) return;
    setTaskRows((cur) => cur.map((t) => (t.id === id ? { ...t, statut } : t)));
    const { error } = await supabase.from("tasks").update({ statut }).eq("id", id);
    if (error) setErrorMsg(error.message);
  }, [readOnly]);

  const addSubtask = useCallback(async (taskId: string, titre: string) => {
    if (readOnly) return;
    const position = subtasks.filter((s) => s.task_id === taskId).length;
    const { data, error } = await supabase.from("subtasks").insert({ task_id: taskId, titre, position }).select().single();
    if (error) { setErrorMsg(error.message); return; }
    setSubtasks((cur) => upsertById(cur, data as Subtask));
  }, [subtasks, readOnly]);

  const toggleSubtask = useCallback(async (id: string, fait: boolean) => {
    if (readOnly) return;
    setSubtasks((cur) => cur.map((s) => (s.id === id ? { ...s, fait } : s)));
    const { error } = await supabase.from("subtasks").update({ fait }).eq("id", id);
    if (error) setErrorMsg(error.message);
  }, [readOnly]);

  const deleteSubtask = useCallback(async (id: string) => {
    if (readOnly) return;
    const { error } = await supabase.from("subtasks").delete().eq("id", id);
    if (error) setErrorMsg(error.message);
    else setSubtasks((cur) => removeById(cur, id));
  }, [readOnly]);

  const reorderSubtasks = useCallback(async (orderedIds: string[]) => {
    if (readOnly) return;
    const positionById = new Map(orderedIds.map((id, position) => [id, position]));
    setSubtasks((cur) => cur.map((s) => (positionById.has(s.id) ? { ...s, position: positionById.get(s.id)! } : s)));
    const { error } = await Promise.all(
      orderedIds.map((id, position) => supabase.from("subtasks").update({ position }).eq("id", id))
    ).then((results) => ({ error: results.find((r) => r.error)?.error ?? null }));
    if (error) setErrorMsg(error.message);
  }, [readOnly]);

  const addAttachment = useCallback(async (taskId: string, label: string, url: string) => {
    if (readOnly) return;
    const position = attachments.filter((a) => a.task_id === taskId).length;
    const { data, error } = await supabase.from("task_attachments").insert({ task_id: taskId, label, url, position }).select().single();
    if (error) { setErrorMsg(error.message); return; }
    setAttachments((cur) => upsertById(cur, data as Attachment));
  }, [attachments, readOnly]);

  const deleteAttachment = useCallback(async (id: string) => {
    if (readOnly) return;
    const { error } = await supabase.from("task_attachments").delete().eq("id", id);
    if (error) setErrorMsg(error.message);
    else setAttachments((cur) => removeById(cur, id));
  }, [readOnly]);

  const setMeetingCharge = useCallback(async (designerId: string, sprint: string, charge: number) => {
    if (readOnly) return;
    const existing = meetings.find((m) => m.designer_id === designerId && m.sprint === sprint);
    if (charge <= 0) {
      if (existing) {
        const { error } = await supabase.from("meetings").delete().eq("id", existing.id);
        if (error) setErrorMsg(error.message);
        else setMeetings((cur) => removeById(cur, existing.id));
      }
      return;
    }
    if (existing) {
      const { error } = await supabase.from("meetings").update({ charge }).eq("id", existing.id);
      if (error) setErrorMsg(error.message);
      else setMeetings((cur) => cur.map((m) => (m.id === existing.id ? { ...m, charge } : m)));
    } else {
      const { data, error } = await supabase.from("meetings")
        .insert({ designer_id: designerId, sprint, charge, titre: "Réunions" })
        .select().single();
      if (error) { setErrorMsg(error.message); return; }
      setMeetings((cur) => upsertById(cur, data as Meeting));
    }
  }, [meetings, readOnly]);

  const setCongeCharge = useCallback(async (designerId: string, sprint: string, charge: number) => {
    if (readOnly) return;
    const existing = conges.find((c) => c.designer_id === designerId && c.sprint === sprint);
    if (charge <= 0) {
      if (existing) {
        const { error } = await supabase.from("conges").delete().eq("id", existing.id);
        if (error) setErrorMsg(error.message);
        else setConges((cur) => removeById(cur, existing.id));
      }
      return;
    }
    if (existing) {
      const { error } = await supabase.from("conges").update({ charge }).eq("id", existing.id);
      if (error) setErrorMsg(error.message);
      else setConges((cur) => cur.map((c) => (c.id === existing.id ? { ...c, charge } : c)));
    } else {
      const { data, error } = await supabase.from("conges")
        .insert({ designer_id: designerId, sprint, charge, titre: "Congés" })
        .select().single();
      if (error) { setErrorMsg(error.message); return; }
      setConges((cur) => upsertById(cur, data as Conge));
    }
  }, [conges, readOnly]);

  const openNew = () => { setModalTaskId(null); setCreatingTask(true); };
  const openEdit = (task: Task) => { setCreatingTask(false); setModalTaskId(task.id); };
  const closeModal = () => { setCreatingTask(false); setModalTaskId(null); };

  const onDragStart = (e: React.DragEvent, id: string) => e.dataTransfer.setData("text/task-id", id);
  const onDrop = (e: React.DragEvent, statusId: StatusId) => {
    const id = e.dataTransfer.getData("text/task-id");
    if (id) moveTask(id, statusId);
  };

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  if (authLoading) return <div className="studio-boot">Chargement…</div>;
  if (!session) return <Auth theme={theme} onToggleTheme={toggleTheme} />;

  return (
    <div className="studio-root">
      <div className="studio-header">
        <div className="studio-brand">
          <div className="studio-mark"><span>LS</span></div>
          <div>
            <h1>Le Studio — Kanban</h1>
            <p>{designers.length} designers · sprints d'une semaine</p>
          </div>
          {!dataLoading && readOnly && <span className="studio-readonly-badge">Lecture seule</span>}
        </div>

        <div className="studio-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`studio-tab ${view === tab.id ? "active" : ""}`}
              onClick={() => setView(tab.id)}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!readOnly && (
            <button className="studio-btn-primary" onClick={openNew}>
              <Plus size={15} /> Nouvelle demande
            </button>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <button className="studio-icon-btn-header" title={`Déconnecter ${session.user.email ?? ""}`} onClick={() => supabase.auth.signOut()}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {dataLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>Chargement de l'espace de travail…</div>
      ) : (
        <>
          {view === "kanban" && (
            <KanbanView
              tasks={tasks} designers={designers} projects={projects} filters={filters} setFilters={setFilters}
              onEdit={openEdit} onDrop={onDrop} onDragStart={onDragStart} readOnly={readOnly}
            />
          )}
          {view === "sprints" && (
            <SprintsView
              tasks={tasks} designers={designers} projects={projects} meetings={meetings} conges={conges}
              onEdit={openEdit} onSetMeetingCharge={setMeetingCharge} onSetCongeCharge={setCongeCharge} readOnly={readOnly}
            />
          )}
          {view === "calendrier" && <CalendarView tasks={tasks} designers={designers} projects={projects} onEdit={openEdit} />}
          {view === "projets" && (
            <ProjectsView tasks={tasks} designers={designers} projects={projects} onAddProject={addProject} onRenameProject={renameProject} onSetProjectPriority={setProjectPriority} onEdit={openEdit} readOnly={readOnly} />
          )}
          {view === "repartition" && <AllocationView tasks={tasks} designers={designers} projects={projects} onEdit={openEdit} />}
          {view === "equipe" && <TeamView tasks={tasks} designers={designers} meetings={meetings} conges={conges} onRenameDesigner={renameDesigner} readOnly={readOnly} />}
        </>
      )}

      {showModal && (
        <TaskModal
          key={modalTask?.id ?? "new"}
          initial={modalTask}
          tasks={tasks}
          designers={designers}
          projects={projects}
          onAddProject={addProject}
          onAddEpic={addEpic}
          onClose={closeModal}
          onSave={saveTask}
          onDelete={deleteTask}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onReorderSubtasks={reorderSubtasks}
          onAddAttachment={addAttachment}
          onDeleteAttachment={deleteAttachment}
          onOpenTask={openEdit}
          readOnly={readOnly}
        />
      )}

      {errorMsg && (
        <div className="studio-save-flag" onClick={() => setErrorMsg(null)} title="Cliquer pour masquer">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
