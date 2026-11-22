package nz.storystars.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * Reading aloud and listening, using the speech services already on the phone.
 * Every method here must be called on the main thread.
 */
class Voice(
    private val activity: Activity,
    private val emit: (event: String, json: String) -> Unit
) : RecognitionListener {

    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var ttsFailed = false
    private val waiting = ArrayList<Pair<String, String>>()
    private var recognizer: SpeechRecognizer? = null

    var rate = 0.85f

    init {
        tts = TextToSpeech(activity.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                chooseVoice()
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}

                    override fun onDone(utteranceId: String?) {
                        spoken(utteranceId)
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        spoken(utteranceId)
                    }

                    override fun onError(utteranceId: String?, errorCode: Int) {
                        spoken(utteranceId)
                    }
                })
                ttsReady = true
                val queued = ArrayList(waiting)
                waiting.clear()
                queued.forEach { speak(it.first, it.second) }
            } else {
                ttsFailed = true
                val queued = ArrayList(waiting)
                waiting.clear()
                queued.forEach { spoken(it.second) }
            }
        }
    }

    private fun spoken(id: String?) {
        if (id != null) emit("spoken", JSONObject.quote(id))
    }

    /** Prefer a New Zealand voice, then other English voices. */
    private fun chooseVoice() {
        val engine = tts ?: return
        val wanted = listOf("en-NZ", "en-AU", "en-GB", "en-US").map { Locale.forLanguageTag(it) }
        for (locale in wanted) {
            if (engine.isLanguageAvailable(locale) >= TextToSpeech.LANG_COUNTRY_AVAILABLE) {
                engine.setLanguage(locale)
                return
            }
        }
        engine.setLanguage(Locale.ENGLISH)
    }

    fun speak(text: String, id: String) {
        val engine = tts
        when {
            ttsFailed || engine == null -> spoken(id)
            !ttsReady -> waiting.add(text to id)
            else -> {
                engine.setSpeechRate(rate)
                engine.setPitch(1.08f)
                if (engine.speak(text, TextToSpeech.QUEUE_ADD, null, id) != TextToSpeech.SUCCESS) {
                    spoken(id)
                }
            }
        }
    }

    fun hush() {
        waiting.clear()
        tts?.stop()
    }

    fun micAllowed(): Boolean =
        activity.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    fun canListen(): Boolean = SpeechRecognizer.isRecognitionAvailable(activity)

    fun listen() {
        if (!micAllowed()) {
            emit("listenError", JSONObject.quote("denied"))
            return
        }
        if (!canListen()) {
            emit("listenError", JSONObject.quote("unavailable"))
            return
        }
        try {
            val r = recognizer ?: SpeechRecognizer.createSpeechRecognizer(activity).also {
                it.setRecognitionListener(this)
                recognizer = it
            }
            r.cancel()
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                )
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-NZ")
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, activity.packageName)
            }
            r.startListening(intent)
        } catch (e: Exception) {
            emit("listenError", JSONObject.quote("unavailable"))
        }
    }

    fun stopListening() {
        try {
            recognizer?.cancel()
        } catch (e: Exception) {
        }
    }

    fun shutdown() {
        try {
            recognizer?.destroy()
        } catch (e: Exception) {
        }
        recognizer = null
        tts?.stop()
        tts?.shutdown()
        tts = null
    }

    // ---- RecognitionListener ----

    override fun onReadyForSpeech(params: Bundle?) {
        emit("listenState", JSONObject.quote("ready"))
    }

    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        emit("listenState", JSONObject.quote("end"))
    }

    override fun onError(error: Int) {
        val reason = when (error) {
            SpeechRecognizer.ERROR_NO_MATCH,
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY,
            SpeechRecognizer.ERROR_CLIENT -> "nomatch"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "denied"
            else -> "unavailable"
        }
        emit("listenError", JSONObject.quote(reason))
    }

    override fun onResults(results: Bundle?) {
        val heard = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (heard.isNullOrEmpty()) {
            emit("listenError", JSONObject.quote("nomatch"))
        } else {
            emit("heard", JSONArray(heard).toString())
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
}
