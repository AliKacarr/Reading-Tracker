document.addEventListener('DOMContentLoaded', async function () {
  try {
    // İlk çalışacak kritik fonksiyonlar
    console.log('Kritik fonksiyonlar başlatılıyor...');
    await Promise.all([
      loadTrackerTable(),
      loadUserCards(),
      loadReadingStats(),
      renderLongestSeries()
    ]);
    console.log('Kritik fonksiyonlar tamamlandı');

    // Sırayla çalışacak diğer fonksiyonlar
    const functions = [
      { name: 'loadMonthlyCalendar', fn: loadMonthlyCalendar },
      { name: 'fetchRandomQuoteImage', fn: fetchRandomQuoteImage },
      { name: 'fetchRandomAyet', fn: fetchRandomAyet },
      { name: 'fetchRandomQuote', fn: fetchRandomQuote },
      { name: 'fetchRandomHadis', fn: fetchRandomHadis },
      { name: 'fetchRandomDua', fn: fetchRandomDua },
      { name: 'renderUserList', fn: renderUserList },
      { name: 'logPageVisit', fn: logPageVisit }
    ];

    for (const func of functions) {
      console.log(`${func.name} başlatılıyor...`);
      await func.fn();
      console.log(`${func.name} tamamlandı`);
    }

  } catch (error) {
    console.error('Sayfa yüklenirken hata oluştu:', error);
  }
});

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
