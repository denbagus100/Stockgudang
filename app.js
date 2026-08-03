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
let targetSelectRakId = null; // Temporary ID untuk target scan barcode rak

// Storage Data
let daftarBarang = JSON.parse(localStorage.getItem("daftarBarang")) || [];
let historyTransaksi = JSON.parse(localStorage.getItem("historyTransaksi")) || [];
let userAktifInfo = JSON.parse(localStorage.getItem("userAktifInfo")) || null;
let userAktif = userAktifInfo ? userAktifInfo.nama : "";
let offlineQueue = JSON.parse(localStorage.getItem("offlineQueue")) || [];

// ==========================================================
// KATA MOTIVASI RANDOM (QUOTE OF THE DAY)
// ==========================================================
const daftarMotivasi = [
    { teks: "Kerapihan dan ketelitian gudang hari ini adalah kelancaran pengiriman esok hari.", penulis: "Tim Gudang" },
    { teks: "Kerja cepat itu bagus, tapi kerja teliti dan aman itu yang utama!", penulis: "Safety First" },
    { teks: "Setiap barang yang tersusun rapi adalah cerminan kerja keras tim yang hebat.", penulis: "Semangat Gudang" },
    { teks: "Stok yang akurat mencegah masalah besar. Terima kasih atas ketelitianmu!", penulis: "WMS System" },
    { teks: "Fokus pada proses, hasil tidak akan pernah mengkhianati usaha.", penulis: "Motivasi Kerja" },
    { teks: "Kesuksesan besar dimulai dari kedisiplinan pada hal-hal kecil di area kerja.", penulis: "Quotes Karyawan" },
    { teks: "Tetap semangat dan utamakan keselamatan kerja di setiap langkah!", penulis: "Warehouse Team" }
];

function tampilkanMotivasiRandom() {
    const elTeks = document.getElementById("teksMotivasi");
    const elPenulis = document.getElementById("penulisMotivasi");

    if (!elTeks || !elPenulis) return;

    const acak = Math.floor(Math.random() * daftarMotivasi.length);
    const item = daftarMotivasi[acak];

    elTeks.innerText = `"${item.teks}"`;
    elPenulis.innerText = `— ${item.penulis}`;
}

// ==========================================================
// 2. INITIALIZATION & SYSTEM LOGIN
// ==========================================================
document.addEventListener("DOMContentLoaded", function () {
    // 1. Cek Status Login DULUAN agar tidak berbayang saat refresh
    cekStatusLogin();

    // 2. Load Data User NIK dari Google Sheets
    loadUserDariSheet();

    // 3. Tampilkan Kata Motivasi Random
    tampilkanMotivasiRandom();

    // 4. Logika Ingat NIK
    muatNikTersimpan();

    // 5. Tampilkan Tanggal Hari Ini
    const sekarang = new Date();
    const elTanggal = document.getElementById("tanggal");
    if (elTanggal) {
        elTanggal.innerHTML = sekarang.toLocaleDateString("id-ID", {
            weekday: "long", day: "numeric", month: "long", year: "numeric"
        });
    }

    // 6. Load Data Stok dari Google Sheets
    loadDataStokDariSheet();

    // 7. Status Jaringan
    updateStatusJaringan();

    // 8. Load Mode Gelap (Dark Mode)
    const isDarkMode = localStorage.getItem("darkMode") === "true";
    if (isDarkMode) document.body.classList.add("dark-mode");
    const toggleSwitch = document.getElementById("toggleDarkMode");
    if (toggleSwitch) toggleSwitch.checked = isDarkMode;

    // 9. Pasang Scanner Laser HHT (Enter Otomatis)
    pasangHHTEnter("keyword", cariBarang);
    pasangHHTEnter("tambahBarcode", () => document.getElementById("tambahNama")?.focus());
    pasangHHTEnter("jumlahIN", simpanStockIn);
    pasangHHTEnter("jumlahOUT", simpanStockOut);
    pasangHHTEnter("jumlahMove", simpanMoveBarang);
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

// Memuat data NIK & Password dari Google Sheets ke LocalStorage
function loadUserDariSheet() {
    if (!GOOGLE_SHEET_URL || !navigator.onLine) return;

    fetch(GOOGLE_SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ token: API_SECRET_TOKEN, aksi: "getSemuaUser" })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "success" && res.data.length > 0) {
            localStorage.setItem("databaseUser", JSON.stringify(res.data));
            console.log(`✅ Berhasil memuat ${res.data.length} Akun NIK dari Google Sheets`);
        }
    })
    .catch(err => console.error("❌ Gagal memuat user dari Google Sheets:", err));
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
        showToast(`🔓 Login Berhasil! Selamat Datang, ${akunDitemukan.nama}`, "success");
    } else {
        showToast("❌ NIK atau Password salah!", "error");
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
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ token: API_SECRET_TOKEN, aksi: "getSemuaBarang" })
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === "success" && res.data.length > 0) {
            daftarBarang = res.data.map(item => ({
                ...item,
                barcode: String(item.barcode || "").trim()
            }));
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

    // 1. Total Barang
    const elTotal = document.getElementById("totalBarang");
    if (elTotal) elTotal.innerHTML = daftarBarang.length;

    // 2. Barang Hampir Expired (<= 30 Hari)
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

    // 3. Barang Stok Minimum / Hampir Habis
    const totalStokMin = daftarBarang.filter(item => {
        const batasMin = item.stokMin !== undefined ? Number(item.stokMin) : 5;
        return Number(item.stok || 0) <= batasMin;
    }).length;

    const elStokMin = document.getElementById("stokMin");
    if (elStokMin) elStokMin.innerHTML = totalStokMin;
}

// ==========================================================
// 4. LOGIKA MULTI-RAK (AUTO-SPLIT KOMA & PEMBAGIAN STOK)
// ==========================================================

function dapatkanListRak(barang) {
    if (!barang) return [];

    if (Array.isArray(barang.detailRak) && barang.detailRak.length > 0) {
        return barang.detailRak;
    }

    if (barang.lokasi && barang.lokasi !== "-") {
        const pisahRak = barang.lokasi.split(",").map(r => r.trim()).filter(r => r !== "");
        
        if (pisahRak.length > 1) {
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

    barang.detailRak = [{ rak: "Utama / Transit", qty: Number(barang.stok || 0) }];
    return barang.detailRak;
}

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

function isiDropdownPilihanRak(selectElemId) {
    const elSelect = document.getElementById(selectElemId);
    if (!elSelect || !barangAktif) return;

    const listRak = dapatkanListRak(barangAktif);

    if (!listRak || listRak.length === 0) {
        elSelect.innerHTML = `<option value="Utama / Transit">Rak Utama (Stok: ${barangAktif.stok || 0} pcs)</option>`;
        return;
    }

    let optionsHtml = listRak.map(r => 
        `<option value="${r.rak}">Rak ${r.rak} (Stok: ${r.qty} pcs)</option>`
    ).join("");
    
    elSelect.innerHTML = optionsHtml;
}

function tambahBarisRakBaru() {
    if (!barangAktif) return;
    
    const rakBaru = prompt("Masukkan Nama Rak Baru (Contoh: B atau Rak C-02):");
    if (!rakBaru || !rakBaru.trim()) return;

    const listRak = dapatkanListRak(barangAktif);

    const eksis = listRak.find(r => r.rak.toLowerCase() === rakBaru.trim().toLowerCase());
    if (eksis) return showToast("⚠️ Rak ini sudah ada dalam daftar!", "warning");

    const qtyAwal = Number(prompt(`Masukkan Jumlah Stok awal di Rak ${rakBaru.trim()}:`, "0")) || 0;

    barangAktif.detailRak.push({ rak: rakBaru.trim(), qty: qtyAwal });
    barangAktif.stok = barangAktif.detailRak.reduce((acc, curr) => acc + Number(curr.qty), 0);
    barangAktif.lokasi = barangAktif.detailRak.map(r => r.rak).join(", ");

    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));
    if (typeof syncKeGoogleSheet === "function") syncKeGoogleSheet();
    
    tampilkanDetailBarang(barangAktif);
    showToast(`✅ Rak ${rakBaru.trim()} berhasil ditambahkan!`, "success");
}

function hapusBarisRak(index) {
    if (!barangAktif) return;
    const listRak = dapatkanListRak(barangAktif);

    if (listRak.length <= 1) {
        return showToast("⚠️ Minimal harus ada 1 lokasi rak!", "warning");
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

// ==========================================================
// 5. OPERASI TRANSAKSI (STOCK IN, OUT, MOVE)
// ==========================================================
function simpanStockIn() {
    if (!barangAktif) return showToast("Scan atau cari barang terlebih dahulu.", "warning");

    const jumlah = Number(document.getElementById("jumlahIN").value);
    if (isNaN(jumlah) || jumlah <= 0) return showToast("Masukkan jumlah yang benar.", "warning");

    const rakTujuan = document.getElementById("selectRakIN")?.value || "Utama / Transit";
    const listRak = dapatkanListRak(barangAktif);
    let targetRak = listRak.find(r => r.rak === rakTujuan);

    if (targetRak) {
        targetRak.qty += jumlah;
    } else {
        listRak.push({ rak: rakTujuan, qty: jumlah });
    }

    barangAktif.detailRak = listRak;
    barangAktif.stok = listRak.reduce((acc, curr) => acc + Number(curr.qty), 0);
    barangAktif.lokasi = listRak.map(r => r.rak).join(", ");

    const log = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "📥 Stock IN",
        nama: barangAktif.nama,
        barcode: barangAktif.barcode,
        jumlah: jumlah,
        user: userAktif,
        keterangan: `Masuk ke Rak ${rakTujuan}`
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
        keterangan: `Masuk ke Rak ${rakTujuan}`
    });

    tutupStockIn();
    tampilkanDetailBarang(barangAktif);
    document.getElementById("jumlahIN").value = "";
    showToast(`✅ Stock IN ${jumlah} pcs ke Rak ${rakTujuan} berhasil!`, "success");
}

function simpanStockOut() {
    if (!barangAktif) return showToast("Scan atau cari barang terlebih dahulu.", "warning");

    const jumlah = Number(document.getElementById("jumlahOUT").value);
    if (isNaN(jumlah) || jumlah <= 0) return showToast("Masukkan jumlah yang benar.", "warning");

    const rakAsal = document.getElementById("selectRakOUT")?.value || "Utama / Transit";
    const listRak = dapatkanListRak(barangAktif);
    let targetRak = listRak.find(r => r.rak === rakAsal);

    if (!targetRak || targetRak.qty < jumlah) {
        return showToast(`❌ Stok di Rak ${rakAsal} tidak mencukupi!`, "error");
    }

    targetRak.qty -= jumlah;
    barangAktif.detailRak = listRak;
    barangAktif.stok = listRak.reduce((acc, curr) => acc + Number(curr.qty), 0);
    barangAktif.lokasi = listRak.map(r => r.rak).join(", ");

    const log = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "📤 Stock OUT",
        nama: barangAktif.nama,
        barcode: barangAktif.barcode,
        jumlah: jumlah,
        user: userAktif,
        keterangan: `Keluar dari Rak ${rakAsal}`
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
        keterangan: `Keluar dari Rak ${rakAsal}`
    });

    tutupStockOut();
    tampilkanDetailBarang(barangAktif);
    document.getElementById("jumlahOUT").value = "";
    showToast(`✅ Stock OUT ${jumlah} pcs dari Rak ${rakAsal} berhasil!`, "success");
}

function bukaMoveBarang() {
    if (!barangAktif) return showToast("Pilih barang terlebih dahulu.", "warning");

    document.getElementById("moveNamaBarang").innerText = barangAktif.nama;
    document.getElementById("moveBarcode").innerText = barangAktif.barcode;
    document.getElementById("jumlahMove").value = "";

    const listRak = dapatkanListRak(barangAktif);

    // Isi Dropdown Asal
    const elAsal = document.getElementById("selectRakMoveAsal");
    if (elAsal) elAsal.innerHTML = listRak.map(r => `<option value="${r.rak}">Rak ${r.rak} (Stok: ${r.qty} pcs)</option>`).join("");

    // Isi Dropdown Tujuan
    const elTujuan = document.getElementById("selectRakMoveTujuan");
    if (elTujuan) {
        let optionsTujuan = listRak.map(r => `<option value="${r.rak}">Rak ${r.rak}</option>`).join("");
        optionsTujuan += `<option value="NEW_RAK">+ Buat Rak Tujuan Baru...</option>`;
        elTujuan.innerHTML = optionsTujuan;

        elTujuan.focus();
        hubungkanLaserHHTKeSelect("selectRakMoveTujuan");
    }

    document.getElementById("modalMove").style.display = "flex";
}

function tutupMoveBarang() { 
    document.getElementById("modalMove").style.display = "none"; 
}

function simpanMoveBarang() {
    if (!barangAktif) return;

    const rakAsal = document.getElementById("selectRakMoveAsal").value;
    let rakTujuan = document.getElementById("selectRakMoveTujuan").value;
    const qtyPindah = Number(document.getElementById("jumlahMove").value);

    if (!qtyPindah || qtyPindah <= 0) {
        return showToast("⚠️ Masukkan jumlah pcs pindah yang valid!", "warning");
    }

    if (rakTujuan === "NEW_RAK") {
        const inputBaru = prompt("Masukkan Nama Rak Tujuan Baru (Contoh: B atau C-01):");
        if (!inputBaru || !inputBaru.trim()) return showToast("⚠️ Nama rak tujuan tidak boleh kosong!", "warning");
        rakTujuan = inputBaru.trim();
    }

    if (rakAsal === rakTujuan) {
        return showToast("⚠️ Rak Asal dan Rak Tujuan tidak boleh sama!", "warning");
    }

    const listRak = dapatkanListRak(barangAktif);
    const itemAsal = listRak.find(r => r.rak === rakAsal);

    if (!itemAsal || itemAsal.qty < qtyPindah) {
        return showToast(`⚠️ Stok di Rak ${rakAsal} tidak mencukupi!`, "error");
    }

    // Process Move
    itemAsal.qty -= qtyPindah;
    let itemTujuan = listRak.find(r => r.rak === rakTujuan);
    if (itemTujuan) {
        itemTujuan.qty += qtyPindah;
    } else {
        listRak.push({ rak: rakTujuan, qty: qtyPindah });
    }

    barangAktif.detailRak = listRak;
    barangAktif.stok = listRak.reduce((acc, curr) => acc + Number(curr.qty), 0);
    barangAktif.lokasi = listRak.map(r => r.rak).join(", ");

    const log = {
        waktu: new Date().toLocaleString("id-ID"),
        jenis: "🔄 MOVE",
        nama: barangAktif.nama,
        barcode: barangAktif.barcode,
        jumlah: qtyPindah,
        user: userAktif,
        keterangan: `Pindah dari Rak ${rakAsal} ke Rak ${rakTujuan}`
    };

    historyTransaksi.unshift(log);
    localStorage.setItem("historyTransaksi", JSON.stringify(historyTransaksi));
    localStorage.setItem("daftarBarang", JSON.stringify(daftarBarang));

    syncKeGoogleSheet();
    kirimTransaksiKeGoogleSheet({
        jenis: "MOVE LOCATION",
        barcode: barangAktif.barcode,
        namaBarang: barangAktif.nama,
        jumlah: qtyPindah,
        user: userAktif,
        keterangan: `Pindah dari Rak ${rakAsal} ke Rak ${rakTujuan}`
    });

    tutupMoveBarang();
    tampilkanDetailBarang(barangAktif);
    showToast(`✅ Berhasil pindah ${qtyPindah} pcs dari Rak ${rakAsal} ke ${rakTujuan}!`, "success");
}

// ==========================================================
// 6. MODAL POPUP HELPERS & FILTER STOK MINIMUM
// ==========================================================
function bukaStockIn() {
    if (!barangAktif) return showToast("Pilih barang terlebih dahulu.", "warning");
    document.getElementById("inNamaBarang").innerText
