import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from "expo-image-picker";
import IVSBroadcast, {
  BroadcastState,
  NetworkHealth,
  AudioStats,
  VideoStats,
} from "@abdurrahman-dev/react-native-ivs-broadcast";

export default function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [rtmpUrl, setRtmpUrl] = useState("rtmp://your-stream-url.com");
  const [streamKey, setStreamKey] = useState("your-stream-key");
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth | null>(
    null
  );
  const [audioStats, setAudioStats] = useState<AudioStats | null>(null);
  const [videoStats, setVideoStats] = useState<VideoStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  useEffect(() => {
    // Request permissions
    (async () => {
      if (Platform.OS !== "web") {
        const { status: cameraStatus } =
          await ImagePicker.requestCameraPermissionsAsync();
        const { status: audioStatus } =
          await ImagePicker.requestMicrophonePermissionsAsync();
        if (cameraStatus !== "granted" || audioStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Camera and microphone permissions are required for broadcasting"
          );
        }
      }
    })();

    // Event listener'ları ekle
    const stateListener = IVSBroadcast.addListener(
      "onStateChanged",
      (state: BroadcastState) => {
        setIsBroadcasting(state.isBroadcasting);
        setIsPaused(state.isPaused);
        addLog(`State changed: ${JSON.stringify(state)}`);
      }
    );

    const errorListener = IVSBroadcast.addListener(
      "onError",
      (error: { message: string; code?: string }) => {
        addLog(`Error: ${error.message} (${error.code})`);
        Alert.alert("Broadcast Error", error.message);
      }
    );

    const networkListener = IVSBroadcast.addListener(
      "onNetworkHealth",
      (health: NetworkHealth) => {
        setNetworkHealth(health);
        addLog(`Network health: ${health.networkQuality}`);
      }
    );

    const audioStatsListener = IVSBroadcast.addListener(
      "onAudioStats",
      (stats: AudioStats) => {
        setAudioStats(stats);
      }
    );

    const videoStatsListener = IVSBroadcast.addListener(
      "onVideoStats",
      (stats: VideoStats) => {
        setVideoStats(stats);
      }
    );

    // Cleanup
    return () => {
      stateListener();
      errorListener();
      networkListener();
      audioStatsListener();
      videoStatsListener();
    };
  }, []);

  const handleCreateSession = async () => {
    try {
      if (!rtmpUrl || !streamKey) {
        Alert.alert("Error", "Please enter RTMP URL and Stream Key");
        return;
      }

      addLog("Creating session...");
      const session = await IVSBroadcast.createSession({
        rtmpUrl,
        streamKey,
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
      addLog(`Session created: ${session.sessionId}`);
      Alert.alert("Success", "Session created successfully");
    } catch (error: any) {
      addLog(`Failed to create session: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleStartBroadcast = async () => {
    if (!sessionId) {
      Alert.alert("Error", "Please create a session first");
      return;
    }

    try {
      addLog("Starting broadcast...");
      await IVSBroadcast.startBroadcast(sessionId);
      addLog("Broadcast started");
    } catch (error: any) {
      addLog(`Failed to start broadcast: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleStopBroadcast = async () => {
    if (!sessionId) return;

    try {
      addLog("Stopping broadcast...");
      await IVSBroadcast.stopBroadcast(sessionId);
      addLog("Broadcast stopped");
    } catch (error: any) {
      addLog(`Failed to stop broadcast: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handlePauseBroadcast = async () => {
    if (!sessionId) return;

    try {
      addLog("Pausing broadcast...");
      await IVSBroadcast.pauseBroadcast(sessionId);
      addLog("Broadcast paused");
    } catch (error: any) {
      addLog(`Failed to pause broadcast: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleResumeBroadcast = async () => {
    if (!sessionId) return;

    try {
      addLog("Resuming broadcast...");
      await IVSBroadcast.resumeBroadcast(sessionId);
      addLog("Broadcast resumed");
    } catch (error: any) {
      addLog(`Failed to resume broadcast: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleSwitchCamera = async () => {
    if (!sessionId) return;

    try {
      addLog("Switching camera...");
      await IVSBroadcast.switchCamera(sessionId);
      addLog("Camera switched");
    } catch (error: any) {
      addLog(`Failed to switch camera: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleSetCameraPosition = async (position: "front" | "back") => {
    if (!sessionId) return;

    try {
      addLog(`Setting camera position to ${position}...`);
      await IVSBroadcast.setCameraPosition(sessionId, position);
      addLog(`Camera position set to ${position}`);
    } catch (error: any) {
      addLog(`Failed to set camera position: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleToggleMute = async () => {
    if (!sessionId) return;

    try {
      const newMutedState = !isMuted;
      addLog(`${newMutedState ? "Muting" : "Unmuting"} microphone...`);
      await IVSBroadcast.setMuted(sessionId, newMutedState);
      setIsMuted(newMutedState);
      addLog(`Microphone ${newMutedState ? "muted" : "unmuted"}`);
    } catch (error: any) {
      addLog(`Failed to toggle mute: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleDestroySession = async () => {
    if (!sessionId) return;

    try {
      addLog("Destroying session...");
      await IVSBroadcast.destroySession(sessionId);
      setSessionId(null);
      setIsBroadcasting(false);
      setIsPaused(false);
      setIsMuted(false);
      setNetworkHealth(null);
      setAudioStats(null);
      setVideoStats(null);
      addLog("Session destroyed");
      Alert.alert("Success", "Session destroyed");
    } catch (error: any) {
      addLog(`Failed to destroy session: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  const handleGetState = async () => {
    if (!sessionId) return;

    try {
      const state = await IVSBroadcast.getState(sessionId);
      addLog(`Current state: ${JSON.stringify(state)}`);
      Alert.alert("State", JSON.stringify(state, null, 2));
    } catch (error: any) {
      addLog(`Failed to get state: ${error.message}`);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>IVS Broadcast Example</Text>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>
          <TextInput
            style={styles.input}
            placeholder="RTMP URL"
            value={rtmpUrl}
            onChangeText={setRtmpUrl}
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <TextInput
            style={styles.input}
            placeholder="Stream Key"
            value={streamKey}
            onChangeText={setStreamKey}
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleCreateSession}
          >
            <Text style={styles.buttonText}>Create Session</Text>
          </TouchableOpacity>
        </View>

        {/* Session Info */}
        {sessionId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session Info</Text>
            <Text style={styles.infoText}>Session ID: {sessionId}</Text>
            <Text style={styles.infoText}>
              Status:{" "}
              {isBroadcasting
                ? "Broadcasting"
                : isPaused
                ? "Paused"
                : "Stopped"}
            </Text>
            <Text style={styles.infoText}>
              Microphone: {isMuted ? "Muted" : "Unmuted"}
            </Text>
          </View>
        )}

        {/* Broadcast Controls */}
        {sessionId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Broadcast Controls</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.successButton,
                  isBroadcasting && styles.disabledButton,
                ]}
                onPress={handleStartBroadcast}
                disabled={isBroadcasting}
              >
                <Text style={styles.buttonText}>Start</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.dangerButton,
                  !isBroadcasting && styles.disabledButton,
                ]}
                onPress={handleStopBroadcast}
                disabled={!isBroadcasting}
              >
                <Text style={styles.buttonText}>Stop</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.warningButton,
                  (!isBroadcasting || isPaused) && styles.disabledButton,
                ]}
                onPress={handlePauseBroadcast}
                disabled={!isBroadcasting || isPaused}
              >
                <Text style={styles.buttonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.warningButton,
                  (!isBroadcasting || !isPaused) && styles.disabledButton,
                ]}
                onPress={handleResumeBroadcast}
                disabled={!isBroadcasting || !isPaused}
              >
                <Text style={styles.buttonText}>Resume</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Camera Controls */}
        {sessionId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Camera Controls</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.infoButton]}
                onPress={handleSwitchCamera}
              >
                <Text style={styles.buttonText}>Switch Camera</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.infoButton]}
                onPress={() => handleSetCameraPosition("front")}
              >
                <Text style={styles.buttonText}>Front Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.infoButton]}
                onPress={() => handleSetCameraPosition("back")}
              >
                <Text style={styles.buttonText}>Back Camera</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Audio Controls */}
        {sessionId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Audio Controls</Text>
            <TouchableOpacity
              style={[
                styles.button,
                isMuted ? styles.dangerButton : styles.successButton,
              ]}
              onPress={handleToggleMute}
            >
              <Text style={styles.buttonText}>
                {isMuted ? "Unmute" : "Mute"} Microphone
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        {(networkHealth || audioStats || videoStats) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Statistics</Text>
            {networkHealth && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Network Health</Text>
                <Text style={styles.statsText}>
                  Quality: {networkHealth.networkQuality}
                </Text>
                <Text style={styles.statsText}>
                  Uplink: {networkHealth.uplinkBandwidth?.toFixed(0)} bps
                </Text>
                <Text style={styles.statsText}>
                  RTT: {networkHealth.rtt?.toFixed(0)} ms
                </Text>
              </View>
            )}
            {audioStats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Audio Stats</Text>
                <Text style={styles.statsText}>
                  Bitrate: {(audioStats.bitrate / 1000).toFixed(0)} kbps
                </Text>
                <Text style={styles.statsText}>
                  Sample Rate: {audioStats.sampleRate} Hz
                </Text>
                <Text style={styles.statsText}>
                  Channels: {audioStats.channels}
                </Text>
              </View>
            )}
            {videoStats && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Video Stats</Text>
                <Text style={styles.statsText}>
                  Bitrate: {(videoStats.bitrate / 1000000).toFixed(2)} Mbps
                </Text>
                <Text style={styles.statsText}>
                  FPS: {videoStats.fps.toFixed(1)}
                </Text>
                <Text style={styles.statsText}>
                  Resolution: {videoStats.width}x{videoStats.height}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Utility */}
        {sessionId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Utility</Text>
            <TouchableOpacity
              style={[styles.button, styles.infoButton]}
              onPress={handleGetState}
            >
              <Text style={styles.buttonText}>Get State</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleDestroySession}
            >
              <Text style={styles.buttonText}>Destroy Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Logs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logs</Text>
          <View style={styles.logsContainer}>
            {logs.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
            {logs.length === 0 && (
              <Text style={styles.emptyLogText}>No logs yet</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#333",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#000",
  },
  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  successButton: {
    backgroundColor: "#34C759",
  },
  dangerButton: {
    backgroundColor: "#FF3B30",
  },
  warningButton: {
    backgroundColor: "#FF9500",
  },
  infoButton: {
    backgroundColor: "#5AC8FA",
  },
  disabledButton: {
    opacity: 0.5,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  statsContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  statsText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  logsContainer: {
    backgroundColor: "#1e1e1e",
    borderRadius: 4,
    padding: 12,
    maxHeight: 200,
  },
  logText: {
    fontSize: 10,
    color: "#00ff00",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 2,
  },
  emptyLogText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
});
