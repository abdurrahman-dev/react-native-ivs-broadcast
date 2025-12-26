require "json"

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
  s.platforms    = { :ios => "11.0" }
  
  # Source tanımlaması - :path kullanıldığında CocoaPods bunu override eder ama podspec validation için gerekli
  # Local development için boş source, npm'den yüklendiğinde git source kullanılır
  # s.source = { :path => File.dirname(__dir__) }
  s.source = { :path => '../node_modules/@abdurrahman-dev/react-native-ivs-broadcast' }
  
  # Expo autolinking podspec'i bulduğunda, podspec'in bulunduğu dizinin parent'ını (package root) source olarak kullanır
  # Bu yüzden source_files path'i ios/ klasöründen başlamalı
  s.source_files = "ios/**/*.{h,m,mm,swift}"
  
  # Public headers (opsiyonel ama önerilir)
  s.public_header_files = "ios/**/*.h"
  s.requires_arc = true

  s.dependency "React-Core"
  s.dependency "AmazonIVSBroadcast", "1.37.0"
end

