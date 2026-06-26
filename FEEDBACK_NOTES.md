# Feedback Notes — VOR System

> **Sumber:** Bos (setelah demo v1.x)
> **Tanggal:** 11 Juni 2026
> **Status:** Belum dikerjakan — menunggu prioritas

---

## A. Modul Dashboard

### A.1 Tab "Performa Armada" & Tab "Revenue" — Perbaikan Bersama

#### A.1.1 Pagination tabel (10 baris)
- **Sekarang:** Tabel menampilkan semua data → scroll panjang ke bawah
- **Harusnya:** Maksimal 10 baris per halaman, sisanya pindah via tombol ◀ Prev / Next ▶
- **Terapkan di:** Tabel performa armada (Tab Performa) + Tabel revenue detail (Tab Revenue)

#### A.1.2 Filter baru (ganti filter tanggal saat ini)
- **Sekarang:** Filter seadanya (kemungkinan hanya month/year selector)
- **Harusnya:** 1 tombol "Filter" → popup berisi:
  - Pilih **bulan** tertentu (misal: Mei 2026)
  - Pilih **hari** tertentu (misal: 15 Mei 2026)
  - Pilih **range tanggal** (misal: 1 Mei 2026 — 15 Mei 2026)
- **Prinsip:** Fleksibel, tidak memakan ruang, bisa melihat data historis kapan pun
- **Dampak:** Semua grafik, tabel, dan kartu di kedua tab mengikuti filter ini

### A.2 Tab "Performa Armada" — Perbaikan Khusus

#### A.2.1 Kolom Prod% di tabel → ganti jadi Breakdown count
- **Sekarang:** Ada kolom Prod% di tabel detail performa
- **Harusnya:** Ganti dengan kolom **∑BD** (jumlah hari Breakdown per unit)
- **Acuan:** Sama seperti yang terlihat di modul Actual Operation
- **Filter:** Jumlah BD harus berdasarkan filter yang diterapkan (bulan/range)

#### A.2.2 Hapus Prod dari grafik
- **Grafik 1 — Distribusi Status per Customer/Tipe:** Kolom Prod tidak perlu ditampilkan
- **Grafik 2 — Perbandingan KPI per Cabang:** Kolom Prod tidak perlu ditampilkan
- **Alasan bos:** Prod membingungkan di grafik karena baseline-nya bukan total hari

---

## B. Modul Master Data

### B.1 Konsistensi: Add + Edit + Deactivate di SEMUA tab

| Tab | Add | Edit | Deactivate | Status |
|-----|-----|------|------------|--------|
| Vehicle | ✅ | ✅ | ✅ | OK |
| **Status Configuration** | ❌ | ✅ (saja) | ❌ | **HARUS DIPERBAIKI** |
| Branch | ✅ | ✅ | ✅ | OK |
| Driver | ✅ | ✅ | ✅ | OK |
| Vehicle Type | ✅ | ✅ | ✅ | OK |
| Customer | ✅ | ✅ | ✅ | OK (tapi ada isu relasi) |
| User | ✅ | ✅ | ✅ | OK |

**Status Configuration — yang harus ditambah:**
- **Tombol Add (+)**: Untuk nambah status code baru? Atau tidak perlu karena code sudah fixed 22? → **Tanya bos**
- **Tombol Deactivate**: Nonaktifkan status tanpa hapus (isActive = false)
- **Tombol Edit**: Sudah ada ✅

### B.2 Customer — Tambah relasi ke Branch

**Sekarang:**
- Database: Customer tidak punya field branchId
- UI: Tidak ada kolom cabang di tabel Customer

**Harusnya:**
- Database: Tambah `branchId String?` + optional relasi ke Branch
- UI: Tambah kolom "Cabang" di tabel Customer (select/dropdown saat add/edit)
- Alasan: Bos ingin master data pelanggan tercatat per cabang

---

## C. Modul Revenue

### C.1 Filter — Harus mendukung input harian

**Sekarang:** Filter belum fleksibel untuk input harian

**Harusnya:** Filter yang sama dengan Dashboard (point A.1.2):
- Pilih bulan
- Pilih hari tertentu
- Pilih range tanggal
- **Catatan penting:** Cabang sering input revenue per hari — filter HARUS bisa menampilkan data bulan lalu, minggu lalu, atau hari tertentu dengan mudah

**Risiko:** Filter yang terlalu kompleks justru bikin bingung → tetap on point. Cukup 3 opsi: bulan / hari / range.

### C.2 Target Revenue Per Unit — dari Master Data

#### C.2.1 Nilai default — **READ-ONLY dari Master Data**
- **Sekarang:** Target bisa diisi manual, ada warning icon ⚠️ + Sync to Master button
- **Keputusan bos:** Target per unit **READ-ONLY**. Langsung pakai nilai `vehicle.revenueTarget` dari master data. Tidak bisa diedit.
- **Dampak:**
  - Hapus input field targetPerUnit dari tabel Revenue → ganti dengan teks biasa
  - Hapus warning icon ⚠️ (tidak relevan karena tidak bisa diubah)
  - Hapus tombol "Sync to Master" (tidak relevan)
  - Tampilkan nilai target dari `vehicle.revenueTarget` langsung
- **Alasan bos:** Nilai target ditetapkan setahun penuh dari awal tahun, kemungkinan besar tidak berubah

#### C.2.2 Excel Import — Target TIDAK perlu
- **Sekarang:** Template Excel import revenue mengandung kolom "Target Per Unit"
- **Harusnya:** Kolom **Target Per Unit DIHAPUS** dari template Excel dan proses import. Karena nilai target sudah by master data.
- **Kolom yang tetap di Excel:** License Plate, Actual Revenue, BOP

#### C.2.3 Excel Import — WAJIB ada tanggal (bulan & tahun)
- **Sekarang:** Template mungkin tidak menyertakan tanggal eksplisit
- **Harusnya:** Template Excel harus punya kolom **Bulan** dan **Tahun** (atau format tanggal) yang sesuai dengan filter yang diterapkan saat akan import
- **Tujuan:** Validasi — data revenue yang diimport jelas periodenya

---

## D. Modul KPI Engine

### D.1 Formula Prod% — HARUS DIRUBAH

**Rumus saat ini (SALAH):**
```
  Prod% = (Prod / effectiveDays) × 100
```
- effectiveDays = jumlah hari dalam bulan (atau tanggal hari ini untuk bulan berjalan)
- Prod = jumlah hari dengan status UTI, C, MB, atau L

**Rumus yang benar (menurut bos):**
```
  Prod% = (Prod / UA) × 100
```
- UA = jumlah hari dengan status yang masuk UA_SET
- Jika UA = 0 → Prod% = 0.0 (hindari division by zero)

**Alasan bos:**
> "Prod itu harus dibagi dengan UA karena UA lah yang menjadi landasan 100% batas Prod. Jika tidak UA, tidak akan melangkah ke nilai Prod."

**Contoh konkret:**

| Status | Hari |
|--------|------|
| UTI (produktif + tersedia) | 10 |
| RFU (tidak produktif, tersedia) | 5 |
| BD (breakdown) | 3 |
| AM (delay, tersedia) | 5 |
| L (libur, produktif + tersedia) | 2 |
| TAD (DNA - tidak tersedia) | 3 |
| AT (UNR - tidak tersedia) | 2 |
| **Total hari** | **30** |

```
BD  = 3 hari (BD_REDUCERS)
UA  = UTI(10) + AM(5) + L(2) = 17 hari
Prod = UTI(10) + L(2) = 12 hari
```

| Rumus | Hasil | Makna bisnis |
|-------|-------|-------------|
| **Sekarang:** 12/30 | **40.0%** | Dari 30 hari kalender, 40% produktif (menyesatkan — karena hari BD & TAD dihitung sebagai tidak produktif) |
| **Usulan bos:** 12/17 | **70.6%** | Dari 17 hari unit tersedia, 70.6% benar-benar produktif (lebih akurat) |

**Rekomendasi:** ✅ Pakai rumus bos. Ini lebih akurat secara bisnis.

### D.2 Formula UA% — Diubah (sesuai diskusi 24 Juni 2026)

```
UA% = (UA / effectiveDays) × 100
```

**Perubahan:** Denominator dari `(effectiveDays - BD)` → `effectiveDays` (total hari terisi).

**Alasan:** UA dan PA kini merupakan indikator terpisah dengan denominator yang sama (total hari terisi). Status yang dicentang di konfigurasi UA menjadi penambah %; status yang tidak dicentang (termasuk BD) otomatis menjadi pengurang. Sehingga nilai UA% = persentase donut UTILISASI pada Vehicle Status Composition.

### D.3 Rumus Final v2.0

| Metrik | Rumus | Denominator |
|--------|-------|-------------|
| **PA%** | (effectiveDays - BD) / effectiveDays × 100 | Total hari |
| **UA%** | UA / effectiveDays × 100 | Total hari (BARU) |
| **Prod%** | **Prod / UA × 100** ✅ | **Hari UA (BARU)** |

---

## E. Ringkasan Prioritas Eksekusi

| # | Modul | Item | Effort | Dampak | Tipe |
|---|-------|------|--------|--------|------|
| 1 | **KPI** | Rubah rumus Prod% (Prod ÷ UA) | ⚡ 15 menit | 🔴 Tinggi | Fix bisnis |
| 2 | **Dashboard** | Filter popup (bulan/hari/range) | 🟡 2-3 jam | 🔴 Tinggi | Fitur |
| 3 | **Dashboard** | Pagination 10 baris + Prev/Next | 🟢 1 jam | 🟡 Sedang | UI |
| 4 | **Dashboard** | Kolom Prod% → ∑BD | 🟢 30 menit | 🟡 Sedang | UI |
| 5 | **Dashboard** | Hapus Prod dari 2 grafik | 🟢 15 menit | 🟢 Rendah | UI |
| 6 | **Master Data** | Status Config: tambah Add + Deactivate | 🟡 2 jam | 🔴 Tinggi | Fitur |
| 7 | **Master Data** | Customer: tambah relasi branch | 🟡 2-3 jam | 🟡 Sedang | DB + UI |
| 8 | **Revenue** | Filter mendukung input harian | 🟡 2-3 jam | 🔴 Tinggi | Fitur |
| 9 | **Revenue** | Excel import: hapus target, tambah tanggal | 🟢 1 jam | 🟡 Sedang | Fix |
| 10 | **Revenue** | Target from master data (sudah jalan, tanyakan: editable atau tidak?) | 🟢 - | 🟡 Sedang | Konfirmasi |

### Legend Effort:
- ⚡ < 30 menit
- 🟢 < 2 jam
- 🟡 2-4 jam
- 🔴 > 4 jam

---

## F. Keputusan — Hasil Diskusi

| # | Topik | Keputusan | Dampak |
|---|-------|-----------|--------|
| 1 | **Status Config — Tombol Add** | ✅ **Perlu.** Bos bilang ada kemungkinan perubahan status code | Tambah tombol Add (+) di Status Config tab — form input untuk code + desc + group + color + details + isForecast |
| 2 | **Target Revenue — Editable?** | ❌ **READ-ONLY.** Target per unit di tabel Revenue langsung pakai nilai dari `vehicle.revenueTarget`. Tidak bisa diedit. | Hapus kolom input targetPerUnit dari tabel RevenueEvaluation. **Warning icon (⚠️) dan tombol "Sync to Master" tidak relevan lagi** karena nilai sudah fixed dari master data. |
| 3 | **Customer — Branch relasi** | ✅ **Many-to-one.** 1 customer punya 1 cabang. Jika cabang lain butuh customer sama, add lagi dengan branch berbeda — ID otomatis beda. | Database: Customer ditambah field `branchId`. UI: kolom "Cabang" di tabel + dropdown saat add/edit.
