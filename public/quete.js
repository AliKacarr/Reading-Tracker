document.addEventListener('DOMContentLoaded', function () {
    // Tüm yenileme butonlarını seç
    const refreshButtons = document.querySelectorAll('.refresh-quote');
    
    // Her buton için animasyonu başlat
    refreshButtons.forEach(button => {
        const icon = button.querySelector('i');
        if (icon) {
            // Her 30 saniyede bir animasyonu tetikle
            setInterval(() => {
                icon.classList.add('attention');
                // Animasyon bittikten sonra sınıfı kaldır
                setTimeout(() => {
                    icon.classList.remove('attention');
                }, 1500); // Animasyon süresi kadar bekle
            }, 10000); // 10 saniye
        }
    });

    // Tüm alıntı metinlerine tıklama olayı ekle
    document.querySelectorAll('.quote-text').forEach(element => {
        element.addEventListener('click', async function() {
            try {
                // Mevcut yüksekliği kaydet
                const currentHeight = this.offsetHeight;
                this.style.height = currentHeight - 4 + 'px';
                
                // Metni panoya kopyala
                await navigator.clipboard.writeText(this.textContent);
                
                // Kopyalandı bildirimi göster
                const originalText = this.textContent;
                this.textContent = '✓ Kopyalandı!';
                this.style.color = '#4CAF50';
                
                // 1.5 saniye sonra orijinal metne geri dön
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.color = '#454545';
                    // Yüksekliği tekrar auto yap
                    this.style.height = 'auto';
                }, 1500);
            } catch (err) {
                console.error('Kopyalama hatası:', err);
                // Hata durumunda da yüksekliği auto yap
                this.style.height = 'auto';
            }
        });
    });

    // Intersection Observer'ı oluştur
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Bir kez göründükten sonra takibi bırak
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1, // Elementin %10'u görünür olduğunda tetikle
        rootMargin: '50px' // Element ekranın 50px yakınına geldiğinde tetikle
    });

    // Tüm alıntı bölümlerini gözlemle
    document.querySelectorAll('.quote-section, .quote-section-image').forEach(section => {
        observer.observe(section);
    });

    // Mevcut içerikleri görünür yap
    document.querySelectorAll('.quote-text').forEach(element => {
        if (element.innerHTML.trim() !== '') {
            element.classList.add('visible');
        }
    });
    
    const quoteImage = document.getElementById('quoteImage');
    if (quoteImage && quoteImage.style.display !== 'none') {
        quoteImage.classList.add('visible');
    }

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
            fetchRandomQuoteImage();
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

async function fetchRandomQuote() {
    try {
        const quoteTextElement = document.getElementById('quoteText');
        if (quoteTextElement) {
            quoteTextElement.classList.remove('visible');
            const response = await fetch('/api/random-quote');
            const data = await response.json();

            // Update with the new quote
            quoteTextElement.innerHTML = data.sentence;
            // Animasyonu tetikle
            setTimeout(() => {
                quoteTextElement.classList.add('visible');
            }, 50);
        }
    } catch (error) {
        console.error('Error fetching quote:', error);
        const quoteTextElement = document.getElementById('quoteText');
        if (quoteTextElement) {
            quoteTextElement.innerHTML = 'Günün sözü yüklenemedi.';
            quoteTextElement.classList.add('visible');
        }
    }
}

async function fetchRandomQuoteImage() {
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
        img.classList.add('visible');
    } catch (error) {
        img.style.display = 'none';
        console.error('Error loading quote image:', error);
    }
}

async function fetchRandomAyet() {
    try {
        const ayatTextElement = document.getElementById('ayatText');
        if (ayatTextElement) {
            ayatTextElement.classList.remove('visible');
            const response = await fetch('/api/random-ayet');
            if (!response.ok) {
                throw new Error('Ayet getirme hatası');
            }
            const data = await response.json();

            // Ayet metnini sayfada göster
            ayatTextElement.innerHTML = data.sentence || 'Ayet yüklenemedi';
            // Animasyonu tetikle
            setTimeout(() => {
                ayatTextElement.classList.add('visible');
            }, 50);
        }
    } catch (error) {
        console.error('Ayet getirme hatası:', error);
        const ayatTextElement = document.getElementById('ayatText');
        if (ayatTextElement) {
            ayatTextElement.innerHTML = 'Ayet yüklenemedi';
            ayatTextElement.classList.add('visible');
        }
    }
}

// Rastgele hadis getirme fonksiyonu
async function fetchRandomHadis() {
    try {
        const hadithTextElement = document.getElementById('hadithText');
        if (hadithTextElement) {
            hadithTextElement.classList.remove('visible');
            const response = await fetch('/api/random-hadis');
            if (!response.ok) {
                throw new Error('Hadis getirme hatası');
            }
            const data = await response.json();

            // Hadis metnini sayfada göster
            hadithTextElement.innerHTML = data.sentence || 'Hadis yüklenemedi';
            // Animasyonu tetikle
            setTimeout(() => {
                hadithTextElement.classList.add('visible');
            }, 50);
        }
    } catch (error) {
        console.error('Hadis getirme hatası:', error);
        const hadithTextElement = document.getElementById('hadithText');
        if (hadithTextElement) {
            hadithTextElement.innerHTML = 'Hadis yüklenemedi';
            hadithTextElement.classList.add('visible');
        }
    }
}

async function fetchRandomDua() {
    try {
        const duaTextElement = document.getElementById('duaText');
        if (duaTextElement) {
            duaTextElement.classList.remove('visible');
            const response = await fetch('/api/random-dua');
            if (!response.ok) {
                throw new Error('Dua getirme hatası');
            }
            const data = await response.json();

            // Dua metnini sayfada göster
            duaTextElement.innerHTML = data.sentence || 'Dua yüklenemedi';
            // Animasyonu tetikle
            setTimeout(() => {
                duaTextElement.classList.add('visible');
            }, 50);
        }
    } catch (error) {
        console.error('Dua getirme hatası:', error);
        const duaTextElement = document.getElementById('duaText');
        if (duaTextElement) {
            duaTextElement.innerHTML = 'Dua yüklenemedi';
            duaTextElement.classList.add('visible');
        }
    }
}
