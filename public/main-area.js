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

        await fetch(`/api/add-user/${currentGroupId}`, {
            method: 'POST',
            body: formData
        });

        input.value = '';
        imageInput.value = '';
        fileNameDisplay.textContent = 'Resim seçilmedi';
        fileInputLabel.textContent = 'Resim Seç';
        imagePreviewContainer.style.display = 'none';

        renderUserList();
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

            renderUserList();
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
    if (!newName) return; // Don't save empty names

    // Hide input and save button, show name span
    nameSpan.style.display = 'inline-block';
    nameInput.style.display = 'none';
    saveButton.style.display = 'none';

    // Update the user name in the database
    await fetch(`/api/update-user/${currentGroupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: newName })
    });

    renderUserList();
    loadTrackerTable();
    loadUserCards();
    loadReadingStats();
    renderLongestSeries();
    if (window.updateMonthlyCalendarUsers) window.updateMonthlyCalendarUsers();
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
    const saveButton = userItem.querySelector('.save-name-button');

    // Hide name span, show input and save button
    nameSpan.style.display = 'none';
    nameInput.style.display = 'inline-block';
    saveButton.style.display = 'inline-block';
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
            const formData = new FormData();
            formData.append('userId', userId);
            formData.append('profileImage', this.files[0]);

            // Upload the new image
            await fetch(`/api/update-user-image/${currentGroupId}`, {
                method: 'POST',
                body: formData
            });

            document.body.removeChild(fileInput);
            renderUserList();
            loadTrackerTable();
            loadUserCards();
            loadReadingStats();
            renderLongestSeries();
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


function resetImagePreview() {    // Resim önizleme kapatma fonksiyonu
    imagePreviewContainer.style.display = 'none';
    fileNameDisplay.textContent = 'Resim seçilmedi';
    fileInputLabel.textContent = 'Resim Seç';
    profileImageInput.value = ''; // Input değerini de temizle
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
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'flex';
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

    if (deleteButton.style.display === 'none') {
        deleteButton.style.display = 'inline-block';
        settingsButton.style.display = 'none';
    } else {
        settingsButton.style.display = 'inline-block';
        deleteButton.style.display = 'none';
    }
    editUserName(userId);
}

function renderUserList() {
    const userList = document.getElementById('userList');
    const prevScrollTop = userList.scrollTop; // scroll pozisyonunu koru
    fetch(`/api/users/${currentGroupId}`)
        .then(res => res.json())
        .then(data => {
            const users = data.users;
            // Sadece yeni elemanları ekle, eksikleri sil
            const existingIds = Array.from(userList.children).map(li => li.getAttribute('data-user-id'));
            const newIds = users.map(u => u._id);

            // Silinen kullanıcıları kaldır
            existingIds.forEach(id => {
                if (!newIds.includes(id)) {
                    const li = userList.querySelector(`li[data-user-id="${id}"]`);
                    if (li) userList.removeChild(li);
                }
            });

            // Güncelle veya ekle
            users.forEach(user => {
                let li = userList.querySelector(`li[data-user-id="${user._id}"]`);
                const userProfileImage = user.profileImage || '/images/default.png';
                const liHTML = `<div class="kullanıcı-item"><img src="${userProfileImage}" alt="${user.name}" class="profile-image user-profile-image" onclick="changeUserImage('${user._id}')"/><span class="profil-image-user-name" onclick="editUserName('${user._id}')">${user.name}</span><input type="text" class="edit-name-input" value="${user.name}" style="display:none;"><button class="save-name-button" onclick="saveUserName('${user._id}')" alt="Onayla" title="İsmi Onayla" style="display:none; justify-content:center;">✔</button></div><div class="user-actions"><button class="settings-button" onclick="toggleDeleteButton('${user._id}')">⚙️</button><button class="delete-button" style="display:none;" onclick="deleteUser('${user._id}')"><img src="/images/user-delete.png" alt="Kullanıcıyı Sil" title="Kullanıcıyı Sil" width="13" height="15"></button></div>`;
                if (li) {
                    li.innerHTML = liHTML;
                } else {
                    li = document.createElement('li');
                    li.setAttribute('data-user-id', user._id);
                    li.innerHTML = liHTML;
                    userList.appendChild(li);
                }
            });
            userList.scrollTop = prevScrollTop; // scroll pozisyonunu geri yükle
        });
}
