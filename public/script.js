const table = document.getElementById('trackerTable');
const deleteList = document.getElementById('deleteList');
const newUserForm = document.getElementById('newUserForm');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const prevWeekTodayBtn = document.getElementById('prevWeekToday');
const nextWeekTodayBtn = document.getElementById('nextWeekToday');
const currentWeekDisplay = document.getElementById('currentWeekDisplay');
const firstDaySelect = document.getElementById('firstDaySelect');

// Track the current week offset (0 = current week)
let weekOffset = 0;
// Default first day of the week (3 = Wednesday)
let firstDayOfWeek = 3;

// Initialize the date range for the current week
function getWeekDates(offset = 0) {
  // Get today's date with Turkey time zone adjustment (+3 hours)
  const today = new Date();
  today.setHours(today.getHours()); // Adjust for Turkey time zone
  
  // Find the most recent selected day of week (or today if it's the selected day)
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate days to go back to reach the first day of the week
  let daysToFirstDay;
  if (dayOfWeek >= firstDayOfWeek) {
    daysToFirstDay = dayOfWeek - firstDayOfWeek;
  } else {
    daysToFirstDay = 7 - (firstDayOfWeek - dayOfWeek);
  }
  
  // Set the date to the first day of the week
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - daysToFirstDay);
  
  // Apply the week offset
  currentWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
  
  // Create an array of 7 days starting from the first day
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentWeekStart);
    d.setDate(currentWeekStart.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  
  return dates;
}

// Format date range for display (e.g., "2 - 8 Nisan")
function formatDateRange(dates) {
  if (!dates || dates.length < 7) return '';
  
  const startDate = new Date(dates[0]);
  const endDate = new Date(dates[6]);
  
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = months[startDate.getMonth()];
  const endMonth = months[endDate.getMonth()];
  
  // If same month, don't repeat the month name
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${startMonth}`;
  } else {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
  }
}

async function loadData() {
  // Get dates for the current week offset
  const dates = getWeekDates(weekOffset);
  
  // Update the week display
  currentWeekDisplay.textContent = formatDateRange(dates);
  
  // Show/hide "Bu Hafta" buttons based on weekOffset
  if (weekOffset < 0) {
    // We're in a previous week, show the right "Bu Hafta" button
    prevWeekTodayBtn.style.display = 'none';
    nextWeekTodayBtn.style.display = 'block';
  } else if (weekOffset > 0) {
    // We're in a future week, show the left "Bu Hafta" button
    prevWeekTodayBtn.style.display = 'block';
    nextWeekTodayBtn.style.display = 'none';
  } else {
    // We're in the current week, hide both "Bu Hafta" buttons
    prevWeekTodayBtn.style.display = 'none';
    nextWeekTodayBtn.style.display = 'none';
  }
  
  // Fetch ALL user data to check for consecutive streaks across weeks
  const res = await fetch(`/api/all-data`);
  const { users, stats } = await res.json();

  const statMap = {};
  for (let s of stats) {
    if (!statMap[s.userId]) statMap[s.userId] = {};
    statMap[s.userId][s.date] = s.status;
  }

  // Create a map of consecutive "okumadım" streaks for each user
  const streakMap = {};
  for (let user of users) {
    streakMap[user._id] = findConsecutiveStreaks(statMap[user._id] || {});
  }

  let theadHTML = `<tr><th>İsim</th>`;
  
  // Get today's date in YYYY-MM-DD format for comparison
  const today = new Date();
  today.setHours(today.getHours() + 3); // Adjust for Turkey time zone
  const todayString = today.toISOString().split('T')[0];
  
  for (let d of dates) {
    // Get the day of week in Turkish
    const date = new Date(d);
    const dayOfWeek = getDayOfWeekInTurkish(date);
    
    // Check if this column is today
    const isToday = d === todayString;
    const todayClass = isToday ? 'today-column' : '';
    
    // Format the header with date and day of week, add today class if needed
    theadHTML += `<th class="${todayClass}"><span class="date-text">${d}</span><br><span class="day-of-week">${dayOfWeek}</span></th>`;
  }
  theadHTML += `<th><img src="/images/red-arrow.png" alt="Seri" width="20" height="20"> Seri</th></tr>`;
  table.querySelector('thead').innerHTML = theadHTML;

  // Update the user list rendering in loadData function
  let tbodyHTML = '';
  deleteList.innerHTML = ''; // Silme butonlarını temizle
  
  for (let user of users) {
    const userStats = statMap[user._id] || {};
    const userStreaks = streakMap[user._id] || {};
    
    let row = `<tr><td class="user-item">`;
    
    // Profil resmi ekle - varsayılan resim olarak default.png kullan
    const profileImage = user.profileImage ? `/images/${user.profileImage}` : '/images/default.png';
    row += `<img src="${profileImage}" alt="${user.name}" class="profile-image" />`;
    row += `${user.name}</td>`;
  
    // For each date in the current view, determine the cell class based on streak data
    for (let date of dates) {
      const status = userStats[date] || '';
      let symbol = '➖';
      if (status === 'okudum') symbol = '✔️';
      else if (status === 'okumadım') symbol = '❌';
  
      // Determine cell class based on streak information
      let className = '';
      if (status === 'okudum') {
        className = 'green';
      } else if (status === 'okumadım') {
        // Check if this date is part of a streak and what length
        const streakLength = userStreaks[date] || 0;
        if (streakLength === 1) {
          className = 'yellow';
        } else if (streakLength === 2) {
          className = 'orange';
        } else if (streakLength >= 3) {
          className = 'red';
        }
      }
      
      // Add today-column class if this is today's column
      if (date === todayString) {
        className += ' today-column';
      }
  
      row += `<td class="${className}" onclick="toggleStatus('${user._id}', '${date}')">${symbol}</td>`;
    }
  
    const streak = calculateStreak(userStats);
    row += `<td>${streak > 0 ? `<span class="fire-emoji">🔥</span> ${streak}` : '-'}</td>`;
    row += `</tr>`;
    tbodyHTML += row;
  
    // Silme butonunu dış listeye ekle - profil resmi ile birlikte
    const userProfileImage = user.profileImage ? `/images/${user.profileImage}` : '/images/default.png';
    // Update the user list rendering in loadData function to use an image for the delete button
    deleteList.innerHTML += `
      <li data-user-id="${user._id}">
        <div class="user-item">
          <img src="${userProfileImage}" alt="${user.name}" class="profile-image user-profile-image" onclick="changeUserImage('${user._id}')"/>
          <span class="user-name" onclick="editUserName('${user._id}')">${user.name}</span>
          <input type="text" class="edit-name-input" value="${user.name}" style="display:none;">
          <button class="save-name-button" onclick="saveUserName('${user._id}')" style="display:none;">✔️</button>
        </div>
        <div class="user-actions">
          <button class="settings-button" onclick="toggleDeleteButton('${user._id}')">⚙️</button>
          <button class="delete-button" style="display:none;" onclick="deleteUser('${user._id}')">
            <img src="/images/user-delete.png" alt="Sil" width="16" height="16">
          </button>
        </div>
      </li>`;
  }

  table.querySelector('tbody').innerHTML = tbodyHTML;
}

// Function to find consecutive "okumadım" streaks for a user
function findConsecutiveStreaks(userStats) {
  // Get all dates from the user stats and sort them
  const dates = Object.keys(userStats).sort();
  if (dates.length === 0) return {};
  
  // Map to store streak length for each date
  const streakMap = {};
  
  // Find all streaks
  let currentStreak = 0;
  let streakDates = [];
  
  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i];
    
    // If this is an "okumadım" day
    if (userStats[currentDate] === 'okumadım') {
      currentStreak++;
      streakDates.push(currentDate);
      
      // If this is the last date or the next date breaks the streak
      if (i === dates.length - 1 || 
          userStats[dates[i+1]] !== 'okumadım' || 
          !areDatesConsecutive(currentDate, dates[i+1])) {
        
        // Record the streak length for each date in this streak
        for (let date of streakDates) {
          streakMap[date] = currentStreak;
        }
        
        // Reset for next streak
        currentStreak = 0;
        streakDates = [];
      }
    }
  }
  
  return streakMap;
}

// Helper function to check if two dates are consecutive
function areDatesConsecutive(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Set time to midnight to compare just the dates
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = d2 - d1;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  
  return diffDays === 1;
}

// Event listeners for week navigation
prevWeekBtn.addEventListener('click', () => {
  weekOffset--;
  loadData();
});

nextWeekBtn.addEventListener('click', () => {
  weekOffset++;
  loadData();
});

// Add event listeners for "Bu Hafta" buttons
prevWeekTodayBtn.addEventListener('click', () => {
  weekOffset = 0;
  loadData();
});

nextWeekTodayBtn.addEventListener('click', () => {
  weekOffset = 0;
  loadData();
});

// 🔥 Art arda okuma günlerini bugünden geriye hesaplar
function calculateStreak(userStats) {
  let streak = 0;
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (userStats[key] === 'okudum') streak++;
    else break;
  }
  return streak;
}

async function toggleStatus(userId, date) {
  const cell = event.target;
  const current = cell.innerText;
  let status;

  if (current === '✔️') status = 'okumadım';
  else if (current === '❌') status = '';
  else status = 'okudum';

  await fetch('/api/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, date, status })
  });

  loadData();
}

async function deleteUser(id) {
  await fetch('/api/delete-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  });

  loadData();
}

// Helper function to get day of week in Turkish
function getDayOfWeekInTurkish(date) {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[date.getDay()];
}

// Yeni kullanıcı ekleme - resim yükleme ile birlikte
newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = document.getElementById('newUserInput');
  const imageInput = document.getElementById('profileImage');
  const name = input.value.trim();
  
  if (!name) return;

  const formData = new FormData();
  formData.append('name', name);
  
  if (imageInput.files.length > 0) {
    formData.append('profileImage', imageInput.files[0]);
  }

  await fetch('/api/add-user', {
    method: 'POST',
    body: formData
  });

  input.value = '';
  imageInput.value = '';
  loadData();
});

// File input display handler
const profileImageInput = document.getElementById('profileImage');
const fileNameDisplay = document.getElementById('file-name');
const fileInputLabel = document.getElementById('file-input-label');

if (profileImageInput && fileNameDisplay) {
  profileImageInput.addEventListener('change', function() {
    if (this.files.length > 0) {
      fileNameDisplay.textContent = this.files[0].name;
      fileInputLabel.textContent = "Değiştir"; // Change button text to "Değiştir" when a file is selected
    } else {
      fileNameDisplay.textContent = 'Resim seçilmedi';
      fileInputLabel.textContent = "Resim Seç";
    }
  });
}

// Add event listener for first day of week selection
if (firstDaySelect) {
  firstDaySelect.addEventListener('change', function() {
    firstDayOfWeek = parseInt(this.value);
    loadData();
  });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Set default first day to Wednesday (value 3) instead of Monday
  if (firstDaySelect) {
    firstDaySelect.value = "3";
  }
  loadData();
});

// Add these new functions for user management

// Toggle delete button visibility
function toggleDeleteButton(userId) {
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

// Edit user name
function editUserName(userId) {
  const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
  const nameSpan = userItem.querySelector('.user-name');
  const nameInput = userItem.querySelector('.edit-name-input');
  const saveButton = userItem.querySelector('.save-name-button');
  
  // Hide name span, show input and save button
  nameSpan.style.display = 'none';
  nameInput.style.display = 'inline-block';
  saveButton.style.display = 'inline-block';
  
  // Focus the input
  nameInput.focus();
  nameInput.select();
}

// Save user name
async function saveUserName(userId) {
  const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
  const nameSpan = userItem.querySelector('.user-name');
  const nameInput = userItem.querySelector('.edit-name-input');
  const saveButton = userItem.querySelector('.save-name-button');
  
  const newName = nameInput.value.trim();
  if (!newName) return; // Don't save empty names
  
  // Update the user name in the database
  await fetch('/api/update-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name: newName })
  });
  
  // Hide input and save button, show name span
  nameSpan.style.display = 'inline-block';
  nameInput.style.display = 'none';
  saveButton.style.display = 'none';
  
  // Reload data to update all views
  loadData();
}

// Change user profile image
function changeUserImage(userId) {
  // Create a hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  // Trigger click on the file input
  fileInput.click();
  
  // Handle file selection
  fileInput.addEventListener('change', async function() {
    if (this.files.length > 0) {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('profileImage', this.files[0]);
      
      // Upload the new image
      await fetch('/api/update-user-image', {
        method: 'POST',
        body: formData
      });
      
      // Remove the temporary file input
      document.body.removeChild(fileInput);
      
      // Reload data to update all views
      loadData();
    }
  });
}
