// ============================================================
// app/api/documents/all/route.ts
// ============================================================
// PERBAIKAN: sebelumnya route ini memanggil getAllDocumentsForImport(),
// yang sengaja membatasi hasil hanya status "terbaru" & "kadaluarsa"
// (dan tidak menyertakan field `status` sama sekali). Itu cocok untuk
// use-case aslinya (import dokumen biasa), TAPI menjadi masalah untuk
// ImportDistributionModal yang memanggil endpoint /api/documents/all ini
// untuk mencocokkan dokumen distribusi LAMA — termasuk yang sudah
// berstatus "dihapus".
//
// Sekarang route ini memanggil getAllDocumentsForDistribution() —
// fungsi terpisah yang TIDAK memfilter status sama sekali, dan
// menyertakan field `status` di setiap dokumen (dipakai frontend untuk
// menampilkan badge "Kadaluarsa"/"Dihapus" di preview import).
//
// getAllDocumentsForImport() TIDAK diubah/dihapus — kalau ada bagian lain
// aplikasi yang masih memakainya dengan asumsi hanya dokumen aktif,
// perilakunya tetap sama seperti sebelumnya.
import { NextResponse } from "next/server";
import { getAllDocumentsForDistribution } from "@/app/lib/data";

export async function GET() {
  try {
    const docs = await getAllDocumentsForDistribution();
    return NextResponse.json(docs);
  } catch (err) {
    console.error("Gagal mengambil semua dokumen (/api/documents/all):", err);
    return NextResponse.json(
      { error: "Gagal mengambil data dokumen." },
      { status: 500 }
    );
  }
}
