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
} from "./types";

const { IVSBroadcastModule } = NativeModules;

if (!IVSBroadcastModule) {
  throw new Error(
    "IVSBroadcastModule native module is not available. Make sure you have properly linked the module."
  );
}

const eventEmitter = new NativeEventEmitter(IVSBroadcastModule);

class IVSBroadcast {
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  /**
   * Yeni bir broadcast session oluşturur
   */
  async createSession(
    config: IVSBroadcastConfig
  ): Promise<IVSBroadcastSession> {
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
    try {
      await IVSBroadcastModule.setCameraPosition(sessionId, position);
    } catch (error: any) {
      throw new Error(`Failed to set camera position: ${error.message}`);
    }
  }

  /**
   * Mikrofonu açıp kapatır
   */
  async setMuted(sessionId: string, muted: boolean): Promise<void> {
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
    try {
      await IVSBroadcastModule.updateAudioConfig(sessionId, config);
    } catch (error: any) {
      throw new Error(`Failed to update audio config: ${error.message}`);
    }
  }

  /**
   * Event listener ekler
   */
  addListener(
    eventType: "onStateChanged",
    callback: (state: BroadcastState) => void
  ): void;
  addListener(
    eventType: "onError",
    callback: (error: { message: string; code?: string }) => void
  ): void;
  addListener(
    eventType: "onNetworkHealth",
    callback: (health: NetworkHealth) => void
  ): void;
  addListener(
    eventType: "onAudioStats",
    callback: (stats: AudioStats) => void
  ): void;
  addListener(
    eventType: "onVideoStats",
    callback: (stats: VideoStats) => void
  ): void;
  addListener(eventType: string, callback: (data: any) => void): () => void {
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
    if (eventType) {
      this.listeners.delete(eventType);
      eventEmitter.removeAllListeners(eventType);
    } else {
      this.listeners.clear();
      // Tüm event type'ları için listener'ları temizle
      this.listeners.forEach((_, type) => {
        eventEmitter.removeAllListeners(type);
      });
      this.listeners.clear();
    }
  }
}

export default new IVSBroadcast();
export * from "./types";
