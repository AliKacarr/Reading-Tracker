// LocalStorageManager sınıfı
class LocalStorageManager {
    static loginUser(groupId, userId, authority, username, groupName) {
        // Mevcut grupları al
        const groups = this.getGroups();
        
        // Yeni grubu ekle
        groups[groupId] = userId;
        
        // LocalStorage'a kaydet
        localStorage.setItem('groups', JSON.stringify(groups));
        
        // Kullanıcı bilgilerini kaydet
        localStorage.setItem('currentGroupId', groupId);
        localStorage.setItem('currentUserId', userId);
        localStorage.setItem('currentUserAuthority', authority);
        localStorage.setItem('currentUsername', username);
        localStorage.setItem('currentGroupName', groupName);
    }
    
    static getGroups() {
        const groups = localStorage.getItem('groups');
        return groups ? JSON.parse(groups) : {};
    }
    
    static removeUserFromGroup(groupId) {
        const groups = this.getGroups();
        delete groups[groupId];
        localStorage.setItem('groups', JSON.stringify(groups));
    }
    
    static isAdmin() {
        return localStorage.getItem('currentUserAuthority') === 'admin';
    }
}

class GroupsPage {
    constructor() {
        this.groups = [];
        this.filteredGroups = [];
        this.currentPage = 0;
        this.groupsPerPage = 12;
        this.isLoading = false;
        this.searchQuery = '';
        this.memberCounts = new Map();
        this.selectedAvatarPath = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadGroups(true); // reset=true ile başlat
        this.setupInfiniteScroll();
    }

    bindEvents() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        const clearSearch = document.getElementById('clearSearch');

        searchInput.addEventListener('input', this.handleSearch.bind(this));
        clearSearch.addEventListener('click', this.clearSearch.bind(this));

        // Create group modal
        const createGroupBtn = document.getElementById('createGroupBtn');
        const closeModal = document.getElementById('closeModal');
        const cancelCreate = document.getElementById('cancelCreate');
        const createGroupForm = document.getElementById('createGroupForm');
        const modal = document.getElementById('createGroupModal');

        createGroupBtn.addEventListener('click', () => this.openCreateModal());
        closeModal.addEventListener('click', () => this.closeCreateModal());
        cancelCreate.addEventListener('click', () => this.closeCreateModal());
        createGroupForm.addEventListener('submit', this.handleCreateGroup.bind(this));

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCreateModal();
            }
        });

        // Hazır görseller modal'ı için dışına tıklama
        const readyImagesModal = document.getElementById('readyImagesModal');
        if (readyImagesModal) {
            readyImagesModal.addEventListener('click', (e) => {
                if (e.target === readyImagesModal) {
                    this.closeReadyImagesModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCreateModal();
                this.closeReadyImagesModal();
            }
        });

        // Password toggle functionality
        const passwordToggle = document.getElementById('passwordToggle');
        if (passwordToggle) {
            passwordToggle.addEventListener('click', this.togglePasswordVisibility.bind(this));
        }

        // Visibility icon change functionality
        const visibilitySelect = document.getElementById('groupVisibilityInput');
        if (visibilitySelect) {
            visibilitySelect.addEventListener('change', this.updateVisibilityIcon.bind(this));
        }

        const groupImageInput = document.getElementById('groupImageInput');
        groupImageInput.addEventListener('change', (e) => {
            const fileInput = e.target;
            const fileInputText = document.querySelector('.file-input-text');
            if (fileInput.files.length > 0) {
                fileInputText.textContent = fileInput.files[0].name;
            } else {
                fileInputText.textContent = 'Bir resim seçin...';
            }
        });
    }

    async loadGroups(reset = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading(true);

        try {
            // İlk yükleme ise önce kullanıcının gruplarını yükle
            if (reset && this.currentPage === 0) {
                await this.loadUserGroups();
                // Kullanıcının grupları yüklendikten sonra normal grupları yükle
                const skip = 0;
                const response = await fetch(`/api/groups?skip=${skip}&limit=${this.groupsPerPage}&search=${this.searchQuery}`);
                
                if (response.ok) {
                    const data = await response.json();
                    // Sadece kullanıcının gruplarında olmayan grupları ekle
                    const userGroupIds = new Set();
                    const userGroups = localStorage.getItem('groups');
                    if (userGroups) {
                        const groupsData = JSON.parse(userGroups);
                        Object.keys(groupsData).forEach(id => userGroupIds.add(id));
                    }
                    
                    const newGroups = data.groups.filter(group => !userGroupIds.has(group.groupId));
                    this.groups = [...this.groups, ...newGroups];
                    this.filteredGroups = this.groups;
                    await this.loadMemberCounts(newGroups);
                    this.renderGroups();
                    this.currentPage++;
                }
            } else {
                // Normal infinite scroll
                const skip = this.currentPage * this.groupsPerPage;
                const response = await fetch(`/api/groups?skip=${skip}&limit=${this.groupsPerPage}&search=${this.searchQuery}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch groups');
                }

                const data = await response.json();

                // Sadece yeni grupları ekle (duplicate kontrolü)
                const existingGroupIds = new Set(this.groups.map(g => g.groupId));
                const newGroups = data.groups.filter(group => !existingGroupIds.has(group.groupId));
                this.groups = [...this.groups, ...newGroups];

                this.filteredGroups = this.groups;
                await this.loadMemberCounts(newGroups);
                this.renderGroups();
                this.currentPage++;

                // Eğer yüklenen grup sayısı limit'ten azsa, daha fazla grup yok demektir
                if (data.groups.length < this.groupsPerPage) {
                    return { groups: data.groups, hasMore: false };
                }

                return { groups: data.groups, hasMore: true };
            }

        } catch (error) {
            console.error('Error loading groups:', error);
            this.showError('Failed to load groups. Please try again.');
            return { groups: [], hasMore: false };
        } finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }

    async loadUserGroups() {
        try {
            // LocalStorage'dan kullanıcının gruplarını al
            const userGroups = localStorage.getItem('groups');
            if (!userGroups) return;

            const groupsData = JSON.parse(userGroups);
            const groupIds = Object.keys(groupsData);

            if (groupIds.length === 0) return;

            // Her grup için detayları al
            const groupPromises = groupIds.map(async (groupId) => {
                try {
                    const response = await fetch(`/api/group/${groupId}`);
                    if (response.ok) {
                        const data = await response.json();
                        return data.group;
                    }
                } catch (error) {
                    console.error(`Error loading group ${groupId}:`, error);
                }
                return null;
            });

            const userGroupsData = (await Promise.all(groupPromises)).filter(group => group !== null);

            if (userGroupsData.length > 0) {
                // Kullanıcının gruplarını en başa ekle
                this.groups = [...userGroupsData, ...this.groups];
                this.filteredGroups = this.groups;
                await this.loadMemberCounts(userGroupsData);
                await this.loadUserAuthorities(userGroupsData, groupsData);
                this.renderGroups();
            }
        } catch (error) {
            console.error('Error loading user groups:', error);
        }
    }

    async loadMemberCounts(groups) {
        try {
            const promises = groups.map(async (group) => {
                if (!this.memberCounts.has(group.groupId)) {
                    const response = await fetch(`/api/groups/${group.groupId}/member-count`);
                    if (response.ok) {
                        const data = await response.json();
                        this.memberCounts.set(group.groupId, data.count);
                    } else {
                        this.memberCounts.set(group.groupId, 0);
                    }
                }
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('Error loading member counts:', error);
        }
    }

    async loadUserAuthorities(groups, groupsData) {
        try {
            const promises = groups.map(async (group) => {
                const userId = groupsData[group.groupId];
                if (userId) {
                    try {
                        const response = await fetch(`/api/users/${group.groupId}`);
                        if (response.ok) {
                            const data = await response.json();
                            const user = data.users.find(u => u._id === userId);
                            if (user) {
                                // Kullanıcının yetkisini grup objesine ekle
                                group.userAuthority = user.authority;
                            }
                        }
                    } catch (error) {
                        console.error(`Error loading user authority for group ${group.groupId}:`, error);
                    }
                }
            });

            await Promise.all(promises);
        } catch (error) {
            console.error('Error loading user authorities:', error);
        }
    }

    renderGroups() {
        const groupsGrid = document.getElementById('groupsGrid');
        const noResults = document.getElementById('noResults');
        const existingCardIds = new Set(Array.from(groupsGrid.querySelectorAll('.group-card')).map(card => card.getAttribute('data-group-id')));
        const resultsCardIds = new Set(this.filteredGroups.map(g => g.groupId));

        // Remove cards that are no longer in the results
        existingCardIds.forEach(id => {
            if (!resultsCardIds.has(id)) {
                const card = groupsGrid.querySelector(`[data-group-id="${id}"]`);
                if (card) {
                    card.classList.add('hide');
                    setTimeout(() => card.remove(), 300);
                }
            }
        });

        // Add new cards
        this.filteredGroups.forEach(group => {
            if (!existingCardIds.has(group.groupId)) {
                const groupCard = this.createGroupCard(group);
                groupCard.classList.add('hide');
                groupsGrid.appendChild(groupCard);
                setTimeout(() => groupCard.classList.remove('hide'), 50);
            }
        });

        if (this.filteredGroups.length === 0 && !this.isLoading) {
            noResults.style.display = 'block';
        } else {
            noResults.style.display = 'none';
        }
    }


    handleSearch(e) {
        const query = e.target.value.trim().toLowerCase();
        this.searchQuery = query;

        const clearBtn = document.getElementById('clearSearch');
        clearBtn.style.display = query ? 'block' : 'none';

        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch();
        }, 300);
    }

    async performSearch() {
        if (this.searchQuery === '') {
            this.filteredGroups = this.groups;
            this.renderGroups();
            return;
        }

        try {
            this.showLoading(true);
            const response = await fetch(`/api/groups?search=${this.searchQuery}&limit=50`);

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            this.filteredGroups = data.groups;

            await this.loadMemberCounts(this.filteredGroups);

            this.renderGroups();

        } catch (error) {
            console.error('Search error:', error);
            this.showError('Search failed. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    clearSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearch');

        searchInput.value = '';
        this.searchQuery = '';
        clearBtn.style.display = 'none';

        this.filteredGroups = this.groups;
        this.renderGroups();
    }

    setupInfiniteScroll() {
        let ticking = false;
        let lastLoadTime = 0;
        let hasMoreGroups = true; // Daha fazla grup var mı kontrolü
        let loadedGroupIds = new Set(); // Yüklenen grup ID'lerini takip et
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
                    const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
                    const now = Date.now();
                    
                    // Sadece yüklenmiyorsa, arama yapılmıyorsa, daha fazla grup varsa ve son yüklemeden yeterli süre geçtiyse yükle
                    if (nearBottom && !this.isLoading && this.searchQuery === '' && hasMoreGroups && now - lastLoadTime > 600) {
                        this.loadGroups();
                        lastLoadTime = now;
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        // hasMoreGroups'u güncellemek için loadGroups'u override et
        const originalLoadGroups = this.loadGroups.bind(this);
        this.loadGroups = async (reset = false) => {
            const result = await originalLoadGroups(reset);
            
            if (result && result.groups) {
                // Yeni gelen grupları kontrol et
                const newGroups = result.groups.filter(group => !loadedGroupIds.has(group.groupId));
                
                // Eğer yeni grup yoksa veya çok az varsa daha fazla grup yok demektir
                if (newGroups.length === 0 || (result.groups.length < this.groupsPerPage && newGroups.length < 3)) {
                    hasMoreGroups = false;
                }
                
                // Yüklenen grup ID'lerini kaydet
                result.groups.forEach(group => loadedGroupIds.add(group.groupId));
            }
            
            return result;
        };
    }

    openCreateModal() {
        const modal = document.getElementById('createGroupModal');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';

        // Update visibility icon based on current selection
        this.updateVisibilityIcon();
    }

    closeCreateModal() {
        const modal = document.getElementById('createGroupModal');
        const form = document.getElementById('createGroupForm');

        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        document.body.style.overflow = 'auto';
        form.reset();
        
        // Hazır avatar seçimini temizle
        this.selectedAvatarPath = null;
        
        // Dosya seçim metnini sıfırla
        const fileInputText = document.querySelector('.file-input-text');
        if (fileInputText) {
            fileInputText.textContent = 'Bir resim seçin...';
            fileInputText.style.color = '#6c757d';
        }

        if (adminPasswordError) {
            adminPasswordError.style.display = 'none';
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('adminPasswordInput');
        const toggleIcon = document.querySelector('#passwordToggle i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    updateVisibilityIcon() {
        const visibilitySelect = document.getElementById('groupVisibilityInput');
        const visibilityIcon = document.querySelector('#groupVisibilityInput').parentElement.querySelector('.input-icon');
        
        if (visibilitySelect.value === 'public') {
            visibilityIcon.className = 'fas fa-eye input-icon';
        } else if (visibilitySelect.value === 'private') {
            visibilityIcon.className = 'fas fa-eye-slash input-icon';
        }
    }

    async handleCreateGroup(event) {
        event.preventDefault();
        const groupName = document.getElementById('groupNameInput').value;
        const groupDescription = document.getElementById('groupDescInput').value;
        const adminName = document.getElementById('adminNameInput').value;
        const adminPassword = document.getElementById('adminPasswordInput').value;
        const groupImageInput = document.getElementById('groupImageInput');
        const visibility = document.getElementById('groupVisibilityInput').value;

        // Karakter limiti kontrolü
        const errors = [];

        // Kontroller
        if (!groupName || !adminName || !adminPassword) {
            errors.push('Lütfen tüm zorunlu alanları doldurun.');
            return;
        }

        if (groupName.length > 40) {
            errors.push('Grup ismi 40 karakterden uzun olamaz.');
        }
        
        if (groupDescription.length > 200) {
            errors.push('Grup açıklaması 200 karakterden uzun olamaz.');
        }
        
        if (adminName.length > 40) {
            errors.push('Yönetici adı 40 karakterden uzun olamaz.');
        }
        
        if (adminPassword.length > 40) {
            errors.push('Yönetici şifresi 40 karakterden uzun olamaz.');
        }

        // Hata varsa göster
        if (errors.length > 0) {
            // Hata mesajlarını adminPasswordError alanında göster
            const adminPasswordError = document.getElementById('adminPasswordError');
            if (adminPasswordError) {
                adminPasswordError.textContent = errors.join('\n');
                adminPasswordError.style.display = 'block';
            }
            
            return;
        } else {
            // Hata yoksa hata mesajını gizle
            const adminPasswordError = document.getElementById('adminPasswordError');
            if (adminPasswordError) {
                adminPasswordError.style.display = 'none';
            }
        }

        const formData = new FormData();
        formData.append('groupName', groupName);
        formData.append('description', groupDescription);
        formData.append('adminName', adminName);
        formData.append('adminPassword', adminPassword);
        formData.append('visibility', visibility);
        
        // Hazır avatar seçildiyse onu kullan, yoksa dosya yüklemesi yap
        if (this.selectedAvatarPath) {
            formData.append('selectedAvatarPath', this.selectedAvatarPath);
        } else if (groupImageInput.files[0]) {
            formData.append('groupImage', groupImageInput.files[0]);
        }

        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Yeni sistem ile admin girişi yap
                LocalStorageManager.loginUser(result.group.groupId, result.userId, 'admin', adminName, result.group.groupName);
                
                this.closeCreateModal();
                window.location.href = `/groupid=${result.group.groupId}`;
            } else {
                alert(`Grup oluşturulamadı: ${result.error}`);
            }
        } catch (error) {
            console.error('Grup oluşturma hatası:', error);
            alert('Grup oluşturulurken bir hata oluştu.');
        }

        // Formu temizle
        document.getElementById('createGroupForm').reset();
        const fileInputText = document.getElementById('file-input-text');
        if (fileInputText) {
            fileInputText.textContent = 'Bir resim seçin...';
        }
        // Reset file input text
    }

    // Grup kartı oluşturma
    createGroupCard(group) {
        const memberCount = this.memberCounts.get(group.groupId) || 0;
        
        // Kullanıcının grupları için private kontrolü yapma
        const userGroups = localStorage.getItem('groups');
        let isUserGroup = false;
        if (userGroups) {
            const groupsData = JSON.parse(userGroups);
            isUserGroup = groupsData.hasOwnProperty(group.groupId);
        }
        
        const isPrivate = group.visibility === 'private' && !isUserGroup;

        let avatarHtml;
        if (group.groupImage) {
            avatarHtml = `<img src="${group.groupImage}" alt="${group.groupName}" class="group-avatar-image group-avatar-image-loading" onload="this.classList.remove('group-avatar-image-loading')" onerror="this.classList.remove('group-avatar-image-loading'); this.src='/images/open-book.webp'">`;
        } else {
            const groupInitial = group.groupName.charAt(0).toUpperCase();
            avatarHtml = `<span>${groupInitial}</span>`;
        }

        // Gizli grup için kilit ikonu (sadece kullanıcının grubu değilse)
        const lockIcon = isPrivate ? '<img src="/images/lock.webp" alt="Kilit" title="Gizli Grup" class="private-group-lock">' : '';
        
        // Kullanıcının grubu için özel işaret - yetkiye göre
        let userGroupIcon = '';
        if (isUserGroup) {
            const userAuthority = group.userAuthority || 'member';
            const iconClass = userAuthority === 'admin' ? 'fas fa-user-shield' : 'fas fa-user';
            const badgeClass = userAuthority === 'admin' ? 'user-group-badge admin-badge' : 'user-group-badge member-badge';
            userGroupIcon = `<div class="${badgeClass}"><i class="${iconClass}"></i></div>`;
        }

        const card = document.createElement('div');
        // Kullanıcının grubu ise özel class ekle
        if (isUserGroup) {
            card.className = isPrivate ? 'group-card private-group user-group' : 'group-card user-group';
        } else {
            card.className = isPrivate ? 'group-card private-group' : 'group-card';
        }
        card.setAttribute('data-group-id', group.groupId);

        card.innerHTML = `
            <div class="group-header">
                <div class="group-avatar">
                    ${avatarHtml}
                </div>
                <div class="group-info">
                    <h3 class="group-name">${this.escapeHtml(group.groupName)}</h3>
                    <p class="group-id">@${this.escapeHtml(group.groupId)}</p>
                </div>
                ${lockIcon}
                ${userGroupIcon}
            </div>
            <div>
               <span class="groupDescription">${this.escapeHtml((group.description || '').substring(0, 100))}</span>
            </div>

        <div class="group-stats">
            <div class="stat-item">
                <i class="fas fa-users"></i>
                <span class="member-count"><span class="memberCount">${memberCount}</span> üye</span>
            </div>
            ${!isUserGroup ? '<button class="join-group-btn"><i class="fas fa-plus"></i> Gruba Katıl</button>' : ''}
        </div>
    `;

        // Gruba katıl butonu için event listener
        if (!isUserGroup) {
            const joinBtn = card.querySelector('.join-group-btn');
            if (joinBtn) {
                joinBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Kart tıklamasını engelle
                    window.location.href = `/groupid=${group.groupId}`;
                });
            }
        }

        // Sadece kullanıcının grupları veya public gruplar için tıklama işlevi
        if (isUserGroup || !isPrivate) {
            card.addEventListener('click', () => {
                window.location.href = `/groupid=${group.groupId}`;
            });

            // Hover efekti
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-5px)';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        } else {
            // Private gruplar için cursor pointer'ı kaldır
            card.style.cursor = 'default';
        }

        return card;
    }

    showLoading(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        loadingSpinner.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        // Create a simple toast notification
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);

        // Add CSS for animations
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Hazır görseller modal'ını aç/kapat
    toggleReadyImagesModal() {
        const modal = document.getElementById('readyImagesModal');
        if (modal.classList.contains('show')) {
            this.closeReadyImagesModal();
        } else {
            this.openReadyImagesModal();
        }
    }

    openReadyImagesModal() {
        const modal = document.getElementById('readyImagesModal');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.loadAvatarOptions();
    }

    closeReadyImagesModal() {
        const modal = document.getElementById('readyImagesModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    // Hazır avatar seçeneklerini yükle
    async loadAvatarOptions() {
        try {
            const response = await fetch('/api/group-avatars');
            if (response.ok) {
                const avatars = await response.json();
                const avatarGrid = document.getElementById('avatarGrid');
                
                avatarGrid.innerHTML = '';
                
                if (avatars.length === 0) {
                    avatarGrid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #6c757d;">
                            <i class="fa-solid fa-images" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                            <p>Henüz hazır görsel bulunmuyor.</p>
                            <small>groupAvatars klasörüne resim dosyaları ekleyin.</small>
                        </div>
                    `;
                    return;
                }
                
                avatars.forEach(avatar => {
                    const avatarItem = document.createElement('div');
                    avatarItem.className = 'avatar-item';
                    avatarItem.dataset.avatarPath = avatar.path;
                    
                    avatarItem.innerHTML = `
                        <img src="${avatar.path}" alt="Avatar" loading="lazy">
                        <div class="check-icon">
                            <i class="fa-solid fa-check"></i>
                        </div>
                    `;
                    
                    avatarItem.addEventListener('click', () => this.selectAvatar(avatar.path, avatarItem));
                    avatarGrid.appendChild(avatarItem);
                });
            } else {
                console.error('Avatar seçenekleri yüklenemedi');
            }
        } catch (error) {
            console.error('Avatar yükleme hatası:', error);
        }
    }

    // Avatar seç
    selectAvatar(avatarPath, avatarElement) {
        // Önceki seçimi kaldır
        document.querySelectorAll('.avatar-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Yeni seçimi işaretle
        avatarElement.classList.add('selected');
        
        // Modal'ı kapat
        this.closeReadyImagesModal();
        
        // Seçilen avatar'ı sakla (grup oluşturulurken kullanılacak)
        this.selectedAvatarPath = avatarPath;
        
        // Dosya input'unu temizle
        const fileInput = document.getElementById('groupImageInput');
        fileInput.value = '';
        
        // Dosya seçim metnini güncelle
        const fileInputText = document.querySelector('.file-input-text');
        fileInputText.textContent = 'Hazır görsel seçildi';
        fileInputText.style.color = '#28a745';
    }
}

// Global fonksiyonlar (HTML onclick için)
let groupsPageInstance = null;

function toggleReadyImagesModal() {
    if (groupsPageInstance) {
        groupsPageInstance.toggleReadyImagesModal();
    }
}

// Initialize the groups page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    groupsPageInstance = new GroupsPage();
});
