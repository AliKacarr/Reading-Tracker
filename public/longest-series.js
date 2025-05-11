function renderLongestSeries() {
    fetch('/api/longest-streaks')
        .then(res => res.json())
        .then(data => {
            const chart = document.getElementById('longestSeriesChart');
            chart.innerHTML = '';
            const maxStreak = data.length > 0 ? data[0].streak : 1;
            const minBarWidth = 120; // px
            const maxBarWidth = 550; // px

            // Doğru rank algoritması
            let rankList = [];
            let streakToRank = {};
            let rankCount = 1;

            // Unique streak'leri sırala ve sırayla rank ata
            data.forEach(user => {
                if (!(user.streak in streakToRank)) {
                    if (rankCount > 3) return; // Sadece ilk 3 rank için
                    streakToRank[user.streak] = rankCount;
                    rankCount++;
                }
            });

            // Her kullanıcıya rank ata (sadece ilk 3 için, diğerleri undefined olacak)
            data.forEach(user => {
                rankList.push(streakToRank[user.streak]);
            });

            // --- RENK HESAPLAMASI İÇİN YENİ KOD ---
            // Tüm unique streak'leri büyükten küçüğe sırala
            const uniqueStreaks = [...new Set(data.map(u => u.streak))].sort((a, b) => b - a);
            const startHue = 230;
            const endHue = 200;
            const streakColorMap = {};
            uniqueStreaks.forEach((streak, idx) => {
                const percentage = uniqueStreaks.length === 1 ? 0 : idx / (uniqueStreaks.length - 1);
                const currentHue = startHue + (endHue - startHue) * percentage;
                const startColor = `hsl(${currentHue}, 85%, 55%)`;
                const endColor = `hsl(${currentHue}, 85%, 65%)`;
                streakColorMap[streak] = { startColor, endColor };
            });
            // --- RENK HESAPLAMASI SONU ---

            data.forEach((user, idx) => {
                // Normalize bar width
                const widthPercent = user.streak / maxStreak;
                const barWidth = minBarWidth + (maxBarWidth - minBarWidth) * widthPercent;

                // Satır kapsayıcı
                const row = document.createElement('div');
                row.className = 'longest-series-bar-row';

                // Başlangıç tarihi
                const startDate = document.createElement('span');
                startDate.className = 'series-date-outside';
                startDate.innerHTML = user.startDate
                    ? formatDateParts(user.startDate)
                    : '-';

                // Çubuk
                const bar = document.createElement('div');
                bar.className = 'longest-series-bar';
                bar.style.width = barWidth + 'px';

                // Aynı streak'e sahip olanlar aynı renkte olacak
                const { startColor, endColor } = streakColorMap[user.streak];
                bar.style.background = `linear-gradient(90deg, ${startColor}, ${endColor})`;

                // Sadece ilk 3 için rank kutucuğu göster
                let rankHTML = '';
                if (rankList[idx] && rankList[idx] <= 3) {
                    const rankImages = {
                        1: 'birincilik.png',
                        2: 'ikincilik.png',
                        3: 'üçüncülük.png'
                    };
                    rankHTML = `<span class="series-rank-inside"><img src="/images/${rankImages[rankList[idx]]}" alt="${rankList[idx]}. sıra" class="rank-image"></span>`;
                }

                bar.innerHTML = `
                  ${rankHTML}
                  <span class="series-info">${user.name}</span>
                  <span class="series-count"><b><span class="longest-fire-emoji">🔥</span>${user.streak}</b></span>
                `;

                // Bitiş tarihi
                const endDate = document.createElement('span');
                endDate.className = 'series-date-outside';
                endDate.innerHTML = user.endDate
                    ? formatDateParts(user.endDate)
                    : '-';

                // Satıra ekle
                row.appendChild(startDate);
                row.appendChild(bar);
                row.appendChild(endDate);

                chart.appendChild(row);
            });
        });
}

function formatDateParts(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('tr-TR', { day: '2-digit' });
    const month = date.toLocaleDateString('tr-TR', { month: 'short' });
    return `<span class="date-daymonth">${day} ${month}</span>`;
}