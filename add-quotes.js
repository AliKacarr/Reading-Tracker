const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB'ye bağlan
mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME });

const Hadis = mongoose.model('Hadisler', {
  sentence: String
});

// Örnek hadisler
const hadisler = [
  "Size iki şey bırakıyorum, onlara sımsıkı sarıldığınız sürece yolunuzu şaşırmayacaksınız: Allah’ın Kitabı ve Peygamberinin Sünneti. (Muvatta, Kader, 3)",
  "Sözün en güzeli Allah’ın (c.c.) Kitabı’dır. Rehberliğin en güzeli ise Muhammed’in rehberliğidir. (İbn Hanbel, III, 320)",
  "Allah katında amellerin en sevimlisi hangisidir? (diye soruldu.) Resûlullah, Az da olsa devamlı olanıdır. buyurdu. (Müslim, Salâtü’l-müsâfirîn, 216)",
  "İslam beş esas üzerine kurulmuştur: Allah’tan başka ilâh olmadığına ve Muhammed’in Allah’ın Resûlü olduğuna şehâdet etmek, namaz kılmak, zekât vermek, haccetmek ve ramazan orucunu tutmak. (Buhârî, Îmân, 2)",
  "Akıllı kişi kendisini hesaba çeken ve ölümden sonrası için çalışandır. Aciz kişi ise arzularına uyup bir de Allah’tan (bağışlanma) umandır. (Tirmizî, Sıfatü’l-kıyâme,25)",
  "İnsan ölünce üç şey dışında ameli kesilir: Sadaka-i câriye (faydası kesintisiz sürüp giden sadaka), kendisinden faydalanılan ilim ve kendisine dua eden hayırlı evlât. (Müslim, Vasiyyet, 14)",
  "Müminin durumu ne ilginçtir! Her hâli kendisi için hayırlıdır ve bu durum yalnız mümine mahsustur. Başına güzel bir iş geldiğinde şükreder; bu onun için hayır olur. Başına bir sıkıntı geldiğinde ise sabreder; bu da onun için hayır olur. (Müslim, Zühd, 64)",
  "Dua ibadetin özüdür. (Tirmizî, Deavât, 1)",
  "Peygamber Efendimize Yâ Resûlallah, hangi dua daha çok kabule şayandır? diye sorulmuş, Peygamber Efendimiz, Gece yarısından sonra ve farz namazların arkasından yapılan dualar. diye cevap vermiştir. (Tirmizî, Deavât, 79)",
  "Temizlik imanın yarısıdır. (Tirmizî, Deavât, 86)",
  "Peygamberimiz: Birinizin kapısının önünden bir nehir geçse ve onda her gün beş defa yıkansa, bu o kimsenin kirinden bir şey bırakır mı, ne dersiniz? diye sordu. Sahâbîler, Onun kirinden hiçbir şey bırakmaz. diye cevap verdiler. Bunun üzerine Resûlullah, İşte beş vakit namaz da böyledir! Allah onlarla günahları yok eder. buyurdu. (Buhârî, Mevâkîtü’s-salât, 6)",
  "Büyük günah işlenmedikçe beş vakit namaz ve iki cuma, aralarındaki günahlara kefarettir. (Müslim, Tahâret, 14)",
  "Ancak üç mescide (ibadet maksadı ile) gitmek üzere yolculuğa çıkılabilir: Benim şu mescidim (Mescid-i Nebevi), Mescid-i Harâm ve Mescid-i Aksâ. (Müslim, Hac, 511)",
  "İslam beş esas üzerine kurulmuştur: Allah’tan başka ilâh olmadığına ve Hz. Muhammed’in Allah’ın Resûlü olduğuna şahitlik etmek, namazı dosdoğru kılmak, zekât vermek, Kâbe’yi haccetmek ve ramazan orucunu tutmak. (Müslim, Îmân, 21)",
  "İnanarak ve sevabını Allah’tan umarak ramazan orucunu tutan kimsenin geçmiş günahları bağışlanır. (Buhârî, Îmân, 28)",
  "Her kim bu evi (Kâbe’yi) haccederken, (söz ya da eylemle) cinsel yakınlığa yeltenmez ve kötülük işlemezse, anasının onu doğurduğu günkü gibi (günahsız) haline dönmüş olur. (Buhârî, Muhsar, 10)",
  "Âdemoğlu kurban günü Allah katında kurban kesmekten daha güzel bir amel işlemez. Kurban, kıyamet günü boynuzları, kılları ve tırnaklarıyla (sevap olarak) gelir. Kurban, henüz kanı yere düşmeden, Allah tarafından kabul edilir. Bu sebeple kurban kesme konusunda gönlünüz hoş olsun, (bu iş size zor gelmesin). (Tirmizî, Edâhî, 1)",
  "Allah sizin dış görünüşlerinize ve mallarınıza bakmaz, bilakis kalplerinize ve amellerinize bakar. (Müslim, Birr, 34)",
  "…Allah, ancak samimiyetle sadece kendisi için ve rızası gözetilerek yapılan ameli kabul eder. (Nesâî, Cihâd, 24)",
  "Müminlerin iman bakımından en olgunu, ahlâk bakımından en güzel olanıdır. (Buhârî, Edeb, 39)",
  "Kuşkusuz âlimler peygamberlerin vârisleridir. Peygamberler miras olarak ne altın ne de gümüş bırakmışlardır; onların bıraktıkları yegâne miras ilimdir. Dolayısıyla kim onu alırsa büyük bir pay almış olur. (Tirmizî, İlim, 19)",
  "Bir adam Hz. Peygamber’e (sas), ‘Amellerin en üstünü hangisidir?’ diye sorunca Peygamber Efendimiz şöyle cevap verdi: Vaktinde kılınan namaz ve anne babaya iyilik etmektir. Sonra da Allah yolunda cihat etmek gelir. (Buhârî, Tevhîd, 48)",
  "Beş şey gelmeden önce beş şeyin değerini iyi bilmelisin; ihtiyarlığından önce gençliğinin, hastalığından önce sağlığının, yokluğundan önce varlığının, meşguliyetinden önce boş vaktinin ve ölümünden önce hayatının. (Hâkim, Müstedrek, IV, 341)",
  "Nerede olursan ol, Allah’a karşı sorumluluğunun bilincinde ol! Kötülüğün peşinden iyi bir şey yap ki onu yok etsin. İnsanlara da güzel ahlâka uygun biçimde davran! (Tirmizî, Birr, 55)",
  "Bilin ki! Vücutta öyle bir et parçası vardır ki o iyi (doğru ve düzgün) olursa bütün vücut iyi (doğru ve düzgün) olur, o bozulursa vücut bozulur. Bilin ki o kalptir. (Buhârî, Îmân, 38)",
  "Günahtan tövbe etmek, günahı terk edip bir daha ona dönmemektir. (İbn Hanbel, I, 446)",
  "Dürüst ve güvenilir tüccar, peygamberler, sıddîklar ve şehitlerle beraberdir. (Tirmizî, Büyû, 4)",
  "Müminin durumu ne ilginçtir! Her hâli kendisi için hayırlıdır ve bu durum yalnız mümine mahsustur. Başına güzel bir iş geldiğinde şükreder; bu onun için hayır olur. Başına bir sıkıntı geldiğinde ise sabreder; bu da onun için hayır olur. (Müslim, Zühd, 64)",
  "Ancak iki kişiye gıpta edilir: Allah’ın kendisine verdiği malı hak yolunda harcayan kimse ile Allah’ın kendisine verdiği (ilim ve) hikmete göre karar veren ve onu başkalarına öğreten kimse. (Buhârî, Zekât, 5)",
  "Müslüman, elinden ve dilinden Müslümanların selâmette olduğu (zarar görmediği) kimsedir. Muhacir de Allah’ın yasakladığını terk eden kimsedir. (Buhârî, Îmân, 4)",
  "Müminin hâli ne hoştur! Her hâli kendisi için hayırlıdır ve bu durum yalnız mümine mahsustur. Başına güzel bir iş geldiğinde şükreder; bu onun için hayır olur. Başına bir sıkıntı geldiğinde ise sabreder; bu da onun için hayır olur. (Müslim, Zühd, 64)",
  "Bir adam, Ey Allah’ın Resûlü! Devemi bağlayıp da mı Allah’a tevekkül edeyim, yoksa bağlamadan mı tevekkül edeyim? diye sordu. Resûlullah (sas),Önce onu bağla, sonra Allah’a tevekkül et! buyurdu. (Tirmizî, Sıfatü’l-kıyâme, 60)",
  "İnsanlık, ilk günden beribütün peygamberlerinüzerinde ittifak ettikleribir söz bilir: Şayetutanmıyorsan, dilediğini yap! (Buhârî, Edeb, 78)",
  "Ey insanlar! Bilesiniz ki, Rabbiniz bir, atanız da birdir. Arap’ın Arap olmayana Arap olmayanın da Arap’a; beyazın siyaha, siyahın da beyaza hiçbir üstünlüğü yoktur. Üstünlük takvadadır… (İbn Hanbel, V, 411)",
  "Müminler, birbirlerini sevmede, birbirlerine merhamet ve şefkat göstermede, tıpkı bir organı rahatsızlandığında diğer organları da uykusuzluk ve yüksek ateşle bu acıyı paylaşan bir bedene benzer. (Müslim, Birr, 66)",
  "Münafığın alâmeti üçtür: Konuştuğunda yalan söyler, kendisine bir şey emanet edildiğinde ihanet eder, söz verdiği zaman sözünde durmaz. (Buhârî, Vesâyâ, 8; Müslim, Îmân, 107)",
  "Allah’ım! Bana kendi sevgini ve senin yanında sevgisi bana fayda verecek kimsenin sevgisini ver. (Tirmizî, Deavât, 73)",
  "Rabbin hoşnutluğu anne babanın hoşnutluğuna bağlıdır. Rabbin öfkesi ise, anne babanın öfkesine bağlıdır. (Tirmizî, Birr ve Sıla, 3)",
  "Kim rızkının bollaştırılmasını yahut ecelinin geciktirilmesini arzu ederse, akraba ile irtibatını sürdürsün! (Müslim, Birr, 20; Buhârî, Edeb, 12)",
  "Allah’a ve Ahiret gününe iman eden ya hayır söylesin ya da sussun! Allah’a ve Ahiret gününe iman eden komşusuna eziyet etmesin! Allah’a ve Ahiret gününe iman eden misafirine ikram etsin! (Buhârî, Rikâk, 23)",
  "Kardeşinle (düşmanlığa varan) tartışmaya girme, onunla (kırıcı şekilde) şakalaşma ve ona yerine getiremeyeceğin sözü verme. (Tirmizî, Birr, 58)",
  "Sizden biriniz kendisi için istediğini mümin kardeşi için de istemedikçe iman etmiş olmaz. (Tirmizî, Sıfatü’l-kıyâme, 59)",
  "Bir kötülük gören kişi, eli ile değiştirmeye gücü yetiyorsa onu eli ile değiştirsin. Buna gücü yetmez ise dili ile değiştirsin. Buna da gücü yetmezse kalbi ile (o kötülüğe) tavır koysun, (onu hoş görmesin). Ve bu da imanın asgari gereğidir. (Ebû Dâvûd, Salât, 239- 242)",
  "Üç şey öleni (mezara kadar) takip eder; ikisi geri döner, biri kalır. Ailesi, malı ve ameli onu takip eder. Ailesi ve malı geri döner, ameli kalır. (Müslim, Zühd, 5)",
  "Cehennem, nefsin arzu ettiği şeylerle, cennet ise nefsin hoşlanmadığı şeylerle kuşatılmıştır. (Buhârî, Rikâk, 28)",

];

// Veritabanına ayetleri ve hadisleri ekle
async function addQuotes() {
  try {
    // Mevcut ayetleri ve hadisleri
    await Hadis.deleteMany({});


    // Yeni hadisleri ekle
    for (const hadis of hadisler) {
      const yeniHadis = new Hadis({ sentence: hadis });
      await yeniHadis.save();
      console.log(`Hadis eklendi: ${hadis.substring(0, 30)}...`);
    }

    console.log('Tüm ayetler ve hadisler başarıyla eklendi!');
    mongoose.connection.close();
  } catch (error) {
    console.error('Ayet ve hadis eklenirken hata oluştu:', error);
    mongoose.connection.close();
  }
}

// Fonksiyonu çalıştır
addQuotes();