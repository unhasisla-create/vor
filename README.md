# VOR System — Dynamic Oasis v4.3
## Vehicle Operational Report — Fleet Monitoring System

---

## 📁 Struktur Folder Project

```
vor-system/
├── src/
│   ├── app/                    ← Halaman Next.js (routing)
│   │   ├── dashboard/page.tsx
│   │   ├── master/page.tsx
│   │   ├── actual/page.tsx
│   │   ├── forecast/page.tsx
│   │   ├── kpi/page.tsx
│   │   ├── fva/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ShellLayout.tsx     ← Sidebar + Topbar
│   │   ├── ui/index.tsx        ← Komponen reusable (Button, Modal, dll)
│   │   └── modules/            ← Modul utama
│   │       ├── Dashboard.tsx
│   │       ├── MasterData.tsx
│   │       ├── ActualOperation.tsx
│   │       ├── ForecastPlanning.tsx
│   │       ├── KPIEngine.tsx
│   │       ├── ForecastVsActual.tsx
│   │       └── AuditTrail.tsx
│   └── lib/
│       ├── constants.ts        ← Data master status, cabang, dll
│       ├── types.ts            ← TypeScript interfaces
│       ├── utils.ts            ← KPI Engine + seed data
│       └── store.ts            ← Zustand global state
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 🚀 CARA MENJALANKAN (Langkah-per-Langkah)

### Prasyarat
Pastikan sudah terinstall:
- **Node.js** v18 atau lebih baru → cek: `node --version`
- **npm** v9+ → cek: `npm --version`
- **Git** (opsional)

---

### LANGKAH 1 — Masuk ke folder project

Buka **Terminal** (Windows: PowerShell atau CMD), lalu ketik:

```bash
cd vor-system
```

> Jika folder ada di Desktop:
> ```bash
> cd Desktop/vor-system
> ```

---

### LANGKAH 2 — Install semua dependensi

```bash
npm install
```

⏳ Proses ini membutuhkan waktu 1–3 menit tergantung kecepatan internet.

Jika berhasil, akan muncul tulisan seperti:
```
added 312 packages in 45s
```

---

### LANGKAH 3 — Jalankan aplikasi (mode development)

```bash
npm run dev
```

Jika berhasil, terminal akan menampilkan:
```
▲ Next.js 14.2.3
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
✓ Ready in 2.3s
```

---

### LANGKAH 4 — Buka di browser

Buka browser (Chrome/Edge/Firefox), ketik di address bar:

```
http://localhost:3000
```

✅ Aplikasi VOR System siap digunakan!

---

## ⚠️ Troubleshooting Umum

### Error: `node: command not found`
→ Node.js belum terinstall. Download di: https://nodejs.org (pilih LTS)

### Error: `ENOENT: no such file or directory, package.json`
→ Anda belum masuk ke folder yang benar. Cek dengan `ls` (Mac/Linux) atau `dir` (Windows).

### Error: `Port 3000 already in use`
→ Jalankan di port lain:
```bash
npm run dev -- -p 3001
```
Lalu buka: http://localhost:3001

### Error: `Cannot find module 'zustand'` atau module lainnya
→ Install ulang dependensi:
```bash
rm -rf node_modules
npm install
```

### Layar putih / blank saat dibuka
→ Buka DevTools browser (F12) → tab Console → lihat error merah → kirimkan ke developer.

---

## 🏗️ Build untuk Production (Netlify/VPS)

### Build statis:
```bash
npm run build
npm run start
```

### Deploy ke Netlify:
1. Upload folder `vor-system` ke GitHub
2. Buka netlify.com → New Site → Import from GitHub
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Klik Deploy ✓

### NGINX config (VPS):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📋 Modul yang Tersedia

| Modul | Fitur |
|---|---|
| Dashboard | Grafik KPI, distribusi status, tren harian |
| Master Data | CRUD kendaraan, soft-deactivate, konfigurasi status |
| Actual Operation | Matrix grid 31 hari, cell popover, copy yesterday |
| Forecast Planning | Draft esok hari, time window WITA, SYSTEM/MANUAL |
| KPI Engine | PA, UA, Productivity per unit & per cabang |
| Forecast vs Actual | MATCH/CHANGED/MAJOR DEVIATION per sel |
| Audit Trail | Log otomatis semua aktivitas pengguna |

---

## 🔮 Fase Berikutnya (Supabase Integration)

Untuk menghubungkan ke database Supabase:
1. Buat akun di supabase.com
2. Buat file `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Hubungi developer untuk migrasi store ke Supabase.

---

*VOR System — Dynamic Oasis v4.3 | LMKS Fleet Operations*
