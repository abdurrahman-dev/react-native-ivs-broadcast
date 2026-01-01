package com.reactnativeivsbroadcast

import android.content.Context
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.widget.FrameLayout
import com.amazonaws.ivs.broadcast.BroadcastSession
import com.amazonaws.ivs.broadcast.Device
import com.amazonaws.ivs.broadcast.ImageDevice

class IVSPreviewView(context: Context) : FrameLayout(context), SurfaceHolder.Callback {
    
    private var surfaceView: SurfaceView? = null
    private var imageDevice: ImageDevice? = null
    private var sessionId: String? = null
    private var aspectMode: String = "fill"
    private var isMirrored: Boolean = true
    private var retryHandler: android.os.Handler? = null
    
    init {
        setupSurfaceView()
        retryHandler = android.os.Handler(android.os.Looper.getMainLooper())
    }
    
    private fun setupSurfaceView() {
        surfaceView = SurfaceView(context).apply {
            layoutParams = LayoutParams(
                LayoutParams.MATCH_PARENT,
                LayoutParams.MATCH_PARENT
            )
            holder.addCallback(this@IVSPreviewView)
        }
        addView(surfaceView)
    }
    
    fun setSessionId(id: String?) {
        sessionId = id
        attachToSession()
    }
    
    fun setAspectMode(mode: String) {
        aspectMode = mode
        // Aspect mode değişikliği için layout güncellemesi yapılabilir
        requestLayout()
    }
    
    fun setMirrored(mirrored: Boolean) {
        isMirrored = mirrored
        surfaceView?.scaleX = if (mirrored) -1f else 1f
    }
    
    private fun attachToSession() {
        val session = getSession() ?: return
        val surface = surfaceView?.holder?.surface ?: return
        
        // Önceki preview'ı temizle
        imageDevice?.setPreviewSurface(null)
        imageDevice = null
        
        // Session'dan kamera device'ını al
        val attachedDevices = session.listAttachedDevices()
        val cameraDevice = attachedDevices.find { 
            it.descriptor.type == Device.Descriptor.DeviceType.CAMERA 
        } as? ImageDevice
        
        if (cameraDevice != null) {
            imageDevice = cameraDevice
            cameraDevice.setPreviewSurface(surface)
        } else {
            // Kamera henüz hazır değilse, biraz bekleyip tekrar dene
            retryHandler?.postDelayed({
                attachToSession()
            }, 300)
        }
    }
    
    private fun getSession(): BroadcastSession? {
        val id = sessionId ?: return null
        return IVSBroadcastModule.getSessionById(id)
    }
    
    override fun surfaceCreated(holder: SurfaceHolder) {
        attachToSession()
    }
    
    override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
        // Surface değişti, preview'ı güncelle
        attachToSession()
    }
    
    override fun surfaceDestroyed(holder: SurfaceHolder) {
        imageDevice?.setPreviewSurface(null)
        imageDevice = null
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        retryHandler?.removeCallbacksAndMessages(null)
        imageDevice?.setPreviewSurface(null)
        imageDevice = null
    }
    
    fun refreshPreview() {
        attachToSession()
    }
}

