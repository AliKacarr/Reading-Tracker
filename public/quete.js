document.addEventListener('DOMContentLoaded', function () {

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
    } catch (error) {
        img.style.display = 'none';
        console.error('Error loading quote image:', error);
    }
}

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