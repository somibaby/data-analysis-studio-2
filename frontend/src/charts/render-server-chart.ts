// render-server-chart.ts — shared by every chart renderer in
// image-charts.ts: posts to a /api/plot/* endpoint, gets a PNG back, and
// drops it into the container as an <img>, replacing whatever was there.
// Revokes the object URL once the browser has decoded/painted it (safe
// at that point -- the decoded bitmap is already retained by the <img>).
export async function renderServerChart(container: HTMLElement, endpoint: string, body: object): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`chart render failed: ${res.status} ${text}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const img = document.createElement("img");
  img.src = url;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "contain";
  img.style.display = "block";
  img.onload = () => URL.revokeObjectURL(url);
  container.innerHTML = "";
  container.appendChild(img);
}
