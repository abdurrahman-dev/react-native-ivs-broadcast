export interface IVSBroadcastConfig {
  rtmpUrl: string;
  streamKey?: string;
  videoConfig?: VideoConfig;
  audioConfig?: AudioConfig;
}

export interface VideoConfig {
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
  targetFps?: number;
  keyframeInterval?: number;
  encoder?: "hardware" | "software";
}

export interface AudioConfig {
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
}

export interface IVSBroadcastSession {
  sessionId: string;
}

export interface BroadcastState {
  isBroadcasting: boolean;
  isPaused: boolean;
  error?: string;
}

export interface CameraPosition {
  position: "front" | "back";
}

export interface PreviewViewProps {
  /**
   * Broadcast session ID
   */
  sessionId?: string;

  /**
   * Görüntünün ekrana nasıl sığdırılacağı
   * - 'fit': Tüm görüntüyü göster, boşluk bırakabilir
   * - 'fill': Ekranı tamamen doldur, görüntü kırpılabilir
   * @default 'fill'
   */
  aspectMode?: "fit" | "fill";

  /**
   * Görüntüyü yatay olarak aynala (ön kamera için önerilir)
   * @default true
   */
  isMirrored?: boolean;

  /**
   * Picture-in-Picture konfigürasyonu
   */
  pictureInPicture?: PictureInPictureConfig;

  /**
   * View stili
   */
  style?: any;

  /**
   * Test ID
   */
  testID?: string;
}

export interface PreviewViewRef {
  /**
   * Preview'ı yeniden yükle
   */
  refresh: () => void;
  /**
   * Picture-in-Picture modunu başlat
   */
  startPictureInPicture?: () => Promise<void>;
  /**
   * Picture-in-Picture modunu durdur
   */
  stopPictureInPicture?: () => Promise<void>;
  /**
   * Picture-in-Picture durumunu al
   */
  getPictureInPictureState?: () => Promise<PictureInPictureState>;
}

export type BroadcastEventType =
  | "onStateChanged"
  | "onError"
  | "onNetworkHealth"
  | "onAudioStats"
  | "onVideoStats"
  | "onTransmissionStatistics"
  | "onAudioDeviceStats";

export interface BroadcastEvent {
  type: BroadcastEventType;
  data?: any;
}

export interface NetworkHealth {
  networkQuality: "excellent" | "good" | "fair" | "poor";
  uplinkBandwidth?: number;
  rtt?: number;
}

export interface AudioStats {
  bitrate: number;
  sampleRate: number;
  channels: number;
}

export interface VideoStats {
  bitrate: number;
  fps: number;
  width: number;
  height: number;
}

// Gelişmiş İstatistikler
export interface TransmissionStatistics {
  /** Ölçülen ortalama gönderme bitrate'i */
  measuredBitrate: number;
  /** SDK tarafından önerilen bitrate */
  recommendedBitrate: number;
  /** Ortalama round trip time (ms) */
  rtt: number;
  /** Yayın kalitesi */
  broadcastQuality: BroadcastQuality;
  /** Ağ sağlığı */
  networkHealth: NetworkHealthLevel;
}

export type BroadcastQuality =
  | "nearMaximum"
  | "high"
  | "medium"
  | "low"
  | "nearMinimum";

export type NetworkHealthLevel =
  | "excellent"
  | "high"
  | "medium"
  | "low"
  | "bad";

// Ses Cihazı İstatistikleri
export interface AudioDeviceStats {
  /** Ses peak seviyesi (dBFS, -100 ile 0 arası) */
  peak: number;
  /** Ses RMS seviyesi (dBFS, -100 ile 0 arası) */
  rms: number;
}

// Ağ Kalite Testi
export interface NetworkTestResult {
  /** Test ilerleme durumu (0-1 arası) */
  progress: number;
  /** Önerilen video konfigürasyonları */
  recommendations: VideoConfig[];
  /** Test durumu */
  status: NetworkTestStatus;
  /** Hata varsa */
  error?: string;
}

export type NetworkTestStatus = "connecting" | "testing" | "success" | "error";

// Cihaz Bilgileri
export interface DeviceDescriptor {
  /** Cihaz tipi */
  type: DeviceType;
  /** Cihaz pozisyonu (kameralar için) */
  position?: DevicePosition;
  /** Cihaz ID'si */
  deviceId: string;
  /** Kullanıcı dostu isim */
  friendlyName: string;
  /** Varsayılan cihaz mı */
  isDefault: boolean;
}

export type DeviceType = "camera" | "microphone" | "userVideo" | "userAudio" | "userImage";
export type DevicePosition = "front" | "back" | "unknown";

// Kamera Özellikleri
export interface CameraCapabilities {
  /** Minimum zoom faktörü */
  minZoomFactor: number;
  /** Maximum zoom faktörü */
  maxZoomFactor: number;
  /** Flaş desteği var mı */
  isTorchSupported: boolean;
}

// Zamanlı Metadata
export interface TimedMetadata {
  /** Metadata içeriği */
  content: string;
  /** Gönderim zamanı (opsiyonel) */
  timestamp?: number;
}

// Picture-in-Picture
export interface PictureInPictureConfig {
  /** PiP modunu etkinleştir */
  enabled?: boolean;
  /** PiP boyutları (iOS için) */
  aspectRatio?: {
    width: number;
    height: number;
  };
}

export type PictureInPictureState = "idle" | "starting" | "active" | "stopping" | "stopped";
