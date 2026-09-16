import type { Designer, DifficulteId, Project, PrioriteId } from "../types";
import { PRIORITIES } from "../constants";

export function Avatar({ designer, size = 28 }: { designer?: Designer | null; size?: number }) {
  if (!designer) return null;
  const initials = designer.name.slice(0, 2).toUpperCase();
  return (
    <div
      title={designer.name}
      className="studio-avatar"
      style={{ width: size, height: size, background: designer.color, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

export function AvatarStack({ designers, size = 22 }: { designers: (Designer | undefined)[]; size?: number }) {
  const valid = designers.filter((d): d is Designer => !!d);
  if (valid.length === 0) return null;
  return (
    <div style={{ display: "flex" }}>
      {valid.map((d, i) => (
        <div key={d.id} style={{ marginLeft: i === 0 ? 0 : -6, position: "relative", zIndex: valid.length - i }}>
          <div style={{ borderRadius: "50%", boxShadow: "0 0 0 2px var(--card-bg)" }}>
            <Avatar designer={d} size={size} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectTag({ project }: { project?: Project | null }) {
  if (!project) return null;
  return (
    <span
      className="studio-chip-project"
      style={{ color: project.color, background: `${project.color}1A`, borderColor: `${project.color}40` }}
    >
      <span className="studio-dot" style={{ background: project.color }} />
      {project.name}
    </span>
  );
}

export function ProjectTags({ projects }: { projects: (Project | undefined | null)[] }) {
  const valid = projects.filter((p): p is Project => !!p);
  if (valid.length === 0) return null;
  return (
    <>
      {valid.map((p) => <ProjectTag key={p.id} project={p} />)}
    </>
  );
}

export function PriorityDot({ id }: { id: PrioriteId }) {
  const p = PRIORITIES.find((x) => x.id === id) || PRIORITIES[1];
  return <span className="studio-dot" style={{ background: p.color }} />;
}

export function DifficultyBadge({ id }: { id?: DifficulteId | null }) {
  if (!id) return null;
  return <span className="studio-chip studio-chip-difficulty">{id}</span>;
}

export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <div className="studio-bar-track" style={{ flex: 1 }}>
        <div className="studio-bar-fill" style={{ width: `${pct}%`, background: "var(--accent)" }} />
      </div>
      {label && <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--ink-soft)", flexShrink: 0 }}>{label}</span>}
    </div>
  );
}
