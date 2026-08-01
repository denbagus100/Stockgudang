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
    const elMainApp = document.getElementById("mainApp");

    if (userAktifInfo && userAktifInfo.nik) {
        if (elHalamanLogin) elHalamanLogin.style.display = "none";
        if (elMainApp) elMainApp.style.display = "block"; // Tampilkan Main App
        userAktif = userAktifInfo.nama || userAktifInfo.nik;
        terapkanAksesRole();
    } else {
        if (elMainApp) elMainApp.style.display = "none"; // Sembunyikan Main App
        if (elHalamanLogin) elHalamanLogin.style.display = "flex"; // Tampilkan Form Login
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

        const elHalamanLogin = document.getElementById("halamanLogin");
        const elMainApp = document.getElementById("mainApp");

        if (elHalamanLogin) elHalamanLogin.style.display = "none";
        if (elMainApp) elMainApp.style.display = "block";

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
        const elMainApp = document.getElementById("mainApp");

        if (elMainApp) elMainApp.style.display = "none";
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
                if (typeof tampilRiwayat === "function") tampilRiwayat();
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
// 7. FUNGSI TAMBAH BARANG BARU (TERHUBUNG GOOGLE SHEETS)
// ==========================================================
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

function tutupTambahBarang() {
    const elModal = document.getElementById("modalTambahBarang");
    if (elModal) elModal.style.display = "none";
}

function simpanBarangBaru() {
    const barcode = document.getElementById("tambahBarcode").value.trim();
    const nama = document.getElementById("tambahNama").value.trim();
    const sku = document.getElementById("tambahSku").value.trim();
    const stok = Number(document.getElementById("tambahStok").value);
    const lokasi = document.getElementById("tambahLokasi").value.trim();
    const expired = document.getElementById("tambahExpired").value;

    if (!barcode || !nama || isNaN(stok) || stok < 0) {
        alert("⚠️ Mohon isi Barcode, Nama Barang, dan Jumlah Stok dengan benar.");
        return;
    }

    const barangAda = daftarBarang.find(b => String(b.barcode) === barcode);
    if (barangAda) {
        alert(`⚠️ Barcode ${barcode} sudah terdaftar atas nama: ${barangAda.nama}`);
        return;
    }

    const barangBaru = {
        barcode: barcode,
        nama: nama,
        sku: sku || "-",
        stok: stok,
        lokasi: lokasi || "-",
        expired: expired || "-"
    };

    daftarBarang.push(barangBaru);
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

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

    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "BARANG BARU",
        barcode: barcode,
        namaBarang: nama,
        jumlah: stok,
        user: userAktif,
        keterangan: "Pendaftaran Barang Baru"
    });

    if (typeof updateDashboardStats === "function") updateDashboardStats();

    tutupTambahBarang();
    alert(`✅ Barang Baru Berhasil Ditambahkan!\n\nNama: ${nama}\nBarcode: ${barcode}\nStok: ${stok}`);

    if (typeof tampilkanDetailBarang === "function") {
        tampilkanDetailBarang(barangBaru);
    }
}

// ==========================================================
// 8. UTILITY & UTILS
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
// KELOLA HALAMAN DAFTAR STOK BARANG
// ==========================================================

// 1. Membuka Halaman Daftar Stok & Render Data
function bukaDaftarStok() {
    const elModal = document.getElementById("modalDaftarStok");
    if (elModal) elModal.style.display = "flex";
    
    // Reset pencarian & render tabel
    const elInput = document.getElementById("filterStokInput");
    if (elInput) elInput.value = "";
    
    renderTabelStok(daftarBarang);
}

// 2. Menutup Halaman Daftar Stok
function tutupDaftarStok() {
    const elModal = document.getElementById("modalDaftarStok");
    if (elModal) elModal.style.display = "none";
}

// 3. Render Tabel Stok Ke Layar
function renderTabelStok(dataList) {
    const container = document.getElementById("tabelStokContainer");
    if (!container) return;

    if (!dataList || dataList.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">Barang tidak ditemukan.</div>`;
        return;
    }

    // Tampilkan maksimal 100 barang pertama saat pencarian agar loading cepat
    const dataTampil = dataList.slice(0, 100);

    let html = `
        <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            Menampilkan <b>${dataTampil.length}</b> dari <b>${dataList.length}</b> barang.
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead>
                <tr style="background: #e2e8f0; color: #334155;">
                    <th style="padding: 8px; border-radius: 6px 0 0 6px;">Barang</th>
                    <th style="padding: 8px; text-align: center;">Stok</th>
                    <th style="padding: 8px; border-radius: 0 6px 6px 0; text-align: center;">Aksi</th>
                </tr>
            </thead>
            <tbody>
    `;

    dataTampil.forEach(item => {
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 8px;">
                    <b>${item.nama}</b><br>
                    <small style="color: #64748b;">BC: ${item.barcode} | SKU: ${item.sku || '-'}</small>
                </td>
                <td style="padding: 10px 8px; text-align: center;">
                    <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-weight: bold;">
                        ${item.stok}
                    </span>
                </td>
                <td style="padding: 10px 8px; text-align: center;">
                    <button onclick="pilihBarangDariTabel('${item.barcode}')" style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                        Pilih
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

// 4. Filter Pencarian Real-Time
function filterTabelStok() {
    const key = document.getElementById("filterStokInput").value.trim().toLowerCase();
    
    if (key === "") {
        renderTabelStok(daftarBarang);
        return;
    }

    const hasilFilter = daftarBarang.filter(item => 
        (item.nama && item.nama.toLowerCase().includes(key)) ||
        (item.barcode && String(item.barcode).toLowerCase().includes(key)) ||
        (item.sku && String(item.sku).toLowerCase().includes(key))
    );

    renderTabelStok(hasilFilter);
}

// 5. Pilih Barang dari Tabel dan Buka Detailnya
function pilihBarangDariTabel(barcode) {
    const barang = daftarBarang.find(b => String(b.barcode) === String(barcode));
    if (barang) {
        tutupDaftarStok();
        tampilkanDetailBarang(barang);
    }
}
// ==========================================================
// DUKUNGAN SCANNER LASER HHT (ENTER OTOMATIS)
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. Enter di Pencarian Utama
    pasangHHTEnter("keyword", function () {
        cariBarang();
    });

    // 2. Enter di Barcode Tambah Barang -> Lompat ke Input Nama
    pasangHHTEnter("tambahBarcode", function () {
        const elNama = document.getElementById("tambahNama");
        if (elNama) elNama.focus();
    });

    // 3. Enter di Jumlah Stock IN -> Simpan Otomatis
    pasangHHTEnter("jumlahIN", function () {
        simpanStockIn();
    });

    // 4. Enter di Jumlah Stock OUT -> Simpan Otomatis
    pasangHHTEnter("jumlahOUT", function () {
        simpanStockOut();
    });

    // 5. Enter di Input Lokasi Baru (Move) -> Simpan Otomatis
    pasangHHTEnter("lokasiBaru", function () {
        simpanMove();
    });
});

function pasangHHTEnter(idInput, aksi) {
    const el = document.getElementById(idInput);
    if (el) {
        el.addEventListener("keypress", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
                aksi();
            }
        });
    }
}
