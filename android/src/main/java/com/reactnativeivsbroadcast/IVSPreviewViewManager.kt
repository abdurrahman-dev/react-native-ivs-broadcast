package com.reactnativeivsbroadcast

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class IVSPreviewViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<IVSPreviewView>() {

    override fun getName(): String {
        return "IVSPreviewView"
    }

    override fun createViewInstance(reactContext: ThemedReactContext): IVSPreviewView {
        return IVSPreviewView(reactContext)
    }

    @ReactProp(name = "sessionId")
    fun setSessionId(view: IVSPreviewView, sessionId: String?) {
        view.setSessionId(sessionId)
    }

    @ReactProp(name = "aspectMode")
    fun setAspectMode(view: IVSPreviewView, aspectMode: String?) {
        view.setAspectMode(aspectMode ?: "fill")
    }

    @ReactProp(name = "isMirrored", defaultBoolean = true)
    fun setMirrored(view: IVSPreviewView, isMirrored: Boolean) {
        view.setMirrored(isMirrored)
    }

    override fun onAfterUpdateTransaction(view: IVSPreviewView) {
        super.onAfterUpdateTransaction(view)
        view.refreshPreview()
    }
}

