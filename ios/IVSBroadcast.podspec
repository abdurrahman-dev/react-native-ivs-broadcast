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
  s.platforms    = { :ios => "12.0" }
  
  s.source       = { :git => "https://github.com/abdurrahman-dev/react-native-ivs-broadcast.git"}
  
  # Podspec ios/ klasöründe, dosyalar da aynı klasörde
  s.source_files = "*.{h,m,mm,swift}"
  s.public_header_files = "*.h"
  s.requires_arc = true

  s.dependency "React-Core"
  s.dependency "AmazonIVSBroadcast", "~> 1.37.0"
end

