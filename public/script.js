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
    const groupid = getGroupIdFromUrl();
    if (!groupid) return null;
    
    const groups = this.getGroups();
    return groups[groupid] || null;
  }

  // Mevcut grup için kullanıcı bilgilerini al
  static getCurrentUserInfo() {
    const groupid = getGroupIdFromUrl();
    if (!groupid) return null;

    const userId = this.getCurrentUserId();
    if (!userId) return null;

    return {
      groupId: groupid,
      userId: userId,
      userAuthority: localStorage.getItem('userAuthority'),
      userName: localStorage.getItem('userName'),
      groupName: localStorage.getItem('groupName')
    };
  }

  // Kullanıcı girişi yap
  static loginUser(groupId, userId, userAuthority, userName, groupName) {
    // Groups objesine ekle
    this.addUserToGroup(groupId, userId);
    
    // Mevcut grup bilgilerini kaydet
    localStorage.setItem('groupid', groupId);
    localStorage.setItem('userid', userId);
    localStorage.setItem('userAuthority', userAuthority);
    localStorage.setItem('userName', userName);
    localStorage.setItem('groupName', groupName);
  }

  // Kullanıcı çıkışı yap
  static logoutUser() {
    const groupid = getGroupIdFromUrl();
    if (groupid) {
      this.removeUserFromGroup(groupid);
    }
    
    // Mevcut grup bilgilerini sil
    localStorage.removeItem('groupid');
    localStorage.removeItem('userid');
    localStorage.removeItem('userAuthority');
    localStorage.removeItem('userName');
    localStorage.removeItem('groupName');
  }

  // 5 çerezi temizle
  static clearCookies() {
    localStorage.removeItem('groupid');
    localStorage.removeItem('userid');
    localStorage.removeItem('userAuthority');
    localStorage.removeItem('userName');
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
  const groupIdMatch = path.match(/\/groupid=([^\/\?]+)/);
  if (groupIdMatch) {
    const decodedGroupId = decodeURIComponent(groupIdMatch[1]);
    return decodedGroupId;
  }
  
  // Eski format desteği (geriye uyumluluk için)
  const segments = path.split('/').filter(segment => segment !== '');
  if (segments.length > 0) {
    let groupId = segments[0];
    if (groupId.includes(':')) {
      groupId = groupId.split(':')[0];
    }
    groupId = decodeURIComponent(groupId);
    groupId = groupId.replace(/[^a-zA-Z0-9_-çğıöşüÇĞIİÖŞÜ]/g, '');
    return groupId;
  }

  return null;
};

// URL'den davet parametrelerini kontrol etme fonksiyonu
window.getInviteParams = function getInviteParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const invite = urlParams.get('invite');
  const quickLogin = urlParams.get('quick-login');
  
  // URL'de quick-login parametresi var mı kontrol et
  const hasQuickLogin = quickLogin !== null;
  
  return {
    hasInvite: hasQuickLogin && invite,
    inviteToken: invite
  };
};

// Global grup ID değişkeni
window.groupid = getGroupIdFromUrl();

// Admin elementlerini gizleme fonksiyonu
function hideAdminElements() {
  const adminIndicator = document.querySelector('.admin-indicator');
  if (adminIndicator) adminIndicator.style.display = 'none';
}

// YENİ YETKİ KONTROLÜ SİSTEMİ
// Sayfa yüklendiğinde 5 çerezi sil, groups dizisinden kontrol et, varsa yeniden oluştur
async function initializeAuthSystem() {
  
  // Admin sayfaları için çerezleri silme
  const currentPath = window.location.pathname;
  if (currentPath === '/login-logs.html' || currentPath === '/admin-logs.html') {
    return true;
  }
  
  // 1. Önce 5 çerezi temizle
  LocalStorageManager.clearCookies();
  
  // 2. URL'deki grup ID'sini al
  const groupid = getGroupIdFromUrl();
  if (!groupid) {
    return false;
  }

  // 3. Groups dizisinde bu grup var mı kontrol et
  const groups = LocalStorageManager.getGroups();
  const userId = groups[groupid];
  
  if (!userId) {
    return false;
  }
  
  
  try {
    // 4. Kullanıcının hala bu grupta olup olmadığını kontrol et
    const response = await fetch(`/api/users/${groupid}`);
    if (!response.ok) {
      LocalStorageManager.removeUserFromGroup(groupid);
      return false;
    }

    const data = await response.json();
    const user = data.users.find(u => u._id === userId);
    
    if (!user) {
      LocalStorageManager.removeUserFromGroup(groupid);
      return false;
    }
    
    // 5. Grup bilgilerini al
    const groupResponse = await fetch(`/api/group/${groupid}`);
    if (!groupResponse.ok) {
      return false;
    }

    const groupData = await groupResponse.json();
    
    // 6. 5 çerezi yeniden oluştur
    LocalStorageManager.loginUser(
      groupid,
      userId,
      user.authority,
      user.username,
      groupData.group.groupName
    );
    
  
    // UI güncellemelerini tetikle
    if (typeof window.updateProfileButton === 'function') {
      window.updateProfileButton();
    }

    if (typeof showAdminIndicator === 'function') {
      showAdminIndicator();
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Yetki kontrolü hatası:', error);
    return false;
  }
}

// Grup doğrulama fonksiyonu
async function validateGroup() {
  try {
    const response = await fetch(`/api/group/${window.groupid}`);

    if (!response.ok) {
      if (response.status === 404) {
        window.location.href = '/';
        return false;
      }
      throw new Error('Grup doğrulama hatası');
    }

    const data = await response.json();
    const group = data.group;
    
    // Davet parametrelerini kontrol et
    const inviteParams = getInviteParams();
    
    // Eğer davet linki ile gelinmişse hoşgeldiniz panelini aç
    if (inviteParams.hasInvite) {
      try {
        // Token doğrulama
        const encodedGroupId = encodeURIComponent(window.groupid);
        const response = await fetch(`/api/verify-invite/${encodedGroupId}?invite=${inviteParams.inviteToken}`);
        
        if (!response.ok) {
          // 404 veya başka hata - temiz grup linkine yönlendir
          const cleanUrl = `/groupid=${encodeURIComponent(window.groupid)}`;
          window.location.href = cleanUrl;
          return false;
        }
        
        const data = await response.json();

        if (data.success) {
          // Geçerli token - hoşgeldiniz panelini aç
          if (typeof window.showWelcomeInviteModal === 'function') {
            await window.showWelcomeInviteModal(group, data);
          }
          return true; // Davet linki ile gelinmişse normal akışı durdur
        } else {
          // Geçersiz token - temiz grup linkine yönlendir
          const cleanUrl = `/groupid=${encodeURIComponent(window.groupid)}`;
          window.location.href = cleanUrl;
          return false;
        }
      } catch (error) {
        console.error('Token doğrulama hatası:', error);
        // Hata durumunda da temiz grup linkine yönlendir
        const cleanUrl = `/groupid=${encodeURIComponent(window.groupid)}`;
        window.location.href = cleanUrl;
        return false;
      }
    }
    
    // Grup visibility kontrolü (sadece normal linkler için)
    if (group.visibility === 'private') {
      // Kullanıcı giriş yapmış mı kontrol et
      if (!LocalStorageManager.isUserLoggedIn()) {
        // Giriş yapmamışsa login modal'ı aç
        const groupsAuthLoginModal = document.getElementById('groupsAuthLoginModal');
        if (groupsAuthLoginModal) {
          // Private grup erişimi için modal açıldığını işaretle
          window.isPrivateGroupAccessModal = true;
          
          showModal(groupsAuthLoginModal);
          
          // Modal içindeki bilgilendirme mesajını güncelle
          const loginTitle = document.querySelector('#groupsAuthLoginModal .groups-auth-login-modal-title h2');
          if (loginTitle) {
            loginTitle.textContent = 'Gizli Gruba Erişim';
          }
          
          const loginSubtitle = document.querySelector('#groupsAuthLoginModal .groups-auth-login-modal-subtitle');
          if (loginSubtitle) {
            loginSubtitle.textContent = 'Bu grup gizlidir. Erişim için giriş yapmanız gerekmektedir.';
          }
          
          // Bilgilendirme mesajını göster
          const infoMessage = document.getElementById('groupsAuthLoginInfoMessage');
          const infoText = document.getElementById('groupsAuthLoginInfoText');
          if (infoMessage && infoText) {
            infoText.textContent = 'Bu grubu görüntülemek için giriş yapmanız veya üye olmanız gerekmektedir.';
            infoMessage.style.display = 'flex';
          }
        }
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Grup doğrulama hatası:', error);
    window.location.href = '/';
    return false;
  }
}

// Eski isAuthenticated fonksiyonunu yeni sisteme göre güncelle
function isAuthenticated() {
  return LocalStorageManager.isUserLoggedIn();
}

// Profil butonunu dinamik hale getirme fonksiyonu
function initializeProfileButton() {
  const profileButton = document.getElementById('profileButton');
  const profileButtonText = document.getElementById('profileButtonText');
  const profileButtonIcon = document.getElementById('profileButtonIcon');
  const adminLoginModal = document.getElementById('adminLoginModal');
  
  if (!profileButton || !profileButtonText || !profileButtonIcon) return;
  
  function checkAuthStatus() {
    const userInfo = LocalStorageManager.getCurrentUserInfo();
    
    if (userInfo) {
      const username = userInfo.userName || 'Kullanıcı';
      const userAuthority = userInfo.userAuthority;
      
      profileButtonText.textContent = 'Profilim';
      
      if (userAuthority === 'admin') {
        profileButton.title = 'Yönetici Profili: ' + username;
        profileButtonIcon.className = 'fa-solid fa-user-circle';
        profileButtonIcon.style.fontSize = '20px';
        profileButtonIcon.style.color = '#4e54c8';
        profileButton.style.backgroundColor = '#e8f0ff';
        profileButton.style.borderColor = '#4e54c8';
      } else {
        profileButton.title = 'Üye Profili: ' + username;
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
      profileButtonText.textContent = 'Giriş Yap';
      profileButton.title = 'Kullanıcı Girişi';
      
      profileButtonIcon.className = 'fa-solid fa-sign-in-alt';
      profileButtonIcon.style.fontSize = '20px';
      profileButtonIcon.style.color = '#007bff';
      profileButton.style.backgroundColor = '#e3f2fd';
      profileButton.style.borderColor = '#007bff';
      
      profileButton.onclick = function() {
        if (adminLoginModal) {
          adminLoginModal.style.display = 'flex';
        }
      };
    }
  }
  
  checkAuthStatus();
  
  // LocalStorage değişikliklerini dinle
  window.addEventListener('storage', function(e) {
    if (e.key === 'groups' || e.key === 'groupid' || e.key === 'userid' || e.key === 'userAuthority' || e.key === 'userName' || e.key === 'groupName') {
      checkAuthStatus();
    }
  });
  
  // Programatik localStorage değişikliklerini de dinle
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (key === 'groups' || key === 'groupid' || key === 'userid' || key === 'userAuthority' || key === 'userName' || key === 'groupName') {
      setTimeout(checkAuthStatus, 100);
    }
  };
  
  window.updateProfileButton = checkAuthStatus;
}

// Title'ı grup adına göre güncelleme fonksiyonu
async function updatePageTitle() {
  const pageTitle = document.getElementById('page-title');
  const secretAdminLogin = document.getElementById('secretAdminLogin');
  
  if (!pageTitle && !secretAdminLogin) return;

  const groupId = getGroupIdFromUrl();
  if (!groupId) return;

  try {
    const response = await fetch(`/api/group/${groupId}`);
    if (response.ok) {
      const data = await response.json();
      const groupName = data.group.groupName;
      
      if (pageTitle) {
        pageTitle.textContent = `RoTaKip ${groupName}`;
      }
      
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

// Ana DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', async function () {
  try {
    // Debug için URL bilgilerini logla
    console.log('🔍 URL Debug Info:');
    console.log('Full URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Search:', window.location.search);
    console.log('Group ID:', window.groupid);
    
    const inviteParams = getInviteParams();
    console.log('Invite Params:', inviteParams);
    
    // Admin sayfaları için özel kontrol
    const currentPath = window.location.pathname;
    if (currentPath === '/login-logs.html' || currentPath === '/admin-logs.html') {
      // Admin sayfaları için çerezleri silmeden devam et
      return;
    }
    
    // Grup ID'si yoksa ana sayfaya yönlendir
    if (window.groupid === null) {
      console.log('❌ Group ID is null, redirecting to home');
      window.location.href = '/';
      return;
    }

    // YENİ YETKİ KONTROLÜ SİSTEMİ
    await initializeAuthSystem();

    // Grup doğrulama
    await validateGroup();

    // Profil butonunu başlat
    initializeProfileButton();

    // Title'ı güncelle
    updatePageTitle();

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
        if (LocalStorageManager.isAdmin()) {
          return renderUserList();
        } else {
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

  } catch (error) {
    console.error('Sayfa yüklenirken hata oluştu:', error);
  }
});

// Grup değişikliğinde title'ı güncelle
window.addEventListener('popstate', function() {
  updatePageTitle();
});

// Private grup erişimi için modal açıldığını belirten flag
window.isPrivateGroupAccessModal = false;


// ============================================================================
// GROUPS.HTML SAYFASI İÇİN OTOMATİK GİRİŞ KONTROLÜ
// ============================================================================

// Groups.html sayfası için otomatik giriş kontrolü
async function checkAutoLoginForGroups() {
  
  // Admin sayfaları için otomatik giriş kontrolü yapma
  const currentPath = window.location.pathname;
  if (currentPath === '/login-logs.html' || currentPath === '/admin-logs.html') {
    return;
  }
  
  const groupid = getGroupIdFromUrl();
  if (!groupid) {
    return;
  }

  // Groups objesinde bu grup var mı kontrol et
  const groups = LocalStorageManager.getGroups();
  const userId = groups[groupid];
  
  if (!userId) {
    return;
  }

  try {
    // Kullanıcının hala bu grupta olup olmadığını kontrol et
    const response = await fetch(`/api/users/${groupid}`);
    if (!response.ok) {
      return;
    }

    const data = await response.json();
    const user = data.users.find(u => u._id === userId);
    
    if (!user) {
      LocalStorageManager.removeUserFromGroup(groupid);
      return;
    }

    // Kullanıcı bilgilerini otomatik olarak yükle
    const groupResponse = await fetch(`/api/group/${groupid}`);
    if (!groupResponse.ok) {
      return;
    }

    const groupData = await groupResponse.json();
    
    // Kullanıcı bilgilerini localStorage'a kaydet
    LocalStorageManager.loginUser(
      groupid,
      userId,
      user.authority,
      user.username,
      groupData.group.groupName
    );

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
    setTimeout(checkAutoLoginForGroups, 100);
  });
}

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

// Eğer firstDayOfWeek değişkeni yoksa, varsayılanı belirle
if (typeof window.firstDayOfWeek === 'undefined') {
  window.firstDayOfWeek = 1; // Pazartesi varsayılan
  localStorage.setItem('firstDayOfWeek', 1);
}

// Yetkisiz erişim kontrolü
async function logUnauthorizedAccess(action) {
  if (localStorage.getItem('cookieConsent') !== 'accepted') {
    return;
  }

  // userName kontrolü
  const userName = localStorage.getItem('userName');
  if (!userName) {
    return;
  }

  // Ad blocker veya güvenlik yazılımı kontrolü
  if (typeof fetch === 'undefined') {
    return;
  }

  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };

    const response = await fetch('/api/log-unauthorized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action, 
        deviceInfo,
        groupId: getGroupIdFromUrl(),
        userName: userName
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
  } catch (error) {
    // Sadece gerçek hataları logla, ad blocker'ları sessizce geç
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    } else {
      console.error('Error logging unauthorized access:', error);
      // Recursive call'u kaldırdık çünkü sonsuz döngüye sebep olabilir
    }
  }
}

// Sayfa ziyaretleri kontrolü
async function logPageVisit() {
  if (localStorage.getItem('cookieConsent') !== 'accepted') {
    return;
  }

  // userName kontrolü
  const userName = localStorage.getItem('userName');
  if (!userName) {
    return;
  }
  
  // Ad blocker veya güvenlik yazılımı kontrolü
  if (typeof fetch === 'undefined') {
    return;
  }
  
  try {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };

    const response = await fetch('/api/log-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        deviceInfo,
        groupId: getGroupIdFromUrl(),
        userName: userName
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
  } catch (error) {
    // Sadece gerçek hataları logla, ad blocker'ları sessizce geç
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
    } else {
      console.error('Error logging page visit:', error);
    }
  }
}

// Kullanıcı adı doğrulama
async function verifyUserUsername() {
  const userInfo = LocalStorageManager.getCurrentUserInfo();
  
  if (!userInfo) {
    return false;
  }

  const { groupId, userId, userAuthority, userName } = userInfo;

  try {
    if (userAuthority === 'admin') {
      const response = await fetch('/api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName, groupId: groupId })
      });

      const data = await response.json();
      if (!data.valid) {
        LocalStorageManager.logoutUser();
        hideAdminElements();
        const mainArea = document.querySelector('.main-area');
        if (mainArea) console.log(mainArea.style.display+" silindi");
        mainArea.style.display = 'none';
        return false;
      }
    } else if (userAuthority === 'member') {
      const response = await fetch(`/api/group/${groupId}`);
      if (!response.ok) {
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

// Yukarı Çık Butonu Fonksiyonalitesi
document.addEventListener('DOMContentLoaded', function() {
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  
  if (scrollToTopBtn) {
    // Sayfa kaydırma olayını dinle
    window.addEventListener('scroll', function() {
      if (window.pageYOffset > 1000) {
        scrollToTopBtn.classList.add('show');
      } else {
        scrollToTopBtn.classList.remove('show');
      }
    });
    
    // Butona tıklandığında sayfanın en üstüne git
    scrollToTopBtn.addEventListener('click', function() {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
});