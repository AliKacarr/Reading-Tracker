
// OneSignal SDK yükleme
window.OneSignalDeferred = window.OneSignalDeferred || [];
OneSignalDeferred.push(async function(OneSignal) {
    try {
        await OneSignal.init({
            appId: "60b856ae-b948-4365-87b5-233be9f9d818",
            autoRegister: false // Otomatik sorma kapalı
        });

        console.log('OneSignal başarıyla yüklendi');

        const toggle = document.getElementById('notificationsToggle');
        
        if (toggle) {
            // Mevcut izin durumunu kontrol et
            const permission = await OneSignal.Notifications.permission;
            if (permission === 'granted') {
                toggle.checked = true;
                console.log('Bildirimler zaten aktif');
            } else {
                toggle.checked = false;
                console.log('Bildirimler kapalı');
            }

            // Toggle değiştiğinde
            toggle.addEventListener('change', async () => {
                try {
                    if (toggle.checked) {
                        // Eğer tarayıcı bildirimi kapalıysa, izin iste
                        const currentPermission = await OneSignal.Notifications.permission;
                        if (currentPermission !== 'granted') {
                            try {
                                await OneSignal.Notifications.requestPermission();
                                console.log('Bildirim izni istendi');
                            } catch (e) {
                                console.warn('İzin isteği başarısız:', e);
                                toggle.checked = false;
                                return;
                            }
                        }
                        // Abone et
                        await OneSignal.User.PushSubscription.optIn();
                        console.log('Bildirimler etkinleştirildi');
                    } else {
                        // Abonelikten çık
                        await OneSignal.User.PushSubscription.optOut();
                        console.log('Bildirimler kapatıldı');
                    }
                } catch (error) {
                    console.error('Toggle işlemi hatası:', error);
                    // Hata durumunda toggle'ı eski haline döndür
                    toggle.checked = !toggle.checked;
                }
            });
        }

    } catch (err) {
        console.error('OneSignal yükleme hatası:', err);
        const toggle = document.getElementById('notificationsToggle');
        if (toggle) {
            toggle.checked = false;
            toggle.disabled = true;
            console.log('Toggle devre dışı bırakıldı');
        }
    }
});

document.addEventListener('DOMContentLoaded', function () { //Tablonun ilk günü seçimi
    const savedFirstDay = localStorage.getItem('preferredFirstDay');

    if (firstDaySelect) {
        if (savedFirstDay !== null) {
            firstDayOfWeek = parseInt(savedFirstDay);
            firstDaySelect.value = savedFirstDay;
        } else {
            firstDayOfWeek = parseInt(firstDaySelect.value);
        }

        // Add event listener for combobox changes
        firstDaySelect.addEventListener('change', function () {
            firstDayOfWeek = parseInt(this.value);
            localStorage.setItem('preferredFirstDay', this.value);
            weekOffset = 0;
            loadTrackerTable();
            loadUserCards();
        });
    }

    // Toggle switch'ler için mesaj göster/gizle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const notificationsToggle = document.getElementById('notificationsToggle');
    const featureComingSoonMessage = document.querySelector('.settings-section .feature-coming-soon');

    function updateComingSoonMessage() {
        if (darkModeToggle && notificationsToggle && featureComingSoonMessage) {
            if (darkModeToggle.checked || notificationsToggle.checked) {
                featureComingSoonMessage.style.opacity = '1';
            } else {
                featureComingSoonMessage.style.opacity = '0';
            }
        }
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', updateComingSoonMessage);
    }

    if (notificationsToggle) {
        notificationsToggle.addEventListener('change', updateComingSoonMessage);
    }

    // Sayfa yüklendiğinde başlangıç durumunu kontrol et
    updateComingSoonMessage();
});
