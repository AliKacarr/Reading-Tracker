// ... existing code ...
document.addEventListener('DOMContentLoaded', function () {
    fetch('/api/longest-streaks')
        .then(res => res.json())
        .then(data => {
            const chart = document.getElementById('longestSeriesChart');
            chart.innerHTML = '';
            const maxStreak = data.length > 0 ? data[0].streak : 1;
            const minBarWidth = 120; // px
            const maxBarWidth = 600; // px

            // Doğru rank algoritması
            let rankList = [];
            let currentRank = 1;
            let prevStreak = null;
            let streakToRank = {};
            let rankCount = 1;

            // Önce tüm unique streak'leri sırala ve sırayla rank ata
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
                const percentage = data.indexOf(user) / (data.length - 1);
                const startHue = 50; // Blue
                const endHue = 10; // Green
                const currentHue = startHue + (endHue - startHue) * percentage;
                const startColor = `hsl(${currentHue}, 85%, 55%)`;
                const endColor = `hsl(${currentHue}, 85%, 65%)`;
                bar.style.background = `linear-gradient(90deg, ${startColor}, ${endColor})`;

                // Sadece ilk 3 için rank kutucuğu göster
                let rankHTML = '';
                if (rankList[idx] && rankList[idx] <= 3) {
                    rankHTML = `<span class="series-rank-inside">${rankList[idx]}.</span>`;
                }

                bar.innerHTML = `
                  ${rankHTML}
                  <span class="series-info">${user.name}</span>
                  <span class="series-count"><b><span class="fire-emoji">🔥</span>${user.streak}</b></span>
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
});

function formatDateParts(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('tr-TR', { day: '2-digit' });
    const month = date.toLocaleDateString('tr-TR', { month: 'short' });
    const year = date.toLocaleDateString('tr-TR', { year: 'numeric' });
    return `<span class="date-daymonth">${day} ${month}</span> <span class="date-year">${year}</span>`;
}