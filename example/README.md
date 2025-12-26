# IVS Broadcast Example (Expo)

Bu proje, `react-native-ivs-broadcast` paketinin tüm özelliklerini test etmek için Expo ile oluşturulmuş bir örnek uygulamadır.

## Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
cd example
npm install
```

Paket npm'den yüklenecektir: `react-native-ivs-broadcast`

### 2. Expo Prebuild (Zorunlu)

Native modüller için:

```bash
npx expo prebuild --clean
```

### 3. iOS Pod Install

```bash
cd ios
pod install
cd ..
```

### 4. Uygulamayı Çalıştırın

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Özellikler

- ✅ Session oluşturma ve yönetimi
- ✅ Broadcast başlatma/durdurma/duraklatma/devam ettirme
- ✅ Kamera kontrolü (ön/arka kamera değiştirme)
- ✅ Mikrofon kontrolü (sessize alma/açma)
- ✅ Network health monitoring
- ✅ Real-time istatistikler (audio/video stats)
- ✅ Event logging

## Kullanım

### 1. RTMP URL ve Stream Key'i Girin

Uygulamayı açtığınızda, RTMP URL ve Stream Key alanlarını doldurun.

### 2. Session Oluşturun

"Create Session" butonuna tıklayarak bir broadcast session oluşturun.

### 3. Broadcast'i Başlatın

"Start" butonuna tıklayarak broadcast'i başlatın.

### 4. Kontrolleri Kullanın

- **Camera Controls**: Kamerayı değiştirin veya pozisyon ayarlayın
- **Audio Controls**: Mikrofonu sessize alın veya açın
- **Broadcast Controls**: Broadcast'i duraklatın veya devam ettirin

### 5. İstatistikleri İzleyin

Uygulama, network health, audio stats ve video stats'ı gerçek zamanlı olarak gösterir.

### 6. Logları Kontrol Edin

Tüm event'ler ve işlemler log bölümünde görüntülenir.

## Sorun Giderme

### "IVSBroadcastModule native module is not available"

1. **Expo prebuild çalıştırın**:
   ```bash
   npx expo prebuild --clean
   ```

2. **iOS için pod install yapın**:
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Uygulamayı yeniden build edin**:
   ```bash
   npx expo run:ios
   ```

Detaylı bilgi için `NATIVE_MODULE_SETUP.md` veya `QUICK_FIX.md` dosyalarına bakın.

### Metro Cache Temizleme

```bash
npx expo start --clear
```

## Notlar

- Gerçek bir broadcast yapmak için geçerli bir RTMP URL ve Stream Key gereklidir
- Kamera ve mikrofon izinleri uygulama ilk açıldığında istenecektir
- Network health ve stats bilgileri broadcast başladıktan sonra görünmeye başlar
- Bu paket Expo Go ile çalışmaz, development build gereklidir

## Lisans

MIT
