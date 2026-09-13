/**
 * DELIVERY.ID — Utils.gs
 * Calculation, validation, ID generation, timezone-aware date helpers.
 */

var TIMEZONE = 'Asia/Jakarta';

/**
 * M3          = Panjang × Lebar × Tinggi / 1.000.000
 * KG Volume   = Panjang × Lebar × Tinggi / 4.000
 * Chargeable  = the larger of Berat KG and KG Volume
 */
function calculateVolume(panjangCm, lebarCm, tinggiCm, beratKg) {
  var p = parseFloat(panjangCm) || 0;
  var l = parseFloat(lebarCm) || 0;
  var t = parseFloat(tinggiCm) || 0;
  var berat = parseFloat(beratKg) || 0;

  var m3 = (p * l * t) / 1000000;
  var kgVolume = (p * l * t) / 4000;
  var chargeableKg = berat > kgVolume ? berat : kgVolume;

  return {
    m3: Math.round(m3 * 10000) / 10000,
    kgVolume: Math.round(kgVolume * 100) / 100,
    chargeableKg: Math.round(chargeableKg * 100) / 100
  };
}

function validateTransaction(data) {
  if (!data) return { valid: false, message: 'Data tidak valid.' };

  if (!data.noSttb || String(data.noSttb).trim() === '') {
    return { valid: false, message: 'No STTB wajib diisi.' };
  }
  if (!data.namaCustomer || String(data.namaCustomer).trim() === '') {
    return { valid: false, message: 'Nama Customer wajib diisi.' };
  }
  if (!data.tujuan || String(data.tujuan).trim() === '') {
    return { valid: false, message: 'Tujuan wajib diisi.' };
  }
  if (data.jumlahBarang !== '' && data.jumlahBarang != null && isNaN(Number(data.jumlahBarang))) {
    return { valid: false, message: 'Jumlah Barang harus berupa angka.' };
  }
  if (data.beratKg !== '' && data.beratKg != null && isNaN(Number(data.beratKg))) {
    return { valid: false, message: 'Berat KG harus berupa angka.' };
  }
  var dims = ['panjangCm', 'lebarCm', 'tinggiCm'];
  for (var i = 0; i < dims.length; i++) {
    var v = data[dims[i]];
    if (v !== '' && v != null && isNaN(Number(v))) {
      return { valid: false, message: 'Panjang, Lebar, dan Tinggi harus berupa angka.' };
    }
  }
  return { valid: true };
}

/**
 * Format: DEL-YYYYMMDD-XXXX, unique per day, sequential.
 * Scans existing IDs in column A once (in memory) to find the next sequence.
 */
function generateTransactionId(sheet) {
  var today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMdd');
  var prefix = 'DEL-' + today + '-';
  var lastRow = sheet.getLastRow();
  var maxSeq = 0;

  if (lastRow >= 2) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var id = String(ids[i][0]);
      if (id.indexOf(prefix) === 0) {
        var seq = parseInt(id.substring(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    }
  }

  var seqStr = ('0000' + (maxSeq + 1)).slice(-4);
  return prefix + seqStr;
}

function nowJakarta_() {
  return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/** Normalizes Date objects coming back from Sheets into yyyy-MM-dd for <input type="date">. */
function formatDatesForClient_(obj) {
  var dateFields = ['tanggal', 'closing', 'etd', 'eta'];
  dateFields.forEach(function (f) {
    if (obj[f] instanceof Date) {
      obj[f] = Utilities.formatDate(obj[f], TIMEZONE, 'yyyy-MM-dd');
    }
  });
  return obj;
}
