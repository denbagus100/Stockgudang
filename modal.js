// ==========================
// STOCK IN
// ==========================
function bukaStockIn(){

    if(!barangAktif){
        alert("Scan atau cari barang terlebih dahulu.");
        return;
    }

    document.getElementById("inNamaBarang").innerHTML = barangAktif.nama;
    document.getElementById("inBarcode").innerHTML = barangAktif.barcode;
    document.getElementById("inStok").innerHTML = barangAktif.stok;

    document.getElementById("jumlahIN").value = "";

    document.getElementById("modalStockIn").style.display = "flex";
}

function tutupStockIn(){

    document.getElementById("modalStockIn").style.display = "none";
    
}

// ==========================
// STOCK OUT
// ==========================
function bukaStockOut(){

    if(!barangAktif){
        alert("Scan atau cari barang terlebih dahulu.");
        return;
    }

    document.getElementById("outNamaBarang").innerHTML = barangAktif.nama;
    document.getElementById("outBarcode").innerHTML = barangAktif.barcode;
    document.getElementById("outStok").innerHTML = barangAktif.stok;

    document.getElementById("jumlahOUT").value = "";

    document.getElementById("modalStockOut").style.display = "flex";
}

function tutupStockOut(){

    document.getElementById("modalStockOut").style.display = "none";
}



// ==========================
// MOVE
// ==========================
function bukaMove(){

    if(!barangAktif){
        alert("Scan atau cari barang terlebih dahulu.");
        return;
    }

    document.getElementById("moveNamaBarang").innerHTML = barangAktif.nama;
    document.getElementById("moveLokasi").innerHTML = barangAktif.lokasi;

    document.getElementById("lokasiBaru").value = "";

    document.getElementById("modalMove").style.display = "flex";
}

function tutupMove(){

    document.getElementById("modalMove").style.display = "none";
}
// Tutup popup jika klik area gelap
window.onclick = function(e){

    if(e.target == document.getElementById("modalStockIn")){
        tutupStockIn();
    }

    if(e.target == document.getElementById("modalStockOut")){
        tutupStockOut();
    }

    if(e.target == document.getElementById("modalMove")){
        tutupMove();
    }

}
// ==========================
// HISTORY TRANSAKSI
// ==========================
function bukaHistory(){

    document.getElementById("modalHistory").style.display = "flex";

}

function tutupHistory(){

    document.getElementById("modalHistory").style.display = "none";

}
// ==========================
// DAFTAR STOK BARANG
// ==========================
function bukaDaftarStok(){
    if(typeof tampilkanSemuaStok === "function"){
        tampilkanSemuaStok();
    }
    document.getElementById("modalDaftarStok").style.display = "flex";
}

function tutupDaftarStok(){
    document.getElementById("modalDaftarStok").style.display = "none";
}

// Tambahkan juga penutupan modal jika mengklik luar area
const modalStok = document.getElementById("modalDaftarStok");
window.addEventListener("click", function(e) {
    if(e.target === modalStok) {
        tutupDaftarStok();
    }
});
// ==========================
// MODAL EXPIRED BARANG
// ==========================
function bukaExpiredBarang(){
    // Panggil fungsi pemuat data dari app.js
    if(typeof tampilkanBarangExpired === "function"){
        tampilkanBarangExpired();
    }
    document.getElementById("modalExpired").style.display = "flex";
}

function tutupExpiredBarang(){
    document.getElementById("modalExpired").style.display = "none";
}

// Tutup modal jika area luar (overlay) diklik
const modalExpElem = document.getElementById("modalExpired");
window.addEventListener("click", function(e) {
    if(e.target === modalExpElem) {
        tutupExpiredBarang();
    }
});
// ==========================
// MODAL SETTING
// ==========================
function bukaSetting(){
    // Ambil nama user aktif dari localStorage
    const user = localStorage.getItem("userAktif") || "Belum Set";
    const elemNama = document.getElementById("settingUserNama");
    if(elemNama) elemNama.innerText = user;

    document.getElementById("modalSetting").style.display = "flex";
}

function tutupSetting(){
    document.getElementById("modalSetting").style.display = "none";
}

// Tutup modal jika mengklik area luar (overlay)
const modalSettingElem = document.getElementById("modalSetting");
window.addEventListener("click", function(e) {
    if(e.target === modalSettingElem) {
        tutupSetting();
    }
});
// ==========================
// MODAL TAMBAH BARANG
// ==========================
function tutupTambahBarang() {
    const modalTambah = document.getElementById("modalTambahBarang");
    if (modalTambah) {
        modalTambah.style.display = "none";
    }
}

// Tutup modal jika area luar (overlay) diklik
const modalTambahElem = document.getElementById("modalTambahBarang");
window.addEventListener("click", function(e) {
    if (e.target === modalTambahElem) {
        tutupTambahBarang();
    }
});
// ============================================================
// MODAL.JS - Modul Pengelola Pop-Up & UI Interaktif WMS
// ============================================================

/**
 * Membuka modal berdasarkan ID
 * @param {string} modalId 
 */
function bukaModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Menutup modal berdasarkan ID
 * @param {string} modalId 
 */
function tutupModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}
// ============================================================
// MODAL.JS - Modul Pengelola Pop-Up & UI Interaktif WMS
// ============================================================

/**
 * Membuka modal berdasarkan ID
 * @param {string} modalId 
 */
function bukaModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

/**
 * Menutup modal berdasarkan ID
 * @param {string} modalId 
 */
function tutupModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

/**
 * Menampilkan Modal Bantuan / Direct WhatsApp Admin
 * @param {string} nomorWA - Contoh: "6289680162073"
 */
function tampilkanModalAdmin(nomorWA = "6289680162073") {
    // Ambil NIK jika sudah login (opsional)
    const nikInput = document.getElementById('loginNik')?.value || '-';
    const pesanWA = encodeURIComponent(`Halo Admin, saya mengalami kendala pada aplikasi Sistem Gudang.\nNIK: ${nikInput}\nMohon bantuannya.`);
    const urlWA = `https://wa.me/${nomorWA}?text=${pesanWA}`;

    // Buat HTML Modal
    const modalHTML = `
        <div class="modal-content-card">
            <div class="modal-header">
                <h3>💬 Hubungi Admin Gudang</h3>
                <button class="btn-close-x" onclick="tutupModal('modalAdmin')">&times;</button>
            </div>
            <div class="modal-body" style="margin: 15px 0; color: #475569; font-size: 0.95rem;">
                <p>Mengalami kendala saat login atau masalah teknis pada aplikasi? Silakan hubungi admin via WhatsApp.</p>
                <a href="${urlWA}" target="_blank" class="btn-wa-direct">
                   🟢 Chat Admin via WhatsApp
                </a>
            </div>
            <div class="modal-footer">
                <button class="btn-secondary" onclick="tutupModal('modalAdmin')">Tutup</button>
            </div>
        </div>
    `;

    // Cek apakah kontainer modal sudah ada di body, kalau belum buat baru secara otomatis
    let modalContainer = document.getElementById('modalAdmin');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modalAdmin';
        modalContainer.className = 'custom-modal-overlay';
        document.body.appendChild(modalContainer);
    }
    
    modalContainer.innerHTML = modalHTML;
    bukaModal('modalAdmin');
}

/**
 * Toggle Password Visibility (Lihat/Sembunyikan Password)
 * @param {string} inputId 
 * @param {HTMLElement} iconElem 
 */
function toggleLihatPassword(inputId, iconElem) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        if (iconElem) iconElem.textContent = '🙈';
    } else {
        input.type = 'password';
        if (iconElem) iconElem.textContent = '👁️';
    }
}
