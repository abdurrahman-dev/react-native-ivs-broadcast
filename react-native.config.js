module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: "./android/",
        packageImportPath:
          "import com.reactnativeivsbroadcast.IVSBroadcastPackage;",
      },
      ios: {
        podspecPath: "./ios/IVSBroadcast.podspec",
      },
    },
  },
};
