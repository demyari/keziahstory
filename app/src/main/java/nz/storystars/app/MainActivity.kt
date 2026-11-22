package nz.storystars.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.SharedPreferences
import android.content.pm.PackageManager
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
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.window.OnBackInvokedDispatcher
import org.json.JSONObject
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.time.LocalDate
import java.util.concurrent.Executors

class MainActivity : Activity() {

    private lateinit var web: WebView
    private lateinit var prefs: SharedPreferences
    private lateinit var voice: Voice
    private lateinit var engine: StoryEngine
    private val worker = Executors.newFixedThreadPool(3)
    private val main = Handler(Looper.getMainLooper())
    private var inFront = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        prefs = getSharedPreferences("storystars", MODE_PRIVATE)
        engine = StoryEngine(ClaudeClient { KeyVault.load(applicationContext) })
        voice = Voice(this, ::emit)
        voice.rate = if (config().optBoolean("slow", true)) 0.88f else 1.0f
        voice.wanted = config().optString("voice")

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#6EC6FF"))
        web.settings.apply {
            javaScriptEnabled = true
            // The story screen is bundled inside the app. It can never load
            // anything from the internet or open a link.
            blockNetworkLoads = true
            allowFileAccess = false
            allowContentAccess = false
            setSupportZoom(false)
            textZoom = 100
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
        }
        web.isLongClickable = false
        web.setOnLongClickListener { true }
        web.isHapticFeedbackEnabled = false
        web.addJavascriptInterface(Bridge(), "Native")

        val frame = FrameLayout(this)
        frame.setBackgroundColor(Color.parseColor("#6EC6FF"))
        frame.addView(
            web,
            FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        )
        setContentView(frame)

        // Keep the story clear of the notch, system bars and keyboard.
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            frame.setOnApplyWindowInsetsListener { v, insets ->
                val b = insets.getInsets(
                    WindowInsets.Type.systemBars() or
                        WindowInsets.Type.displayCutout() or
                        WindowInsets.Type.ime()
                )
                v.setPadding(b.left, b.top, b.right, b.bottom)
                insets
            }
        }

        if (Build.VERSION.SDK_INT >= 33) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_DEFAULT
            ) { emit("back", "null") }
        }

        web.loadUrl("file:///android_asset/index.html")
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        emit("back", "null")
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.insetsController?.let {
                it.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                it.hide(WindowInsets.Type.systemBars())
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility =
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
                    View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
        }
    }

    override fun onPause() {
        inFront = false
        voice.hush()
        voice.stopListening()
        emit("pause", "null")
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        inFront = true
        emit("resume", "null")
    }

    override fun onDestroy() {
        voice.shutdown()
        worker.shutdownNow()
        web.destroy()
        super.onDestroy()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val granted = grantResults.isNotEmpty() &&
            grantResults[0] == PackageManager.PERMISSION_GRANTED
        emit("mic", granted.toString())
    }

    /** Sends an event to the story screen. [json] must already be valid JSON. */
    private fun emit(event: String, json: String) {
        main.post {
            web.evaluateJavascript(
                "window.app&&window.app.on(${JSONObject.quote(event)},$json)", null
            )
        }
    }

    private fun config(): JSONObject {
        val c = try {
            JSONObject(prefs.getString("cfg", "{}") ?: "{}")
        } catch (e: Exception) {
            JSONObject()
        }
        if (!c.has("childName")) c.put("childName", "")
        if (!c.has("pages")) c.put("pages", 6)
        if (!c.has("pictures")) c.put("pictures", "quick")
        if (!c.has("perDay")) c.put("perDay", 5)
        if (!c.has("mic")) c.put("mic", true)
        if (!c.has("ideas")) c.put("ideas", true)
        if (!c.has("slow")) c.put("slow", true)
        if (!c.has("voice")) c.put("voice", "")
        if (!c.has("choices")) c.put("choices", 2)
        return c
    }

    private fun today(): String = LocalDate.now().toString()

    private fun storiesToday(): Int =
        if (prefs.getString("day", "") == today()) prefs.getInt("count", 0) else 0

    private fun explain(e: Exception): String = when (e) {
        is ApiException -> when (e.code) {
            401 -> "The API key was not accepted (401)."
            429 -> "Too many requests or out of credit (429)."
            0 -> e.message ?: "Something went wrong."
            else -> "Claude said: ${e.message} (${e.code})"
        }
        is UnknownHostException -> "No internet connection."
        is SocketTimeoutException -> "The internet is too slow right now."
        else -> e.javaClass.simpleName + ": " + (e.message ?: "")
    }

    /** Everything the story screen is allowed to ask the phone to do. */
    inner class Bridge {

        @JavascriptInterface
        fun getConfig(): String = config()
            .put("hasKey", KeyVault.has(applicationContext))
            .put("micGranted", voice.micAllowed())
            .put("canListen", voice.canListen())
            .put("storiesToday", storiesToday())
            .toString()

        @JavascriptInterface
        fun saveConfig(json: String) {
            val incoming = try {
                JSONObject(json)
            } catch (e: Exception) {
                return
            }
            val c = JSONObject()
                .put("childName", incoming.optString("childName").trim().take(30))
                .put("pages", incoming.optInt("pages", 6).coerceIn(3, 10))
                .put("pictures", if (incoming.optString("pictures") == "fancy") "fancy" else "quick")
                .put("perDay", incoming.optInt("perDay", 5).coerceIn(0, 99))
                .put("mic", incoming.optBoolean("mic", true))
                .put("ideas", incoming.optBoolean("ideas", true))
                .put("slow", incoming.optBoolean("slow", true))
                .put("voice", incoming.optString("voice").take(80))
                .put("choices", incoming.optInt("choices", 2).coerceIn(2, 3))
            prefs.edit().putString("cfg", c.toString()).apply()
            main.post {
                voice.rate = if (c.optBoolean("slow", true)) 0.88f else 1.0f
                voice.useVoice(c.optString("voice"))
            }
        }

        @JavascriptInterface
        fun setApiKey(key: String) {
            try {
                KeyVault.save(applicationContext, key)
            } catch (e: Exception) {
            }
        }

        @JavascriptInterface
        fun getVoices(): String = try {
            voice.voicesJson()
        } catch (e: Exception) {
            "[]"
        }

        @JavascriptInterface
        fun tryVoice(name: String, slow: Boolean) {
            main.post { voice.preview(name, slow) }
        }

        @JavascriptInterface
        fun resetVoice() {
            main.post {
                voice.hush()
                voice.useVoice(config().optString("voice"))
            }
        }

        @JavascriptInterface
        fun testKey() {
            worker.execute {
                val out = JSONObject()
                try {
                    engine.test()
                    out.put("ok", true)
                } catch (e: Exception) {
                    out.put("ok", false).put("error", explain(e))
                }
                emit("test", out.toString())
            }
        }

        @JavascriptInterface
        fun askMic() {
            main.post {
                if (voice.micAllowed()) {
                    emit("mic", "true")
                } else {
                    requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 1)
                }
            }
        }

        /** True if today's story allowance has not been used up. 0 means no limit. */
        @JavascriptInterface
        fun canStartStory(): Boolean {
            val limit = config().optInt("perDay", 5)
            return limit <= 0 || storiesToday() < limit
        }

        @JavascriptInterface
        fun countStory() {
            val n = storiesToday() + 1
            prefs.edit().putString("day", today()).putInt("count", n).apply()
        }

        @JavascriptInterface
        fun nextPage(id: String, json: String) {
            worker.execute {
                val out = JSONObject().put("id", id)
                try {
                    out.put("page", engine.page(JSONObject(json))).put("ok", true)
                } catch (e: Exception) {
                    out.put("ok", false).put("error", explain(e))
                }
                emit("result", out.toString())
            }
        }

        @JavascriptInterface
        fun drawPicture(id: String, json: String) {
            worker.execute {
                val out = JSONObject().put("id", id)
                try {
                    val fancy = config().optString("pictures") == "fancy"
                    val data = engine.picture(JSONObject(json), fancy)
                    if (data != null) out.put("ok", true).put("data", data) else out.put("ok", false)
                } catch (e: Exception) {
                    out.put("ok", false).put("error", explain(e))
                }
                emit("result", out.toString())
            }
        }

        @JavascriptInterface
        fun speak(text: String, id: String) {
            main.post {
                if (inFront) voice.speak(text, id) else emit("spoken", JSONObject.quote(id))
            }
        }

        @JavascriptInterface
        fun hush() {
            main.post { voice.hush() }
        }

        @JavascriptInterface
        fun listen() {
            main.post {
                if (inFront) voice.listen() else emit("listenError", JSONObject.quote("cancel"))
            }
        }

        @JavascriptInterface
        fun stopListening() {
            main.post { voice.stopListening() }
        }

        @JavascriptInterface
        fun quit() {
            main.post { finish() }
        }
    }
}
