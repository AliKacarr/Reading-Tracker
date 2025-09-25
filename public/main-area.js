newUserForm.addEventListener('submit', async (e) => {  //Kullanıcı ekleme fonksiyonu
    e.preventDefault();

    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('add-user');
        return;
    }

    const input = document.getElementById('newUserInput');
    const imageInput = document.getElementById('profileImage');
    const submitBtn = document.querySelector('#newUserForm button[type="submit"]');
    const name = input.value.trim();

    if (!name) return;

    // Loading göstergesi
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Ekleniyor...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('name', name);

        if (imageInput.files.length > 0) {
            formData.append('profileImage', imageInput.files[0]);
        }

        // Kullanıcıyı ekle (yeni sistem: önce yerel, sonra Dropbox)
        const response = await fetch(`/api/add-user/${currentGroupId}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Kullanıcı ekleme başarısız');
        }

        const result = await response.json();

        // Form alanlarını temizle
        input.value = '';
        imageInput.value = '';
        fileNameDisplay.textContent = 'Resim seçilmedi';
        fileInputLabel.textContent = 'Resim Seç';
        imagePreviewContainer.style.display = 'none';
        
        // Input-profile-image'i varsayılan resme döndür
        inputProfileImage.src = '/images/default.webp';

        // UI'ı güncelle (yerel resim ile başlar, Dropbox yüklemesi arka planda olur)
        if (isAuthenticated()) {
            renderUserList();
        }
        loadTrackerTable();
        loadUserCards();
        loadReadingStats();
        renderLongestSeries();
        showSuccessMessage('Kullanıcı başarıyla eklendi!');
        if (window.updateMonthlyCalendarUsers) window.updateMonthlyCalendarUsers();

    } catch (error) {
        console.error('Kullanıcı ekleme hatası:', error);
        showErrorMessage('Kullanıcı eklenirken hata oluştu!');
    } finally {
        // Loading göstergesini kaldır
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

async function deleteUser(id) {     //Kullanıcıyı silme fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('delete-user');
        return;
    }

    // Find the user name for the confirmation message
    const userElement = document.querySelector(`li[data-user-id="${id}"]`);
    const userName = userElement ? userElement.querySelector('.profil-image-user-name').textContent : 'this user';

    // Ask for confirmation before deleting
    const confirmed = confirm(`Silmek istediğine emin misin: ->  ${userName}  <- Bu işlem geri alınamaz.`);

    if (confirmed) {
        // Loading göstergesi
        const deleteBtn = document.querySelector(`li[data-user-id="${id}"] .delete-user-btn`);
        if (deleteBtn) {
            const originalText = deleteBtn.textContent;
            deleteBtn.textContent = 'Siliniyor...';
            deleteBtn.disabled = true;
        }

        try {
            await fetch(`/api/delete-user/${currentGroupId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (isAuthenticated()) {
                renderUserList();
            }
            loadTrackerTable();
            loadUserCards();
            loadReadingStats();
            renderLongestSeries();
            showSuccessMessage('Kullanıcı başarıyla silindi!');
            if (window.updateMonthlyCalendarUsers) window.updateMonthlyCalendarUsers();
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            showErrorMessage('Kullanıcı silinirken hata oluştu!');
        } finally {
            // Loading göstergesini kaldır
            if (deleteBtn) {
                deleteBtn.textContent = originalText;
                deleteBtn.disabled = false;
            }
        }
    }
}

async function saveUserName(userId) {   //Kullanıcı adını güncelleme fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('save-user-name');
        return;
    }

    const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
    const nameSpan = userItem.querySelector('.profil-image-user-name');
    const nameInput = userItem.querySelector('.edit-name-input');
    const saveButton = userItem.querySelector('.save-name-button');

    const newName = nameInput.value.trim();
    if (!newName) {
        showErrorMessage('Kullanıcı adı boş olamaz!');
        return; // Don't save empty names
    }

    saveButton.disabled = true;

    try {
        // Update the user name in the database
        const response = await fetch(`/api/update-user/${currentGroupId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, name: newName })
        });

        if (!response.ok) {
            throw new Error('Kullanıcı adı güncellenemedi');
        }

        // Hide input, save button and cancel button, show name span, edit button and settings button
        nameSpan.style.display = 'inline-block';
        nameInput.style.display = 'none';
        saveButton.style.display = 'none';
        
        const cancelButton = userItem.querySelector('.cancel-edit-button');
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }
        
        // Show edit button and settings button
        const editButton = userItem.querySelector('.edit-name-button');
        if (editButton) {
            editButton.style.display = 'inline-block';
        }
        
        const settingsButton = userItem.querySelector('.settings-button');
        if (settingsButton) {
            settingsButton.style.display = 'inline-block';
        }

        // Update the name span with new name
        nameSpan.textContent = newName;

        // Update other components that might show the user name
        loadTrackerTable();
        loadUserCards();
        loadReadingStats();
        renderLongestSeries();
        if (window.updateMonthlyCalendarUsers) window.updateMonthlyCalendarUsers();

        showSuccessMessage('Kullanıcı adı başarıyla güncellendi!');

    } catch (error) {
        console.error('Kullanıcı adı güncelleme hatası:', error);
        showErrorMessage('Kullanıcı adı güncellenirken hata oluştu!');
        
        // Reset button state
        saveButton.disabled = false;
        
        // Hide cancel button and show edit button and settings button again on error
        const cancelButton = userItem.querySelector('.cancel-edit-button');
        if (cancelButton) {
            cancelButton.style.display = 'none';
        }
        
        const editButton = userItem.querySelector('.edit-name-button');
        if (editButton) {
            editButton.style.display = 'inline-block';
        }
        
        const settingsButton = userItem.querySelector('.settings-button');
        if (settingsButton) {
            settingsButton.style.display = 'inline-block';
        }
    }
}

function editUserName(userId) {     //Kullanıcı adını düzenleme fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('edit-user-name');
        return;
    }

    const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
    const nameSpan = userItem.querySelector('.profil-image-user-name');
    const nameInput = userItem.querySelector('.edit-name-input');
    const editButton = userItem.querySelector('.edit-name-button');
    const saveButton = userItem.querySelector('.save-name-button');
    const cancelButton = userItem.querySelector('.cancel-edit-button');
    const settingsButton = userItem.querySelector('.settings-button');

    // Hide name span, edit button and settings button, show input, save button and cancel button
    nameSpan.style.display = 'none';
    editButton.style.display = 'none';
    settingsButton.style.display = 'none';
    nameInput.style.display = 'inline-block';
    saveButton.style.display = 'inline-block';
    cancelButton.style.display = 'inline-block';
    
    // Focus on input and select text
    nameInput.focus();
    nameInput.select();
}

function changeUserImage(userId) {     //Kullanıcı resmi değiştirme fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('change-user-image');
        return;
    }

    // Create a hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    // Trigger click on the file input
    fileInput.click();

    // Handle file selection
    fileInput.addEventListener('change', async function () {
        if (this.files.length > 0) {
            const file = this.files[0];
            
            // Önce UI'da resmi güncelle
            const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
            if (userItem) {
                const userImage = userItem.querySelector('.user-profile-image');
                if (userImage) {
                    // Yeni resmi önizleme olarak göster
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        userImage.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            }

            // Resim güncelleme (yeni sistem: önce yerel, sonra Dropbox)
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('profileImage', file);

            try {
                const response = await fetch(`/api/update-user-image/${currentGroupId}`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Resim güncelleme başarısız');
                }

                const result = await response.json();
                
                // Diğer bileşenleri güncelle (yerel resim ile başlar, Dropbox yüklemesi arka planda olur)
                loadTrackerTable();
                loadUserCards();
                loadReadingStats();
                renderLongestSeries();

            } catch (error) {
                console.error('Resim güncelleme hatası:', error);
                // Hata durumunda resmi eski haline geri döndür
                if (userItem) {
                    const userImage = userItem.querySelector('.user-profile-image');
                    if (userImage) {
                        userImage.src = userImage.src; // Sayfayı yenile
                    }
                }
                showErrorMessage('Resim güncellenirken hata oluştu!');
            }

            document.body.removeChild(fileInput);
        }
    });
}

// File input display handler
const profileImageInput = document.getElementById('profileImage');
const fileNameDisplay = document.getElementById('file-name');
const fileInputLabel = document.getElementById('file-input-label');
const imagePreview = document.getElementById('imagePreview');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const closePreviewButton = document.getElementById('closePreview');
const inputProfileImage = document.getElementById('inputProfileImage');


function resetImagePreview() {    // Resim önizleme kapatma fonksiyonu
    imagePreviewContainer.style.display = 'none';
    fileNameDisplay.textContent = 'Resim seçilmedi';
    fileInputLabel.textContent = 'Resim Seç';
    profileImageInput.value = ''; // Input değerini de temizle
    
    // Input-profile-image'i varsayılan resme döndür
    inputProfileImage.src = '/images/default.webp';
}

if (closePreviewButton) {
    closePreviewButton.addEventListener('click', function (e) {
        e.preventDefault();
        resetImagePreview();
    });
}

if (profileImageInput && fileNameDisplay) {
    profileImageInput.addEventListener('change', function () {
        if (this.files.length > 0) {
            fileNameDisplay.textContent = this.files[0].name;
            fileInputLabel.textContent = "Değiştir";

            // Resim ön izlemesi göster
            const file = this.files[0];
            const reader = new FileReader();

            reader.onload = function (e) {
                // Ana önizleme alanını güncelle
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'flex';
                
                // Input-profile-image'i güncelle
                inputProfileImage.src = e.target.result;
            }

            reader.readAsDataURL(file);
        } else {
            resetImagePreview();
        }
    });
}

function showSuccessMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'success-message';
    messageElement.textContent = message;
    document.body.appendChild(messageElement);

    // Style the message
    messageElement.style.position = 'fixed';
    messageElement.style.top = '20px';
    messageElement.style.right = '20px';
    messageElement.style.backgroundColor = '#d4edda';
    messageElement.style.color = '#155724';
    messageElement.style.padding = '10px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
    messageElement.style.zIndex = '1000';

    // Remove the message after 3 seconds
    setTimeout(() => {
        document.body.removeChild(messageElement);
    }, 3000);
}

function toggleDeleteButton(userId) {     //Kullanıcı silme butonunu açma fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('toggle-delete-button');
        return;
    }

    const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
    const deleteButton = userItem.querySelector('.delete-button');
    const settingsButton = userItem.querySelector('.settings-button');
    const cancelButton = userItem.querySelector('.cancel-settings-button');
    const editButton = userItem.querySelector('.edit-name-button');

    if (deleteButton.style.display === 'none') {
        deleteButton.style.display = 'inline-block';
        settingsButton.style.display = 'none';
        editButton.style.display = 'none';
        cancelButton.style.display = 'inline-block';
    } else {
        settingsButton.style.display = 'inline-block';
        editButton.style.display = 'inline-block';
        deleteButton.style.display = 'none';
        cancelButton.style.display = 'none';
    }
}

function cancelEditUserName(userId) {     //Kullanıcı adı düzenleme iptal fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('cancel-edit-user-name');
        return;
    }

    const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
    const nameSpan = userItem.querySelector('.profil-image-user-name');
    const nameInput = userItem.querySelector('.edit-name-input');
    const editButton = userItem.querySelector('.edit-name-button');
    const saveButton = userItem.querySelector('.save-name-button');
    const cancelButton = userItem.querySelector('.cancel-edit-button');
    const settingsButton = userItem.querySelector('.settings-button');

    // Reset to original state: hide input, save and cancel buttons, show name span, edit button and settings button
    nameSpan.style.display = 'inline-block';
    nameInput.style.display = 'none';
    saveButton.style.display = 'none';
    cancelButton.style.display = 'none';
    editButton.style.display = 'inline-block';
    settingsButton.style.display = 'inline-block';

    // Reset input value to original name
    nameInput.value = nameSpan.textContent;
}

function cancelSettings(userId) {     //Ayarlar iptal fonksiyonu
    // Check if user is authenticated
    if (!isAuthenticated()) {
        logUnauthorizedAccess('cancel-settings');
        return;
    }

    const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
    const deleteButton = userItem.querySelector('.delete-button');
    const settingsButton = userItem.querySelector('.settings-button');
    const cancelButton = userItem.querySelector('.cancel-settings-button');
    const editButton = userItem.querySelector('.edit-name-button');

    // Reset to original state: hide delete and cancel buttons, show settings button and edit button
    deleteButton.style.display = 'none';
    cancelButton.style.display = 'none';
    settingsButton.style.display = 'inline-block';
    editButton.style.display = 'inline-block';
}

function renderUserList() {
    // Admin yetkisi kontrolü
    if (!isAuthenticated()) {
        console.log('Admin yetkisi yok, renderUserList çalıştırılmıyor');
        return;
    }

    const userList = document.getElementById('userList');
    const prevScrollTop = userList.scrollTop; // scroll pozisyonunu koru
    fetch(`/api/users/${currentGroupId}`)
        .then(res => res.json())
        .then(data => {
            const users = data.users;
            // Mevcut kullanıcı ID'lerini al
            const existingIds = Array.from(userList.children).map(li => li.getAttribute('data-user-id'));
            const newIds = users.map(u => u._id);

            // Silinen kullanıcıları kaldır (veritabanında olmayan ama UI'da olan)
            existingIds.forEach(id => {
                if (!newIds.includes(id)) {
                    const li = userList.querySelector(`li[data-user-id="${id}"]`);
                    if (li) userList.removeChild(li);
                }
            });

            // Sadece yeni kullanıcıları ekle, mevcut olanları güncelleme
            users.forEach(user => {
                let li = userList.querySelector(`li[data-user-id="${user._id}"]`);
                
                if (!li) {
                    // Sadece yeni kullanıcı için HTML oluştur
                    const userProfileImage = user.profileImage || '/images/default.webp';
                    const liHTML = `<div class="kullanıcı-item"><img src="${userProfileImage}" alt="${user.name}" class="profile-image user-profile-image" onclick="changeUserImage('${user._id}')"/><span class="profil-image-user-name">${user.name}</span><input type="text" class="edit-name-input" value="${user.name}" style="display:none;"><button class="edit-name-button" onclick="editUserName('${user._id}')" alt="Düzenle" title="İsmi Düzenle"><i class="fa-solid fa-pen"></i></button><button class="save-name-button" onclick="saveUserName('${user._id}')" alt="Onayla" title="İsmi Onayla" style="display:none; justify-content:center;"><i class="fa-solid fa-check"></i></button><button class="cancel-edit-button" onclick="cancelEditUserName('${user._id}')" alt="İptal" title="Düzenlemeyi İptal Et" style="display:none;"><i class="fa-solid fa-times"></i></button></div><div class="user-actions"><button class="settings-button" onclick="toggleDeleteButton('${user._id}')"><i class="fa-solid fa-user-minus"></i></button><button class="delete-button" style="display:none;" onclick="deleteUser('${user._id}')"><i class="fa-solid fa-trash-can"></i></button><button class="cancel-settings-button" onclick="cancelSettings('${user._id}')" alt="İptal" title="Ayarları İptal Et" style="display:none;"><i class="fa-solid fa-times"></i></button></div>`;
                    
                    li = document.createElement('li');
                    li.setAttribute('data-user-id', user._id);
                    li.innerHTML = liHTML;
                    userList.appendChild(li);
                }
                // Mevcut kullanıcılar için hiçbir şey yapma - gereksiz resim yüklemelerini önle
            });
            userList.scrollTop = prevScrollTop; // scroll pozisyonunu geri yükle
        });
}

// Grup bilgilerini yükle
async function loadGroupSettings() {
    if (!isAuthenticated()) {
        console.log('Admin yetkisi yok, grup ayarları yüklenmiyor');
        return;
    }

    try {
        const response = await fetch(`/api/group/${currentGroupId}`);
        if (response.ok) {
            const data = await response.json();
            const group = data.group;
            
            // Form alanlarını doldur
            document.getElementById('groupName').value = group.groupName || '';
            document.getElementById('groupDescription').value = group.description || '';
            document.getElementById('groupVisibility').value = group.visibility || 'public';
            
            // Grup resmini ayarla
            const groupImage = document.getElementById('currentGroupImage');
            const removeBtn = document.querySelector('.group-image-remove-btn');
            
            if (group.groupImage) {
                groupImage.src = group.groupImage;
                removeBtn.style.display = 'flex';
            } else {
                groupImage.src = '/images/open-book.webp';
                removeBtn.style.display = 'none';
            }
            
            // Görünürlük ikonunu güncelle
            updateVisibilityIcon(group.visibility || 'public');
        }
    } catch (error) {
        console.error('Grup ayarları yüklenirken hata:', error);
    }
}

// Görünürlük ikonunu güncelle
function updateVisibilityIcon(visibility) {
    const icon = document.getElementById('visibilityIcon');
    const info = document.getElementById('visibilityInfo');
    const infoSpan = info ? info.querySelector('span') : null;
    
    if (!icon) return;
    
    // Mevcut sınıfları temizle
    icon.classList.remove('public', 'private');
    if (info) info.classList.remove('public', 'private');
    
    // Yeni sınıfı ekle
    icon.classList.add(visibility);
    if (info) info.classList.add(visibility);
    
    // İkonu değiştir
    if (visibility === 'public') {
        icon.className = 'fa-solid fa-eye visibility-icon public';
        if (infoSpan) infoSpan.textContent = 'Herkes bu grubu görüntüleyebilir';
    } else {
        icon.className = 'fa-solid fa-eye-slash visibility-icon private';
        if (infoSpan) infoSpan.textContent = 'Sadece üyeler grubu görüntüleyebilir';
    }
}

// Hazır görseller modal'ını aç/kapat
function toggleReadyImagesModal() {
    const modal = document.getElementById('readyImagesModal');
    if (modal.classList.contains('show')) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto'; // Scroll'u geri aç
    } else {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; // Scroll'u kapat
        loadAvatarOptions(); // Modal açıldığında avatarları yükle
    }
}

// Hazır avatar seçeneklerini yükle
async function loadAvatarOptions() {
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
                
                avatarItem.addEventListener('click', () => selectAvatar(avatar.path, avatarItem));
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
function selectAvatar(avatarPath, avatarElement) {
    // Önceki seçimi kaldır
    document.querySelectorAll('.avatar-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Yeni seçimi işaretle
    avatarElement.classList.add('selected');
    
    // Grup resmini güncelle
    const currentGroupImage = document.getElementById('currentGroupImage');
    currentGroupImage.src = avatarPath;
    
    // Sil butonunu göster (hazır avatar seçildi, artık bir resim var)
    const removeBtn = document.querySelector('.group-image-remove-btn');
    removeBtn.style.display = 'flex';
    
    // Modal'ı kapat
    toggleReadyImagesModal();
    
    // Grup resmini güncelle (sunucuya gönder)
    updateGroupImageFromAvatar(avatarPath);
}

// Hazır avatar ile grup resmini güncelle
async function updateGroupImageFromAvatar(avatarPath) {
    try {
        const response = await fetch(`/api/update-group-image-from-avatar/${currentGroupId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ avatarPath: avatarPath })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('Grup resmi hazır avatar ile güncellendi');
            
            // secretAdminLogin resmini de güncelle
            const secretAdminLoginImages = document.querySelectorAll('.secretAdminLoginImage');
            secretAdminLoginImages.forEach(img => {
                img.src = result.imageUrl;
            });
        } else {
            console.error('Grup resmi güncellenemedi');
        }
    } catch (error) {
        console.error('Avatar güncelleme hatası:', error);
    }
}

// Grup ayarlarını kaydet
async function saveGroupSettings() {
    if (!isAuthenticated()) {
        showErrorMessage('Bu işlem için admin yetkisi gereklidir!');
        return;
    }

    const groupName = document.getElementById('groupName').value.trim();
    const groupDescription = document.getElementById('groupDescription').value.trim();
    const groupVisibility = document.getElementById('groupVisibility').value;

    if (!groupName) {
        showErrorMessage('Grup adı boş olamaz!');
        return;
    }

    const saveBtn = document.querySelector('.save-group-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Kaydediliyor...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(`/api/update-group/${currentGroupId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                groupName,
                description: groupDescription,
                visibility: groupVisibility
            })
        });

        if (response.ok) {
            showSuccessMessage('Grup ayarları başarıyla kaydedildi!');
            // Sayfa başlığını güncelle
            if (typeof updatePageTitle === 'function') {
                updatePageTitle();
            }
        } else {
            throw new Error('Grup ayarları kaydedilemedi');
        }
    } catch (error) {
        console.error('Grup ayarları kaydetme hatası:', error);
        showErrorMessage('Grup ayarları kaydedilirken hata oluştu!');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// Grup resmini değiştir
async function changeGroupImage() {
    if (!isAuthenticated()) {
        showErrorMessage('Bu işlem için admin yetkisi gereklidir!');
        return;
    }

    const fileInput = document.getElementById('groupImage');
    const file = fileInput.files[0];
    
    if (!file) return;

    const formData = new FormData();
    formData.append('groupImage', file);

    const changeBtn = document.querySelector('.change-image-btn');
    const originalText = changeBtn.innerHTML;
    changeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    changeBtn.disabled = true;

    try {
        const response = await fetch(`/api/update-group-image/${currentGroupId}`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('currentGroupImage').src = data.imageUrl;
            document.querySelector('.group-image-remove-btn').style.display = 'flex';
            
            // secretAdminLogin'deki grup resmini de güncelle
            const secretAdminImage = document.querySelector('.secretAdminLogin img');
            const secretAdminLoginImage = document.querySelector('.secretAdminLoginImage');
            if (secretAdminImage) {
                secretAdminImage.src = data.imageUrl;
            }
            if (secretAdminLoginImage) {
                secretAdminLoginImage.src = data.imageUrl;
            }
            
            showSuccessMessage('Grup resmi başarıyla güncellendi!');
        } else {
            throw new Error('Grup resmi güncellenemedi');
        }
    } catch (error) {
        console.error('Grup resmi güncelleme hatası:', error);
        showErrorMessage('Grup resmi güncellenirken hata oluştu!');
    } finally {
        changeBtn.innerHTML = originalText;
        changeBtn.disabled = false;
        fileInput.value = ''; // Input'u temizle
    }
}

// Grup resmini kaldır
async function removeGroupImage() {
    if (!isAuthenticated()) {
        showErrorMessage('Bu işlem için admin yetkisi gereklidir!');
        return;
    }

    const confirmed = confirm('Grup resmini kaldırmak istediğinize emin misiniz?');
    if (!confirmed) return;

    const removeBtn = document.querySelector('.group-image-remove-btn');
    const originalText = removeBtn.innerHTML;
    removeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    removeBtn.disabled = true;

    try {
        const response = await fetch(`/api/remove-group-image/${currentGroupId}`, {
            method: 'POST'
        });

        if (response.ok) {
            document.getElementById('currentGroupImage').src = '/images/open-book.webp';
            document.querySelector('.group-image-remove-btn').style.display = 'none';
            
            // secretAdminLogin'deki grup resmini de güncelle
            const secretAdminImage = document.querySelector('.secretAdminLogin img');
            const secretAdminLoginImage = document.querySelector('.secretAdminLoginImage');
            if (secretAdminImage) {
                secretAdminImage.src = '/images/open-book.webp';
            }
            if (secretAdminLoginImage) {
                secretAdminLoginImage.src = '/images/open-book.webp';
            }
            
            showSuccessMessage('Grup resmi başarıyla kaldırıldı!');
        } else {
            throw new Error('Grup resmi kaldırılamadı');
        }
    } catch (error) {
        console.error('Grup resmi kaldırma hatası:', error);
        showErrorMessage('Grup resmi kaldırılırken hata oluştu!');
    } finally {
        removeBtn.innerHTML = originalText;
        removeBtn.disabled = false;
    }
}

// Grup silme butonunu göster/gizle
function toggleDeleteGroupButton() {
    const deleteBtn = document.querySelector('.delete-group-btn');
    const toggleBtn = document.querySelector('.danger-toggle-btn');
    const dangerText = toggleBtn.querySelector('.danger-text');
    
    if (deleteBtn.style.display === 'none' || deleteBtn.style.display === '') {
        deleteBtn.style.display = 'flex';
        toggleBtn.classList.add('active');
        dangerText.textContent = 'İptal Et';
        toggleBtn.style.backgroundColor = '#27ae60'; // yeşil yap
    } else {
        deleteBtn.style.display = 'none';
        toggleBtn.classList.remove('active');
        dangerText.textContent = 'Grubu Sil';
        toggleBtn.style.backgroundColor = '#95a5a6'; // Gri yap
    }
}

// Grubu paylaş
async function shareGroup() {
    try {
        // Grup adını al
        const groupName = document.getElementById('groupName').value || 'Grup';
        
        // URL formatını oluştur
        const groupUrl = `${window.location.origin}/groupid=${currentGroupId}`;
        
        // Paylaşım metnini oluştur
        const shareText = `RoTaKip ${groupName}\n${groupUrl}`;
        
        // Her durumda panoya kopyala
        await navigator.clipboard.writeText(shareText);
        
        // Web Share API'yi de dene (eğer varsa)
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `RoTaKip ${groupName}`,
                    text: shareText, // Tam metni paylaş
                });
                showSuccessMessage('Grup davet linki paylaşıldı ve panoya kopyalandı!');
            } catch (shareError) {
                // Web Share API iptal edilirse sadece panoya kopyalama mesajı göster
                showSuccessMessage('Grup davet linki panoya kopyalandı!');
            }
        } else {
            // Web Share API yoksa sadece panoya kopyalama mesajı göster
            showSuccessMessage('Grup davet linki panoya kopyalandı!');
        }
        
    } catch (error) {
        console.error('Paylaşım hatası:', error);
        showErrorMessage('Link kopyalanamadı. Lütfen manuel olarak kopyalayın.');
    }
}

// Grubu sil
async function deleteGroup() {
    // Admin kontrolü
    const isAuth = isAuthenticated();
    if (!isAuth) {
        showErrorMessage('Bu işlem için admin yetkisi gereklidir!');
        return;
    }

    if (!currentGroupId) {
        showErrorMessage('Grup ID bulunamadı!');
        return;
    }

    const groupName = document.getElementById('groupName').value || 'Bu grup';
    const confirmed = confirm(`"${groupName}" grubunu silmek istediğinize emin misiniz?\n\nBu işlem geri alınamaz ve tüm grup verileri (kullanıcılar, okuma kayıtları, vb.) kalıcı olarak silinecektir.`);
    
    if (!confirmed) {
        return;
    }

    const deleteBtn = document.querySelector('.delete-group-btn');
    if (!deleteBtn) {
        showErrorMessage('Sil butonu bulunamadı!');
        return;
    }

    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Siliniyor...';
    deleteBtn.disabled = true;

    try {
        const response = await fetch(`/api/delete-group/${currentGroupId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            showSuccessMessage('Grup başarıyla silindi!');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } else {
            let errorData;
            try {
                errorData = await response.json();
            } catch (parseError) {
                errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
            }
            throw new Error(errorData.message || 'Grup silinemedi');
        }
    } catch (error) {
        console.error('Grup silme hatası:', error);
        showErrorMessage('Grup silinirken hata oluştu: ' + error.message);
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// Event listener'ları ekle
document.addEventListener('DOMContentLoaded', function() {
    // Grup ayarları butonları
    const saveGroupBtn = document.querySelector('.save-group-btn');
    const changeImageBtn = document.querySelector('.change-image-btn');
    const removeImageBtn = document.querySelector('.group-image-remove-btn');
    const toggleDeleteBtn = document.querySelector('.danger-toggle-btn');
    const deleteGroupBtn = document.querySelector('.delete-group-btn');
    const groupImageInput = document.getElementById('groupImage');

    if (saveGroupBtn) {
        saveGroupBtn.addEventListener('click', saveGroupSettings);
    }

    if (changeImageBtn) {
        changeImageBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            groupImageInput.click();
        });
    }

    if (groupImageInput) {
        groupImageInput.addEventListener('change', changeGroupImage);
    }

    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', removeGroupImage);
    }

    if (toggleDeleteBtn) {
        toggleDeleteBtn.addEventListener('click', toggleDeleteGroupButton);
    }

    const shareGroupBtn = document.querySelector('.share-group-btn');
    if (shareGroupBtn) {
        shareGroupBtn.addEventListener('click', shareGroup);
    }

    if (deleteGroupBtn) {
        deleteGroupBtn.addEventListener('click', function(e) {
            e.preventDefault();
            deleteGroup();
        });
    }

    // Görünürlük değiştiğinde ikonu güncelle
    const groupVisibilitySelect = document.getElementById('groupVisibility');
    if (groupVisibilitySelect) {
        groupVisibilitySelect.addEventListener('change', function() {
            updateVisibilityIcon(this.value);
        });
    }

    // Admin girişi yapıldığında grup ayarlarını yükle
    if (isAuthenticated()) {
        loadGroupSettings();
    }
    
    // Modal dışına tıklandığında kapat
    const readyImagesModal = document.getElementById('readyImagesModal');
    if (readyImagesModal) {
        readyImagesModal.addEventListener('click', function(e) {
            if (e.target === readyImagesModal) {
                toggleReadyImagesModal();
            }
        });
    }
    
    // ESC tuşu ile modal'ı kapat
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('readyImagesModal');
            if (modal && modal.classList.contains('show')) {
                toggleReadyImagesModal();
            }
        }
    });
});