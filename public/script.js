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
  
  // Varsayılan grup ID'si (eski sistem için geriye dönük uyumluluk)
  return 'default';
}

// Global grup ID değişkeni
let currentGroupId = getGroupIdFromUrl();

document.addEventListener('DOMContentLoaded', async function () {
  try {
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
        // Grup yoksa otomatik oluştur
        console.log('Grup bulunamadı, otomatik oluşturuluyor:', currentGroupId);
        await createGroupAutomatically();
        return true;
      }
      throw new Error('Grup doğrulama hatası');
    }
    
    const data = await response.json();
    console.log('Grup doğrulandı:', data.group);
    return true;
  } catch (error) {
    console.error('Grup doğrulama hatası:', error);
    // Hata durumunda da otomatik oluşturmayı dene
    await createGroupAutomatically();
    return true;
  }
}

// Grup otomatik oluşturma fonksiyonu
async function createGroupAutomatically() {
  try {
    const response = await fetch('/api/create-group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupName: currentGroupId.charAt(0).toUpperCase() + currentGroupId.slice(1),
        groupId: currentGroupId
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Grup otomatik oluşturuldu:', data.group);
    } else {
      console.log('Grup zaten mevcut veya oluşturulamadı');
    }
  } catch (error) {
    console.error('Grup oluşturma hatası:', error);
  }
}

// Grup bulunamadığında gösterilecek hata mesajı
function showGroupNotFoundError() {
  document.body.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; font-family: Arial, sans-serif;">
      <h1 style="color: #e74c3c; margin-bottom: 20px;">Grup Bulunamadı</h1>
      <p style="color: #666; text-align: center; max-width: 400px;">
        <strong>${currentGroupId}</strong> grubu bulunamadı. Grup otomatik olarak oluşturulmaya çalışılıyor...
      </p>
      <div style="margin-top: 20px;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
      </div>
      <button onclick="window.location.reload()"
              style="margin-top: 20px; padding: 10px 20px; background-color: #3498db; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Sayfayı Yenile
      </button>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;
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

  if (!username) return false;

  try {
    const response = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json();
    if (!data.valid) {
      // Admin username no longer exists in database, clear authentication
      localStorage.removeItem('authenticated');
      localStorage.removeItem('adminUsername');

      // Hide admin elements
      const adminIndicator = document.querySelector('.admin-indicator');
      const adminLogsButton = document.getElementById('adminLogsButton');
      const loginLogsButton = document.getElementById('loginLogsButton');
      const mainArea = document.querySelector('.main-area');

      if (adminIndicator) adminIndicator.style.display = 'none';
      if (adminLogsButton) adminLogsButton.style.display = 'none';
      if (loginLogsButton) loginLogsButton.style.display = 'none';
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
