package nz.storystars.storybook

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * Narration with the phone's own offline text-to-speech. Prefers a New Zealand
 * English voice, then Australian, British, Irish and American, and a female
 * voice where the engine says so. Must be called on the main thread.
 */
class BookVoice(
    context: Context,
    private val emit: (type: String, id: String) -> Unit
) {
    private var tts: TextToSpeech? = null
    private var ready = false
    private var failed = false
    private var wanted = ""
    private val waiting = ArrayList<Array<Any>>()

    init {
        tts = TextToSpeech(context.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                ready = true
                chooseVoice()
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) { if (utteranceId != null) emit("done", utteranceId) }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) { if (utteranceId != null) emit("error", utteranceId) }
                    override fun onError(utteranceId: String?, errorCode: Int) { if (utteranceId != null) emit("error", utteranceId) }
                    override fun onStop(utteranceId: String?, interrupted: Boolean) { if (utteranceId != null) emit("done", utteranceId) }
                })
                val queued = ArrayList(waiting)
                waiting.clear()
                queued.forEach { speak(it[0] as String, it[1] as String, it[2] as Float, it[3] as Float, it[4] as Float) }
            } else {
                failed = true
                waiting.forEach { emit("error", it[1] as String) }
                waiting.clear()
            }
        }
    }

    private fun englishVoices(): List<Voice> = try {
        (tts?.voices ?: emptySet<Voice>()).filter {
            it.locale.language == "en" && !it.isNetworkConnectionRequired &&
                !it.features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
        }
    } catch (e: Exception) {
        emptyList()
    }

    private fun closeness(v: Voice): Int = when (v.locale.country) {
        "NZ" -> 0; "AU" -> 1; "GB" -> 2; "IE" -> 3; "US" -> 4; else -> 5
    }

    /** Engines rarely say a voice's gender; these are the usual Google voice codes, as a best guess. */
    private fun femaleScore(v: Voice): Int {
        val name = v.name.lowercase()
        if (name.contains("female")) return 0
        if (name.contains("#male") || name.contains("-male")) return 2
        val code = name.substringAfter("-x-", "").substringBefore("-").substringBefore("#")
        return when (code) {
            "sfg", "iob", "iog", "tpc", "tpf", "gba", "gbc", "gbg", "fis", "aua", "auc", "ahp", "cxx", "enc" -> 0
            "iol", "iom", "tpd", "gbb", "gbd", "rjs", "aub", "aud", "ene", "end" -> 2
            else -> 1
        }
    }

    private fun chooseVoice() {
        val engine = tts ?: return
        val all = englishVoices()
        val pick = all.firstOrNull { wanted.isNotEmpty() && it.name == wanted }
            ?: all.sortedWith(compareBy({ closeness(it) }, { femaleScore(it) }, { -it.quality }, { it.name })).firstOrNull()
        if (pick != null && engine.setVoice(pick) == TextToSpeech.SUCCESS) return
        for (tag in listOf("en-NZ", "en-AU", "en-GB", "en-US")) {
            val locale = Locale.forLanguageTag(tag)
            if (engine.isLanguageAvailable(locale) >= TextToSpeech.LANG_COUNTRY_AVAILABLE) {
                engine.setLanguage(locale)
                return
            }
        }
        engine.setLanguage(Locale.ENGLISH)
    }

    fun useVoice(name: String) {
        wanted = name
        if (ready) chooseVoice()
    }

    fun voicesJson(): String {
        val out = JSONArray()
        if (!ready) return out.toString()
        for (v in englishVoices().sortedWith(compareBy({ closeness(it) }, { femaleScore(it) }, { it.name }))) {
            val country = v.locale.displayCountry.ifBlank { "English" }
            val kind = when (femaleScore(v)) { 0 -> ", female"; 2 -> ", male"; else -> "" }
            out.put(JSONObject().put("name", v.name).put("label", "$country English ($kind${v.name.takeLast(6)})".replace("(, ", "(")).put("lang", v.locale.toLanguageTag()))
        }
        return out.toString()
    }

    fun speak(text: String, id: String, pitch: Float, rate: Float, volume: Float) {
        val engine = tts
        when {
            failed || engine == null -> emit("error", id)
            !ready -> waiting.add(arrayOf<Any>(text, id, pitch, rate, volume))
            else -> {
                engine.setPitch(pitch.coerceIn(0.5f, 2f))
                engine.setSpeechRate(rate.coerceIn(0.5f, 1.6f))
                val params = Bundle().apply { putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume.coerceIn(0f, 1f)) }
                if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, params, id) != TextToSpeech.SUCCESS) emit("error", id)
            }
        }
    }

    fun stop() {
        waiting.clear()
        tts?.stop()
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
    }
}
