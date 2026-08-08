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

appointmentForm?.addEventListener('submit', () => {
  const status = appointmentForm.querySelector('.appointment-status');
  if (status) status.textContent = 'Sending your appointment request…';
  window.setTimeout(() => {
    if (status) status.textContent = 'Your appointment request has been submitted.';
    appointmentForm.reset();
    const fileName = document.querySelector('.file-name');
    if (fileName) fileName.textContent = 'No file selected';
  }, 1800);
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
