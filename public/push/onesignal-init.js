// Tek seferlik OneSignal başlatma koruması
if (!window.OneSignalInitialized) {
    window.OneSignalInitialized = true;
  
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId: "60b856ae-b948-4365-87b5-233be9f9d818",
        });
  
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
  