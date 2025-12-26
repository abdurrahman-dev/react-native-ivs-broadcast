# NPM Publish Kılavuzu

Bu kılavuz, `react-native-ivs-broadcast` paketini npm'e yayınlamak için gereken adımları içerir.

## Ön Hazırlık

### 1. NPM Hesabı

Eğer npm hesabınız yoksa:
```bash
npm adduser
```

Eğer npm hesabınız varsa:
```bash
npm login
```

### 2. Paket Bilgilerini Güncelleyin

`package.json` dosyasında şu alanları güncelleyin:
- `author`: Kendi adınız ve email'iniz
- `repository.url`: GitHub repository URL'iniz
- `bugs.url`: Issues sayfası URL'iniz
- `homepage`: Proje ana sayfası URL'iniz

### 3. Paketi Build Edin

```bash
npm run build
```

Bu komut TypeScript dosyalarını `lib/` klasörüne derler.

## NPM'e Publish Etme

### 1. Paket Adını Kontrol Edin

Paket adının benzersiz olduğundan emin olun:
```bash
npm view react-native-ivs-broadcast
```

Eğer paket zaten varsa, `package.json`'da `name` alanını değiştirin veya scoped package kullanın:
```json
"name": "@yourusername/react-native-ivs-broadcast"
```

### 2. Versiyonu Kontrol Edin

Mevcut versiyonu kontrol edin:
```bash
npm view react-native-ivs-broadcast version
```

Yeni versiyon için `package.json`'da `version` alanını güncelleyin (örn: "1.0.1").

### 3. Publish Edin

```bash
npm publish
```

Scoped package kullanıyorsanız:
```bash
npm publish --access public
```

### 4. Publish Sonrası Kontrol

```bash
npm view react-native-ivs-broadcast
```

## Example Projede Kullanım

### 1. Example Projede Paketi Yükleyin

```bash
cd example
npm install react-native-ivs-broadcast@latest
```

### 2. Native Modülleri Link Edin

```bash
npx expo prebuild --clean
cd ios && pod install && cd ..
```

### 3. Uygulamayı Çalıştırın

```bash
npx expo run:ios
# veya
npx expo run:android
```

## Versiyon Güncelleme

Yeni bir versiyon yayınlamak için:

### 1. Versiyonu Artırın

`package.json`'da versiyonu güncelleyin:
- Patch: `1.0.0` → `1.0.1` (bug fix)
- Minor: `1.0.0` → `1.1.0` (yeni özellik)
- Major: `1.0.0` → `2.0.0` (breaking change)

### 2. Changelog Oluşturun

`CHANGELOG.md` dosyası oluşturun ve değişiklikleri dokümante edin.

### 3. Git Tag Oluşturun

```bash
git add .
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
```

### 4. Publish Edin

```bash
npm run build
npm publish
```

## Scoped Package Kullanımı (Opsiyonel)

Eğer paket adı zaten alınmışsa, scoped package kullanabilirsiniz:

### package.json Güncellemesi

```json
{
  "name": "@yourusername/react-native-ivs-broadcast",
  ...
}
```

### Publish

```bash
npm publish --access public
```

### Kullanım

```bash
npm install @yourusername/react-native-ivs-broadcast
```

## Notlar

- İlk publish'ten sonra paket adını değiştiremezsiniz
- Versiyon numaraları artırılmalıdır (düşürülemez)
- `npm unpublish` komutu 72 saat içinde kullanılabilir
- Paket yayınlandıktan sonra herkes tarafından kullanılabilir

## Sorun Giderme

### "Package name already exists"

Paket adı zaten alınmış. Scoped package kullanın veya farklı bir isim seçin.

### "You do not have permission"

NPM hesabınıza login olun:
```bash
npm login
```

### "Invalid package name"

Paket adı npm kurallarına uymalıdır:
- Küçük harf
- Tire (-) kullanılabilir
- Özel karakter yok

