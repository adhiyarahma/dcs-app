import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

const NAVY = "1E293B";
const BLUE = "2563EB";
const LBLUE = "EFF6FF";
const AMBER = "FFFBEB";
const GRAY = "F8FAFC";
const WHITE = "FFFFFF";

function solid(hex: string): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb: hex } };
}

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

    const wb = new ExcelJS.Workbook();
    wb.creator = "DCS System";
    wb.created = new Date();

    // ── Sheet _Lists (hidden) ─────────────────────────────────────────────
    const wl = wb.addWorksheet("_Lists");
    (wl as any).state = "hidden";

    // DCC Heads di kolom A
    wl.getCell("A1").value = "_dcc_heads";
    dccHeads.forEach((h, i) => {
      wl.getCell(i + 2, 1).value = h;
    });
    const dccRange = `_Lists!$A$2:$A$${1 + dccHeads.length}`;

    // Revisi 00-08 di kolom B
    wl.getCell("B1").value = "_revisi";
    const revisiList = Array.from({ length: 9 }, (_, i) =>
      String(i).padStart(2, "0")
    );
    revisiList.forEach((r, i) => {
      wl.getCell(i + 2, 2).value = r;
    });
    const revRange = `_Lists!$B$2:$B$${1 + revisiList.length}`;

    // Dept options di kolom C
    wl.getCell("C1").value = "_dept";
    deptOptions.forEach((d, i) => {
      wl.getCell(i + 2, 3).value = d;
    });
    const deptRange = `_Lists!$C$2:$C$${1 + deptOptions.length}`;

    // ── Sheet utama ───────────────────────────────────────────────────────
    const ws = wb.addWorksheet("Form Distribusi", {
      pageSetup: { orientation: "landscape" },
    });

    // Row 1: Banner
    ws.mergeCells("A1:I1");
    const banner = ws.getCell("A1");
    banner.value = "TEMPLATE IMPORT DISTRIBUSI DOKUMEN";
    banner.font = {
      name: "Arial",
      bold: true,
      size: 12,
      color: { argb: WHITE },
    };
    banner.fill = solid(NAVY);
    banner.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Row 2: Catatan
    ws.mergeCells("A2:I2");
    const catatan = ws.getCell("A2");
    catatan.value =
      "Isi satu baris per DOKUMEN PER PENERIMA. Satu form bisa punya banyak dokumen & penerima.";
    catatan.font = {
      name: "Arial",
      size: 9,
      italic: true,
      color: { argb: "64748B" },
    };
    catatan.fill = solid(GRAY);
    catatan.alignment = { horizontal: "left", vertical: "middle" };
    ws.getRow(2).height = 18;

    // Row 3: Headers
    const headers = [
      { col: 1, label: "Nomor Form *", width: 22 },
      { col: 2, label: "Tanggal Distribusi *", width: 22 },
      { col: 3, label: "Diserahkan Oleh *", width: 24 },
      { col: 4, label: "Nomor Dokumen *", width: 22 },
      { col: 5, label: "Revisi *", width: 10 },
      { col: 6, label: "Tanggal Dokumen\n(opsional)", width: 22 },
      { col: 7, label: "Kode Dept Penerima *", width: 28 },
      { col: 8, label: "Qty *", width: 8 },
      { col: 9, label: "Catatan (opsional)", width: 30 },
    ];

    ws.getRow(3).height = 38;
    headers.forEach(({ col, label, width }) => {
      const cell = ws.getCell(3, col);
      cell.value = label;
      cell.font = {
        name: "Arial",
        bold: true,
        size: 9,
        color: { argb: WHITE },
      };
      cell.fill = solid(BLUE);
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      ws.getColumn(col).width = width;
    });

    // Row 4: Hints
    const hints = [
      "[no_form]",
      "[tanggal_distribusi]",
      "[diserahkan_oleh]",
      "[nomor_dokumen]",
      "[revisi]",
      "[tanggal_dokumen]",
      "[dept_penerima]",
      "[qty]",
      "[catatan]",
    ];
    ws.getRow(4).height = 14;
    hints.forEach((hint, i) => {
      const cell = ws.getCell(4, i + 1);
      cell.value = hint;
      cell.font = {
        name: "Arial",
        size: 8,
        italic: true,
        color: { argb: "94A3B8" },
      };
      cell.fill = solid(LBLUE);
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Rows 5-29: Data area
    const DATA_START = 5;
    const DATA_END = 29;
    for (let r = DATA_START; r <= DATA_END; r++) {
      ws.getRow(r).height = 18;
      const isEven = (r - DATA_START) % 2 === 0;
      const bg = isEven ? WHITE : GRAY;
      for (let c = 1; c <= 9; c++) {
        const cell = ws.getCell(r, c);
        cell.fill = solid(c === 6 ? AMBER : bg);
        cell.font = { name: "Arial", size: 9 };
        cell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
      }
      ws.getCell(r, 8).value = 1; // default qty
    }

    // Data Validations — pakai sqref sebagai parameter pertama
    const dv = ws as any;
    dv.dataValidations.add(`C${DATA_START}:C${DATA_END}`, {
      type: "list",
      allowBlank: true,
      formulae: [dccRange],
      showErrorMessage: true,
      errorTitle: "Tidak valid",
      error: "Pilih dari daftar nama DCC",
    });
    dv.dataValidations.add(`E${DATA_START}:E${DATA_END}`, {
      type: "list",
      allowBlank: false,
      formulae: [revRange],
      showErrorMessage: true,
      errorTitle: "Tidak valid",
      error: "Pilih revisi 00-08",
    });
    dv.dataValidations.add(`G${DATA_START}:G${DATA_END}`, {
      type: "list",
      allowBlank: true,
      formulae: [deptRange],
      showErrorMessage: true,
      errorTitle: "Tidak valid",
      error: "Pilih dari daftar departemen",
    });

    // Freeze header
    ws.views = [{ state: "frozen", ySplit: 4 }];

    // ── Sheet Petunjuk ────────────────────────────────────────────────────
    const wp = wb.addWorksheet("Petunjuk");
    wp.getColumn(1).width = 30;
    wp.getColumn(2).width = 65;

    wp.mergeCells("A1:B1");
    const pHead = wp.getCell("A1");
    pHead.value = "PETUNJUK PENGISIAN";
    pHead.font = {
      name: "Arial",
      bold: true,
      size: 12,
      color: { argb: WHITE },
    };
    pHead.fill = solid(NAVY);
    pHead.alignment = { horizontal: "center", vertical: "middle" };
    wp.getRow(1).height = 28;

    const petunjuk = [
      ["KOLOM", "KETERANGAN"],
      [
        "Nomor Form *",
        "Nomor form distribusi. Baris dengan nomor form sama akan digabung jadi SATU form. Contoh: 001/DCC/06/26",
      ],
      ["Tanggal Distribusi *", "Format: YYYY-MM-DD. Contoh: 2026-06-01"],
      [
        "Diserahkan Oleh *",
        "Pilih dari dropdown — nama kepala DCC yang menyerahkan dokumen.",
      ],
      ["Nomor Dokumen *", "Nomor dokumen di database. Contoh: DOC-001"],
      [
        "Revisi *",
        "Pilih dari dropdown 00-08. Penting untuk dokumen nomor sama beda revisi.",
      ],
      [
        "Tanggal Dokumen",
        "OPSIONAL. Isi jika tanggal distribusi dokumen ini berbeda dari tanggal form.",
      ],
      [
        "Kode Dept Penerima *",
        "Pilih dari dropdown. Format: KODE - Nama Orang (per personil).",
      ],
      ["Qty *", "Jumlah dokumen yang diterima. Default 1."],
      ["Catatan", "OPSIONAL. Diambil dari baris pertama tiap nomor form."],
      ["", ""],
      ["— ATURAN PENTING —", ""],
      [
        "Satu baris = satu penerima",
        "DOC-001 diterima QC-Fitri dan QC-Deti → 2 baris terpisah dengan nomor form sama.",
      ],
      [
        "Grouping otomatis",
        "Baris dengan nomor form + nomor dokumen + revisi sama → digabung jadi satu item.",
      ],
      [
        "Kolom * wajib diisi",
        "Baris tidak lengkap akan ditolak saat preview import.",
      ],
    ];

    petunjuk.forEach(([a, b], i) => {
      const r = i + 2;
      wp.getRow(r).height = 34;
      const ca = wp.getCell(r, 1);
      const cb = wp.getCell(r, 2);

      if (a === "KOLOM") {
        ca.value = a;
        cb.value = b;
        [ca, cb].forEach((c) => {
          c.font = {
            name: "Arial",
            bold: true,
            size: 9,
            color: { argb: WHITE },
          };
          c.fill = solid(BLUE);
          c.alignment = { horizontal: "center", vertical: "middle" };
        });
      } else if (a === "— ATURAN PENTING —") {
        wp.mergeCells(`A${r}:B${r}`);
        ca.value = a;
        ca.font = { name: "Arial", bold: true, size: 9, color: { argb: NAVY } };
        ca.fill = solid("E2E8F0");
        ca.alignment = { horizontal: "center", vertical: "middle" };
      } else if (a) {
        ca.value = a;
        cb.value = b;
        ca.font = { name: "Arial", bold: true, size: 9, color: { argb: NAVY } };
        cb.font = { name: "Arial", size: 9, color: { argb: "334155" } };
        ca.fill = solid(LBLUE);
        cb.fill = solid(WHITE);
        ca.alignment = { horizontal: "left", vertical: "top", wrapText: true };
        cb.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      }
    });

    // Generate buffer
    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as ArrayBuffer, {
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
    console.error("Template generation error:", (err as any)?.message ?? err);
    return NextResponse.json(
      { error: (err as any)?.message ?? "Gagal generate template" },
      { status: 500 }
    );
  }
}
