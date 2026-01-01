import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Camera } from "expo-camera";

// IVS Broadcast modülünü import et
// Not: Native modül sadece development build'de çalışır
let IVSBroadcast = null;
let PreviewView = null;

try {
  const ivs = require("@abdurrahman-dev/react-native-ivs-broadcast");
  IVSBroadcast = ivs.default;
  PreviewView = ivs.PreviewView;
} catch (e) {
  console.log("IVS Broadcast modülü yüklenemedi:", e);
}

// Test için RTMP URL'i (kendi URL'inizi girin)
const TEST_RTMP_URL = "rtmp://your-ingest-server.com/live";
const TEST_STREAM_KEY = "your-stream-key";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraPosition, setCameraPosition] = useState("back");
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [error, setError] = useState(null);
  const [isModuleAvailable, setIsModuleAvailable] = useState(false);

  // İzinleri kontrol et
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } =
        await Camera.requestCameraPermissionsAsync();
      const { status: audioStatus } =
        await Camera.requestMicrophonePermissionsAsync();

      setHasPermission(cameraStatus === "granted" && audioStatus === "granted");

      // Modül kontrolü
      if (IVSBroadcast) {
        setIsModuleAvailable(true);
      }
    })();
  }, []);

  // Session oluştur
  const createSession = useCallback(async () => {
    if (!IVSBroadcast) {
      Alert.alert(
        "Uyarı",
        "IVS Broadcast modülü yüklü değil. Development build gerekiyor."
      );
      return;
    }

    try {
      setError(null);
      const session = await IVSBroadcast.createSession({
        rtmpUrl: TEST_RTMP_URL,
        streamKey: TEST_STREAM_KEY,
        videoConfig: {
          width: 1280,
          height: 720,
          bitrate: 2500000,
          fps: 30,
        },
        audioConfig: {
          bitrate: 128000,
          sampleRate: 44100,
          channels: 2,
        },
      });

      setSessionId(session.sessionId);
      console.log("Session oluşturuldu:", session.sessionId);
    } catch (e) {
      setError(e.message);
      Alert.alert("Hata", `Session oluşturulamadı: ${e.message}`);
    }
  }, []);

  // Event listener'ları ayarla
  useEffect(() => {
    if (!IVSBroadcast || !sessionId) return;

    const stateCleanup = IVSBroadcast.addListener("onStateChanged", (state) => {
      console.log("State değişti:", state);
      setIsBroadcasting(state.isBroadcasting);
    });

    const errorCleanup = IVSBroadcast.addListener("onError", (err) => {
      console.error("Broadcast hatası:", err);
      setError(err.message);
    });

    const networkCleanup = IVSBroadcast.addListener(
      "onNetworkHealth",
      (health) => {
        setNetworkQuality(health.networkQuality);
      }
    );

    return () => {
      stateCleanup();
      errorCleanup();
      networkCleanup();
    };
  }, [sessionId]);

  // Yayını başlat/durdur
  const toggleBroadcast = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      if (isBroadcasting) {
        await IVSBroadcast.stopBroadcast(sessionId);
      } else {
        await IVSBroadcast.startBroadcast(sessionId);
      }
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId, isBroadcasting]);

  // Kamera değiştir
  const switchCamera = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      await IVSBroadcast.switchCamera(sessionId);
      setCameraPosition((prev) => (prev === "front" ? "back" : "front"));
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId]);

  // Mikrofon aç/kapat
  const toggleMute = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      const newMuted = !isMuted;
      await IVSBroadcast.setMuted(sessionId, newMuted);
      setIsMuted(newMuted);
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId, isMuted]);

  // Session'ı temizle
  const destroySession = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      await IVSBroadcast.destroySession(sessionId);
      setSessionId(null);
      setIsBroadcasting(false);
    } catch (e) {
      console.error("Session yok edilemedi:", e);
    }
  }, [sessionId]);

  // İzin yok
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>İzinler kontrol ediliyor...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Kamera ve mikrofon izni gerekli</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Preview Area */}
      <View style={styles.previewContainer}>
        {sessionId && PreviewView ? (
          <PreviewView
            sessionId={sessionId}
            aspectMode="fill"
            isMirrored={cameraPosition === "front"}
            style={styles.preview}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              {isModuleAvailable
                ? "Session oluşturmak için butona tıklayın"
                : "IVS Modülü yüklü değil\nDevelopment build gerekiyor"}
            </Text>
          </View>
        )}

        {/* Status Overlay */}
        <View style={styles.statusOverlay}>
          {isBroadcasting && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CANLI</Text>
            </View>
          )}
          {networkQuality !== "unknown" && (
            <Text style={styles.networkText}>Ağ: {networkQuality}</Text>
          )}
        </View>

        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!sessionId ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={createSession}
          >
            <Text style={styles.buttonText}>Session Oluştur</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  isBroadcasting ? styles.stopButton : styles.startButton,
                ]}
                onPress={toggleBroadcast}
              >
                <Text style={styles.buttonText}>
                  {isBroadcasting ? "Yayını Durdur" : "Yayını Başlat"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={switchCamera}
              >
                <Text style={styles.buttonText}>
                  Kamera ({cameraPosition === "front" ? "Ön" : "Arka"})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.secondaryButton,
                  isMuted && styles.mutedButton,
                ]}
                onPress={toggleMute}
              >
                <Text style={styles.buttonText}>
                  {isMuted ? "🔇 Kapalı" : "🎤 Açık"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.destroyButton]}
              onPress={destroySession}
            >
              <Text style={styles.buttonText}>Session'ı Kapat</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.infoText}>
          Platform: {Platform.OS} | Session: {sessionId ? "Aktif" : "Yok"}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  previewContainer: {
    flex: 1,
    position: "relative",
  },
  preview: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#666",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  statusOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  liveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  networkText: {
    color: "#fff",
    fontSize: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  errorOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: "#fff",
    fontSize: 12,
  },
  controls: {
    padding: 16,
    gap: 12,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#6366f1",
  },
  startButton: {
    backgroundColor: "#10b981",
  },
  stopButton: {
    backgroundColor: "#dc2626",
  },
  secondaryButton: {
    backgroundColor: "#374151",
  },
  mutedButton: {
    backgroundColor: "#7c3aed",
  },
  destroyButton: {
    backgroundColor: "#4b5563",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  info: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoText: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
  },
  text: {
    color: "#fff",
    fontSize: 16,
  },
});
