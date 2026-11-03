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
`npm run native:prepare`, Vercel'deki gerçek yayındaki uygulamanın dört web dosyasını build sırasında doğrulayarak indirip `www/` altına paketler; ardından Xcode proje dosyalarını, mikrofon izin açıklamasını, portre/iPhone yapılandırmasını ve onaylı ikonu ekler. Kaynağa erişilemezse eksik/boş bir IPA üretmek yerine hata verir.

Apple imzalama için Codemagic'te `TarlaPusula CI 2` App Store Connect entegrasyonunun doğru Apple Developer hesabına bağlı ve `com.oguzhanozeren.klarnethocam` için dağıtım imzalama yetkisi bulunmalıdır. İşlem başarıyla bitmeden **App Store Connect > Build** alanında bir build görünmez.

## Yayından önce yapılacak gerçek cihaz kontrolleri
- Uygulamanın gerçekten açılıp dersleri göstermesi ve görsellerin yüklenmesi
- Mikrofon izni, akort/ses doğruluğu ve kayıtların çalışması
- Küçük ekranlarda yatay taşma olmaması, güvenli alan ve durum çubuğu
- Destek / gizlilik bağlantıları ve App Store ekran görüntüleri
- Apple inceleme kurallarına uygun işlevsellik ve erişilebilirlik

Hazır build dosyası veya TestFlight yüklemesi bu depoda **henüz doğrulanmış değildir**. Codemagic'te yeni bir **main** derlemesi başlatılmalıdır.
