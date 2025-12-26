# Native Modül Kurulum Kılavuzu

Bu paket native modüller içerdiği için, Expo projesinde çalışması için aşağıdaki adımları izlemeniz gerekmektedir.

## Adım 1: Expo Prebuild

Native klasörleri oluşturmak için:

```bash
cd example
npx expo prebuild --clean
```

Bu komut:
- iOS ve Android native klasörlerini oluşturur
- Native modüllerin link edilmesini sağlar

## Adım 2: iOS Pod Install

iOS için CocoaPods bağımlılıklarını yükleyin:

```bash
cd ios
pod install
cd ..
```

**Önemli**: `pod install` komutu `IVSBroadcast.podspec` dosyasını bulmalı ve AmazonIVSBroadcast pod'unu yüklemelidir.

## Adım 3: Android Yapılandırması

Android için `android/app/build.gradle` dosyasına IVS SDK bağımlılığını ekleyin:

```gradle
dependencies {
    implementation 'com.amazonaws:ivs-broadcast:1.37.1:stages@aar'
}
```

`android/build.gradle` dosyasına `mavenCentral()` repository'sini ekleyin:

```gradle
allprojects {
    repositories {
        mavenCentral()
        // ...
    }
}
```

## Adım 4: Uygulamayı Çalıştırın

### iOS

```bash
npx expo run:ios
```

### Android

```bash
npx expo run:android
```

## Sorun Giderme

### "IVSBroadcastModule native module is not available"

Bu hata, native modülün düzgün link edilmediğini gösterir. Şunları kontrol edin:

1. **Prebuild yapıldı mı?**
   ```bash
   npx expo prebuild --clean
   ```

2. **iOS Pod'ları yüklendi mi?**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Paket doğru yapılandırıldı mı?**
   - `package.json` dosyasında `react-native` alanı olmalı
   - `react-native.config.js` dosyası olmalı (opsiyonel)

4. **Metro cache temizlendi mi?**
   ```bash
   npx expo start --clear
   ```

### iOS Pod Install Hatası

Eğer pod install sırasında hata alırsanız:

```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### Android Build Hatası

Eğer Android build hatası alırsanız:

1. `android/app/build.gradle` dosyasında IVS SDK bağımlılığının eklendiğinden emin olun
2. `android/build.gradle` dosyasında `mavenCentral()` repository'sinin eklendiğinden emin olun
3. Gradle sync yapın:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

## Notlar

- Bu paket Expo Go ile çalışmaz, development build gereklidir
- Native modüller için `expo prebuild` mutlaka çalıştırılmalıdır
- Her native kod değişikliğinden sonra uygulamayı yeniden build etmeniz gerekir

