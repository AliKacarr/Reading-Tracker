function showAdminIndicator() {     //admin modu butonunu gösterme
    // Check if admin username is valid
    if (!verifyAdminUsername()) {
        return;
    }
    // Create admin indicator if it doesn't exist
    let adminIndicator = document.querySelector('.admin-indicator');
    if (!adminIndicator) {
        adminIndicator = document.createElement('div');
        adminIndicator.className = 'admin-indicator';
        adminIndicator.textContent = 'Admin Modu';

        // Add click event to open admin info panel
        adminIndicator.addEventListener('click', function () {
            console.log('Admin Modu clicked'); // Debugging log
            showAdminInfoPanel();
        });

        // Add cursor pointer style to indicate it's clickable
        adminIndicator.style.cursor = 'pointer';

        document.body.appendChild(adminIndicator);
    }

    adminIndicator.style.display = 'block';

    // Logs butonları kaldırıldı

    const mainArea = document.querySelector('.main-area');
    if (mainArea) {
        mainArea.style.display = 'flex';
    }
}


document.addEventListener('DOMContentLoaded', function () {

    const adminLogin = document.getElementById('secretAdminLogin');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const closeButton = document.querySelector('.close-button');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');
    const adminUsername = document.getElementById('adminUsername');
    const adminPassword = document.getElementById('adminPassword');

    // Check if already authenticated
    if (isAuthenticated()) {
        showAdminIndicator();
    }

    adminLogin.addEventListener('click', function () {
        // Check if already authenticated
        if (isAuthenticated()) {
            showAdminInfoPanel();
        } else {
            adminLoginModal.style.display = 'flex';
        }
    });

    // Close modal when clicking on X
    closeButton.addEventListener('click', function () {
        adminLoginModal.style.display = 'none';
        loginError.textContent = '';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === adminLoginModal) {
            adminLoginModal.style.display = 'none';
            loginError.textContent = '';
        }
    });

    // Handle form submission
    adminLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        try {
            const groupId = window.location.pathname.split('/')[1];
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, groupId })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('authenticated', 'true');
                localStorage.setItem('adminUsername', username);
                localStorage.setItem('groupName', data.groupName);
                localStorage.setItem('groupId', data.groupId);
                adminLoginModal.style.display = 'none';
                loginError.textContent = '';

                // Clear form fields
                adminLoginForm.reset();

                // Show admin indicator
                showAdminIndicator();

                // Profil butonunu güncelle
                if (typeof window.updateProfileButton === 'function') {
                    window.updateProfileButton();
                }

                // Reload data to update UI with admin privileges
                loadTrackerTable();
            } else {
                loginError.textContent = 'Geçersiz kullanıcı adı veya şifre';
                logUnauthorizedAccess('admin-login');
                return;
            }
        } catch (error) {
            console.error('Login error:', error);
            loginError.textContent = 'Giriş işlemi sırasında bir hata oluştu';
        }
    });

    adminUsername.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            adminPassword.focus(); // Move focus to adminPassword field
        }
    });

    // Add event listener for Enter key in adminPassword field
    adminPassword.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent default behavior
            // Manually trigger the form submission handler
            const submitEvent = new Event('submit', {
                bubbles: true,
                cancelable: true
            });
            adminLoginForm.dispatchEvent(submitEvent);
        }
    });
});
function showAdminInfoPanel() {
    // Create admin info modal if it doesn't exist
    let adminInfoModal = document.getElementById('adminInfoModal');

    if (!adminInfoModal) {
        adminInfoModal = document.createElement('div');
        adminInfoModal.id = 'adminInfoModal';
        adminInfoModal.className = 'admin-modal';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content-admin';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'close-button';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = function () {
            adminInfoModal.style.display = 'none';
        };

        const title = document.createElement('h2');
        title.textContent = 'Admin Bilgileri';

        const infoPanel = document.createElement('div');
        infoPanel.className = 'admin-info-panel';

        const usernameItem = document.createElement('div');
        usernameItem.className = 'admin-info-item';

        const usernameLabel = document.createElement('div');
        usernameLabel.className = 'admin-info-label';
        usernameLabel.textContent = 'Yönetici Adı:';

        const usernameValue = document.createElement('div');
        usernameValue.className = 'admin-info-value';
        usernameValue.textContent = localStorage.getItem('adminUsername') || 'Admin';

        usernameItem.appendChild(usernameLabel);
        usernameItem.appendChild(usernameValue);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-button';
        logoutBtn.textContent = 'Çıkış Yap';
        logoutBtn.onclick = function () {
            localStorage.removeItem('authenticated');
            localStorage.removeItem('adminUsername');
            localStorage.removeItem('groupName');
            localStorage.removeItem('groupId');
            adminInfoModal.style.display = 'none';

            const adminIndicator = document.querySelector('.admin-indicator');
            
            const mainArea = document.querySelector('.main-area');


            adminIndicator.style.display = 'none';
            mainArea.style.display = 'none';

            // Profil butonunu güncelle
            if (typeof window.updateProfileButton === 'function') {
                window.updateProfileButton();
            }

            // Reload data to update UI without admin privileges
            loadTrackerTable();
        };

        infoPanel.appendChild(usernameItem);
        infoPanel.appendChild(logoutBtn);

        modalContent.appendChild(closeBtn);
        modalContent.appendChild(title);
        modalContent.appendChild(infoPanel);

        adminInfoModal.appendChild(modalContent);
        document.body.appendChild(adminInfoModal);

        window.addEventListener('click', function (event) {
            if (event.target === adminInfoModal) {
                adminInfoModal.style.display = 'none';
            }
        });
    }
    adminInfoModal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', function () {
    if (isAuthenticated()) {
        verifyAdminUsername();
    }
    const adminIndicator = document.querySelector('.admin-indicator');
    
    const mainArea = document.querySelector('.main-area');


    function checkAdminAuth() {
        if (isAuthenticated()) {
            if (adminIndicator) adminIndicator.style.display = 'flex';
            if (mainArea) mainArea.style.display = 'flex';
        } else {
            if (adminIndicator) adminIndicator.style.display = 'none';
            if (mainArea) mainArea.style.display = 'none';
        }
    }

    // Check auth status when page loads
    checkAdminAuth();

    // Butonlar kaldırıldı

    // Listen for authentication changes
    window.addEventListener('storage', function (e) {
        if (e.key === 'authenticated') {
            checkAdminAuth();
        }
    });

    // Also check after login/logout
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
        originalSetItem.call(this, key, value);
        if (key === 'authenticated') {
            checkAdminAuth();
        }
    };
});