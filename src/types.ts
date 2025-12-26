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
  encoder?: 'hardware' | 'software';
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
  position: 'front' | 'back';
}

export interface PreviewViewProps {
  style?: any;
}

export type BroadcastEventType =
  | 'onStateChanged'
  | 'onError'
  | 'onNetworkHealth'
  | 'onAudioStats'
  | 'onVideoStats';

export interface BroadcastEvent {
  type: BroadcastEventType;
  data?: any;
}

export interface NetworkHealth {
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
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

