import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import {
  requireNativeComponent,
  UIManager,
  Platform,
  findNodeHandle,
  ViewStyle,
  StyleSheet,
  View,
  StyleProp,
  HostComponent,
} from "react-native";

const COMPONENT_NAME = "IVSPreviewView";

interface NativePreviewViewProps {
  sessionId?: string;
  aspectMode?: "fit" | "fill";
  isMirrored?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Native component'i yükle (varsa)
let NativePreviewView: HostComponent<NativePreviewViewProps> | null = null;

try {
  if (
    UIManager.getViewManagerConfig &&
    UIManager.getViewManagerConfig(COMPONENT_NAME)
  ) {
    NativePreviewView =
      requireNativeComponent<NativePreviewViewProps>(COMPONENT_NAME);
  }
} catch (e) {
  // Native component yok, placeholder kullanılacak
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
   * View stili
   */
  style?: StyleProp<ViewStyle>;

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
}

/**
 * Broadcast preview view component'i.
 * Kameranın canlı görüntüsünü gösterir.
 *
 * @example
 * ```tsx
 * import { PreviewView } from '@abdurrahman-dev/react-native-ivs-broadcast';
 *
 * function BroadcastScreen() {
 *   const [sessionId, setSessionId] = useState<string>();
 *
 *   return (
 *     <PreviewView
 *       sessionId={sessionId}
 *       aspectMode="fill"
 *       isMirrored={true}
 *       style={{ flex: 1 }}
 *     />
 *   );
 * }
 * ```
 */
export const PreviewView = forwardRef<PreviewViewRef, PreviewViewProps>(
  function PreviewView(
    { sessionId, aspectMode = "fill", isMirrored = true, style, testID },
    ref
  ) {
    const nativeRef = useRef<React.ElementRef<typeof View>>(null);
    const [key, setKey] = useState(0);

    useImperativeHandle(ref, () => ({
      refresh: () => {
        // Component'i yeniden render et
        setKey((prev) => prev + 1);
      },
    }));

    // Native component yoksa placeholder göster
    if (!NativePreviewView) {
      return (
        <View style={[styles.placeholder, style]} testID={testID}>
          <View style={styles.placeholderInner} />
        </View>
      );
    }

    const NativeComponent = NativePreviewView;

    return (
      <View style={[styles.container, style]} testID={testID}>
        <NativeComponent
          key={key}
          sessionId={sessionId}
          aspectMode={aspectMode}
          isMirrored={isMirrored}
          style={styles.preview}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  preview: {
    flex: 1,
    backgroundColor: "#000",
  },
  placeholder: {
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#333",
  },
});

export default PreviewView;
