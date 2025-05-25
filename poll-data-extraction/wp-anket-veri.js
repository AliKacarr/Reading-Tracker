const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const mongoose = require('mongoose');

// Komut satırı argümanlarını al
const args = process.argv.slice(2);
const groupName = args[0] || "Yazılım"; // Varsayılan grup adı
const daysAgo = parseInt(args[1] || "1"); // Kaç gün öncesinin anketini çekeceğiz (varsayılan: dün)

// MongoDB bağlantısı
mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

// Modelleri tanımla
const userSchema = new mongoose.Schema({
    name: String,
    profileImage: { type: String, default: 'default.png' },
    wpName: String
});

const readingStatusSchema = new mongoose.Schema({
    userId: String,
    date: String,
    status: String
});

const User = mongoose.model('User', userSchema);
const ReadingStatus = mongoose.model('ReadingStatus', readingStatusSchema);

// Kullanıcı işlemleri için yardımcı fonksiyonlar
async function getOrCreateUser(wpName) {
    let user = await User.findOne({ wpName });
    if (!user) {
        console.log(`Yeni kullanıcı oluşturuluyor: ${wpName}`);
        user = new User({ name: wpName, wpName });
        await user.save();
    }
    console.log(`Kullanıcı: ${user._id.toString()}`);
    console.log(`Kullanıcı bulundu veya oluşturuldu: ${user.name}`);
    return user;
}

async function updateReadingStatus(userId, date, status) {
    if (status) {
        await ReadingStatus.findOneAndUpdate(
            { userId, date },
            { userId, date, status },
            { upsert: true }
        );
        console.log(`Evet, ${userId} kullanıcısı için ${date} tarihi için ${status} durumu kaydedildi.`);
    } else {
        await ReadingStatus.findOneAndDelete({ userId, date });
    }
}

// Anket sonuçlarını işleme fonksiyonu
async function processPollResults(pollResults, pollTopic) {
    function parseDateFromPollTopic(pollTopic) {
        const months = { 'Ocak': '01', 'Şubat': '02', 'Mart': '03', 'Nisan': '04', 'Mayıs': '05', 'Haziran': '06', 'Temmuz': '07', 'Ağustos': '08', 'Eylül': '09', 'Ekim': '10', 'Kasım': '11', 'Aralık': '12' };
        const [day, month] = pollTopic.split(' ');
        const year = new Date().getFullYear();
        return `${year}-${months[month]}-${day.padStart(2, '0')}`;
    }

    const date = parseDateFromPollTopic(pollTopic);
    console.log(`Tarih: ${date} için sonuçlar işleniyor...`);

    for (const [option, users] of Object.entries(pollResults)) {
        console.log(`${option} seçeneği için ${users.length} kullanıcı işleniyor...`);
        for (const wpName of users) {
            const user = await getOrCreateUser(wpName);
            await updateReadingStatus(user._id.toString(), date, option.toLowerCase());
            console.log(`${wpName} kullanıcısı için ${option.toLowerCase()} durumu kaydedildi.`);
        }
    }
    console.log('Tüm sonuçlar başarıyla veritabanına kaydedildi.');
}

// Ana fonksiyon
(async function main() {
    // Belirtilen gün sayısı kadar öncesinin tarihini Türkçe formatla al
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - daysAgo);
    const pollTopic = targetDate.getDate() + " " + targetDate.toLocaleString('tr-TR', { month: 'long' }); // Anket başlığı

    console.log(`Grup: ${groupName}, Anket: ${pollTopic}, Gün: ${daysAgo} gün öncesi`);

    // Her grup için farklı Chrome profil dizini kullan
    const profileDir = `chrome-profile-${groupName.toLowerCase().replace(/\s+/g, '-').replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')}`;

    let options = new chrome.Options();
    options.addArguments('--start-maximized');
    options.addArguments('--log-level=3');
    options.addArguments('--new-window');
    options.addArguments('--headless=new');
    options.addArguments(`--user-data-dir=${path.resolve(profileDir)}`);
    options.addArguments('--disable-application-cache');
    options.addArguments('--disk-cache-size=0');
    options.addArguments('--disable-gpu');
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    options.addArguments('--disable-extensions');
    options.addArguments('--disable-notifications');
    options.addArguments('--disable-infobars');
    options.excludeSwitches('enable-logging');

    // Chrome profil dizininin varlığını kontrol et, yoksa oluştur
    if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
        console.log(`Yeni Chrome profil dizini oluşturuldu: ${profileDir}`);
    }

    let driver;
    try {
        driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
        await driver.get('https://web.whatsapp.com/');
    } catch (e) {
        console.log('Chrome başlatılamadı:', e);
        process.exit(1);
    }
    console.log('Chrome başlatıldı.');
    try {
        let searchXPath = '//div[@contenteditable="true"][@data-tab="3"]';
        await driver.wait(until.elementLocated(By.xpath(searchXPath)), 60000);
    } catch (e) {
        console.log('WhatsApp Web yüklenemedi.');
        await driver.quit();
        process.exit(1);
    }

    try {
        let searchXPath = '//div[@role="textbox" and @aria-label="Arama metni giriş alanı" and @contenteditable="true"]';
        await driver.wait(until.elementLocated(By.xpath(searchXPath)), 100000);
    } catch (e) {
        console.log('WhatsApp Web yüklenemedi.');
        await driver.quit();
        process.exit(1);
    }

    // Sohbeti bul ve aç
    let searchBox;
    try {
        let searchXPath = '//div[@role="textbox" and @aria-label="Arama metni giriş alanı" and @contenteditable="true"]';
        searchBox = await driver.findElement(By.xpath(searchXPath));
        await searchBox.click();
        await searchBox.sendKeys(groupName.trim());
        // Wait for group list to appear
        let paneSideXPath = '//div[@id="pane-side"]';
        await driver.wait(until.elementLocated(By.xpath(paneSideXPath)), 20000);
        // Wait for group divs to be present
        let groupDivs = await driver.wait(async () => {
            let divs = await driver.findElements(By.xpath('//div[@id="pane-side"]//div[contains(@class,"x10l6tqk") and contains(@class,"xh8yej3") and contains(@class,"x1g42fcv")]'));
            return divs.length > 0 ? divs : false;
        }, 20000);
        await driver.sleep(2000);
        let found = false;
        for (let div of groupDivs) {
            try {
                let span = await div.findElement(By.xpath('.//span[@title]'));
                let title = await span.getAttribute('title');
                if (title === groupName) {
                    // Wait for the span to be clickable
                    await driver.wait(until.elementIsVisible(span), 20000);
                    await driver.wait(until.elementIsEnabled(span), 20000);
                    await span.click();
                    found = true;
                    break;
                }
            } catch (e) { continue; }
        }
        if (!found) throw new Error('Sohbet bulunamadı');
    } catch (e) {
        console.log('Sohbet bulunamadı.');
        await driver.quit();
        process.exit(1);
    }

    require('readline').createInterface({ input: process.stdin, output: process.stdout }).question('', () => { });
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Sohbet açıldı.');
    await driver.sleep(2000);
    // Anketi bul ve "Oyları görüntüle" butonuna bas
    let foundPoll = false;
    try {
        let messages = await driver.findElements(By.xpath('//div[contains(@class,"message-out") or contains(@class,"message-in")]'));
        for (let msg of messages) {
            try {
                let spans = await msg.findElements(By.xpath('.//span'));
                for (let span of spans) {
                    let text = await span.getText();
                    if (text.trim() === pollTopic) {
                        foundPoll = true;
                        try {
                            let viewVotesBtn = await msg.findElement(By.xpath('.//button[.//div[contains(text(),"Oyları görüntüle")]]'));
                            await driver.executeScript("arguments[0].click();", viewVotesBtn);
                            await driver.sleep(2000);
                        } catch (e) { continue; }
                        break;
                    }
                }
                if (foundPoll) break;
            } catch (e) { continue; }
        }
        if (!foundPoll) {
            console.log('Belirtilen başlıkta anket bulunamadı.');
            await driver.quit();
            mongoose.disconnect();
            process.exit(1);
            return;
        }
    } catch (e) {
        console.log('Mesajlar taranırken hata oluştu.');
        await driver.quit();
        mongoose.disconnect();
        return;
    }

    // Anket sonuçlarını çek
    const pollResults = {};
    try {
        let panelXPath = '//div[contains(@class, "_aig-") and contains(@class, "x9f619")]';
        let panel = await driver.wait(until.elementLocated(By.xpath(panelXPath)), 10000);
        let optionBlocks = await panel.findElements(By.xpath('.//div[contains(@class,"x13mwh8y")]'));
        let i = 0;
        while (i < optionBlocks.length) {
            let optBlock = optionBlocks[i];
            try {
                let userInfo = await optBlock.findElements(By.xpath('.//div[contains(@class,"x178xt8z") and contains(@class,"x13fuv20") and contains(@class,"xyj1x25")]'));
                if (!userInfo.length) { i++; continue; }
                let optionName = await optBlock.findElement(By.xpath('.//span[contains(@class,"xo1l8bm")]')).getText();
                // "Tümünü gör" butonu varsa tıkla ve kullanıcı listesini güncelle
                try {
                    let showAllBtn = await optBlock.findElement(By.xpath('.//button[.//div[contains(text(),"Tümünü gör")]]'));
                    await driver.executeScript("arguments[0].click();", showAllBtn);
                    await driver.sleep(1000);
                    panel = await driver.wait(until.elementLocated(By.xpath(panelXPath)), 10000);
                    let optionBlocksNew = await panel.findElements(By.xpath('.//div[contains(@class,"x13mwh8y")]'));
                    for (let newBlock of optionBlocksNew) {
                        try {
                            let newOptionName = await newBlock.findElement(By.xpath('.//span[contains(@class,"xo1l8bm")]')).getText();
                            if (newOptionName === optionName) {
                                optBlock = newBlock;
                                break;
                            }
                        } catch (e) { continue; }
                    }
                    userInfo = await optBlock.findElements(By.xpath('.//div[contains(@class,"x178xt8z") and contains(@class,"x13fuv20") and contains(@class,"xyj1x25")]'));
                } catch (e) { }
                let userNames = [];
                for (let user of userInfo) {
                    try {
                        let nameSpans = await user.findElements(By.xpath('.//span[@dir="auto"]'));
                        for (let nameSpan of nameSpans) {
                            let userName = (await nameSpan.getText()).trim();
                            if (userName && !["Bugün", ":"].some(x => userName.includes(x))) {
                                userNames.push(userName);
                            }
                        }
                    } catch (e) { continue; }
                }

                // Sonuçları pollResults objesine ekle
                pollResults[optionName] = userNames;

                const result = `${optionName}: ${userNames.length ? userNames.join(', ') : ''}`;
                console.log(result);

                // Sonuçları dosyaya ekle
                try {
                    fs.appendFileSync('poll_results.txt', result + '\n');
                } catch (error) {
                    console.error('Error writing to file:', error);
                }
                // Eğer "Tümünü gör" açıldıysa geri dön
                try {
                    let backBtn = await panel.findElement(By.xpath('.//div[@role="button" and @aria-label="Geri"]'));
                    await driver.executeScript("arguments[0].click();", backBtn);
                    await driver.sleep(1000);
                    panel = await driver.wait(until.elementLocated(By.xpath(panelXPath)), 10000);
                    optionBlocks = await panel.findElements(By.xpath('.//div[contains(@class,"x13mwh8y")]'));
                } catch (e) { }
                i++;
            } catch (e) { i++; }
        }

        // Anket sonuçlarını veritabanına işle
        if (Object.keys(pollResults).length > 0) {
            console.log('Anket sonuçları veritabanına işleniyor...');
            await processPollResults(pollResults, pollTopic);
        } else {
            console.log('İşlenecek anket sonucu bulunamadı.');
        }

    } catch (e) {
        console.log('Anket sonuçları paneli bulunamadı veya işlenemedi:', e);
    } finally {
        await driver.quit();
        mongoose.disconnect();
        console.log('İşlem tamamlandı.');
        process.exit(0);
    }
})();
