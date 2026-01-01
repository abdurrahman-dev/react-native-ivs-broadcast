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
  addListener(eventType: string, callback: (data: any) => void): () => void {
    if (!eventEmitter) {
      console.warn("EventEmitter is not available. Native module may not be linked.");
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
