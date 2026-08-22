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

// Carousel helper for infinite scrolling
function makeInfiniteCarousel(carouselEl, trackEl, originalCards, prevBtn, nextBtn, gap, autoplayInterval = 0) {
  if (!originalCards.length) return;
  const numOriginals = originalCards.length;
  const numClones = 3;
  const prependedClones = originalCards.slice(-numClones).map(el => el.cloneNode(true));
  const middleCards = originalCards.map(el => el.cloneNode(true));
  const appendedClones = originalCards.slice(0, numClones).map(el => el.cloneNode(true));
  trackEl.innerHTML = '';
  prependedClones.forEach(el => { el.classList.remove('reveal'); el.classList.add('revealed'); el.classList.add('is-clone'); trackEl.appendChild(el); });
  middleCards.forEach(el => { el.classList.remove('reveal'); el.classList.add('revealed'); trackEl.appendChild(el); });
  appendedClones.forEach(el => { el.classList.remove('reveal'); el.classList.add('revealed'); el.classList.add('is-clone'); trackEl.appendChild(el); });
  let activeIndex = numClones;
  let isTransitioning = false;
  const getCardWidth = () => {
    const cards = [...trackEl.children];
    return cards[0].getBoundingClientRect().width;
  };
  const updatePosition = (smooth = true) => {
    if (smooth) {
      trackEl.style.transition = 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    } else {
      trackEl.style.transition = 'none';
    }
    const cardWidth = getCardWidth();
    trackEl.style.transform = `translateX(-${activeIndex * (cardWidth + gap)}px)`;
  };
  const moveNext = () => {
    if (isTransitioning) return;
    isTransitioning = true;
    activeIndex++;
    updatePosition(true);
  };
  const movePrev = () => {
    if (isTransitioning) return;
    isTransitioning = true;
    activeIndex--;
    updatePosition(true);
  };
  trackEl.addEventListener('transitionend', () => {
    isTransitioning = false;
    if (activeIndex >= numClones + numOriginals) {
      activeIndex = numClones;
      updatePosition(false);
    } else if (activeIndex < numClones) {
      activeIndex = numClones + numOriginals - 1;
      updatePosition(false);
    }
  });
  nextBtn?.addEventListener('click', () => { moveNext(); resetAutoplay(); });
  prevBtn?.addEventListener('click', () => { movePrev(); resetAutoplay(); });
  window.addEventListener('resize', () => { updatePosition(false); });
  let timer;
  const startAutoplay = () => {
    if (autoplayInterval > 0) {
      clearInterval(timer);
      timer = setInterval(moveNext, autoplayInterval);
    }
  };
  const stopAutoplay = () => { clearInterval(timer); };
  const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };
  if (autoplayInterval > 0) {
    carouselEl.addEventListener('mouseenter', stopAutoplay);
    carouselEl.addEventListener('mouseleave', startAutoplay);
    startAutoplay();
  }
  setTimeout(() => { updatePosition(false); }, 50);
}

document.querySelectorAll('[data-review-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.review-track');
  const cards = [...carousel.querySelectorAll('.review-card')];
  const previous = carousel.querySelector('.review-prev');
  const next = carousel.querySelector('.review-next');
  makeInfiniteCarousel(carousel, track, cards, previous, next, 22, 6500);
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
      throw new Error(result.details || result.error || 'submission-failed');
    }
    window.sessionStorage.setItem('appointmentSubmitted', 'true');
    window.location.assign('../thank-you/');
  } catch (error) {
    console.error('Appointment Submission Error:', error);
    if (status) {
      status.textContent = `Submission failed: ${error.message}. Please check console or Vercel logs.`;
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

const motionTargets = document.querySelectorAll('.section-heading,.service-feature,.trust-section,.location-carousel,.journey-steps,.final-cta,.page-section');
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

// WhatsApp Locations Popup Logic
document.addEventListener('DOMContentLoaded', () => {
  const popupHtml = `
    <div class="wa-popup-overlay" id="waPopup">
      <div class="wa-popup-list">
        <a class="wa-popup-card" href="https://wa.me/917276015041" target="_blank" rel="noopener">
          <h3>Thane</h3>
          <span>+91 72760 15041</span>
        </a>
        <a class="wa-popup-card" href="https://wa.me/919168298383" target="_blank" rel="noopener">
          <h3>Pune Aundh</h3>
          <span>+91 91682 98383</span>
        </a>
        <a class="wa-popup-card" href="https://wa.me/918308515000" target="_blank" rel="noopener">
          <h3>Satara</h3>
          <span>+91 83085 15000</span>
        </a>
        <a class="wa-popup-card" href="https://wa.me/919604054834" target="_blank" rel="noopener">
          <h3>Ratnagiri</h3>
          <span>+91 96040 54834</span>
        </a>
        <a class="wa-popup-card" href="https://wa.me/917276015041" target="_blank" rel="noopener">
          <h3>Alibaug</h3>
          <span>+91 72760 15041</span>
        </a>
      </div>
    </div>
  `;

  // Inject popup
  const div = document.createElement('div');
  div.innerHTML = popupHtml;
  document.body.appendChild(div.firstElementChild);

  const waPopup = document.getElementById('waPopup');

  const togglePopup = (e) => {
    e.preventDefault();
    e.stopPropagation();
    waPopup.classList.toggle('active');
  };

  // Add click listeners to all WhatsApp buttons on the page
  document.querySelectorAll('.whatsapp').forEach(btn => {
    btn.addEventListener('click', togglePopup);
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!waPopup.contains(e.target) && !e.target.closest('.whatsapp')) {
      waPopup.classList.remove('active');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      waPopup.classList.remove('active');
    }
  });

  // Close when a card is clicked
  waPopup.querySelectorAll('.wa-popup-card').forEach(card => {
    card.addEventListener('click', () => {
      setTimeout(() => {
        waPopup.classList.remove('active');
      }, 100);
    });
  });
});

// Locations Carousel Slider Logic
document.querySelectorAll('[data-location-carousel]').forEach((carousel) => {
  const track = carousel.querySelector('.location-track');
  const cards = [...carousel.querySelectorAll('.location-card')];
  const previous = carousel.querySelector('.review-prev');
  const next = carousel.querySelector('.review-next');
  makeInfiniteCarousel(carousel, track, cards, previous, next, 24, 0);
});
