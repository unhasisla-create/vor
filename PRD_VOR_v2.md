# VOR System v2.0 — Product Requirements Document

> **Versi:** 2.0 | **Status:** Final Draft | **Tanggal:** 11 Juni 2026

---

## 1. Ringkasan

**VOR System v1.x** adalah sistem monitoring armada berbasis Next.js 14 + Prisma 5.22 + PostgreSQL. Berjalan untuk 5 cabang dengan ~50 kendaraan. Fungsional sudah lengkap, tapi arsitektur menyisakan utang teknis yang menghambat pengembangan fitur baru dan maintenance.

**VOR System v2.0** bukan sekadar "ganti tema". Ini adalah refaktor total dengan standar arsitektur modern: pemisahan concern yang jelas, API yang terstandarisasi, database migration yang aman, dan design system yang konsisten.

---

## 2. Analisis Sistem Saat Ini

### 2.1 Skor Teknis

| Dimensi | Skor | Alasan |
|---------|------|--------|
| Fungsionalitas | 8/10 | Semua fitur jalan, tapi ada security hole di revenue |
| Arsitektur | 4/10 | Route handler = business logic = data access — campur aduk |
| Maintainability | 3/10 | 1516 baris di 1 file, dual path CRUD, tidak ada testing |
| Keamanan | 5/10 | Revenue tanpa auth, error detail leakage, tanpa middleware |
| UX | 6/10 | Loading teks, empty state polos, tidak konsisten |
| Database | 4/10 | `db push` (bukan migration), RevenueRecord tanpa relasi |
| Performa | 5/10 | Waterfall 8 API calls sequential, tidak ada caching |

### 2.2 Arsitektur v1.x — Masalah Utama

```
Frontend (React)
  └── useEffect → fetch → langsung render
         ↓
Backend (Next.js API Routes)
  └── Route handler → langsung → Prisma.query()
         ↓
Database
```

**Masalah:**
- ❌ Route handler berisi **3 tanggung jawab sekaligus**: validasi, business logic, data access
- ❌ Tidak ada **service layer** → kode tidak bisa di-test
- ❌ Tidak ada **middleware** → auth diulang manual di 28 file
- ❌ Tidak ada **validation library** → if-check berserakan
- ❌ **Waterfall loading** → 8 request sequential, tidak parallel
- ❌ **`db push`** → data bisa hilang, tidak ada versioning
- ❌ **Prisma 5.22** — tidak punya Prisma Studio visual, lebih lambat dari v6

### 2.3 Prisma 5.22 vs 6.x

| Fitur | 5.22 (Sekarang) | 6.x | Dampak |
|-------|----------------|-----|--------|
| Query engine | Binary protocol | **JSON protocol** (default) | Query lebih cepat, bundle lebih kecil |
| Prisma Studio | CLI terpisah | **Built-in** via `prisma studio` | Visual database browser langsung |
| Relation queries | `include` / `select` | `include` optimized + **`omit`** | Select kolom tertentu tanpa hapus manual |
| Migration | Stabil | **Enhanced error messages** | Debug migration lebih mudah |
| Driver adapters | ❌ | ✅ **Driver adapters** | Bisa pakai @planetscale/database, @libsql/client |
| Edge support | Terbatas | ✅ **Edge-ready** | Bisa deploy di edge runtime |

---

## 3. Arsitektur Target v2.0

### 3.1 Keputusan Arsitektur

> **Apakah backend dan frontend perlu dipisah menjadi 2 repo?**

**Jawaban: Tidak untuk sekarang.**

Untuk sistem internal dengan skala 5 cabang dan ~50 kendaraan, **Next.js monolitik dengan arsitektur berlapis (layered architecture)** adalah pilihan yang tepat. Pemisahan total (backend NestJS + frontend React terpisah) akan menambah kompleksitas deployment, CI/CD, dan development tanpa manfaat proporsional.

**Yang harus diperbaiki BUKAN pemisahan repo, melainkan pemisahan concern DALAM 1 repo:**

```
v1.x (sekarang):           v2.0 (target):
                                          
Route → Prisma             Route → Service → Repository → Prisma
  (3 responsibilities)       (1 responsibility each)
```

**Kapan perlu dipisah?** Jika di masa depan:
- Perusahaan punya **mobile app** yang butuh API public
- Beban API mencapai **> 1000 request/detik**
- Tim berkembang menjadi **> 5 engineer** di frontend dan backend terpisah

### 3.2 Struktur Project v2.0

```
vor-system/
├── prisma/
│   ├── schema.prisma
│   └── migrations/              # ✅ BUKAN db push
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── middleware.ts         # ✅ BARU: global auth
│   │   ├── (pages)/             # Halaman frontend
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── actual/page.tsx
│   │   │   ├── forecast/page.tsx
│   │   │   └── ...
│   │   └── api/                 # Route handlers (tipis)
│   │       ├── auth/login/route.ts
│   │       ├── operations/route.ts
│   │       └── ...
│   │
│   ├── server/                  # ✅ BARU: backend layer
│   │   ├── services/            # Business logic
│   │   │   ├── kpi.service.ts
│   │   │   ├── actual.service.ts
│   │   │   ├── forecast.service.ts
│   │   │   └── revenue.service.ts
│   │   ├── repositories/        # Data access (Prisma)
│   │   │   ├── vehicle.repo.ts
│   │   │   ├── actual.repo.ts
│   │   │   └── status-config.repo.ts
│   │   ├── auth/                # Auth logic
│   │   │   ├── session.ts
│   │   │   └── middleware.ts
│   │   └── validators/          # ✅ BARU: Zod schemas
│   │       ├── actual.schema.ts
│   │       ├── vehicle.schema.ts
│   │       └── revenue.schema.ts
│   │
│   ├── components/              # React components
│   │   ├── ui/                  # Design system
│   │   │   ├── Button.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── ...
│   │   └── modules/             # Domain components
│   │       ├── Dashboard/
│   │       ├── ActualOperation/
│   │       └── MasterData/
│   │           ├── VehicleTab.tsx      # ✅ SPLIT
│   │           ├── StatusConfigTab.tsx
│   │           └── ...
│   │
│   └── lib/                     # Shared utilities
│       ├── constants.ts
│       ├── types.ts
│       ├── api-client.ts        # ✅ BARU: React Query hooks
│       └── utils.ts
│
├── tests/                       # ✅ BARU
│   ├── unit/
│   └── e2e/
│
├── prisma/
├── tailwind.config.ts
└── package.json
```

### 3.3 Alur Request v2.0

```
Browser
  │
  ├── middleware.ts ✅
  │     └── Cek session → valid/tidak → lanjut/401
  │
  ├── Route Handler (tipis)
  │     ├── Parse request
  │     ├── Validasi input dengan Zod ✅
  │     ├── Panggil Service
  │     └── Return response standar { ok, data, error }
  │
  ├── Service Layer ✅ BARU
  │     ├── Business logic (KPI calculation, status validation)
  │     ├── Orchestrate multiple repositories
  │     └── Bisa di-unit-test tanpa HTTP
  │
  ├── Repository Layer ✅ BARU
  │     ├── Prisma queries
  │     └── Bisa di-mock untuk test
  │
  └── Database (PostgreSQL + Prisma 6.x)
```

### 3.4 Alur Data v2.0

```
v1.x: useEffect → fetch → setState → render
      (8 sequential calls, manual state management)

v2.0: TanStack Query ✅
      ├── useQuery(['operations'])   → parallel
      ├── useQuery(['branches'])     → parallel
      ├── useQuery(['statuses'])     → parallel
      ├── useQuery(['revenue'])      → parallel
      ├── Skeleton render (loading)
      └── Full render (all data ready)
      
      + Cache 30 detik → pindah halaman tidak refetch
      + Stale-while-revalidate → UI langsung muncul, update di background
```

---

## 4. Design System

### 4.1 Filosofi

> **"Data-first clarity"** — Setiap elemen visual punya tujuan. Hierarki informasi adalah prioritas. Tidak ada dekorasi tanpa makna.

### 4.2 Color Palette

```
Primary:    #0A1628  (lebih gelap dari v1, lebih premium)
Accent:     #2563eb  (blue-600)
Success:    #059669  (emerald-600)
Warning:    #d97706  (amber-600)
Danger:     #dc2626  (red-600)
Neutral:     slate scale

Surface:
  Background:   #f8fafc
  Card:         white
  Sidebar:      #0A1628
  Modal:        white + backdrop blur
```

### 4.3 Komponen UI

| Komponen | v1.x | v2.0 |
|----------|------|------|
| Button | ✅ Ada, variant campur | Standar: solid/outline/ghost, sm/md/lg |
| Input | ❌ Hanya class `inputCls` | Komponen utuh + label + error + helper |
| Select | ❌ Hanya class | Komponen utuh + search option |
| DataTable | ❌ Inline di 7 tempat | **Universal**: sort, filter, page, loading, empty |
| Modal | ✅ Ada | Enhanced + animasi |
| StatusBadge | ❌ Inline | Komponen khusus: color + tooltip |
| Skeleton | ✅ Baru dibuat | Maintain |
| EmptyState | ❌ Teks polos | Ilustrasi + tombol aksi |
| Toast | ✅ Ada | Enhanced + stack |

---

## 5. Roadmap Pengembangan

### 5.1 Phase 0: Foundation (Minggu 1-2)

```
Setup Project
├── Setup Next.js 15 + TypeScript strict
├── Upgrade Prisma 5.22 → 6.x
│   └── prisma migrate dev --name init
├── Setup middleware.ts (global auth)
├── Setup TanStack Query
├── Setup Zod
├── Setup Vitest + Playwright
├── Create folder structure (server/, tests/)
└── Buat 3 komponen design system pertama (Button, Input, DataTable)

Deliverable:
  ✅ Project baru bisa running
  ✅ Auth global sudah jalan
  ✅ Prisma Migration sudah aktif (bukan db push)
  ✅ 3 komponen UI siap pakai
```

### 5.2 Phase 1: Backend Layer (Minggu 3-4)

```
Refactor Backend
├── Buat service layer: KpiService, ActualService, ForecastService, RevenueService
├── Buat repository layer: VehicleRepo, ActualRepo, RevenueRepo
├── Buat Zod validators: actual.schema, vehicle.schema, revenue.schema
├── Refactor route handlers jadi tipis (delegate ke service)
├── Standarisasi response format { ok, data?, error? }
└── Hapus auth per-route (sudah di-handle middleware)

Deliverable:
  ✅ Semua API route pakai service + repository
  ✅ Semua input tervalidasi Zod
  ✅ Auth sudah terpusat di middleware
```

### 5.3 Phase 2: Frontend Layer (Minggu 5-8)

```
Refactor Frontend
├── Ganti semua useEffect + fetch → TanStack Query
├── Ganti semua Loading teks → Skeleton
├── Ganti semua Empty State → EmptyState component
├── Split MasterData.tsx → 7 halaman
├── Dashboard v2 (sparkline, interactive charts)
├── ActualOperation v2 (bulk update, filter by group)
├── ForecastPlanning v2 (multi-day forecast)
├── RevenueEvaluation v2 (monthly trend chart)
└── KPIEngine v2 (data-driven dari StatusConfig)

Deliverable:
  ✅ Semua loading pakai skeleton
  ✅ Semua empty state pakai ilustrasi
  ✅ MasterData terpecah jadi 7 halaman
  ✅ Dashboard lebih informatif
  ✅ KPI bisa dikonfigurasi dari UI (PA/UA/Prod flags)
```

### 5.4 Phase 3: New Features (Minggu 9-12)

```
Fitur Baru
├── Enhanced Status Configuration (PA/UA/Prod flags di UI)
├── Fleet Overview (map/table geografis per cabang)
├── Report Center (generate monthly report)
├── Notification System (in-app alert)
├── Excel Export Enhanced (multi-sheet + formatting)
└── DataTable sort & filter di semua master data

Deliverable:
  ✅ Status config sudah data-driven
  ✅ Report bisa di-generate dari UI
  ✅ User dapat notifikasi anomali
```

### 5.5 Phase 4: Polish & Launch (Minggu 13-14)

```
Finalisasi
├── Performance audit (Lighthouse target > 85)
├── Error boundary di setiap module
├── Unit test coverage > 60%
├── E2E test untuk flow utama
├── Dokumentasi internal
├── User acceptance testing
└── Deployment

Deliverable:
  ✅ Siap production
  ✅ Test coverage adequate
  ✅ Dokumentasi lengkap
```

---

## 6. Perubahan Database

### 6.1 Upgrade Prisma 5.22 → 6.x

```bash
# Di project baru (laptop baru)
npm install prisma@latest @prisma/client@latest
npx prisma init
npx prisma db push  # sementara, untuk sync schema
npx prisma studio   # ✅ Visual database browser
```

### 6.2 Perubahan Schema

```prisma
// StatusConfig — tambah KPI flags
model StatusConfig {
  code       String   @id
  desc       String
  group      String
  color      String
  details    String?
  isForecast Boolean  @default(true)
  sortOrder  Int      @default(0)
  isActive   Boolean  @default(true)
  isPA       Boolean  @default(true)   // ✅ BARU
  isUA       Boolean  @default(false)  // ✅ BARU
  isProd     Boolean  @default(false)  // ✅ BARU
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// RevenueRecord — tambah foreign key
model RevenueRecord {
  id            String   @id @default(uuid())
  month         Int
  year          Int
  branchId      String
  nopol         String
  vehicleId     Int?                  // ✅ BARU: relasi ke Vehicle
  vehicle       Vehicle? @relation(fields: [vehicleId], references: [id])
  typeUnit      String
  targetPerUnit Float    @default(0)
  achRevenue    Float    @default(0)
  bop           Float    @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([month, year, branchId, nopol])
  @@index([branchId, year, month])    // ✅ BARU
}

// Vehicle — tambah tracking
model Vehicle {
  // ... existing fields ...
  lastStatusAt DateTime?   // ✅ BARU
  lastStatusBy String?     // ✅ BARU
  revenueRecords RevenueRecord[]  // ✅ BARU
}

// AuditLog — tambah IP address + index
model AuditLog {
  id        String   @id @default(uuid())
  ts        DateTime @default(now())
  user      String
  action    String
  detail    String
  ipAddress String?  // ✅ BARU

  @@index([ts])      // ✅ BARU
  @@index([user])    // ✅ BARU
}

// Tabel Baru
model Report {
  id        String   @id @default(uuid())
  type      String   // 'monthly_fleet' | 'revenue' | 'kpi'
  branchId  String?
  month     Int
  year      Int
  fileUrl   String?
  status    String   // 'pending' | 'ready' | 'failed'
  createdAt DateTime @default(now())

  @@index([type, month, year])
}
```

---

## 7. Spesifikasi API

### 7.1 Standarisasi Format

```typescript
// ✅ Response sukses
{
  ok: true,
  data: { ... },           // Data utama
  meta?: {                  // Metadata (pagination, dll)
    page: 1,
    total: 50,
    timestamp: "2026-06-11T10:00:00Z"
  }
}

// ✅ Response error
{
  ok: false,
  error: {
    code: "VALIDATION_ERROR",    // Machine-readable
    message: "Nopol wajib diisi", // Human-readable
    details?: [                    // Field-level errors
      { field: "nopol", message: "Nopol tidak boleh kosong" }
    ]
  }
}

// ✅ Semua error dalam Bahasa Indonesia
```

### 7.2 Middleware Global

```typescript
// middleware.ts — SATU FILE untuk semua auth
// v1.x: 28 file × 5 baris auth boilerplate = 140 baris duplikasi
// v2.0: 1 file × 30 baris

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Public endpoints
    const publicRoutes = ['/api/auth/login', '/api/auth/logout', '/api/dev/seed']
    if (publicRoutes.some(r => request.nextUrl.pathname.startsWith(r))) {
      return NextResponse.next()
    }

    // Check session
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json(
        { ok: false, error: { code: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' } },
        { status: 401 }
      )
    }

    // Inject session ke header untuk route handler
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-session', JSON.stringify(session))
    return NextResponse.next({ request: { headers: requestHeaders } })
  }
}

export const config = {
  matcher: '/api/:path*',
}
```

---

## 8. Perbandingan v1.x vs v2.0

| Aspek | v1.x | v2.0 |
|-------|------|------|
| **Framework** | Next.js 14 | Next.js 15+ |
| **ORM** | Prisma 5.22 + `db push` | Prisma 6.x + `migrate` |
| **Auth** | Per-route manual (28×) | Middleware global (1×) |
| **Backend layering** | Route → Prisma langsung | Route → Service → Repository → Prisma |
| **Validation** | if-check manual | Zod schema |
| **Data fetching** | useEffect + fetch | TanStack Query (cache, parallel, retry) |
| **UI State** | Zustand (semua) | Zustand (UI only) + React Query (server) |
| **Design system** | Inline styles + class | Component library (CVA + Tailwind) |
| **Loading** | Teks "Loading..." | Skeleton + shimmer |
| **Empty state** | Teks "No data" | Ilustrasi + CTA |
| **Error handling** | Campur Indo-Inggris | Bahasa Indonesia + Zod |
| **Testing** | 0% | Vitest (unit) + Playwright (E2E) |
| **KPI flags** | Hardcode di utils.ts | Data-driven dari database |
| **Revenue auth** | ❌ Tidak ada | ✅ Via middleware |
| **File terbesar** | MasterData.tsx (1516 baris) | Maks 300 baris per file |

---

## 9. Risiko & Prioritas

### 9.1 Urutan Eksekusi (Prioritas)

```
P0 — HARUS di Phase 0:
  ├── Setup Prisma Migrate (ganti db push)
  ├── Middleware auth global (tutup security hole)
  └── Zod validation (cegah invalid input)

P1 — HARUS di Phase 1:
  ├── Service + Repository layer
  ├── Split MasterData.tsx
  └── Standarisasi response API

P2 — SEBAIKNYA di Phase 2:
  ├── TanStack Query (loading parallel)
  ├── Skeleton + Empty state
  ├── Dashboard redesain
  └── KPI data-driven

P3 — NANTI di Phase 3:
  ├── Fleet Overview Map
  ├── Report Center
  ├── Notification System
  └── Permission management enhanced
```

### 9.2 Risiko

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|-----------|
| Data loss saat migrasi Prisma | Rendah | Tinggi | Backup DB + co-existence 1 bulan |
| User tidak suka UI baru | Sedang | Sedang | UAT 2 minggu + iterative feedback |
| Scope creep | Tinggi | Tinggi | PRD sebagai batasan. Fitur baru → v2.1 |
| Learning curve TanStack Query | Sedang | Rendah | Developer sudah familiar React hooks |
| Testing memakan waktu | Sedang | Rendah | Prioritaskan unit test untuk service layer, E2E untuk flow utama |

---

## 10. Kesimpulan

**v2.0 bukan rewrite dari nol.** Ini adalah **evolusi terstruktur** dari v1.x:

1. **Database**: Prisma 5.22 → 6.x (migration, studio, performance)
2. **Backend**: Campur aduk → layered architecture (service + repository)
3. **Frontend**: useEffect waterfall → TanStack Query parallel + cache
4. **UI**: Teks loading → skeleton, empty state polos → ilustrasi
5. **Security**: Per-route manual → middleware global
6. **KPI**: Hardcode → data-driven dari database

**Tim yang dibutuhkan:**
- 1 Fullstack Senior: 14 minggu (dikerjakan sendiri)
- 2 Developer (1 frontend + 1 backend): 8-10 minggu

**Modal:**
- Laptop baru (Anda sudah rencanakan) ✅
- Database development baru (bisa 1 PostgreSQL dengan 2 database terpisah: `vor_v1` + `vor_v2`)
- Domain/staging server untuk UAT

**Langkah pertama setelah PRD disetujui:**
1. Setup Next.js 15 + Prisma 6.x di laptop baru
2. Jalankan `prisma migrate dev` (bukan `db push`)
3. Buat 1 service + 1 repository sebagai proof of concept
4. Migrasi 1 halaman (Dashboard) ke TanStack Query
5. UAT dengan user — baru lanjut ke halaman berikutnya
