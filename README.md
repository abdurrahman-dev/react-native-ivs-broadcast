# @abdurrahman-dev/react-native-ivs-broadcast

React Native için Amazon Interactive Video Service (IVS) Broadcast SDK köprü paketi. Bu paket, Amazon IVS Broadcast SDK'nın native yeteneklerini React Native projelerinde kullanmanızı sağlar.

## Özellikler

- ✅ Android 1.37.1 ve iOS 1.37.0 desteği
- ✅ Broadcast başlatma/durdurma/duraklatma/devam ettirme
- ✅ **Preview View** - Kamera önizleme component'i
- ✅ Kamera kontrolü (ön/arka kamera değiştirme)
- ✅ Mikrofon kontrolü (sessize alma/açma)
- ✅ Video ve ses konfigürasyonu
- ✅ Network health monitoring
- ✅ Real-time istatistikler (audio/video stats)
- ✅ Event-based API

## Kurulum

### npm

```bash
npm install @abdurrahman-dev/react-native-ivs-broadcast
```

### yarn

```bash
yarn add @abdurrahman-dev/react-native-ivs-broadcast
```

## Platform Kurulumu

### Android

1. `android/app/build.gradle` dosyanıza aşağıdaki bağımlılığı ekleyin:

```gradle
dependencies {
    implementation 'com.amazonaws:ivs-broadcast:1.37.1:stages@aar'
}
```

2. `android/build.gradle` dosyanıza `mavenCentral()` repository'sini ekleyin:

```gradle
allprojects {
    repositories {
        mavenCentral()
        // ... diğer repository'ler
    }
}
```

3. `AndroidManifest.xml` dosyanıza gerekli izinleri ekleyin (paket içinde zaten mevcut):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
```

### iOS

1. `ios/Podfile` dosyanıza aşağıdaki satırı ekleyin:

```ruby
pod 'AmazonIVSBroadcast', '1.37.0'
```

2. Pod'ları yükleyin:

```bash
cd ios && pod install && cd ..
```

3. `Info.plist` dosyanıza kamera ve mikrofon izinlerini ekleyin:

```xml
<key>NSCameraUsageDescription</key>
<string>Kamerayı kullanmak için izin gerekiyor</string>
<key>NSMicrophoneUsageDescription</key>
<string>Mikrofonu kullanmak için izin gerekiyor</string>
```

## Kullanım

### Temel Kullanım

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
        audioConfig: {
          bitrate: 128000,
          sampleRate: 44100,
          channels: 2,
        },
      });
      setSessionId(session.sessionId);
    };

    initSession();

    // Event listener'ları ekle
    const stateCleanup = IVSBroadcast.addListener('onStateChanged', (state) => {
      console.log('Broadcast state:', state);
      setIsBroadcasting(state.isBroadcasting);
    });

    const errorCleanup = IVSBroadcast.addListener('onError', (error) => {
      console.error('Broadcast error:', error);
    });

    // Cleanup
    return () => {
      stateCleanup();
      errorCleanup();
      if (sessionId) {
        IVSBroadcast.destroySession(sessionId);
      }
    };
  }, []);

  const handleStartStop = async () => {
    if (!sessionId) return;
    
    if (isBroadcasting) {
      await IVSBroadcast.stopBroadcast(sessionId);
    } else {
      await IVSBroadcast.startBroadcast(sessionId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Kamera Preview */}
      <PreviewView
        sessionId={sessionId}
        aspectMode="fill"
        isMirrored={true}
        style={styles.preview}
      />
      
      <View style={styles.controls}>
        <Button
          title={isBroadcasting ? 'Yayını Durdur' : 'Yayını Başlat'}
          onPress={handleStartStop}
        />
        <Button
          title="Kamera Değiştir"
          onPress={() => sessionId && IVSBroadcast.switchCamera(sessionId)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: { flex: 1 },
  controls: { padding: 20, gap: 10 },
});
```

### PreviewView Component

Yayıncının kamera görüntüsünü önizlemek için kullanılır.

```typescript
import { PreviewView } from '@abdurrahman-dev/react-native-ivs-broadcast';

<PreviewView
  sessionId={sessionId}      // Broadcast session ID (zorunlu)
  aspectMode="fill"          // 'fit' veya 'fill' (varsayılan: 'fill')
  isMirrored={true}          // Görüntüyü aynala (varsayılan: true)
  style={{ flex: 1 }}        // View stili
/>
```

**Props:**
- `sessionId` (string, zorunlu): `createSession` ile oluşturulan session ID
- `aspectMode` ('fit' | 'fill', opsiyonel): Görüntü sığdırma modu
- `isMirrored` (boolean, opsiyonel): Ön kamera için aynalama (varsayılan: true)
- `style` (ViewStyle, opsiyonel): Container view stili

### API Referansı

#### `createSession(config: IVSBroadcastConfig): Promise<IVSBroadcastSession>`

Yeni bir broadcast session oluşturur.

**Parametreler:**
- `config.rtmpUrl` (string, zorunlu): RTMP stream URL'i
- `config.streamKey` (string, opsiyonel): Stream key
- `config.videoConfig` (VideoConfig, opsiyonel): Video konfigürasyonu
- `config.audioConfig` (AudioConfig, opsiyonel): Audio konfigürasyonu

**Dönen değer:** `{ sessionId: string }`

#### `startBroadcast(sessionId: string): Promise<void>`

Broadcast'i başlatır.

#### `stopBroadcast(sessionId: string): Promise<void>`

Broadcast'i durdurur.

#### `pauseBroadcast(sessionId: string): Promise<void>`

Broadcast'i duraklatır.

#### `resumeBroadcast(sessionId: string): Promise<void>`

Duraklatılmış broadcast'i devam ettirir.

#### `destroySession(sessionId: string): Promise<void>`

Session'ı yok eder ve kaynakları temizler.

#### `getState(sessionId: string): Promise<BroadcastState>`

Broadcast durumunu alır.

**Dönen değer:**
```typescript
{
  isBroadcasting: boolean;
  isPaused: boolean;
  error?: string;
}
```

#### `switchCamera(sessionId: string): Promise<void>`

Kamerayı değiştirir (ön ↔ arka).

#### `setCameraPosition(sessionId: string, position: 'front' | 'back'): Promise<void>`

Kamera pozisyonunu ayarlar.

#### `setMuted(sessionId: string, muted: boolean): Promise<void>`

Mikrofonu sessize alır veya açar.

#### `isMuted(sessionId: string): Promise<boolean>`

Mikrofonun sessize alınıp alınmadığını kontrol eder.

#### `updateVideoConfig(sessionId: string, config: VideoConfig): Promise<void>`

Video konfigürasyonunu günceller.

#### `updateAudioConfig(sessionId: string, config: AudioConfig): Promise<void>`

Audio konfigürasyonunu günceller.

### Event Listener'lar

#### `onStateChanged`

Broadcast durumu değiştiğinde tetiklenir.

```typescript
IVSBroadcast.addListener('onStateChanged', (state: BroadcastState) => {
  console.log('State:', state);
});
```

#### `onError`

Hata oluştuğunda tetiklenir.

```typescript
IVSBroadcast.addListener('onError', (error: { message: string; code?: string }) => {
  console.error('Error:', error);
});
```

#### `onNetworkHealth`

Network sağlık durumu güncellendiğinde tetiklenir.

```typescript
IVSBroadcast.addListener('onNetworkHealth', (health: NetworkHealth) => {
  console.log('Network quality:', health.networkQuality);
  console.log('Uplink bandwidth:', health.uplinkBandwidth);
  console.log('RTT:', health.rtt);
});
```

#### `onAudioStats`

Audio istatistikleri güncellendiğinde tetiklenir.

```typescript
IVSBroadcast.addListener('onAudioStats', (stats: AudioStats) => {
  console.log('Audio bitrate:', stats.bitrate);
  console.log('Sample rate:', stats.sampleRate);
});
```

#### `onVideoStats`

Video istatistikleri güncellendiğinde tetiklenir.

```typescript
IVSBroadcast.addListener('onVideoStats', (stats: VideoStats) => {
  console.log('Video bitrate:', stats.bitrate);
  console.log('FPS:', stats.fps);
  console.log('Resolution:', stats.width, 'x', stats.height);
});
```

### Listener'ları Temizleme

```typescript
// Belirli bir listener'ı kaldır
IVSBroadcast.removeListener('onStateChanged', callback);

// Tüm listener'ları kaldır
IVSBroadcast.removeAllListeners();
```

## Type Definitions

Paket TypeScript desteği ile birlikte gelir. Tüm type tanımlamaları `types.ts` dosyasında bulunur.

## Gereksinimler

- React Native >= 0.60.0
- Android: minSdkVersion 21
- iOS: 11.0+

## Lisans

MIT

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermeden önce mevcut kod stilini takip ettiğinizden emin olun.

## Destek

Sorunlarınız için GitHub Issues kullanabilirsiniz.

