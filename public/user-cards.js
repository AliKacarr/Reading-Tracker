async function loadUserCards() {
  const container = document.querySelector('.user-cards-container');
  if (!container) return;

  // API'den tüm kullanıcı ve okuma verilerini çek
  const [allDataRes, streaksRes] = await Promise.all([
    fetch('/api/all-data'),
    fetch('/api/longest-streaks')
  ]);
  const { users, stats } = await allDataRes.json();
  const streaks = await streaksRes.json();

  // Mevcut kartları bir Map olarak tut
  const existingCards = new Map();
  container.querySelectorAll('.user-card[data-user-id]').forEach(card => {
    existingCards.set(card.getAttribute('data-user-id'), card);
  });

  // Güncel kullanıcı ID'lerini tut
  const currentUserIds = users.map(u => u._id);

  // Artık olmayan kullanıcıların kartlarını kaldır
  existingCards.forEach((card, userId) => {
    if (!currentUserIds.includes(userId)) {
      card.remove();
    }
  });

  // Lig görselleri ve isimleri
  const leagues = [
    { min: 0, max: 5, name: 'Bronz', img: 'bronz.png' },
    { min: 5, max: 10, name: 'Gümüş', img: 'gumus.png' },
    { min: 10, max: 20, name: 'Altın', img: 'altin.png' },
    { min: 20, max: 40, name: 'Akik', img: 'akik.png' },
    { min: 40, max: 60, name: 'İnci', img: 'inci.png' },
    { min: 60, max: 80, name: 'Safir', img: 'safir.png' },
    { min: 80, max: 100, name: 'Zümrüt', img: 'zumrut.png' },
    { min: 100, max: 150, name: 'Elmas', img: 'elmas.png' },
    { min: 150, max: 200, name: 'Yakut', img: 'yakut.png' },
    { min: 200, max: 365, name: 'Mercan', img: 'mercan.png' },
    { min: 365, max: 9999, name: 'Pırlanta', img: 'pirlanta.png' }
  ];

  // Lig arka planları
  const leagueBackgrounds = {
    "Bronz": "linear-gradient(90deg, #e2b07a 60%, #ffe0b2 100%)",
    "Gümüş": "linear-gradient(90deg, #d3d3d3 60%, #e0e0e0 100%)",
    "Altın": "linear-gradient(90deg, #ffd700 60%, #ffe789 100%)",
    "Akik": "linear-gradient(90deg, #84b094 60%, #a5d6a7 100%)",
    "İnci": "linear-gradient(90deg, #b2dfdb 60%, #c8eef3 100%)",
    "Safir": "linear-gradient(90deg, #49b7ff 60%, #bbdefb 100%)",
    "Zümrüt": "linear-gradient(90deg, #58c089 60%, #a5d6a7 100%)",
    "Elmas": "linear-gradient(90deg, #36e873 60%, #c4edb8 100%)",
    "Yakut": "linear-gradient(90deg, #ffb199 60%, #ffe0b2 100%)",
    "Mercan": "linear-gradient(90deg, #ff6f63 60%, #ffafb7 100%)",
    "Pırlanta": "linear-gradient(90deg, #f3ebeb  60%, #ffffff 100%)"
  };

  // Haftanın günleri
  function getDaysOrderedByFirstDay(firstDayOfWeek) {
    // 0: Pazar, 1: Pazartesi, ..., 6: Cumartesi
    const allDays = [
      { key: 'P', label: 'Pazar' },
      { key: 'P', label: 'Pazartesi' },
      { key: 'S', label: 'Salı' },
      { key: 'Ç', label: 'Çarşamba' },
      { key: 'P', label: 'Perşembe' },
      { key: 'C', label: 'Cuma' },
      { key: 'C', label: 'Cumartesi' }
    ];
    const ordered = [];
    for (let i = 0; i < 7; i++) {
      ordered.push(allDays[(firstDayOfWeek + i) % 7]);
    }
    return ordered;
  }

  const weekDates = typeof getWeekDates === 'function' ? getWeekDates(weekOffset || 0) : [];

  users.forEach(user => {
    const userStats = stats.filter(s => s.userId === user._id && (s.status === 'okudum' || s.status === 'okumadım'));
    const okudumStats = userStats.filter(s => s.status === 'okudum');
    const totalDays = userStats.length;
    const okudumDays = okudumStats.length;

    // Lig belirle
    const league = leagues.find(l => okudumDays >= l.min && okudumDays < l.max) || leagues[leagues.length - 1];

    // Haftalık okuma durumu
    const weekStatus = weekDates.map(date => {
      const stat = userStats.find(s => s.date === date);
      if (!stat) return 'empty';
      return stat.status === 'okudum' ? 'ok' : 'not';
    });

    // Yeni kod: Tüm okuma geçmişine bakarak bugünden geriye doğru seri hesapla
    function calculateStreakForUser(stats) {
      // stats: [{date, status}]
      if (!stats || stats.length === 0) return 0;
      // Tarihlere göre sıralayalım
      const statMap = {};
      stats.forEach(s => { statMap[s.date] = s.status; });
      const allDates = Object.keys(statMap).sort();
      if (allDates.length === 0) return 0;

      // Bugünün tarihini al
      const today = new Date();
      today.setHours(today.getHours());
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayKey = `${year}-${month}-${day}`;
      const todayStatus = statMap[todayKey];
      let streak = 0;
      let currentDate;
      if (todayStatus === 'okudum') {
        currentDate = todayKey;
      } else if (todayStatus === 'okumadım') {
        return 0;
      } else {
        // Bugün işaretli değilse dünden başla
        const d = new Date(todayKey);
        d.setDate(d.getDate() - 1);
        const prevYear = d.getFullYear();
        const prevMonth = String(d.getMonth() + 1).padStart(2, '0');
        const prevDay = String(d.getDate()).padStart(2, '0');
        currentDate = `${prevYear}-${prevMonth}-${prevDay}`;
      }
      while (true) {
        if (statMap[currentDate] === 'okudum') {
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
    const streak = calculateStreakForUser(userStats);

    // Progress bar
    const percent = totalDays > 0 ? Math.round((okudumDays / totalDays) * 100) : 0;

    // En uzun seri
    const userStreak = streaks.find(s => s.userId === user._id);
    let longestStreakText = '';
    if (userStreak && userStreak.streak > 0) {
      const start = userStreak.startDate ? new Date(userStreak.startDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : '';
      const end = userStreak.endDate ? new Date(userStreak.endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }) : '';
      longestStreakText = `<span class="streak-icon">⚡</span><span class="streak-icon-label">En Uzun Seri: </span> ${start} - ${end} (<span class="streak-days">${userStreak.streak} gün</span>)`;
    }

    // Lig bilgisi için gösterim
    const leagueProgressText = `${okudumDays}/${league.max}`;
    const headerBg = leagueBackgrounds[league.name] || "#fff";


    container.style.display = 'flex';

    // Kart zaten varsa, içeriğini güncelle
    let card = container.querySelector(`.user-card[data-user-id="${user._id}"]`);
    if (!card) {
      card = document.createElement('div');
      card.className = 'user-card';
      card.setAttribute('data-user-id', user._id);
      container.appendChild(card);
      // Efekti tetikle
      setTimeout(() => {
        card.classList.add('card-fade-in');
      }, 10);
    } else {
      // Kart zaten varsa, güncellenince de efekti tekrar uygula
      card.classList.remove('card-fade-in');
      setTimeout(() => {
        card.classList.add('card-fade-in');
      }, 10);
    }
    card.innerHTML = `
      <div class="user-card-header" style="background: ${headerBg};">
        <div class="profile-img-wrapper">
          <img class="profile-img" src="/images/${user.profileImage}" alt="${user.name}">
        </div>
        <div class="user-card-header-content">
          <div class="user-card-user-name">${user.name}</div>
          <div class="user-league">${league.name}</div>
        </div>
        <div class="league-badge-group">
          <div class="league-badge" title="${league.name} Ligi: ${league.min} - ${league.max - 1} gün arası okuma">
            <img src="images/${league.img}" alt="${league.name}">
          </div>
          <div class="league-progress-text">${leagueProgressText}</div>
        </div>
      </div>
      <div class="weekly-status-row">
        <div class="weekly-status-days">
          ${getDaysOrderedByFirstDay(firstDayOfWeek).map((day, i) => `
            <div class="weekly-status-day-group"
              data-user-id="${user._id}"
              data-date="${weekDates[i]}"
            >
              <div class="day-label">${day.key}</div>
              <div class="day-circle ${weekStatus[i]}" title="${day.label}"></div>
            </div>
          `).join('')}
        </div>
        <div class="streak-info">
          <span class="user-card-fire-emoji">🔥</span>
          <span class="user-card-fire-label">${streak}</span>
        </div>
      </div>
      <div class="divider"></div>
      <div class="progress-summary-row">
        <span class="progress-summary">
          <span class="summary-count"><span class="progress-summary-okudum-count">${okudumDays}</span><span class="progress-summary-total-count">/${totalDays}</span></span>
          <span class="summary-label"> Gün okuma</span>
        </span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width:${percent}%;"></div>
        </div>
        <span class="progress-percent">%${percent}</span>
      </div>
      <div class="user-card-longest-streak">${longestStreakText}</div>
    `;
    // .weekly-status-day-group click event ekle
    card.querySelectorAll('.weekly-status-day-group').forEach(group => {
      group.addEventListener('click', function () {
        const userId = this.getAttribute('data-user-id');
        const date = this.getAttribute('data-date');
        const userObj = users.find(u => u._id === userId);
        if (userObj) {
          const [year, month, day] = date.split('-');
          toggleUserCardsReadingStatus(userObj.name, parseInt(day), parseInt(month), parseInt(year));
        }
      });
    });
  });
  // Lig açıklama barını dinamik ekle
  if (document.querySelector('.league-info-bar')) return; // Zaten varsa tekrar ekleme

  const leagueInfoBar = document.createElement('div');
  leagueInfoBar.className = 'league-info-bar';
  leagueInfoBar.innerHTML = leagues.map(l =>
    `<span class="league-info-item">
      <img src="images/${l.img}" alt="${l.name}" class="league-info-img">
      <span class="league-info-name">${l.name}</span>
    </span>`
  ).join('') + '<div class="league-info-description"><img src="images/info.png" alt="info" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 5px;"> Toplam okuma gününüz arttıkça daha yüksek liglere yükselirsiniz</div>';
  container.parentNode.insertBefore(leagueInfoBar, container);
}

// Kullanıcı kartlarında okuma durumunu değiştiren fonksiyon
toggleUserCardsReadingStatus = function (userName, day, month, year) {

  if (!isAuthenticated()) {
    logUnauthorizedAccess('toggleUserCardsReadingStatus');
    return;
  }

  // Tarih formatını yyyy-mm-dd olarak hazırla
  function formatDateForTable(day, month, year) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const dateStr = formatDateForTable(day, month, year);

  fetch('/api/all-data')
    .then(response => response.json())
    .then(data => {
      const user = data.users.find(u => u.name === userName);
      if (!user) throw new Error('Kullanıcı bulunamadı');

      const stat = data.stats.find(s => s.userId === user._id && s.date === dateStr);
      let currentStatus = stat ? stat.status : '';
      let newStatus = '';

      if (currentStatus === '') {
        newStatus = 'okudum';
      } else if (currentStatus === 'okudum') {
        newStatus = 'okumadım';
      } else if (currentStatus === 'okumadım') {
        newStatus = '';
      }

      return fetch('/api/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user._id,
          date: dateStr,
          status: newStatus
        })
      });
    })
    .then(response => {
      if (response && response.ok) {
        // Kartları ve diğer bölümleri güncelle
        if (window.loadUserCards) window.loadUserCards();
        if (window.loadTrackerTable) window.loadTrackerTable();
        if (window.loadReadingStats) window.loadReadingStats();
        if (window.renderLongestSeries) window.renderLongestSeries();
      }
    })
    .catch(error => {
      console.error('Okuma durumu değiştirilirken hata oluştu:', error);
    });
}