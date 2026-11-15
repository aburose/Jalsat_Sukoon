// ========== استيراد Firebase SDK v10 ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ========== إعدادات Firebase ==========
const firebaseConfig = {
  apiKey: "AIzaSyCb29ClTbHwIEHl_ze5RHBZEN6jwZiySOc",
  authDomain: "db2026-5807e.firebaseapp.com",
  projectId: "db2026-5807e",
  storageBucket: "db2026-5807e.firebasestorage.app",
  messagingSenderId: "305741717208",
  appId: "1:305741717208:web:4d7c6ea3d92fdaff8c41ad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ========== الإعدادات ==========
const START_HOUR = 17;
const END_HOUR = 30;
const MAX_DAYS_AHEAD = 14;

const SILVER_PRICES = { 1: 60, 2: 120, 3: 180, 4: 240, 5: 275, 6: 330 };
const SILVER_MAX_HOURS = 6;

const GOLD_PRICES = { 1: 80, 2: 160, 3: 240, 4: 320, 5: 350, 6: 400 };
const GOLD_MAX_HOURS = 6;

const CELEBRATION_PRICE = 300;

let state = {
  session: null,
  package: null,
  price: 0,
  total: 0,
  celebration: false
};

// ========== Utilities ==========
const $ = (id) => document.getElementById(id);
const formatHour = (h) => {
  const hh = ((h % 24) + 24) % 24;
  const period = hh >= 12 && hh < 24 ? 'مساءً' : 'صباحاً';
  const display = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
  return `${display}:00 ${period}`;
};
const formatDate = (iso) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};
const toISO = (d) => d.toISOString().split('T')[0];

// ========== الحجوزات ==========
window.cachedBookings = [];

function getBookings() {
  return window.cachedBookings || [];
}

function fetchBookingsFromFirestore(callback) {
  const bookingsRef = collection(db, 'bookings');
  onSnapshot(bookingsRef, (snapshot) => {
    const data = [];
    snapshot.forEach((docSnap) => {
      data.push({ id: docSnap.id, ...docSnap.data() });
    });
    window.cachedBookings = data;
    if (callback) callback();
    if (typeof populateStartTimes === 'function') populateStartTimes();
    if (typeof renderBookedSlots === 'function') renderBookedSlots();
  }, (error) => {
    console.error("❌ خطأ في جلب الحجوزات:", error);
  });
}

async function saveBooking(b) {
  try {
    await setDoc(doc(db, 'bookings', String(b.id)), b);
    console.log('✅ تم حفظ الحجز بنجاح في Firestore');
    return true;
  } catch (error) {
    console.error('❌ خطأ في حفظ الحجز:', error);
    return false;
  }
}

// ========== دوال مساعدة ==========
function showToast(msg, type = 'error') {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show' + (type === 'success' ? ' success' : '');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function updateSummary() {
  const hours = parseInt($('hours').value) || 0;
  const people = parseInt($('people').value) || 0;
  const date = $('bookingDate').value;
  const startTime = $('startTime').value;

  if (state.package === 'silver') {
    state.total = hours <= SILVER_MAX_HOURS ? (SILVER_PRICES[hours] || 0) : 0;
  } else if (state.package === 'gold') {
    state.total = hours <= GOLD_MAX_HOURS ? (GOLD_PRICES[hours] || 0) : 0;
  } else {
    state.total = 0;
  }

  if (state.celebration) state.total += CELEBRATION_PRICE;

  if (state.session && state.package && hours > 0 && date && startTime) {
    $('summary').style.display = 'block';
    $('sumSession').textContent = `جلسة ${state.session}`;
    $('sumPackage').textContent = state.package === 'silver' ? 'الباقة الفضية 🥈' : 'الباقة الذهبية 🥇';
    $('sumDate').textContent = formatDate(date);
    const start = parseInt(startTime);
    const end = start + hours;
    $('sumTime').textContent = `${formatHour(start)} - ${formatHour(end)}`;
    $('sumHours').textContent = `${hours} ساعة`;
    $('sumPeople').textContent = `${people} أشخاص`;
    if ($('sumCelebration')) {
      $('sumCelebration').textContent = state.celebration ? `مضاف (+${CELEBRATION_PRICE} ر.س)` : 'بدون';
    }
    $('sumTotal').textContent = `${state.total} ريال`;
  } else {
    $('summary').style.display = 'none';
  }
}

function updatePeopleCounter() {
  const input = $('people');
  if (!input) return;
  const label = $('peopleLabel');
  const badge = $('peopleBadge');
  const iconsBox = $('peopleIcons');
  const minusBtn = $('peopleMinus');
  const plusBtn = $('peoplePlus');
  const counterWrap = input.closest('.people-counter');

  const current = parseInt(input.value) || 1;
  const min = parseInt(input.min) || 1;
  const max = parseInt(input.max) || 10;

  let text;
  if (current === 1) text = 'شخص واحد';
  else if (current === 2) text = 'شخصان';
  else if (current >= 3 && current <= 10) text = `${current} أشخاص`;
  else text = `${current} شخص`;

  if (label) label.textContent = text;
  if (badge) badge.textContent = current;

  if (iconsBox) {
    iconsBox.innerHTML = '';
    for (let i = 0; i < current; i++) {
      const icon = document.createElement('i');
      icon.className = 'fas fa-user';
      iconsBox.appendChild(icon);
    }
  }

  if (minusBtn) minusBtn.disabled = input.disabled || current <= min;
  if (plusBtn) plusBtn.disabled = input.disabled || current >= max;

  if (counterWrap) {
    if (input.disabled) counterWrap.classList.add('disabled');
    else counterWrap.classList.remove('disabled');
  }
}

function changePeople(delta) {
  const input = $('people');
  if (!input || input.disabled) return;

  const min = parseInt(input.min) || 1;
  const max = parseInt(input.max) || 10;
  let current = parseInt(input.value) || min;
  let next = current + delta;

  if (next < min) next = min;
  if (next > max) next = max;

  input.value = next;
  updatePeopleCounter();
  updateSummary();
}

function toggleCelebration(element) {
  const checkbox = element.querySelector('.celebration-input');
  
  if (element.classList.contains('active')) {
    element.classList.remove('active');
    checkbox.checked = false;
    state.celebration = false;
  } else {
    document.querySelectorAll('.celebration-package').forEach(pkg => {
      pkg.classList.remove('active');
      pkg.querySelector('.celebration-input').checked = false;
    });
    element.classList.add('active');
    checkbox.checked = true;
    state.celebration = true;
  }
  updateSummary();
}

// ========== توليد أوقات البدء ==========
function populateStartTimes() {
  const sel = $('startTime');
  if (!sel) return;
  const currentValue = sel.value;
  sel.innerHTML = '<option value="">اختر الوقت</option>';

  const date = $('bookingDate').value;
  const session = state.session || '101';
  const bookings = getBookings().filter(b =>
    b.date === date &&
    b.session === session &&
    (b.status || 'pending') !== 'cancelled'
  );

  for (let h = START_HOUR; h <= END_HOUR - 1; h++) {
    const opt = document.createElement('option');
    opt.value = h;
    const isBooked = bookings.some(b => h >= b.startHour && h < b.endHour);

    if (isBooked) {
      opt.textContent = `${formatHour(h)} ⛔ محجوز`;
      opt.disabled = true;
      opt.style.color = '#ef4444';
      opt.style.textDecoration = 'line-through';
      opt.style.opacity = '0.6';
    } else {
      opt.textContent = formatHour(h);
    }
    sel.appendChild(opt);
  }

  if (currentValue) {
    const opt = Array.from(sel.options).find(o => o.value === currentValue && !o.disabled);
    if (opt) sel.value = currentValue;
    else sel.value = '';
  }
}

function setupDateLimits() {
  const dateInput = $('bookingDate');
  if (!dateInput) return;
  const today = new Date();
  const max = new Date();
  max.setDate(today.getDate() + MAX_DAYS_AHEAD);
  dateInput.min = toISO(today);
  dateInput.max = toISO(max);
}

function setDefaults() {
  const defaultSession = document.querySelector('.session-option[data-session="101"]');
  if (defaultSession) {
    defaultSession.classList.add('selected');
    state.session = '101';
  }

  const defaultPackage = document.querySelector('.package-option[data-package="silver"]');
  if (defaultPackage) {
    defaultPackage.classList.add('selected');
    state.package = 'silver';
    state.price = 0;

    const peopleInput = $('people');
    const hint = $('peopleHint');
    if (peopleInput) {
      peopleInput.value = 2;
      peopleInput.max = 2;
      peopleInput.min = 2;
      peopleInput.disabled = true;
    }
    if (hint) hint.innerHTML = '<i class="fas fa-info-circle"></i> الباقة الفضية: شخصان فقط';
    updatePeopleCounter();
  }
  populateStartTimes();
}

function renderBookedSlots() {
  const date = $('bookingDate').value;
  const box = $('bookedSlots');
  if (!box) return;

  box.classList.add('refreshing');
  setTimeout(() => box.classList.remove('refreshing'), 500);

  if (!date) {
    box.innerHTML = '<p class="empty-msg">اختر تاريخًا لعرض الحجوزات</p>';
    return;
  }

  const bookings = getBookings()
    .filter(b => b.date === date && b.status !== 'cancelled')
    .sort((a, b) => a.startHour - b.startHour);

  if (bookings.length === 0) {
    box.innerHTML = '<p class="empty-msg">لا توجد حجوزات في هذا التاريخ</p>';
    return;
  }

  box.innerHTML = bookings.map(b => `
    <div class="booked-item">
      <strong>جلسة ${b.session}</strong> — ${formatHour(b.startHour)} إلى ${formatHour(b.endHour)}
    </div>
  `).join('');
}

function resetForm() {
  document.querySelectorAll('.session-option, .package-option').forEach(x => x.classList.remove('selected'));
  $('bookingDate').value = '';
  $('startTime').value = '';
  $('hours').value = '';
  $('customerName').value = '';
  $('customerPhone').value = '';
  $('summary').style.display = 'none';
  
  state = { session: null, package: null, price: 0, total: 0, celebration: false };
  
  document.querySelectorAll('.celebration-package').forEach(pkg => {
    pkg.classList.remove('active');
    pkg.querySelector('.celebration-input').checked = false;
  });

  populateStartTimes();
}

// ========== الأحداث الرئيسية (بعد تحميل DOM) ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log("✅ DOM جاهز - بدء التهيئة");

  // 1. اختيار الجلسة
  document.querySelectorAll('.session-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.session-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      state.session = el.dataset.session;
      populateStartTimes();
      updateSummary();
      renderBookedSlots();
    });
  });

  // 2. اختيار الباقة
  document.querySelectorAll('.package-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.package-option').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      state.package = el.dataset.package;

      const peopleInput = $('people');
      const hint = $('peopleHint');
      const curHours = parseInt($('hours').value) || 0;

      if (state.package === 'silver') {
        peopleInput.value = 2;
        peopleInput.min = 2;
        peopleInput.max = 2;
        peopleInput.disabled = true;
        hint.innerHTML = '<i class="fas fa-info-circle"></i> الباقة الفضية: شخصان فقط';
        if (curHours > SILVER_MAX_HOURS) {
          $('hours').value = '';
          showToast('الباقة الفضية: الحد الأقصى 6 ساعات');
        }
      } else {
        peopleInput.disabled = false;
        peopleInput.min = 1;
        peopleInput.max = 10;
        if (parseInt(peopleInput.value) > 10) peopleInput.value = 10;
        if (parseInt(peopleInput.value) < 1) peopleInput.value = 1;
        hint.innerHTML = '<i class="fas fa-info-circle"></i> الباقة الذهبية: حتى 10 أشخاص';
        if (curHours > GOLD_MAX_HOURS) {
          $('hours').value = '';
          showToast('الباقة الذهبية: الحد الأقصى 6 ساعات');
        }
      }
      updatePeopleCounter();
      updateSummary();
    });
  });

  // 3. زر تأكيد الحجز
  const confirmBtn = $('confirmBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      console.log("🖱️ تم الضغط على زر التأكيد");

      const name = $('customerName').value.trim();
      const phone = $('customerPhone').value.trim();
      const date = $('bookingDate').value;
      const startTime = $('startTime').value;
      const hours = parseInt($('hours').value) || 0;
      const people = parseInt($('people').value) || 0;

      if (!state.session) return showToast('الرجاء اختيار رقم الجلسة');
      if (!state.package) return showToast('الرجاء اختيار الباقة');
      if (!date) return showToast('الرجاء اختيار تاريخ الحجز');
      if (!startTime) return showToast('الرجاء اختيار وقت البدء');
      if (!hours) return showToast('الرجاء اختيار عدد الساعات');
      if (!name) return showToast('الرجاء إدخال الاسم');
      if (!phone || !/^05\d{8}$/.test(phone)) return showToast('رقم الجوال غير صحيح (05xxxxxxxx)');

      if (state.package === 'silver' && hours > SILVER_MAX_HOURS) {
        return showToast(`الباقة الفضية: الحد الأقصى ${SILVER_MAX_HOURS} ساعات`);
      }
      if (state.package === 'gold' && hours > GOLD_MAX_HOURS) {
        return showToast(`الباقة الذهبية: الحد الأقصى ${GOLD_MAX_HOURS} ساعات`);
      }

      const startH = parseInt(startTime);
      const endH = startH + hours;
      if (endH > END_HOUR) {
        return showToast(`وقت الانتهاء يتجاوز 6 صباحاً`);
      }

      const isOverlap = getBookings().some(b => {
        if (b.session !== state.session || b.date !== date) return false;
        if (b.status === 'cancelled') return false;
        return startH < b.endHour && endH > b.startHour;
      });
      if (isOverlap) {
        populateStartTimes();
        return showToast('⛔ الوقت الذي اخترته محجوز. الرجاء اختيار وقت آخر');
      }

      const booking = {
        id: Date.now(),
        session: state.session,
        package: state.package,
        date,
        startHour: startH,
        endHour: endH,
        hours,
        people,
        name,
        phone,
        total: state.total,
        status: 'pending',
        celebration: state.celebration,
        createdAt: new Date().toISOString(),
      };

      console.log("📤 جاري حفظ الحجز:", booking);
      const saved = await saveBooking(booking);
      console.log("📥 نتيجة الحفظ:", saved);

      if (saved) {
        $('payAmount').textContent = `${state.total} ريال`;
        $('paymentModal').classList.add('active');
        renderBookedSlots();
        resetForm();
      } else {
        showToast('فشل حفظ الحجز. تحقق من الاتصال بـ Firebase');
      }
    });
  } else {
    console.error("❌ لم يتم العثور على زر التأكيد (confirmBtn)");
  }

  // 4. تحديث الملخص عند التغيير
  ['bookingDate', 'startTime', 'hours'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', updateSummary);
  });

  // 5. تغيير التاريخ → تحديث الأوقات
  const dateInput = $('bookingDate');
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      populateStartTimes();
      renderBookedSlots();
    });
  }

  // 6. معرض الصور
  const silverGallery = document.getElementById('gallerySilver');
  const goldGallery = document.getElementById('galleryGold');
  const silverPkg = document.querySelector('.package-option[data-package="silver"]');
  const goldPkg = document.querySelector('.package-option[data-package="gold"]');
  
  if (silverPkg && goldPkg) {
    silverPkg.addEventListener('click', () => {
      if (silverGallery) silverGallery.classList.add('active');
      if (goldGallery) goldGallery.classList.remove('active');
    });
    goldPkg.addEventListener('click', () => {
      if (goldGallery) goldGallery.classList.add('active');
      if (silverGallery) silverGallery.classList.remove('active');
    });
    if (silverPkg.classList.contains('selected') && silverGallery) {
      silverGallery.classList.add('active');
    }
  }

  // 7. إغلاق المودال
  const modal = $('paymentModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'paymentModal') closeModal();
    });
  }

  // 8. التهيئة
  populateStartTimes();
  setupDateLimits();
  setDefaults();
  updatePeopleCounter();
  renderBookedSlots();
  updateSummary();

  // 9. جلب البيانات من Firestore
  fetchBookingsFromFirestore();
});

// ========== دوال عامة (Global) ==========
window.changePeople = changePeople;
window.toggleCelebration = toggleCelebration;
window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.closeModal = closeModal;
window.copyText = copyText;

function closeModal() {
  const m = $('paymentModal');
  if (m) m.classList.remove('active');
}

function copyText(text, el) {
  navigator.clipboard.writeText(text);
  showToast('تم النسخ ✓', 'success');
}

function openLightbox(src) {
  let lightbox = document.getElementById('imageLightbox');
  
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'imageLightbox';
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
      <img src="" alt="صورة مكبرة">
    `;
    document.body.appendChild(lightbox);
    
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  
  lightbox.querySelector('img').src = src;
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('imageLightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }
}