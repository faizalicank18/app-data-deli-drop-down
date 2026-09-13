/**
 * DELIVERY.ID — Database.gs
 * All direct Google Sheets read/write operations, plus the
 * google.script.run entry points the client calls.
 */

/** ============ CONFIG ============ */
// Paste your Spreadsheet ID between the quotes below. Never expose this in the frontend.
var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

var SHEET_TRANSAKSI   = 'TRANSAKSI';
var SHEET_CUSTOMER    = 'MASTER_CUSTOMER';
var SHEET_TUJUAN      = 'MASTER_TUJUAN';
var SHEET_KAPAL       = 'MASTER_KAPAL';
var SHEET_VENDOR      = 'MASTER_VENDOR';
var SHEET_ADMIN       = 'MASTER_ADMIN';
var SHEET_PENGIRIMAN  = 'MASTER_PENGIRIMAN';
var SHEET_STATUS      = 'MASTER_STATUS';

// Kolom A..AB persis sesuai spesifikasi — jangan diubah urutannya.
var TRANSAKSI_HEADERS = [
  'ID', 'Tanggal', 'No STTB', 'No Manifest', 'Nama Customer', 'Tujuan', 'Jumlah Barang',
  'Berat KG', 'Panjang CM', 'Lebar CM', 'Tinggi CM', 'M3', 'KG Volume', 'Chargeable KG',
  'Nama Kapal', 'Closing', 'ETD', 'ETA', 'Serah Terima', 'Bukti Sukses', 'Dokumen POD',
  'Pengiriman', 'Admin', 'Vendor', 'Invoice', 'Keterangan', 'Created At', 'Updated At'
];

var TRANSAKSI_KEYS = [
  'id', 'tanggal', 'noSttb', 'noManifest', 'namaCustomer', 'tujuan', 'jumlahBarang',
  'beratKg', 'panjangCm', 'lebarCm', 'tinggiCm', 'm3', 'kgVolume', 'chargeableKg',
  'namaKapal', 'closing', 'etd', 'eta', 'serahTerima', 'buktiSukses', 'dokumenPod',
  'pengiriman', 'admin', 'vendor', 'invoice', 'keterangan', 'createdAt', 'updatedAt'
];

/** ============ Low-level sheet access ============ */

function getSpreadsheet_() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
    throw new Error('Spreadsheet ID belum diatur di Database.gs.');
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet_(name) {
  var sheet = getSpreadsheet_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" tidak ditemukan.');
  return sheet;
}

/**
 * Generic reader for 3-column master sheets: ID | NAME | AKTIF.
 * Only rows with AKTIF = YA are returned. Reads the whole range once (no repeated calls).
 */
function getActiveMasterList_(sheetName) {
  var sheet = getSheet_(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  var list = [];
  for (var i = 0; i < data.length; i++) {
    var name = data[i][1];
    var aktif = String(data[i][2]).trim().toUpperCase();
    if (name && aktif === 'YA') {
      list.push({ id: data[i][0], name: String(name).trim() });
    }
  }
  return list;
}

/** ============ Master data — client entry points ============ */

function getCustomers()       { return getActiveMasterList_(SHEET_CUSTOMER); }
function getTujuan()          { return getActiveMasterList_(SHEET_TUJUAN); }
function getKapal()           { return getActiveMasterList_(SHEET_KAPAL); }
function getVendor()          { return getActiveMasterList_(SHEET_VENDOR); }
function getAdmin()           { return getActiveMasterList_(SHEET_ADMIN); }
function getJenisPengiriman() { return getActiveMasterList_(SHEET_PENGIRIMAN); }

function getStatus() {
  var sheet = getSheet_(SHEET_STATUS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  var data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  var grouped = {};
  for (var i = 0; i < data.length; i++) {
    var jenis = String(data[i][0]).trim();
    var status = String(data[i][1]).trim();
    if (!jenis || !status) continue;
    if (!grouped[jenis]) grouped[jenis] = [];
    grouped[jenis].push(status);
  }
  return grouped;
}

/**
 * Single call the form makes on load / refresh — fetches every master
 * list in one round trip instead of seven, using the getters above.
 */
function getMasterData() {
  try {
    var customers  = getCustomers();
    var tujuan     = getTujuan();
    var kapal      = getKapal();
    var vendor     = getVendor();
    var admin      = getAdmin();
    var pengiriman = getJenisPengiriman();
    var status     = getStatus();

    var isEmpty = customers.length === 0 && tujuan.length === 0 && kapal.length === 0 &&
                  vendor.length === 0 && admin.length === 0 && pengiriman.length === 0;

    return {
      success: true,
      empty: isEmpty,
      customers: customers,
      tujuan: tujuan,
      kapal: kapal,
      vendor: vendor,
      admin: admin,
      pengiriman: pengiriman,
      status: status
    };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Gagal memuat data master. Periksa koneksi Spreadsheet.' };
  }
}

/** ============ Transaksi — internal helpers ============ */

function findRowBySttb_(sheet, noSttb) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // Kolom C = No STTB
  var target = String(noSttb).trim().toUpperCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toUpperCase() === target) return i + 2; // actual row number
  }
  return -1;
}

function rowToObject_(rowValues) {
  var obj = {};
  for (var i = 0; i < TRANSAKSI_KEYS.length; i++) obj[TRANSAKSI_KEYS[i]] = rowValues[i];
  return obj;
}

function buildRowFromForm_(data, id, calc, createdAt, updatedAt) {
  return [
    id, data.tanggal || '', data.noSttb, data.noManifest || '', data.namaCustomer,
    data.tujuan, data.jumlahBarang || '', data.beratKg || '', data.panjangCm || '',
    data.lebarCm || '', data.tinggiCm || '', calc.m3, calc.kgVolume, calc.chargeableKg,
    data.namaKapal || '', data.closing || '', data.etd || '', data.eta || '',
    data.serahTerima || 'BELUM', data.buktiSukses || 'BELUM ADA', data.dokumenPod || 'BELUM',
    data.pengiriman || '', data.admin || '', data.vendor || '', data.invoice || 'BELUM',
    data.keterangan || '', createdAt, updatedAt
  ];
}

/** ============ Transaksi — client entry points ============ */

function saveTransaction(formData) {
  var check = validateTransaction(formData);
  if (!check.valid) return { success: false, message: check.message };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_(SHEET_TRANSAKSI);

    if (findRowBySttb_(sheet, formData.noSttb) !== -1) {
      return { success: false, duplicate: true, message: 'No STTB sudah terdaftar. Gunakan UPDATE DATA.' };
    }

    var calc = calculateVolume(formData.panjangCm, formData.lebarCm, formData.tinggiCm, formData.beratKg);
    var now = nowJakarta_();
    var id = generateTransactionId(sheet);

    sheet.appendRow(buildRowFromForm_(formData, id, calc, now, now));

    return { success: true, message: 'Data berhasil disimpan.', id: id, calc: calc };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Gagal menyimpan data. Silakan coba lagi.' };
  } finally {
    lock.releaseLock();
  }
}

function updateTransaction(formData) {
  var check = validateTransaction(formData);
  if (!check.valid) return { success: false, message: check.message };

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet = getSheet_(SHEET_TRANSAKSI);
    var row = findRowBySttb_(sheet, formData.noSttb);
    if (row === -1) return { success: false, message: 'No STTB tidak ditemukan.' };

    var calc = calculateVolume(formData.panjangCm, formData.lebarCm, formData.tinggiCm, formData.beratKg);
    var existingId = sheet.getRange(row, 1).getValue();
    var existingCreatedAt = sheet.getRange(row, 27).getValue(); // Kolom AA
    var now = nowJakarta_();

    var rowValues = buildRowFromForm_(formData, existingId, calc, existingCreatedAt, now);
    sheet.getRange(row, 1, 1, rowValues.length).setValues([rowValues]);

    return { success: true, message: 'Data berhasil diperbarui.', id: existingId, calc: calc };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Gagal memperbarui data. Silakan coba lagi.' };
  } finally {
    lock.releaseLock();
  }
}

function searchTransaction(noSttb) {
  if (!noSttb || String(noSttb).trim() === '') {
    return { success: false, message: 'No STTB tidak boleh kosong.' };
  }
  try {
    var sheet = getSheet_(SHEET_TRANSAKSI);
    var row = findRowBySttb_(sheet, noSttb);
    if (row === -1) return { success: false, message: 'No STTB tidak ditemukan.' };

    var values = sheet.getRange(row, 1, 1, TRANSAKSI_HEADERS.length).getValues()[0];
    var obj = formatDatesForClient_(rowToObject_(values));
    return { success: true, data: obj };
  } catch (err) {
    console.error(err);
    return { success: false, message: 'Gagal mencari data. Silakan coba lagi.' };
  }
}
