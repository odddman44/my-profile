// ── 모바일 메뉴 토글 ──────────────────────────────────────────────
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

document.querySelectorAll('#mobile-menu a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
});

// ── 스크롤 진행도 바 ──────────────────────────────────────────────
const progressBar = document.createElement('div');
progressBar.className = 'scroll-progress';
document.body.appendChild(progressBar);

window.addEventListener('scroll', () => {
    const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    progressBar.style.width = scrolled + '%';
    updateActiveNav();
}, { passive: true });

// ── 활성 네비게이션 ───────────────────────────────────────────────
function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    let current = '';

    sections.forEach(section => {
        if (window.scrollY >= section.offsetTop - 200) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
}

// ── 스크롤 입장 애니메이션 (Intersection Observer) ────────────────
const animationObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const anim = el.dataset.animation || 'slide-up';
        const delay = el.dataset.delay || '0s';
        el.style.animationDelay = delay;
        el.classList.add('animated', anim);
        animationObserver.unobserve(el);
    });
}, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

document.querySelectorAll('[data-animation]').forEach(el => {
    el.classList.add('anim-hidden');
    animationObserver.observe(el);
});

// ── 버튼 리플 효과 ────────────────────────────────────────────────
document.querySelectorAll('.btn-ripple').forEach(btn => {
    btn.addEventListener('mouseenter', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        const dx = Math.abs(x - 50) / 50;
        const dy = Math.abs(y - 50) / 50;
        const scale = 1.2 + dx * 0.4 + dy * 0.4;

        btn.style.setProperty('--ripple-x', x + '%');
        btn.style.setProperty('--ripple-y', y + '%');
        btn.style.setProperty('--ripple-scale', scale);
    });
});

// ── 포트폴리오 카드 스태거 딜레이 적용 ───────────────────────────
document.querySelectorAll('.portfolio-card').forEach((card, i) => {
    card.dataset.delay = (i * 0.1) + 's';
});

// ── 소셜 아이콘 호버 (위→아래 exit 후 아래→위 enter) ─────────────
document.querySelectorAll('.social-icon-wrap').forEach(wrap => {
    const icon = wrap.querySelector('i');
    wrap.addEventListener('mouseenter', () => {
        icon.classList.add('icon-exit');
        setTimeout(() => {
            icon.classList.remove('icon-exit');
            icon.classList.add('icon-enter');
            setTimeout(() => icon.classList.remove('icon-enter'), 300);
        }, 150);
    });
});

// ── 초기화 ────────────────────────────────────────────────────────
updateActiveNav();
