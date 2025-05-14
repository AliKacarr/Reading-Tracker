document.addEventListener('DOMContentLoaded', function () {
    let lastCanvasDataUrl = null;
    let lastQuoteText = "";
    let lastQuoteSection = null;

    // Paylaş butonuna tıklandığında
    document.querySelectorAll('.share-quote').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const targetId = btn.getAttribute('data-target');
            const targetElem = document.getElementById(targetId);
            if (!targetElem) return;

            // Metin içeriğini al
            lastQuoteText = targetElem.innerText || "";

            // Quote section'ı sakla
            lastQuoteSection = btn.closest('.quote-section');
            if (!lastQuoteSection) return;

            // Web Share API kontrolü
            if (navigator.share) {
                // Web Share API varsa, resmi oluştur ve paylaş
                createImage().then(canvas => {
                    shareImage(canvas);
                }).catch(error => {
                    console.error('Resim oluşturma hatası:', error);
                    showSharePanel();
                });
            } else {
                // Web Share API yoksa, paylaşım panelini göster
                showSharePanel();
            }
        });
    });

    // Resmi oluştur - Promise döndüren tek bir fonksiyon
    function createImage() {
        return new Promise((resolve, reject) => {
            if (!lastQuoteSection) {
                reject(new Error('Quote section bulunamadı'));
                return;
            }

            // Geçici kapsayıcı oluştur ve padding ekle
            const tempContainer = document.createElement('div');
            tempContainer.style.padding = '15px';
            tempContainer.style.background = '#fff';
            tempContainer.style.display = 'flex';
            tempContainer.style.flexDirection = 'column';
            tempContainer.style.alignItems = 'center';
            tempContainer.style.justifyContent = 'center'
            tempContainer.style.boxSizing = 'border-box';
            tempContainer.style.width = (lastQuoteSection.offsetWidth) + 'px';

            // Orijinal içeriği klonla ve kapsayıcıya ekle
            const clonedContent = lastQuoteSection.cloneNode(true);

            // Klonlanan içerikteki .share-quote ve .refresh-quote butonlarını kaldır
            clonedContent.querySelectorAll('.share-quote, .refresh-quote').forEach(btn => btn.remove());

            tempContainer.appendChild(clonedContent);
            document.body.appendChild(tempContainer);

            html2canvas(tempContainer, {
                backgroundColor: null,
                useCORS: true,
                scale: 2,
                willReadFrequently: true
            }).then(function (canvas) {
                // Geçici kapsayıcıyı kaldır
                document.body.removeChild(tempContainer);

                lastCanvasDataUrl = canvas.toDataURL('image/png');
                resolve(canvas);
            }).catch(function (error) {
                if (tempContainer.parentNode) document.body.removeChild(tempContainer);
                console.error('Canvas oluşturma hatası:', error);
                reject(error);
            });
        });
    }

    // Web Share API ile paylaş
    function shareImage(canvas) {
        canvas.toBlob(function (blob) {
            // Dosya adı oluştur
            const fileName = 'bir-soz.png';

            // Blob'dan dosya oluştur
            const file = new File([blob], fileName, { type: 'image/png' });

            // Paylaşım verilerini hazırla
            const shareData = {
                title: 'Çatı Katı Elazığ - Bir Söz',
                text: lastQuoteText,
                files: [file]
            };

            // Paylaşım menüsünü aç
            navigator.share(shareData)
                .then(() => console.log('Paylaşım başarılı'))
                .catch((error) => {
                    console.error('Paylaşım hatası:', error);
                    // Paylaşım başarısız olursa paneli göster
                    showSharePanel();
                });
        });
    }

    // Paylaşım panelini göster
    function showSharePanel() {
        const panel = document.getElementById('sharePanel');
        panel.style.display = 'flex';

        // Panel dışına tıklanınca paneli kapat
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutsidePanel);
        }, 0);
    }

    // Paylaşım panelini gizle
    function hideSharePanel() {
        const panel = document.getElementById('sharePanel');
        panel.style.display = 'none';
        console.log('hide');
        document.removeEventListener('mousedown', handleClickOutsidePanel);
    }

    // Panel dışına tıklama kontrolü
    function handleClickOutsidePanel(event) {
        const panelContent = document.querySelector('.share-panel-content');
        const panelWrapper = document.getElementById('sharePanel');
        if (panelWrapper.style.display !== 'none') {
            if (panelContent && !panelContent.contains(event.target)) {
                hideSharePanel();
            }
        }
    }

    // Kapat butonuna tıklandığında
    document.getElementById('closeSharePanel').addEventListener('click', hideSharePanel);

    // İndir butonuna tıklandığında
    document.getElementById('downloadImageBtn').addEventListener('click', function () {
        createImage().then((canvas) => {
            const dataUrl = canvas.toDataURL('image/png');
            downloadImage(dataUrl);
        }).catch(error => {
            console.error('Resim oluşturma hatası:', error);
            alert('Resim oluşturulamadı. Lütfen tekrar deneyin.');
        });
    });

    // Resmi indir
    function downloadImage(dataUrl) {
        try {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = 'bir-soz.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            hideSharePanel();
        } catch (error) {
            console.error('İndirme hatası:', error);
            alert('Resim indirilemedi. Lütfen tekrar deneyin.');
        }
    }

    // WhatsApp paylaşımı
    document.getElementById('shareWhatsappBtn').addEventListener('click', function () {
        // WhatsApp'ta paylaşılacak metin
        const text = encodeURIComponent(lastQuoteText || 'Çatı Katı Elazığ');

        // WhatsApp paylaşım URL'i
        window.open('https://wa.me/?text=' + text, '_blank');
        hideSharePanel();
    });

    // Twitter paylaşımı
    document.getElementById('shareTwitterBtn').addEventListener('click', function () {
        // Twitter'da paylaşılacak metin
        const tweetText = encodeURIComponent(lastQuoteText.substring(0, 200) + " #ÇatıKatıElazığ");

        // Twitter paylaşım URL'i
        window.open('https://twitter.com/intent/tweet?text=' + tweetText, '_blank');
        hideSharePanel();
    });
});