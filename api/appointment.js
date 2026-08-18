const allowedLocations = new Set(['Ratnagiri', 'Satara', 'Alibaug', 'Thane', 'Pune Aundh']);
const allowedPrescriptionTypes = new Set(['application/pdf']);
const maxPrescriptionBytes = 3 * 1024 * 1024;

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function clean(value, maxLength = 500) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, maxLength);
}

async function parseBody(req) {
  if (req.body === undefined) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    try {
      return JSON.parse(raw || '{}');
    } catch (error) {
      return {};
    }
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  return req.body && typeof req.body === 'object' ? req.body : {};
}

function validatePrescription(file) {
  if (!file) return null;

  const name = clean(file.name, 160);
  const type = clean(file.type, 80) || 'application/octet-stream';
  const content = String(file.content || '');
  const size = Number(file.size || 0);
  const isImage = type.startsWith('image/');

  if (!name || !content) return 'Prescription upload is incomplete.';
  if (!isImage && !allowedPrescriptionTypes.has(type)) return 'Prescription must be an image or PDF.';
  if (!Number.isFinite(size) || size <= 0 || size > maxPrescriptionBytes) return 'Prescription must be 3 MB or smaller.';
  if (!/^[A-Za-z0-9+/=]+$/.test(content)) return 'Prescription upload is invalid.';

  return null;
}

function validateSubmission(body) {
  const errors = {};
  const patientName = clean(body.patientName, 120);
  const patientMobile = clean(body.patientMobile, 10);
  const location = clean(body.location, 80);
  const website = clean(body.website, 200);
  const submissionId = clean(body.submissionId, 120);

  if (website) errors.form = 'Unable to submit this request.';
  if (!patientName) errors.patientName = 'Patient name is required.';
  if (!/^[6-9]\d{9}$/.test(patientMobile)) errors.patientMobile = 'Enter a valid 10-digit Indian mobile number.';
  if (!allowedLocations.has(location)) errors.location = 'Select a valid location.';

  const prescriptionError = validatePrescription(body.prescription);
  if (prescriptionError) errors.prescription = prescriptionError;

  return {
    errors,
    data: {
      patientName,
      patientMobile,
      location,
      submissionId,
      prescription: body.prescription ? {
        name: clean(body.prescription.name, 160),
        type: clean(body.prescription.type, 80) || 'application/octet-stream',
        size: Number(body.prescription.size || 0),
        content: String(body.prescription.content || '')
      } : null
    }
  };
}

module.exports = async function appointmentHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { ok: false, error: 'method-not-allowed' });
  }

  const scriptUrl = process.env.UNIQUE_WELLCARE_APPS_SCRIPT_URL;
  const sharedSecret = process.env.UNIQUE_WELLCARE_SHARED_SECRET;
  if (!scriptUrl || !sharedSecret) {
    return json(res, 503, { ok: false, error: 'submission-service-not-configured' });
  }

  const { errors, data } = validateSubmission(await parseBody(req));
  if (Object.keys(errors).length) {
    return json(res, 400, { ok: false, error: 'invalid-form-data', fields: errors });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, secret: sharedSecret })
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      return json(res, 502, { ok: false, error: 'submission-service-failed' });
    }

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, 502, { ok: false, error: 'submission-service-unavailable' });
  }
};
