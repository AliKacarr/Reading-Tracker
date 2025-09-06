// URL'den grup ID'sini çıkarma fonksiyonu
function getGroupIdFromUrl() {
  const path = window.location.pathname;
  const segments = path.split('/').filter(segment => segment !== '');

  // Eğer URL'de grup ID'si varsa (örn: /hisarkapisi16)
  if (segments.length > 0) {
    let groupId = segments[0];
    // Eğer grup ID'sinde :1 gibi port eki varsa temizle
    if (groupId.includes(':')) {
      groupId = groupId.split(':')[0];
    }
    // Sadece alfanumerik karakterler ve alt çizgi kabul et
    groupId = groupId.replace(/[^a-zA-Z0-9_]/g, '');
    return groupId;
  }

  // Ana sayfa için null döndür (gruplar sayfasına yönlendirilecek)
  return null;
}

// Grup değişikliğinde çerezleri temizleme fonksiyonu
function cleanupCrossGroupCookies() {
  const storedGroupId = localStorage.getItem('groupId');

  if (storedGroupId && storedGroupId !== currentGroupId) {
    console.log('Grup değişikliği tespit edildi. Tüm admin çerezleri temizleniyor...');
    localStorage.removeItem('authenticated');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('groupName');
    localStorage.removeItem('groupId');
    hideAdminElements();
    return true;
  }
  return false;
}

// Global grup ID değişkeni
let currentGroupId = getGroupIdFromUrl();
let previousGroupId = localStorage.getItem('groupId');

// Admin elementlerini gizleme fonksiyonu
function hideAdminElements() {
  const adminIndicator = document.querySelector('.admin-indicator');
  const adminLogsButton = document.getElementById('adminLogsButton');
  const loginLogsButton = document.getElementById('loginLogsButton');

  if (adminIndicator) adminIndicator.style.display = 'none';
  if (adminLogsButton) adminLogsButton.style.display = 'none';
  if (loginLogsButton) loginLogsButton.style.display = 'none';
}

// Grup bazlı doğrulama fonksiyonu
function validateAdminForCurrentGroup() {
  const storedGroupId = localStorage.getItem('groupId');
  const isAuth = localStorage.getItem('authenticated') === 'true';

  // Eğer admin girişi varsa ama grup ID'si uyuşmuyorsa
  if (isAuth && storedGroupId !== currentGroupId) {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('adminUsername');
    localStorage.removeItem('groupName');
    localStorage.removeItem('groupId');
    console.log('Grup uyuşmazlığı tespit edildi. Admin yetkileri kaldırılıyor.');
    hideAdminElements();
    return false;
  }

  return isAuth && storedGroupId === currentGroupId;
}

// Cross-tab communication için storage event listener
function setupCrossTabSecurity() {
  window.addEventListener('storage', function (e) {
    if (e.key === 'groupId' || e.key === 'authenticated') {
      validateAdminForCurrentGroup();
    }
  });
}

document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Grup değişikliğini hemen kontrol et ve temizlik yap
    const groupChanged = cleanupCrossGroupCookies();
    if (groupChanged) {
      console.log('Grup değişikliği tespit edildi, admin verileri temizlendi');
    }

    // Cross-tab security setup
    setupCrossTabSecurity();

    // Grup bazlı admin doğrulaması
    const isValidAdmin = validateAdminForCurrentGroup();

    if (!isValidAdmin) {
      hideAdminElements();
    }

    // Periyodik doğrulama - her 2 saniyede bir admin durumunu kontrol et
    setInterval(() => {
      validateAdminForCurrentGroup();
    }, 2000);

    // Grup ID'si yoksa gruplar sayfasına yönlendir
    if (currentGroupId === null) {
      window.location.href = '/groups.html';
      return;
    }

    // Grup doğrulama
    await validateGroup();

    // İlk çalışacak kritik fonksiyonlar
    await Promise.all([
      loadTrackerTable(),
      loadUserCards(),
      loadReadingStats(),
      renderLongestSeries(),
      loadMonthlyCalendar()
    ]);

    // Sırayla çalışacak diğer fonksiyonlar
    const functions = [
      { name: 'fetchRandomQuoteImage', fn: fetchRandomQuoteImage },
      { name: 'fetchRandomAyet', fn: fetchRandomAyet },
      { name: 'fetchRandomQuote', fn: fetchRandomQuote },
      { name: 'fetchRandomHadis', fn: fetchRandomHadis },
      { name: 'fetchRandomDua', fn: fetchRandomDua },
      { name: 'initializeVideos', fn: initializeVideos },
      { name: 'renderUserList', fn: renderUserList },
      { name: 'logPageVisit', fn: logPageVisit }
    ];

    // Fonksiyonları sırayla çalıştır
    for (const func of functions) {
      try {
        await func.fn();
      } catch (error) {
        console.error(`${func.name} çalıştırılırken hata:`, error);
      }
    }

  } catch (error) {
    console.error('Sayfa yüklenirken hata oluştu:', error);
  }
});

// Grup doğrulama fonksiyonu
async function validateGroup() {
  try {
    const response = await fetch(`/api/group/${currentGroupId}`);

    if (!response.ok) {
      if (response.status === 404) {
        // Grup yoksa gruplar sayfasına yönlendir
        console.log('Grup bulunamadı, gruplar sayfasına yönlendiriliyor:', currentGroupId);
        window.location.href = '/groups.html';
        return false;
      }
      throw new Error('Grup doğrulama hatası');
    }

    const data = await response.json();
    console.log('Grup doğrulandı:', data.group);
    return true;
  } catch (error) {
    console.error('Grup doğrulama hatası:', error);
    // Hata durumunda gruplar sayfasına yönlendir
    window.location.href = '/groups.html';
    return false;
  }
}



function isAuthenticated() {
  return localStorage.getItem('authenticated') === 'true';
}

async function logUnauthorizedAccess(action) {     //yetkisiz erişim kontrolü
  if (localStorage.getItem('cookieConsent') !== 'accepted') {
    return;
  }

  try {
    // Collect device information
    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };


    // Send log to server
    await fetch('/api/log-unauthorized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, deviceInfo })
    });
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
    logUnauthorizedAccess('error');
  }
}

async function logPageVisit() {    //sayfa ziyaretleri kontrolü
  if (localStorage.getItem('cookieConsent') !== 'accepted') {
    return;
  }
  try {
    // Collect device information
    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };

    // Send log to server
    await fetch('/api/log-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceInfo })
    });
  } catch (error) {
    console.error('Error logging page visit:', error);
  }
  console.log("logPageVisit");
}

async function verifyAdminUsername() {     //admin kullanıcı adı doğrulama - halen geçerlimiye bakıyor
  const username = localStorage.getItem('adminUsername');
  const storedGroupId = localStorage.getItem('groupId');

  if (!username || !storedGroupId || storedGroupId !== currentGroupId) {
    if (storedGroupId !== currentGroupId) {
      // Grup uyuşmazlığı varsa bilgileri temizle
      localStorage.removeItem('authenticated');
      localStorage.removeItem('adminUsername');
      localStorage.removeItem('groupName');
      localStorage.removeItem('groupId');
      hideAdminElements();
    }
    return false;
  }

  try {
    const response = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, groupId: currentGroupId })
    });

    const data = await response.json();
    if (!data.valid) {
      // Admin username no longer exists in database or group mismatch, clear authentication
      localStorage.removeItem('authenticated');
      localStorage.removeItem('adminUsername');
      localStorage.removeItem('groupName');
      localStorage.removeItem('groupId');

      // Hide admin elements
      hideAdminElements();
      const mainArea = document.querySelector('.main-area');
      if (mainArea) mainArea.style.display = 'none';

      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying admin username:', error);
    return false;
  }
}

// Eğer firstDayOfWeek değişkeni yoksa, varsayılanı belirle
if (typeof window.firstDayOfWeek === 'undefined') {
  window.firstDayOfWeek = 1; // Pazartesi varsayılan
}
