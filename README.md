# app-cafe-queue

Frontend antrian cafe (HTML + JS statis, tanpa build). Halaman:

- `kasir.html`: input pesanan, keluar nomor antrian
- `dapur.html`: papan Antri / Sedang dibuat / Siap diambil, tandai menu habis
- `layar.html`: tampilan TV untuk pelanggan

Edit `assets/config.js` (API_URL dan CAFE_NAME), lalu deploy folder ini ke Cloudflare Pages
(build command kosong, output directory `/`).

Tes lokal: `python3 -m http.server 8080` lalu buka http://localhost:8080
