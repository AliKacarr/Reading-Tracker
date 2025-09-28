// ============================================================================
// YENİ YEREL DEPOLAMA SİSTEMİ
// ============================================================================

// Yeni yerel depolama yönetimi fonksiyonları
class LocalStorageManager {
  // Groups objesini al
  static getGroups() {
    const groups = localStorage.getItem('groups');
    return groups ? JSON.parse(groups) : {};
  }

  // Groups objesini kaydet
  static setGroups(groups) {
    localStorage.setItem('groups', JSON.stringify(groups));
  }

  // Bir gruba kullanıcı ekle/güncelle
  static addUserToGroup(groupId, userId) {
    const groups = this.getGroups();
    groups[groupId] = userId;
    this.setGroups(groups);
  }

  // Bir gruptan kullanıcıyı kaldır
  static removeUserFromGroup(groupId) {
    const groups = this.getGroups();
    delete groups[groupId];
    this.setGroups(groups);
  }

  // Mevcut grup için kullanıcı ID'sini al
  static getCurrentUserId() {
    const currentGroupId = getGroupIdFromUrl();
    if (!currentGroupId) return null;
    
    const groups = this.getGroups();
    return groups[currentGroupId] || null;
  }

  // Mevcut grup için kullanıcı bilgilerini al
  static getCurrentUserInfo() {
    const currentGroupId = getGroupIdFromUrl();
    if (!currentGroupId) return null;

    const userId = this.getCurrentUserId();
    if (!userId) return null;

    return {
      groupId: currentGroupId,
      userId: userId,
      userAuthority: localStorage.getItem('userAuthority'),
      adminUserName: localStorage.getItem('adminUserName'),
      groupName: localStorage.getItem('groupName')
    };
  }

  // Kullanıcı girişi yap
  static loginUser(groupId, userId, userAuthority, adminUserName, groupName) {
    // Groups objesine ekle
    this.addUserToGroup(groupId, userId);
    
    // Mevcut grup bilgilerini kaydet
    localStorage.setItem('groupid', groupId);
    localStorage.setItem('userid', userId);
    localStorage.setItem('userAuthority', userAuthority);
    localStorage.setItem('adminUserName', adminUserName);
    localStorage.setItem('groupName', groupName);
  }

  // Kullanıcı çıkışı yap
  static logoutUser() {
    const currentGroupId = getGroupIdFromUrl();
    if (currentGroupId) {
      this.removeUserFromGroup(currentGroupId);
    }
    
    // Mevcut grup bilgilerini sil
    localStorage.removeItem('groupid');
    localStorage.removeItem('userid');
    localStorage.removeItem('userAuthority');
    localStorage.removeItem('adminUserName');
    localStorage.removeItem('groupName');
  }

  // Kullanıcının giriş yapıp yapmadığını kontrol et
  static isUserLoggedIn() {
    const userInfo = this.getCurrentUserInfo();
    return userInfo !== null;
  }

  // Admin yetkisi kontrolü
  static isAdmin() {
    const userInfo = this.getCurrentUserInfo();
    return userInfo && userInfo.userAuthority === 'admin';
  }

  // Member yetkisi kontrolü
  static isMember() {
    const userInfo = this.getCurrentUserInfo();
    return userInfo && userInfo.userAuthority === 'member';
  }
}

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
window.currentGroupId = getGroupIdFromUrl();
let previousGroupId = localStorage.getItem('groupId');

// Grup değişikliğinde çerezleri temizleme fonksiyonu
function cleanupCrossGroupCookies() {
  const storedGroupId = localStorage.getItem('groupid');

  if (storedGroupId && storedGroupId !== window.currentGroupId) {
    console.log('Grup değişikliği tespit edildi. Mevcut grup bilgileri temizleniyor...');
    LocalStorageManager.logoutUser();
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
  const userInfo = LocalStorageManager.getCurrentUserInfo();
  
  if (!userInfo) {
    return false;
  }

  // Eğer kullanıcı girişi varsa ama grup ID'si uyuşmuyorsa
  if (userInfo.groupId !== window.currentGroupId) {
    LocalStorageManager.logoutUser();
    console.log('Grup uyuşmazlığı tespit edildi. Kullanıcı bilgileri kaldırılıyor.');
    hideAdminElements();
    return false;
  }

  return true;
}

// Cross-tab communication için storage event listener
function setupCrossTabSecurity() {
  window.addEventListener('storage', function (e) {
    if (e.key === 'groups' || e.key === 'groupid' || e.key === 'userid' || e.key === 'userAuthority' || e.key === 'adminUserName' || e.key === 'groupName') {
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
    if (window.currentGroupId === null) {
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
        // Sadece admin yetkisi kontrolü
        if (LocalStorageManager.isAdmin()) {
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
    const response = await fetch(`/api/group/${window.currentGroupId}`);

    if (!response.ok) {
      if (response.status === 404) {
        // Grup yoksa ana sayfaya yönlendir
        console.log('Grup bulunamadı, ana sayfaya yönlendiriliyor:', window.currentGroupId);
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



// Eski isAuthenticated fonksiyonunu yeni sisteme göre güncelle
function isAuthenticated() {
  return LocalStorageManager.isUserLoggedIn();
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

async function verifyUserUsername() {     //kullanıcı adı doğrulama - hem admin hem member için
  const userInfo = LocalStorageManager.getCurrentUserInfo();
  
  if (!userInfo) {
    return false;
  }

  const { groupId, userId, userAuthority, adminUserName } = userInfo;

  try {
    // Admin kullanıcıları için admin doğrulama
    if (userAuthority === 'admin') {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUserName, groupId: groupId })
      });

      const data = await response.json();
      if (!data.valid) {
        // Admin username no longer exists in database or group mismatch, clear authentication
        LocalStorageManager.logoutUser();
        hideAdminElements();
        const mainArea = document.querySelector('.main-area');
        if (mainArea) console.log(mainArea.style.display+" silindi");
        mainArea.style.display = 'none';
        return false;
      }
    }
    // Member kullanıcıları için basit grup kontrolü yeterli
    else if (userAuthority === 'member') {
      // Member kullanıcıları için sadece grup varlığını kontrol et
      const response = await fetch(`/api/group/${groupId}`);
      if (!response.ok) {
        // Grup yoksa bilgileri temizle
        LocalStorageManager.logoutUser();
        hideAdminElements();
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('User verification error:', error);
    return false;
  }
}

// Eğer firstDayOfWeek değişkeni yoksa, varsayılanı belirle
if (typeof window.firstDayOfWeek === 'undefined') {
  window.firstDayOfWeek = 1; // Pazartesi varsayılan
  localStorage.setItem('firstDayOfWeek', 1);
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
    const userInfo = LocalStorageManager.getCurrentUserInfo();
    
    if (userInfo) {
      // Giriş yapılmışsa - Sabit "Profilim" yazısı
      const username = userInfo.adminUserName || 'Kullanıcı';
      const userAuthority = userInfo.userAuthority;
      
      // Sabit "Profilim" yazısı
      profileButtonText.textContent = 'Profilim';
      
      if (userAuthority === 'admin') {
        profileButton.title = 'Yönetici Profili: ' + username;
        // Profil ikonu ve rengi - Mavimsi
        profileButtonIcon.className = 'fa-solid fa-user-circle';
        profileButtonIcon.style.fontSize = '20px';
        profileButtonIcon.style.color = '#4e54c8'; // Mavimsi
        profileButton.style.backgroundColor = '#e8f0ff';
        profileButton.style.borderColor = '#4e54c8';
      } else {
        profileButton.title = 'Üye Profili: ' + username;
        // Profil ikonu
        profileButtonIcon.className = 'fa-solid fa-user';
        profileButtonIcon.style.fontSize = '20px';
        profileButtonIcon.style.color = '#4e54c8'; 
        profileButton.style.backgroundColor = '#e8f5e8';
        profileButton.style.borderColor = '#4e54c8';
      }
      
      profileButton.onclick = function() {
        if (typeof showAdminInfoPanel === 'function') {
          showAdminInfoPanel();
        }
      };
    } else {
      // Giriş yapılmamışsa - Giriş Yap butonu
      profileButtonText.textContent = 'Giriş Yap';
      profileButton.title = 'Kullanıcı Girişi';
      
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
    if (e.key === 'groups' || e.key === 'groupid' || e.key === 'userid' || e.key === 'userAuthority' || e.key === 'adminUserName' || e.key === 'groupName') {
      checkAuthStatus();
    }
  });
  
  // Programatik localStorage değişikliklerini de dinle
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (key === 'groups' || key === 'groupid' || key === 'userid' || key === 'userAuthority' || key === 'adminUserName' || key === 'groupName') {
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
          <img src="${imgSrc}" class="secretAdminLoginImage" alt="Grup Resmi" style="border-radius: 6px;" onerror="this.src='/images/open-book.webp'">
          <h2 style="margin: 0; font-size: inherit; font-weight: inherit;">${groupName} Okuma Grubu</h2>
        `;
      }
    }
  } catch (error) {
    console.error('Grup bilgisi alınamadı:', error);
  }
}

// Sayfa yüklendiğinde title'ı güncelle ve videoları başlat
document.addEventListener('DOMContentLoaded', function() {
  updatePageTitle();
});

// Grup değişikliğinde title'ı güncelle (URL değişikliği için)
window.addEventListener('popstate', function() {
  updatePageTitle();
});

// ============================================================================
// GROUPS.HTML SAYFASI İÇİN OTOMATİK GİRİŞ KONTROLÜ
// ============================================================================

// Groups.html sayfası için otomatik giriş kontrolü
async function checkAutoLoginForGroups() {
  const currentGroupId = getGroupIdFromUrl();
  if (!currentGroupId) return;

  // Groups objesinde bu grup var mı kontrol et
  const groups = LocalStorageManager.getGroups();
  const userId = groups[currentGroupId];
  
  if (!userId) {
    console.log('Bu grup için kayıtlı kullanıcı yok');
    return;
  }

  try {
    // Kullanıcının hala bu grupta olup olmadığını kontrol et
    const response = await fetch(`/api/users/${currentGroupId}`);
    if (!response.ok) {
      console.log('Grup bulunamadı veya erişim hatası');
      return;
    }

    const data = await response.json();
    const user = data.users.find(u => u._id === userId);
    
    if (!user) {
      console.log('Kullanıcı bu grupta bulunamadı, groups objesinden kaldırılıyor');
      LocalStorageManager.removeUserFromGroup(currentGroupId);
      return;
    }

    // Kullanıcı bilgilerini otomatik olarak yükle
    const groupResponse = await fetch(`/api/group/${currentGroupId}`);
    if (!groupResponse.ok) {
      console.log('Grup bilgisi alınamadı');
      return;
    }

    const groupData = await groupResponse.json();
    
    // Kullanıcı bilgilerini localStorage'a kaydet
    LocalStorageManager.loginUser(
      currentGroupId,
      userId,
      user.authority,
      user.username,
      groupData.group.groupName
    );

    console.log('Otomatik giriş başarılı:', {
      groupId: currentGroupId,
      userId: userId,
      authority: user.authority,
      username: user.username,
      groupName: groupData.group.groupName
    });

    // Profil butonunu güncelle
    if (typeof window.updateProfileButton === 'function') {
      window.updateProfileButton();
    }

    // Admin indicator'ı göster
    if (typeof showAdminIndicator === 'function') {
      showAdminIndicator();
    }

  } catch (error) {
    console.error('Otomatik giriş kontrolü hatası:', error);
  }
}

// Groups.html sayfası yüklendiğinde otomatik giriş kontrolü yap
if (window.location.pathname.includes('groupid=')) {
  document.addEventListener('DOMContentLoaded', function() {
    // Sayfa yüklendikten sonra otomatik giriş kontrolü yap
    setTimeout(checkAutoLoginForGroups, 100);
  });
}