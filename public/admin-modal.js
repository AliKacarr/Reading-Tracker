function showAdminIndicator() {     //admin modu butonunu gösterme
    // Check if user is logged in and valid
    if (!LocalStorageManager.isUserLoggedIn() || !verifyUserUsername()) {
        return;
    }
    
    const userInfo = LocalStorageManager.getCurrentUserInfo();
    if (!userInfo) return;
    
    // Create scroll to main area button if it doesn't exist (only for admin)
    let scrollToMainButton = document.querySelector('.scroll-to-main-button');
    if (!scrollToMainButton && userInfo.userAuthority === 'admin') {
        scrollToMainButton = document.createElement('div');
        scrollToMainButton.className = 'scroll-to-main-button';
        scrollToMainButton.innerHTML = '<i class="fa-solid fa-gear"></i> Grup Ayarları';
        scrollToMainButton.style.cssText = `
            position: fixed;
            bottom: 95px;
            left: 40px;
            background: linear-gradient(135deg, #e74c3c, #c0392b);
            color: white;
            height: 50px;
            width: 160px;
            padding-left: 20px;
            padding-right: 20px;
            border-radius: 30px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 700;
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
            transition: all 0.3s ease;
            z-index: 99;
            display: flex;
            align-items: center;
            gap: 10px;
            justify-content: center;
        `;

        // Add hover effects
        scrollToMainButton.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
            this.style.boxShadow = '0 8px 25px rgba(231, 76, 60, 0.6)';
        });

        scrollToMainButton.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '0 6px 20px rgba(231, 76, 60, 0.4)';
        });

        // Add click event to scroll to main area
        scrollToMainButton.addEventListener('click', function() {
            const mainArea = document.querySelector('.main-area');
            if (mainArea) {
                mainArea.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });

        document.body.appendChild(scrollToMainButton);
    }
    
    // Scroll butonunu göster (sadece admin yetkisi olan kullanıcılar için)
    if (scrollToMainButton) {
        if (userInfo.userAuthority === 'admin') {
            scrollToMainButton.style.display = 'flex';
        } else {
            scrollToMainButton.style.display = 'none';
        }
    }

    // Create admin indicator if it doesn't exist
    let adminIndicator = document.querySelector('.admin-indicator');
    if (!adminIndicator) {
        adminIndicator = document.createElement('div');
        adminIndicator.className = 'admin-indicator';
        const displayName = userInfo.userName && userInfo.userName !== 'null' ? userInfo.userName : '';
        adminIndicator.innerHTML = userInfo.userAuthority === 'admin' ? 
            `<i class="fa-solid fa-user-shield"></i> ${displayName}` : 
            `<i class="fa-solid fa-user"></i> ${displayName}`;

        // Add click event to open admin info panel
        adminIndicator.addEventListener('click', function () {
            showAdminInfoPanel();
        });

        // Add cursor pointer style to indicate it's clickable
        adminIndicator.style.cursor = 'pointer';

        document.body.appendChild(adminIndicator);
    } else {
        // Update text based on user authority
        const displayName = userInfo.userName && userInfo.userName !== 'null' ? userInfo.userName : '';
        adminIndicator.innerHTML = userInfo.userAuthority === 'admin' ? 
            `<i class="fa-solid fa-user-shield"></i> ${displayName}` : 
            `<i class="fa-solid fa-user"></i> ${displayName}`;
    }

    adminIndicator.style.display = 'flex';

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
    const groupsAuthLoginModal = document.getElementById('groupsAuthLoginModal');
    const groupsAuthForgotModal = document.getElementById('groupsAuthForgotModal');
    
    // Login modal elements
    const closeGroupsAuthLoginModal = document.getElementById('closeGroupsAuthLoginModal');
    const groupsAuthLoginForm = document.getElementById('groupsAuthLoginForm');
    const groupsAuthLoginError = document.getElementById('groupsAuthLoginError');
    const groupsAuthLoginName = document.getElementById('groupsAuthLoginName');
    const groupsAuthLoginPassword = document.getElementById('groupsAuthLoginPassword');
    const groupsAuthTogglePassword = document.getElementById('groupsAuthTogglePassword');
    const groupsAuthForgotPasswordLink = document.getElementById('groupsAuthForgotPasswordLink');
    
    // Forgot password modal elements
    const closeGroupsAuthForgotModal = document.getElementById('closeGroupsAuthForgotModal');

    // Check if already authenticated
    if (LocalStorageManager.isUserLoggedIn()) {
        showAdminIndicator();
    }

    // Admin login button click handler
    adminLogin.addEventListener('click', function () {
        // Check if already authenticated
        if (LocalStorageManager.isUserLoggedIn()) {
            showAdminInfoPanel();
        } else {
            showModal(groupsAuthLoginModal);
        }
    });

    // Profile button click handler
    const profileButton = document.getElementById('profileButton');
    if (profileButton) {
        profileButton.addEventListener('click', function () {
            // Check if already authenticated
            if (LocalStorageManager.isUserLoggedIn()) {
                showAdminInfoPanel();
            } else {
                showModal(groupsAuthLoginModal);
            }
        });
    }

    // Modal show/hide functions
    function showModal(modal) {
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideModal(modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Close user login modal
    closeGroupsAuthLoginModal.addEventListener('click', function () {
        hideModal(groupsAuthLoginModal);
        groupsAuthLoginError.textContent = '';
        groupsAuthLoginError.classList.remove('show');
    });

    // Close forgot password modal
    closeGroupsAuthForgotModal.addEventListener('click', function () {
        hideModal(groupsAuthForgotModal);
    });

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === groupsAuthLoginModal) {
            hideModal(groupsAuthLoginModal);
            groupsAuthLoginError.textContent = '';
            groupsAuthLoginError.classList.remove('show');
        }
        if (event.target === groupsAuthForgotModal) {
            hideModal(groupsAuthForgotModal);
        }
    });

    // Password toggle functionality
    groupsAuthTogglePassword.addEventListener('click', function () {
        const passwordInput = groupsAuthLoginPassword;
        const icon = this.querySelector('i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });

    // Forgot password link
    groupsAuthForgotPasswordLink.addEventListener('click', function (e) {
        e.preventDefault();
        hideModal(groupsAuthLoginModal);
        showModal(groupsAuthForgotModal);
    });

    // Handle user login form submission
    groupsAuthLoginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = groupsAuthLoginName.value.trim();
        const password = groupsAuthLoginPassword.value;

        // Clear previous errors
        groupsAuthLoginError.textContent = '';
        groupsAuthLoginError.classList.remove('show');

        // Basic validation
        if (!username || !password) {
            showError(groupsAuthLoginError, 'Lütfen tüm alanları doldurun');
            return;
        }

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
                hideModal(groupsAuthLoginModal);

                // Clear form fields
                groupsAuthLoginForm.reset();

                // Show admin indicator
                showAdminIndicator();

                // Profil butonunu güncelle
                if (typeof window.updateProfileButton === 'function') {
                    window.updateProfileButton();
                }

                // Reload data to update UI with admin privileges
                if (typeof loadTrackerTable === 'function') loadTrackerTable();
                if (typeof loadUserCards === 'function') loadUserCards();
                if (typeof loadReadingStats === 'function') loadReadingStats();
                if (typeof renderLongestSeries === 'function') renderLongestSeries();
                if (typeof loadMonthlyCalendar === 'function') loadMonthlyCalendar();
                
                // Grup ayarlarını da yükle
                if (typeof loadGroupSettings === 'function') {
                    loadGroupSettings();
                }
            } else {
                showError(groupsAuthLoginError, 'Geçersiz kullanıcı adı veya şifre');
                if (typeof logUnauthorizedAccess === 'function') {
                    logUnauthorizedAccess('Başarısız Yönetici girişi denemesi');
                }
                return;
            }
        } catch (error) {
            console.error('Login error:', error);
            showError(groupsAuthLoginError, 'Giriş işlemi sırasında bir hata oluştu');
            if (typeof logUnauthorizedAccess === 'function') {
                logUnauthorizedAccess('Başarısız Yönetici girişi denemesi');
            }
        }
    });

    // Helper functions
    function showError(errorElement, message) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function showSuccess(successElement, message) {
        successElement.textContent = message;
        successElement.classList.add('show');
    }

    // Keyboard navigation for user login form
    groupsAuthLoginName.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            groupsAuthLoginPassword.focus();
        }
    });

    groupsAuthLoginPassword.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            groupsAuthLoginForm.dispatchEvent(new Event('submit', {
                bubbles: true,
                cancelable: true
            }));
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
        title.textContent = 'Kullanıcı Bilgileri';

        const infoPanel = document.createElement('div');
        infoPanel.className = 'admin-info-panel';

        const usernameItem = document.createElement('div');
        usernameItem.className = 'admin-info-item';

        const usernameLabel = document.createElement('div');
        usernameLabel.className = 'admin-info-label';
        usernameLabel.textContent = 'Kullanıcı Adı:';

        const usernameValue = document.createElement('div');
        usernameValue.className = 'admin-info-value';
        // Güncel kullanıcı bilgisini al
        const userInfo = LocalStorageManager.getCurrentUserInfo();
        usernameValue.textContent = userInfo ? userInfo.userName : 'Kullanıcı';

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
            
            // Scroll butonunu da gizle
            const scrollToMainButton = document.querySelector('.scroll-to-main-button');
            if (scrollToMainButton) scrollToMainButton.style.display = 'none';

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
    } else {
        // Modal zaten varsa, güncel kullanıcı bilgisini güncelle
        const usernameValue = adminInfoModal.querySelector('.admin-info-value');
        if (usernameValue) {
            const userInfo = LocalStorageManager.getCurrentUserInfo();
            usernameValue.textContent = userInfo ? userInfo.userName : 'Kullanıcı';
        }
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
                const displayName = userInfo.userName && userInfo.userName !== 'null' ? userInfo.userName : '';
                adminIndicator.innerHTML = userInfo.userAuthority === 'admin' ? 
                    `<i class="fa-solid fa-user-shield"></i> ${displayName}` : 
                    `<i class="fa-solid fa-user"></i> ${displayName}`;
            }
            
            // Sadece admin yetkisi olan kullanıcılar için main-area göster
            if (mainArea && userInfo.userAuthority === 'admin') {
                mainArea.style.display = 'flex';
                
                // Admin girişi yapıldığında user list'i yükle
                if (typeof renderUserList === 'function') {
                    renderUserList();
                }
            }
            
            // Scroll butonunu sadece admin yetkisi olan kullanıcılar için göster
            const scrollToMainButton = document.querySelector('.scroll-to-main-button');
            if (scrollToMainButton) {
                if (userInfo.userAuthority === 'admin') {
                    scrollToMainButton.style.display = 'flex';
                } else {
                    scrollToMainButton.style.display = 'none';
                }
            }
            
            // Grup ayarlarını da yükle
            if (typeof loadGroupSettings === 'function') {
                loadGroupSettings();
            }
        } else {
            if (adminIndicator) adminIndicator.style.display = 'none';
            if (mainArea) mainArea.style.display = 'none';
            
            // Scroll butonunu da gizle
            const scrollToMainButton = document.querySelector('.scroll-to-main-button');
            if (scrollToMainButton) scrollToMainButton.style.display = 'none';
        }
    }

    // Check auth status when page loads
    checkAdminAuth();

    // Butonlar kaldırıldı

    // Listen for authentication changes
    window.addEventListener('storage', function (e) {
        if (e.key === 'groups' || e.key === 'groupid' || e.key === 'userid' || e.key === 'userAuthority' || e.key === 'userName' || e.key === 'groupName') {
            checkAdminAuth();
        }
    });

    // Also check after login/logout
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
        originalSetItem.call(this, key, value);
        if (key === 'groups' || key === 'groupid' || key === 'userid' || key === 'userAuthority' || key === 'userName' || key === 'groupName') {
            checkAdminAuth();
        }
    };
});