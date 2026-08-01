// ==========================================================
// 1. DEKLARASI VARIABEL GLOBAL & INTEGRASI GOOGLE SHEETS
// ==========================================================
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycby2nv7rvaca5oci1cmKBsuLJ07rIlw2lFIzY6AqTqrxw05sZBvhAJ_UgpduflR7NsuD/exec";

let barangAktif = null;
let html5QrCode = null; // Scanner Kamera
let historyScan = [];

// Storage Data
let daftarBarang = JSON.parse(localStorage.getItem("daftarBarang")) || [];
let historyTransaksi = JSON.parse(localStorage.getItem("historyTransaksi")) || [];
let userAktifInfo = JSON.parse(localStorage.getItem("userAktifInfo")) || null;
let userAktif = userAktifInfo ? userAktifInfo.nama : "";

// ==========================================================
// 2. INITIALIZATION & SYSTEM LOGIN
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. Tampilkan Tanggal Hari Ini
    const sekarang = new Date();
    const elTanggal = document.getElementById("tanggal");
    if (elTanggal) {
        elTanggal.innerHTML = sekarang.toLocaleDateString("id-ID", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
    }

    // 2. Cek Status Login
    cekStatusLogin();

    // 3. Load Data Stok dari Google Sheets
    loadDataStokDariSheet();

    // 4. Load Mode Gelap (Dark Mode)
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if (isDarkMode) document.body.classList.add("dark-mode");
    const toggleSwitch = document.getElementById("toggleDarkMode");
    if (toggleSwitch) toggleSwitch.checked = isDarkMode;
});

function getDatabaseUser() {
    let data = localStorage.getItem("databaseUser");
    if (!data) {
        const defaultUser = [
            { nik: "1001", password: "admin123", role: "admin", nama: "Administrator Gudang" },
            { nik: "2001", password: "staff123", role: "staff", nama: "Staff Gudang" }
        ];
        localStorage.setItem("databaseUser", JSON.stringify(defaultUser));
        return defaultUser;
    }
    return JSON.parse(data);
}

function cekStatusLogin() {
    const elHalamanLogin = document.getElementById("halamanLogin");
    if (userAktifInfo && userAktifInfo.nik) {
        if (elHalamanLogin) elHalamanLogin.style.display = "none";
        userAktif = userAktifInfo.nama || userAktifInfo.nik;
        terapkanAksesRole();
    } else {
        if (elHalamanLogin) elHalamanLogin.style.display = "flex";
    }
}

function prosesLogin(event) {
    if (event) event.preventDefault();

    const nikInput = document.getElementById("inputNik").value.trim();
    const passwordInput = document.getElementById("inputPassword").value.trim();
    const users = getDatabaseUser();

    const akunDitemukan = users.find(u => String(u.nik) === nikInput && u.password === passwordInput);

    if (akunDitemukan) {
        userAktifInfo = {
            nik: akunDitemukan.nik,
            role: akunDitemukan.role,
            nama: akunDitemukan.nama
        };

        localStorage.setItem("userAktifInfo", JSON.stringify(userAktifInfo));
        userAktif = akunDitemukan.nama;

        document.getElementById("halamanLogin").style.display = "none";
        terapkanAksesRole();
        alert(`🔓 Login Berhasil!\nSelamat Datang, ${akunDitemukan.nama}`);
    } else {
        alert("❌ NIK atau Password salah!");
    }
}

function terapkanAksesRole() {
    if (!userAktifInfo) return;
    const isAdmin = userAktifInfo.role === "admin";

    const lblUser = document.getElementById("labelUserLogin");
    const lblRole = document.getElementById("labelRoleUser");
    if (lblUser) lblUser.innerText = userAktifInfo.nama;
    if (lblRole) lblRole.innerText = userAktifInfo.role.toUpperCase();

    // Sembunyikan elemen khusus Admin
    const elemenAdmin = document.querySelectorAll(".khusus-admin");
    elemenAdmin.forEach(el => {
        el.style.display = isAdmin ? "block" : "none";
    });
}

function prosesLogout() {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
        localStorage.removeItem("userAktifInfo");
        userAktifInfo = null;
        userAktif = "";

        const modalSetting = document.getElementById("modalSetting");
        if (modalSetting) modalSetting.style.display = "none";

        const elHalamanLogin = document.getElementById("halamanLogin");
        if (elHalamanLogin) elHalamanLogin.style.display = "flex";
    }
}

// ==========================================================
// 3. INTEGRASI GOOGLE SHEETS API
// ==========================================================
function loadDataStokDariSheet() {
    if (!GOOGLE_SHEET_URL) return;

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        body: JSON.stringify({ aksi: "getSemuaBarang" })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "success" && res.data.length > 0) {
            daftarBarang = res.data;
            localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));
            updateDashboardStats();
            console.log(`✅ Berhasil memuat ${res.data.length} barang dari Google Sheets`);
        }
    })
    .catch(err => console.error("❌ Gagal memuat data dari Google Sheets:", err));
}

function syncKeGoogleSheet() {
    if (!GOOGLE_SHEET_URL) return;

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            aksi: "syncSemuaBarang",
            barang: daftarBarang
        })
    })
    .then(() => console.log("☁️ Sync data stok ke Google Sheets berhasil!"))
    .catch(err => console.error("❌ Gagal sync Google Sheets:", err));
}

function kirimTransaksiKeGoogleSheet(transaksi) {
    if (!GOOGLE_SHEET_URL) return;

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            aksi: "catatTransaksi",
            transaksi: transaksi
        })
    })
    .then(() => console.log("📝 Catatan transaksi terkirim ke Google Sheets!"))
    .catch(err => console.error("❌ Gagal kirim transaksi:", err));
}

function updateDashboardStats() {
    if (!daftarBarang) return;

    const elTotal = document.getElementById("totalBarang");
    if (elTotal) elTotal.innerHTML = daftarBarang.length;

    const skrg = new Date();
    const totalExpired = daftarBarang.filter(item => {
        if (!item.expired || item.expired === "-") return false;
        const expDate = new Date(item.expired);
        if (isNaN(expDate.getTime())) return false;
        const selisihHari = Math.ceil((expDate - skrg) / (1000 * 60 * 60 * 24));
        return selisihHari <= 30;
    }).length;

    const elExp = document.getElementById("expired");
    if (elExp) elExp.innerHTML = totalExpired;
}

// ==========================================================
// 4. OPERASI TRANSAKSI (STOCK IN, OUT, MOVE) + AUTO-SYNC
// ==========================================================
function simpanStockIn() {
    if (!barangAktif) return alert("Scan atau cari barang terlebih dahulu.");

    const jumlah = Number(document.getElementById("jumlahIN").value);
    if (isNaN(jumlah) || jumlah <= 0) return alert("Masukkan jumlah yang benar.");

    barangAktif.stok = Number(barangAktif.stok) + jumlah;

    document.getElementById("stokBarang").innerHTML = barangAktif.stok;
    document.getElementById("inStok").innerHTML = barangAktif.stok;

    const log = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "📥 Stock IN",
        nama: barangAktif.nama,
        barcode: barangAktif.barcode,
        jumlah: jumlah,
        user: userAktif
    };

    historyTransaksi.unshift(log);
    localStorage.setItem("historyTransaksi", JSON.stringify(historyTransaksi));
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

    // Sync ke Google Sheets
    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "STOCK IN",
        barcode: barangAktif.barcode,
        namaBarang: barangAktif.nama,
        jumlah: jumlah,
        user: userAktif,
        keterangan: "Stok Masuk"
    });

    if (typeof tampilHistoryTransaksi === "function") tampilHistoryTransaksi();
    if (typeof tutupStockIn === "function") tutupStockIn();
    document.getElementById("jumlahIN").value = "";
    alert("✅ Stock IN berhasil & Data tersimpan di Google Sheets!");
}

function simpanStockOut() {
    if (!barangAktif) return alert("Scan atau cari barang terlebih dahulu.");

    const jumlah = Number(document.getElementById("jumlahOUT").value);
    if (isNaN(jumlah) || jumlah <= 0) return alert("Masukkan jumlah yang benar.");
    if (jumlah > Number(barangAktif.stok)) return alert("❌ Stock tidak mencukupi.");

    barangAktif.stok = Number(barangAktif.stok) - jumlah;

    document.getElementById("stokBarang").innerHTML = barangAktif.stok;
    document.getElementById("outStok").innerHTML = barangAktif.stok;

    const log = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "📤 Stock OUT",
        nama: barangAktif.nama,
        barcode: barangAktif.barcode,
        jumlah: jumlah,
        user: userAktif
    };

    historyTransaksi.unshift(log);
    localStorage.setItem("historyTransaksi", JSON.stringify(historyTransaksi));
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

    // Sync ke Google Sheets
    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "STOCK OUT",
        barcode: barangAktif.barcode,
        namaBarang: barangAktif.nama,
        jumlah: jumlah,
        user: userAktif,
        keterangan: "Stok Keluar"
    });

    if (typeof tampilHistoryTransaksi === "function") tampilHistoryTransaksi();
    if (typeof tutupStockOut === "function") tutupStockOut();
    document.getElementById("jumlahOUT").value = "";
    alert("✅ Stock OUT berhasil & Data tersimpan di Google Sheets!");
}

function simpanMove() {
    if (!barangAktif) return alert("Scan atau cari barang terlebih dahulu.");

    const lokasiBaru = document.getElementById("lokasiBaru").value.trim();
    if (lokasiBaru === "") return alert("Masukkan lokasi baru.");

    const lokasiLama = barangAktif.lokasi;
    barangAktif.lokasi = lokasiBaru;

    document.getElementById("lokasiBarang").innerHTML = barangAktif.lokasi;
    document.getElementById("moveLokasi").innerHTML = barangAktif.lokasi;

    const log = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "🔄 MOVE",
        nama: barangAktif.nama,
        barcode: barangAktif.barcode,
        dari: lokasiLama,
        ke: lokasiBaru,
        user: userAktif
    };

    historyTransaksi.unshift(log);
    localStorage.setItem("historyTransaksi", JSON.stringify(historyTransaksi));
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

    // Sync ke Google Sheets
    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "MOVE LOCATION",
        barcode: barangAktif.barcode,
        namaBarang: barangAktif.nama,
        jumlah: 0,
        user: userAktif,
        keterangan: `Pindah dari ${lokasiLama} ke ${lokasiBaru}`
    });

    if (typeof tampilHistoryTransaksi === "function") tampilHistoryTransaksi();
    if (typeof tutupMove === "function") tutupMove();
    document.getElementById("lokasiBaru").value = "";
    alert("✅ Lokasi berhasil dipindahkan!");
}

// ==========================================================
// 5. SCANNER & PENCARIAN BARANG
// ==========================================================
function mulaiScan() {
    document.getElementById("modalScan").style.display = "flex";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        function (decodedText) {
            beep();
            tutupScan();

            document.getElementById("hasilScanText").innerHTML = decodedText;
            const barang = daftarBarang.find(item => String(item.barcode) === String(decodedText));

            if (barang) {
                tampilkanDetailBarang(barang);
                historyScan.unshift({
                    waktu: new Date().toLocaleTimeString("id-ID"),
                    nama: barang.nama,
                    barcode: barang.barcode,
                    expired: barang.expired
                });
                tampilRiwayat();
            } else {
                alert("❌ Barang dengan barcode " + decodedText + " tidak ditemukan.");
            }
        },
        function (error) {}
    ).catch(err => {
        console.error("Gagal membuka kamera:", err);
        alert("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.");
        tutupScan();
    });
}

function tutupScan() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById("modalScan").style.display = "none";
        }).catch(err => {
            document.getElementById("modalScan").style.display = "none";
        });
    } else {
        document.getElementById("modalScan").style.display = "none";
    }
}

function cariBarang() {
    const key = document.getElementById("keyword").value.trim().toLowerCase();
    if (key === "") return alert("Masukkan kata kunci.");

    const barang = daftarBarang.find(item =>
        item.nama.toLowerCase().includes(key) ||
        String(item.barcode).includes(key) ||
        String(item.sku || "").toLowerCase().includes(key)
    );

    if (!barang) return alert("Barang tidak ditemukan");
    tampilkanDetailBarang(barang);
}

function tampilkanDetailBarang(barang) {
    barangAktif = barang;

    document.getElementById("detailBarang").style.display = "block";
    document.getElementById("namaBarang").innerHTML = barang.nama;
    document.getElementById("hasilScanText").innerHTML = barang.barcode;
    document.getElementById("skuBarang").innerHTML = barang.sku || '-';
    document.getElementById("stokBarang").innerHTML = barang.stok;
    document.getElementById("lokasiBarang").innerHTML = barang.lokasi || '-';
    document.getElementById("expiredBarang").innerHTML = barang.expired + "<br>" + cekExpired(barang.expired);

    document.getElementById("inNamaBarang").innerHTML = barang.nama;
    document.getElementById("inBarcode").innerHTML = barang.barcode;
    document.getElementById("inStok").innerHTML = barang.stok;
}

// ==========================================================
// 6. KELOLA USER (KHUSUS ADMIN)
// ==========================================================
function tambahUserBaruPrompt() {
    if (!userAktifInfo || userAktifInfo.role !== "admin") {
        alert("⛔ Akses Ditolak: Hanya Admin yang bisa menambah NIK baru.");
        return;
    }

    const nikBaru = prompt("Masukkan NIK Karyawan Baru (Contoh: 2002):");
    if (!nikBaru || nikBaru.trim() === "") return;
    const nikClean = nikBaru.trim();

    let users = getDatabaseUser();
    if (users.find(u => String(u.nik) === nikClean)) {
        alert("⚠️ NIK " + nikClean + " sudah terdaftar!");
        return;
    }

    const namaBaru = prompt("Masukkan Nama Lengkap Karyawan:");
    if (!namaBaru || namaBaru.trim() === "") return;

    const passBaru = prompt("Masukkan Password untuk " + namaBaru + ":");
    if (!passBaru || passBaru.trim() === "") return;

    const pilihanRole = confirm("Apakah akun ini dijadikan ADMIN?\n\n• [OK] untuk ADMIN\n• [Batal] untuk STAFF");
    const roleBaru = pilihanRole ? "admin" : "staff";

    users.push({
        nik: nikClean,
        password: passBaru.trim(),
        role: roleBaru,
        nama: namaBaru.trim()
    });

    localStorage.setItem("databaseUser", JSON.stringify(users));
    alert(`✅ User Berhasil Ditambahkan!\n\nNIK: ${nikClean}\nNama: ${namaBaru.trim()}\nRole: ${roleBaru.toUpperCase()}`);
}

function kelolaDanHapusUser() {
    if (!userAktifInfo || userAktifInfo.role !== "admin") {
        alert("⛔ Akses Ditolak: Hanya Admin yang bisa menghapus user.");
        return;
    }

    let users = getDatabaseUser();
    if (users.length <= 1) {
        alert("⚠️ Minimal harus ada 1 akun terdaftar di sistem!");
        return;
    }

    let pesanDaftar = "📋 DAFTAR NIK TERDAFTAR:\n----------------------------------\n";
    users.forEach((u, index) => {
        pesanDaftar += `${index + 1}. NIK: ${u.nik} | Nama: ${u.nama} (${u.role.toUpperCase()})\n`;
    });
    pesanDaftar += "\nMasukkan NIK karyawan yang ingin DIHAPUS:";

    const nikHapus = prompt(pesanDaftar);
    if (!nikHapus || nikHapus.trim() === "") return;
    const nikClean = nikHapus.trim();

    if (userAktifInfo && nikClean === String(userAktifInfo.nik)) {
        alert("❌ Anda tidak bisa menghapus NIK Anda sendiri yang sedang aktif digunakan login!");
        return;
    }

    const indexUser = users.findIndex(u => String(u.nik) === nikClean);
    if (indexUser !== -1) {
        const userDihapus = users[indexUser];
        if (confirm(`⚠️ Yakin MENGHAPUS NIK ${userDihapus.nik} (${userDihapus.nama})?`)) {
            users.splice(indexUser, 1);
            localStorage.setItem("databaseUser", JSON.stringify(users));
            alert(`✅ Akun NIK ${nikClean} berhasil dihapus!`);
        }
    } else {
        alert(`❌ NIK "${nikClean}" tidak ditemukan.`);
    }
}

// ==========================================================
// 7. UTILITY & FUNGSI LAINNYA
// ==========================================================
function cekExpired(tanggalExpired) {
    if (!tanggalExpired || tanggalExpired === "-") return "🟢 AMAN";
    const skrg = new Date();
    const expired = new Date(tanggalExpired);
    if (isNaN(expired.getTime())) return "🟢 AMAN";

    const hari = Math.ceil((expired - skrg) / (1000 * 60 * 60 * 24));
    if (hari < 0) return "🔴 EXPIRED";
    if (hari <= 30) return "🟠 HAMPIR EXPIRED (" + hari + " hari)";
    return "🟢 AMAN (" + hari + " hari)";
}

function beep() {
    try {
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audio.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 900;
        osc.connect(audio.destination);
        osc.start();
        setTimeout(() => { osc.stop(); audio.close(); }, 120);
    } catch (e) {}
}

function switchDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "true");
    } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "false");
    }
}
// ==========================================================
// FUNGSI TAMBAH BARANG BARU (TERHUBUNG GOOGLE SHEETS)
// ==========================================================

// 1. Membuka Modal Form Tambah Barang
function bukaTambahBarang(defaultBarcode = "") {
    const elBarcode = document.getElementById("tambahBarcode");
    const elNama = document.getElementById("tambahNama");
    const elSku = document.getElementById("tambahSku");
    const elStok = document.getElementById("tambahStok");
    const elLokasi = document.getElementById("tambahLokasi");
    const elExpired = document.getElementById("tambahExpired");
    const elModal = document.getElementById("modalTambahBarang");

    if (elBarcode) elBarcode.value = defaultBarcode;
    if (elNama) elNama.value = "";
    if (elSku) elSku.value = "";
    if (elStok) elStok.value = "";
    if (elLokasi) elLokasi.value = "";
    if (elExpired) elExpired.value = "";

    if (elModal) {
        elModal.style.display = "flex";
    } else {
        alert("⚠️ Modal Tambah Barang (modalTambahBarang) tidak ditemukan di HTML!");
    }
}

// 2. Menutup Modal Form Tambah Barang
function tutupTambahBarang() {
    const elModal = document.getElementById("modalTambahBarang");
    if (elModal) elModal.style.display = "none";
}

// 3. Menyimpan Barang Baru Ke LocalStorage & Google Sheets
function simpanBarangBaru() {
    const barcode = document.getElementById("tambahBarcode").value.trim();
    const nama = document.getElementById("tambahNama").value.trim();
    const sku = document.getElementById("tambahSku").value.trim();
    const stok = Number(document.getElementById("tambahStok").value);
    const lokasi = document.getElementById("tambahLokasi").value.trim();
    const expired = document.getElementById("tambahExpired").value;

    // Validasi Input Utama
    if (!barcode || !nama || isNaN(stok) || stok < 0) {
        alert("⚠️ Mohon isi Barcode, Nama Barang, dan Jumlah Stok dengan benar.");
        return;
    }

    // Cek apakah Barcode sudah pernah terdaftar
    const barangAda = daftarBarang.find(b => String(b.barcode) === barcode);
    if (barangAda) {
        alert(`⚠️ Barcode ${barcode} sudah terdaftar atas nama: ${barangAda.nama}`);
        return;
    }

    // Buat objek barang baru
    const barangBaru = {
        barcode: barcode,
        nama: nama,
        sku: sku || "-",
        stok: stok,
        lokasi: lokasi || "-",
        expired: expired || "-"
    };

    // 1. Masukkan ke daftarBarang & simpan di LocalStorage
    daftarBarang.push(barangBaru);
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

    // 2. Catat Riwayat Transaksi
    const logHistory = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "➕ Tambah Barang Baru",
        nama: nama,
        barcode: barcode,
        jumlah: stok,
        user: userAktif
    };
    historyTransaksi.unshift(logHistory);
    localStorage.setItem("historyTransaksi", JSON.stringify(historyTransaksi));

    // 3. Sync Real-Time ke Google Sheets
    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "BARANG BARU",
        barcode: barcode,
        namaBarang: nama,
        jumlah: stok,
        user: userAktif,
        keterangan: "Pendaftaran Barang Baru"
    });

    // 4. Update Tampilan Dashboard
    if (typeof updateDashboardStats === "function") updateDashboardStats();

    // 5. Tutup modal dan beri tahu pengguna
    tutupTambahBarang();
    alert(`✅ Barang Baru Berhasil Ditambahkan!\n\nNama: ${nama}\nBarcode: ${barcode}\nStok: ${stok}`);

    // Tampilkan detail barang jika fungsinya ada
    if (typeof tampilkanDetailBarang === "function") {
        tampilkanDetailBarang(barangBaru);
    }
}
// ==========================================================
// SCAN BARCODE KHUSUS FORM TAMBAH BARANG BARU
// ==========================================================
function scanUntukTambahBarang() {
    const elModalScan = document.getElementById("modalScan");
    if (elModalScan) elModalScan.style.display = "flex";

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        function (decodedText) {
            if (typeof beep === "function") beep();
            tutupScan();

            const inputBarcode = document.getElementById("tambahBarcode");
            if (inputBarcode) inputBarcode.value = decodedText;
        },
        function (error) {}
    ).catch(err => {
        console.error("Gagal membuka kamera:", err);
        alert("📷 Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan!");
        tutupScan();
    });
}
