// ==========================================================
// 0. GLOBAL ERROR HANDLER (MENCEGAH LAYAR BLANK PUTIH)
// ==========================================================
window.addEventListener('error', function (e) {
    console.warn("⚠️ Terdeteksi error JS di latar belakang:", e.message);
    return true; 
});

// ==========================================================
// 1. DEKLARASI VARIABEL GLOBAL & INTEGRASI GOOGLE SHEETS
// ==========================================================
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycby2nv7rvaca5oci1cmKBsuLJ07rIlw2lFIzY6AqTqrxw05sZBvhAJ_UgpduflR7NsuD/exec";
const API_SECRET_TOKEN = "WMS_SECRET_TOKEN_2026_SECURE";

let barangAktif = null;
let html5QrCode = null; // Scanner Kamera
let historyScan = [];

// Storage Data
let daftarBarang = JSON.parse(localStorage.getItem("daftarBarang")) || [];
let historyTransaksi = JSON.parse(localStorage.getItem("historyTransaksi")) || [];
let userAktifInfo = JSON.parse(localStorage.getItem("userAktifInfo")) || null;
let userAktif = userAktifInfo ? userAktifInfo.nama : "";
let offlineQueue = JSON.parse(localStorage.getItem("offlineQueue")) || [];

// ==========================================================
// 2. INITIALIZATION & SYSTEM LOGIN
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. Cek Status Login DULUAN agar tidak berbayang saat refresh
    cekStatusLogin();

    // 2. Logika Ingat NIK
    muatNikTersimpan();

    // 3. Tampilkan Tanggal Hari Ini
    const sekarang = new Date();
    const elTanggal = document.getElementById("tanggal");
    if (elTanggal) {
        elTanggal.innerHTML = sekarang.toLocaleDateString("id-ID", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
    }

    // 4. Load Data Stok dari Google Sheets
    loadDataStokDariSheet();

    // 5. Status Jaringan
    updateStatusJaringan();

    // 6. Load Mode Gelap (Dark Mode)
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if (isDarkMode) document.body.classList.add("dark-mode");
    const toggleSwitch = document.getElementById("toggleDarkMode");
    if (toggleSwitch) toggleSwitch.checked = isDarkMode;

    // 7. Pasang Scanner Laser HHT (Enter Otomatis)
    pasangHHTEnter("keyword", cariBarang);
    pasangHHTEnter("tambahBarcode", () => document.getElementById("tambahNama")?.focus());
    pasangHHTEnter("jumlahIN", simpanStockIn);
    pasangHHTEnter("jumlahOUT", simpanStockOut);
    pasangHHTEnter("lokasiBaru", simpanMove);
});

window.addEventListener('online', updateStatusJaringan);
window.addEventListener('offline', updateStatusJaringan);

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
    const elNetworkBanner = document.getElementById("networkBanner");

    if (userAktifInfo && userAktifInfo.nik) {
        // SUDAH LOGIN -> Tampilkan Dashboard
        if (elHalamanLogin) elHalamanLogin.style.display = "none";
        if (elMainApp) elMainApp.style.display = "block";
        if (elNetworkBanner) elNetworkBanner.style.display = "flex";
        
        document.body.style.backgroundColor = "#f5f7fb";
        userAktif = userAktifInfo.nama || userAktifInfo.nik;
        terapkanAksesRole();
    } else {
        // BELUM LOGIN -> Tampilkan Halaman Login
        if (elMainApp) elMainApp.style.display = "none";
        if (elHalamanLogin) elHalamanLogin.style.display = "flex";
        if (elNetworkBanner) elNetworkBanner.style.display = "none";
        
        document.body.style.backgroundColor = "#0f172a";
    }

    // Munculkan layar secara instan & mulus
    document.body.classList.add("ready");
}


function muatNikTersimpan() {
    const savedNik = localStorage.getItem("saved_nik");
    const inputNik = document.getElementById("loginNik") || document.getElementById("inputNik");
    const chkRemember = document.getElementById("rememberNik");

    if (savedNik && inputNik) {
        inputNik.value = savedNik;
        if (chkRemember) chkRemember.checked = true;
    }
}

function handleLogin(event) {
    prosesLogin(event);
}

function prosesLogin(event) {
    if (event) event.preventDefault();

    const inputNikElem = document.getElementById("loginNik") || document.getElementById("inputNik");
    const inputPassElem = document.getElementById("loginPassword") || document.getElementById("inputPassword");
    const rememberCheckbox = document.getElementById("rememberNik");

    if (!inputNikElem || !inputPassElem) return;

    const nikInput = inputNikElem.value.trim();
    const passwordInput = inputPassElem.value.trim();
    const isRememberChecked = rememberCheckbox ? rememberCheckbox.checked : false;

    if (isRememberChecked && nikInput) {
        localStorage.setItem("saved_nik", nikInput);
    } else {
        localStorage.removeItem("saved_nik");
    }

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

        cekStatusLogin();
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

        cekStatusLogin();
    }
}

// ==========================================================
// 3. INTEGRASI GOOGLE SHEETS API & STATUS JARINGAN
// ==========================================================
function updateStatusJaringan() {
    const banner = document.getElementById("networkBanner");
    const icon = document.getElementById("networkIcon");
    const text = document.getElementById("networkText");

    if (!banner) return;

    if (navigator.onLine) {
        banner.className = "network-banner online";
        if (icon) icon.textContent = "🟢";
        if (text) text.textContent = "Terhubung Ke Server (Online)";
        prosesOfflineQueue();
    } else {
        banner.className = "network-banner offline";
        if (icon) icon.textContent = "🔴";
        if (text) text.textContent = "Mode Offline (Data tersimpan di HP)";
    }
    updateBadgeQueue();
}

function updateBadgeQueue() {
    const badge = document.getElementById("syncQueueBadge");
    if (!badge) return;
    
    if (offlineQueue.length > 0) {
        badge.style.display = "inline-block";
        badge.textContent = `${offlineQueue.length} Pending`;
    } else {
        badge.style.display = "none";
    }
}

function simpanKeQueue(transaksi) {
    offlineQueue.push(transaksi);
    localStorage.setItem("offlineQueue", JSON.stringify(offlineQueue));
    updateBadgeQueue();
}

function prosesOfflineQueue() {
    if (offlineQueue.length === 0 || !navigator.onLine) return;

    console.log("🔄 Mengirim transaksi pending ke Google Sheets...");
    const queueCopy = [...offlineQueue];

    queueCopy.forEach(trx => {
        kirimTransaksiKeGoogleSheet(trx);
    });

    offlineQueue = [];
    localStorage.removeItem("offlineQueue");
    updateBadgeQueue();
}

function loadDataStokDariSheet() {
    if (!GOOGLE_SHEET_URL || !navigator.onLine) return;

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        body: JSON.stringify({ token: API_SECRET_TOKEN, aksi: "getSemuaBarang" })
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
    if (!GOOGLE_SHEET_URL || !navigator.onLine) return;

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: API_SECRET_TOKEN,
            aksi: "syncSemuaBarang",
            barang: daftarBarang
        })
    })
    .then(() => console.log("☁️ Sync data stok ke Google Sheets berhasil!"))
    .catch(err => console.error("❌ Gagal sync Google Sheets:", err));
}

function kirimTransaksiKeGoogleSheet(transaksi) {
    if (!GOOGLE_SHEET_URL) return;

    if (!navigator.onLine) {
        simpanKeQueue(transaksi);
        return;
    }

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: API_SECRET_TOKEN,
            aksi: "catatTransaksi",
            transaksi: transaksi
        })
    })
    .then(() => console.log("📝 Catatan transaksi terkirim ke Google Sheets!"))
    .catch(err => {
        console.error("❌ Gagal kirim transaksi, masuk ke antrean offline:", err);
        simpanKeQueue(transaksi);
    });
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
// 4. OPERASI TRANSAKSI (STOCK IN, OUT, MOVE)
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
    tutupStockIn();
    document.getElementById("jumlahIN").value = "";
    alert("✅ Stock IN berhasil & Data tersimpan!");
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
    tutupStockOut();
    document.getElementById("jumlahOUT").value = "";
    alert("✅ Stock OUT berhasil & Data tersimpan!");
}

function simpanMove() {
    if (!barangAktif) return alert("Scan atau cari barang terlebih dahulu.");

    const lokasiBaru = document.getElementById("lokasiBaru").value.trim();
    if (lokasiBaru === "") return alert("Masukkan lokasi baru.");

    const lokasiLama = barangAktif.lokasi;
    barangAktif.lokasi = lokasiBaru;

    document.getElementById("lokasiBarang").innerHTML = barangAktif.lokasi;

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
    tutupMove();
    document.getElementById("lokasiBaru").value = "";
    alert("✅ Lokasi berhasil dipindahkan!");
}

// ==========================================================
// 5. MODAL POPUP HELPERS
// ==========================================================
function bukaStockIn() {
    if (!barangAktif) return alert("Pilih barang terlebih dahulu.");
    document.getElementById("inNamaBarang").innerText = barangAktif.nama;
    document.getElementById("inBarcode").innerText = barangAktif.barcode;
    document.getElementById("inStok").innerText = barangAktif.stok;
    document.getElementById("modalStockIn").style.display = "flex";
}
function tutupStockIn() { document.getElementById("modalStockIn").style.display = "none"; }

function bukaStockOut() {
    if (!barangAktif) return alert("Pilih barang terlebih dahulu.");
    document.getElementById("outNamaBarang").innerText = barangAktif.nama;
    document.getElementById("outBarcode").innerText = barangAktif.barcode;
    document.getElementById("outStok").innerText = barangAktif.stok;
    document.getElementById("modalStockOut").style.display = "flex";
}
function tutupStockOut() { document.getElementById("modalStockOut").style.display = "none"; }

function bukaMove() {
    if (!barangAktif) return alert("Pilih barang terlebih dahulu.");
    document.getElementById("moveNamaBarang").innerText = barangAktif.nama;
    document.getElementById("moveLokasi").innerText = barangAktif.lokasi || "-";
    document.getElementById("modalMove").style.display = "flex";
}
function tutupMove() { document.getElementById("modalMove").style.display = "none"; }

function bukaExpiredBarang() {
    const container = document.getElementById("tabelExpiredContainer");
    if (!container) return;

    const skrg = new Date();
    const listExp = daftarBarang.filter(item => {
        if (!item.expired || item.expired === "-") return false;
        const expDate = new Date(item.expired);
        if (isNaN(expDate.getTime())) return false;
        const selisihHari = Math.ceil((expDate - skrg) / (1000 * 60 * 60 * 24));
        return selisihHari <= 30;
    });

    if (listExp.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding:15px; color:#16a34a;'><b>🟢 Semuanya Aman! Tidak ada barang mendekati expired.</b></p>";
    } else {
        let html = `<table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
            <thead><tr style="background:#fee2e2; color:#991b1b;"><th style="padding:8px;">Barang</th><th style="padding:8px;">Expired</th></tr></thead><tbody>`;
        listExp.forEach(b => {
            html += `<tr style="border-bottom:1px solid #fecaca;"><td style="padding:8px;"><b>${b.nama}</b><br><small>${b.barcode}</small></td><td style="padding:8px;">${b.expired}<br><small style="color:#dc2626;">${cekExpired(b.expired)}</small></td></tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
    }
    document.getElementById("modalExpired").style.display = "flex";
}
function tutupExpiredBarang() { document.getElementById("modalExpired").style.display = "none"; }

function bukaHistory() {
    const elContainer = document.getElementById("historyTransaksi");
    if (!elContainer) return;

    if (historyTransaksi.length === 0) {
        elContainer.innerHTML = "<p style='text-align:center; color:#64748b;'>Belum ada transaksi recorded.</p>";
    } else {
        let html = "<ul style='list-style:none; padding:0; font-size:13px;'>";
        historyTransaksi.slice(0, 50).forEach(log => {
            html += `<li style='border-bottom:1px solid #cbd5e1; padding:8px 0;'>
                <b>${log.jenis}</b> - ${log.nama} (${log.jumlah || 0} pcs)<br>
                <small style='color:#64748b;'>⏱️ ${log.waktu} | 👤 ${log.user}</small>
            </li>`;
        });
        html += "</ul>";
        elContainer.innerHTML = html;
    }
    document.getElementById("modalHistory").style.display = "flex";
}
function tutupHistory() { document.getElementById("modalHistory").style.display = "none"; }

function bukaSetting() { document.getElementById("modalSetting").style.display = "flex"; }
function tutupSetting() { document.getElementById("modalSetting").style.display = "none"; }

// ==========================================================
// 6. SCANNER & PENCARIAN BARANG
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
            } else {
                alert("❌ Barang dengan barcode " + decodedText + " tidak ditemukan.");
            }
        },
        function () {}
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
            beep();
            tutupScan();

            const inputBarcode = document.getElementById("tambahBarcode");
            if (inputBarcode) inputBarcode.value = decodedText;
        },
        function () {}
    ).catch(err => {
        console.error("Gagal membuka kamera:", err);
        alert("📷 Tidak dapat mengakses kamera!");
        tutupScan();
    });
}

function tutupScan() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            document.getElementById("modalScan").style.display = "none";
        }).catch(() => {
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

    renderDetailRak(barang);
}

function renderDetailRak(barang) {
    const container = document.getElementById("rakDetailContainer");
    if (!container) return;

    let listRak = [];
    if (Array.isArray(barang.detailRak)) {
        listRak = barang.detailRak;
    } else if (barang.lokasi) {
        listRak = [{ rak: barang.lokasi, qty: barang.stok }];
    } else {
        listRak = [{ rak: "Transit / Belum Ditentukan", qty: barang.stok }];
    }

    let html = `
        <div class="rak-list-container">
            <div style="font-size: 0.85rem; font-weight: bold; color: #64748b; margin-bottom: 6px;">
                📍 Rincian Stok Per Rak:
            </div>
    `;

    listRak.forEach(item => {
        html += `
            <div class="rak-item">
                <span class="rak-nama">📦 ${item.rak}</span>
                <span class="rak-qty">${item.qty} pcs</span>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ==========================================================
// 7. KELOLA USER (ADMIN) & TAMBAH BARANG
// ==========================================================
function tambahUserBaruPrompt() {
    if (!userAktifInfo || userAktifInfo.role !== "admin") return alert("⛔ Hanya Admin yang bisa menambah NIK baru.");

    const nikBaru = prompt("Masukkan NIK Karyawan Baru:");
    if (!nikBaru || !nikBaru.trim()) return;

    let users = getDatabaseUser();
    if (users.find(u => String(u.nik) === nikBaru.trim())) return alert("⚠️ NIK sudah terdaftar!");

    const namaBaru = prompt("Masukkan Nama Lengkap Karyawan:");
    if (!namaBaru || !namaBaru.trim()) return;

    const passBaru = prompt("Masukkan Password:");
    if (!passBaru || !passBaru.trim()) return;

    const roleBaru = confirm("Jadikan akun ini ADMIN?\n[OK] = Admin | [Batal] = Staff") ? "admin" : "staff";

    users.push({ nik: nikBaru.trim(), password: passBaru.trim(), role: roleBaru, nama: namaBaru.trim() });
    localStorage.setItem("databaseUser", JSON.stringify(users));
    alert(`✅ User ${namaBaru} berhasil ditambahkan!`);
}

function kelolaDanHapusUser() {
    if (!userAktifInfo || userAktifInfo.role !== "admin") return alert("⛔ Hanya Admin yang bisa menghapus user.");

    let users = getDatabaseUser();
    let pesan = "📋 DAFTAR NIK TERDAFTAR:\n";
    users.forEach((u, i) => { pesan += `${i + 1}. NIK: ${u.nik} | ${u.nama} (${u.role.toUpperCase()})\n`; });
    pesan += "\nMasukkan NIK yang ingin DIHAPUS:";

    const nikHapus = prompt(pesan);
    if (!nikHapus || !nikHapus.trim()) return;

    const index = users.findIndex(u => String(u.nik) === nikHapus.trim());
    if (index !== -1) {
        users.splice(index, 1);
        localStorage.setItem("databaseUser", JSON.stringify(users));
        alert("✅ NIK berhasil dihapus!");
    } else {
        alert("❌ NIK tidak ditemukan.");
    }
}

function bukaTambahBarang(defaultBarcode = "") {
    document.getElementById("tambahBarcode").value = defaultBarcode;
    document.getElementById("modalTambahBarang").style.display = "flex";
}
function tutupTambahBarang() { document.getElementById("modalTambahBarang").style.display = "none"; }

function simpanBarangBaru() {
    const barcode = document.getElementById("tambahBarcode").value.trim();
    const nama = document.getElementById("tambahNama").value.trim();
    const sku = document.getElementById("tambahSku").value.trim();
    const stok = Number(document.getElementById("tambahStok").value);
    const lokasi = document.getElementById("tambahLokasi").value.trim();
    const expired = document.getElementById("tambahExpired").value;

    if (!barcode || !nama || isNaN(stok) || stok < 0) return alert("⚠️ Barcode, Nama, dan Stok Wajib Diisi.");

    const barangBaru = { barcode, nama, sku: sku || "-", stok, lokasi: lokasi || "-", expired: expired || "-" };
    daftarBarang.push(barangBaru);
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "BARANG BARU",
        barcode, namaBarang: nama, jumlah: stok, user: userAktif, keterangan: "Pendaftaran Baru"
    });

    updateDashboardStats();
    tutupTambahBarang();
    tampilkanDetailBarang(barangBaru);
    alert("✅ Barang Baru Berhasil Ditambahkan!");
}

// ==========================================================
// 8. DAFTAR STOK BARANG & UTILS
// ==========================================================
function bukaDaftarStok() {
    document.getElementById("modalDaftarStok").style.display = "flex";
    renderTabelStok(daftarBarang);
}
function tutupDaftarStok() { document.getElementById("modalDaftarStok").style.display = "none"; }

function renderTabelStok(dataList) {
    const container = document.getElementById("tabelStokContainer");
    if (!container) return;

    if (!dataList || dataList.length === 0) {
        container.innerHTML = "<div style='text-align:center; padding:20px; color:#64748b;'>Barang tidak ditemukan.</div>";
        return;
    }

    let html = `<table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left;">
        <thead><tr style="background:#e2e8f0; color:#334155;"><th style="padding:8px;">Barang</th><th style="padding:8px; text-align:center;">Stok</th><th style="padding:8px; text-align:center;">Aksi</th></tr></thead><tbody>`;

    dataList.slice(0, 100).forEach(item => {
        html += `<tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:8px;"><b>${item.nama}</b><br><small style="color:#64748b;">${item.barcode}</small></td>
            <td style="padding:8px; text-align:center;"><b>${item.stok}</b></td>
            <td style="padding:8px; text-align:center;"><button onclick="pilihBarangDariTabel('${item.barcode}')" style="background:#2563eb; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">Pilih</button></td>
        </tr>`;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

function filterTabelStok() {
    const key = document.getElementById("filterStokInput").value.trim().toLowerCase();
    if (!key) return renderTabelStok(daftarBarang);

    const hasil = daftarBarang.filter(i => 
        (i.nama && i.nama.toLowerCase().includes(key)) ||
        (i.barcode && String(i.barcode).toLowerCase().includes(key))
    );
    renderTabelStok(hasil);
}

function pilihBarangDariTabel(barcode) {
    const barang = daftarBarang.find(b => String(b.barcode) === String(barcode));
    if (barang) {
        tutupDaftarStok();
        tampilkanDetailBarang(barang);
    }
}

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

function switchDarkMode(isDark) {
    if (isDark) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "true");
    } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "false");
    }
}

function resetHistory() {
    if (confirm("Yakin ingin menghapus seluruh riwayat transaksi di HP ini?")) {
        historyTransaksi = [];
        localStorage.removeItem("historyTransaksi");
        alert("🗑️ Riwayat transaksi berhasil dibersihkan!");
    }
}
// ============================================================
// LOGIKA PARSING & PISAH MULTI-RAK (AUTO-SPLIT KOMA)
// ============================================================

/**
 * Fungsi Pintar untuk Memisah Rak Gabungan (seperti "A, B" -> ["A", "B"])
 */
function dapatkanListRak(barang) {
    if (!barang) return [];

    // 1. Jika sudah ada detailRak berupa Array dan berisi data valid
    if (Array.isArray(barang.detailRak) && barang.detailRak.length > 0) {
        return barang.detailRak;
    }

    // 2. Jika lokasi berupa teks koma (contoh: "A, B" atau "Rak 1, Rak 2")
    if (barang.lokasi && barang.lokasi !== "-") {
        const pisahRak = barang.lokasi.split(",").map(r => r.trim()).filter(r => r !== "");
        
        if (pisahRak.length > 1) {
            // Bagi stok secara merata atau tempatkan di rak pertama jika dipisah otomatis
            const stokPerRak = Math.floor(Number(barang.stok || 0) / pisahRak.length);
            const sisa = Number(barang.stok || 0) % pisahRak.length;

            barang.detailRak = pisahRak.map((namaRak, idx) => ({
                rak: namaRak,
                qty: idx === 0 ? stokPerRak + sisa : stokPerRak
            }));
            return barang.detailRak;
        } else if (pisahRak.length === 1) {
            barang.detailRak = [{ rak: pisahRak[0], qty: Number(barang.stok || 0) }];
            return barang.detailRak;
        }
    }

    // Default jika belum ada lokasi
    barang.detailRak = [{ rak: "Utama / Transit", qty: Number(barang.stok || 0) }];
    return barang.detailRak;
}

/**
 * Render List Rak per Baris Terpisah di Card Detail Barang
 */
function renderDetailRak(barang) {
    const container = document.getElementById("rakDetailContainer");
    if (!container) return;

    const listRak = dapatkanListRak(barang);

    let html = `
        <div class="rak-list-container" style="margin-top: 12px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.85rem; font-weight: bold; color: #475569; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span>📍 Lokasi Rak & Rincian Stok:</span>
                <button type="button" onclick="tambahBarisRakBaru()" style="background: #2563eb; color: white; border: none; padding: 4px 8px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: bold;">+ Tambah Rak</button>
            </div>
    `;

    listRak.forEach((item, idx) => {
        html += `
            <div class="rak-item" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">
                <span style="font-weight: 600; font-size: 13px; color: #334155;">📦 Rak ${item.rak}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 12px;">${item.qty} pcs</span>
                    <button type="button" onclick="hapusBarisRak(${idx})" style="background: #ef4444; color: white; border: none; padding: 2px 6px; border-radius: 4px; font-size: 10px; cursor: pointer;">🗑️</button>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Mengisi Dropdown Opsi Rak (Tergantung Pilihan Rak A, B, dll)
 */
function isiDropdownPilihanRak(selectElemId) {
    const elSelect = document.getElementById(selectElemId);
    if (!elSelect || !barangAktif) return;

    const listRak = dapatkanListRak(barangAktif);

    let optionsHtml = listRak.map(r => `<option value="${r.rak}">Rak ${r.rak} (Stok: ${r.qty} pcs)</option>`).join("");
    elSelect.innerHTML = optionsHtml;
}

// Tambah Rak Baru
function tambahBarisRakBaru() {
    if (!barangAktif) return;
    
    const rakBaru = prompt("Masukkan Nama Rak Baru (Contoh: B atau Rak C-02):");
    if (!rakBaru || !rakBaru.trim()) return;

    const listRak = dapatkanListRak(barangAktif);

    const eksis = listRak.find(r => r.rak.toLowerCase() === rakBaru.trim().toLowerCase());
    if (eksis) return alert("⚠️ Rak ini sudah ada dalam daftar!");

    const qtyAwal = Number(prompt(`Masukkan Jumlah Stok awal di Rak ${rakBaru.trim()}:`, "0")) || 0;

    barangAktif.detailRak.push({ rak: rakBaru.trim(), qty: qtyAwal });
    barangAktif.stok = barangAktif.detailRak.reduce((acc, curr) => acc + Number(curr.qty), 0);
    barangAktif.lokasi = barangAktif.detailRak.map(r => r.rak).join(", ");

    // Simpan Ke Storage
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));
    if (typeof syncKeGoogleSheet === "function") syncKeGoogleSheet();
    
    tampilkanDetailBarang(barangAktif);
    alert(`✅ Rak ${rakBaru.trim()} berhasil ditambahkan!`);
}

// Hapus Baris Rak
function hapusBarisRak(index) {
    if (!barangAktif) return;
    const listRak = dapatkanListRak(barangAktif);

    if (listRak.length <= 1) {
        return alert("⚠️ Minimal harus ada 1 lokasi rak!");
    }

    const item = listRak[index];
    if (confirm(`Apakah Anda yakin ingin menghapus Rak "${item.rak}"?`)) {
        barangAktif.detailRak.splice(index, 1);
        barangAktif.stok = barangAktif.detailRak.reduce((acc, curr) => acc + Number(curr.qty), 0);
        barangAktif.lokasi = barangAktif.detailRak.map(r => r.rak).join(", ");

        localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));
        if (typeof syncKeGoogleSheet === "function") syncKeGoogleSheet();

        tampilkanDetailBarang(barangAktif);
    }
}
function isiDropdownPilihanRak(selectElemId) {
    const elSelect = document.getElementById(selectElemId);
    if (!elSelect || !barangAktif) return;

    const listRak = dapatkanListRak(barangAktif);

    if (!listRak || listRak.length === 0) {
        elSelect.innerHTML = `<option value="Umum">Rak Utama (Stok: ${barangAktif.stok || 0} pcs)</option>`;
        return;
    }

    let optionsHtml = listRak.map(r => 
        `<option value="${r.rak}">Rak ${r.rak} (Stok: ${r.qty} pcs)</option>`
    ).join("");
    
    elSelect.innerHTML = optionsHtml;
}

function bukaStockIn() {
    if (!barangAktif) return alert("Pilih barang terlebih dahulu.");
    document.getElementById("inNamaBarang").innerText = barangAktif.nama;
    document.getElementById("inBarcode").innerText = barangAktif.barcode;
    document.getElementById("inStok").innerText = barangAktif.stok;
    
    isiDropdownPilihanRak("selectRakIN");
    const elModal = document.getElementById("modalStockIn");
    if (elModal) elModal.style.display = "flex";
}

function bukaStockOut() {
    if (!barangAktif) return alert("Pilih barang terlebih dahulu.");
    document.getElementById("outNamaBarang").innerText = barangAktif.nama;
    document.getElementById("outBarcode").innerText = barangAktif.barcode;
    document.getElementById("outStok").innerText = barangAktif.stok;

    isiDropdownPilihanRak("selectRakOUT");
    const elModal = document.getElementById("modalStockOut");
    if (elModal) elModal.style.display = "flex";
}
