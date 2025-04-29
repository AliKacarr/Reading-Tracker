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

            data.forEach(user => {
                // Normalize bar width
                const widthPercent = user.streak / maxStreak;
                const barWidth = minBarWidth + (maxBarWidth - minBarWidth) * widthPercent;

                // Satır kapsayıcı
                const row = document.createElement('div');
                row.className = 'longest-series-bar-row';

                // Başlangıç tarihi
                const startDate = document.createElement('span');
                startDate.className = 'series-date-outside';
                startDate.textContent = user.startDate
                    ? new Date(user.startDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';

                // Çubuk
                const bar = document.createElement('div');
                bar.className = 'longest-series-bar';
                bar.style.width = barWidth + 'px';
                const percentage = data.indexOf(user) / (data.length - 1);
                const startHue = 50; // Blue
                const endHue = 10; // Green
                const currentHue = startHue + (endHue - startHue) * percentage;
                const startColor = `hsl(${currentHue}, 85%, 55%)`; // More vibrant blue-to-green transition
                const endColor = `hsl(${currentHue}, 85%, 65%)`; // Brighter gradient end
                bar.style.background = `linear-gradient(90deg, ${startColor}, ${endColor})`;
                bar.innerHTML = `
                  <span class="series-info">${user.name}</span>
                  <span class="series-count"><b>${user.streak}</b></span>
                `;
                // Bitiş tarihi
                const endDate = document.createElement('span');
                endDate.className = 'series-date-outside';
                endDate.textContent = user.endDate
                    ? new Date(user.endDate).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '-';

                // Satıra ekle
                row.appendChild(startDate);
                row.appendChild(bar);
                row.appendChild(endDate);

                chart.appendChild(row);
            });
        });
});