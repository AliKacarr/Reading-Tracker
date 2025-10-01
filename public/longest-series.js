function renderLongestSeries() {
    fetch(`/api/longest-streaks/${window.groupid}`)
        .then(res => res.json())
        .then(data => {
            const chart = document.getElementById('longestSeriesChart');
            chart.style.minHeight = '150px';
            chart.innerHTML = '';
            const maxStreak = data.length > 0 ? data[0].streak : 1;
            const minBarWidth = 150; // px
            const maxBarWidth = 550; // px

            // Doğru rank algoritması
            let rankList = [];
            let streakToRank = {};
            let rankCount = 1;

            // Unique streak'leri sırala ve sırayla rank ata
            (data || []).forEach(user => {
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

            // Animasyon için bar ve değerleri saklayacağız
            const barsToAnimate = [];

            // Giriş yapılan kullanıcı bilgisini al
            const currentUserInfo = LocalStorageManager.getCurrentUserInfo();

            data.forEach((user, idx) => {
                // Normalize bar width
                const widthPercent = user.streak / maxStreak;
                const barWidth = minBarWidth + (maxBarWidth - minBarWidth) * widthPercent;

                // Satır kapsayıcı
                const row = document.createElement('div');
                row.className = 'longest-series-bar-row';
                
                // Giriş yapılan kullanıcı için özel class ekle
                if (currentUserInfo && currentUserInfo.userId === user.userId) {
                    row.classList.add('current-user-series');
                }

                // Başlangıç tarihi
                const startDate = document.createElement('span');
                startDate.className = 'series-date-outside';
                startDate.innerHTML = user.startDate
                    ? formatDateParts(user.startDate)
                    : '-';

                // Çubuk
                const bar = document.createElement('div');
                bar.className = 'longest-series-bar';
                bar.style.width = minBarWidth + 'px'; // Başlangıçta minimum genişlikte başlat

                // Aynı streak'e sahip olanlar aynı renkte olacak
                const { startColor, endColor } = streakColorMap[user.streak];
                bar.style.background = `linear-gradient(90deg, ${startColor}, ${endColor})`;

                // Sadece ilk 3 için rank kutucuğu göster
                let rankHTML = '';
                if (rankList[idx] && rankList[idx] <= 3) {
                    const rankImages = {
                        1: 'birincilik.webp',
                        2: 'ikincilik.webp',
                        3: 'üçüncülük.webp'
                    };
                    rankHTML = `<span class="series-rank-inside"><img src="/images/${rankImages[rankList[idx]]}" alt="${rankList[idx]}. sıra" class="rank-image"></span>`;
                }

                bar.innerHTML = `
                  ${rankHTML}
                  <span class="series-info" style="opacity:0;">${user.name}</span>
                  <span class="series-count" style="opacity:0;"><b><span class="longest-fire-emoji">🔥</span>${user.streak}</b></span>
                `;

                // --- YENİ: Bar'a tıklanınca ilgili kullanıcı kartını aç ve vurgula ---
                bar.style.cursor = "pointer";
                bar.addEventListener('click', function () {
                    // user._id bilgisini longest-streaks API'si döndürüyorsa kullan, yoksa user.name ile eşle
                    // Kartlar görünür değilse önce göster
                    const cardsContainer = document.querySelector('.user-cards-container');
                    if (cardsContainer && cardsContainer.style.display === 'none') {
                        cardsContainer.style.display = 'flex';
                        if (typeof window.loadUserCards === 'function') {
                            window.loadUserCards();
                        }
                    }

                    // user._id varsa onunla, yoksa user.name ile bul
                    let selector = '';
                    if (user.userId || user._id) {
                        selector = `.user-card[data-user-id="${user.userId || user._id}"]`;
                    } else {
                        // Fallback: isimle bul (isimde özel karakter varsa çalışmayabilir)
                        selector = `.user-card .user-card-user-name`;
                    }
                    let card = document.querySelector(selector);
                    if (!card && selector === `.user-card .user-card-user-name`) {
                        // İsimle bulma fallback'i
                        document.querySelectorAll('.user-card .user-card-user-name').forEach(el => {
                            if (el.textContent.trim() === user.name) {
                                card = el.closest('.user-card');
                            }
                        });
                    }
                    if (card) {
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        card.classList.add('highlight-card');
                        setTimeout(() => card.classList.remove('highlight-card'), 1200);
                    }
                });
                // --- YENİ KOD SONU ---

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

                // Yükleme animasyonunu gizle
                const loadingElement = document.querySelector('.longest-series-loading');
                if (loadingElement) {
                    loadingElement.style.display = 'none';
                }

                // Animasyon için bar ve değerleri sakla
                barsToAnimate.push({
                    bar,
                    barWidth,
                    idx
                });
            });

            // --- Animasyon sırasını barWidth'e göre küçükten büyüğe sırala ---
            // Eşit barWidth'lerde idx büyük olan önce animasyonlansın (alttan üste)
            const sortedBarsToAnimate = barsToAnimate.slice().sort((a, b) => {
                if (a.barWidth !== b.barWidth) {
                    return a.barWidth - b.barWidth;
                } else {
                    return b.idx - a.idx; // idx büyük olan (alttaki) önce gelsin
                }
            });

            // Intersection Observer ile animasyonu tetikle
            if ('IntersectionObserver' in window) {
                const observer = new IntersectionObserver((entries, obs) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            // Animasyonu başlat (en kısa çubuktan en uzun çubuğa)
                            sortedBarsToAnimate.forEach(({ bar, barWidth }, sortedIdx) => {
                                setTimeout(() => {
                                    bar.style.transition = 'width 1s cubic-bezier(.4,1.5,.6,1)';
                                    bar.style.width = barWidth + 'px';
                                }, 100 + sortedIdx * 200);

                                setTimeout(() => {
                                    const info = bar.querySelector('.series-info');
                                    const count = bar.querySelector('.series-count');
                                    if (info) info.style.transition = 'opacity 0.5s';
                                    if (count) count.style.transition = 'opacity 0.5s';
                                    if (info) info.style.opacity = 1;
                                    if (count) count.style.opacity = 1;
                                }, 1000 + sortedIdx * 190);
                            });
                            obs.disconnect(); // Bir kere tetiklensin
                        }
                    });
                }, { threshold: 0.1 });

                observer.observe(chart);
            } else {
                // Eski tarayıcılar için animasyonu hemen başlat
                sortedBarsToAnimate.forEach(({ bar, barWidth }, sortedIdx) => {
                    setTimeout(() => {
                        bar.style.transition = 'width 1s cubic-bezier(.4,1.5,.6,1)';
                        bar.style.width = barWidth + 'px';
                    }, 100 + sortedIdx * 200);

                    setTimeout(() => {
                        const info = bar.querySelector('.series-info');
                        const count = bar.querySelector('.series-count');
                        if (info) info.style.transition = 'opacity 0.5s';
                        if (count) count.style.transition = 'opacity 0.5s';
                        if (info) info.style.opacity = 1;
                        if (count) count.style.opacity = 1;
                    }, 1100 + sortedIdx * 200);
                });
            }
        });
}

function formatDateParts(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const day = date.toLocaleDateString('tr-TR', { day: '2-digit' });
    const month = date.toLocaleDateString('tr-TR', { month: 'short' });
    return `<span class="date-daymonth">${day} ${month}</span>`;
}