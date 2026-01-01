# @abdurrahman-dev/react-native-ivs-broadcast

React Native için Amazon IVS Broadcast SDK köprü paketi. Canlı yayın başlatma, kamera önizleme ve yayın kontrolü için kullanılır.

## Özellikler

### Temel Özellikler
- ✅ Broadcast başlatma/durdurma
- ✅ Kamera önizleme component'i
- ✅ Kamera kontrolü (ön/arka değiştirme)
- ✅ Mikrofon kontrolü
- ✅ Video ve ses konfigürasyonu
- ✅ Event-based API

### Gelişmiş Özellikler
- ✅ Kamera zoom kontrolü
- ✅ Flaş (torch) kontrolü
- ✅ Ses gain ayarı (0.0 - 2.0)
- ✅ Cihaz listeleme (kullanılabilir ve bağlı cihazlar)
- ✅ Kamera yetenekleri sorgulama
- ✅ Zamanlı metadata gönderme
- ✅ Gelişmiş istatistikler (transmission stats)
- ✅ Ses cihazı istatistikleri (peak, RMS)
- ✅ Picture-in-Picture (PiP) desteği (iOS 15+, Android 8.0+)

## Kurulum

```bash
npm install @abdurrahman-dev/react-native-ivs-broadcast
# veya
yarn add @abdurrahman-dev/react-native-ivs-broadcast
```

### Android

`android/app/build.gradle` dosyanıza ekleyin:

```gradle
dependencies {
    implementation 'com.amazonaws:ivs-broadcast:1.37.1'
}
```

`android/build.gradle` dosyanıza `mavenCentral()` repository'sini ekleyin.

### iOS

Paket **otomatik olarak** `AmazonIVSBroadcast` pod'unu dependency olarak ekler. React Native autolinking mekanizması (`react-native.config.js`) podspec'i otomatik bulur ve bağımlılıkları ekler.

**Kurulum:**

```bash
cd ios
pod install
cd ..
```

**Expo Projeleri İçin:**

**Önemli:** Expo-modules-autolinking bazen React Native paketlerini bulamayabilir. Bu durumda `ios/Podfile` dosyanıza **manuel olarak** eklemeniz gerekir:

```ruby
target 'YourApp' do
  use_expo_modules!
  
  config = use_native_modules!(config_command)
  
  # IVSBroadcast paketini manuel olarak ekle
  # Expo-modules-autolinking bazen React Native paketlerini bulamayabiliyor
  pod 'IVSBroadcast', :path => '../node_modules/@abdurrahman-dev/react-native-ivs-broadcast/ios'
  
  # ... diğer kodlar ...
end
```

**Neden Manuel Ekleme Gerekli?**

Expo-modules-autolinking şu şekilde çalışır:
1. `expo-modules-autolinking react-native-config` komutunu çalıştırır
2. React Native'in autolinking mekanizmasını kullanır
3. Ancak bazı React Native paketlerini filtreleyebilir veya bulamayabilir

Bu yüzden manuel ekleme gerekebilir.

**Kurulum:**

```bash
# iOS için
cd ios
pod install
cd ..
npx expo run:ios

# Android için
npx expo run:android
```

**Alternatif Çözüm:**

Eğer React Native'in doğrudan autolinking'ini kullanmak isterseniz:

```bash
EXPO_USE_COMMUNITY_AUTOLINKING=1 npx expo run:ios
```

**Önemli:** Native modüller sadece development build'de çalışır. Expo Go'da çalışmazlar.

**Sorun yaşıyorsanız:**

1. Podfile'ınızın en üstünde CocoaPods source'unun olduğundan emin olun:
```ruby
source 'https://cdn.cocoapods.org/'
```

2. Pod cache'ini temizleyin:
```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod install --repo-update
cd ..
```

3. Xcode'u kapatıp tekrar açın

`Info.plist` dosyanıza kamera ve mikrofon izinlerini ekleyin:

```xml
<key>NSCameraUsageDescription</key>
<string>Kamerayı kullanmak için izin gerekiyor</string>
<key>NSMicrophoneUsageDescription</key>
<string>Mikrofonu kullanmak için izin gerekiyor</string>
```

## Kullanım

### Temel Örnek

```typescript
import IVSBroadcast, { PreviewView } from '@abdurrahman-dev/react-native-ivs-broadcast';
import { useState, useEffect } from 'react';
import { View, Button, StyleSheet } from 'react-native';

function BroadcastScreen() {
  const [sessionId, setSessionId] = useState<string>();
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  useEffect(() => {
    // Session oluştur
    const initSession = async () => {
      const session = await IVSBroadcast.createSession({
        rtmpUrl: 'rtmp://your-stream-url.com',
        streamKey: 'your-stream-key',
        videoConfig: {
          width: 1280,
          height: 720,
          bitrate: 2500000,
          fps: 30,
        },
      });
      setSessionId(session.sessionId);
    };

    initSession();

    // Event listener'ları ekle
    const cleanup = IVSBroadcast.addListener('onStateChanged', (state) => {
      setIsBroadcasting(state.isBroadcasting);
    });

    return () => {
      cleanup();
      if (sessionId) {
        IVSBroadcast.destroySession(sessionId);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <PreviewView
        sessionId={sessionId}
        aspectMode="fill"
        isMirrored={true}
        style={styles.preview}
      />
      
      <Button
        title={isBroadcasting ? 'Durdur' : 'Başlat'}
        onPress={() => {
          if (sessionId) {
            isBroadcasting
              ? IVSBroadcast.stopBroadcast(sessionId)
              : IVSBroadcast.startBroadcast(sessionId);
          }
        }}
      />
    </View>
  );
}
```

### PreviewView Component

```typescript
<PreviewView
  sessionId={sessionId}      // Zorunlu
  aspectMode="fill"          // 'fit' veya 'fill' (varsayılan: 'fill')
  isMirrored={true}          // Aynalama (varsayılan: true)
  style={{ flex: 1 }}
/>
```

## API

### Session Yönetimi

```typescript
// Session oluştur
const session = await IVSBroadcast.createSession({
  rtmpUrl: 'rtmp://...',
  streamKey: '...',
  videoConfig: { width: 1280, height: 720, bitrate: 2500000, fps: 30 },
  audioConfig: { bitrate: 128000, sampleRate: 44100 },
});

// Yayını başlat/durdur
await IVSBroadcast.startBroadcast(sessionId);
await IVSBroadcast.stopBroadcast(sessionId);

// Session'ı yok et
await IVSBroadcast.destroySession(sessionId);
```

### Kamera Kontrolü

```typescript
// Kamera değiştir (front/back arasında)
await IVSBroadcast.switchCamera(sessionId);

// Kamera pozisyonu ayarla
await IVSBroadcast.setCameraPosition(sessionId, 'front');
await IVSBroadcast.setCameraPosition(sessionId, 'back');

// Kamera listesinden belirli bir kamerayı seç
const devices = await IVSBroadcast.listAvailableDevices();
const cameras = devices.filter(d => d.type === 'camera');

// İstediğiniz kamerayı seçin
await IVSBroadcast.selectCamera(sessionId, cameras[0].deviceId);
```

### Mikrofon Kontrolü

```typescript
// Mikrofonu sessize al/aç
await IVSBroadcast.setMuted(sessionId, true);
await IVSBroadcast.setMuted(sessionId, false);

// Mikrofon durumunu kontrol et
const isMuted = await IVSBroadcast.isMuted(sessionId);

// Ses gain ayarla (0.0 = sessiz, 1.0 = normal, 2.0 = amplify)
await IVSBroadcast.setAudioGain(sessionId, 1.5);

// Mevcut gain seviyesini al
const gain = await IVSBroadcast.getAudioGain(sessionId);

// Mikrofon listesinden belirli bir mikrofonu seç
const devices = await IVSBroadcast.listAvailableDevices();
const microphones = devices.filter(d => d.type === 'microphone');

// İstediğiniz mikrofonu seçin
await IVSBroadcast.selectMicrophone(sessionId, microphones[0].deviceId);
```

### Gelişmiş Kamera Kontrolü

```typescript
// Zoom seviyesi ayarla
await IVSBroadcast.setCameraZoom(sessionId, 2.0);

// Flaşı aç/kapat
await IVSBroadcast.setTorchEnabled(sessionId, true);

// Kamera yeteneklerini al
const capabilities = await IVSBroadcast.getCameraCapabilities(sessionId);
console.log('Min zoom:', capabilities.minZoomFactor);
console.log('Max zoom:', capabilities.maxZoomFactor);
console.log('Torch supported:', capabilities.isTorchSupported);
```

### Cihaz Yönetimi

```typescript
// Kullanılabilir cihazları listele
const availableDevices = await IVSBroadcast.listAvailableDevices();
availableDevices.forEach(device => {
  console.log(`${device.type}: ${device.friendlyName}`);
});

// Bağlı cihazları listele
const attachedDevices = await IVSBroadcast.listAttachedDevices(sessionId);
```

### Zamanlı Metadata

```typescript
// Yayına senkronize metadata gönder
await IVSBroadcast.sendTimedMetadata(sessionId, JSON.stringify({
  timestamp: Date.now(),
  customData: 'your data'
}));
```

### Event Listener'lar

```typescript
// Durum değişiklikleri
IVSBroadcast.addListener('onStateChanged', (state) => {
  console.log('Broadcasting:', state.isBroadcasting);
});

// Hata yönetimi
IVSBroadcast.addListener('onError', (error) => {
  console.error('Error:', error.message);
});

// Network sağlık durumu (iOS)
IVSBroadcast.addListener('onNetworkHealth', (health) => {
  console.log('Quality:', health.networkQuality);
});

// İstatistikler
IVSBroadcast.addListener('onAudioStats', (stats) => {
  console.log('Audio bitrate:', stats.bitrate);
});

IVSBroadcast.addListener('onVideoStats', (stats) => {
  console.log('Video bitrate:', stats.bitrate, 'FPS:', stats.fps);
});

// Gelişmiş istatistikler (transmission stats)
IVSBroadcast.addListener('onTransmissionStatistics', (stats) => {
  console.log('Measured bitrate:', stats.measuredBitrate);
  console.log('Recommended bitrate:', stats.recommendedBitrate);
  console.log('RTT:', stats.rtt);
  console.log('Broadcast quality:', stats.broadcastQuality);
  console.log('Network health:', stats.networkHealth);
});

// Ses cihazı istatistikleri
IVSBroadcast.addListener('onAudioDeviceStats', (stats) => {
  console.log('Peak:', stats.peak, 'RMS:', stats.rms);
});
```

### Picture-in-Picture (PiP)

```typescript
// PiP desteğini kontrol et
const isSupported = await IVSBroadcast.isPictureInPictureSupported();
if (isSupported) {
  // PiP modunu başlat
  await IVSBroadcast.startPictureInPicture(sessionId);
  
  // PiP durumunu kontrol et
  const state = await IVSBroadcast.getPictureInPictureState(sessionId);
  console.log('PiP state:', state); // 'idle', 'active', 'stopped'
  
  // PiP modunu durdur
  await IVSBroadcast.stopPictureInPicture(sessionId);
}
```

**Notlar:**
- **iOS**: PiP desteği iOS 15.0+ gerektirir
- **Android**: PiP desteği Android 8.0 (API 26)+ gerektirir
- Android'de PiP için `AndroidManifest.xml` dosyanıza `android:supportsPictureInPicture="true"` eklemeniz gerekebilir

## Gereksinimler

- React Native >= 0.60.0
- Android: minSdkVersion 21 (PiP için API 26+)
- iOS: 11.0+ (PiP için iOS 15.0+)

## Lisans

MIT

## Destek

Sorunlarınız için [GitHub Issues](https://github.com/abdurrahman-dev/react-native-ivs-broadcast/issues) kullanabilirsiniz.
