# **Panduan Implementasi Fitur - Sistem Angkutan CNG** 
Dokumen ini adalah panduan teknis untuk developer yang bertugas mengimplementasikan fitur baru ke dalam proyek angkutan-system. 
## **Bagian 1: Cara Menjalankan Proyek (Lokal & Mobile)** 
Berikut adalah langkah-langkah untuk menjalankan keseluruhan sistem (Backend, Web Admin, Mobile App) di lingkungan development. 
1. ### **Prasyarat** 
- **Node.js**: Pastikan versi 18 atau lebih baru terinstal. 
- **Database**: Pastikan Anda memiliki PostgreSQL yang berjalan (bisa via Docker atau instalasi lokal). namakan server postgre sama seperti di .env 
- **Ngrok**: [Download dan install Ngrok](https://ngrok.com/download). Ini penting untuk menghubungkan backend lokal ke aplikasi mobile. 
2. ### **Menjalankan Backend** 
Buka terminal dan ikuti langkah-langkah ini dari direktori root proyek: 

- 1. Masuk ke direktori backend cd backend 
- 2. Install semua package yang dibutuhkan npm install 
- 3. Hapus database lama dan buat yang baru (fresh start) npm run migrate:fresh 
- 4. (Opsional) Hash password default jika ada di seeder npm run hash-passwords 
- 5. Jalankan server backend pada port 3000 npm run dev 

  Server Anda sekarang berjalan di http://localhost:3000. 
3. ### **Menghubungkan ke Dunia Luar dengan Ngrok** 
Agar aplikasi web dan mobile bisa mengakses backend lokal Anda, gunakan Ngrok. 

- Buka terminal BARU, jangan tutup terminal backend 
- Jalankan ngrok untuk port 3000 

ngrok http 3000 

Ngrok akan memberikan Anda URL publik seperti https://random-string.ngrok-free.app. **Salin URL HTTPS ini.** 
4. ### **Menjalankan Web Admin** 
1. **Buka file .env** di dalam direktori angkutan-admin-web. Jika belum ada, salin dari .env.example. 
1. **Ubah variabel REACT\_APP\_API\_URL** dengan URL Ngrok yang sudah Anda salin. // File: angkutan-admin-web/.env REACT\_APP\_API\_URL=https://random-string.ngrok-free.app  
1. Jalankan web admin di terminal **BARU**:
- Masuk ke direktori web admin 

cd angkutan-admin-web 

- Install dependencies npm install 
- Jalankan aplikasi React npm start 

  Aplikasi web sekarang dapat diakses di http://localhost:3001 (atau port lain yang tersedia) dan sudah terhubung ke backend Anda. 
### **5. Menjalankan Mobile App** 
1. **Buka file mobile/src/services/api.js**. 
1. **Ubah baseURL** dengan URL Ngrok Anda. // File: mobile/src/services/api.js 

   import axios from 'axios'; 

   const api = axios.create({ 

   `  `// // GANTI URL DI BAWAH INI DENGAN URL NGROK ANDA   baseURL: 'https://random-string.ngrok-free.app/api/v1',  

   }); 

   export default api; 

3. Jalankan aplikasi mobile di terminal **BARU**:
- Masuk ke direktori mobile 

cd mobile 

- Install dependencies npm install 
- Jalankan Expo dengan mode tunnel (untuk akses dari mana saja) npx expo start --tunnel -c 
4. Setelah proses selesai, akan muncul QR code. **Scan QR code** tersebut menggunakan aplikasi **Expo Go** yang sudah terinstal di HP Anda. 
## **Bagian 2: Rundown Tugas Implementasi Fitur (Prioritas Utama)** 
Fokus pada dua fitur paling krusial: **Live Maps & Modifikasi DO** dan **Sistem Deposit SPBG**. 
### **Prioritas 1: Live Maps & Modifikasi Delivery Order (DO)** 
**Tujuan:** Melacak lokasi driver secara *real-time* di peta dan memungkinkan admin untuk menambah tujuan baru saat DO sedang berjalan. 
#### **Diagram Alur Fitur** 
sequenceDiagram 

`    `participant Driver as Driver (Mobile App)     participant Admin as Admin (Web App)     participant Backend as Backend Server     participant DB as Database 

`    `loop Setiap 1 Menit 

`        `Driver->>Backend: POST /api/v1/do/:id/location (lat, lon) 

`        `Backend->>DB: INSERT INTO delivery\_order\_locations (lat, lon)     end 

`    `Admin->>Backend: GET /api/v1/web/do/:id/locations 

`    `Backend->>DB: SELECT \* FROM delivery\_order\_locations WHERE do\_id=:id     DB-->>Backend: [lokasi1, lokasi2, ...] 

`    `Backend-->>Admin: Kirim data lokasi     Admin->>Admin: Render rute di peta 

`    `Admin->>Backend: POST /api/v1/web/do/:id/destinations (alamat\_baru) 

`    `Backend->>DB: INSERT INTO delivery\_order\_destinations (do\_id, address, sequence) 

`    `DB-->>Backend: Sukses 

`    `Backend-->>Admin: Tujuan berhasil ditambahkan 

**Langkah 1: Backend - Modifikasi Database untuk Multi-Tujuan & Pelacakan** Struktur DO yang ada perlu diubah untuk mendukung fitur ini. 

1. **Buat file migrasi baru** (002-add-tracking-tables.sql) di backend/src/migrations/. 
1. **Isi file migrasi** dengan SQL berikut:

   -- File: backend/src/migrations/002-add-tracking-tables.sql 

   -- // Tabel ini untuk menyimpan histori lokasi dari driver 

   CREATE TABLE delivery\_order\_locations ( 

   `    `id SERIAL PRIMARY KEY, 

   `    `delivery\_order\_id INTEGER NOT NULL REFERENCES delivery\_orders(id),     latitude NUMERIC(10, 7) NOT NULL, 

   `    `longitude NUMERIC(10, 7) NOT NULL, 

   `    `created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 

   ); 

   -- // Tabel ini untuk menyimpan daftar tujuan (bisa lebih dari satu) 

   CREATE TABLE delivery\_order\_destinations ( 

   `    `id SERIAL PRIMARY KEY, 

   `    `delivery\_order\_id INTEGER NOT NULL REFERENCES delivery\_orders(id),     address TEXT NOT NULL, 

   `    `status VARCHAR(50) DEFAULT 'Pending', -- Pending, Arrived, Departed 

   `    `sequence INTEGER NOT NULL, -- Urutan tujuan 

   `    `created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 

   ); 

   -- // Hapus kolom tujuan yang lama dari tabel delivery\_orders jika ada -- // ALTER TABLE delivery\_orders DROP COLUMN tujuan;  

3. **Jalankan ulang migrasi:** npm run migrate:fresh. 
#### **Langkah 2: Backend - Buat API Endpoint untuk Lokasi & Tujuan** 
1. **Buka controller DO:** backend/src/controllers/deliveryOrder.controller.js (untuk mobile) dan backend/src/controllers/web/deliveryOrderController.js (untuk web). 
1. **Tambahkan fungsi baru** di deliveryOrder.controller.js (mobile):

   // File: backend/src/controllers/deliveryOrder.controller.js 

   // // FUNGSI BARU: Untuk menerima update lokasi dari driver exports.updateLocation = async (req, res, next) => { 

   `    `const { id } = req.params; // delivery\_order\_id 

   `    `const { latitude, longitude } = req.body; 

   `    `try { 

   `        `await db.query( 

   `            `'INSERT INTO delivery\_order\_locations (delivery\_order\_id, latitude, longitude) VALUES ($1, $2, $3)', 

   `            `[id, latitude, longitude] 

   `        `); 

   `        `res.status(200).json({ message: 'Location updated' }); 

   `    `} catch (error) { 

   `        `next(error); 

   `    `} 

   }; 

3. **Tambahkan fungsi baru** di web/deliveryOrderController.js (web): // File: backend/src/controllers/web/deliveryOrderController.js 

   // // FUNGSI BARU: Untuk mengambil semua histori lokasi untuk ditampilkan di peta 

   exports.getLocations = async (req, res, next) => { 

   `    `const { id } = req.params; 

   `    `try { 

   `        `const result = await db.query( 

   `            `'SELECT latitude, longitude, created\_at FROM delivery\_order\_locations WHERE delivery\_order\_id = $1 ORDER BY created\_at ASC', 

   `            `[id] 

   `        `); 

   `        `res.status(200).json(result.rows); 

   `    `} catch (error) {         next(error);     } 

   }; 

   // // FUNGSI BARU: Untuk menambah tujuan baru saat DO berjalan exports.addDestination = async (req, res, next) => { 

   `    `const { id } = req.params; 

   `    `const { address } = req.body; 

   `    `try { 

   `        `// // Ambil urutan terakhir dan tambahkan 1 

   `        `const lastSeqResult = await db.query('SELECT MAX(sequence) as max\_seq FROM delivery\_order\_destinations WHERE delivery\_order\_id = $1', [id]); 

   `        `const nextSequence = (lastSeqResult.rows[0].max\_seq || 0) + 1; 

   `        `await db.query( 

   `            `'INSERT INTO delivery\_order\_destinations (delivery\_order\_id, address, sequence) VALUES ($1, $2, $3)', 

   `            `[id, address, nextSequence] 

   `        `); 

   `        `res.status(201).json({ message: 'Destination added successfully' }); 

   `    `} catch (error) { 

   `        `next(error); 

   `    `} 

   }; 

4. **Daftarkan route-route baru**: 
- Di backend/src/routes/deliveryOrder.routes.js: router.post('/:id/location', auth, driver, deliveryOrderController.updateLocation); 
- Di backend/src/routes/web/deliveryOrder.routes.js: 
- router.get('/:id/locations', auth, admin, deliveryOrderController.getLocations); 
- router.post('/:id/destinations', auth, admin, deliveryOrderController.addDestination); 

**Langkah 3: Frontend - Modifikasi Halaman Detail DO** Saatnya menampilkan peta dan fungsionalitasnya di web admin. 

1. **Install library peta:** npm install @react-google-maps/api 
1. **Buka file:** angkutan-admin-web/src/pages/DeliveryOrderDetail.tsx 
3. **Implementasikan peta dan polling lokasi**:

   // File: angkutan-admin-web/src/pages/DeliveryOrderDetail.tsx import React, { useState, useEffect } from 'react'; 

   import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api'; 

   // // ... import lainnya 

   const DeliveryOrderDetail = () => { 

   `    `const { id } = useParams(); 

   `    `const [routeHistory, setRouteHistory] = useState([]); 

   `    `const { isLoaded } = useJsApiLoader({ 

   `        `googleMapsApiKey: "YOUR\_GOOGLE\_MAPS\_API\_KEY" // // GANTI DENGAN API KEY ANDA 

   `    `}); 

   `    `useEffect(() => { 

   `        `const fetchRoute = async () => { 

   `            `try { 

   `                `// // Panggil endpoint yang baru dibuat 

   `                `const response = await api.get(`/web/delivery-orders/${id}/locations`);                 // // Format data untuk Polyline: [{lat: ..., lng: ...}] 

   `                `const formattedRoute = response.data.map(loc => ({ 

   `                    `lat: parseFloat(loc.latitude), 

   `                    `lng: parseFloat(loc.longitude) 

   `                `})); 

   `                `setRouteHistory(formattedRoute); 

   `            `} catch (error) { 

   `                `console.error("Failed to fetch route", error); 

   `            `} 

   `        `}; 

   `        `const intervalId = setInterval(fetchRoute, 10000); // // Polling setiap 10 detik         return () => clearInterval(intervalId); 

   `    `}, [id]); 

   `    `const handleAddDestination = async (newAddress) => { 

   `        `await api.post(`/web/delivery-orders/${id}/destinations`, { address: newAddress }); 

   `        `// // Logika untuk refresh daftar tujuan 

   `    `}; 

   `    `if (!isLoaded) return <div>Loading Map...</div>; 

   `    `return ( 

   `        `<div> 

   `            `{/\* ... komponen detail DO lainnya ... \*/} 

   `            `<h3>Live Tracking</h3> 

   `            `<GoogleMap 

   `                `mapContainerStyle={{ width: '100%', height: '400px' }} 

   `                `center={routeHistory[0] || { lat: -5.45, lng: 105.2667 }} // // Center di Lampung 

   `                `zoom={12} 

   `            `> 

   `                `{routeHistory.length > 0 && ( 

   `                    `<> 

   `                        `<Marker position={routeHistory[routeHistory.length - 1]} /> 

   `                        `<Polyline path={routeHistory} options={{ strokeColor: '#FF0000' }} />                     </> 

   `                `)} 

   `            `</GoogleMap> 

   `            `<h3>Tujuan</h3> 

   `            `{/\* // Tampilkan daftar tujuan di sini \*/} 

   `            `<div> 

   `                `{/\* // Form dan tombol untuk memanggil handleAddDestination \*/}             </div> 

   `        `</div> 

   `    `); 

   }; 
### **Prioritas 2: Sistem Deposit & Pengisian Gas SPBG** 
**Tujuan:** Membuat sistem deposit ke SPBG yang saldonya akan berkurang setiap kali ada pengisian gas. Harga gas dihitung dengan dua metode: Kurs JISDOR atau Fixed Cost. 

**Diagram Alur Fitur** sequenceDiagram 

`    `participant Admin as Admin (Web) 

`    `participant Backend as Backend Server     participant Scraper as Scraper Service     participant DB as Database 

`    `Admin->>Backend: POST /api/v1/web/spbg/deposit (Top up Rp 100jt) 

`    `Backend->>DB: UPDATE spbg\_deposits SET balance = balance + 100jt     DB-->>Backend: Sukses 

`    `Backend-->>Admin: Saldo berhasil ditambah 

`    `Note over Admin, DB: Beberapa waktu kemudian... 

`    `Admin->>Backend: POST /api/v1/web/spbg/fill (DO-123, 1000 m³, metode: 'jisdor')     Backend->>Scraper: getJisdorRate() 

`    `Scraper-->>Backend: 16,500 

`    `Backend->>Backend: Hitung Biaya: (1000/27.27)\*12.7\*(kurs jisdor)= Rp 7,680,592     Backend->>DB: UPDATE spbg\_deposits SET balance = balance - 7680592 

`    `Backend->>DB: INSERT INTO spbg\_transactions (...) 

`    `DB-->>Backend: Sukses 

`    `Backend-->>Admin: Pengisian berhasil dicatat 
#### **Langkah 1: Backend - Modifikasi Database** 
1. **Buat file migrasi baru** (003-add-spbg-tables.sql) di backend/src/migrations/. 
1. **Isi file migrasi** dengan SQL berikut:

   -- File: backend/src/migrations/003-add-spbg-tables.sql 

   CREATE TABLE spbg\_deposits ( 

   `    `id SERIAL PRIMARY KEY, 

   `    `name VARCHAR(255) NOT NULL UNIQUE, 

   `    `balance BIGINT NOT NULL DEFAULT 0, 

   `    `created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), 

   `    `updated\_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 

   ); 

   CREATE TABLE spbg\_transactions ( 

   `    `id SERIAL PRIMARY KEY, 

   `    `spbg\_deposit\_id INTEGER REFERENCES spbg\_deposits(id), 

   `    `delivery\_order\_id INTEGER REFERENCES delivery\_orders(id),     volume\_m3 NUMERIC(10, 2) NOT NULL, 

   `    `calculation\_method VARCHAR(50) NOT NULL, -- 'jisdor' atau 'fixed'     jisdor\_rate NUMERIC(10, 2), 

   `    `total\_cost BIGINT NOT NULL, 

   `    `created\_at TIMESTAMPTZ NOT NULL DEFAULT NOW() 

   ); 

   INSERT INTO spbg\_deposits (name, balance) VALUES ('SPBG Cikarang', 0); 

3. **Jalankan ulang migrasi:** npm run migrate:fresh. 
#### **Langkah 2: Backend - Buat Service Scraper** 
1. **Buat file baru:** backend/src/services/scraperService.js 
1. **Install library:** npm install axios cheerio 
1. **Isi file scraperService.js**:

   // File: backend/src/services/scraperService.js 

   const axios = require('axios'); 

   const cheerio = require('cheerio'); 

   const JISDOR\_URL = 'https://www.bi.go.id/id/statistik/informasi-kurs/transaksi-bi/Default.aspx'; 

   async function getJisdorRate() { 

   `    `try { 

   `        `const { data } = await axios.get(JISDOR\_URL); 

   `        `const $ = cheerio.load(data); 

   `        `const rateString = $('#ctl00\_PlaceHolderMain\_g\_6c89d4ad\_1078\_4ea1\_916e\_e32a78522620\_ctl00\_ GridView1 tr:nth-child(2) td:nth-child(3)').text(); 

   `        `const rate = parseFloat(rateString.replace(/\./g, '').replace(',', '.')); 

   `        `if (isNaN(rate)) throw new Error('Scraping failed, rate is NaN'); 

   `        `return rate; 

   `    `} catch (error) { 

   `        `console.error('Error scraping JISDOR rate:', error.message); 

   `        `return 16500; // Fallback 

   `    `} 

   } 

   module.exports = { getJisdorRate }; 
#### **Langkah 3: Backend - Buat API Endpoint** 
1. **Buat file controller baru:** backend/src/controllers/web/spbgController.js dan isi dengan logika bisnis.

   // File: backend/src/controllers/web/spbgController.js 

   const db = require('../../utils/db'); 

   const { getJisdorRate } = require('../../services/scraperService'); 

   exports.recordGasFilling = async (req, res, next) => { 

   `    `const { spbg\_id, delivery\_order\_id, volume\_m3, method } = req.body;     try { 

   `        `let total\_cost = 0; 

   `        `let current\_jisdor\_rate = null; 

   `        `if (method === 'jisdor') { 

   `            `current\_jisdor\_rate = await getJisdorRate(); 

   `            `total\_cost = (volume\_m3 / 27.27) \* 12.7 \* current\_jisdor\_rate; 

   `        `} else { 

   `            `total\_cost = volume\_m3 \* 7800; 

   `        `} 

   `        `await db.query('BEGIN'); 

   `        `const depositResult = await db.query( 

   `            `'UPDATE spbg\_deposits SET balance = balance - $1 WHERE id = $2 RETURNING balance', 

   `            `[Math.round(total\_cost), spbg\_id] 

   `        `); 

   `        `if (depositResult.rows[0].balance < 0) { 

   `            `await db.query('ROLLBACK'); 

   `            `return res.status(400).json({ message: 'Saldo deposit tidak mencukupi!' });         } 

   `        `await db.query( 

   `            `'INSERT INTO spbg\_transactions (spbg\_deposit\_id, delivery\_order\_id, volume\_m3, calculation\_method, jisdor\_rate, total\_cost) VALUES ($1, $2, $3, $4, $5, $6)', 

   `            `[spbg\_id, delivery\_order\_id, volume\_m3, method, current\_jisdor\_rate, Math.round(total\_cost)] 

   `        `); 

   `        `await db.query('COMMIT'); 

   `        `res.status(201).json({ message: 'Pengisian gas berhasil dicatat.' });     } catch (error) { 

   `        `await db.query('ROLLBACK'); 

   `        `next(error); 

   `    `} 

   }; 

2. **Buat file route baru:** backend/src/routes/web/spbg.routes.js

   // File: backend/src/routes/web/spbg.routes.js 

   const express = require('express'); 

   const router = express.Router(); 

   const spbgController = require('../../controllers/web/spbgController'); const { auth, admin } = require('../../middlewares/auth.middleware'); router.post('/fill', auth, admin, spbgController.recordGasFilling); module.exports = router; 

3. **Daftarkan route baru** di backend/src/server.js:

   // File: backend/src/server.js 

   const spbgRoutes = require('./routes/web/spbg.routes'); app.use('/api/v1/web/spbg', spbgRoutes); 
#### **Langkah 4 & 5: Frontend - Buat UI dan Integrasi** 
1. **Buat halaman baru:** angkutan-admin-web/src/pages/Finance/DepositSPBG.tsx untuk menampilkan saldo dan histori. 
1. **Modifikasi angkutan-admin-web/src/pages/DeliveryOrderDetail.tsx**: Tambahkan tombol "Catat Pengisian Gas" yang membuka modal. Modal ini berisi form untuk input volume dan pilihan metode kalkulasi, yang kemudian memanggil API POST /api/v1/web/spbg/fill. 

# **Panduan Implementasi Fitur - Prioritas 4** 
Dokumen ini adalah panduan teknis khusus untuk mengimplementasikan fitur 
### **Manajemen Expense Driver** ke dalam proyek angkutan-system. **Prioritas 4: Manajemen Expense Driver** 
**Tujuan:** Mengaktifkan kembali fitur expense yang sudah ada, di mana driver bisa mengajukan biaya dari aplikasi mobile dan admin (koordinator) bisa melihat, menyetujui, atau menolak pengajuan tersebut di web admin. 
#### **Diagram Alur Fitur** 
sequenceDiagram 

`    `participant Driver as Driver (Mobile App)     participant Admin as Admin (Web App)     participant Backend as Backend Server     participant DB as Database 

`    `Driver->>Backend: POST /api/v1/driver-expenses (data, foto\_struk) 

`    `Backend->>Backend: Simpan foto ke server 

`    `Backend->>DB: INSERT INTO driver\_expenses (..., receipt\_url, status: 'pending')     DB-->>Backend: Sukses 

`    `Backend-->>Driver: Pengajuan berhasil 

`    `Admin->>Backend: GET /api/v1/web/driver-expenses     Backend->>DB: SELECT \* FROM driver\_expenses 

`    `DB-->>Backend: [expense1, expense2, ...] 

`    `Backend-->>Admin: Kirim daftar expense 

`    `Admin->>Backend: PUT /api/v1/web/driver-expenses/:id (status: 'approved')     Backend->>DB: UPDATE driver\_expenses SET status = 'approved' 

`    `DB-->>Backend: Sukses 

`    `Backend-->>Admin: Status berhasil diubah 
#### **Langkah 1: Backend - Pastikan Endpoint Expense Aktif** 
Fitur ini sebagian besar sudah ada di kode Anda. Kita hanya perlu memastikan semuanya terhubung dan berfungsi sesuai harapan. 

1. **Review File yang Ada**: 
- backend/src/models/driverExpense.model.js: Pastikan skema tabel sudah sesuai dan memiliki kolom id, delivery\_order\_id, amount, description, status ('pending', 'approved', 'rejected'), dan receipt\_url. 
- backend/src/controllers/driverExpenseController.js: Periksa fungsi createExpense (untuk mobile) dan pastikan ia menangani upload file. 
- backend/src/controllers/web/driverExpenseController.js (jika ada, atau buat baru): Buat fungsi getAllExpenses dan updateExpenseStatus. 
- backend/src/routes/driverExpense.routes.js: Pastikan rute POST / untuk driver dan GET /, PUT /:id untuk web admin sudah ada dan menggunakan middleware yang benar (misalnya upload.single('receipt') untuk upload gambar). 
2. **Pastikan Route Terdaftar** di backend/src/server.js: 

// // File: backend/src/server.js 

const driverExpenseRoutes = require('./routes/driverExpense.routes'); 

const webDriverExpenseRoutes = require('./routes/web/driverExpense.routes'); // // Buat jika belum ada 

// // Endpoint untuk Mobile App app.use('/api/v1/driver-expenses', driverExpenseRoutes);  

// // Endpoint untuk Web Admin app.use('/api/v1/web/driver-expenses', webDriverExpenseRoutes); 

3\. 

**Langkah 2: Mobile App - Fungsionalitas Pengajuan Expense** Pastikan driver dapat dengan mudah mengajukan biaya dari lapangan. 

1. **Buat Halaman Baru** di mobile/app/(tabs)/expense.tsx atau lokasi lain yang sesuai. 
1. **Buat Form Pengajuan** yang berisi: 
- Input untuk amount (jumlah biaya). 
- Input untuk description. 
- Tombol untuk memilih gambar dari galeri/kamera (gunakan expo-image-picker). 
3. **Buat Fungsi untuk Submit**: 

// // Contoh fungsi submit di mobile app 

import \* as ImagePicker from 'expo-image-picker'; 

const handleSubmit = async () => { 

`    `// // Minta izin jika belum ada 

`    `const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();     if (status !== 'granted') { 

`        `alert('Izin akses galeri dibutuhkan untuk mengupload bukti.'); 

`        `return; 

`    `} 

`    `let result = await ImagePicker.launchImageLibraryAsync({         mediaTypes: ImagePicker.MediaTypeOptions.Images,         allowsEditing: true, 

`        `quality: 0.5, 

`    `}); 

`    `if (!result.canceled) { 

`        `const localUri = result.assets[0].uri; 

`        `const filename = localUri.split('/').pop(); 

`        `const match = /\.(\w+)$/.exec(filename); 

`        `const type = match ? `image/${match[1]}` : `image`; 

`        `const formData = new FormData(); 

`        `formData.append('receipt', { uri: localUri, name: filename, type });         formData.append('amount', amount); 

`        `formData.append('description', description); 

`        `formData.append('delivery\_order\_id', currentDoId); 

`        `// // Kirim ke backend 

`        `await api.post('/driver-expenses', formData, { 

`            `headers: { 'Content-Type': 'multipart/form-data' },         }); 

`    `} 

}; 
#### **Langkah 3: Frontend - Buat Halaman Manajemen Expense** 
Ini adalah bagian terpenting: membuat antarmuka untuk admin (koordinator). 

1. **Buat Halaman Baru**: angkutan-admin-web/src/pages/Finance/DriverExpense.tsx. 
1. **Buat Komponen** untuk menampilkan daftar expense dalam tabel dan mengelola statusnya. 

// // File: angkutan-admin-web/src/pages/Finance/DriverExpense.tsx import React, { useState, useEffect } from 'react'; 

import api from '../../api/axiosConfig'; // // Sesuaikan path import 

const DriverExpense = () => { 

`    `const [expenses, setExpenses] = useState([]); 

`    `const fetchExpenses = async () => { 

`        `try { 

`            `const response = await api.get('/web/driver-expenses'); // // Panggil endpoint web             setExpenses(response.data); 

`        `} catch (error) { 

`            `console.error("Gagal mengambil data expense:", error); 

`        `} 

`    `}; 

`    `useEffect(() => { 

`        `fetchExpenses();     }, []); 

`    `const handleUpdateStatus = async (id, status) => { 

`        `try { 

`            `await api.put(`/web/driver-expenses/${id}`, { status });             fetchExpenses(); // // Refresh data setelah update 

`        `} catch (error) { 

`            `console.error("Gagal update status:", error); 

`        `} 

`    `}; 

`    `return ( 

`        `<div> 

`            `<h2 className="text-2xl font-bold mb-4">Manajemen Expense Driver</h2>             <div className="bg-white p-4 rounded-lg shadow-md"> 

`                `<table className="w-full"> 

`                    `<thead> 

`                        `<tr className="border-b"> 

`                            `<th className="p-2 text-left">Tanggal</th> 

`                            `<th className="p-2 text-left">Supir</th> 

`                            `<th className="p-2 text-left">Deskripsi</th> 

`                            `<th className="p-2 text-left">Jumlah</th> 

`                            `<th className="p-2 text-left">Status</th> 

`                            `<th className="p-2 text-center">Bukti</th> 

`                            `<th className="p-2 text-center">Aksi</th> 

`                        `</tr> 

`                    `</thead> 

`                    `<tbody> 

`                        `{expenses.map(expense => ( 

`                            `<tr key={expense.id} className="border-b hover:bg-gray-50"> 

`                                `<td className="p-2">{new Date(expense.created\_at).toLocaleDateString()}</td> 

`                                `<td className="p-2">{expense.driver\_name}</td> 

`                                `<td className="p-2">{expense.description}</td> 

`                                `<td className="p-2">Rp {expense.amount.toLocaleString('id-ID')}</td>                                 <td className="p-2">{expense.status}</td> 

`                                `<td className="p-2 text-center"> 

`                                    `<a href={`${process.env.REACT\_APP\_API\_URL}/${expense.receipt\_url}`} target="\_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline"> 

`                                        `Lihat 

`                                    `</a> 

`                                `</td> 

`                                `<td className="p-2 text-center"> 

`                                    `{expense.status === 'pending' && ( 

`                                        `<div className="flex justify-center space-x-2"> 

`                                            `<button onClick={() => handleUpdateStatus(expense.id, 'approved')} className="bg-green-500 text-white px-3 py-1 rounded-md">Approve</button> 

`                                            `<button onClick={() => handleUpdateStatus(expense.id, 'rejected')} className="bg-red-500 text-white px-3 py-1 rounded-md">Reject</button> 

`                                        `</div>                                     )} 

`                                `</td> 

`                            `</tr> 

`                        `))} 

`                    `</tbody> 

`                `</table> 

`            `</div> 

`        `</div> 

`    `); 

}; 

export default DriverExpense; 

3. **Tambahkan Halaman ini ke Routing** aplikasi web admin Anda (angkutan-admin-web/src/App.tsx) agar bisa diakses melalui menu navigasi. 
