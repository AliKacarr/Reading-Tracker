
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

    // Fix for Turkey time zone - format date manually to avoid UTC conversion issues
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
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

// Add this function to format dates for the table header
function formatDateForHeader(date) {
  // Get day and month in Turkish
  const day = date.getDate();
  const month = getMonthNameInTurkish(date.getMonth());

  // Return formatted date: "4 Nisan"
  return `${day} ${month}`;
}

// Add this helper function to get month names in Turkish
function getMonthNameInTurkish(monthIndex) {
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return months[monthIndex];
}

// Then update the loadData function where it creates the table headers
async function loadData() {
  // Get dates for the current week offset
  const dates = getWeekDates(weekOffset);

  // Update the week display
  currentWeekDisplay.textContent = formatDateRange(dates);

  // Show/hide "Bu Hafta" buttons based on weekOffset
  if (weekOffset < 0) {
    // We're in a previous week, show the right "Bu Hafta" button
    prevWeekTodayBtn.style.display = 'none';
    nextWeekTodayBtn.style.display = 'flex';
  } else if (weekOffset > 0) {
    // We're in a future week, show the left "Bu Hafta" button
    prevWeekTodayBtn.style.display = 'flex';
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

  let theadHTML = `<tr><th>Kullanıcılar</th>`;

  // Get today's date in YYYY-MM-DD format for comparison
  const today = new Date();
  today.setHours(today.getHours() + 3); // Adjust for Turkey time zone
  const todayString = today.toISOString().split('T')[0];

  for (let d of dates) {
    // Get the day of week in Turkish
    const date = new Date(d);
    const dayOfWeek = getDayOfWeekInTurkish(date);

    // Format the date using our new function instead of showing the raw date
    const formattedDate = formatDateForHeader(date);

    // Check if this column is today
    const isToday = d === todayString;
    const todayClass = isToday ? 'today-column' : '';

    // Format the header with formatted date and day of week, add today class if needed
    theadHTML += `<th class="${todayClass}"><span class="date-text">${formattedDate}</span><br><span class="day-of-week">${dayOfWeek}</span></th>`;
  }
  theadHTML += `<th><img src="/images/red-arrow.png" alt="Streak" width="20" height="20"> Seri</th></tr>`;
  table.querySelector('thead').innerHTML = theadHTML;

  // Update the user list rendering in loadData function
  let tbodyHTML = '';
  deleteList.innerHTML = ''; // Silme butonlarını temizle

  // Check if user is authenticated for interactive elements
  const isUserAuthenticated = isAuthenticated();

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
          className = 'pink';
        } else if (streakLength === 2) {
          className = 'lila';
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
          <button class="save-name-button" onclick="saveUserName('${user._id}')" alt="Onayla" title="İsmi Onayla" style="display:none; display:flex justify-content:center;">✔</button>
        </div>
        <div class="user-actions">
          <button class="settings-button" onclick="toggleDeleteButton('${user._id}')">⚙️</button>
          <button class="delete-button" style="display:none;" onclick="deleteUser('${user._id}')">
            <img src="/images/user-delete.png" alt="Kullanıcıyı Sil" title="Kullanıcıyı Sil" width="13" height="15">
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
        userStats[dates[i + 1]] !== 'okumadım' ||
        !areDatesConsecutive(currentDate, dates[i + 1])) {

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

function calculateStreak(userStats) {
  // Tüm tarihleri al ve sıralı diziye çevir
  const allDates = Object.keys(userStats).sort();
  if (allDates.length === 0) return 0;

  // Bugünün tarihini al (Türkiye saatine göre)
  const today = new Date();
  today.setHours(today.getHours() + 3); // Türkiye saatine ayarla
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayKey = `${year}-${month}-${day}`;

  // Bugünün statüsünü kontrol et
  const todayStatus = userStats[todayKey];

  let streak = 0;
  let currentDate;

  if (todayStatus === 'okudum') {
    // Bugün okudum ise bugünden başla
    currentDate = todayKey;
  } else if (todayStatus === 'okumadım') {
    // Bugün okumadım ise streak sıfır
    return 0;
  } else {
    // Bugün işaretlenmemişse dünden başla
    const d = new Date(todayKey);
    d.setDate(d.getDate() - 1);
    const prevYear = d.getFullYear();
    const prevMonth = String(d.getMonth() + 1).padStart(2, '0');
    const prevDay = String(d.getDate()).padStart(2, '0');
    currentDate = `${prevYear}-${prevMonth}-${prevDay}`;
  }

  // Geriye doğru "okudum" serisini say
  while (true) {
    if (userStats[currentDate] === 'okudum') {
      streak++;
      // Bir önceki günü bul
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      const prevYear = d.getFullYear();
      const prevMonth = String(d.getMonth() + 1).padStart(2, '0');
      const prevDay = String(d.getDate()).padStart(2, '0');
      currentDate = `${prevYear}-${prevMonth}-${prevDay}`;
    } else {
      break;
    }
  }

  return streak;
}

async function toggleStatus(userId, date) {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    logUnauthorizedAccess('toggle-status');
    return;
  }

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
  // Update the chart after changing a cell status
  loadReadingStats();
}

async function deleteUser(id) {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    logUnauthorizedAccess('delete-user');
    return;
  }

  // Find the user name for the confirmation message
  const userElement = document.querySelector(`li[data-user-id="${id}"]`);
  const userName = userElement ? userElement.querySelector('.user-name').textContent : 'this user';

  // Ask for confirmation before deleting
  const confirmed = confirm(`Silmek istediğine emin misin: ->  ${userName}  <- Bu işlem geri alınamaz.`);

  if (confirmed) {
    await fetch('/api/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });

    loadData();
    loadReadingStats();
    showSuccessMessage('Kullanıcı başarıyla silindi!');
  }
}

// Helper function to get day of week in Turkish
function getDayOfWeekInTurkish(date) {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return days[date.getDay()];
}

// Yeni kullanıcı ekleme - resim yükleme ile birlikte
newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Check if user is authenticated
  if (!isAuthenticated()) {
    logUnauthorizedAccess('add-user');
    return;
  }

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
  fileNameDisplay.textContent = 'Resim seçilmedi';
  fileInputLabel.textContent = 'Resim Seç';
  loadData();
  loadReadingStats();
  showSuccessMessage('Kullanıcı başarıyla eklendi!');
});
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
// File input display handler
const profileImageInput = document.getElementById('profileImage');
const fileNameDisplay = document.getElementById('file-name');
const fileInputLabel = document.getElementById('file-input-label');

if (profileImageInput && fileNameDisplay) {
  profileImageInput.addEventListener('change', function () {
    if (this.files.length > 0) {
      fileNameDisplay.textContent = this.files[0].name;
      fileInputLabel.textContent = "Değiştir"; // Change button text to "Değiştir" when a file is selected
    } else {
      fileNameDisplay.textContent = 'Resim seçilmedi';
      fileInputLabel.textContent = "Resim Seç";
    }
  });
}

// Initialize the app
// Add this function to check if the user is authenticated
function isAuthenticated() {
  return localStorage.getItem('authenticated') === 'true';
}

async function verifyAdminUsername() {
  const username = localStorage.getItem('adminUsername');

  if (!username) return false;

  try {
    const response = await fetch('/api/verify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json();
    if (!data.valid) {
      // Admin username no longer exists in database, clear authentication
      localStorage.removeItem('authenticated');
      localStorage.removeItem('adminUsername');

      // Hide admin elements
      const adminIndicator = document.querySelector('.admin-indicator');
      const adminLogsButton = document.getElementById('adminLogsButton');
      const loginLogsButton = document.getElementById('loginLogsButton');
      const mainArea = document.querySelector('.main-area');

      if (adminIndicator) adminIndicator.style.display = 'none';
      if (adminLogsButton) adminLogsButton.style.display = 'none';
      if (loginLogsButton) loginLogsButton.style.display = 'none';
      if (mainArea) mainArea.style.display = 'none';

      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying admin username:', error);
    return false;
  }
}

// Uncomment the authentication line in the DOMContentLoaded event
document.addEventListener('DOMContentLoaded', function () {
  // Check if there's a saved preference in local storage
  const savedFirstDay = localStorage.getItem('preferredFirstDay');

  if (firstDaySelect) {
    if (savedFirstDay !== null) {
      // Use the saved preference from localStorage
      firstDayOfWeek = parseInt(savedFirstDay);
      // Update the combobox to match the saved preference
      firstDaySelect.value = savedFirstDay;
    } else {
      // No saved preference, use the default from the combobox
      firstDayOfWeek = parseInt(firstDaySelect.value);
    }

    // Add event listener for combobox changes
    firstDaySelect.addEventListener('change', function () {
      // Parse the selected value to an integer
      firstDayOfWeek = parseInt(this.value);
      // Save the selection to local storage
      localStorage.setItem('preferredFirstDay', this.value);
      // Uncomment this line to enable authentication
      // Reset week offset to ensure we're showing the current week with the new first day
      weekOffset = 0;
      // Reload the data with the new first day setting
      loadData();
    });
  }

  // Load data with the initial first day setting
  loadData();
  fetchRandomAyet();
  fetchRandomQuote();
  fetchRandomHadis();
  fetchRandomDua();
});

// Add these new functions for user management

// Toggle delete button visibility
function toggleDeleteButton(userId) {
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

// Edit user name
function editUserName(userId) {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    logUnauthorizedAccess('edit-user-name');
    return;
  }

  const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
  const nameSpan = userItem.querySelector('.user-name');
  const nameInput = userItem.querySelector('.edit-name-input');
  const saveButton = userItem.querySelector('.save-name-button');

  // Hide name span, show input and save button
  nameSpan.style.display = 'none';
  nameInput.style.display = 'inline-block';
  saveButton.style.display = 'inline-block';

}

// Save user name
async function saveUserName(userId) {
  // Check if user is authenticated
  if (!isAuthenticated()) {
    logUnauthorizedAccess('save-user-name');
    return;
  }

  const userItem = document.querySelector(`li[data-user-id="${userId}"]`);
  const nameSpan = userItem.querySelector('.user-name');
  const nameInput = userItem.querySelector('.edit-name-input');
  const saveButton = userItem.querySelector('.save-name-button');

  const newName = nameInput.value.trim();
  if (!newName) return; // Don't save empty names

  // Hide input and save button, show name span
  nameSpan.style.display = 'inline-block';
  nameInput.style.display = 'none';
  saveButton.style.display = 'none';

  // Update the user name in the database
  await fetch('/api/update-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name: newName })
  });


  // Reload data to update all views
  loadData();
  // Update the chart after changing a user's name
  loadReadingStats();
}

// Change user profile image
function changeUserImage(userId) {
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
      await fetch('/api/update-user-image', {
        method: 'POST',
        body: formData
      });

      // Remove the temporary file input
      document.body.removeChild(fileInput);

      // Reload data to update all views
      loadData();
      // Update the chart after changing a user's profile image
      loadReadingStats();
    }
  });
}

// Add this function to fetch a random quote
async function fetchRandomQuote() {
  try {
    const quoteTextElement = document.getElementById('quoteText');
    if (quoteTextElement) {
      // Show loading state

      const response = await fetch('/api/random-quote');
      const data = await response.json();

      // Update with the new quote
      quoteTextElement.innerHTML = data.sentence;
    }
  } catch (error) {
    console.error('Error fetching quote:', error);
    const quoteTextElement = document.getElementById('quoteText');
    if (quoteTextElement) {
      quoteTextElement.innerHTML = 'Günün sözü yüklenemedi.';
    }
  }
}
// Add this function to your script.js file
async function loadReadingStats() {
  try {
    // Fetch the reading statistics from the server
    const response = await fetch('/api/reading-stats');
    const userStats = await response.json();

    // Get all stats to calculate "okumadım" counts
    const allDataResponse = await fetch('/api/all-data');
    const allData = await allDataResponse.json();

    // Create a map of all dates with status for each user
    const userDatesMap = {};

    // Initialize the map for each user
    for (const user of allData.users) {
      userDatesMap[user._id] = {};
    }

    // Fill in the map with actual statuses
    for (const stat of allData.stats) {
      if (!userDatesMap[stat.userId]) {
        userDatesMap[stat.userId] = {};
      }
      userDatesMap[stat.userId][stat.date] = stat.status;
    }

    // Calculate "okumadım" counts for each user
    const enhancedUserStats = userStats.map(user => {
      const userStatuses = userDatesMap[user.userId] || {};
      const okumadimCount = Object.values(userStatuses).filter(status => status === 'okumadım').length;

      return {
        ...user,
        okumadim: okumadimCount
      };
    });

    // Get the canvas element
    const ctx = document.getElementById('readingStatsChart');

    // Check if the canvas exists
    if (!ctx) {
      console.error('Chart canvas element not found');
      return;
    }

    // Prepare data for the chart
    const labels = enhancedUserStats.map(user => user.name);
    const okudumData = enhancedUserStats.map(user => user.okudum);
    const okumadimData = enhancedUserStats.map(user => user.okumadim);

    // Calculate success rates
    const successRates = enhancedUserStats.map(user => {
      const total = user.okudum + user.okumadim;
      return total > 0 ? Math.round((user.okudum / total) * 100) : 0;
    });

    // Find the highest success rate
    const highestSuccessRate = Math.max(...successRates);

    // Create background colors array based on success rates
    const okudumBackgroundColors = enhancedUserStats.map((user, index) => {
      // If this user has the highest success rate, highlight with a more vibrant color
      return successRates[index] === highestSuccessRate
        ? 'rgba(76, 217, 99, 0.95)' // Brighter green for highest success rate
        : 'rgba(68, 206, 91, 0.79)'; // Regular green for others
    });

    // Create border colors array based on success rates
    const okudumBorderColors = enhancedUserStats.map((user, index) => {
      // If this user has the highest success rate, highlight with a thicker border
      return successRates[index] === highestSuccessRate
        ? 'rgba(50, 180, 80, 1)' // Darker green border for highest success rate
        : 'rgba(76, 217, 100, 1)'; // Regular green border for others
    });

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }

    // Check if there's an existing chart instance
    if (window.readingStatsChart instanceof Chart) {
      window.readingStatsChart.destroy();
    }

    // Create the chart
    window.readingStatsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Okudum',
            data: okudumData,
            backgroundColor: okudumBackgroundColors,
            borderColor: okudumBorderColors,
            borderWidth: enhancedUserStats.map((user, index) =>
              successRates[index] === highestSuccessRate ? 2 : 1
            ),
            hoverBackgroundColor: 'rgba(63, 194, 63, 0.9)'
          },
          {
            label: 'Okumadım',
            data: okumadimData,
            backgroundColor: 'rgba(255, 100, 60, 0.7)',
            borderColor: 'rgba(255, 100, 60, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,    // üstten boşluk (px)
            bottom: 10,  // alttan boşluk (px)
            left: 10,   // soldan boşluk (px)
            right: 10   // sağdan boşluk (px)
          }
        },
        scales: {
          x: {
            stacked: true,
            title: {
              display: true,
              text: 'Kullanıcılar',
              color: '#000000',
              font: {
                weight: 'bold',
                size: 15 // Yazı boyutunu artırdık
              }
            },
            ticks: {
              color: '#000000',
              font: {
                size: 16
              }
            },
            grid: {
              display: false
            }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Gün Sayısı',
              color: '#000000',
              font: {
                weight: 'bold',
                size: 15 // Yazı boyutunu artırdık
              }
            },
            ticks: {
              color: '#000000',
              font: {
                size: 13 // Kullanıcı isimlerinin yazı boyutu artırıldı
              }
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              afterBody: function (context) {
                const index = context[0].dataIndex;
                return `Başarı Oranı: %${successRates[index]}`;
              }
            },
            titleColor: '#000000',
            bodyColor: '#000000',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1
          },
          legend: {
            position: 'top',
            labels: {
              color: '#000000',
              font: {
                weight: 'bold',
                size: 14
              }
            }
          },
          datalabels: {
            display: function (context) {
              // Only show for the first dataset (Okudum)
              return context.datasetIndex === 0;
            },
            formatter: function (value, context) {
              const index = context.dataIndex;
              const successRate = successRates[index];
              const isHighest = successRate === highestSuccessRate;
              const isLowest = successRate === Math.min(...successRates);

              // Add crown emoji for users with the highest success rate
              // Add alert emoji for users with the lowest success rate
              if (isHighest) {
                return `👑 %${successRate}`;
              } else if (isLowest) {
                return `💀 %${successRate}`;
              } else {
                return `%${successRate}`;
              }
            },
            align: 'start',        // Align at the end of the bar
            anchor: 'end',
            offset: 0,             // Position above the bar
            rotation: 0,           // Ensure text is horizontal
            color: '#000000',
            backgroundColor: 'rgba(255, 244, 244, 0.9)', // More opaque background
            borderColor: 'rgba(0, 0, 0, 0.2)',
            borderWidth: 1.2,
            borderRadius: 4,
            font: {
              weight: 'bold',
              size: 15 // Set a fixed larger font size for all labels
            },
            padding: {
              top: 4,
              bottom: 4,
              left: 6,
              right: 6
            },
            z: 100
          }
        }
      },
      plugins: [ChartDataLabels] // Add the ChartDataLabels plugin
    });
  } catch (error) {
    console.error('Error loading reading stats:', error);
  }
}

// Add this to your document.addEventListener('DOMContentLoaded', function() {...})
document.addEventListener('DOMContentLoaded', function () {
  // Your existing code...

  // Add Chart.js and ChartDataLabels plugin to the page
  const chartScript = document.createElement('script');
  chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';

  // Load Chart.js first, then the DataLabels plugin
  chartScript.onload = function () {
    const dataLabelsScript = document.createElement('script');
    dataLabelsScript.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0';

    // After both scripts are loaded, initialize the chart
    dataLabelsScript.onload = function () {
      // Make the ChartDataLabels plugin available globally
      window.ChartDataLabels = window.ChartDataLabels;

      // Load the chart after all dependencies are loaded
      setTimeout(loadReadingStats, 100);
    };

    document.head.appendChild(dataLabelsScript);
  };

  document.head.appendChild(chartScript);

  // Add the chart container to the page if it doesn't exist
  if (!document.getElementById('readingStatsChart')) {
    const statsSection = document.createElement('div');
    statsSection.className = 'stats-section';
    statsSection.innerHTML = `
      <h3>📊 Okuma İstatistikleri</h3>
      <div class="chart-container">
        <canvas id="readingStatsChart"></canvas>
      </div>
    `;

    // Insert before the settings section
    const settingsSection = document.querySelector('.settings-section');
    if (settingsSection) {
      settingsSection.parentNode.insertBefore(statsSection, settingsSection);
    } else {
      // If settings section doesn't exist, append to container
      document.querySelector('.container').appendChild(statsSection);
    }
  }
});
// Admin Login Functionality
document.addEventListener('DOMContentLoaded', function () {
  const adminLogin = document.getElementById('adminLogin');
  const adminLoginModal = document.getElementById('adminLoginModal');
  const closeButton = document.querySelector('.close-button');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const loginError = document.getElementById('loginError');
  const adminUsername = document.getElementById('adminUsername');
  const adminPassword = document.getElementById('adminPassword');

  // Check if already authenticated
  if (localStorage.getItem('authenticated') === 'true') {
    showAdminIndicator();
  }

  adminLogin.addEventListener('click', function () {
    // Check if already authenticated
    if (localStorage.getItem('authenticated') === 'true') {
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
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('authenticated', 'true');
        localStorage.setItem('adminUsername', username);
        adminLoginModal.style.display = 'none';
        loginError.textContent = '';

        // Clear form fields
        adminLoginForm.reset();

        // Show admin indicator
        showAdminIndicator();

        // Reload data to update UI with admin privileges
        loadData();
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
  // Function to show admin info panel
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
    adminInfoModal.className = 'modal';

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content admin';

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
      adminInfoModal.style.display = 'none';

      // Remove admin indicator
      const adminIndicator = document.querySelector('.admin-indicator');
      const adminLogsButton = document.getElementById('adminLogsButton'); // Add this line to get the admin logs butto
      const loginLogsButton = document.getElementById('loginLogsButton');
      const mainArea = document.querySelector('.main-area');

      if (adminIndicator) {
        adminIndicator.style.display = 'none';
        adminLogsButton.style.display = 'none';
        loginLogsButton.style.display = 'none';
        mainArea.style.display = 'none';
      }
      // Reload data to update UI without admin privileges
      loadData();
    };

    infoPanel.appendChild(usernameItem);
    infoPanel.appendChild(logoutBtn);

    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(infoPanel);

    adminInfoModal.appendChild(modalContent);
    document.body.appendChild(adminInfoModal);

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
      if (event.target === adminInfoModal) {
        adminInfoModal.style.display = 'none';
      }
    });
  }
  adminInfoModal.style.display = 'flex';
}
async function logUnauthorizedAccess(action) {
  const allowedActions = ['cookies-decline-1', 'cookies-decline-2'];
  if (!allowedActions.includes(action) && localStorage.getItem('cookieConsent') !== 'accepted') {
    return;
  }

  try {
    // Collect device information
    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };


    // Send log to server
    await fetch('/api/log-unauthorized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, deviceInfo })
    });
  } catch (error) {
    console.error('Error logging unauthorized access:', error);
    logUnauthorizedAccess('error');
  }
}
// Add this script to handle the admin logs button
document.addEventListener('DOMContentLoaded', function () {
  if (localStorage.getItem('authenticated') === 'true') {
    verifyAdminUsername();
  }
  logPageVisit();
  const adminIndicator = document.querySelector('.admin-indicator');
  const adminLogsButton = document.getElementById('adminLogsButton');
  const loginLogsButton = document.getElementById('loginLogsButton');
  const mainArea = document.querySelector('.main-area');

  // Check if user is authenticated as admin
  function checkAdminAuth() {
    if (localStorage.getItem('authenticated') === 'true') {
      if (adminIndicator) adminIndicator.style.display = 'flex';
      if (adminLogsButton) adminLogsButton.style.display = 'flex';
      if (loginLogsButton) loginLogsButton.style.display = 'flex';
      if (mainArea) mainArea.style.display = 'flex';
    } else {
      if (adminIndicator) adminIndicator.style.display = 'none';
      if (adminLogsButton) adminLogsButton.style.display = 'none';
      if (loginLogsButton) loginLogsButton.style.display = 'none';
      if (mainArea) mainArea.style.display = 'none';
    }
  }

  // Check auth status when page loads
  checkAdminAuth();

  // Add click event to the button
  adminLogsButton.addEventListener('click', function () {
    window.location.href = '/admin-logs.html';
  });

  if (loginLogsButton) {
    loginLogsButton.addEventListener('click', function () {
      // Navigate to login logs page
      window.location.href = '/login-logs.html';
    });
  }

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
document.addEventListener('DOMContentLoaded', function () {
  // Add CSS rules for table cells
  const style = document.createElement('style');
  style.textContent = `
    #trackerTable td {
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
  `;
  document.head.appendChild(style);

  // Prevent default behavior on cell content
  document.addEventListener('mousedown', function (e) {
    if (e.target.tagName === 'TD' && (e.target.innerText === '✔️' || e.target.innerText === '❌' || e.target.innerText === '➖')) {
      e.preventDefault();
    }
  });
});

// Add this function to log page visits
async function logPageVisit() {
  if (localStorage.getItem('cookieConsent') !== 'accepted') {
    return;
  }
  try {
    // Collect device information
    const deviceInfo = {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
    };

    // Send log to server
    await fetch('/api/log-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceInfo })
    });
  } catch (error) {
    console.error('Error logging page visit:', error);
  }
}

// Update the showAdminIndicator function to also show the login logs button
function showAdminIndicator() {
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

  // Show the admin logs button
  const adminLogsButton = document.getElementById('adminLogsButton');
  if (adminLogsButton) {
    adminLogsButton.style.display = 'flex';
  }

  // Show the login logs button
  const loginLogsButton = document.getElementById('loginLogsButton');
  if (loginLogsButton) {
    loginLogsButton.style.display = 'flex';
  }

  const mainArea = document.querySelector('.main-area');
  if (mainArea) {
    mainArea.style.display = 'flex';
  }

}
// Add this at the beginning of your script.js file, before any other code

// Cookie consent functionality
// Cookie consent functionality
document.addEventListener('DOMContentLoaded', function () {
  const cookieConsentBanner = document.getElementById('cookieConsentBanner');
  const acceptCookiesBtn = document.getElementById('acceptCookies');
  const declineCookiesBtn = document.getElementById('declineCookies');

  let declineAttempts = 0;

  // Check if we need to show the cookie banner
  function checkCookieConsent() {
    const cookieConsent = localStorage.getItem('cookieConsent');
    const cookieConsentDate = localStorage.getItem('cookieConsentDate');

    // If no consent data exists, show the banner
    if (!cookieConsent) {
      showCookieBanner();
      return;
    }

    // If user accepted, we never ask again
    if (cookieConsent === 'accepted') {
      return;
    }

    // If user declined and it's been more than a week, show the banner again
    if (cookieConsent === 'declined') {
      const consentDate = new Date(cookieConsentDate);

      // Get current date with Turkey timezone adjustment (+3 hours)
      const currentDate = new Date();
      currentDate.setHours(currentDate.getHours() + 3);

      const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (currentDate - consentDate > oneWeek) {
        // It's been more than a week since declining, ask again
        localStorage.removeItem('cookieConsent');
        localStorage.removeItem('cookieConsentDate');
        declineAttempts = 0;
        showCookieBanner();
      }
    }
  }

  function showCookieBanner() {
    cookieConsentBanner.style.display = 'block';
  }

  // Handle accept button click
  acceptCookiesBtn.addEventListener('click', function () {
    localStorage.setItem('cookieConsent', 'accepted');

    // Store date with Turkey timezone adjustment (+3 hours)
    const date = new Date();
    date.setHours(date.getHours() + 3);
    localStorage.setItem('cookieConsentDate', date.toISOString());

    cookieConsentBanner.style.display = 'none';

    logPageVisit();
  });

  // Handle decline button click
  declineCookiesBtn.addEventListener('click', function () {
    // Save decline status to localStorage
    localStorage.setItem('cookieConsent', 'declined');

    // Store date with Turkey timezone adjustment (+3 hours) 
    const date = new Date();
    date.setHours(date.getHours() + 3);
    localStorage.setItem('cookieConsentDate', date.toISOString());

    // Close the banner
    cookieConsentBanner.style.display = 'none';

  });

  // Check cookie consent when the page loads
  checkCookieConsent();
});

async function showRandomQuoteImage() {
  const img = document.getElementById('quoteImage');
  if (!img) return;

  try {
    const response = await fetch('/api/quote-images');
    const data = await response.json();
    const images = data.images;
    if (!images || images.length === 0) {
      img.style.display = 'none';
      return;
    }
    const randomIndex = Math.floor(Math.random() * images.length);
    img.src = `quotes/${images[randomIndex]}`;
    img.style.display = 'block';
  } catch (error) {
    img.style.display = 'none';
    console.error('Error loading quote image:', error);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  showRandomQuoteImage();

  const refreshBtn = document.getElementById('refreshQuote');
  if (refreshBtn) {
    refreshBtn.onclick = function () {
      fetchRandomQuote();
      logUnauthorizedAccess('refresh-RandomQuote');
      this.classList.add('spinning');
      setTimeout(() => {
        this.classList.remove('spinning');
      }, 1000);
    };
  }

  const refreshImageBtn = document.getElementById('refreshQuoteImage');
  if (refreshImageBtn) {
    refreshImageBtn.onclick = function () {
      showRandomQuoteImage();
      this.classList.add('spinning');
      setTimeout(() => {
        this.classList.remove('spinning');
      }, 1000);
    };
  }

  const refreshAyatButton = document.getElementById('refreshAyat');
  if (refreshAyatButton) {
    refreshAyatButton.onclick = function () {
      fetchRandomAyet();
      this.classList.add('spinning');
      setTimeout(() => {
        this.classList.remove('spinning');
      }, 1000);
    };
  }

  const refreshHadithButton = document.getElementById('refreshHadith');
  if (refreshHadithButton) {
    refreshHadithButton.onclick = function () {
      fetchRandomHadis();
      this.classList.add('spinning');
      setTimeout(() => {
        this.classList.remove('spinning');
      }, 1000);
    };
  }

  const refreshDuaButton = document.getElementById('refreshDua');
  if (refreshDuaButton) {
    refreshDuaButton.onclick = function () {
      fetchRandomDua();
      this.classList.add('spinning');
      setTimeout(() => {
        this.classList.remove('spinning');
      }, 1000);
    };
  }
});

async function fetchRandomAyet() {
  try {
    const response = await fetch('/api/random-ayet');
    if (!response.ok) {
      throw new Error('Ayet getirme hatası');
    }
    const data = await response.json();

    // Ayet metnini sayfada göster
    const ayatTextElement = document.getElementById('ayatText');
    if (ayatTextElement) {
      ayatTextElement.innerHTML = data.sentence || 'Ayet yüklenemedi';
    }
  } catch (error) {
    console.error('Ayet getirme hatası:', error);
    const ayatTextElement = document.getElementById('ayatText');
    if (ayatTextElement) {
      ayatTextElement.innerHTML = 'Ayet yüklenemedi';
    }
  }
}

// Rastgele hadis getirme fonksiyonu
async function fetchRandomHadis() {
  try {
    const response = await fetch('/api/random-hadis');
    if (!response.ok) {
      throw new Error('Hadis getirme hatası');
    }
    const data = await response.json();

    // Hadis metnini sayfada göster
    const hadithTextElement = document.getElementById('hadithText');
    if (hadithTextElement) {
      hadithTextElement.innerHTML = data.sentence || 'Hadis yüklenemedi';
    }
  } catch (error) {
    console.error('Hadis getirme hatası:', error);
    const hadithTextElement = document.getElementById('hadithText');
    if (hadithTextElement) {
      hadithTextElement.innerHTML = 'Hadis yüklenemedi';
    }
  }
}

async function fetchRandomDua() {
  try {
    const response = await fetch('/api/random-dua');
    if (!response.ok) {
      throw new Error('Dua getirme hatası');
    }
    const data = await response.json();

    // Dua metnini sayfada göster
    const duaTextElement = document.getElementById('duaText');
    if (duaTextElement) {
      duaTextElement.innerHTML = data.sentence || 'Dua yüklenemedi';
    }
  } catch (error) {
    console.error('Dua getirme hatası:', error);
    const duaTextElement = document.getElementById('duaText');
    if (duaTextElement) {
      duaTextElement.innerHTML = 'Dua yüklenemedi';
    }
  }
}