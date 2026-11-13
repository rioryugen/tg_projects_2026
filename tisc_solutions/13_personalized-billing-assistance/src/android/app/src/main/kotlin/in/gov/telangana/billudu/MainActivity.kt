package `in`.gov.telangana.billudu

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Bundle
import android.speech.tts.TextToSpeech
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult
import com.google.mlkit.vision.text.Text as MlText
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class MainActivity : ComponentActivity() {
    private var tts: TextToSpeech? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        tts = TextToSpeech(this) { if (it == TextToSpeech.SUCCESS) tts?.language = Locale("te", "IN") }
        setContent { MaterialTheme { BilluduScreen { tts?.speak(it, TextToSpeech.QUEUE_FLUSH, null, "bill") } } }
    }

    override fun onDestroy() {
        tts?.shutdown()
        super.onDestroy()
    }
}

private val ITEM_LABELS = linkedMapOf(
    "energy" to "Energy charges", "fixed" to "Fixed charges", "customer" to "Customer charges", "duty" to "Electricity duty",
    "interestED" to "Interest on ED", "surcharge" to "Surcharge", "acdSurcharge" to "ACD surcharge", "fsa" to "FSA/FCA",
    "trueUp" to "True-up", "interestSD" to "Interest on SD", "subsidy" to "Subsidy", "adjustment" to "Adjustment",
    "interestCD" to "Interest on CD", "lossGain" to "Loss/Gain",
)

private fun fmt(d: Double) = if (d == d.toLong().toDouble()) d.toLong().toString() else d.toString()

/** Line boxes in image pixels, clockwise from top-left, as the shared engine expects. */
private fun toBoxes(text: MlText): JSONArray {
    val boxes = JSONArray()
    for (block in text.textBlocks) for (line in block.lines) {
        val pts = line.cornerPoints ?: continue
        boxes.put(JSONObject().put("text", line.text).put("box", JSONArray(pts.map { JSONArray(listOf(it.x, it.y)) })))
    }
    return boxes
}

/** First page of a PDF rendered large enough for small receipt text. */
private fun renderPdf(ctx: Context, uri: Uri): Bitmap? {
    val fd = ctx.contentResolver.openFileDescriptor(uri, "r") ?: return null
    return fd.use {
        PdfRenderer(it).use { renderer ->
            renderer.openPage(0).use { page ->
                val scale = 2000f / page.width
                val bmp = Bitmap.createBitmap(2000, (page.height * scale).toInt(), Bitmap.Config.ARGB_8888)
                bmp.eraseColor(Color.WHITE)
                page.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                bmp
            }
        }
    }
}

@Composable
fun BilluduScreen(speak: (String) -> Unit) {
    val ctx = LocalContext.current
    var status by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<JSONObject?>(null) }
    val fields = remember { mutableStateMapOf<String, String>() }

    fun fillFields(bill: JSONObject?) {
        fields.clear()
        if (bill == null) return
        for (k in listOf("units", "days", "billAmount")) if (bill.has(k)) fields[k] = fmt(bill.getDouble(k))
        val items = bill.optJSONObject("items") ?: return
        for (k in items.keys()) fields["item:$k"] = fmt(items.getDouble(k))
    }

    fun onResult(r: JSONObject) {
        result = r
        fillFields(r.optJSONObject("bill"))
        status = if (r.optBoolean("confident")) "Bill read and verified. Check the numbers below." else "Some numbers could not be verified. Please correct them, then tap Explain."
    }

    fun recognize(image: InputImage) {
        status = "Reading bill on this device…"
        TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).process(image)
            .addOnSuccessListener { onResult(Bridge.analyzeBoxes(ctx, toBoxes(it), HistoryStore.load(ctx))) }
            .addOnFailureListener { status = "Could not read this image. Try a clearer, closer photo." }
    }

    val scanner = remember {
        GmsDocumentScanning.getClient(
            GmsDocumentScannerOptions.Builder().setGalleryImportAllowed(true).setPageLimit(1)
                .setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
                .setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL).build(),
        )
    }
    val scanLauncher = rememberLauncherForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { r ->
        if (r.resultCode != Activity.RESULT_OK) return@rememberLauncherForActivityResult
        val page = GmsDocumentScanningResult.fromActivityResultIntent(r.data)?.pages?.firstOrNull() ?: return@rememberLauncherForActivityResult
        recognize(InputImage.fromFilePath(ctx, page.imageUri))
    }
    val pickLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val isPdf = ctx.contentResolver.getType(uri) == "application/pdf"
        val bmp = if (isPdf) renderPdf(ctx, uri) else null
        if (isPdf && bmp == null) status = "Could not open this PDF." else recognize(bmp?.let { InputImage.fromBitmap(it, 0) } ?: InputImage.fromFilePath(ctx, uri))
    }

    fun explain() {
        val bill = JSONObject()
        val items = JSONObject()
        for ((k, v) in fields) {
            val n = v.toDoubleOrNull() ?: continue
            if (k.startsWith("item:")) items.put(k.removePrefix("item:"), n) else bill.put(k, n)
        }
        bill.put("items", items)
        result?.optJSONObject("bill")?.optDouble("totalDue")?.takeIf { !it.isNaN() }?.let { bill.put("totalDue", it) }
        val r = Bridge.analyzeBill(ctx, bill, HistoryStore.load(ctx))
        result = r
        if (r.optBoolean("confident")) HistoryStore.append(ctx, bill)
    }

    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("Billudu · బిల్లుడు", style = MaterialTheme.typography.headlineMedium)
        Button(modifier = Modifier.fillMaxWidth(), onClick = {
            scanner.getStartScanIntent(ctx as Activity)
                .addOnSuccessListener { scanLauncher.launch(IntentSenderRequest.Builder(it).build()) }
                .addOnFailureListener { status = "Scanner unavailable on this device. Use Photo / PDF instead." }
        }) { Text("📷 Scan bill") }
        OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = { pickLauncher.launch("*/*") }) { Text("Photo / PDF from device") }
        OutlinedButton(modifier = Modifier.fillMaxWidth(), onClick = { fields.clear(); result = JSONObject(); fields["units"] = ""; fields["days"] = ""; fields["billAmount"] = ""; ITEM_LABELS.keys.forEach { fields["item:$it"] = "" } }) { Text("Enter numbers manually") }
        if (status.isNotEmpty()) Text(status)

        if (fields.isNotEmpty()) {
            val labels = linkedMapOf("units" to "Units", "days" to "Billing days", "billAmount" to "Bill amount (₹)") + ITEM_LABELS.mapKeys { "item:${it.key}" }
            for ((key, label) in labels) {
                if (key !in fields && !key.startsWith("item:")) continue
                OutlinedTextField(fields[key] ?: "", { fields[key] = it }, label = { Text(label) }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            }
            Button(modifier = Modifier.fillMaxWidth(), onClick = { explain() }) { Text("Explain my bill") }
        }

        result?.takeIf { it.has("confident") }?.let { r ->
            if (!r.optBoolean("confident")) {
                Text("బిల్లును నమ్మకంగా చదవలేకపోయాను. పై అంకెలను బిల్లుతో సరిచూసి సరిచేయండి.")
                Text("Could not verify the bill: ${r.optJSONObject("validation")?.optJSONArray("issues")}")
            } else {
                val te = r.getString("telugu")
                Text(te)
                OutlinedButton(onClick = { speak(te) }) { Text("🔊 Listen") }
                Text(r.getString("english"))
                r.optJSONObject("change")?.let { Text(it.getString("te")); Text(it.getString("en")) }
                r.optJSONObject("forecast")?.let { Text(it.getString("te")); Text(it.getString("en")) }
                if ((r.optJSONObject("validation")?.optJSONArray("warnings")?.length() ?: 0) > 0) Text("⚠ Please double-check units and billing days against your bill.")
            }
        }
        Text("Processed on your device. Estimates are not official.", style = MaterialTheme.typography.bodySmall)
    }
}
