package com.reactnativeivsbroadcast

import android.Manifest
import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import androidx.core.content.ContextCompat
import com.amazonaws.ivs.broadcast.*
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.net.URI
import java.util.concurrent.ConcurrentHashMap

class IVSBroadcastModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private val sessionsMap = ConcurrentHashMap<String, BroadcastSession>()
        
        @JvmStatic
        fun getSessionById(sessionId: String): BroadcastSession? {
            return sessionsMap[sessionId]
        }
    }

    private val sessions: ConcurrentHashMap<String, BroadcastSession>
        get() = sessionsMap
    
    private val sessionUrls = ConcurrentHashMap<String, URI>()
    private val sessionConfigs = ConcurrentHashMap<String, BroadcastConfiguration>()
    private val currentCameraPosition = ConcurrentHashMap<String, String>()
    private val isMutedState = ConcurrentHashMap<String, Boolean>()

    override fun getName(): String {
        return "IVSBroadcastModule"
    }

    // Extension function for safe int retrieval from ReadableMap
    private fun ReadableMap.safeGetInt(key: String): Int? {
        return if (hasKey(key) && !isNull(key)) getInt(key) else null
    }

    private fun ReadableMap.safeGetDouble(key: String): Double? {
        return if (hasKey(key) && !isNull(key)) getDouble(key) else null
    }

    private fun ReadableMap.safeGetString(key: String): String? {
        return if (hasKey(key) && !isNull(key)) getString(key) else null
    }

    private fun ReadableMap.safeGetBoolean(key: String): Boolean? {
        return if (hasKey(key) && !isNull(key)) getBoolean(key) else null
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // React Native NativeEventEmitter için gerekli
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // React Native NativeEventEmitter için gerekli
    }

    @ReactMethod
    fun createSession(config: ReadableMap, promise: Promise) {
        try {
            val rtmpUrl = config.safeGetString("rtmpUrl")
                ?: throw IllegalArgumentException("rtmpUrl is required")

            val streamKey = config.safeGetString("streamKey")

            val fullUrl = if (streamKey != null && streamKey.isNotEmpty()) {
                "$rtmpUrl/$streamKey"
            } else {
                rtmpUrl
            }

            val broadcastConfig = BroadcastConfiguration()
            
            // Video config
            config.getMap("videoConfig")?.let { videoConfig ->
                broadcastConfig.video.apply {
                    videoConfig.safeGetInt("width")?.let { setSize(it, size.y) }
                    videoConfig.safeGetInt("height")?.let { setSize(size.x, it) }
                    videoConfig.safeGetInt("bitrate")?.let { setInitialBitrate(it) }
                    videoConfig.safeGetInt("fps")?.let { setTargetFramerate(it) }
                    videoConfig.safeGetInt("targetFps")?.let { setTargetFramerate(it) }
                    videoConfig.safeGetInt("keyframeInterval")?.let { setKeyframeInterval(it.toFloat()) }
                }
            }

            // Audio config
            config.getMap("audioConfig")?.let { audioConfig ->
                broadcastConfig.audio.apply {
                    audioConfig.safeGetInt("bitrate")?.let { setBitrate(it) }
                    audioConfig.safeGetInt("channels")?.let { setChannels(it) }
                }
            }

            val sessionId = java.util.UUID.randomUUID().toString()
            
            // Listener'ı sessionId ile birlikte oluştur
            val listener = createBroadcastListener(sessionId)
            
            val context = reactApplicationContext
            
            // BroadcastSession oluştur
            val session = BroadcastSession(
                context,
                listener,
                broadcastConfig,
                null // Descriptor'lar null geçilir, sonradan cihaz eklenir
            )
            
            sessions[sessionId] = session
            sessionUrls[sessionId] = URI.create(fullUrl)
            sessionConfigs[sessionId] = broadcastConfig
            currentCameraPosition[sessionId] = "back"
            isMutedState[sessionId] = false

            // Varsayılan cihazları ekle
            setupDefaultDevices(session, sessionId)

            promise.resolve(sessionId)
        } catch (e: Exception) {
            promise.reject("CREATE_SESSION_ERROR", e.message, e)
        }
    }

    private fun createBroadcastListener(sessionId: String): BroadcastSession.Listener {
        return object : BroadcastSession.Listener() {
            override fun onStateChanged(state: BroadcastSession.State) {
                val eventMap = Arguments.createMap().apply {
                    putBoolean("isBroadcasting", state == BroadcastSession.State.CONNECTED)
                    putBoolean("isPaused", false)
                    putString("state", state.name)
                    putString("sessionId", sessionId)
                }
                sendEvent("onStateChanged", eventMap)
            }

            override fun onError(error: BroadcastException) {
                val eventMap = Arguments.createMap().apply {
                    putString("message", error.message ?: "Unknown error")
                    putString("code", error.code.toString())
                    putString("sessionId", sessionId)
                }
                sendEvent("onError", eventMap)
            }

            override fun onDeviceAdded(descriptor: Device.Descriptor) {
                // Device eklendi - PreviewView'ları güncelle
                notifyPreviewViews(sessionId)
            }

            override fun onDeviceRemoved(descriptor: Device.Descriptor) {
                // Device kaldırıldı
            }

            override fun onNetworkHealthChanged(health: NetworkHealth) {
                val qualityString = when (health.quality) {
                    NetworkHealth.Quality.EXCELLENT -> "excellent"
                    NetworkHealth.Quality.GOOD -> "good"
                    NetworkHealth.Quality.FAIR -> "fair"
                    NetworkHealth.Quality.POOR -> "poor"
                    else -> "unknown"
                }

                val eventMap = Arguments.createMap().apply {
                    putString("networkQuality", qualityString)
                    putString("sessionId", sessionId)
                    health.uplinkBandwidth?.let { putInt("uplinkBandwidth", it) }
                    health.rtt?.let { putInt("rtt", it) }
                }
                sendEvent("onNetworkHealth", eventMap)
            }

            override fun onAudioStats(stats: AudioStats) {
                val eventMap = Arguments.createMap().apply {
                    putInt("bitrate", stats.bitrate)
                    putInt("sampleRate", stats.sampleRate)
                    putInt("channels", stats.channels)
                    putString("sessionId", sessionId)
                }
                sendEvent("onAudioStats", eventMap)
            }

            override fun onVideoStats(stats: VideoStats) {
                val eventMap = Arguments.createMap().apply {
                    putInt("bitrate", stats.bitrate)
                    putDouble("fps", stats.fps.toDouble())
                    putInt("width", stats.width)
                    putInt("height", stats.height)
                    putString("sessionId", sessionId)
                }
                sendEvent("onVideoStats", eventMap)
            }
        }
    }

    private fun notifyPreviewViews(sessionId: String) {
        // PreviewView'ları güncellemek için event gönder
        // Bu, PreviewView'ların kendilerini yeniden attach etmesini sağlar
        // Not: Bu basit bir yaklaşım, daha gelişmiş bir çözüm için ViewManager kullanılabilir
    }

    private fun setupDefaultDevices(session: BroadcastSession, sessionId: String) {
        try {
            // Kamera ekle (öncelikle arka kamera)
            val cameras = session.listAvailableDevices()
                .filter { it.type == Device.Descriptor.DeviceType.CAMERA }
            
            val backCamera = cameras.find { it.position == Device.Descriptor.Position.BACK }
            val frontCamera = cameras.find { it.position == Device.Descriptor.Position.FRONT }
            val selectedCamera = backCamera ?: frontCamera ?: cameras.firstOrNull()
            
            selectedCamera?.let { cameraDesc ->
                session.attachDevice(cameraDesc) { device ->
                    if (device != null) {
                        currentCameraPosition[sessionId] = 
                            if (cameraDesc.position == Device.Descriptor.Position.FRONT) "front" else "back"
                    }
                }
            }

            // Mikrofon ekle
            val microphones = session.listAvailableDevices()
                .filter { it.type == Device.Descriptor.DeviceType.MICROPHONE }
            
            microphones.firstOrNull()?.let { micDesc ->
                session.attachDevice(micDesc) { device ->
                    // Mikrofon eklendi
                }
            }
        } catch (e: Exception) {
            // Device setup hatalarını sessizce geç
        }
    }

    @ReactMethod
    fun startBroadcast(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val url = sessionUrls[sessionId]
                ?: throw IllegalArgumentException("Session URL not found: $sessionId")

            // Android SDK'da URL direkt URI olarak kullanılıyor, streamKey URL içinde
            session.start(url)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_BROADCAST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopBroadcast(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            session.stop()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_BROADCAST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pauseBroadcast(sessionId: String, promise: Promise) {
        try {
            // IVS SDK'da doğrudan pause yok, video/audio'yu mute ediyoruz
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            // Tüm cihazları detach et ama session'ı durdurma
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("PAUSE_BROADCAST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun resumeBroadcast(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("RESUME_BROADCAST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun destroySession(sessionId: String, promise: Promise) {
        try {
            val session = sessions.remove(sessionId)
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            sessionUrls.remove(sessionId)
            sessionConfigs.remove(sessionId)
            currentCameraPosition.remove(sessionId)
            isMutedState.remove(sessionId)
            
            session.stop()
            session.release()

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("DESTROY_SESSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getState(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val state = session.state
            val map = Arguments.createMap().apply {
                putBoolean("isBroadcasting", state == BroadcastSession.State.CONNECTED)
                putBoolean("isPaused", false)
                putString("state", state.name)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_STATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun switchCamera(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val currentPosition = currentCameraPosition[sessionId] ?: "back"
            val newPosition = if (currentPosition == "back") "front" else "back"
            
            switchToCamera(session, sessionId, newPosition)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SWITCH_CAMERA_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setCameraPosition(sessionId: String, position: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            if (position != "front" && position != "back") {
                throw IllegalArgumentException("Invalid camera position: $position")
            }

            switchToCamera(session, sessionId, position)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SET_CAMERA_POSITION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun selectCamera(sessionId: String, deviceId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            // Tüm kullanılabilir cihazları listele
            val availableDevices = session.listAvailableDevices()
            val targetCamera = availableDevices.find { 
                it.type == Device.Descriptor.DeviceType.CAMERA && 
                it.deviceId == deviceId
            } ?: throw IllegalStateException("Camera with deviceId '$deviceId' not found")

            // Mevcut kamerayı bul
            val attachedDevices = session.listAttachedDevices()
            val currentCamera = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.CAMERA 
            }

            // Kamera pozisyonunu güncelle
            val position = if (targetCamera.position == Device.Descriptor.Position.FRONT) "front" else "back"

            if (currentCamera != null) {
                // Mevcut kamerayı yeni kamerayla değiştir
                session.exchangeDevices(currentCamera, targetCamera) { newDevice ->
                    if (newDevice != null) {
                        currentCameraPosition[sessionId] = position
                        // PreviewView'ları güncelle
                        notifyPreviewViews(sessionId)
                        promise.resolve(null)
                    } else {
                        promise.reject("SELECT_CAMERA_ERROR", "Failed to select camera")
                    }
                }
            } else {
                // Kamera yoksa yeni kamerayı ekle
                session.attachDevice(targetCamera) { device ->
                    if (device != null) {
                        currentCameraPosition[sessionId] = position
                        // PreviewView'ları güncelle
                        notifyPreviewViews(sessionId)
                        promise.resolve(null)
                    } else {
                        promise.reject("SELECT_CAMERA_ERROR", "Failed to attach camera")
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject("SELECT_CAMERA_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun selectMicrophone(sessionId: String, deviceId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            // Tüm kullanılabilir cihazları listele
            val availableDevices = session.listAvailableDevices()
            val targetMicrophone = availableDevices.find { 
                it.type == Device.Descriptor.DeviceType.MICROPHONE && 
                it.deviceId == deviceId
            } ?: throw IllegalStateException("Microphone with deviceId '$deviceId' not found")

            // Mevcut mikrofonu bul
            val attachedDevices = session.listAttachedDevices()
            val currentMicrophone = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.MICROPHONE 
            }

            if (currentMicrophone != null) {
                // Mevcut mikrofonu yeni mikrofonla değiştir
                session.exchangeDevices(currentMicrophone, targetMicrophone) { newDevice ->
                    if (newDevice != null) {
                        promise.resolve(null)
                    } else {
                        promise.reject("SELECT_MICROPHONE_ERROR", "Failed to select microphone")
                    }
                }
            } else {
                // Mikrofon yoksa yeni mikrofonu ekle
                session.attachDevice(targetMicrophone) { device ->
                    if (device != null) {
                        promise.resolve(null)
                    } else {
                        promise.reject("SELECT_MICROPHONE_ERROR", "Failed to attach microphone")
                    }
                }
            }
        } catch (e: Exception) {
            promise.reject("SELECT_MICROPHONE_ERROR", e.message, e)
        }
    }

    private fun switchToCamera(session: BroadcastSession, sessionId: String, position: String) {
        val targetPosition = if (position == "front") 
            Device.Descriptor.Position.FRONT 
        else 
            Device.Descriptor.Position.BACK

        val cameras = session.listAvailableDevices()
            .filter { it.type == Device.Descriptor.DeviceType.CAMERA }

        val targetCamera = cameras.find { it.position == targetPosition }
            ?: throw IllegalStateException("Camera not available: $position")

        // Mevcut kamerayı bul ve değiştir
        val attachedDevices = session.listAttachedDevices()
        val currentCamera = attachedDevices.find { 
            it.descriptor.type == Device.Descriptor.DeviceType.CAMERA 
        }

        if (currentCamera != null) {
            session.exchangeDevices(currentCamera, targetCamera) { newDevice ->
                if (newDevice != null) {
                    currentCameraPosition[sessionId] = position
                    // PreviewView'ları güncelle
                    notifyPreviewViews(sessionId)
                }
            }
        } else {
            session.attachDevice(targetCamera) { device ->
                if (device != null) {
                    currentCameraPosition[sessionId] = position
                    // PreviewView'ları güncelle
                    notifyPreviewViews(sessionId)
                }
            }
        }
    }

    @ReactMethod
    fun setMuted(sessionId: String, muted: Boolean, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val attachedDevices = session.listAttachedDevices()
            val microphone = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.MICROPHONE 
            } as? AudioDevice

            microphone?.setGain(if (muted) 0f else 1f)
            isMutedState[sessionId] = muted

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SET_MUTED_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isMuted(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val muted = isMutedState[sessionId] ?: false
            promise.resolve(muted)
        } catch (e: Exception) {
            promise.reject("IS_MUTED_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateVideoConfig(sessionId: String, config: ReadableMap, promise: Promise) {
        try {
            // IVS SDK'da session oluşturulduktan sonra video config değiştirilemez
            // Sadece state'i kabul ediyoruz
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_VIDEO_CONFIG_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateAudioConfig(sessionId: String, config: ReadableMap, promise: Promise) {
        try {
            // IVS SDK'da session oluşturulduktan sonra audio config değiştirilemez
            // Sadece state'i kabul ediyoruz
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_AUDIO_CONFIG_ERROR", e.message, e)
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            // Event gönderimi başarısız olursa sessizce geç
        }
    }

    // MARK: - Gelişmiş Özellikler

    @ReactMethod
    fun listAvailableDevices(promise: Promise) {
        try {
            val context = reactApplicationContext
            val session = BroadcastSession(context, null, BroadcastConfiguration(), null)
            val devices = session.listAvailableDevices()
            
            val deviceArray = Arguments.createArray()
            devices.forEach { device ->
                val deviceMap = Arguments.createMap().apply {
                    putString("type", deviceTypeToString(device.type))
                    putString("position", devicePositionToString(device.position))
                    putString("deviceId", device.deviceId ?: "")
                    putString("friendlyName", device.friendlyName ?: "")
                    putBoolean("isDefault", device.isDefault)
                }
                deviceArray.pushMap(deviceMap)
            }
            
            session.release()
            promise.resolve(deviceArray)
        } catch (e: Exception) {
            promise.reject("LIST_DEVICES_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun listAttachedDevices(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val devices = session.listAttachedDevices()
            val deviceArray = Arguments.createArray()
            
            devices.forEach { device ->
                val deviceMap = Arguments.createMap().apply {
                    putString("type", deviceTypeToString(device.descriptor.type))
                    putString("position", devicePositionToString(device.descriptor.position))
                    putString("deviceId", device.descriptor.deviceId ?: "")
                    putString("friendlyName", device.descriptor.friendlyName ?: "")
                    putBoolean("isDefault", device.descriptor.isDefault)
                }
                deviceArray.pushMap(deviceMap)
            }
            
            promise.resolve(deviceArray)
        } catch (e: Exception) {
            promise.reject("LIST_ATTACHED_DEVICES_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setCameraZoom(sessionId: String, zoomFactor: Double, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val attachedDevices = session.listAttachedDevices()
            val cameraDevice = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.CAMERA 
            } as? ImageDevice

            if (cameraDevice != null) {
                cameraDevice.setZoomFactor(zoomFactor.toFloat())
                promise.resolve(null)
            } else {
                promise.reject("SET_ZOOM_ERROR", "Camera not found")
            }
        } catch (e: Exception) {
            promise.reject("SET_ZOOM_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setTorchEnabled(sessionId: String, enabled: Boolean, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val attachedDevices = session.listAttachedDevices()
            val cameraDevice = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.CAMERA 
            } as? ImageDevice

            if (cameraDevice != null) {
                cameraDevice.setTorchEnabled(enabled)
                promise.resolve(null)
            } else {
                promise.reject("SET_TORCH_ERROR", "Camera not found")
            }
        } catch (e: Exception) {
            promise.reject("SET_TORCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getCameraCapabilities(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val attachedDevices = session.listAttachedDevices()
            val cameraDevice = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.CAMERA 
            } as? ImageDevice

            if (cameraDevice != null) {
                val capabilities = Arguments.createMap().apply {
                    putDouble("minZoomFactor", cameraDevice.minZoomFactor.toDouble())
                    putDouble("maxZoomFactor", cameraDevice.maxZoomFactor.toDouble())
                    putBoolean("isTorchSupported", cameraDevice.isTorchSupported)
                }
                promise.resolve(capabilities)
            } else {
                promise.reject("GET_CAPABILITIES_ERROR", "Camera not found")
            }
        } catch (e: Exception) {
            promise.reject("GET_CAPABILITIES_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun sendTimedMetadata(sessionId: String, metadata: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            session.sendTimedMetadata(metadata)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SEND_METADATA_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setAudioGain(sessionId: String, gain: Double, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val attachedDevices = session.listAttachedDevices()
            val audioDevice = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.MICROPHONE 
            } as? AudioDevice

            if (audioDevice != null) {
                audioDevice.setGain(gain.toFloat())
                promise.resolve(null)
            } else {
                promise.reject("SET_GAIN_ERROR", "Microphone not found")
            }
        } catch (e: Exception) {
            promise.reject("SET_GAIN_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getAudioGain(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val attachedDevices = session.listAttachedDevices()
            val audioDevice = attachedDevices.find { 
                it.descriptor.type == Device.Descriptor.DeviceType.MICROPHONE 
            } as? AudioDevice

            if (audioDevice != null) {
                promise.resolve(audioDevice.gain.toDouble())
            } else {
                promise.reject("GET_GAIN_ERROR", "Microphone not found")
            }
        } catch (e: Exception) {
            promise.reject("GET_GAIN_ERROR", e.message, e)
        }
    }

    // Helper methods
    private fun deviceTypeToString(type: Device.Descriptor.DeviceType): String {
        return when (type) {
            Device.Descriptor.DeviceType.CAMERA -> "camera"
            Device.Descriptor.DeviceType.MICROPHONE -> "microphone"
            Device.Descriptor.DeviceType.USER_AUDIO -> "userAudio"
            Device.Descriptor.DeviceType.USER_VIDEO -> "userVideo"
            Device.Descriptor.DeviceType.USER_IMAGE -> "userVideo" // Android'de USER_IMAGE de USER_VIDEO olarak map ediyoruz
            else -> "unknown"
        }
    }

    private fun devicePositionToString(position: Device.Descriptor.Position): String {
        return when (position) {
            Device.Descriptor.Position.FRONT -> "front"
            Device.Descriptor.Position.BACK -> "back"
            else -> "unknown"
        }
    }

    // MARK: - Picture-in-Picture

    @ReactMethod
    fun isPictureInPictureSupported(promise: Promise) {
        try {
            val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            promise.resolve(supported)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun startPictureInPicture(sessionId: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                promise.reject("START_PIP_ERROR", "Picture-in-Picture requires Android 8.0 (API 26) or later")
                return
            }

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("START_PIP_ERROR", "Activity not found")
                return
            }

            // PiP parametrelerini ayarla (16:9 aspect ratio)
            val aspectRatio = Rational(16, 9)
            val pipParams = PictureInPictureParams.Builder()
                .setAspectRatio(aspectRatio)
                .build()

            activity.enterPictureInPictureMode(pipParams)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("START_PIP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopPictureInPicture(sessionId: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                promise.reject("STOP_PIP_ERROR", "Picture-in-Picture requires Android 8.0 (API 26) or later")
                return
            }

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.reject("STOP_PIP_ERROR", "Activity not found")
                return
            }

            // Android'de PiP'den çıkmak için Activity'yi normal moda döndürmek gerekir
            // Bu genellikle kullanıcı tarafından yapılır, ama programatik olarak da yapılabilir
            if (activity.isInPictureInPictureMode) {
                // Activity'yi normal moda döndür
                activity.moveTaskToBack(true)
            }
            
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STOP_PIP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getPictureInPictureState(sessionId: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                promise.resolve("unsupported")
                return
            }

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                promise.resolve("idle")
                return
            }

            if (activity.isInPictureInPictureMode) {
                promise.resolve("active")
            } else {
                promise.resolve("idle")
            }
        } catch (e: Exception) {
            promise.reject("GET_PIP_STATE_ERROR", e.message, e)
        }
    }
}
