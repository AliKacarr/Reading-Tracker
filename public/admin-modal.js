function showAdminIndicator() {     //admin modu butonunu gösterme
    // Check if user is logged in and valid
    if (!LocalStorageManager.isUserLoggedIn() || !verifyUserUsername()) {
        return;
    }
    
    const userInfo = LocalStorageManager.getCurrentUserInfo();
    if (!userInfo) return;
    
    // Create admin indicator if it doesn't exist
    let adminIndicator = document.querySelector('.admin-indicator');
    if (!adminIndicator) {
        adminIndicator = document.createElement('div');
        adminIndicator.className = 'admin-indicator';
        adminIndicator.textContent = userInfo.userAuthority === 'admin' ? 'Yönetici Modu' : 'Üye Modu';

        // Add click event to open admin info panel
        adminIndicator.addEventListener('click', function () {
            showAdminInfoPanel();
        });

        // Add cursor pointer style to indicate it's clickable
        adminIndicator.style.cursor = 'pointer';

        document.body.appendChild(adminIndicator);
    } else {
        // Update text based on user authority
        adminIndicator.textContent = userInfo.userAuthority === 'admin' ? 'Yönetici Modu' : 'Üye Modu';
    }

    adminIndicator.style.display = 'block';

    // Sadece admin yetkisi olan kullanıcılar için main-area göster
    const mainArea = document.querySelector('.main-area');
    if (mainArea && userInfo.userAuthority === 'admin') {
        mainArea.style.display = 'flex';
        
        // Admin girişi yapıldığında user list'i yükle
        if (typeof renderUserList === 'function') {
            renderUserList();
        }
    }
    
    // Grup ayarlarını da yükle
    if (typeof loadGroupSettings === 'function') {
        loadGroupSettings();
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
    if (LocalStorageManager.isUserLoggedIn()) {
        showAdminIndicator();
    }

    adminLogin.addEventListener('click', function () {
        // Check if already authenticated
        if (LocalStorageManager.isUserLoggedIn()) {
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
            const groupId = getGroupIdFromUrl();
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, groupId })
            });

            const data = await response.json();

            if (data.success) {
                // Yeni sistem ile giriş yap
                LocalStorageManager.loginUser(data.groupId, data.userId, data.authority, username, data.groupName);
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
                
                // Grup ayarlarını da yükle
                if (typeof loadGroupSettings === 'function') {
                    loadGroupSettings();
                }
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
        title.textContent = 'Yönetici Bilgileri';

        const infoPanel = document.createElement('div');
        infoPanel.className = 'admin-info-panel';

        const usernameItem = document.createElement('div');
        usernameItem.className = 'admin-info-item';

        const usernameLabel = document.createElement('div');
        usernameLabel.className = 'admin-info-label';
        usernameLabel.textContent = 'Yönetici Adı:';

        const usernameValue = document.createElement('div');
        usernameValue.className = 'admin-info-value';
        const userInfo = LocalStorageManager.getCurrentUserInfo();
        usernameValue.textContent = userInfo ? userInfo.adminUserName : 'Kullanıcı';

        usernameItem.appendChild(usernameLabel);
        usernameItem.appendChild(usernameValue);

        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'logout-button';
        logoutBtn.textContent = 'Çıkış Yap';
        logoutBtn.onclick = function () {
            // Yeni sistem ile çıkış yap
            LocalStorageManager.logoutUser();
            adminInfoModal.style.display = 'none';

            const adminIndicator = document.querySelector('.admin-indicator');
            const mainArea = document.querySelector('.main-area');

            if (adminIndicator) adminIndicator.style.display = 'none';
            if (mainArea) mainArea.style.display = 'none';

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
    if (LocalStorageManager.isUserLoggedIn()) {
        verifyUserUsername();
    }
    const adminIndicator = document.querySelector('.admin-indicator');
    const mainArea = document.querySelector('.main-area');

    function checkAdminAuth() {
        if (LocalStorageManager.isUserLoggedIn()) {
            const userInfo = LocalStorageManager.getCurrentUserInfo();
            if (!userInfo) return;
            
            if (adminIndicator) {
                adminIndicator.style.display = 'flex';
                adminIndicator.textContent = userInfo.userAuthority === 'admin' ? 'Yönetici Modu' : 'Üye Modu';
            }
            
            // Sadece admin yetkisi olan kullanıcılar için main-area göster
            if (mainArea && userInfo.userAuthority === 'admin') {
                mainArea.style.display = 'flex';
                
                // Admin girişi yapıldığında user list'i yükle
                if (typeof renderUserList === 'function') {
                    renderUserList();
                }
            }
            
            // Grup ayarlarını da yükle
            if (typeof loadGroupSettings === 'function') {
                loadGroupSettings();
            }
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
        if (e.key === 'groups' || e.key === 'groupid' || e.key === 'userid' || e.key === 'userAuthority' || e.key === 'adminUserName' || e.key === 'groupName') {
            checkAdminAuth();
        }
    });

    // Also check after login/logout
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
        originalSetItem.call(this, key, value);
        if (key === 'groups' || key === 'groupid' || key === 'userid' || key === 'userAuthority' || key === 'adminUserName' || key === 'groupName') {
            checkAdminAuth();
        }
    };
});