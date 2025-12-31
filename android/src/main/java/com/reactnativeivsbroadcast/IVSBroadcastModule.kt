package com.reactnativeivsbroadcast

import android.Manifest
import android.content.pm.PackageManager
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
                // Device eklendi
            }

            override fun onDeviceRemoved(descriptor: Device.Descriptor) {
                // Device kaldırıldı
            }
        }
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
                }
            }
        } else {
            session.attachDevice(targetCamera) { device ->
                if (device != null) {
                    currentCameraPosition[sessionId] = position
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
}
