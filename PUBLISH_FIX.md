# NPM Publish Sorun Giderme

## Sorun 1: Access Token Expired

Hata: `Access token expired or revoked. Please try logging in again.`

### Çözüm:

```bash
npm login
```

NPM kullanıcı adı, şifre ve email'inizi girin.

## Sorun 2: 404 Not Found

Hata: `404 Not Found - PUT https://registry.npmjs.org/react-native-ivs-broadcast`

Bu hata şu durumlardan kaynaklanabilir:

### Durum A: Paket Adı Zaten Alınmış

Paket adının müsait olup olmadığını kontrol edin:

```bash
npm view react-native-ivs-broadcast
```

Eğer paket zaten varsa, **scoped package** kullanın:

#### 1. package.json'ı Güncelleyin

```json
{
  "name": "@abdurrahman-dev/react-native-ivs-broadcast",
  ...
}
```

#### 2. Publish Edin

```bash
npm publish --access public
```

### Durum B: İlk Publish İçin Yetki Sorunu

Eğer paket yoksa ve ilk kez publish ediyorsanız:

1. **NPM hesabınızın doğrulandığından emin olun**:
   - Email doğrulaması yapılmış olmalı
   - 2FA aktifse, publish sırasında gerekli token'ı girin

2. **Paket adını kontrol edin**:
   ```bash
   npm search react-native-ivs-broadcast
   ```

3. **Scoped package kullanın** (önerilen):
   ```json
   "name": "@abdurrahman-dev/react-native-ivs-broadcast"
   ```

## Önerilen Çözüm: Scoped Package

Scoped package kullanmak daha güvenli ve profesyoneldir:

### 1. package.json Güncellemesi

```json
{
  "name": "@abdurrahman-dev/react-native-ivs-broadcast",
  "version": "0.1.0",
  ...
}
```

### 2. Publish

```bash
npm publish --access public
```

### 3. Kullanım

Example projede:

```json
{
  "dependencies": {
    "@abdurrahman-dev/react-native-ivs-broadcast": "^0.1.0"
  }
}
```

## Adım Adım Publish

### 1. NPM'e Login

```bash
npm login
```

### 2. Paketi Build Et

```bash
npm run build
```

### 3. Publish Et

**Scoped package için:**
```bash
npm publish --access public
```

**Normal package için:**
```bash
npm publish
```

### 4. Kontrol Et

```bash
npm view @abdurrahman-dev/react-native-ivs-broadcast
# veya
npm view react-native-ivs-broadcast
```

## Example Projede Kullanım

Publish sonrası:

```bash
cd example
npm install @abdurrahman-dev/react-native-ivs-broadcast@latest
# veya
npm install react-native-ivs-broadcast@latest
```

## Notlar

- Scoped package kullanmak önerilir (`@username/package-name`)
- İlk publish'ten sonra paket adını değiştiremezsiniz
- `--access public` flag'i scoped package'lar için gereklidir
- Email doğrulaması yapılmış olmalı

