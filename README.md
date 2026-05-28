# Frontend Dashboard Monitoring PCP, Revenue BSP, dan Prediksi Produksi

Frontend ini dibuat menggunakan HTML, Bootstrap CSS, JavaScript biasa, Chart.js, dan Vite agar bisa di-deploy ke Vercel.

## Fitur
- Login simulasi role Operator dan Monitor
- Dashboard Aktual / Near Realtime
- Dashboard Prediksi menggunakan Moving Average sederhana
- Form input data untuk Operator
- Validasi BOPD, Water Cut, Efisiensi, dan data angka
- Tabel monitoring dengan filter
- Grafik produksi, revenue, status PCP, aktual vs prediksi
- Export CSV dan cetak/simpan PDF melalui print browser
- Data sementara tersimpan di localStorage browser

## Cara Menjalankan Lokal

1. Install Node.js dari website resmi Node.js.
2. Buka folder project di terminal.
3. Jalankan:

```bash
npm install
npm run dev
```

4. Buka alamat yang muncul, biasanya:

```bash
http://localhost:5173
```

## Cara Upload ke Vercel

1. Buat akun Vercel.
2. Upload project ini ke GitHub, atau drag folder project ke Vercel.
3. Pada setting build Vercel:
   - Framework Preset: Other
   - Build Command: npm run build
   - Output Directory: dist
4. Klik Deploy.

## Catatan Pengembangan Backend

Saat ini data masih tersimpan di localStorage. Ketika backend dibuat, bagian penyimpanan data di file `assets/js/app.js` dapat diganti menjadi API, misalnya:
- GET /api/monitoring
- POST /api/monitoring
- GET /api/predictions
- GET /api/reports

Role Operator dan Monitor pada frontend masih simulasi. Ketika backend dibuat, login perlu diganti menggunakan autentikasi asli.
