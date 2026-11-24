package nz.storystars.storybook

import android.annotation.SuppressLint
import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.window.OnBackInvokedDispatcher
import org.json.JSONObject
import java.io.IOException

/**
 * A full-screen book. The pages are the bundled web app in assets/storybook,
 * served from a private https address inside the app so nothing ever goes to
 * the internet. Narration uses the phone's own text-to-speech voices.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var voice: BookVoice
    private val main = Handler(Looper.getMainLooper())

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        voice = BookVoice(this) { type, id -> emit(type, id) }

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#241F48"))
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true // saved progress (localStorage)
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            textZoom = 100
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = true

            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val url = request.url
                if (url.host != HOST) {
                    // Nothing outside the app is ever loaded.
                    return WebResourceResponse("text/plain", "utf-8", 403, "Offline", emptyMap(), null)
                }
                var path = url.path ?: "/"
                if (path.endsWith("/")) path += "index.html"
                return try {
                    val stream = assets.open("storybook" + path)
                    WebResourceResponse(mimeFor(path), if (isText(path)) "utf-8" else null, stream)
                } catch (e: IOException) {
                    WebResourceResponse("text/plain", "utf-8", 404, "Not found", emptyMap(), null)
                }
            }
        }
        web.isLongClickable = false
        web.setOnLongClickListener { true }
        web.isHapticFeedbackEnabled = false
        web.addJavascriptInterface(VoiceBridge(), "StoryVoice")

        val frame = FrameLayout(this)
        frame.setBackgroundColor(Color.parseColor("#241F48"))
        frame.addView(web, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
        setContentView(frame)

        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            frame.setOnApplyWindowInsetsListener { v, insets ->
                val b = insets.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                v.setPadding(b.left, b.top, b.right, b.bottom)
                insets
            }
        }
        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { goBack() }
        }

        web.loadUrl("https://$HOST/index.html")
    }

    private fun goBack() {
        web.evaluateJavascript("window.storybookBack && window.storybookBack()", null)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        goBack()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let {
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                it.hide(WindowInsets.Type.systemBars())
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        }
    }

    override fun onPause() {
        voice.stop()
        web.onPause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        voice.shutdown()
        web.destroy()
        super.onDestroy()
    }

    /** Tells the page that an utterance finished ("done") or failed ("error"). */
    private fun emit(type: String, id: String) {
        main.post {
            web.evaluateJavascript(
                "window.storyVoiceEvent && window.storyVoiceEvent(${JSONObject.quote(type)}, ${JSONObject.quote(id)})", null
            )
        }
    }

    /** The only things the page may ask of the phone: speak, stop, list and pick voices. */
    inner class VoiceBridge {
        @JavascriptInterface
        fun speak(text: String, id: String, pitch: Double, rate: Double, volume: Double) {
            main.post { voice.speak(text.take(600), id, pitch.toFloat(), rate.toFloat(), volume.toFloat()) }
        }

        @JavascriptInterface
        fun stop() {
            main.post { voice.stop() }
        }

        @JavascriptInterface
        fun voices(): String = voice.voicesJson()

        @JavascriptInterface
        fun setVoice(name: String) {
            main.post { voice.useVoice(name.take(120)) }
        }
    }

    companion object {
        const val HOST = "appassets.androidplatform.net"

        fun isText(path: String) = path.endsWith(".html") || path.endsWith(".js") || path.endsWith(".css") ||
            path.endsWith(".json") || path.endsWith(".webmanifest")

        fun mimeFor(path: String): String = when (path.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "js", "mjs" -> "text/javascript"
            "css" -> "text/css"
            "json" -> "application/json"
            "webmanifest" -> "application/manifest+json"
            "webp" -> "image/webp"
            "png" -> "image/png"
            "svg" -> "image/svg+xml"
            "woff2" -> "font/woff2"
            "ogg" -> "audio/ogg"
            else -> "application/octet-stream"
        }
    }
}
