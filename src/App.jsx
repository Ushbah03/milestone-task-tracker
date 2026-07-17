import React, { useState, useMemo, useRef, useEffect } from "react";

/*
  Milestone Log
  A task tracker styled after a git commit log: each task is a node on a
  vertical rail, colored by priority, filled in once shipped.
*/

const PALETTE = {
  bg: "#12151a",
  bgGradientEnd: "#181c23",
  panel: "#1a1e25",
  panelAlt: "#20252d",
  border: "#262b33",
  borderLight: "#333a44",
  rail: "#2e343d",
  textPrimary: "#edeef0",
  textSecondary: "#939ba7",
  textMuted: "#5b6270",
  high: "#ef8264",
  highSoft: "#f2a58e",
  highBg: "rgba(239, 130, 100, 0.14)",
  medium: "#e8ba5c",
  mediumSoft: "#f0cd8b",
  mediumBg: "rgba(232, 186, 92, 0.14)",
  low: "#5abf98",
  lowSoft: "#7fd4b3",
  lowBg: "rgba(90, 191, 152, 0.14)",
  overdue: "#ef8264",
};

const PRIORITIES = ["High", "Medium", "Low"];
const priorityRank = { High: 0, Medium: 1, Low: 2 };
const FILTERS = ["All", "Active", "Completed"];
const SORTS = ["Priority", "Due date", "Newest"];

function priorityColor(priority) {
  if (priority === "High") return { fg: PALETTE.high, soft: PALETTE.highSoft, bg: PALETTE.highBg };
  if (priority === "Medium") return { fg: PALETTE.medium, soft: PALETTE.mediumSoft, bg: PALETTE.mediumBg };
  return { fg: PALETTE.low, soft: PALETTE.lowSoft, bg: PALETTE.lowBg };
}

function isOverdue(dueDate, completed) {
  if (!dueDate || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dueDate + "T00:00:00") < today;
}

function formatDue(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

let uid = 6;
const nextUid = () => uid++;

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');";

const SCOPED_CSS = `
${FONT_IMPORT}

@keyframes mlog-bg-pan {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}

@keyframes mlog-row-in {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes mlog-row-out {
  from { opacity: 1; transform: translateX(0) scale(1); max-height: 60px; margin-bottom: 8px; }
  to { opacity: 0; transform: translateX(12px) scale(0.97); max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
}

@keyframes mlog-pop {
  0% { transform: translate(-50%, -50%) scale(1); }
  40% { transform: translate(-50%, -50%) scale(1.35); }
  100% { transform: translate(-50%, -50%) scale(1); }
}

@keyframes mlog-toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes mlog-banner-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes mlog-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.mlog-page-bg {
  background-size: 200% 200%;
  animation: mlog-bg-pan 18s ease-in-out infinite alternate;
}

.mlog-input::placeholder { color: ${PALETTE.textMuted}; }
.mlog-input:focus { border-color: ${PALETTE.borderLight}; box-shadow: 0 0 0 3px rgba(237,238,240,0.06); }
.mlog-date { color-scheme: dark; }

.mlog-search { transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease; }
.mlog-search:focus { border-color: ${PALETTE.borderLight}; box-shadow: 0 0 0 3px rgba(237,238,240,0.06); }

.mlog-sort-select { transition: border-color 0.15s ease; cursor: pointer; }
.mlog-sort-select:hover { border-color: ${PALETTE.borderLight}; }

.mlog-seg-btn { transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease, transform 0.1s ease; }
.mlog-seg-btn:hover { border-color: ${PALETTE.borderLight}; transform: translateY(-1px); }

.mlog-add-btn {
  transition: transform 0.12s ease, filter 0.12s ease, box-shadow 0.15s ease;
  background-size: 200% auto;
}
.mlog-add-btn:hover { filter: brightness(1.1); box-shadow: 0 6px 20px rgba(239,130,100,0.3); background-position: right center; }
.mlog-add-btn:active { transform: scale(0.96); }

.mlog-filter-btn { transition: color 0.15s ease; position: relative; }
.mlog-filter-btn:hover { color: ${PALETTE.textPrimary}; }

.mlog-clear-btn { transition: color 0.15s ease, border-color 0.15s ease; }
.mlog-clear-btn:hover { color: ${PALETTE.textPrimary}; border-color: ${PALETTE.borderLight}; }

.mlog-row {
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease, box-shadow 0.2s ease;
  animation: mlog-row-in 0.28s ease both;
  overflow: hidden;
}
.mlog-row:hover { border-color: ${PALETTE.borderLight}; background-color: ${PALETTE.panelAlt}; transform: translateX(2px); box-shadow: 0 4px 14px rgba(0,0,0,0.25); }
.mlog-row-exit { animation: mlog-row-out 0.22s ease forwards; }

.mlog-node { transition: transform 0.15s ease, filter 0.15s ease; cursor: pointer; }
.mlog-node:hover { transform: translate(-50%, -50%) scale(1.2); }
.mlog-node-pop { animation: mlog-pop 0.35s ease; }

.mlog-delete { transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
.mlog-delete:hover { color: ${PALETTE.high}; border-color: ${PALETTE.high}; transform: rotate(90deg); }

.mlog-edit-input { transition: box-shadow 0.15s ease; }
.mlog-edit-input:focus { box-shadow: 0 0 0 3px rgba(237,238,240,0.06); }

.mlog-bar-fill { transition: width 0.5s ease; }

.mlog-toast {
  animation: mlog-toast-in 0.2s ease;
}

.mlog-banner {
  animation: mlog-banner-in 0.3s ease;
  background-size: 200% auto;
  animation: mlog-banner-in 0.3s ease, mlog-shimmer 3s linear infinite;
}

.mlog-node:focus-visible, .mlog-add-btn:focus-visible, .mlog-seg-btn:focus-visible,
.mlog-delete:focus-visible, .mlog-input:focus-visible, .mlog-filter-btn:focus-visible,
.mlog-clear-btn:focus-visible, .mlog-date:focus-visible, .mlog-search:focus-visible,
.mlog-sort-select:focus-visible {
  outline: 2px solid ${PALETTE.textSecondary};
  outline-offset: 2px;
}
`;

export default function TaskTracker() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Set up project repository", priority: "High", completed: true, dueDate: "" },
    { id: 2, text: "Design database schema", priority: "Medium", completed: true, dueDate: "" },
    { id: 3, text: "Build authentication flow", priority: "High", completed: false, dueDate: "2026-07-22" },
    { id: 4, text: "Write onboarding docs", priority: "Low", completed: false, dueDate: "2026-08-01" },
    { id: 5, text: "Fix pagination bug", priority: "Medium", completed: false, dueDate: "2026-07-10" },
  ]);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("Medium");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Priority");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [exitingIds, setExitingIds] = useState([]);
  const [poppedId, setPoppedId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastTimer = useRef({});

  const pushToast = (message) => {
    const id = nextUid();
    setToasts((prev) => [...prev, { id, message }]);
    toastTimer.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  };

  useEffect(() => {
    return () => {
      Object.values(toastTimer.current).forEach(clearTimeout);
    };
  }, []);

  const addTask = () => {
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      ...prev,
      {
        id: nextUid(),
        text: trimmed,
        priority: newTaskPriority,
        completed: false,
        dueDate: newTaskDue,
      },
    ]);
    setNewTaskText("");
    setNewTaskDue("");
    pushToast("Task added");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") addTask();
  };

  const toggleComplete = (id) => {
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      const target = updated.find((t) => t.id === id);
      if (target && target.completed) {
        setPoppedId(id);
        setTimeout(() => setPoppedId(null), 380);
        pushToast("Marked complete");
      }
      return updated;
    });
  };

  const handleNodeKeyDown = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleComplete(id);
    }
  };

  const deleteTask = (id) => {
    setExitingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => prev.filter((x) => x !== id));
    }, 220);
    pushToast("Task deleted");
  };

  const clearCompleted = () => {
    const completedIds = tasks.filter((t) => t.completed).map((t) => t.id);
    setExitingIds((prev) => [...prev, ...completedIds]);
    setTimeout(() => {
      setTasks((prev) => prev.filter((t) => !t.completed));
      setExitingIds((prev) => prev.filter((x) => !completedIds.includes(x)));
    }, 220);
    pushToast("Completed tasks cleared");
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingText(task.text);
  };

  const commitEdit = (id) => {
    const trimmed = editingText.trim();
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, text: trimmed || t.text } : t)));
    setEditingId(null);
    setEditingText("");
  };

  const handleEditKeyDown = (e, id) => {
    if (e.key === "Enter") commitEdit(id);
    if (e.key === "Escape") {
      setEditingId(null);
      setEditingText("");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "Active" && t.completed) return false;
      if (filter === "Completed" && !t.completed) return false;
      if (query.trim() && !t.text.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [tasks, filter, query]);

  const sortedTasks = useMemo(() => {
    const arr = [...filteredTasks];
    arr.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (sortBy === "Priority") {
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
      }
      if (sortBy === "Due date") {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
      }
      if (sortBy === "Newest") return b.id - a.id;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return 0;
    });
    return arr;
  }, [filteredTasks, sortBy]);

  const shippedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const activeCount = totalCount - shippedCount;
  const pct = totalCount === 0 ? 0 : Math.round((shippedCount / totalCount) * 100);
  const allDone = totalCount > 0 && shippedCount === totalCount;

  const priorityStats = PRIORITIES.map((p) => {
    const items = tasks.filter((t) => t.priority === p);
    const done = items.filter((t) => t.completed).length;
    return { priority: p, total: items.length, done };
  });
  const maxStat = Math.max(1, ...priorityStats.map((s) => s.total));

  const styles = {
    page: {
      minHeight: "100vh",
      background: `linear-gradient(160deg, ${PALETTE.bg} 0%, ${PALETTE.bgGradientEnd} 50%, ${PALETTE.bg} 100%)`,
      color: PALETTE.textPrimary,
      fontFamily: "'JetBrains Mono', 'SF Mono', Consolas, monospace",
      padding: "56px 20px 100px",
      boxSizing: "border-box",
      position: "relative",
    },
    container: {
      maxWidth: "660px",
      margin: "0 auto",
    },
    eyebrow: {
      fontSize: "11px",
      letterSpacing: "2.5px",
      color: PALETTE.textMuted,
      textTransform: "uppercase",
      marginBottom: "10px",
      fontWeight: 500,
    },
    title: {
      fontFamily: "'Space Grotesk', sans-serif",
      fontSize: "30px",
      fontWeight: 700,
      margin: 0,
      letterSpacing: "-0.3px",
      background: `linear-gradient(90deg, ${PALETTE.textPrimary} 0%, ${PALETTE.textSecondary} 130%)`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
      display: "inline-block",
    },
    progressRow: {
      display: "flex",
      alignItems: "center",
      gap: "14px",
      marginTop: "18px",
      marginBottom: "18px",
    },
    progressTrack: {
      flex: 1,
      height: "7px",
      borderRadius: "999px",
      backgroundColor: PALETTE.panelAlt,
      border: `1px solid ${PALETTE.border}`,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: "999px",
      background: `linear-gradient(90deg, ${PALETTE.low} 0%, ${PALETTE.medium} 55%, ${PALETTE.high} 100%)`,
      width: `${pct}%`,
    },
    progressLabel: {
      fontSize: "12px",
      color: PALETTE.textSecondary,
      whiteSpace: "nowrap",
    },
    statsPanel: {
      display: "flex",
      gap: "14px",
      marginBottom: "26px",
      backgroundColor: PALETTE.panel,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "10px",
      padding: "14px 16px",
    },
    statItem: {
      flex: 1,
    },
    statTop: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: "11px",
      marginBottom: "6px",
      color: PALETTE.textSecondary,
    },
    statBarTrack: {
      height: "5px",
      borderRadius: "999px",
      backgroundColor: PALETTE.panelAlt,
      overflow: "hidden",
    },
    banner: {
      background: `linear-gradient(90deg, ${PALETTE.lowBg}, ${PALETTE.mediumBg}, ${PALETTE.highBg}, ${PALETTE.mediumBg}, ${PALETTE.lowBg})`,
      border: `1px solid ${PALETTE.borderLight}`,
      borderRadius: "10px",
      padding: "14px 16px",
      marginBottom: "20px",
      fontSize: "13px",
      fontWeight: 600,
      textAlign: "center",
      color: PALETTE.textPrimary,
    },
    panel: {
      backgroundColor: PALETTE.panel,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "10px",
      padding: "16px",
      marginBottom: "22px",
    },
    inputRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "12px",
    },
    prompt: {
      color: PALETTE.textMuted,
      fontSize: "14px",
      flexShrink: 0,
    },
    textInput: {
      flex: 1,
      backgroundColor: "transparent",
      border: "none",
      borderBottom: `1px solid ${PALETTE.border}`,
      padding: "8px 2px",
      color: PALETTE.textPrimary,
      fontSize: "14px",
      fontFamily: "inherit",
      outline: "none",
    },
    dateInput: {
      backgroundColor: PALETTE.panelAlt,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "6px",
      padding: "7px 8px",
      color: PALETTE.textSecondary,
      fontSize: "12px",
      fontFamily: "inherit",
      outline: "none",
      flexShrink: 0,
    },
    controlsRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "10px",
      flexWrap: "wrap",
    },
    segmentGroup: {
      display: "flex",
      gap: "6px",
    },
    addButton: {
      background: `linear-gradient(90deg, ${PALETTE.high} 0%, ${PALETTE.medium} 50%, ${PALETTE.high} 100%)`,
      color: PALETTE.bg,
      border: "none",
      borderRadius: "6px",
      padding: "9px 18px",
      fontSize: "13px",
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "'Space Grotesk', sans-serif",
      letterSpacing: "0.2px",
    },
    toolbarRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "14px",
      flexWrap: "wrap",
    },
    searchInput: {
      flex: "1 1 160px",
      backgroundColor: PALETTE.panel,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "6px",
      padding: "8px 10px",
      color: PALETTE.textPrimary,
      fontSize: "12px",
      fontFamily: "inherit",
      outline: "none",
    },
    sortSelect: {
      backgroundColor: PALETTE.panel,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "6px",
      padding: "8px 10px",
      color: PALETTE.textSecondary,
      fontSize: "12px",
      fontFamily: "inherit",
      outline: "none",
    },
    filterRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "16px",
      flexWrap: "wrap",
      gap: "10px",
    },
    filterGroup: {
      display: "flex",
      gap: "18px",
    },
    filterBtn: (active) => ({
      background: "none",
      border: "none",
      padding: "0 0 6px 0",
      fontSize: "12px",
      fontWeight: 600,
      letterSpacing: "0.3px",
      textTransform: "uppercase",
      color: active ? PALETTE.textPrimary : PALETTE.textMuted,
      cursor: "pointer",
      fontFamily: "inherit",
      borderBottom: "2px solid transparent",
      backgroundImage: active
        ? `linear-gradient(90deg, ${PALETTE.low}, ${PALETTE.medium}, ${PALETTE.high})`
        : "none",
      backgroundSize: "100% 2px",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "bottom",
    }),
    clearBtn: {
      background: "transparent",
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "6px",
      color: PALETTE.textMuted,
      cursor: "pointer",
      fontSize: "11px",
      padding: "6px 10px",
      fontFamily: "inherit",
      letterSpacing: "0.3px",
    },
    sectionLabel: {
      fontSize: "11px",
      letterSpacing: "1.5px",
      color: PALETTE.textMuted,
      textTransform: "uppercase",
      marginBottom: "14px",
      fontWeight: 500,
    },
    railList: {
      position: "relative",
      paddingLeft: "30px",
    },
    railLine: {
      position: "absolute",
      left: "9px",
      top: "20px",
      bottom: "20px",
      width: "2px",
      background: `linear-gradient(180deg, ${PALETTE.low}, ${PALETTE.medium}, ${PALETTE.high})`,
      opacity: 0.35,
    },
    taskRow: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      backgroundColor: PALETTE.panel,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "8px",
      padding: "13px 14px",
      marginBottom: "8px",
    },
    node: (color, soft, filled) => ({
      position: "absolute",
      left: "-21px",
      top: "50%",
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      border: `2px solid ${color}`,
      background: filled ? `linear-gradient(135deg, ${soft}, ${color})` : PALETTE.bg,
      boxShadow: filled ? `0 0 8px ${color}55` : "none",
      transform: "translate(-50%, -50%)",
    }),
    taskText: {
      flex: 1,
      fontSize: "14px",
      wordBreak: "break-word",
      cursor: "text",
    },
    editInput: {
      flex: 1,
      backgroundColor: PALETTE.panelAlt,
      border: `1px solid ${PALETTE.borderLight}`,
      borderRadius: "5px",
      padding: "5px 8px",
      color: PALETTE.textPrimary,
      fontSize: "14px",
      fontFamily: "inherit",
      outline: "none",
    },
    dueBadge: (overdue) => ({
      fontSize: "11px",
      color: overdue ? PALETTE.overdue : PALETTE.textMuted,
      fontWeight: overdue ? 600 : 400,
      flexShrink: 0,
      whiteSpace: "nowrap",
    }),
    priorityBadge: (bg, fg, soft) => ({
      fontSize: "10px",
      fontWeight: 600,
      padding: "4px 9px",
      borderRadius: "999px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      flexShrink: 0,
      color: fg,
      background: bg,
      border: `1px solid ${soft}33`,
    }),
    deleteButton: {
      background: "transparent",
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "6px",
      color: PALETTE.textMuted,
      cursor: "pointer",
      fontSize: "13px",
      lineHeight: 1,
      padding: "6px 9px",
      flexShrink: 0,
      fontFamily: "inherit",
    },
    emptyState: {
      textAlign: "center",
      color: PALETTE.textMuted,
      fontSize: "13px",
      padding: "40px 0",
    },
    toastStack: {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      zIndex: 50,
    },
    toast: {
      backgroundColor: PALETTE.panelAlt,
      border: `1px solid ${PALETTE.borderLight}`,
      borderRadius: "8px",
      padding: "10px 14px",
      fontSize: "12px",
      color: PALETTE.textPrimary,
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    },
  };

  return (
    <div style={styles.page} className="mlog-page-bg">
      <style>{SCOPED_CSS}</style>
      <div style={styles.container}>
        <div style={styles.eyebrow}>developer workspace</div>
        <h1 style={styles.title}>Milestone Log</h1>

        <div style={styles.progressRow}>
          <div style={styles.progressTrack}>
            <div className="mlog-bar-fill" style={styles.progressFill} />
          </div>
          <span style={styles.progressLabel}>
            {shippedCount}/{totalCount} shipped &middot; {pct}%
          </span>
        </div>

        <div style={styles.statsPanel}>
          {priorityStats.map((s) => {
            const { fg } = priorityColor(s.priority);
            const donePct = s.total === 0 ? 0 : (s.done / s.total) * 100;
            const widthPct = (s.total / maxStat) * 100;
            return (
              <div key={s.priority} style={styles.statItem}>
                <div style={styles.statTop}>
                  <span>{s.priority}</span>
                  <span>
                    {s.done}/{s.total}
                  </span>
                </div>
                <div style={{ ...styles.statBarTrack, width: `${Math.max(widthPct, 30)}%` }}>
                  <div
                    className="mlog-bar-fill"
                    style={{
                      height: "100%",
                      width: `${donePct}%`,
                      background: `linear-gradient(90deg, ${fg}99, ${fg})`,
                      borderRadius: "999px",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="mlog-banner" style={styles.banner}>
            All milestones shipped — clean log. &#127881;
          </div>
        )}

        <div style={styles.panel}>
          <div style={styles.inputRow}>
            <span style={styles.prompt}>$</span>
            <input
              type="text"
              className="mlog-input"
              placeholder="describe the next task..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.textInput}
            />
            <input
              type="date"
              className="mlog-date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              style={styles.dateInput}
              aria-label="Due date"
            />
          </div>
          <div style={styles.controlsRow}>
            <div style={styles.segmentGroup}>
              {PRIORITIES.map((p) => {
                const { fg, bg } = priorityColor(p);
                const active = newTaskPriority === p;
                return (
                  <button
                    key={p}
                    className="mlog-seg-btn"
                    onClick={() => setNewTaskPriority(p)}
                    style={{
                      border: `1px solid ${active ? fg : PALETTE.border}`,
                      backgroundColor: active ? bg : "transparent",
                      color: active ? fg : PALETTE.textSecondary,
                      borderRadius: "6px",
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.4px",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button className="mlog-add-btn" onClick={addTask} style={styles.addButton}>
              Add task
            </button>
          </div>
        </div>

        <div style={styles.toolbarRow}>
          <input
            type="text"
            className="mlog-search"
            placeholder="search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={styles.searchInput}
          />
          <select
            className="mlog-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.sortSelect}
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                Sort: {s}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            {FILTERS.map((f) => (
              <button
                key={f}
                className="mlog-filter-btn"
                onClick={() => setFilter(f)}
                style={styles.filterBtn(filter === f)}
              >
                {f}
                {f === "Active" ? ` (${activeCount})` : ""}
                {f === "Completed" ? ` (${shippedCount})` : ""}
              </button>
            ))}
          </div>
          {shippedCount > 0 && (
            <button className="mlog-clear-btn" onClick={clearCompleted} style={styles.clearBtn}>
              Clear completed
            </button>
          )}
        </div>

        {sortedTasks.length === 0 ? (
          <div style={styles.emptyState}>
            {query.trim()
              ? "No tasks match your search."
              : filter === "All"
              ? "Nothing tracked yet — add your first task above."
              : `No ${filter.toLowerCase()} tasks.`}
          </div>
        ) : (
          <div style={styles.railList}>
            <div style={styles.railLine} />
            {sortedTasks.map((task) => {
              const { fg, soft, bg } = priorityColor(task.priority);
              const overdue = isOverdue(task.dueDate, task.completed);
              const isEditing = editingId === task.id;
              const isExiting = exitingIds.includes(task.id);
              return (
                <div
                  key={task.id}
                  className={`mlog-row ${isExiting ? "mlog-row-exit" : ""}`}
                  style={styles.taskRow}
                >
                  <div
                    className={`mlog-node ${poppedId === task.id ? "mlog-node-pop" : ""}`}
                    role="checkbox"
                    aria-checked={task.completed}
                    aria-label={task.completed ? "Mark task incomplete" : "Mark task complete"}
                    tabIndex={0}
                    onClick={() => toggleComplete(task.id)}
                    onKeyDown={(e) => handleNodeKeyDown(e, task.id)}
                    style={styles.node(fg, soft, task.completed)}
                  />

                  {isEditing ? (
                    <input
                      autoFocus
                      className="mlog-edit-input"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, task.id)}
                      onBlur={() => commitEdit(task.id)}
                      style={styles.editInput}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => startEditing(task)}
                      title="Double-click to edit"
                      style={{
                        ...styles.taskText,
                        textDecoration: task.completed ? "line-through" : "none",
                        color: task.completed ? PALETTE.textMuted : PALETTE.textPrimary,
                      }}
                    >
                      {task.text}
                    </span>
                  )}

                  {task.dueDate && (
                    <span style={styles.dueBadge(overdue)}>
                      {overdue ? "overdue · " : "due "}
                      {formatDue(task.dueDate)}
                    </span>
                  )}

                  <span style={styles.priorityBadge(bg, fg, soft)}>{task.priority}</span>

                  <button
                    className="mlog-delete"
                    onClick={() => deleteTask(task.id)}
                    style={styles.deleteButton}
                    aria-label="Delete task"
                  >
                    &#10005;
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.toastStack}>
        {toasts.map((t) => (
          <div key={t.id} className="mlog-toast" style={styles.toast}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}