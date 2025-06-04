const trackerTable = document.getElementById('trackerTable');
const userList = document.getElementById('userList');
const newUserForm = document.getElementById('newUserForm');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const prevWeekTodayBtn = document.getElementById('prevWeekToday');
const nextWeekTodayBtn = document.getElementById('nextWeekToday');
const currentWeekDisplay = document.getElementById('currentWeekDisplay');
const firstDaySelect = document.getElementById('firstDaySelect');
let weekOffset = 0;
let isFirstLoad = true;

function getWeekDates(offset = 0) {
    const today = new Date();
    today.setHours(today.getHours());
    const dayOfWeek = today.getDay();
    let daysToFirstDay;
    if (dayOfWeek >= firstDayOfWeek) {
        daysToFirstDay = dayOfWeek - firstDayOfWeek;
    } else {
        daysToFirstDay = 7 - (firstDayOfWeek - dayOfWeek);
    }
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - daysToFirstDay);
    currentWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(currentWeekStart);
        d.setDate(currentWeekStart.getDate() + i);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push(`${year}-${month}-${day}`);
    }
    return dates;
}

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
    if (startMonth === endMonth) {
        return `${startDay} - ${endDay} ${startMonth}`;
    } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
}

function formatDateForHeader(date) {
    const day = date.getDate();
    const month = getMonthNameInTurkish(date.getMonth());
    return `<span class="date-day">${day}</span> <span class="date-month">${month}</span>`;
}

function getMonthNameInTurkish(monthIndex) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    return months[monthIndex];
}

async function loadTrackerTable() {
    const dates = getWeekDates(weekOffset);
    currentWeekDisplay.textContent = formatDateRange(dates);
    if (weekOffset < 0) {
        prevWeekTodayBtn.style.display = 'none';
        nextWeekTodayBtn.style.display = 'flex';
    } else if (weekOffset > 0) {
        prevWeekTodayBtn.style.display = 'flex';
        nextWeekTodayBtn.style.display = 'none';
    } else {
        prevWeekTodayBtn.style.display = 'none';
        nextWeekTodayBtn.style.display = 'none';
    }
    const res = await fetch(`/api/all-data`);
    const { users, stats } = await res.json();
    const statMap = {};
    for (let s of stats) {
        if (!statMap[s.userId]) statMap[s.userId] = {};
        statMap[s.userId][s.date] = s.status;
    }
    const streakMap = {};
    for (let user of users) {
        streakMap[user._id] = findConsecutiveStreaks(statMap[user._id] || {});
    }
    let theadHTML = `<tr><th>Kullanıcılar</th>`;
    const today = new Date();
    today.setHours(today.getHours() + 3);
    const todayString = today.toISOString().split('T')[0];
    for (let d of dates) {
        const date = new Date(d);
        const dayOfWeek = getDayOfWeekInTurkish(date);
        const formattedDate = formatDateForHeader(date);
        const isToday = d === todayString;
        const todayClass = isToday ? 'today-column' : '';
        theadHTML += `<th class="${todayClass}"><span class="date-text">${formattedDate}</span><br><span class="day-of-week">${dayOfWeek}</span></th>`;
    }
    theadHTML += `<th><img src="/images/red-arrow.png" alt="Streak" width="20" height="20"> Seri</th></tr>`;
    trackerTable.querySelector('thead').innerHTML = theadHTML;
    let tbodyHTML = '';
    for (let user of users) {
        const userStats = statMap[user._id] || {};
        const userStreaks = streakMap[user._id] || {};
        let row = `<tr><td class="user-item" data-user-id="${user._id}">`;
        const profileImage = user.profileImage ? `/images/${user.profileImage}` : '/images/default.png';
        row += `<img src="${profileImage}" alt="${user.name}" class="profile-image" loading="lazy" />`;
        row += `<span class="user-item-name">${user.name}</span></td>`;
        for (let date of dates) {
            const status = userStats[date] || '';
            let symbol = '➖';
            if (status === 'okudum') symbol = '✔️';
            else if (status === 'okumadım') symbol = '❌';
            let className = '';
            if (status === 'okudum') {
                className = 'green';
            } else if (status === 'okumadım') {
                const streakLength = userStreaks[date] || 0;
                if (streakLength === 1) {
                    className = 'pink';
                } else if (streakLength === 2) {
                    className = 'lila';
                } else if (streakLength >= 3) {
                    className = 'red';
                }
            }
            if (date === todayString) {
                className += ' today-column';
            }
            row += `<td class="${className}" onclick="toggleStatus('${user._id}', '${date}')">${symbol}</td>`;
        }
        const streak = calculateStreak(userStats);
        row += `<td>${streak > 0 ? `<span class="weekly-fire-emoji">🔥</span> ${streak}` : '-'}</td>`;
        row += `</tr>`;
        tbodyHTML += row;
    }
    trackerTable.querySelector('tbody').innerHTML = tbodyHTML;
    // Kullanıcıya tıklanınca ilgili kartı göster ve scroll et
    trackerTable.querySelectorAll('.user-item').forEach(item => {
        item.addEventListener('click', function () {
            const userId = this.getAttribute('data-user-id');
            // Kartlar görünür değilse önce göster
            const cardsContainer = document.querySelector('.user-cards-container');
            if (cardsContainer && cardsContainer.style.display === 'none') {
                cardsContainer.style.display = 'flex';
                // Kartlar yüklenmemişse yükle
                if (typeof window.loadUserCards === 'function') {
                    window.loadUserCards();
                }
            }
            // Biraz gecikmeli scroll (kartlar yükleniyorsa)
            const card = document.querySelector(`.user-card[data-user-id="${userId}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Kartı vurgula (isteğe bağlı)
                card.classList.add('highlight-card');
                setTimeout(() => card.classList.remove('highlight-card'), 1200);
            }
        });
    });
    const weekNav = document.querySelector('.week-navigation');
    if (weekNav) weekNav.style.display = 'flex';
    trackerTable.querySelector('tbody').classList.remove('tracker-table-visible');
    setTimeout(() => {
        trackerTable.querySelector('tbody').classList.add('tracker-table-visible');
        // Sadece ilk yüklemede sayfanın en üstüne kaydır
        if (isFirstLoad) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            isFirstLoad = false;
        }
    }, 20);
}

function findConsecutiveStreaks(userStats) {
    const dates = Object.keys(userStats).sort();
    if (dates.length === 0) return {};
    const streakMap = {};
    let currentStreak = 0;
    let streakDates = [];
    for (let i = 0; i < dates.length; i++) {
        const currentDate = dates[i];
        if (userStats[currentDate] === 'okumadım') {
            currentStreak++;
            streakDates.push(currentDate);
            if (i === dates.length - 1 ||
                userStats[dates[i + 1]] !== 'okumadım' ||
                !areDatesConsecutive(currentDate, dates[i + 1])) {
                for (let date of streakDates) {
                    streakMap[date] = currentStreak;
                }
                currentStreak = 0;
                streakDates = [];
            }
        }
    }
    return streakMap;
}

function areDatesConsecutive(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    const diffTime = d2 - d1;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays === 1;
}

prevWeekBtn.addEventListener('click', () => {
    weekOffset--;
    loadTrackerTable();
    loadUserCards();
});

nextWeekBtn.addEventListener('click', () => {
    weekOffset++;
    loadTrackerTable();
    loadUserCards();
});

prevWeekTodayBtn.addEventListener('click', () => {
    weekOffset = 0;
    loadTrackerTable();
    loadUserCards();
});

nextWeekTodayBtn.addEventListener('click', () => {
    weekOffset = 0;
    loadTrackerTable();
    loadUserCards();
});

function calculateStreak(userStats) {
    const allDates = Object.keys(userStats).sort();
    if (allDates.length === 0) return 0;
    const today = new Date();
    today.setHours(today.getHours());
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;
    const todayStatus = userStats[todayKey];
    let streak = 0;
    let currentDate;
    if (todayStatus === 'okudum') {
        currentDate = todayKey;
    } else if (todayStatus === 'okumadım') {
        return 0;
    } else {
        const d = new Date(todayKey);
        d.setDate(d.getDate() - 1);
        const prevYear = d.getFullYear();
        const prevMonth = String(d.getMonth() + 1).padStart(2, '0');
        const prevDay = String(d.getDate()).padStart(2, '0');
        currentDate = `${prevYear}-${prevMonth}-${prevDay}`;
    }
    while (true) {
        if (userStats[currentDate] === 'okudum') {
            streak++;
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

// Debounce fonksiyonu
let updateTimeout;
function debouncedUpdate() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        loadTrackerTable();
        loadUserCards();
        loadReadingStats();
        renderLongestSeries();
    }, 500); // 500ms bekle
}

async function toggleStatus(userId, date) {
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
    
    // Veri tabanı güncellemesini hemen yap
    await fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date, status })
    });
    
    // UI güncellemelerini debounce ile yap
    debouncedUpdate();
}

function getDayOfWeekInTurkish(date) {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[date.getDay()];
}

