import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import type {
  IVSBroadcastConfig,
  IVSBroadcastSession,
  BroadcastState,
  CameraPosition,
  BroadcastEvent,
  NetworkHealth,
  AudioStats,
  VideoStats,
  VideoConfig,
  AudioConfig,
  TransmissionStatistics,
  AudioDeviceStats,
  NetworkTestResult,
  DeviceDescriptor,
  CameraCapabilities,
  TimedMetadata,
} from "./types";

const { IVSBroadcastModule } = NativeModules;

// Native modül kontrolü - modül yoksa hata fırlatmak yerine uyarı ver
let eventEmitter: NativeEventEmitter | null = null;

if (!IVSBroadcastModule) {
  if (__DEV__) {
    console.warn(
      "IVSBroadcastModule native module is not available. " +
        "Make sure you have properly linked the module and rebuilt the app with 'npx expo run:ios'."
    );
  }
  // Modül yoksa eventEmitter'ı null bırak, hata fırlatma
} else {
  eventEmitter = new NativeEventEmitter(IVSBroadcastModule);
}

class IVSBroadcast {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  /**
   * Native modülün mevcut olup olmadığını kontrol eder
   */
  private checkModuleAvailable(): void {
    if (!IVSBroadcastModule) {
      throw new Error(
        "IVSBroadcastModule native module is not available. " +
          "This module requires a development build. Please run 'npx expo run:ios' to rebuild the app."
      );
    }
  }

  /**
   * Yeni bir broadcast session oluşturur
   */
  async createSession(
    config: IVSBroadcastConfig
  ): Promise<IVSBroadcastSession> {
    this.checkModuleAvailable();

    if (!config.rtmpUrl) {
      throw new Error("RTMP URL is required");
    }

    try {
      const sessionId = await IVSBroadcastModule.createSession(config);
      return { sessionId };
    } catch (error: any) {
      throw new Error(`Failed to create session: ${error.message}`);
    }
  }

  /**
   * Broadcast'i başlatır
   */
  async startBroadcast(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.startBroadcast(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to start broadcast: ${error.message}`);
    }
  }

  /**
   * Broadcast'i durdurur
   */
  async stopBroadcast(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.stopBroadcast(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to stop broadcast: ${error.message}`);
    }
  }

  /**
   * Broadcast'i duraklatır
   */
  async pauseBroadcast(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.pauseBroadcast(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to pause broadcast: ${error.message}`);
    }
  }

  /**
   * Duraklatılmış broadcast'i devam ettirir
   */
  async resumeBroadcast(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.resumeBroadcast(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to resume broadcast: ${error.message}`);
    }
  }

  /**
   * Broadcast session'ı yok eder
   */
  async destroySession(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.destroySession(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to destroy session: ${error.message}`);
    }
  }

  /**
   * Broadcast durumunu alır
   */
  async getState(sessionId: string): Promise<BroadcastState> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.getState(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to get state: ${error.message}`);
    }
  }

  /**
   * Kamera pozisyonunu değiştirir
   */
  async switchCamera(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.switchCamera(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to switch camera: ${error.message}`);
    }
  }

  /**
   * Kamera pozisyonunu ayarlar
   */
  async setCameraPosition(
    sessionId: string,
    position: "front" | "back"
  ): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.setCameraPosition(sessionId, position);
    } catch (error: any) {
      throw new Error(`Failed to set camera position: ${error.message}`);
    }
  }

  /**
   * Kamera listesinden belirli bir kamerayı seçer
   * @param sessionId - Broadcast session ID
   * @param deviceId - Seçilecek kameranın deviceId'si (listAvailableDevices'dan alınabilir)
   */
  async selectCamera(sessionId: string, deviceId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.selectCamera(sessionId, deviceId);
    } catch (error: any) {
      throw new Error(`Failed to select camera: ${error.message}`);
    }
  }

  /**
   * Mikrofon listesinden belirli bir mikrofonu seçer
   * @param sessionId - Broadcast session ID
   * @param deviceId - Seçilecek mikrofonun deviceId'si (listAvailableDevices'dan alınabilir)
   */
  async selectMicrophone(sessionId: string, deviceId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.selectMicrophone(sessionId, deviceId);
    } catch (error: any) {
      throw new Error(`Failed to select microphone: ${error.message}`);
    }
  }

  /**
   * Mikrofonu açıp kapatır
   */
  async setMuted(sessionId: string, muted: boolean): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.setMuted(sessionId, muted);
    } catch (error: any) {
      throw new Error(`Failed to set muted state: ${error.message}`);
    }
  }

  /**
   * Mikrofon durumunu alır
   */
  async isMuted(sessionId: string): Promise<boolean> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.isMuted(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to get muted state: ${error.message}`);
    }
  }

  /**
   * Video konfigürasyonunu günceller
   */
  async updateVideoConfig(
    sessionId: string,
    config: VideoConfig
  ): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.updateVideoConfig(sessionId, config);
    } catch (error: any) {
      throw new Error(`Failed to update video config: ${error.message}`);
    }
  }

  /**
   * Audio konfigürasyonunu günceller
   */
  async updateAudioConfig(
    sessionId: string,
    config: AudioConfig
  ): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.updateAudioConfig(sessionId, config);
    } catch (error: any) {
      throw new Error(`Failed to update audio config: ${error.message}`);
    }
  }

  /**
   * Kullanılabilir cihazları listeler
   */
  async listAvailableDevices(): Promise<DeviceDescriptor[]> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.listAvailableDevices();
    } catch (error: any) {
      throw new Error(`Failed to list available devices: ${error.message}`);
    }
  }

  /**
   * Bağlı cihazları listeler
   */
  async listAttachedDevices(sessionId: string): Promise<DeviceDescriptor[]> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.listAttachedDevices(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to list attached devices: ${error.message}`);
    }
  }

  /**
   * Kamera zoom seviyesini ayarlar
   */
  async setCameraZoom(sessionId: string, zoomFactor: number): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.setCameraZoom(sessionId, zoomFactor);
    } catch (error: any) {
      throw new Error(`Failed to set camera zoom: ${error.message}`);
    }
  }

  /**
   * Kamera flaşını açıp kapatır
   */
  async setTorchEnabled(sessionId: string, enabled: boolean): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.setTorchEnabled(sessionId, enabled);
    } catch (error: any) {
      throw new Error(`Failed to set torch: ${error.message}`);
    }
  }

  /**
   * Kamera yeteneklerini alır
   */
  async getCameraCapabilities(sessionId: string): Promise<CameraCapabilities> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.getCameraCapabilities(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to get camera capabilities: ${error.message}`);
    }
  }

  /**
   * Zamanlı metadata gönderir
   */
  async sendTimedMetadata(sessionId: string, metadata: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.sendTimedMetadata(sessionId, metadata);
    } catch (error: any) {
      throw new Error(`Failed to send timed metadata: ${error.message}`);
    }
  }

  /**
   * Ağ kalite testi başlatır
   */
  async startNetworkTest(
    rtmpUrl: string,
    streamKey?: string,
    duration?: number
  ): Promise<string> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.startNetworkTest(
        rtmpUrl,
        streamKey,
        duration
      );
    } catch (error: any) {
      throw new Error(`Failed to start network test: ${error.message}`);
    }
  }

  /**
   * Ağ kalite testini iptal eder
   */
  async cancelNetworkTest(testId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.cancelNetworkTest(testId);
    } catch (error: any) {
      throw new Error(`Failed to cancel network test: ${error.message}`);
    }
  }

  /**
   * Ses gain seviyesini ayarlar (0.0 - 2.0 arası)
   */
  async setAudioGain(sessionId: string, gain: number): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.setAudioGain(sessionId, gain);
    } catch (error: any) {
      throw new Error(`Failed to set audio gain: ${error.message}`);
    }
  }

  /**
   * Mevcut ses gain seviyesini alır
   */
  async getAudioGain(sessionId: string): Promise<number> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.getAudioGain(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to get audio gain: ${error.message}`);
    }
  }

  /**
   * Picture-in-Picture modunu başlatır (iOS 15+, Android 8.0+)
   * @param sessionId - Broadcast session ID
   */
  async startPictureInPicture(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.startPictureInPicture(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to start Picture-in-Picture: ${error.message}`);
    }
  }

  /**
   * Picture-in-Picture modunu durdurur
   * @param sessionId - Broadcast session ID
   */
  async stopPictureInPicture(sessionId: string): Promise<void> {
    this.checkModuleAvailable();
    try {
      await IVSBroadcastModule.stopPictureInPicture(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to stop Picture-in-Picture: ${error.message}`);
    }
  }

  /**
   * Picture-in-Picture durumunu alır
   * @param sessionId - Broadcast session ID
   */
  async getPictureInPictureState(sessionId: string): Promise<string> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.getPictureInPictureState(sessionId);
    } catch (error: any) {
      throw new Error(`Failed to get Picture-in-Picture state: ${error.message}`);
    }
  }

  /**
   * Picture-in-Picture desteğinin olup olmadığını kontrol eder
   */
  async isPictureInPictureSupported(): Promise<boolean> {
    this.checkModuleAvailable();
    try {
      return await IVSBroadcastModule.isPictureInPictureSupported();
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Event listener ekler
   * @returns Cleanup fonksiyonu - listener'ı kaldırmak için çağırılır
   */
  addListener(
    eventType: "onStateChanged",
    callback: (state: BroadcastState) => void
  ): () => void;
  addListener(
    eventType: "onError",
    callback: (error: { message: string; code?: string }) => void
  ): () => void;
  addListener(
    eventType: "onNetworkHealth",
    callback: (health: NetworkHealth) => void
  ): () => void;
  addListener(
    eventType: "onAudioStats",
    callback: (stats: AudioStats) => void
  ): () => void;
  addListener(
    eventType: "onVideoStats",
    callback: (stats: VideoStats) => void
  ): () => void;
  addListener(
    eventType: "onTransmissionStatistics",
    callback: (stats: TransmissionStatistics) => void
  ): () => void;
  addListener(
    eventType: "onAudioDeviceStats",
    callback: (stats: AudioDeviceStats) => void
  ): () => void;
  addListener(
    eventType: "onNetworkTestResult",
    callback: (result: NetworkTestResult) => void
  ): () => void;
  addListener(eventType: string, callback: (data: any) => void): () => void {
    if (!eventEmitter) {
      console.warn(
        "EventEmitter is not available. Native module may not be linked."
      );
      // Modül yoksa boş bir cleanup fonksiyonu döndür
      return () => {};
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);

    const subscription = eventEmitter.addListener(eventType, (data) => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.forEach((cb) => cb(data));
      }
    });

    // Cleanup fonksiyonunu döndür
    return () => {
      subscription.remove();
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Event listener'ı kaldırır
   */
  removeListener(eventType: string, callback?: (data: any) => void): void {
    if (!eventEmitter) return;

    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      if (callback) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      } else {
        this.listeners.delete(eventType);
      }
    }
    eventEmitter.removeAllListeners(eventType);
  }

  /**
   * Tüm listener'ları temizler
   */
  removeAllListeners(eventType?: string): void {
    if (!eventEmitter) return;

    if (eventType) {
      this.listeners.delete(eventType);
      eventEmitter.removeAllListeners(eventType);
    } else {
      this.listeners.clear();
      // Tüm event type'ları için listener'ları temizle
      this.listeners.forEach((_, type) => {
        eventEmitter!.removeAllListeners(type);
      });
      this.listeners.clear();
    }
  }
}

export default new IVSBroadcast();
export * from "./types";
export { PreviewView, PreviewViewProps, PreviewViewRef } from "./PreviewView";
