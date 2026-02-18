// lib/exportUtils.ts
// Matches your ExportButton.tsx signatures:
// exportToPDF(elementId, filename)
// exportToExcel(rows, filename)
// exportToCSV(rows, filename)

type AnyRow = Record<string, any>;

function safeFilePart(s: string) {
  return (s || "export")
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildColumns(rows: AnyRow[]) {
  const colSet = new Set<string>();
  for (const r of rows) {
    if (!r) continue;
    for (const k of Object.keys(r)) colSet.add(k);
  }
  return Array.from(colSet);
}

function copyStylesIntoIframe(iframeDoc: Document) {
  const head = iframeDoc.head;
  const parentDoc = document;

  // Copy <link rel="stylesheet">
  const links = Array.from(parentDoc.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of links) {
    head.appendChild(link.cloneNode(true));
  }

  // Copy <style> tags (Next.js injects a lot of CSS this way)
  const styles = Array.from(parentDoc.querySelectorAll("style"));
  for (const style of styles) {
    head.appendChild(style.cloneNode(true));
  }
}

async function wait(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForImages(doc: Document, timeoutMs = 1500) {
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) return;

  await Promise.race([
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    ),
    wait(timeoutMs),
  ]);
}

/**
 * ✅ PDF Export (print -> Save as PDF)
 * Fixes invisible text caused by gradient text (WebkitTextFillColor: transparent).
 */
export async function exportToPDF(elementId: string, filename: string) {
  if (typeof window === "undefined") return;

  const el = document.getElementById(elementId);
  if (!el) {
    throw new Error(
      `exportToPDF: element not found (id="${elementId}"). Add id="${elementId}" on the wrapper you want to export.`
    );
  }

  const title = safeFilePart(filename || "dashboard");
  const cloned = el.cloneNode(true) as HTMLElement;

  // Hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;

  if (!doc || !win) {
    iframe.remove();
    throw new Error("exportToPDF: could not access iframe document/window");
  }

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
      </head>
      <body>
        <div style="font: 12px Arial, sans-serif; color: #333; margin: 0 0 12px 0;">
          <div style="font-weight:700; color:#111;">${title}</div>
          <div>Generated: ${new Date().toLocaleString()}</div>
          <div style="margin-top:6px;">Tip: Print → “Save as PDF”.</div>
        </div>
        <div id="__print_root__"></div>
      </body>
    </html>
  `);
  doc.close();

  // Copy your app CSS (Next.js styles)
  copyStylesIntoIframe(doc);

  // 🔥 PRINT FIXES (this fixes your "white / invisible font" issue)
  const fix = doc.createElement("style");
  fix.textContent = `
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

    html, body { background: #ffffff !important; }
    body { margin: 12mm !important; }

    /* Force readable text everywhere */
    #__print_root__ { background: #ffffff !important; }
    #__print_root__, #__print_root__ * {
      color: #111 !important;
      opacity: 1 !important;
      visibility: visible !important;
      text-shadow: none !important;
    }

    /* ✅ CRITICAL: Fix gradient-text becoming transparent in print */
    #__print_root__ * {
      -webkit-text-fill-color: currentColor !important;
      -webkit-background-clip: border-box !important;
      background-clip: border-box !important;
    }

    /* Some elements may still have gradient backgrounds intended only for text */
    #__print_root__ h1,
    #__print_root__ h2,
    #__print_root__ h3,
    #__print_root__ h4,
    #__print_root__ h5,
    #__print_root__ h6 {
      background: none !important;
      -webkit-text-fill-color: #111 !important;
    }

    /* Avoid cutting cards across pages */
    #__print_root__ > * { break-inside: avoid; page-break-inside: avoid; }

    /* Charts */
    svg, .recharts-wrapper { overflow: visible !important; }

    /* Optional: make buttons/inputs look clean in PDF */
    button, input, select, textarea {
      box-shadow: none !important;
    }
  `;
  doc.head.appendChild(fix);

  const mount = doc.getElementById("__print_root__");
  if (!mount) {
    iframe.remove();
    throw new Error("exportToPDF: print mount not found");
  }
  mount.appendChild(cloned);

  // Let charts/layout settle
  await wait(500);
  await waitForImages(doc, 1500);
  await wait(250);

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {}
  };

  win.onafterprint = cleanup;
  win.focus();
  win.print();
  setTimeout(cleanup, 2500);
}

export function exportToCSV(rows: AnyRow[], filename: string) {
  if (typeof window === "undefined") return;

  const cleanRows = (rows || []).filter(Boolean);
  if (cleanRows.length === 0) throw new Error("exportToCSV: No rows to export.");

  const cols = buildColumns(cleanRows);
  const header = cols.map(csvEscape).join(",");
  const lines = cleanRows.map((r) => cols.map((c) => csvEscape(r?.[c])).join(","));
  const csv = [header, ...lines].join("\n");

  const name = `${safeFilePart(filename || "data")}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(name, blob);
}

export async function exportToExcel(rows: AnyRow[], filename: string) {
  if (typeof window === "undefined") return;

  const cleanRows = (rows || []).filter(Boolean);
  if (cleanRows.length === 0) throw new Error("exportToExcel: No rows to export.");

  const cols = buildColumns(cleanRows);

  const esc = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const table = `
    <table border="1">
      <thead>
        <tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${cleanRows
          .map((r) => `<tr>${cols.map((c) => `<td>${esc(r?.[c])}</td>`).join("")}</tr>`)
          .join("")}
      </tbody>
    </table>
  `;

  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body>${table}</body>
    </html>
  `.trim();

  const name = `${safeFilePart(filename || "data")}.xls`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  downloadBlob(name, blob);
}
