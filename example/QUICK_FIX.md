# Hızlı Çözüm: Native Modül Hatası

"IVSBroadcastModule native module is not available" hatası alıyorsanız, şu adımları izleyin:

## Adım 1: Expo Prebuild (ÖNEMLİ!)

```bash
cd example
npx expo prebuild --clean
```

Bu komut:
- Native iOS ve Android klasörlerini oluşturur
- Autolinking'i çalıştırır
- Paketi native projeye link eder

## Adım 2: iOS Pod Install

```bash
cd ios
pod install
cd ..
```

**Kontrol**: Pod install sonrası `ios/Pods/Local Podspecs/` klasöründe `IVSBroadcast.podspec.json` dosyası olmalı.

## Adım 3: Uygulamayı Build Edin

```bash
npx expo run:ios
```

## Sorun Devam Ederse

### 1. Paketi Yeniden Yükleyin

```bash
cd example
rm -rf node_modules/react-native-ivs-broadcast
npm install
```

### 2. Metro Cache Temizleyin

```bash
npx expo start --clear
```

### 3. Pod Cache Temizleyin

```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install
cd ..
```

### 4. Xcode Clean Build

Xcode'da:
1. Product > Clean Build Folder (Shift+Cmd+K)
2. Product > Build (Cmd+B)

## Kontrol Listesi

- [ ] `expo prebuild --clean` çalıştırıldı mı?
- [ ] `pod install` çalıştırıldı mı?
- [ ] `ios/Pods/Local Podspecs/IVSBroadcast.podspec.json` dosyası var mı?
- [ ] Metro cache temizlendi mi?
- [ ] Uygulama yeniden build edildi mi?

## Not

Bu paket native modüller içerdiği için **Expo Go ile çalışmaz**. Development build gereklidir.

