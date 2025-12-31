# Bilinen Sorunlar ve Eksiklikler

## ✅ Düzeltilen Sorunlar

1. **addListener Return Type Hatası** - Düzeltildi
   - `addListener` metodu artık doğru şekilde cleanup fonksiyonu döndürüyor

2. **Android getDevices Metodu** - Düzeltildi
   - `listAvailableDevices` metodunun `DeviceDescriptor` döndürdüğü dikkate alınarak düzeltildi
   - Artık `attachDevice` metodu kullanılarak device'lar session'a ekleniyor

3. **Android ReadableMap Null Safety** - Düzeltildi
   - `hasKey` kontrolü ile güvenli değer okuma eklendi

4. **iOS Podspec Path Sorunu** - Düzeltildi
   - `source_files` path'i düzeltildi

5. **Android Build Gradle Fallback** - Düzeltildi
   - SDK version değerleri için fallback eklendi
   - Java 11 desteği eklendi

6. **iOS Device Yönetimi** - Düzeltildi
   - `attachDevice` ve `exchangeOldDevice` metodları kullanılıyor
   - Main thread dispatch eklendi

7. **Preview View Component** - Eklendi
   - Android ve iOS için native preview view eklendi
   - React Native `PreviewView` component'i oluşturuldu

## ⚠️ Potansiyel Sorunlar

### 1. Pause/Resume
- IVS SDK'da doğrudan pause/resume özelliği yok
- Şu an bu metodlar placeholder olarak çalışıyor

### 2. updateVideoConfig / updateAudioConfig
- IVS SDK session oluşturulduktan sonra config değişikliğine izin vermiyor
- Bu metodlar şu an sadece kabul ediyor ama değişiklik yapmıyor

## 📋 Eksik Özellikler

Aşağıdaki özellikler Amazon IVS Broadcast SDK'da mevcut ancak bu pakette henüz implement edilmemiştir:

### 1. Custom Video Sources
- **Android**: Custom `ImageDevice` veya `CameraDevice` desteği
- **iOS**: Custom video source desteği
- **Durum**: Eksik - Native modüllerden custom source ekleme API'leri eksik

### 3. Device Management API'leri
- `listAvailableDevices` - Mevcut cihazları listeleme
- `listActiveDevices` - Aktif cihazları listeleme
- `removeDevice` - Cihaz kaldırma
- **Durum**: Kısmen mevcut - Sadece internal kullanımda, public API olarak expose edilmemiş

### 4. Filters ve Effects
- Video filtreleri
- Audio efektleri
- **Durum**: Eksik - Native SDK'da mevcut ancak pakette implement edilmemiş

### 5. Screen Capture (Android)
- Screen recording desteği
- **Durum**: Eksik

## 📝 Notlar

- Paket temel broadcast işlevselliğini sağlıyor
- Preview view ve custom source gibi gelişmiş özellikler için ek implementasyon gerekli
- Native SDK dokümantasyonuna göre eksik özellikler eklenebilir
