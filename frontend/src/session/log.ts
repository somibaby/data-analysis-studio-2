// log.ts — the Minitab-style "Session" log itself: a running, monospace
// text transcript of every analysis run, independent of the floating
// graph windows. entries[] is private; everything else talks to the log
// through logToSession()/clearSession().
interface SessionEntry { title: string; body: string; }
const entries: SessionEntry[] = [];

export function logToSession(title: string, bodyText: string) {
  entries.push({ title, body: bodyText });
  const el = document.getElementById("sessionLog");
  if (!el) return;
  el.textContent = entries.map((e) => `${e.title}\n${e.body}`).join("\n\n");
  el.scrollTop = el.scrollHeight;
}

export function clearSession() {
  entries.length = 0;
  const el = document.getElementById("sessionLog");
  if (el) el.textContent = "";
}
