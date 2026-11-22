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
import android.speech.tts.Voice as TtsVoice
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

    var rate = 0.88f

    /** Name of the voice the grown-up picked, or "" to choose a female voice automatically. */
    var wanted = ""

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

                    // Lets the story screen light up each word as it is read.
                    override fun onRangeStart(utteranceId: String?, start: Int, end: Int, frame: Int) {
                        if (utteranceId != null) {
                            emit("range", JSONObject().put("id", utteranceId).put("s", start).toString())
                        }
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

    /** Installed English voices that work offline. */
    private fun englishVoices(): List<TtsVoice> = try {
        (tts?.voices ?: emptySet<TtsVoice>())
            .filter {
                it.locale.language == "en" &&
                    !it.isNetworkConnectionRequired &&
                    !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
            }
            .sortedBy { it.name }
    } catch (e: Exception) {
        emptyList()
    }

    /**
     * Android does not say whether a voice is male or female. Some voice names
     * do; for the rest this uses the usual Google voice codes as a best guess.
     * Null means "not sure". The settings screen lets a grown-up pick by ear.
     */
    private fun isFemale(v: TtsVoice): Boolean? {
        val name = v.name.lowercase()
        if (name.contains("female")) return true
        if (name.contains("#male") || name.contains("-male")) return false
        val code = name.substringAfter("-x-", "").substringBefore("-").substringBefore("#")
        return when (code) {
            "sfg", "iob", "iog", "tpc", "tpf", "gba", "gbc", "gbg", "fis", "aua", "auc", "ahp", "cxx", "enc" -> true
            "iol", "iom", "tpd", "gbb", "gbd", "rjs", "aub", "aud", "ene", "end" -> false
            else -> null
        }
    }

    private fun closeness(v: TtsVoice): Int = when (v.locale.country) {
        "NZ" -> 0
        "AU" -> 1
        "GB" -> 2
        "IE" -> 3
        "US" -> 4
        else -> 5
    }

    /** Uses the picked voice, else the best female voice, else the phone's default English. */
    private fun chooseVoice() {
        val engine = tts ?: return
        val all = englishVoices()
        val pick = all.firstOrNull { wanted.isNotEmpty() && it.name == wanted }
            ?: all.filter { isFemale(it) == true }
                .sortedWith(compareBy({ closeness(it) }, { -it.quality }, { it.name }))
                .firstOrNull()
        if (pick != null && engine.setVoice(pick) == TextToSpeech.SUCCESS) return
        val fallbacks = listOf("en-NZ", "en-AU", "en-GB", "en-US").map { Locale.forLanguageTag(it) }
        for (locale in fallbacks) {
            if (engine.isLanguageAvailable(locale) >= TextToSpeech.LANG_COUNTRY_AVAILABLE) {
                engine.setLanguage(locale)
                return
            }
        }
        engine.setLanguage(Locale.ENGLISH)
    }

    fun useVoice(name: String) {
        wanted = name
        if (ttsReady) chooseVoice()
    }

    /** The list shown in the grown-up settings. */
    fun voicesJson(): String {
        val out = JSONArray()
        if (!ttsReady) return out.toString()
        val counts = HashMap<String, Int>()
        for (v in englishVoices().sortedWith(compareBy({ closeness(it) }, { it.name }))) {
            val country = v.locale.displayCountry.ifBlank { "English" }
            val n = (counts[country] ?: 0) + 1
            counts[country] = n
            val kind = when (isFemale(v)) {
                true -> " (female)"
                false -> " (male)"
                null -> ""
            }
            out.put(JSONObject().put("name", v.name).put("label", "$country $n$kind"))
        }
        return out.toString()
    }

    fun preview(name: String, slow: Boolean) {
        val engine = tts ?: return
        if (!ttsReady) return
        val saved = wanted
        wanted = name
        chooseVoice()
        wanted = saved
        engine.stop()
        engine.setSpeechRate(if (slow) 0.88f else 1.0f)
        engine.setPitch(1.0f)
        engine.speak(
            "Hello! I am Stella the star. Shall we read a story together?",
            TextToSpeech.QUEUE_FLUSH, null, "preview"
        )
    }

    fun speak(text: String, id: String) {
        val engine = tts
        when {
            ttsFailed || engine == null -> spoken(id)
            !ttsReady -> waiting.add(text to id)
            else -> {
                engine.setSpeechRate(rate)
                engine.setPitch(1.0f)
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
