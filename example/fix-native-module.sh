#!/bin/bash

# Native Modül Bağlantı Düzeltme Scripti
# Bu script, IVSBroadcastModule native modül hatasını çözmek için gerekli adımları uygular

set -e

echo "🔧 Native modül bağlantısı düzeltiliyor..."

# 1. Example dizinine git
cd "$(dirname "$0")"

echo "📦 1. Expo prebuild çalıştırılıyor..."
npx expo prebuild --clean

echo "🍎 2. iOS pod install çalıştırılıyor..."
cd ios
pod install
cd ..

echo "🧹 3. Metro cache temizleniyor..."
npx expo start --clear &
METRO_PID=$!

# Metro'nun başlamasını bekle
sleep 5

# Metro'yu durdur
kill $METRO_PID 2>/dev/null || true

echo "✅ Tamamlandı!"
echo ""
echo "Şimdi uygulamayı çalıştırabilirsiniz:"
echo "  npx expo run:ios"
echo "veya"
echo "  npx expo run:android"

