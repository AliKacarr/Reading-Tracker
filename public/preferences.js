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
        notificationsToggle.addEventListener('change', function() {
            updateComingSoonMessage();
            
            // Bildirim toggle işlemi
            if (this.checked) {
                requestNotificationPermission();
            } else {
                // Bildirimleri kapatma işlemi
                disableNotifications();
            }
        });
    }

    // Sayfa yüklendiğinde başlangıç durumunu kontrol et
    updateComingSoonMessage();
    
    // Bildirim izin durumunu kontrol et ve toggle'ı ayarla
    checkNotificationPermission();
});

// Bildirim izin durumunu kontrol et ve toggle'ı ayarla
function checkNotificationPermission() {
    try {
        // Tarayıcının bildirim desteğini kontrol et
        if (!('Notification' in window)) {
            console.log('Bu tarayıcı bildirimleri desteklemiyor');
            return;
        }

        const notificationsToggle = document.getElementById('notificationsToggle');
        if (!notificationsToggle) {
            return;
        }

        // Mevcut izin durumunu kontrol et
        const permission = Notification.permission;
        
        if (permission === 'granted') {
            // Bildirim izni verilmiş, toggle'ı aç
            notificationsToggle.checked = true;
            console.log('Bildirimler zaten aktif - toggle açık');
        } else {
            // Bildirim izni verilmemiş, toggle'ı kapat
            notificationsToggle.checked = false;
            console.log('Bildirimler kapalı - toggle kapalı');
        }
        
    } catch (error) {
        console.error('Bildirim izin durumu kontrol hatası:', error);
    }
}

// Bildirimleri kapatma fonksiyonu
function disableNotifications() {
    try {
        // Tarayıcının bildirim desteğini kontrol et
        if (!('Notification' in window)) {
            alert('Bu tarayıcı bildirimleri desteklemiyor.');
            return;
        }

        // Mevcut izin durumunu kontrol et
        const permission = Notification.permission;
        
        if (permission === 'granted') {
            // Bildirim izni verilmiş, kullanıcıya bilgi ver
            showNotificationMessage('Lütfen bildirimleri tarayıcı ayarlarından kapatınız.', 'info');
            console.log('Bildirimler kapatıldı');
        } else if (permission === 'denied') {
            // Zaten reddedilmiş
            showNotificationMessage('Bildirimler zaten reddedilmiş.', 'info');
            console.log('Bildirimler zaten reddedilmiş');
        } else {
            // Default durumda
            showNotificationMessage('Bildirimler kapatıldı.', 'info');
            console.log('Bildirimler kapatıldı');
        }
        
    } catch (error) {
        console.error('Bildirim kapatma hatası:', error);
        showNotificationMessage('Bildirim kapatma işlemi başarısız.', 'error');
    }
}

// Bildirim izni isteme fonksiyonu
async function requestNotificationPermission() {
    try {
        // Tarayıcının bildirim desteğini kontrol et
        if (!('Notification' in window)) {
            alert('Bu tarayıcı bildirimleri desteklemiyor.');
            document.getElementById('notificationsToggle').checked = false;
            return;
        }

        // Mevcut izin durumunu kontrol et
        let permission = Notification.permission;
        
        if (permission === 'granted') {
            // Zaten izin verilmiş
            console.log('Bildirim izni zaten verilmiş');
            showNotificationMessage('Bildirimler zaten aktif!', 'success');
            return;
        }
        
        if (permission === 'denied') {
            // İzin reddedilmiş
            alert('Bildirim izni daha önce reddedilmiş. Lütfen tarayıcı ayarlarından bildirim iznini açın.');
            document.getElementById('notificationsToggle').checked = false;
            return;
        }

        // İzin iste (default durumda)
        permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Bildirim izni verildi');
            showNotificationMessage('Bildirimler başarıyla etkinleştirildi!', 'success');
            
            // Test bildirimi gönder
            showTestNotification();
        } else {
            console.log('Bildirim izni reddedildi');
            showNotificationMessage('Bildirim izni reddedildi.', 'error');
            document.getElementById('notificationsToggle').checked = false;
        }
        
    } catch (error) {
        console.error('Bildirim izni hatası:', error);
        showNotificationMessage('Bildirim izni alınamadı.', 'error');
        document.getElementById('notificationsToggle').checked = false;
    }
}

// Test bildirimi gönderme
function showTestNotification() {
    try {
        const notification = new Notification('RoTaKip', {
            body: 'Bildirimler başarıyla etkinleştirildi!',
            icon: '/images/favicon.webp',
            badge: '/images/favicon.webp'
        });
        
        // 3 saniye sonra bildirimi kapat
        setTimeout(() => {
            notification.close();
        }, 3000);
        
    } catch (error) {
        console.error('Test bildirimi hatası:', error);
    }
}

// Bildirim mesajı gösterme
function showNotificationMessage(message, type) {
    // Mevcut mesaj varsa kaldır
    const existingMessage = document.querySelector('.notification-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Yeni mesaj oluştur
    const messageDiv = document.createElement('div');
    messageDiv.className = `notification-message ${type}`;
    messageDiv.textContent = message;
    
    // Stil ekle
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // Tip göre renk ayarla
    if (type === 'success') {
        messageDiv.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
        messageDiv.style.backgroundColor = '#f44336';
    } else {
        messageDiv.style.backgroundColor = '#2196F3';
    }
    
    // Sayfaya ekle
    document.body.appendChild(messageDiv);
    
    // 4 saniye sonra kaldır
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 300);
    }, 4000);
}