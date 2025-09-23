class GroupsPage {
    constructor() {
        this.groups = [];
        this.filteredGroups = [];
        this.currentPage = 0;
        this.groupsPerPage = 12;
        this.isLoading = false;
        this.searchQuery = '';
        this.memberCounts = new Map();

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadGroups();
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

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCreateModal();
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
            const skip = reset ? 0 : this.currentPage * this.groupsPerPage;
            const response = await fetch(`/api/groups?skip=${skip}&limit=${this.groupsPerPage}&search=${this.searchQuery}`);

            if (!response.ok) {
                throw new Error('Failed to fetch groups');
            }

            const data = await response.json();

            if (reset) {
                this.groups = data.groups;
                this.currentPage = 0;
            } else {
                this.groups = [...this.groups, ...data.groups];
            }

            this.filteredGroups = this.groups;
            await this.loadMemberCounts(data.groups);
            this.renderGroups();
            this.currentPage++;

        } catch (error) {
            console.error('Error loading groups:', error);
            this.showError('Failed to load groups. Please try again.');
        } finally {
            this.isLoading = false;
            this.showLoading(false);
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

    createGroupCard(group) {
        const memberCount = this.memberCounts.get(group.groupId) || 0;

        let avatarHtml;
        if (group.groupImage) {
            avatarHtml = `<img src="${group.groupImage}" alt="${group.groupName}" class="group-avatar-image">`;
        } else {
            const groupInitial = group.groupName.charAt(0).toUpperCase();
            avatarHtml = `<span>${groupInitial}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'group-card';
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
            </div>
            <div>
               <span class="groupDescription">${this.escapeHtml((group.description || '').substring(0, 100))}</span>
            </div>

        <div class="group-stats">
            <div class="stat-item">
                <i class="fas fa-users"></i>
                <span class="member-count"><span class="memberCount">${memberCount}</span> üye</span>


            </div>
        </div>
    `;

        card.addEventListener('click', () => {
            window.location.href = `/groupid=${group.groupId}`;
        });

        // Add hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });

        return card;
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
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
                    const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
                    const now = Date.now();
                    // Sadece yüklenmiyorsa, arama yapılmıyorsa ve son yüklemeden yeterli süre geçtiyse yükle
                    if (nearBottom && !this.isLoading && this.searchQuery === '' && now - lastLoadTime > 600) {
                        // Sadece daha fazla grup varsa yükle
                        if (this.filteredGroups.length >= (this.currentPage * this.groupsPerPage)) {
                            this.loadGroups();
                            lastLoadTime = now;
                        }
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    openCreateModal() {
        const modal = document.getElementById('createGroupModal');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        document.body.style.overflow = 'hidden';

        // Update visibility icon based on current selection
        this.updateVisibilityIcon();

        // Focus on group name input
        setTimeout(() => {
            document.getElementById('groupNameInput').focus();
        }, 100);
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
        // Reset file input text
        const fileInputText = document.querySelector('.file-input-text');
        if (fileInputText) {
            fileInputText.textContent = 'Bir resim seçin...';
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
        
        if (visibilitySelect.value === 'Herkese') {
            visibilityIcon.className = 'fas fa-eye input-icon';
        } else if (visibilitySelect.value === 'Özel') {
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

        if (!groupName || !adminName || !adminPassword) {
            alert('Lütfen tüm zorunlu alanları doldurun.');
            return;
        }

        const formData = new FormData();
        formData.append('groupName', groupName);
        formData.append('description', groupDescription);
        formData.append('adminName', adminName);
        formData.append('adminPassword', adminPassword);
        formData.append('visibility', visibility);
        if (groupImageInput.files[0]) {
            formData.append('groupImage', groupImageInput.files[0]);
        }

        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Admin girişi yapmış şekilde localStorage'a bilgileri kaydet
                localStorage.setItem('authenticated', 'true');
                localStorage.setItem('adminUsername', adminName);
                localStorage.setItem('groupName', result.group.groupName);
                localStorage.setItem('groupId', result.group.groupId);
                
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

        let avatarHtml;
        if (group.groupImage) {
            avatarHtml = `<img src="${group.groupImage}" alt="${group.groupName}" class="group-avatar-image">`;
        } else {
            const groupInitial = group.groupName.charAt(0).toUpperCase();
            avatarHtml = `<span>${groupInitial}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'group-card';
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
            </div>
            <div>
               <span class="groupDescription">${this.escapeHtml((group.description || '').substring(0, 100))}</span>
            </div>

        <div class="group-stats">
            <div class="stat-item">
                <i class="fas fa-users"></i>
                <span class="member-count"><span class="memberCount">${memberCount}</span> üye</span>


            </div>
        </div>
    `;

        card.addEventListener('click', () => {
            window.location.href = `/groupid=${group.groupId}`;
        });

        // Add hover effect
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });

        return card;
    }

    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'block' : 'none';
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
}

// Initialize the groups page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GroupsPage();
});
