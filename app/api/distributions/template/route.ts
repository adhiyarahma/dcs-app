/**
 * POST /api/distributions/template
 *
 * Body JSON:
 * {
 *   dcc_heads: string[],       // nama-nama head dept DCC
 *   dept_options: string[],    // semua "KODE - Nama" per orang (flatten)
 * }
 *
 * Response: file .xlsx sebagai binary stream
 *
 * Cara kerja:
 * - Spawn Python script yang di-bundle sebagai string literal
 * - Script generate file .xlsx dengan DataValidation dropdown
 * - File dikirim langsung sebagai response binary
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

// ── Python script yang di-embed sebagai string ────────────────────────────────
function buildPythonScript(
  dccHeads: string[],
  deptOptions: string[],
  outPath: string
): string {
  const dccJson = JSON.stringify(dccHeads);
  const deptJson = JSON.stringify(deptOptions);

  return `
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

dcc_heads   = ${dccJson}
dept_options = ${deptJson}
out_path    = ${JSON.stringify(outPath)}

NAVY  = "1E293B"
BLUE  = "2563EB"
LBLUE = "EFF6FF"
AMBER = "FFFBEB"
GRAY  = "F8FAFC"
WHITE = "FFFFFF"

def solid(h): return PatternFill("solid", fgColor=h)
def center(w=True): return Alignment(horizontal="center", vertical="center", wrap_text=w)
def left(): return Alignment(horizontal="left", vertical="center", wrap_text=True)
def vtop(): return Alignment(horizontal="left", vertical="top", wrap_text=True)

wb = Workbook()

# ── Sheet tersembunyi _Lists ──────────────────────────────────────────────────
wl = wb.create_sheet("_Lists")
wl.sheet_state = "hidden"

wl["A1"] = "_dcc_heads"
for i, h in enumerate(dcc_heads, 2):
    wl[f"A{i}"] = h
dcc_range = "_Lists!$A$2:$A$" + str(1+len(dcc_heads))

wl["B1"] = "_revisi"
revisi_list = [f"{n:02d}" for n in range(9)]  # 00-08
for i, r in enumerate(revisi_list, 2):
    wl[f"B{i}"] = r
rev_range = "_Lists!$B$2:$B$" + str(1+len(revisi_list))

wl["C1"] = "_dept"
for i, d in enumerate(dept_options, 2):
    wl[f"C{i}"] = d
dept_range = "_Lists!$C$2:$C$" + str(1+len(dept_options))

# ── Sheet utama ───────────────────────────────────────────────────────────────
ws = wb.active
ws.title = "Form Distribusi"

# Row 1: Banner
ws.merge_cells("A1:I1")
ws["A1"] = "TEMPLATE IMPORT DISTRIBUSI DOKUMEN"
ws["A1"].font = Font(name="Arial", bold=True, size=12, color=WHITE)
ws["A1"].fill = solid(NAVY)
ws["A1"].alignment = center()
ws.row_dimensions[1].height = 30

# Row 2: Catatan
ws.merge_cells("A2:I2")
ws["A2"] = "Isi satu baris per DOKUMEN PER PENERIMA. Satu form bisa punya banyak dokumen & penerima."
ws["A2"].font = Font(name="Arial", size=9, italic=True, color="64748B")
ws["A2"].fill = solid(GRAY)
ws["A2"].alignment = left()
ws.row_dimensions[2].height = 18

# Row 3: Headers
headers = [
    ("A", "Nomor Form *",                   20),
    ("B", "Tanggal Distribusi *",            22),
    ("C", "Diserahkan Oleh *",               22),
    ("D", "Nomor Dokumen *",                 22),
    ("E", "Revisi *",                         9),
    ("F", "Tanggal Dokumen\\n(opsional)",    24),
    ("G", "Kode Dept Penerima *",            26),
    ("H", "Qty *",                            8),
    ("I", "Catatan (opsional)",              30),
]
ws.row_dimensions[3].height = 38
for col, label, width in headers:
    c = ws[f"{col}3"]
    c.value = label.replace("\\\\n", "\\n")
    c.font = Font(name="Arial", bold=True, size=9, color=WHITE)
    c.fill = solid(BLUE)
    c.alignment = center()
    ws.column_dimensions[col].width = width

# Row 4: Field hints
hints = [("A","[no_form]"),("B","[tanggal_distribusi]"),("C","[diserahkan_oleh]"),
         ("D","[nomor_dokumen]"),("E","[revisi]"),("F","[tanggal_dokumen]"),
         ("G","[dept_penerima]"),("H","[qty]"),("I","[catatan]")]
ws.row_dimensions[4].height = 14
for col, val in hints:
    c = ws[f"{col}4"]
    c.value = val
    c.font = Font(name="Arial", size=8, italic=True, color="94A3B8")
    c.fill = solid(LBLUE)
    c.alignment = center()

# Rows 5-29: Data area
DATA_START, DATA_END = 5, 29
for i in range(DATA_END - DATA_START + 1):
    r = DATA_START + i
    ws.row_dimensions[r].height = 18
    bg = solid(WHITE) if i % 2 == 0 else solid(GRAY)
    for ci in range(9):
        cl = get_column_letter(ci + 1)
        cell = ws[f"{cl}{r}"]
        cell.fill = solid(AMBER) if cl == "F" else bg
        cell.font = Font(name="Arial", size=9)
        cell.alignment = left()
    ws[f"H{r}"] = 1  # default qty

# Data Validations
dv_c = DataValidation(type="list", formula1=dcc_range, allow_blank=True,
    showErrorMessage=True, errorTitle="Tidak valid",
    error="Pilih dari daftar nama DCC", showDropDown=False)
dv_c.sqref = f"C{DATA_START}:C{DATA_END}"
ws.add_data_validation(dv_c)

dv_e = DataValidation(type="list", formula1=rev_range, allow_blank=False,
    showErrorMessage=True, errorTitle="Tidak valid",
    error="Pilih revisi 00-08", showDropDown=False)
dv_e.sqref = f"E{DATA_START}:E{DATA_END}"
ws.add_data_validation(dv_e)

dv_g = DataValidation(type="list", formula1=dept_range, allow_blank=True,
    showErrorMessage=True, errorTitle="Tidak valid",
    error="Pilih dari daftar departemen", showDropDown=False)
dv_g.sqref = f"G{DATA_START}:G{DATA_END}"
ws.add_data_validation(dv_g)

ws.freeze_panes = "A5"

# ── Sheet Petunjuk ────────────────────────────────────────────────────────────
wp = wb.create_sheet("Petunjuk")
wp.column_dimensions["A"].width = 30
wp.column_dimensions["B"].width = 65

wp.merge_cells("A1:B1")
wp["A1"] = "PETUNJUK PENGISIAN"
wp["A1"].font = Font(name="Arial", bold=True, size=12, color=WHITE)
wp["A1"].fill = solid(NAVY)
wp["A1"].alignment = center()
wp.row_dimensions[1].height = 28

petunjuk = [
    ("KOLOM", "KETERANGAN"),
    ("Nomor Form *", "Nomor form distribusi. Baris dengan nomor form sama akan digabung jadi SATU form. Contoh: 001/DCC/06/26"),
    ("Tanggal Distribusi *", "Format: YYYY-MM-DD. Contoh: 2026-06-01"),
    ("Diserahkan Oleh *", "Pilih dari dropdown — nama kepala DCC yang menyerahkan dokumen."),
    ("Nomor Dokumen *", "Nomor dokumen di database. Contoh: DOC-001"),
    ("Revisi *", "Pilih dari dropdown 00-08. Penting untuk dokumen nomor sama beda revisi."),
    ("Tanggal Dokumen", "OPSIONAL. Isi jika tanggal distribusi dokumen ini berbeda dari tanggal form."),
    ("Kode Dept Penerima *", "Pilih dari dropdown. Format: KODE - Nama Orang (per personil)."),
    ("Qty *", "Jumlah dokumen yang diterima. Default 1."),
    ("Catatan", "OPSIONAL. Diambil dari baris pertama tiap nomor form."),
    ("", ""),
    ("— ATURAN PENTING —", ""),
    ("Satu baris = satu penerima", "DOC-001 diterima QC-Fitri dan QC-Deti → 2 baris terpisah dengan nomor form sama."),
    ("Grouping otomatis", "Baris dengan nomor form + nomor dokumen + revisi sama → digabung jadi satu item."),
    ("Kolom * wajib diisi", "Baris tidak lengkap akan ditolak saat preview import."),
]
for i, (a, b) in enumerate(petunjuk):
    r = i + 2
    wp.row_dimensions[r].height = 34
    ca, cb = wp[f"A{r}"], wp[f"B{r}"]
    if a == "KOLOM":
        ca.value, cb.value = a, b
        for c in [ca, cb]:
            c.font = Font(name="Arial", bold=True, size=9, color=WHITE)
            c.fill = solid(BLUE)
            c.alignment = center()
    elif a == "— ATURAN PENTING —":
        wp.merge_cells(f"A{r}:B{r}")
        ca.value = a
        ca.font = Font(name="Arial", bold=True, size=9, color=NAVY)
        ca.fill = solid("E2E8F0")
        ca.alignment = center()
    elif a:
        ca.value, cb.value = a, b
        ca.font = Font(name="Arial", bold=True, size=9, color=NAVY)
        cb.font = Font(name="Arial", size=9, color="334155")
        ca.fill = solid(LBLUE)
        cb.fill = solid(WHITE)
        ca.alignment = vtop()
        cb.alignment = vtop()

wb.save(out_path)
print("ok")
`;
}

// ── API Route Handler ─────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dccHeads: string[] = body.dcc_heads ?? [];
    const deptOptions: string[] = body.dept_options ?? [];

    if (dccHeads.length === 0) {
      return NextResponse.json(
        { error: "dcc_heads tidak boleh kosong" },
        { status: 400 }
      );
    }

    // Buat file temp
    const id = randomUUID();
    const outPath = join(tmpdir(), `template_distribusi_${id}.xlsx`);
    const pyPath = join(tmpdir(), `gen_template_${id}.py`);

    // Tulis script Python ke temp file
    const script = buildPythonScript(dccHeads, deptOptions, outPath);
    await writeFile(pyPath, script, "utf8");

    // Jalankan Python
    await execAsync(`python3 ${pyPath}`);

    // Baca file hasil
    const fileBuffer = await readFile(outPath);

    // Cleanup temp files (non-blocking)
    unlink(pyPath).catch(() => {});
    unlink(outPath).catch(() => {});

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="template_distribusi.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Template generation error:", err);
    return NextResponse.json(
      { error: "Gagal generate template" },
      { status: 500 }
    );
  }
}
