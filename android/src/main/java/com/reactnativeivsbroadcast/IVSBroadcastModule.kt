package com.reactnativeivsbroadcast

import android.app.Activity
import android.content.Context
import android.view.View
import com.amazonaws.ivs.broadcast.BroadcastConfiguration
import com.amazonaws.ivs.broadcast.BroadcastSession
import com.amazonaws.ivs.broadcast.BroadcastState
import com.amazonaws.ivs.broadcast.Device
import com.amazonaws.ivs.broadcast.DeviceDescriptor
import com.amazonaws.ivs.broadcast.ImageDevice
import com.amazonaws.ivs.broadcast.MicrophoneDevice
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.net.URI
import java.util.concurrent.ConcurrentHashMap

class IVSBroadcastModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val sessions = ConcurrentHashMap<String, BroadcastSession>()
    private val sessionUrls = ConcurrentHashMap<String, URI>()
    private val reactContext = reactContext

    override fun getName(): String {
        return "IVSBroadcastModule"
    }

    @ReactMethod
    fun createSession(config: ReadableMap, promise: Promise) {
        try {
            val rtmpUrl = config.getString("rtmpUrl")
                ?: throw IllegalArgumentException("rtmpUrl is required")

            val streamKey = config.getString("streamKey")

            val fullUrl = if (streamKey != null) {
                "$rtmpUrl/$streamKey"
            } else {
                rtmpUrl
            }

            val broadcastConfig = BroadcastConfiguration()
            
            // Video config
            val videoConfig = config.getMap("videoConfig")
            if (videoConfig != null) {
                broadcastConfig.videoConfig.apply {
                    videoConfig.getInt("width")?.let { width = it }
                    videoConfig.getInt("height")?.let { height = it }
                    videoConfig.getInt("bitrate")?.let { bitrate = it }
                    videoConfig.getInt("fps")?.let { targetFps = it }
                    videoConfig.getInt("targetFps")?.let { targetFps = it }
                    videoConfig.getInt("keyframeInterval")?.let { keyframeInterval = it }
                }
            }

            // Audio config
            val audioConfig = config.getMap("audioConfig")
            if (audioConfig != null) {
                broadcastConfig.audioConfig.apply {
                    audioConfig.getInt("bitrate")?.let { bitrate = it }
                    audioConfig.getInt("sampleRate")?.let { sampleRate = it }
                    audioConfig.getInt("channels")?.let { channels = it }
                }
            }

            val sessionId = java.util.UUID.randomUUID().toString()
            
            // Listener'ı sessionId ile birlikte oluştur
            val listener = object : BroadcastSession.Listener() {
                override fun onStateChanged(state: BroadcastState.State) {
                    val eventMap = createStateMap(state)
                    eventMap.putString("sessionId", sessionId)
                    sendEvent("onStateChanged", eventMap)
                }

                override fun onError(error: Exception) {
                    val eventMap = createErrorMap(error)
                    eventMap.putString("sessionId", sessionId)
                    sendEvent("onError", eventMap)
                }

                override fun onNetworkHealth(health: BroadcastSession.NetworkHealth) {
                    val eventMap = createNetworkHealthMap(health)
                    eventMap.putString("sessionId", sessionId)
                    sendEvent("onNetworkHealth", eventMap)
                }

                override fun onAudioStats(stats: BroadcastSession.AudioStats) {
                    val eventMap = createAudioStatsMap(stats)
                    eventMap.putString("sessionId", sessionId)
                    sendEvent("onAudioStats", eventMap)
                }

                override fun onVideoStats(stats: BroadcastSession.VideoStats) {
                    val eventMap = createVideoStatsMap(stats)
                    eventMap.putString("sessionId", sessionId)
                    sendEvent("onVideoStats", eventMap)
                }
            }
            
            val session = BroadcastSession(
                reactContext.applicationContext,
                broadcastConfig,
                listener
            )
            
            sessions[sessionId] = session
            sessionUrls[sessionId] = URI.create(fullUrl)

            promise.resolve(sessionId)
        } catch (e: Exception) {
            promise.reject("CREATE_SESSION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startBroadcast(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val url = sessionUrls[sessionId]
                ?: throw IllegalArgumentException("Session URL not found: $sessionId")

            val devices = getDevices(sessionId)
            session.start(url, devices)

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
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            session.pause()

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

            session.resume()

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
            promise.resolve(createStateMap(state))
        } catch (e: Exception) {
            promise.reject("GET_STATE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun switchCamera(sessionId: String, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val availableCameras = session.listAvailableDevices(DeviceDescriptor.DeviceType.CAMERA)
            if (availableCameras.isEmpty()) {
                throw IllegalStateException("No camera devices available")
            }

            val activeDevices = session.listActiveDevices()
            val currentCamera = activeDevices.firstOrNull { 
                it.descriptor.type == DeviceDescriptor.DeviceType.CAMERA 
            }

            val newCamera = availableCameras.firstOrNull { 
                it.descriptor.uid != currentCamera?.descriptor?.uid 
            } ?: availableCameras.first()

            if (currentCamera != null) {
                session.replaceDevice(currentCamera, newCamera)
            } else {
                session.addDevice(newCamera)
            }

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

            val cameraType = when (position) {
                "front" -> DeviceDescriptor.DeviceType.CAMERA_FRONT
                "back" -> DeviceDescriptor.DeviceType.CAMERA_BACK
                else -> throw IllegalArgumentException("Invalid camera position: $position")
            }

            val cameraDevices = session.listAvailableDevices(cameraType)
            if (cameraDevices.isEmpty()) {
                throw IllegalStateException("Camera device not available: $position")
            }

            val currentCamera = session.listActiveDevices()
                .firstOrNull { it.descriptor.type == DeviceDescriptor.DeviceType.CAMERA }
            
            val newCamera = cameraDevices.first()
            
            if (currentCamera != null) {
                session.replaceDevice(currentCamera, newCamera)
            } else {
                session.addDevice(newCamera)
            }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SET_CAMERA_POSITION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setMuted(sessionId: String, muted: Boolean, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val microphone = session.listActiveDevices()
                .firstOrNull { it.descriptor.type == DeviceDescriptor.DeviceType.MICROPHONE }
                    as? MicrophoneDevice

            microphone?.setMuted(muted)

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

            val microphone = session.listActiveDevices()
                .firstOrNull { it.descriptor.type == DeviceDescriptor.DeviceType.MICROPHONE }
                    as? MicrophoneDevice

            promise.resolve(microphone?.isMuted ?: false)
        } catch (e: Exception) {
            promise.reject("IS_MUTED_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateVideoConfig(sessionId: String, config: ReadableMap, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val videoConfig = session.configuration.videoConfig
            config.getInt("width")?.let { videoConfig.width = it }
            config.getInt("height")?.let { videoConfig.height = it }
            config.getInt("bitrate")?.let { videoConfig.bitrate = it }
            config.getInt("fps")?.let { videoConfig.targetFps = it }
            config.getInt("targetFps")?.let { videoConfig.targetFps = it }
            config.getInt("keyframeInterval")?.let { videoConfig.keyframeInterval = it }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_VIDEO_CONFIG_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun updateAudioConfig(sessionId: String, config: ReadableMap, promise: Promise) {
        try {
            val session = sessions[sessionId]
                ?: throw IllegalArgumentException("Session not found: $sessionId")

            val audioConfig = session.configuration.audioConfig
            config.getInt("bitrate")?.let { audioConfig.bitrate = it }
            config.getInt("sampleRate")?.let { audioConfig.sampleRate = it }
            config.getInt("channels")?.let { audioConfig.channels = it }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("UPDATE_AUDIO_CONFIG_ERROR", e.message, e)
        }
    }

    private fun getDevices(sessionId: String): List<Device> {
        val session = sessions[sessionId]
            ?: throw IllegalArgumentException("Session not found: $sessionId")

        val devices = mutableListOf<Device>()

        // Kamera ekle (öncelikle arka kamera)
        val backCameraDescriptors = session.listAvailableDevices(DeviceDescriptor.DeviceType.CAMERA_BACK)
        val frontCameraDescriptors = session.listAvailableDevices(DeviceDescriptor.DeviceType.CAMERA_FRONT)
        val anyCameraDescriptors = session.listAvailableDevices(DeviceDescriptor.DeviceType.CAMERA)
        
        val cameraDescriptor = when {
            backCameraDescriptors.isNotEmpty() -> backCameraDescriptors.first()
            frontCameraDescriptors.isNotEmpty() -> frontCameraDescriptors.first()
            anyCameraDescriptors.isNotEmpty() -> anyCameraDescriptors.first()
            else -> null
        }
        
        if (cameraDescriptor != null) {
            val cameraDevice = session.addDevice(cameraDescriptor)
            if (cameraDevice != null) {
                devices.add(cameraDevice)
            }
        }

        // Mikrofon ekle
        val microphoneDescriptors = session.listAvailableDevices(DeviceDescriptor.DeviceType.MICROPHONE)
        if (microphoneDescriptors.isNotEmpty()) {
            val microphoneDevice = session.addDevice(microphoneDescriptors.first())
            if (microphoneDevice != null) {
                devices.add(microphoneDevice)
            }
        }

        return devices
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun createStateMap(state: BroadcastState.State): WritableMap {
        val map = Arguments.createMap()
        map.putBoolean("isBroadcasting", state == BroadcastState.State.CONNECTED)
        map.putBoolean("isPaused", state == BroadcastState.State.PAUSED)
        return map
    }

    private fun createErrorMap(error: Exception): WritableMap {
        val map = Arguments.createMap()
        map.putString("message", error.message ?: "Unknown error")
        map.putString("code", error.javaClass.simpleName)
        return map
    }

    private fun createNetworkHealthMap(health: BroadcastSession.NetworkHealth): WritableMap {
        val map = Arguments.createMap()
        val quality = when (health.networkQuality) {
            BroadcastSession.NetworkHealth.Quality.EXCELLENT -> "excellent"
            BroadcastSession.NetworkHealth.Quality.GOOD -> "good"
            BroadcastSession.NetworkHealth.Quality.FAIR -> "fair"
            BroadcastSession.NetworkHealth.Quality.POOR -> "poor"
            else -> "unknown"
        }
        map.putString("networkQuality", quality)
        map.putDouble("uplinkBandwidth", health.uplinkBandwidth.toDouble())
        map.putDouble("rtt", health.rtt.toDouble())
        return map
    }

    private fun createAudioStatsMap(stats: BroadcastSession.AudioStats): WritableMap {
        val map = Arguments.createMap()
        map.putDouble("bitrate", stats.bitrate.toDouble())
        map.putDouble("sampleRate", stats.sampleRate.toDouble())
        map.putInt("channels", stats.channels)
        return map
    }

    private fun createVideoStatsMap(stats: BroadcastSession.VideoStats): WritableMap {
        val map = Arguments.createMap()
        map.putDouble("bitrate", stats.bitrate.toDouble())
        map.putDouble("fps", stats.fps.toDouble())
        map.putInt("width", stats.width)
        map.putInt("height", stats.height)
        return map
    }
}

