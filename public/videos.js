// Çatikatim kanalının ID'si
const CHANNEL_ID = 'UCa4B618R90dxe7N9OK0LJyQ';

// DOM elementleri
const videosContainer = document.getElementById('videos');
const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');
const closeBtn = document.querySelector('.close');
const loadingOverlay = document.getElementById('loadingOverlay');

let isFirstLoad = true;

// API anahtarını sunucudan al
fetch('/api/config')
    .then(response => response.json())
    .then(config => {
        API_KEY = config.youtubeApiKey;
        // API anahtarı alındıktan sonra videoları yükle
        showRandomVideos();
    })
    .catch(error => {
        console.error('API anahtarı alınırken hata oluştu:', error);
        videosContainer.innerHTML = `<div class="error">Yapılandırma yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>`;
    });

// Kanalın rastgele videosunu getir
async function fetchAllVideos(playlistId) {
    let videos = [];
    let nextPageToken = '';
    do {
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${API_KEY}` + (nextPageToken ? `&pageToken=${nextPageToken}` : '');
        const response = await fetch(url);
        const data = await response.json();
        if (data.items) {
            videos = videos.concat(data.items);
        }
        nextPageToken = data.nextPageToken;
    } while (nextPageToken);
    return videos;
}

// Video detaylarını toplu olarak getir (viewCount için)
async function fetchVideosDetails(videoIds) {
    const ids = videoIds.join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.items;
}

function getRandomVideos(videos, count) {
    const shuffled = videos.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Videoları ekrana bas
function renderVideos(videos) {
    videosContainer.innerHTML = '';

    // Önce tüm video ID'lerini topla
    const videoIds = videos.map(item => item.snippet.resourceId.videoId);

    // Video detaylarını getir (görüntülenme sayıları için)
    fetchVideosDetails(videoIds).then(details => {
        // ID -> viewCount eşleştirmesi yap
        const viewMap = {};
        details.forEach(item => {
            viewMap[item.id] = parseInt(item.statistics.viewCount, 10) || 0;
        });

        // Videoları render et
        videos.forEach(item => {
            const videoId = item.snippet.resourceId.videoId;
            const title = item.snippet.title;
            const thumbnail = item.snippet.thumbnails.high.url;
            const viewCount = viewMap[videoId] || 0;

            // Görüntülenme sayısını formatla
            const formattedViewCount = new Intl.NumberFormat('tr-TR').format(viewCount);

            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.innerHTML = `
                <img src="${thumbnail}" alt="${title}" class="thumbnail">
                <span class="play-icon"><i class="fa-solid fa-play"></i></span>
                <div class="video-title">
                    <div class="title-text">${title}</div>
                    <div class="view-count"><i class="fa-solid fa-eye"></i> ${formattedViewCount}</div>
                </div>
            `;

            videoCard.addEventListener('click', () => {
                openVideoModal(videoId);
            });

            videosContainer.appendChild(videoCard);
        });

        // Yükleme overlay'ini kapat
        loadingOverlay.style.display = 'none';
    }).catch(error => {
        console.error("Video detayları alınırken hata oluştu:", error);
        loadingOverlay.style.display = 'none';
    });
}

// En son eklenen videolar
async function showLatestVideos() {
    // Set active button
    document.querySelectorAll('.top-bar button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('latestBtn').classList.add('active');

    loadingOverlay.style.display = 'flex';
    try {
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`);
        const channelData = await channelResponse.json();
        if (!channelData.items || channelData.items.length === 0) throw new Error('Kanal bulunamadı');
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=6&playlistId=${uploadsPlaylistId}&key=${API_KEY}`;
        const videosResponse = await fetch(url);
        const videosData = await videosResponse.json();
        if (!videosData.items || videosData.items.length === 0) throw new Error('Video bulunamadı');
        renderVideos(videosData.items);
    } catch (error) {
        videosContainer.innerHTML = `<div class="error">Videolar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>`;
        loadingOverlay.style.display = 'none';
    }
}

// En çok izlenen videolar
async function showMostViewedVideos() {
    // Set active button
    document.querySelectorAll('.top-bar button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('mostViewedBtn').classList.add('active');

    // Remove this line that hides the refresh button
    // document.getElementById('refreshBtn').classList.remove('active');
    loadingOverlay.style.display = 'flex';
    try {
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`);
        const channelData = await channelResponse.json();
        if (!channelData.items || channelData.items.length === 0) throw new Error('Kanal bulunamadı');
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        const allVideos = await fetchAllVideos(uploadsPlaylistId);
        if (!allVideos || allVideos.length === 0) throw new Error('Video bulunamadı');
        const videoIdList = allVideos.map(item => item.snippet.resourceId.videoId);
        let stats = [];
        for (let i = 0; i < videoIdList.length; i += 50) {
            const batch = videoIdList.slice(i, i + 50);
            const details = await fetchVideosDetails(batch);
            stats = stats.concat(details);
        }
        const viewMap = {};
        stats.forEach(item => {
            viewMap[item.id] = parseInt(item.statistics.viewCount, 10) || 0;
        });
        allVideos.sort((a, b) => (viewMap[b.snippet.resourceId.videoId] || 0) - (viewMap[a.snippet.resourceId.videoId] || 0));
        renderVideos(allVideos.slice(0, 6));
    } catch (error) {
        videosContainer.innerHTML = `<div class="error">Videolar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>`;
    }
    loadingOverlay.style.display = 'none';
}

// Rastgele videolar
async function showRandomVideos() {
    // Set active button
    document.querySelectorAll('.top-bar button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('randomBtn').classList.add('active');

    // Sadece ilk yüklemede loadingOverlay'i gösterme
    if (!isFirstLoad) {
        loadingOverlay.style.display = 'flex';
    }
    try {
        const channelResponse = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`);
        const channelData = await channelResponse.json();
        if (!channelData.items || channelData.items.length === 0) throw new Error('Kanal bulunamadı');
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        const allVideos = await fetchAllVideos(uploadsPlaylistId);
        if (!allVideos || allVideos.length === 0) throw new Error('Video bulunamadı');
        const randomVideos = getRandomVideos(allVideos, 6);
        renderVideos(randomVideos);
    } catch (error) {
        videosContainer.innerHTML = `<div class="error">Videolar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.</div>`;
    }
    loadingOverlay.style.display = 'none';
    isFirstLoad = false; // İlk yükleme tamamlandıktan sonra false yap
}

// Butonlara tıklama olayları
document.getElementById('latestBtn').addEventListener('click', showLatestVideos);
document.getElementById('mostViewedBtn').addEventListener('click', showMostViewedVideos);
document.getElementById('randomBtn').addEventListener('click', showRandomVideos);

// Yenile butonuna tıklandığında aktif kategoriye göre videoları yenile
document.getElementById('refreshBtn').addEventListener('click', () => {
    // Aktif olan butonu bul
    const activeButton = document.querySelector('.top-bar button.active');

    if (activeButton) {
        // Aktif butona göre ilgili fonksiyonu çağır
        if (activeButton.id === 'latestBtn') {
            showLatestVideos();
        } else if (activeButton.id === 'mostViewedBtn') {
            showMostViewedVideos();
        } else if (activeButton.id === 'randomBtn') {
            showRandomVideos();
        }
    } else {
        // Eğer aktif buton yoksa varsayılan olarak son eklenen videoları göster
        showLatestVideos();
    }
});

// Video modalını aç
function openVideoModal(videoId) {
    videoFrame.src = `https://www.youtube.com/embed/${videoId}`;
    videoModal.style.display = 'flex';
}

// Modal kapatma işlemleri
closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
    if (event.target === videoModal) {
        closeModal();
    }
});

function closeModal() {
    videoModal.style.display = 'none';
    videoFrame.src = '';
}
