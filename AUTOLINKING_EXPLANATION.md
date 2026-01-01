# React Native ve Expo Autolinking Mekanizması

## Nasıl Çalışır?

### 1. React Native Autolinking

React Native 0.60+ sürümlerinde autolinking mekanizması şu şekilde çalışır:

1. **Paket Tarama**: `node_modules` içindeki tüm paketleri tarar
2. **Config Dosyası Arama**: Her pakette `react-native.config.js` dosyasını arar
3. **Podspec Bulma**: `react-native.config.js` dosyasında `dependency.platforms.ios.podspecPath` varsa, o podspec'i kullanır
4. **Podfile'a Ekleme**: Podspec'i Podfile'a otomatik olarak ekler

### 2. Expo-modules-autolinking

Expo projelerinde `expo-modules-autolinking` kullanılır:

```ruby
config_command = [
  'npx',
  'expo-modules-autolinking',
  'react-native-config',
  '--json',
  '--platform',
  'ios'
]
config = use_native_modules!(config_command)
```

Bu komut:
1. `expo-modules-autolinking react-native-config` komutunu çalıştırır
2. React Native'in autolinking mekanizmasını kullanır
3. Paketleri tarar ve podspec'leri bulur
4. Podfile'a ekler

## Sorun: Paket Neden Bulunamıyor?

### Olası Nedenler:

1. **Paket `node_modules` içinde yok**: Paket yüklenmemiş olabilir
2. **`react-native.config.js` dosyası eksik**: Pakette `react-native.config.js` dosyası yoksa autolinking çalışmaz
3. **Podspec path'i yanlış**: `react-native.config.js` dosyasındaki `podspecPath` yanlış olabilir
4. **Expo-modules-autolinking filtreleme**: Expo-modules-autolinking bazı paketleri filtreleyebilir

### Çözüm:

1. **Paketi kontrol edin**:
```bash
ls -la node_modules/@abdurrahman-dev/react-native-ivs-broadcast/
```

2. **react-native.config.js dosyasını kontrol edin**:
```bash
cat node_modules/@abdurrahman-dev/react-native-ivs-broadcast/react-native.config.js
```

3. **Podspec dosyasını kontrol edin**:
```bash
cat node_modules/@abdurrahman-dev/react-native-ivs-broadcast/ios/IVSBroadcast.podspec
```

4. **Autolinking çıktısını kontrol edin**:
```bash
cd ios
npx expo-modules-autolinking react-native-config --platform ios --json
```

5. **Manuel ekleme**: Eğer autolinking çalışmazsa, Podfile'a manuel olarak ekleyin:
```ruby
pod 'IVSBroadcast', :path => '../node_modules/@abdurrahman-dev/react-native-ivs-broadcast/ios'
```

## Paket Yapılandırması

Paketinizin doğru yapılandırıldığından emin olun:

1. **package.json** içinde `files` array'inde `react-native.config.js` ve `ios/` klasörü olmalı
2. **react-native.config.js** dosyası paket root'unda olmalı
3. **podspecPath** doğru path'i işaret etmeli: `"./ios/IVSBroadcast.podspec"`
4. **Podspec** dosyası `ios/` klasöründe olmalı

## Test

Paketinizin autolinking tarafından bulunup bulunmadığını test edin:

```bash
# React Native config
npx react-native config --platform ios

# Expo-modules-autolinking
npx expo-modules-autolinking resolve --platform ios
```

Bu komutlar paketinizi listelerse, autolinking çalışıyor demektir.
