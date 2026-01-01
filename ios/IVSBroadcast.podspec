require "json"

# Podspec ios/ klasöründe olduğu için, package.json'ı parent directory'den okur
package = JSON.parse(File.read(File.join(__dir__, "../package.json")))

Pod::Spec.new do |s|
  s.name         = "IVSBroadcast"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  React Native bridge for Amazon IVS Broadcast SDK
                  DESC
  s.homepage     = "https://github.com/abdurrahman-dev/react-native-ivs-broadcast"
  s.license      = "MIT"
  s.author       = { "author" => "" }
  s.platforms    = { :ios => "12.0" }
  
  # Podspec ios/ klasöründe olduğu için, source parent directory'ye (package root) işaret eder
  # React Native autolinking bunu node_modules/@abdurrahman-dev/react-native-ivs-broadcast/ios/IVSBroadcast.podspec
  # olarak bulur. Podspec çalıştığında __dir__ = ios/ klasörü olur, File.dirname(__dir__) = package root olur
  s.source       = { :path => File.dirname(__dir__) }
  
  # Source path package root olduğu için, ios/ klasöründeki dosyalara ios/ prefix ile erişilir
  # Bu pattern hem React Native hem de Expo projelerinde çalışır
  s.source_files = "ios/*.{h,m,mm,swift}"
  s.public_header_files = "ios/*.h"
  s.requires_arc = true

  # React Native dependency
  s.dependency "React-Core"
  
  # Amazon IVS Broadcast SDK dependency
  # Bu dependency otomatik olarak CocoaPods repository'sinden indirilir
  s.dependency "AmazonIVSBroadcast", "~> 1.37.0"
end

