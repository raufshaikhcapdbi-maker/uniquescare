var CLIENT_EMAIL = 'ubercare@uber-india.com, rauf.shaikh.capdbi@gmail.com';
var SHEET_NAME = 'Appointment Requests';
var ALLOWED_LOCATIONS = ['Ratnagiri', 'Satara', 'Alibaug', 'Thane', 'Pune Aundh'];
var MAX_PRESCRIPTION_BYTES = 3 * 1024 * 1024;
var HEADERS = [
  'Date/Time',
  'Patient Name',
  'Patient Mobile Number',
  'Location',
  'Prescription File Name',
  'Prescription File Type',
  'Prescription File Size',
  'Prescription File URL',
  'Submission ID',
  'Email Status'
];

function doGet() {
  return respond({ ok: true, service: 'unique-wellcare-appointment-handler' });
}

function doPost(event) {
  try {
    var payload = JSON.parse((event.postData && event.postData.contents) || '{}');
    var scriptProperties = PropertiesService.getScriptProperties();
    var expectedSecret = scriptProperties.getProperty('UNIQUE_WELLCARE_SHARED_SECRET');

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return respond({ ok: false, error: 'forbidden' });
    }

    var validation = validatePayload(payload);
    if (!validation.ok) {
      return respond({ ok: false, error: 'invalid-form-data', fields: validation.errors });
    }

    var data = validation.data;
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);

    try {
      var cache = CacheService.getScriptCache();
      var cacheKey = data.submissionId ? 'appointment:' + data.submissionId : '';
      if (cacheKey && cache.get(cacheKey)) {
        return respond({ ok: true, duplicate: true });
      }

      var timestamp = new Date();
      var prescription = savePrescription(data.prescription);
      
      var emailStatus = 'Sent Successfully';
      try {
        sendAppointmentEmail(timestamp, data, prescription);
      } catch (emailError) {
        emailStatus = 'Error: ' + String(emailError);
      }

      appendSubmission(timestamp, data, prescription, emailStatus);

      if (cacheKey) cache.put(cacheKey, '1', 21600);
      return respond({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return respond({ ok: false, error: 'server-error: ' + String(error) });
  }
}

function validatePayload(payload) {
  var errors = {};
  var data = {
    patientName: clean(payload.patientName, 120),
    patientMobile: clean(payload.patientMobile, 10),
    location: clean(payload.location, 80),
    submissionId: clean(payload.submissionId, 120),
    prescription: payload.prescription || null
  };

  if (!data.patientName) errors.patientName = 'Patient name is required.';
  if (!/^[6-9]\d{9}$/.test(data.patientMobile)) errors.patientMobile = 'Enter a valid 10-digit Indian mobile number.';
  if (ALLOWED_LOCATIONS.indexOf(data.location) === -1) errors.location = 'Select a valid location.';

  if (data.prescription) {
    data.prescription = {
      name: clean(data.prescription.name, 160),
      type: clean(data.prescription.type, 80) || 'application/octet-stream',
      size: Number(data.prescription.size || 0),
      content: String(data.prescription.content || '')
    };

    var isAllowedType = data.prescription.type.indexOf('image/') === 0 || data.prescription.type === 'application/pdf';
    if (!data.prescription.name || !data.prescription.content) {
      errors.prescription = 'Prescription upload is incomplete.';
    } else if (!isAllowedType) {
      errors.prescription = 'Prescription must be an image or PDF.';
    } else if (!data.prescription.size || data.prescription.size > MAX_PRESCRIPTION_BYTES) {
      errors.prescription = 'Prescription must be 3 MB or smaller.';
    } else if (!/^[A-Za-z0-9+/=]+$/.test(data.prescription.content)) {
      errors.prescription = 'Prescription upload is invalid.';
    }
  }

  return { ok: Object.keys(errors).length === 0, errors: errors, data: data };
}

function appendSubmission(timestamp, data, prescription, emailStatus) {
  var sheet = getAppointmentSheet();
  ensureHeaders(sheet);
  sheet.appendRow([
    timestamp,
    data.patientName,
    data.patientMobile,
    data.location,
    prescription.name || '',
    prescription.type || '',
    prescription.size || '',
    prescription.url || '',
    data.submissionId || '',
    emailStatus || ''
  ]);
}

function getAppointmentSheet() {
  var scriptProperties = PropertiesService.getScriptProperties();
  var sheetId = scriptProperties.getProperty('UNIQUE_WELLCARE_SHEET_ID');
  var spreadsheet;

  if (sheetId) {
    spreadsheet = SpreadsheetApp.openById(sheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('Unique WellCare Appointment Requests');
    scriptProperties.setProperty('UNIQUE_WELLCARE_SHEET_ID', spreadsheet.getId());
  }

  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders(sheet) {
  var existing = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var needsHeaders = existing.every(function(value) { return !value; });
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  } else if (existing.length < HEADERS.length) {
    sheet.getRange(1, HEADERS.length).setValue('Email Status').setFontWeight('bold');
  }
}

function savePrescription(file) {
  if (!file) return {};

  var bytes = Utilities.base64Decode(file.content);
  var blob = Utilities.newBlob(bytes, file.type, file.name);
  var folderId = PropertiesService.getScriptProperties().getProperty('UNIQUE_WELLCARE_DRIVE_FOLDER_ID');
  var driveFile = folderId ? DriveApp.getFolderById(folderId).createFile(blob) : DriveApp.createFile(blob);

  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url: driveFile.getUrl()
  };
}

function sendAppointmentEmail(timestamp, data, prescription) {
  var timezone = Session.getScriptTimeZone();
  var dateText = Utilities.formatDate(timestamp, timezone, 'yyyy-MM-dd');
  var timeText = Utilities.formatDate(timestamp, timezone, 'HH:mm:ss');
  var subject = 'New Appointment Request - Unique WellCare';
  var lines = [
    'New Appointment Request - Unique WellCare',
    '',
    'Patient Details',
    '',
    'Name: ' + data.patientName,
    'Mobile Number: ' + data.patientMobile,
    'Location: ' + data.location,
    'Doctor Prescription: ' + (prescription.name || 'Not uploaded'),
    'Prescription Link: ' + (prescription.url || 'Not available'),
    '',
    'Submission Date: ' + dateText,
    'Submission Time: ' + timeText
  ];

  var htmlBody = [
    '<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">',
    '<h2 style="color: #0b5b9e;">New Appointment Request</h2>',
    '<h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px;">Patient Details</h3>',
    '<p><strong>Name:</strong><br>' + escapeHtml(data.patientName) + '</p>',
    '<p><strong>Mobile Number:</strong><br>' + escapeHtml(data.patientMobile) + '</p>',
    '<p><strong>Location:</strong><br>' + escapeHtml(data.location) + '</p>',
    '<h3 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 24px;">Prescription</h3>',
    '<p><strong>File Name:</strong><br>' + escapeHtml(prescription.name || 'Not uploaded') + '</p>',
    '<p><strong>Link:</strong><br>' + (prescription.url ? '<a href="' + escapeHtml(prescription.url) + '" style="color: #0b5b9e; text-decoration: none;">View Prescription Document &rarr;</a>' : 'Not available') + '</p>',
    '<hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">',
    '<p style="font-size: 12px; color: #777;">Submitted on ' + escapeHtml(dateText) + ' at ' + escapeHtml(timeText) + ' via the Unique WellCare website.</p>',
    '</div>'
  ].join('');

  MailApp.sendEmail({
    to: CLIENT_EMAIL,
    subject: subject,
    name: 'Unique WellCare System',
    replyTo: 'ubercare@uber-india.com',
    body: lines.join('\n'),
    htmlBody: htmlBody
  });
}

function clean(value, maxLength) {
  return String(value || '').replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function respond(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
