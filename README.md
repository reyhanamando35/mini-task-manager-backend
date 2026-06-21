# Mini Task Manager

Aplikasi kecil untuk tim internal: membuat task, memindahkan status task lewat alur yang sudah
ditentukan, dan melihat riwayat (audit log) dari setiap perubahan status yang tidak bisa diubah-ubah.

## Teknologi

- **Backend:** Node.js + Express + TypeScript, penyimpanan di memory
- **Frontend:** React + TypeScript (Vite)

## Cara menjalankan

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

API jalan di `http://localhost:4000`.

### 2. Frontend

Buka terminal baru:

```bash
cd frontend
npm install
npm run dev
```

Aplikasi jalan di `http://localhost:5173` dan otomatis terhubung ke backend di `http://localhost:4000`.

### Daftar API

| Method | Route                      | Fungsi                                    |
|--------|-----------------------------|-------------------------------------------|
| GET    | `/users`                    | Daftar actor (dropdown) |
| GET    | `/tasks`                    | Menampilkan semua task                    |
| POST   | `/tasks`                    | Membuat task (`title`, `description` opsional) |
| DELETE | `/tasks/:id`                 | Menghapus task                            |
| PUT    | `/tasks/:id/status`          | Mengubah status (`status`, `actor`)       |
| GET    | `/tasks/:id/audit-logs`      | Riwayat perubahan satu task (urut waktu)  |
| GET    | `/audit-logs`               | Riwayat semua task (termasuk yang sudah dihapus) |

## Arsitektur

```
backend/src/
  routes/        -> menentukan route HTTP
  controllers/    -> menangani request dan validasi input
  services/       -> logika inti (ngatur urutan status, unrepeatable, catat audit)
  data/store.ts    -> penyimpanan di memory (hilang saat dirun ulang)
  types/          -> tipe data bersama (Task, AuditLog, urutan status(hardcoded), daftar user (hardcoded))

frontend/src/
  api/client.ts    -> semua pemanggilan fetch() ke backend
  components/      -> CreateTaskForm, TaskItem (actor + status + hapus + riwayat), GlobalAuditLog, StatusBadge
  types/           -> menyalin backend/src/types supaya bentuk data kedua sisi sama
```

Backend dibuat berlapis (routes → controllers → services → store) supaya aturan perpindahan status dan
audit log berada di satu tempat (`task.service.ts`) dan tidak bisa dilewati hanya dengan menambah route
baru.

Keputusan penting: **`store.ts` tidak punya fungsi "update" atau "delete" untuk audit log** — yang ada
hanya `appendAuditLog()` (tambah) dan `getAuditLogsByTaskId()` (baca). Inilah yang benar-benar menjamin
log tidak bisa diubah, bukan sekadar aturan di komentar.

## Asumsi yang diambil

1. **"hanya mengikuti urutan: to_do → pending → in_progress → done"**. Task hanya
   boleh maju ke status berikutnya, satu langkah saja. Tidak boleh lompat (misal `to_do → done`), tidak
   boleh mundur. Aturan ini ditulis langsung di `isValidTransition()`.
2. **Update idempotent** (`PUT .../status` dengan status yang sama dengan status sekarang) mengembalikan
   `200 OK` dengan task yang tidak berubah dan `logCreated: false`, dianggap berhasil tapi tidak
   melakukan apa-apa, bukan error.
3. **Menghapus task tidak menghapus audit log-nya.** Tertulis log tidak boleh diubah/dihapus "dalam
   keadaan apapun", kalau dibaca apa adanya, termasuk setelah task induknya hilang. Jadi
   `GET /tasks/:id/audit-logs` tetap mengembalikan riwayat meski task-nya sudah dihapus. Supaya log task
   yang sudah dihapus tetap bisa dilihat dari UI (bukan cuma lewat API), ada section **"Semua Audit Log"**
   di bawah halaman yang menampilkan riwayat semua task, termasuk task yang telah dihapus.
4. **Actor adalah daftar tertutup** berisi 4 contoh nama (bukan ketik bebas), dikirim dari backend
   lewat `GET /users` supaya dropdown di frontend dan validasi di backend memakai satu sumber yang sama.
5. **Tanpa login/auth.** Sesuai catatan "No Overengineering".

## Trade-off yang dibuat

- **Disimpan di memory, bukan database asli.** Paling cepat disiapkan dan dibaca, tanpa setup tambahan.
  Minusnya data hilang setiap server restart, dan belum ada pengamanan untuk akses bersamaan.
- **Frontend pakai satu tombol "Advance to `<status berikutnya>`", bukan dropdown status bebas.** Karena
  hanya ada satu perpindahan yang valid setiap saat, dropdown bebas malah memperbanyak cara memicu error
  400 tanpa manfaat nyata. Backend tetap memvalidasi ulang setiap perpindahan, apa pun yang dikirim
  frontend, batasan di frontend hanya kemudahan, bukan sumber kebenaran.
- **Riwayat audit ditampilkan sebagai bagian yang bisa dibuka di tiap task**, bukan halaman terpisah,
  supaya aplikasi cukup satu layar dan tidak perlu menambah routing.
- **Audit log diperbarui dengan cara fetch ulang (refetch) setelah status berubah**
  Lebih sederhana dan sudah cukup untuk tampilan satu layar. Backend tetap jadi sumber kebenaran log.

## Pengujian manual yang sudah dilakukan menggunakan Postman

- Membuat task → mulai dari status `to_do`.
- Perpindahan maju yang valid (`to_do → pending → in_progress → done`) masing-masing membuat tepat satu
  audit log, berurutan.
- Mengirim status yang sama lagi mengembalikan `200` dengan `logCreated: false` dan tidak menambah log.
- Melompati langkah/melangkah kembali dan mengirim actor yang tidak dikenal sama-sama
  mengembalikan `400` dengan error message yang jelas.
- Menghapus task menghilangkannya dari `GET /tasks`, tapi `GET /tasks/:id/audit-logs` dan
  `GET /audit-logs` tetap mengembalikan riwayat aslinya, lengkap dengan `taskTitle`.
- Setelah menekan "Advance", riwayat audit langsung tampil/diperbarui di layar tanpa perlu menekan
  tombol "View History" lagi. (bukan Postman, tapi UI)
- Section "Semua Audit Log" menampilkan riwayat lintas task; log milik task yang sudah dihapus tetap
  muncul dan ditandai "(task dihapus)" di UI.

## Yang akan diperbaiki kalau ada waktu lebih

- Automated test: unit test untuk `task.service` (aturan perpindahan, idempotency) dan integration test
  untuk route API.
- Mengganti penyimpanan memory dengan database asli (misal SQLite), lalu membungkus "validasi perpindahan + tulis status + tulis audit log" dalam satu baris database, untuk menghilangkan race condition.
- Login/auth asli, supaya `actor` berasal dari sesi login, bukan dipilih sendiri dari dropdown.
- Pagination/filter atau Skeleton loader untuk `GET /tasks` dan `GET /tasks/:id/audit-logs` saat datanya sudah banyak.
- Update UI yang lebih halus (optimistic update) dan tampilan validasi inline yang lebih rapi.

## Jawaban pertanyaan

**Bagaimana kamu memastikan audit log tidak ter-modifikasi?**

Di level kode, tidak ada satu pun fungsi yang bisa mengubah atau menghapus baris audit log. `store.ts`
hanya menyediakan `appendAuditLog()` (tambah) dan `getAuditLogsByTaskId()` (baca). Tidak ada route yang menerima `PUT`/`PATCH`/`DELETE` ke `/audit-logs`, dan tidak ada route yang membiarkan client membuat log langsung
— log hanya ditulis sebagai efek samping di dalam `updateTaskStatus()`, tepat setelah perpindahan lolos
validasi.

**Bagian mana dari solusi ini yang paling berisiko jika digunakan oleh banyak user?**

Alur update status punya race condition jenis "cek lalu tulis": membaca status sekarang, memvalidasi
perpindahan, lalu menulis status baru dan audit log itu tidak atomic (bukan satu langkah utuh). Dua
request yang datang hampir bersamaan untuk task yang sama bisa sama-sama membaca status yang sama,
sama-sama lolos validasi, dan sama-sama menulis, menghasilkan dua audit log dan status akhir yang tidak
jelas siapa yang "menang". Dengan satu proses Node di memory hal ini jarang muncul di lingkup take-home,
tapi akan jadi masalah nyata saat beban benar-benar bersamaan atau aplikasi jalan di lebih dari satu
instance. Risiko terbesar kedua adalah tidak adanya login, karena `actor` dipilih sendiri dari
dropdown, audit trail belum bisa benar-benar dipercaya sebagai catatan pertanggungjawaban.

**Jika task ini berkembang menjadi sistem besar, bagian mana yang akan kamu refactor terlebih dahulu dan
kenapa?**

Lapisan penyimpanannya dulu. Pindah dari penyimpanan memory ke database asli dengan penulisan
transaksional sekaligus menyelesaikan dua masalah yaitu data hilang saat restart, dan
race condition seperti yang aku jelaskan sebleumya. Caranya dengan membungkus "validasi perpindahan → update task → insert audit log" dalam satu transaksi database. Berikutnya, menerapkan authentikasi, karena `actor` adalah inti dari fitur audit. Setelah itu, apabila jumlah log sudah sangat banyak, saya akan mempertimbangkan memisahkan audit log ke penyimpanan tersendiri yang dioptimalkan untuk dibaca, karena data audit lebih sering ditulis daripada dibaca, tapi tetap perlu mendukung filter atau pencarian saat audit log dibaca.

## Keterangan penggunaan AI

Saya memakai AI (Claude) sebagai teman ngoding selama membuat proyek ini. Detailnya:

- **Kerangka dan kode dasar** — struktur backend berlapis (routes/controllers/services/store), setup
  Vite + React, dan CSS dibuat dengan bantuan AI, lalu saya periksa dan sesuaikan sendiri.
- **Logika inti** — `isValidTransition()`, pengecekan idempotency dan flag `logCreated` di
  `updateTaskStatus()`, serta `store.ts` yang sengaja append-only (tanpa update/delete untuk audit log)
  dirancang bersama; saya pastikan paham *kenapa* tiap aturan ada di situ, bukan asal terima.
- **Penjelasan di README** — asumsi, trade-off, dan tiga jawaban refleksi ditulis bersama lalu saya edit
  agar sesuai dengan keputusan yang benar-benar ada di kode.

**Cara saya memastikan benar:** saya membaca setiap file dan menjalankan API secara manual dengan
pengujian menggunakan Postman untuk membuktikan perilaku di "Pengujian manual": perpindahan valid membuat tepat satu log, mengirim status yang sama mengembalikan `logCreated: false` tanpa log baru, melompati langkah/melangkah kembali atau actor tak dikenal mengembalikan `400`, audit log keluar urut waktu, dan tidak ada route yang bisa mengubah atau menghapus log (`DELETE /tasks/:id/audit-logs` → `404`). `backend` dan `frontend` juga lolos `tsc --noEmit` tanpa error.
