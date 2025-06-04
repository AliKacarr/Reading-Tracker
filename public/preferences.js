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