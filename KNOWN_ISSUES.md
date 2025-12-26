# Bilinen Sorunlar ve Eksiklikler

## ✅ Düzeltilen Sorunlar

1. **addListener Return Type Hatası** - Düzeltildi
   - `addListener` metodu artık doğru şekilde cleanup fonksiyonu döndürüyor

2. **Android getDevices Metodu** - Düzeltildi
   - `listAvailableDevices` metodunun `DeviceDescriptor` döndürdüğü dikkate alınarak düzeltildi
   - Artık `addDevice` metodu kullanılarak device'lar session'a ekleniyor

## ⚠️ Potansiyel Sorunlar

### 1. Android Native Modül
- `listAvailableDevices` metodunun döndürdüğü tip kontrol edilmeli
- `addDevice` metodunun null döndürebileceği durumlar handle edilmeli
- Session başlatılmadan önce device'ların eklenmesi gerekebilir

### 2. iOS Native Modül
- `startWithURL` metodunun doğru kullanımı kontrol edilmeli
- Device yönetimi iOS'ta farklı olabilir

## 📋 Eksik Özellikler

Aşağıdaki özellikler Amazon IVS Broadcast SDK'da mevcut ancak bu pakette henüz implement edilmemiştir:

### 1. Preview View Component
- **Android**: `BroadcastSession` preview view desteği
- **iOS**: `IVSPreviewView` component desteği
- **Durum**: Eksik - React Native View component olarak implement edilmeli

### 2. Custom Video Sources
- **Android**: Custom `ImageDevice` veya `CameraDevice` desteği
- **iOS**: Custom video source desteği
- **Durum**: Eksik - Native modüllerden custom source ekleme API'leri eksik

### 3. Device Management API'leri
- `listAvailableDevices` - Mevcut cihazları listeleme
- `listActiveDevices` - Aktif cihazları listeleme
- `removeDevice` - Cihaz kaldırma
- **Durum**: Kısmen mevcut - Sadece internal kullanımda, public API olarak expose edilmemiş

### 4. Advanced Video Configuration
- Video encoder seçimi (hardware/software)
- Keyframe interval ayarları
- **Durum**: Kısmen mevcut - Sadece temel ayarlar

### 5. Audio Configuration
- Audio device seçimi
- Audio mixing
- **Durum**: Kısmen mevcut - Sadece temel ayarlar

### 6. Filters ve Effects
- Video filtreleri
- Audio efektleri
- **Durum**: Eksik - Native SDK'da mevcut ancak pakette implement edilmemiş

### 7. Screen Capture (Android)
- Screen recording desteği
- **Durum**: Eksik

### 8. Multi-session Support
- Birden fazla session'ın aynı anda yönetilmesi
- **Durum**: Mevcut - Session ID bazlı yönetim var

## 🔍 Test Edilmesi Gerekenler

1. **Android**:
   - [ ] Session oluşturma ve başlatma
   - [ ] Kamera değiştirme
   - [ ] Mikrofon kontrolü
   - [ ] Network health monitoring
   - [ ] Error handling

2. **iOS**:
   - [ ] Session oluşturma ve başlatma
   - [ ] Kamera değiştirme
   - [ ] Mikrofon kontrolü
   - [ ] Network health monitoring
   - [ ] Error handling

3. **Genel**:
   - [ ] Event listener'ların doğru çalışması
   - [ ] Memory leak kontrolü
   - [ ] Session cleanup
   - [ ] Concurrent session yönetimi

## 📝 Notlar

- Paket temel broadcast işlevselliğini sağlıyor
- Preview view ve custom source gibi gelişmiş özellikler için ek implementasyon gerekli
- Native SDK dokümantasyonuna göre eksik özellikler eklenebilir

