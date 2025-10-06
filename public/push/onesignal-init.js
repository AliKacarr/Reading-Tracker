// Tek seferlik OneSignal başlatma koruması
if (!window.OneSignalInitialized) {
    window.OneSignalInitialized = true;
  
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        // env.js ile gelen app id'yi kullan
        const appId = window.ONESIGNAL_APP_ID;
        if (!appId) {
          console.warn('OneSignal APP_ID bulunamadı');
          return;
        }
        await OneSignal.init({ appId });
  
        console.log("✅ OneSignal başarıyla başlatıldı");
  
        // Eğer kullanıcı daha önce izin vermişse:
        const permission = await OneSignal.Notifications.permission;
        if (permission === "granted") {
          console.log("🔔 Bildirim izni zaten verilmiş");
        } else {
          console.log("🚫 Bildirim izni yok");
        }
      } catch (err) {
        console.error("❌ OneSignal yükleme hatası:", err);
      }
    });
  }
  