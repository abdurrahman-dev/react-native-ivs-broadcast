module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: "./android",
        packageImportPath:
          "import com.reactnativeivsbroadcast.IVSBroadcastPackage;",
        packageInstance: "new IVSBroadcastPackage()",
      },
      ios: {
        podspecPath: "./ios/IVSBroadcast.podspec",
      },
    },
  },
};
