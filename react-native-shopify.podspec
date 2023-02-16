require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name         = "RNShopify"
  s.version      = package['version']
  s.summary      = package['description']
  s.license      = package['license']

  s.authors      = package['author']
  s.homepage     = package['homepage']
  s.platforms    = { :ios => "12.0" }

  s.source       = { :git => "https://github.com/shoutem/react-native-shopify.git", :tag => "v#{s.version}" }
  s.source_files  = 'ios/*.{swift,h,m}'

  s.dependency 'React-Core'
  s.dependency 'Mobile-Buy-SDK', '8.0.0'
end
