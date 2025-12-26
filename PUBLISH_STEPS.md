# NPM Publish Adımları

## 1. NPM'e Login

```bash
npm login
```

Kullanıcı adı, şifre ve email'inizi girin.

## 2. Paketi Build Et

```bash
npm run build
```

## 3. Publish Et

Scoped package kullandığımız için `--access public` flag'i gereklidir:

```bash
npm publish --access public
```

## 4. Kontrol Et

```bash
npm view @abdurrahman-dev/react-native-ivs-broadcast
```

## Example Projede Kullanım

Publish sonrası example projede:

```bash
cd example
npm install @abdurrahman-dev/react-native-ivs-broadcast@latest
npx expo prebuild --clean
cd ios && pod install && cd ..
npx expo run:ios
```

## Sorun Giderme

### "Access token expired"

```bash
npm login
```

### "404 Not Found"

Scoped package kullanıyoruz, bu sorun olmamalı. Eğer hala sorun varsa:

1. Email doğrulaması yapıldığından emin olun
2. 2FA aktifse, token'ı girin
3. Paket adının doğru olduğundan emin olun: `@abdurrahman-dev/react-native-ivs-broadcast`

### "Package name already exists"

Scoped package kullandığımız için bu sorun olmamalı. Eğer olursa, versiyonu artırın veya farklı bir scope kullanın.

