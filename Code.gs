/**
 * KHO HỒ SƠ PDF - Google Apps Script backend
 * Deploy as Web app: Execute as Me; Who has access: Anyone.
 */
const ROOT_FOLDER_ID = '1gEbTNJIK-pqLu7UFjkhCaMhRVLIPEdkV';
const STATS_PROPERTY = 'PDF_STATS_SPREADSHEET_ID';
// User đã chọn công khai tài liệu cho bất kỳ ai có link.
const ENSURE_PUBLIC_LINK_ACCESS = true;

const GROUPS = {
  'da dang cho quyet toan': 'DA Đang chờ quyết toán',
  'da cho quyet toan': 'DA Đang chờ quyết toán',
  'da chuan bi dau tu': 'DA Chuẩn bị đầu tư',
  'da chuyen tiep': 'DA Chuyển tiếp',
  'da khoi cong moi': 'DA Khởi công mới',
  'da boi thuong': 'DA Bồi thường',
  'da khac': 'DA Khác'
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  const callback = String(params.callback || '');
  let result;
  try {
    if (params.action === 'count') {
      result = recordCount_(String(params.fileId || ''), String(params.event || ''));
    } else {
      result = { ok: true, files: listPdfFiles_() };
    }
  } catch (err) {
    result = { ok: false, error: err && err.message ? err.message : String(err) };
  }

  const json = JSON.stringify(result);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function listPdfFiles_() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  if (ENSURE_PUBLIC_LINK_ACCESS) {
    // Quyền xem của thư mục gốc được kế thừa xuống các thư mục/file bên trong.
    root.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  const stats = readStats_();
  const files = [];
  const topFolders = root.getFolders();
  while (topFolders.hasNext()) {
    const top = topFolders.next();
    const khoiName = normalize_(top.getName());
    let khoi = '';
    if (khoiName.includes('dau tu xay dung')) khoi = 'Đầu tư xây dựng';
    else if (khoiName.includes('boi thuong')) khoi = 'Bồi thường';
    else continue;

    const groupFolders = top.getFolders();
    while (groupFolders.hasNext()) {
      const groupFolder = groupFolders.next();
      const nhom = GROUPS[normalize_(groupFolder.getName())];
      if (!nhom) continue;

      const projectFolders = groupFolder.getFolders();
      while (projectFolders.hasNext()) {
        const projectFolder = projectFolders.next();
        const projectName = projectFolder.getName();
        const categoryFolders = projectFolder.getFolders();
        while (categoryFolders.hasNext()) {
          const categoryFolder = categoryFolders.next();
          const docType = normalizeDocType_(categoryFolder.getName());
          const pdfs = categoryFolder.getFiles();
          while (pdfs.hasNext()) {
            const file = pdfs.next();
            if (file.getMimeType() !== MimeType.PDF && !file.getName().toLowerCase().endsWith('.pdf')) continue;
            const id = file.getId();
            const count = stats[id] || { views: 0, downloads: 0 };
            files.push(makeFileRecord_(file, id, khoi, nhom, projectName, docType, count));
          }
        }
        // Hỗ trợ cả PDF nằm trực tiếp trong thư mục dự án (nếu có).
        const directFiles = projectFolder.getFiles();
        while (directFiles.hasNext()) {
          const file = directFiles.next();
          if (file.getMimeType() !== MimeType.PDF && !file.getName().toLowerCase().endsWith('.pdf')) continue;
          const id = file.getId();
          const count = stats[id] || { views: 0, downloads: 0 };
          files.push(makeFileRecord_(file, id, khoi, nhom, projectName, 'KHÁC', count));
        }
      }
    }
  }
  files.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate) || a.title.localeCompare(b.title, 'vi'));
  return files;
}

function makeFileRecord_(file, id, khoi, nhom, projectName, docType, count) {
  const bytes = file.getSize();
  return {
    id: id,
    title: file.getName(),
    khoi: khoi,
    nhom: nhom,
    projectName: projectName,
    docType: docType,
    uploadDate: Utilities.formatDate(file.getDateCreated(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    fileSize: formatBytes_(bytes),
    driveId: id,
    previewUrl: 'https://drive.google.com/file/d/' + id + '/preview',
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + id,
    views: count.views || 0,
    downloads: count.downloads || 0
  };
}

function recordCount_(fileId, eventName) {
  if (!fileId) throw new Error('Thiếu mã file Google Drive.');
  if (eventName !== 'view' && eventName !== 'download') throw new Error('Loại thống kê không hợp lệ.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sheet = getStatsSheet_();
    const values = sheet.getDataRange().getValues();
    let row = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === fileId) { row = i + 1; break; }
    }
    if (row === -1) {
      row = sheet.getLastRow() + 1;
      sheet.getRange(row, 1, 1, 5).setValues([[fileId, '', 0, 0, new Date()]]);
    }
    const col = eventName === 'view' ? 3 : 4;
    sheet.getRange(row, col).setValue(Number(sheet.getRange(row, col).getValue() || 0) + 1);
    sheet.getRange(row, 5).setValue(new Date());
    return {
      ok: true,
      stats: {
        views: Number(sheet.getRange(row, 3).getValue() || 0),
        downloads: Number(sheet.getRange(row, 4).getValue() || 0)
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function readStats_() {
  const sheet = getStatsSheet_();
  const values = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][0] || '');
    if (id) result[id] = { views: Number(values[i][2] || 0), downloads: Number(values[i][3] || 0) };
  }
  return result;
}

function getStatsSheet_() {
  const props = PropertiesService.getScriptProperties();
  let spreadsheetId = props.getProperty(STATS_PROPERTY);
  let spreadsheet;
  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('THỐNG KÊ LƯỢT XEM - LƯỢT TẢI HỒ SƠ PDF');
    props.setProperty(STATS_PROPERTY, spreadsheet.getId());
    const sheet = spreadsheet.getSheets()[0];
    sheet.setName('ThongKe');
    sheet.getRange(1, 1, 1, 5).setValues([['Drive File ID', 'Tên file', 'Lượt xem', 'Lượt tải', 'Cập nhật cuối']]);
    sheet.setFrozenRows(1);
  }
  const sheet = spreadsheet.getSheetByName('ThongKe') || spreadsheet.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 5).setValues([['Drive File ID', 'Tên file', 'Lượt xem', 'Lượt tải', 'Cập nhật cuối']]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function normalizeDocType_(name) {
  const n = normalize_(name).toUpperCase();
  const map = { 'CV': 'CV', 'QD': 'QĐ', 'VB': 'VB', 'PA': 'PA', 'HD': 'HĐ', 'KHAC': 'KHÁC' };
  return map[n] || name;
}

function normalize_(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatBytes_(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1) + ' ' + units[index];
}

// Chạy hàm này một lần trong Apps Script để cấp quyền và kiểm tra thư mục.
function testConnection() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  Logger.log('Kết nối thành công: ' + folder.getName());
  Logger.log('Số file PDF tìm được: ' + listPdfFiles_().length);
}
