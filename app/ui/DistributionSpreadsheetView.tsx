"use client";

import { useEffect, useRef, useState } from "react";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────
type Head = { name: string; title: string | null };
type Dept = { id: string; code: string; name: string; heads?: Head[] };
type DistRecipient = {
  id: string;
  qty: number;
  dept_id?: string;
  dept: Dept | null;
};
type DistItem = {
  id: string;
  distributed_date?: string | null;
  document: {
    id: string;
    doc_number: string;
    title: string;
    revision: number;
    type_name?: string;
  } | null;
  recipients: DistRecipient[];
};
type Distribution = {
  id: string;
  form_number: string;
  distributed_date: string;
  notes: string | null;
  created_at: string;
  handed_by_dept: Dept | null;
  created_by_name: string;
  items: DistItem[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}
function getDeptHead(dept: Dept | null): Head | null {
  return dept?.heads?.[0] ?? null;
}
function splitLines(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + (cur ? " " : "") + w).length <= maxChars) {
      cur += (cur ? " " : "") + w;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// ─── Constants ────────────────────────────────────────────────────────────────
// A4 landscape usable height (px) setelah dikurangi header, thead, footer
const A4_BODY_PX = 640;
// Minimum rows yang selalu ditampilkan
const MIN_ROWS = 45;
// Maximum rows sebelum font dikecilkan otomatis
const MAX_ROWS = 35;

// ─── Build iframe HTML ────────────────────────────────────────────────────────
function buildIframeHTML(dist: Distribution): string {
  const handedByHead = getDeptHead(dist.handed_by_dept);
  const handedByName = handedByHead?.name ?? "";
  const handedByDeptCode = dist.handed_by_dept?.code ?? "";

  const NCOLS = 18;
  const dataRows: string[][] = [];

  dist.items.forEach((item, itemIdx) => {
    const effectiveDate = item.distributed_date ?? dist.distributed_date;
    const doc = item.document;
    const recips =
      item.recipients.length > 0
        ? item.recipients
        : [null as unknown as DistRecipient];

    const docTypeName = doc?.type_name ?? "";
    const docTitle = doc?.title ?? "";
    const docNumber = doc?.doc_number ? `(${doc.doc_number})` : "";
    const docRevision = String(doc?.revision ?? "").padStart(2, "0");
    const titleLines = splitLines(docTitle, 34);
    // docLines: baris 0=jenis, 1..n=judul, n+1=nomor
    const docLines = [docTypeName, ...titleLines, docNumber];

    const totalRecipRows = recips.length * 2; // setiap penerima = 2 baris
    const totalRows = Math.max(totalRecipRows, docLines.length);

    for (let ri = 0; ri < totalRows; ri++) {
      const row = Array(NCOLS).fill("");
      const recipIdx = Math.floor(ri / 2);
      const isRecipRow = ri % 2 === 0 && recipIdx < recips.length;
      const isFirst = ri === 0;

      if (isRecipRow) {
        const r = recips[recipIdx];
        const head = r ? getDeptHead(r.dept) : null;
        row[0] = isFirst ? String(itemIdx + 1) : "";
        row[1] = isFirst ? formatDate(effectiveDate) : "";
        row[2] = head?.name ?? "";
        row[3] = r?.dept?.code ?? "";
        row[5] = isFirst ? handedByName : "";
        row[6] = isFirst ? handedByDeptCode : "";
        row[17] = r?.qty != null ? String(r.qty) : "";
      } else if (isFirst) {
        row[0] = String(itemIdx + 1);
        row[1] = formatDate(effectiveDate);
        row[5] = handedByName;
        row[6] = handedByDeptCode;
      }

      row[15] = docLines[ri] ?? "";
      if (ri === 0) row[16] = docRevision;

      dataRows.push(row);
    }

    // 1 baris kosong separator antar item
    dataRows.push(Array(NCOLS).fill(""));
  });

  // Pad / trim ke MIN_ROWS minimal
  while (dataRows.length < MIN_ROWS) dataRows.push(Array(NCOLS).fill(""));

  // Total rows yang akan dirender
  const totalRows = Math.max(dataRows.length, MIN_ROWS);

  // Row height dinamis: bagi rata ruang yang tersedia
  const rowH = Math.max(13, Math.floor(A4_BODY_PX / totalRows));
  // Font size menyesuaikan row height
  const fontSize = rowH >= 18 ? 9 : rowH >= 15 ? 8.5 : 8;

  // col widths: total harus ~990px (A4 landscape usable setelah padding card)
  const colWidths = [
    22, 50, 64, 38, 48, 64, 38, 22, 50, 64, 38, 48, 64, 38, 48, 218, 40, 36,
  ];
  const cols = colWidths.map((w) => `<col style="width:${w}px">`).join("");
  const totalWidth = colWidths.reduce((a, b) => a + b, 0); // ~990

  const th = `border:1px solid #000;font-size:${fontSize}px;font-weight:700;text-align:center;vertical-align:middle;padding:1px 2px;color:#000;background:#fff;white-space:normal;overflow:hidden;line-height:1.2;`;
  const td = `border:1px solid #000;font-size:${fontSize}px;text-align:center;vertical-align:middle;padding:0 2px;height:${rowH}px;color:#000;overflow:hidden;word-break:break-word;white-space:normal;line-height:1.2;`;

  const bodyRows = dataRows
    .map(
      (row) =>
        `<tr>${row
          .map((val) => `<td style="${td}" contenteditable="true">${val}</td>`)
          .join("")}</tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; background:#fff; color:#000; }
  #wrap { display:flex; justify-content:center; padding:0 0 12px; }
  #card { border:1px solid #000; width:${totalWidth + 16}px; padding:5px; }
  #table-wrap { border:1px solid #000; overflow:hidden; }
  #card-header { text-align:center; padding:4px 8px 3px; }
  #card-header .co { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
  #card-header .sub { font-size:9px; font-weight:600; margin-top:1px; }
  #card-header .nom { font-size:9px; margin-top:1px; }
  table { border-collapse:collapse; table-layout:fixed; width:100%; }
  td[contenteditable]:focus { outline:2px solid #4a90d9; background:#f0f6ff !important; }
  #card-footer { text-align:right; padding:2px 2px 0; font-size:8px; font-family:monospace; color:#555; }

  @media print {
    @page { size:A4 landscape; margin:5mm; }
    body { background:#fff !important; }
    #wrap { padding:0 !important; }
    #card {
      border:1px solid #000 !important;
      width:100% !important;
      padding:3px !important;
      height: calc(100vh - 10mm);
      page-break-inside:avoid;
      break-inside:avoid;
      display:flex;
      flex-direction:column;
    }
    #table-wrap {
      border:1px solid #000 !important;
      flex:1;
      overflow:hidden;
    }
    table { height:100%; }
    td, th { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    td[contenteditable]:focus { outline:none !important; background:#fff !important; }
  }
</style>
</head>
<body>
<div id="wrap">
  <div id="card">
    <div id="card-header">
      <div class="co">PT. IDAMAN ERAMANDIRI</div>
      <div class="sub">Bukti Pendistribusian Dokumen / Penarikan Dokumen</div>
      <div class="nom">Nomor : ${dist.form_number}</div>
    </div>
    <div id="table-wrap">
      <table id="tbl">
        <colgroup>${cols}</colgroup>
        <thead>
          <tr>
            <th colspan="7" style="${th}">Bukti Pendistribusian Dokumen</th>
            <th colspan="8" style="${th}">Bukti Penarikan Dokumen</th>
            <th rowspan="3" style="${th}">Nama Dokumen</th>
            <th rowspan="3" style="${th}">Nomor Revisi</th>
            <th rowspan="3" style="${th}">Jumlah</th>
          </tr>
          <tr>
            <th rowspan="2" style="${th}">No</th>
            <th rowspan="2" style="${th}">Tanggal</th>
            <th colspan="3" style="${th}">Diterima Oleh:</th>
            <th colspan="2" style="${th}">Diserahkan Oleh:</th>
            <th rowspan="2" style="${th}">No</th>
            <th rowspan="2" style="${th}">Tanggal</th>
            <th colspan="3" style="${th}">Diterima Oleh:</th>
            <th colspan="3" style="${th}">Diserahkan Oleh:</th>
          </tr>
          <tr>
            <th style="${th}">Nama</th><th style="${th}">Bagian</th><th style="${th}">Tanda<br>Tangan</th>
            <th style="${th}">Nama</th><th style="${th}">Bagian</th>
            <th style="${th}">Nama</th><th style="${th}">Bagian</th><th style="${th}">Tanda<br>Tangan</th>
            <th style="${th}">Nama</th><th style="${th}">Bagian</th><th style="${th}">Tanda<br>Tangan</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
    <div id="card-footer">FL-MRP-002, REV 01</div>
  </div>
</div>
<script>
window.copyTable = function() {
  const el = document.getElementById('card');
  const range = document.createRange();
  range.selectNode(el);
  window.getSelection().removeAllRanges();
  window.getSelection().addRange(range);
  document.execCommand('copy');
  window.getSelection().removeAllRanges();
  alert('Berhasil disalin! Buka Excel lalu tekan Ctrl+V.');
}
window.printForm = function() { window.print(); }
</script>
</body>
</html>`;
}

// ─── Single Form Card ─────────────────────────────────────────────────────────
function SpreadsheetFormCard({ dist }: { dist: Distribution }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = buildIframeHTML(dist);
    const onLoad = () => {
      try {
        const h = iframe.contentDocument?.body?.scrollHeight ?? 600;
        setHeight(h + 16);
      } catch {}
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [dist]);

  const handlePrint = () => {
    (iframeRef.current?.contentWindow as any)?.printForm?.();
  };
  const handleCopy = () => {
    (iframeRef.current?.contentWindow as any)?.copyTable?.();
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-gray-600">
          {dist.form_number}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
          >
            <ClipboardDocumentIcon className="w-3.5 h-3.5" />
            Salin ke Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
          >
            <PrinterIcon className="w-3.5 h-3.5" />
            Cetak
          </button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 shadow-sm overflow-x-auto">
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin allow-modals"
          style={{
            width: "100%",
            minWidth: "1020px",
            height: `${height}px`,
            border: "none",
            display: "block",
          }}
          title={`Form ${dist.form_number}`}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DistributionSpreadsheetView({
  distributions,
  onClose,
}: {
  distributions: Distribution[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const sorted = [...distributions].sort((a, b) => {
    const numA = parseInt(a.form_number.split("/")[0]) || 0;
    const numB = parseInt(b.form_number.split("/")[0]) || 0;
    return numA - numB;
  });

  const filtered = sorted.filter((d) =>
    d.form_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-800">
              Bukti Pendistribusian Dokumen
            </h1>
            <p className="text-xs text-gray-400">
              {filtered.length} form · PT. IDAMAN ERAMANDIRI
            </p>
          </div>
        </div>
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari nomor form..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 outline-none focus:border-blue-400 w-44 transition"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Tidak ada form ditemukan.
          </div>
        ) : (
          filtered.map((dist) => (
            <SpreadsheetFormCard key={dist.id} dist={dist} />
          ))
        )}
      </div>
    </div>
  );
}
