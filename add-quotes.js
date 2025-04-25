const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB'ye bağlan
mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

const Dua = mongoose.model('Dualar', {
  sentence: String
});

// Örnek dualar
const dualar = [
  "Rabbimiz! Bizi doğru yola ilettikten sonra kalplerimizi eğriltme. Bize tarafından rahmet bağışla. Lütfu en bol olan sensin. (Âl-i İmrân sûresi, 3/8)",
  "Allah’ım! Seni anmak, sana şükretmek, sana güzelce kulluk etmekte bana yardım et. (Ebu Dâvûd, Salât, 361)",
  "Allah’ım! Dinimi güzelce yaşat ki o benim güvencemdir. Dünyamı düzelt ki o benim geçim kaynağımdır. Ahiretimi hazırla ki o benim son durağımdır. Hayatımda her türlü hayrı ziyadesiyle ihsan eyle. Ölümümü de her türlü şerlerden muhafaza eyle. (Müslim, Zikir, 71)",
  "Rabbimiz! Biz iman ettik; öyle ise bizi affet; bize acı! Sen, merhametlilerin en iyisisin, demişlerdi. (Mü’minûn sûresi, 23/109)",
  "Rabbimiz! Peygamberlerin aracılığı ile bize vadettiklerini ver bize. Kıyamet günü bizi rezil etme. Şüphesiz sen, vadinden dönmezsin. (Âl-i İmrân sûresi, 3/194)",
  "Allah’ım! Nimetinin yok olmasından, verdiğin afiyetin (nimet ve sağlığın) bozulmasından, ansızın cezalandırmandan ve öfkene sebep olan her şeyden sana sığınırım. (Müslim, Zikir, 96)",
  "Allah’ım, fayda vermeyen ilimden, huşû duymayan kalpten, doymayan nefisten ve kabul olunmayan duadan sana sığınırım. (Nesâî, İstiâze, 65)",
  "Allah’ım! Sen affedicisin, Kerîm’sin, affı seversin, beni affet. (Tirmizî, Deavât, 84)",
  "Allah’ım! Her türlü pislikten ve necasetten sana sığınırım. (Buhârî, Deavât, 15)",
  "Ey Rabbim! Beni ve soyumdan gelecekleri namazı devamlı kılanlardan eyle; ey Rabbimiz! Duamı kabul et! (İbrâhîm sûresi, 14/40)",
  "Ey kalpleri hâlden hâle çeviren Allah’ım, kalbimi dinin üzere sabit kıl. (Tirmizî, Deavât, 124)",
  "Allah’ım, bana rahmetinin kapılarını aç. Allah’ım, senden senin lütfunu istiyorum. (Müslim, Müsâfirîn, 68)",
  "Allah'ım! Gam ve kederden, acizlikten, tembellikten, cimrilikten, korkaklıktan, borç yükünden ve insanların kahrından sana sığınırım. (Ebû Dâvûd, Salât, 367)",
  "Hz. Peygamber (sas) insanlarla birlikte iftar ettiğinde şöyle derdi: ‘Yanınızda oruçlular iftar etsin. Yemeğinizi iyiler yesin ve üzerinize melekler insin.’ (Dârimî, Savm, 51)",
  "Rabbimiz! Bizi sana teslim olanlardan kıl. Soyumuzdan sana teslim olacak bir ümmet getir. Bize ibadet yollarını göster. Tövbemizi kabul buyur. Çünkü sen, tövbeleri çok kabul edensin, çok merhametli olansın. (Bakara sûresi, 2/128)",
  "Allah’ım! Günahlarımı bağışla, rızkımı genişlet ve bana verdiğin rızıkları bereketli kıl! (Tirmizî, Deavât, 78)",
  "Allah’ım! Yaratılışımı güzel yaptığın gibi ahlâkımı da güzelleştir. (İbn Hanbel, I, 403)",
  "Ey Rabbimiz ve her şeyin Rabbi! Beni ve ailemi dünya ve Ahirette her an sana İhlasla bağlı kıl! (Ebû Dâvûd, Vitr, 25)",
  "Allah’ım! Bozgunculuktan, münâfıklıktan ve kötü ahlâktan sana sığınırım. (Ebû Dâvûd, Tefrîuebvâbi’l-vitr, 32)",
  "Allah’ım, bana öğrettiklerinle beni faydalandır. Bana fayda verecek ilmi bana öğret ve ilmimi artır. (Tirmizî, Deavât 128)",
  "Allah’ım! Bütün işlerimizin sonucunu güzel eyle, dünyada rezil olmaktan ve Ahiret azabından bizi koru. (Ahmed b. Hanbel, el-Müsned, 4/181)",
  "Ey Rabbimiz ve her şeyin Rabbi! Beni ve ailemi dünya ve Ahirette her an sana İhlasla bağlı kıl! (Ebû Dâvûd, Vitr, 25)",
  "Allah’ım! Beni, iyilik yaptıkları zaman sevinç duyan, kötülük yaptıkları zaman da bağışlanma dileyen kullarından eyle. (İbn Mâce, Edeb, 57; İbn Hanbel, VI, 188)",
  "O ikisi şöyle demişlerdi: Rabbimiz, biz nefsimize yazık ettik. Şayet sen bizi bağışlamazsan hüsrana uğrayanlardan oluruz. (A'râf sûresi, 7/23)",
  "Rabbimiz! Günahlarımızı bağışla. Kötülüklerimizi ört. Canımızı iyilerle beraber al. (Âl-i İmrân sûresi, 3/193)",
  "Allah’ım! Beni affet, bana merhamet et, bana hidayet ve âfiyet ver ve beni rızıklandır. (Müslim, Zikir, 35)",
  "Allah’ım! Nimetlerinin yok olmasından, sağlığımın bozulmasından, ansızın gelecek cezandan ve öfkene sebep olan her şeyden sana sığınırım. (Müslim, Rikâk, 96)",
  "Allah’ım! Senin iznin ve yardımınla sabahladık ve akşamladık. Yine senin izin ve yardımınla yaşar ve ölürüz. Sonunda dönüş yalnız sanadır. (Ebû Dâvûd, Edeb,110)",
  "Ve şöyle niyaz et: Rabbim! Gireceğim yere dürüstlükle girmemi sağla; çıkacağım yerden de dürüstlükle çıkmamı sağla. Bana tarafından, hakkıyla yardım edici bir kuvvet ver. (İsrâ Sûresi, 17/80)",
  "Rabbimiz! Bize tarafından rahmet ver ve bize, (şu) durumumuzdan bir kurtuluş yolu hazırla! (Kehf sûresi, 18/10)",
  "Allah’ın adıyla. Allah’a tevekkül ettim. Güç ve kuvvet sadece Allah’tandır. (Ebû Dâvûd, Edeb, 102- 103)",
  "Allah’ım, senden hidayet, takva, iffet ve gönül zenginliği istiyorum. (Müslim, Zikir, 72)",
  "Allah’ım! Fakirlikten, yokluktan ve zilletten sana sığınırım; zulmetmekten ve zulme uğramaktan da sana sığınırım. (Buhârî, Deavât, 40)",
  "Rabbimiz! Bizi ve bizden önce gelip geçmiş imanlı kardeşlerimizi bağışla; kalplerimizde, iman edenlere karşı hiçbir kin bırakma! Rabbimiz! Şüphesiz ki sen çok şefkatli, çok merhametlisin! (Haşr sûresi, 59/10)",
  "De ki: Ey Rabbim! Şeytanların vesveselerinden sana sığınırım; onların benim yanımda bulunmalarından da sana sığınırım. (Mü’minûn sûresi, 23/97- 98)",
  "Rabbimiz! Bize gözümüzü aydınlatacak eşler ve zürriyetler bağışla ve bizi takva sahiplerine önder kıl! (Furkân sûresi, 25/74)",
  "Rabbimiz! Hesap verileceği gün beni, anne babamı ve müminleri bağışla! (İbrâhîm sûresi, 14/41)",
  "Allah’ım! Günahlarımı, bilgisizlik yüzünden yaptıklarımı, haddimi aşarak işlediğim kusurlarımı, benden daha iyi bildiğin bütün hatalarımı bağışla (Müslim, Zikir, 70)",
  "Ey kalpleri çeviren (Allah’ım)! Benim kalbimi dinin üzere sabit kıl. (Tirmizî, Deavât, 89)",
  "Rabbimiz! Bizim günahlarımızı ve işimizdeki taşkınlıklarımızı bağışla ve (yolunda) ayaklarımızı sağlam tut. Kâfir topluma karşı bize yardım et. (Âl-i İmrân sûresi, 3/147)",
  "Ey Rabbimiz! Üzerimize sabır yağdır ve müslüman olarak bizim canımızı al. (A’râf sûresi, 7/126)",
  "Ey Rabbim! Bana bir hikmet bahşet ve beni salih kimseler arasına kat. (Şuarâ sûresi, 26/83)",
  "Rabbimiz! Biz, ‘Rabbinize iman edin!’ diye imana çağıran bir davetçi işittik, hemen iman ettik. Rabbimiz! Günahlarımızı bağışla. Kötülüklerimizi ört. Canımızı iyilerle beraber al. (Âl-i İmrân sûresi, 3/193)",
  "Ey Rabbimiz! Bize dünyada da iyilik ver, Ahirette de iyilik ver. Bizi cehennem azabından koru! (Bakara sûresi, 2/201)",
  "Allah’ım! Bütün işlerimizin sonucunu güzel eyle, dünyada rezil olmaktan ve Ahiret azabından bizi koru. (Ahmed b. Hanbel, el-Müsned, 4/181)"
];

// Veritabanına ayetleri ve dualari ekle
async function addQuotes() {
  try {
    // Mevcut ayetleri ve dualari
    await Dua.deleteMany({});


    // Yeni dualari ekle
    for (const dua of dualar) {
      const yeniDua = new Dua({ sentence: dua });
      await yeniDua.save();
      console.log(`Dua eklendi: ${dua.substring(0, 30)}...`);
    }

    console.log('Tüm ayetler ve dualar başarıyla eklendi!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Ayet ve dua eklenirken hata oluştu:', error);
    mongoose.connection.close();
  }
}

// Fonksiyonu çalıştır
addQuotes();