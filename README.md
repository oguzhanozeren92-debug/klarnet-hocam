# Klarnet Hocam

Sol (G) / Albert klarnet eğitim uygulaması: nota öğretimi, mikrofonla akort ve ritim, alıştırmalar ve ilerleme takibi.

## iOS kimliği
- App Store adı: **Klarnet Hocam**
- Bundle ID: `com.oguzhanozeren.klarnethocam`
- Tema: koyu lacivert ve altın
- Dağıtım: iPhone, App Store Connect / TestFlight

## Onaylanan iOS ikonu
Orijinal onaylı kare ikon `resources/icon.png` konumunda. İkinci kopyası `assets/KlarnetHocam-AppIcon-1024.png`.
`ios-release/scripts/generate-ios-icons.mjs` bu PNG'den native Xcode `AppIcon.appiconset` dosyalarını üretir. App Store Connect ekranında manuel ikon yüklenmez; ikon uygulamanın imzalı IPA paketine dahildir.

## iOS build hazırlığı
`codemagic.yaml` ile iki **manuel** workflow hazırlandı:
- `klarnet-hocam-ios-smoke`: imzasız iPhone simulator derleme kontrolü
- `klarnet-hocam-ios-testflight`: imzalı iPhone IPA üretimi ve App Store Connect'e yükleme. App Store incelemesine göndermez.

Native kabuk `ios-release/` içinde Capacitor 8 / Swift Package Manager kullanır.
`npm run native:prepare`, **onaylanan V6 eğitimi doğrudan bu GitHub deposundaki `ios-release/web/` klasöründen** `www/` altına paketler. Vercel'in eski bir yayını build'e karışamaz. Build öncesi 29 konu dersi, 35 ayrı alıştırma, nota/mikrofon/akort arayüzü ve gerekli dosyaların varlığı doğrulanır; doğrulama başarısızsa IPA üretimi durur. Ardından Xcode projesi, mikrofon izin metni, iPhone ayarları ve onaylı ikon hazırlanır. Onaylanan V6 tasarımının CSS ve JavaScript dosyaları GitHub'da tutulur.

Apple imzalama için Codemagic'te `TarlaPusula CI 2` App Store Connect entegrasyonunun doğru Apple Developer hesabına bağlı ve `com.oguzhanozeren.klarnethocam` için dağıtım imzalama yetkisi bulunmalıdır. İşlem başarıyla bitmeden **App Store Connect > Build** alanında bir build görünmez.

## Reklam modeli (3 Kasım 2026)

- **Banner yok.** iPhone eğitimi ve mikrofon ekranının yüksekliği reklamla daraltılmaz.
- **Yalnız Geçiş (Interstitial)**: Önce mikrofonla gerçekten başarılı olan bir alıştırma tamamlanmalıdır. Üçüncü doğrulanmış çalışma reklam için uygun olur, ancak reklam **yalnız kullanıcı "Alıştırmalara dön" butonuna bastığında**, mikrofon durup alıştırma listesi göründükten sonra gösterilebilir. Reklam yüklenmemişse kullanıcı beklemez. Aynı alıştırmanın aynı gün tekrarı gösterim sayısını şişirmez.
- **Sınırlar:** En fazla günde 2 gösterim; iki gösterim arasında en az 40 dakika. Dersin, nota dinletisinin, canlı mikrofonun veya alıştırmanın ortasında tam ekran reklam yok.
- **AdMob henüz etkin değil:** `KLARNET_ADMOB_MODE=disabled` varsayılan. AdMob uygulamasını iOS olarak açıp `Geçiş` reklam birimi oluşturduktan sonra Codemagic'e `KLARNET_ADMOB_MODE=production`, `KLARNET_ADMOB_APP_ID=ca-app-pub-...~...`, `KLARNET_ADMOB_INTERSTITIAL_ID=ca-app-pub-.../...` değerleri bağlanmalı. Gerçek kimlikler eksikse production paketlemesi hata vererek durur.
- **Toplu test:** İleride yeni IPA, TestFlight, Google test cihazı ve AdMob gösterim/gelir kontrolü topluca yapılacak. Bu değişiklikler tek başına canlı reklam gösterildiği veya gelir kazanıldığı anlamına gelmez.

## Yayından önce yapılacak gerçek cihaz kontrolleri
- Uygulamanın gerçekten açılıp dersleri göstermesi ve görsellerin yüklenmesi
- Mikrofon izni, akort/ses doğruluğu ve kayıtların çalışması
- Küçük ekranlarda yatay taşma olmaması, güvenli alan ve durum çubuğu
- Destek / gizlilik bağlantıları ve App Store ekran görüntüleri
- Apple inceleme kurallarına uygun işlevsellik ve erişilebilirlik

**3 Kasım 2026 notu:** Önceki TestFlight Build 6, daha önceki Vercel yayınının dosyalarıyla hazırlanmış olabilir. V6 içerik doğrudan GitHub'a yeni eklendiği için **Build 6 güncel değildir**; yeni main commit'iyle Codemagic'te yeni bir signed TestFlight build almak gerekir. Gerçek iPhone üzerinde mikrofon, nota, parmak pozisyonu ve responsive tasarım ayrıca test edilmelidir. V6'nın bazı isteğe bağlı referans görselleri ve nota analizi kütüphaneleri internet gerektirebilir.
