import { StatusBar } from "expo-status-bar";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Camera } from "expo-camera";
import IVSBroadcast, {
  PreviewView,
} from "@abdurrahman-dev/react-native-ivs-broadcast";

// Test için RTMP URL'i (kendi URL'inizi girin)
const TEST_RTMP_URL =
  "rtmps://aee2ea1e415f.global-contribute.live-video.net:443/app/";
const TEST_STREAM_KEY =
  "sk_us-east-1_AgMQtNtDJc6B_B1MGDroLDz2IGh9qZap61Twl405HSW";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraPosition, setCameraPosition] = useState("back");
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [error, setError] = useState(null);
  const [isModuleAvailable, setIsModuleAvailable] = useState(false);

  // Yeni özellikler için state'ler
  const [availableDevices, setAvailableDevices] = useState([]);
  const [attachedDevices, setAttachedDevices] = useState([]);
  const [cameraCapabilities, setCameraCapabilities] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [audioGain, setAudioGain] = useState(1.0);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipState, setPipState] = useState("idle");
  const [transmissionStats, setTransmissionStats] = useState(null);
  const [audioDeviceStats, setAudioDeviceStats] = useState(null);
  const [videoStats, setVideoStats] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [deviceSelectorType, setDeviceSelectorType] = useState("camera"); // "camera" | "microphone"

  const previewRef = useRef(null);

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

        // PiP desteğini kontrol et
        try {
          const supported = await IVSBroadcast.isPictureInPictureSupported();
          setPipSupported(supported);
        } catch (e) {
          console.log("PiP kontrolü başarısız:", e);
        }
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

      // Cihazları yükle
      await loadDevices();
      await loadCameraCapabilities();
    } catch (e) {
      setError(e.message);
      Alert.alert("Hata", `Session oluşturulamadı: ${e.message}`);
    }
  }, []);

  // Cihazları yükle
  const loadDevices = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      const devices = await IVSBroadcast.listAvailableDevices();
      setAvailableDevices(devices);

      const attached = await IVSBroadcast.listAttachedDevices(sessionId);
      setAttachedDevices(attached);
    } catch (e) {
      console.error("Cihazlar yüklenemedi:", e);
    }
  }, [sessionId]);

  // Kamera yeteneklerini yükle
  const loadCameraCapabilities = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      const capabilities = await IVSBroadcast.getCameraCapabilities(sessionId);
      setCameraCapabilities(capabilities);
      setZoomLevel(1.0);
      setTorchEnabled(false);
    } catch (e) {
      console.error("Kamera yetenekleri yüklenemedi:", e);
    }
  }, [sessionId]);

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

    const transmissionCleanup = IVSBroadcast.addListener(
      "onTransmissionStatistics",
      (stats) => {
        setTransmissionStats(stats);
      }
    );

    const audioDeviceStatsCleanup = IVSBroadcast.addListener(
      "onAudioDeviceStats",
      (stats) => {
        setAudioDeviceStats(stats);
      }
    );

    const videoStatsCleanup = IVSBroadcast.addListener(
      "onVideoStats",
      (stats) => {
        setVideoStats(stats);
      }
    );

    return () => {
      stateCleanup();
      errorCleanup();
      networkCleanup();
      transmissionCleanup();
      audioDeviceStatsCleanup();
      videoStatsCleanup();
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
      await loadCameraCapabilities();
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId, loadCameraCapabilities]);

  // Kamera seç
  const selectCamera = useCallback(
    async (deviceId) => {
      if (!IVSBroadcast || !sessionId) return;

      try {
        await IVSBroadcast.selectCamera(sessionId, deviceId);
        await loadDevices();
        await loadCameraCapabilities();
        setShowDeviceSelector(false);
      } catch (e) {
        Alert.alert("Hata", e.message);
      }
    },
    [sessionId, loadDevices, loadCameraCapabilities]
  );

  // Mikrofon seç
  const selectMicrophone = useCallback(
    async (deviceId) => {
      if (!IVSBroadcast || !sessionId) return;

      try {
        await IVSBroadcast.selectMicrophone(sessionId, deviceId);
        await loadDevices();
        setShowDeviceSelector(false);
      } catch (e) {
        Alert.alert("Hata", e.message);
      }
    },
    [sessionId, loadDevices]
  );

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

  // Zoom ayarla
  const setZoom = useCallback(
    async (factor) => {
      if (!IVSBroadcast || !sessionId || !cameraCapabilities) return;

      const clamped = Math.max(
        cameraCapabilities.minZoomFactor,
        Math.min(factor, cameraCapabilities.maxZoomFactor)
      );

      try {
        await IVSBroadcast.setCameraZoom(sessionId, clamped);
        setZoomLevel(clamped);
      } catch (e) {
        Alert.alert("Hata", e.message);
      }
    },
    [sessionId, cameraCapabilities]
  );

  // Flaş aç/kapat
  const toggleTorch = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      const newState = !torchEnabled;
      await IVSBroadcast.setTorchEnabled(sessionId, newState);
      setTorchEnabled(newState);
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId, torchEnabled]);

  // Ses gain ayarla
  const setGain = useCallback(
    async (gain) => {
      if (!IVSBroadcast || !sessionId) return;

      const clamped = Math.max(0, Math.min(2, gain));

      try {
        await IVSBroadcast.setAudioGain(sessionId, clamped);
        setAudioGain(clamped);
      } catch (e) {
        Alert.alert("Hata", e.message);
      }
    },
    [sessionId]
  );

  // Picture-in-Picture başlat
  const startPiP = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      await IVSBroadcast.startPictureInPicture(sessionId);
      const state = await IVSBroadcast.getPictureInPictureState(sessionId);
      setPipState(state);
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId]);

  // Picture-in-Picture durdur
  const stopPiP = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      await IVSBroadcast.stopPictureInPicture(sessionId);
      setPipState("stopped");
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId]);

  // Zamanlı metadata gönder
  const sendMetadata = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      const metadata = JSON.stringify({
        timestamp: Date.now(),
        message: "Test metadata",
        customData: "Example data",
      });
      await IVSBroadcast.sendTimedMetadata(sessionId, metadata);
      Alert.alert("Başarılı", "Metadata gönderildi");
    } catch (e) {
      Alert.alert("Hata", e.message);
    }
  }, [sessionId]);

  // Session'ı temizle
  const destroySession = useCallback(async () => {
    if (!IVSBroadcast || !sessionId) return;

    try {
      await IVSBroadcast.destroySession(sessionId);
      setSessionId(null);
      setIsBroadcasting(false);
      setCameraCapabilities(null);
      setAvailableDevices([]);
      setAttachedDevices([]);
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

  const cameras = availableDevices.filter((d) => d.type === "camera");
  const microphones = availableDevices.filter((d) => d.type === "microphone");
  const selectedDevices =
    deviceSelectorType === "camera" ? cameras : microphones;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Preview Area */}
      <View style={styles.previewContainer}>
        {sessionId && PreviewView ? (
          <PreviewView
            ref={previewRef}
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

        {/* <View style={styles.statusOverlay}>
          {isBroadcasting && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>CANLI</Text>
            </View>
          )}
          {networkQuality !== "unknown" && (
            <Text style={styles.networkText}>Ağ: {networkQuality}</Text>
          )}
          {transmissionStats && (
            <Text style={styles.statsText}>
              Bitrate: {Math.round(transmissionStats.measuredBitrate / 1000)}k
            </Text>
          )}
        </View> */}

        {error && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <ScrollView style={styles.controls} showsVerticalScrollIndicator={false}>
        {!sessionId ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={createSession}
          >
            <Text style={styles.buttonText}>Session Oluştur</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Temel Kontroller */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Temel Kontroller</Text>
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
            </View>

            {/* Cihaz Seçimi */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cihaz Seçimi</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setDeviceSelectorType("camera");
                    setShowDeviceSelector(true);
                  }}
                >
                  <Text style={styles.buttonText}>📷 Kamera Seç</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setDeviceSelectorType("microphone");
                    setShowDeviceSelector(true);
                  }}
                >
                  <Text style={styles.buttonText}>🎤 Mikrofon Seç</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Gelişmiş Kamera Kontrolleri */}
            {cameraCapabilities && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Kamera Kontrolleri</Text>

                {/* Zoom */}
                <View style={styles.controlRow}>
                  <Text style={styles.controlLabel}>
                    Zoom: {zoomLevel.toFixed(1)}x
                  </Text>
                  <View style={styles.sliderContainer}>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => setZoom(zoomLevel - 0.5)}
                    >
                      <Text style={styles.sliderButtonText}>-</Text>
                    </TouchableOpacity>
                    <View style={styles.sliderTrack}>
                      <View
                        style={[
                          styles.sliderFill,
                          {
                            width: `${
                              ((zoomLevel - cameraCapabilities.minZoomFactor) /
                                (cameraCapabilities.maxZoomFactor -
                                  cameraCapabilities.minZoomFactor)) *
                              100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => setZoom(zoomLevel + 0.5)}
                    >
                      <Text style={styles.sliderButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Flaş */}
                {cameraCapabilities.isTorchSupported && (
                  <View style={styles.controlRow}>
                    <Text style={styles.controlLabel}>Flaş</Text>
                    <Switch
                      value={torchEnabled}
                      onValueChange={toggleTorch}
                      trackColor={{ false: "#767577", true: "#81b0ff" }}
                      thumbColor={torchEnabled ? "#f5dd4b" : "#f4f3f4"}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Ses Kontrolleri */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ses Kontrolleri</Text>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>
                  Gain: {audioGain.toFixed(1)} (0.0 - 2.0)
                </Text>
                <View style={styles.sliderContainer}>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => setGain(audioGain - 0.1)}
                  >
                    <Text style={styles.sliderButtonText}>-</Text>
                  </TouchableOpacity>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${(audioGain / 2) * 100}%` },
                      ]}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.sliderButton}
                    onPress={() => setGain(audioGain + 0.1)}
                  >
                    <Text style={styles.sliderButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Picture-in-Picture */}
            {pipSupported && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Picture-in-Picture</Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={startPiP}
                    disabled={pipState === "active"}
                  >
                    <Text style={styles.buttonText}>PiP Başlat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={stopPiP}
                    disabled={pipState !== "active"}
                  >
                    <Text style={styles.buttonText}>PiP Durdur</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.infoText}>Durum: {pipState}</Text>
              </View>
            )}

            {/* İstatistikler */}
            <View style={styles.section}>
              <TouchableOpacity
                onPress={() => setShowAdvancedControls(!showAdvancedControls)}
              >
                <Text style={styles.sectionTitle}>
                  {showAdvancedControls ? "▼" : "▶"} İstatistikler
                </Text>
              </TouchableOpacity>

              {showAdvancedControls && (
                <View style={styles.statsContainer}>
                  {transmissionStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Ölçülen Bitrate:</Text>
                      <Text style={styles.statValue}>
                        {Math.round(transmissionStats.measuredBitrate / 1000)}{" "}
                        kbps
                      </Text>
                    </View>
                  )}
                  {transmissionStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Önerilen Bitrate:</Text>
                      <Text style={styles.statValue}>
                        {Math.round(
                          transmissionStats.recommendedBitrate / 1000
                        )}{" "}
                        kbps
                      </Text>
                    </View>
                  )}
                  {transmissionStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>RTT:</Text>
                      <Text style={styles.statValue}>
                        {Math.round(transmissionStats.rtt)} ms
                      </Text>
                    </View>
                  )}
                  {transmissionStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Yayın Kalitesi:</Text>
                      <Text style={styles.statValue}>
                        {transmissionStats.broadcastQuality}
                      </Text>
                    </View>
                  )}
                  {transmissionStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Ağ Sağlığı:</Text>
                      <Text style={styles.statValue}>
                        {transmissionStats.networkHealth}
                      </Text>
                    </View>
                  )}
                  {audioDeviceStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Ses Peak:</Text>
                      <Text style={styles.statValue}>
                        {audioDeviceStats.peak.toFixed(1)} dBFS
                      </Text>
                    </View>
                  )}
                  {audioDeviceStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Ses RMS:</Text>
                      <Text style={styles.statValue}>
                        {audioDeviceStats.rms.toFixed(1)} dBFS
                      </Text>
                    </View>
                  )}
                  {videoStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Video FPS:</Text>
                      <Text style={styles.statValue}>{videoStats.fps}</Text>
                    </View>
                  )}
                  {videoStats && (
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Video Çözünürlük:</Text>
                      <Text style={styles.statValue}>
                        {videoStats.width}x{videoStats.height}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Diğer Özellikler */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Diğer Özellikler</Text>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={sendMetadata}
              >
                <Text style={styles.buttonText}>📤 Metadata Gönder</Text>
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
      </ScrollView>

      {/* Cihaz Seçici Modal */}
      <Modal
        visible={showDeviceSelector}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDeviceSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {deviceSelectorType === "camera" ? "Kamera" : "Mikrofon"} Seç
            </Text>
            <ScrollView style={styles.deviceList}>
              {selectedDevices.map((device) => (
                <TouchableOpacity
                  key={device.deviceId}
                  style={styles.deviceItem}
                  onPress={() => {
                    if (deviceSelectorType === "camera") {
                      selectCamera(device.deviceId);
                    } else {
                      selectMicrophone(device.deviceId);
                    }
                  }}
                >
                  <Text style={styles.deviceName}>{device.friendlyName}</Text>
                  <Text style={styles.deviceInfo}>
                    {device.position && `Pozisyon: ${device.position}`}
                    {device.isDefault && " • Varsayılan"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => setShowDeviceSelector(false)}
            >
              <Text style={styles.buttonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    flexWrap: "wrap",
    gap: 8,
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
  statsText: {
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
    maxHeight: 400,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
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
  controlRow: {
    marginBottom: 12,
  },
  controlLabel: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 8,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#374151",
    borderRadius: 2,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#6366f1",
  },
  statsContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statLabel: {
    color: "#999",
    fontSize: 12,
  },
  statValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a2e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  deviceList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  deviceItem: {
    padding: 16,
    backgroundColor: "#2a2a3e",
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  deviceInfo: {
    color: "#999",
    fontSize: 12,
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
