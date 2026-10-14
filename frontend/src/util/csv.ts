// csv.ts — CSV/TSV parsing, generation, and triggering a browser file
// download.
export function download(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

/** Parse a block of text pasted from Excel/Sheets/CSV into a 2D matrix. */
export function parseDelimited(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delim = normalized.indexOf("\t") !== -1 ? "\t" : ",";
  const lines = normalized.split("\n");
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => {
    if (delim === ",") {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
          if (c === '"') {
            if (line[i + 1] === '"') {
              cur += '"';
              i++;
            } else inQ = false;
          } else cur += c;
        } else {
          if (c === '"') inQ = true;
          else if (c === ",") {
            out.push(cur);
            cur = "";
          } else cur += c;
        }
      }
      out.push(cur);
      return out;
    }
    return line.split(delim);
  });
}

export function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (s: unknown) => {
    const str = s === undefined || s === null ? "" : String(s);
    return /[",\n]/.test(str) ? '"' + str.replace(/"/g, '""') + '"' : str;
  };
  const lines = [headers.map(esc).join(",")];
  rows.forEach((r) => lines.push(r.map(esc).join(",")));
  return lines.join("\n");
}
