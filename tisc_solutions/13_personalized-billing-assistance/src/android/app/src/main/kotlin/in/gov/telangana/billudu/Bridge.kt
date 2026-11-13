package `in`.gov.telangana.billudu

import android.content.Context
import app.cash.quickjs.QuickJs
import org.json.JSONArray
import org.json.JSONObject

/** Runs the shared, tested JS engine (assets/billudu-engine.js) on-device; no network involved. */
object Bridge {
    private fun run(ctx: Context, fn: String, first: String, history: String): JSONObject {
        val script = ctx.assets.open("billudu-engine.js").bufferedReader().use { it.readText() }
        QuickJs.create().use { js ->
            js.evaluate(script)
            val out = js.evaluate("Billudu.$fn(${JSONObject.quote(first)}, ${JSONObject.quote(history)})") as String
            return JSONObject(out)
        }
    }

    fun analyzeBoxes(ctx: Context, boxes: JSONArray, history: JSONArray) = run(ctx, "analyzeBoxesJson", boxes.toString(), history.toString())

    fun analyzeBill(ctx: Context, bill: JSONObject, history: JSONArray) = run(ctx, "analyzeBillJson", bill.toString(), history.toString())
}

object HistoryStore {
    private const val PREFS = "billudu"
    private const val KEY = "history"

    fun load(ctx: Context): JSONArray =
        runCatching { JSONArray(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]")) }.getOrDefault(JSONArray())

    fun append(ctx: Context, bill: JSONObject) {
        val all = load(ctx)
        val entry = JSONObject().put("units", bill.getDouble("units")).put("total", bill.getDouble("billAmount"))
        if (bill.has("days")) entry.put("days", bill.getDouble("days"))
        all.put(entry)
        val last12 = JSONArray((0 until all.length()).drop((all.length() - 12).coerceAtLeast(0)).map { all.get(it) })
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, last12.toString()).apply()
    }
}
