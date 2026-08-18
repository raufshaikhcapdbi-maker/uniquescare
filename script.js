const menuButton = document.querySelector('.menu-button');
const navigation = document.querySelector('.main-nav');
const presence = document.querySelector('.presence');
const presenceButton = presence?.querySelector('button');

menuButton?.addEventListener('click', () => {
  const willOpen = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(willOpen));
  navigation?.classList.toggle('open', willOpen);
});

presenceButton?.addEventListener('click', () => {
  const willOpen = presenceButton.getAttribute('aria-expanded') !== 'true';
  presenceButton.setAttribute('aria-expanded', String(willOpen));
  presence?.classList.toggle('open', willOpen);
});

document.addEventListener('click', (event) => {
  if (presence && !presence.contains(event.target)) {
    presenceButton?.setAttribute('aria-expanded', 'false');
    presence.classList.remove('open');
  }
});

document.querySelectorAll('.main-nav a').forEach((link) => link.addEventListener('click', () => {
  menuButton?.setAttribute('aria-expanded', 'false');
  navigation?.classList.remove('open');
}));

document.querySelectorAll('.faq-question').forEach((question) => question.addEventListener('click', () => {
  const item = question.closest('.faq-item');
  const willOpen = !item.classList.contains('open');
  item.classList.toggle('open', willOpen);
  question.setAttribute('aria-expanded', String(willOpen));
}));

document.querySelectorAll('[data-carousel]').forEach((carousel) => {
  const slides = [...carousel.querySelectorAll('.carousel-slide')];
  let index = 0;
  const show = (nextIndex) => {
    index = (nextIndex + slides.length) % slides.length;
    slides.forEach((slide, position) => slide.classList.toggle('active', position === index));
  };
  carousel.querySelector('[data-prev]')?.addEventListener('click', () => show(index - 1));
  carousel.querySelector('[data-next]')?.addEventListener('click', () => show(index + 1));
  if (slides.length) show(0);
});

document.querySelectorAll('[data-review-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.review-track');
  const cards = [...carousel.querySelectorAll('.review-card')];
  const previous = carousel.querySelector('.review-prev');
  const next = carousel.querySelector('.review-next');
  let index = 0;
  let timer;
  const visibleCards = () => window.innerWidth <= 700 ? 1 : 3;
  const move = (nextIndex) => {
    if (!cards.length) return;
    const maximum = Math.max(0, cards.length - visibleCards());
    index = nextIndex > maximum ? 0 : nextIndex < 0 ? maximum : nextIndex;
    const cardWidth = cards[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${index * (cardWidth + 22)}px)`;
  };
  const autoplay = () => {
    window.clearInterval(timer);
    timer = window.setInterval(() => move(index + 1), 6500);
  };
  previous?.addEventListener('click', () => { move(index - 1); autoplay(); });
  next?.addEventListener('click', () => { move(index + 1); autoplay(); });
  window.addEventListener('resize', () => move(index));
  carousel.addEventListener('mouseenter', () => window.clearInterval(timer));
  carousel.addEventListener('mouseleave', autoplay);
  move(0);
  autoplay();
});

const appointmentForm = document.querySelector('.appointment-form');
const prescriptionFile = document.querySelector('.prescription-file');
prescriptionFile?.addEventListener('change', () => {
  const fileName = document.querySelector('.file-name');
  if (fileName) fileName.textContent = prescriptionFile.files[0]?.name || 'No file selected';
});

const appointmentError = (name) => appointmentForm?.querySelector(`[data-error-for="${name}"]`);
const setAppointmentError = (name, message) => {
  const error = appointmentError(name);
  const field = appointmentForm?.elements[name];
  if (error) error.textContent = message;
  if (field && 'setCustomValidity' in field) field.setCustomValidity(message);
};
const clearAppointmentErrors = () => {
  appointmentForm?.querySelectorAll('.field-error').forEach((error) => { error.textContent = ''; });
  if (!appointmentForm) return;
  [...appointmentForm.elements].forEach((field) => {
    if ('setCustomValidity' in field) field.setCustomValidity('');
  });
};
const getAppointmentFilePayload = (file) => new Promise((resolve, reject) => {
  if (!file) {
    resolve(null);
    return;
  }
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    const result = String(reader.result || '');
    resolve({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      content: result.includes(',') ? result.split(',').pop() : ''
    });
  });
  reader.addEventListener('error', () => reject(new Error('file-read-failed')));
  reader.readAsDataURL(file);
});
const validateAppointmentForm = () => {
  if (!appointmentForm) return false;
  clearAppointmentErrors();
  const data = new FormData(appointmentForm);
  let isValid = true;
  const patientName = String(data.get('patientName') || '').trim();
  const patientMobile = String(data.get('patientMobile') || '').trim();
  const location = String(data.get('location') || '').trim();
  const file = prescriptionFile?.files[0];

  if (!patientName) {
    setAppointmentError('patientName', 'Please enter the patient name.');
    isValid = false;
  }
  if (!/^[6-9]\d{9}$/.test(patientMobile)) {
    setAppointmentError('patientMobile', 'Enter a valid 10-digit Indian mobile number.');
    isValid = false;
  }
  if (!location) {
    setAppointmentError('location', 'Please select a location.');
    isValid = false;
  }
  if (file) {
    const allowedTypes = ['application/pdf'];
    const isAllowedImage = file.type.startsWith('image/');
    const isAllowedFile = isAllowedImage || allowedTypes.includes(file.type);
    if (!isAllowedFile) {
      setAppointmentError('prescription', 'Upload an image or PDF prescription.');
      isValid = false;
    } else if (file.size > 3 * 1024 * 1024) {
      setAppointmentError('prescription', 'Prescription file must be 3 MB or smaller.');
      isValid = false;
    }
  }
  return isValid;
};

document.body.dataset.page === 'thank-you' && (() => {
  if (window.sessionStorage.getItem('appointmentSubmitted') !== 'true') {
    window.location.replace('../book-an-appointment/');
  } else {
    window.sessionStorage.removeItem('appointmentSubmitted');
  }
})();

appointmentForm?.querySelector('[name="patientMobile"]')?.addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
  setAppointmentError('patientMobile', '');
});

appointmentForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = appointmentForm.querySelector('.appointment-status');
  const submitButton = appointmentForm.querySelector('.appointment-submit');
  if (submitButton?.disabled) return;
  if (!validateAppointmentForm()) {
    if (status) {
      status.textContent = 'Please fix the highlighted fields before submitting.';
      status.classList.add('error');
    }
    return;
  }

  const formData = new FormData(appointmentForm);
  const file = prescriptionFile?.files[0];
  const originalButtonText = submitButton?.textContent || 'Submit appointment request';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
  }
  if (status) {
    status.textContent = 'Submitting your appointment request...';
    status.classList.remove('error');
  }

  try {
    const prescription = await getAppointmentFilePayload(file);
    const response = await fetch(appointmentForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: String(formData.get('patientName') || '').trim(),
        patientMobile: String(formData.get('patientMobile') || '').trim(),
        location: String(formData.get('location') || '').trim(),
        website: String(formData.get('website') || ''),
        prescription,
        submissionId: `${Date.now()}-${Math.random().toString(36).slice(2)}`
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      if (result.fields) {
        Object.entries(result.fields).forEach(([name, message]) => setAppointmentError(name, message));
      }
      throw new Error(result.error || 'submission-failed');
    }
    window.sessionStorage.setItem('appointmentSubmitted', 'true');
    window.location.assign('../thank-you/');
  } catch (error) {
    if (status) {
      status.textContent = 'We could not submit your request right now. Please try again.';
      status.classList.add('error');
    }
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const motionTargets = document.querySelectorAll('.section-heading,.service-feature,.trust-section,.location-card,.journey-steps,.final-cta,.page-section');
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08 });
  motionTargets.forEach((element) => { element.classList.add('reveal'); observer.observe(element); });
}
