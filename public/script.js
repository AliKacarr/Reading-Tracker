// URL'den grup ID'sini çıkarma fonksiyonu
window.getGroupIdFromUrl = function getGroupIdFromUrl() {
  const path = window.location.pathname;
  
  // Yeni format: /groupid=catikati23
  const groupIdMatch = path.match(/\/groupid=([^\/]+)/);
  if (groupIdMatch) {
    // URL decode işlemi yap
    const decodedGroupId = decodeURIComponent(groupIdMatch[1]);
    return decodedGroupId;
  }
  
  // Eski format desteği (geriye uyumluluk için)
  const segments = path.split('/').filter(segment => segment !== '');
  if (segments.length > 0) {
    let groupId = segments[0];
    // Eğer grup ID'sinde :1 gibi port eki varsa temizle
    if (groupId.includes(':')) {
      groupId = groupId.split(':')[0];
    }
    // URL decode işlemi yap
    groupId = decodeURIComponent(groupId);
    // Sadece alfanumerik karakterler, alt çizgi, tire ve Türkçe karakterler kabul et
    groupId = groupId.replace(/[^a-zA-Z0-9_-çğıöşüÇĞIİÖŞÜ]/g, '');
    return groupId;
  }

  // Ana sayfa için null döndür (ana sayfaya yönlendirilecek)
  return null;
};

// Global grup ID değişkeni
let currentGroupId = getGroupIdFromUrl();
let previousGroupId = localStorage.getItem('groupId');

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

// Admin elementlerini gizleme fonksiyonu
function hideAdminElements() {
  const adminIndicator = document.querySelector('.admin-indicator');

  if (adminIndicator) adminIndicator.style.display = 'none';
  
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

    // Grup ID'si yoksa ana sayfaya yönlendir
    if (currentGroupId === null) {
      window.location.href = '/';
      return;
    }

    // Grup doğrulama
    await validateGroup();

    // Profil butonunu başlat
    initializeProfileButton();

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
      { name: 'renderUserList', fn: () => {
        // Admin yetkisi kontrolü
        if (isAuthenticated()) {
          return renderUserList();
        } else {
          console.log('Admin yetkisi yok, renderUserList atlanıyor');
          return Promise.resolve();
        }
      }},
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

    // Yenileme butonu event listener'ı
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        window.location.reload();
      });
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
        // Grup yoksa ana sayfaya yönlendir
        console.log('Grup bulunamadı, ana sayfaya yönlendiriliyor:', currentGroupId);
        window.location.href = '/';
        return false;
      }
      throw new Error('Grup doğrulama hatası');
    }

    const data = await response.json();
    console.log('Grup doğrulandı:', data.group);
    return true;
  } catch (error) {
    console.error('Grup doğrulama hatası:', error);
    // Hata durumunda ana sayfaya yönlendir
    window.location.href = '/';
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
      if (mainArea) console.log(mainArea.style.display+" silindi");
      mainArea.style.display = 'none';

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

// Profil butonunu dinamik hale getirme fonksiyonu
function initializeProfileButton() {
  const profileButton = document.getElementById('profileButton');
  const profileButtonText = document.getElementById('profileButtonText');
  const profileButtonIcon = document.getElementById('profileButtonIcon');
  const adminLoginModal = document.getElementById('adminLoginModal');
  
  if (!profileButton || !profileButtonText || !profileButtonIcon) return;
  
  // Admin giriş durumunu kontrol etme fonksiyonu
  function checkAuthStatus() {
    const isAuthenticated = localStorage.getItem('authenticated') === 'true';
    
    if (isAuthenticated) {
      // Giriş yapılmışsa - Yönetici adı butonu
      const adminUsername = localStorage.getItem('adminUsername') || 'Yönetici';
      // Uzun isimleri kısalt
      const shortUsername = adminUsername.length > 12 ? adminUsername.substring(0, 12) + '...' : adminUsername;
      profileButtonText.textContent = shortUsername;
      profileButton.title = 'Yönetici Profili: ' + adminUsername;
      
      // Profil ikonu ve rengi - Mavimsi
      profileButtonIcon.className = 'fa-solid fa-user-circle';
      profileButtonIcon.style.fontSize = '20px';
      profileButtonIcon.style.color = '#4e54c8'; // Mavimsi
      profileButton.style.backgroundColor = '#e8f0ff';
      profileButton.style.borderColor = '#4e54c8';
      
      profileButton.onclick = function() {
        if (typeof showAdminInfoPanel === 'function') {
          showAdminInfoPanel();
        }
      };
    } else {
      // Giriş yapılmamışsa - Giriş Yap butonu
      profileButtonText.textContent = 'Giriş Yap';
      profileButton.title = 'Yönetici Girişi';
      
      // Giriş ikonu ve rengi
      profileButtonIcon.className = 'fa-solid fa-sign-in-alt';
      profileButtonIcon.style.fontSize = '20px';
      profileButtonIcon.style.color = '#007bff'; // Mavi
      profileButton.style.backgroundColor = '#e3f2fd';
      profileButton.style.borderColor = '#007bff';
      
      profileButton.onclick = function() {
        if (adminLoginModal) {
          adminLoginModal.style.display = 'flex';
        }
      };
    }
  }
  
  // İlk yüklemede kontrol et
  checkAuthStatus();
  
  // LocalStorage değişikliklerini dinle
  window.addEventListener('storage', function(e) {
    if (e.key === 'authenticated') {
      checkAuthStatus();
    }
  });
  
  // Programatik localStorage değişikliklerini de dinle
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (key === 'authenticated') {
      setTimeout(checkAuthStatus, 100);
    }
  };
  
  // Global olarak erişilebilir hale getir
  window.updateProfileButton = checkAuthStatus;
}

// Title'ı grup adına göre güncelleme fonksiyonu
async function updatePageTitle() {
  const pageTitle = document.getElementById('page-title');
  const secretAdminLogin = document.getElementById('secretAdminLogin');
  
  if (!pageTitle && !secretAdminLogin) return;

  // URL'den grup ID'sini al
  const groupId = getGroupIdFromUrl();
  if (!groupId) return;

  try {
    // Sunucudan grup bilgisini çek
    const response = await fetch(`/api/group/${groupId}`);
    if (response.ok) {
      const data = await response.json();
      const groupName = data.group.groupName;
      
      // Title'ı güncelle
      if (pageTitle) {
        pageTitle.textContent = `RoTaKip ${groupName}`;
      }
      
      // Secret admin login yazısını güncelle
      if (secretAdminLogin) {
        const groupImage = data.group.groupImage;
        const imgSrc = groupImage || '/images/open-book.webp';
        
        secretAdminLogin.innerHTML = `
          <img src="${imgSrc}" class="secretAdminLoginImage" alt="Grup Resmi" style="border-radius: 6px;">
          <h2 style="margin: 0; font-size: inherit; font-weight: inherit;">${groupName} Okuma Grubu</h2>
        `;
      }
    }
  } catch (error) {
    console.error('Grup bilgisi alınamadı:', error);
  }
}

// Sayfa yüklendiğinde title'ı güncelle
document.addEventListener('DOMContentLoaded', function() {
  updatePageTitle();
});

// Grup değişikliğinde title'ı güncelle (URL değişikliği için)
window.addEventListener('popstate', function() {
  updatePageTitle();
});