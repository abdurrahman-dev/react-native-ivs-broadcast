require "json"

package = JSON.parse(File.read(File.join(__dir__, "../package.json")))

Pod::Spec.new do |s|
  s.name         = "IVSBroadcast"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  React Native bridge for Amazon IVS Broadcast SDK
                  DESC
  s.homepage     = "https://github.com/yourusername/react-native-ivs-broadcast"
  s.license      = "MIT"
  s.author       = { "author" => "author@example.com" }
  s.platforms    = { :ios => "11.0" }
  s.source       = { :git => "https://github.com/yourusername/react-native-ivs-broadcast.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.requires_arc = true

  s.dependency "React-Core"
  s.dependency "AmazonIVSBroadcast", "1.37.0"
end

