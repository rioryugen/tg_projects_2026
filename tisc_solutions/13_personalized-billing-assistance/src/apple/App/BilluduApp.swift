import SwiftUI
import PhotosUI
import PDFKit
import Vision
import VisionKit
import JavaScriptCore
import AVFoundation
import UniformTypeIdentifiers

@main
struct BilluduApp: App {
    var body: some Scene { WindowGroup { ContentView() } }
}

// MARK: - Shared JS engine (same tested bundle as the web portal and Android; no network involved)

enum Bridge {
    static func run(_ fn: String, _ first: String, _ history: String) -> [String: Any]? {
        guard let url = Bundle.main.url(forResource: "billudu-engine", withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8),
              let context = JSContext() else { return nil }
        context.evaluateScript(source)
        guard let call = context.objectForKeyedSubscript("Billudu")?.objectForKeyedSubscript(fn),
              let out = call.call(withArguments: [first, history])?.toString(),
              let data = out.data(using: .utf8) else { return nil }
        return try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    static func json(_ object: Any) -> String {
        (try? JSONSerialization.data(withJSONObject: object)).flatMap { String(data: $0, encoding: .utf8) } ?? "null"
    }
}

enum HistoryStore {
    private static let key = "billudu.history.v1"
    static func load() -> [[String: Double]] {
        guard let s = UserDefaults.standard.string(forKey: key), let d = s.data(using: .utf8) else { return [] }
        return (try? JSONDecoder().decode([[String: Double]].self, from: d)) ?? []
    }
    static func append(_ bill: [String: Any]) {
        guard let units = num(bill["units"]), let total = num(bill["billAmount"]) else { return }
        var entry = ["units": units, "total": total]
        if let days = num(bill["days"]) { entry["days"] = days }
        let all = Array((load() + [entry]).suffix(12))
        if let d = try? JSONEncoder().encode(all) { UserDefaults.standard.set(String(data: d, encoding: .utf8), forKey: key) }
    }
}

func num(_ v: Any?) -> Double? { (v as? NSNumber)?.doubleValue }
func fmt(_ d: Double) -> String { d == d.rounded() ? String(Int(d)) : String(d) }

let itemLabels: [(String, String)] = [
    ("energy", "Energy charges"), ("fixed", "Fixed charges"), ("customer", "Customer charges"), ("duty", "Electricity duty"),
    ("interestED", "Interest on ED"), ("surcharge", "Surcharge"), ("acdSurcharge", "ACD surcharge"), ("fsa", "FSA/FCA"),
    ("trueUp", "True-up"), ("interestSD", "Interest on SD"), ("subsidy", "Subsidy"), ("adjustment", "Adjustment"),
    ("interestCD", "Interest on CD"), ("lossGain", "Loss/Gain"),
]

// MARK: - Scanner (VisionKit) and OCR (Vision), both fully on-device

struct ScannerView: UIViewControllerRepresentable {
    let onScan: (UIImage) -> Void
    func makeCoordinator() -> Coordinator { Coordinator(onScan) }
    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let vc = VNDocumentCameraViewController()
        vc.delegate = context.coordinator
        return vc
    }
    func updateUIViewController(_ vc: VNDocumentCameraViewController, context: Context) {}

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScan: (UIImage) -> Void
        init(_ onScan: @escaping (UIImage) -> Void) { self.onScan = onScan }
        func documentCameraViewController(_ c: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            if scan.pageCount > 0 { onScan(scan.imageOfPage(at: 0)) }
            c.dismiss(animated: true)
        }
        func documentCameraViewControllerDidCancel(_ c: VNDocumentCameraViewController) { c.dismiss(animated: true) }
        func documentCameraViewController(_ c: VNDocumentCameraViewController, didFailWithError error: Error) { c.dismiss(animated: true) }
    }
}

extension UIImage {
    /// Bake in EXIF orientation so Vision coordinates match the pixels.
    func upright() -> UIImage {
        guard imageOrientation != .up else { return self }
        return UIGraphicsImageRenderer(size: size).image { _ in draw(in: CGRect(origin: .zero, size: size)) }
    }
}

/// Line boxes in image pixels, clockwise from top-left (Vision is normalised with a bottom-left origin).
func recognizeBoxes(_ image: UIImage, completion: @escaping ([[String: Any]]) -> Void) {
    let image = image.upright()
    guard let cg = image.cgImage else { completion([]); return }
    let w = Double(cg.width), h = Double(cg.height)
    let request = VNRecognizeTextRequest { req, _ in
        let boxes: [[String: Any]] = (req.results as? [VNRecognizedTextObservation] ?? []).compactMap { obs in
            guard let text = obs.topCandidates(1).first?.string else { return nil }
            let pts = [obs.topLeft, obs.topRight, obs.bottomRight, obs.bottomLeft].map { [$0.x * w, (1 - $0.y) * h] }
            return ["text": text, "box": pts]
        }
        DispatchQueue.main.async { completion(boxes) }
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = false
    request.recognitionLanguages = ["en-US"]
    DispatchQueue.global(qos: .userInitiated).async { try? VNImageRequestHandler(cgImage: cg).perform([request]) }
}

func renderPDF(_ url: URL) -> UIImage? {
    guard let page = PDFDocument(url: url)?.page(at: 0) else { return nil }
    let box = page.bounds(for: .mediaBox)
    return page.thumbnail(of: CGSize(width: 2000, height: 2000 * box.height / box.width), for: .mediaBox)
}

// MARK: - UI

struct ContentView: View {
    @State private var status = ""
    @State private var result: [String: Any]?
    @State private var fields: [String: String] = [:]
    @State private var showScanner = false
    @State private var showFiles = false
    @State private var photo: PhotosPickerItem?
    private let synth = AVSpeechSynthesizer()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("Billudu · బిల్లుడు").font(.title.bold())
                Button("📷 Scan bill") { if VNDocumentCameraViewController.isSupported { showScanner = true } else { status = "Scanner unavailable. Use Photo / PDF." } }
                    .buttonStyle(.borderedProminent)
                PhotosPicker("Photo from library", selection: $photo, matching: .images).buttonStyle(.bordered)
                Button("PDF / file") { showFiles = true }.buttonStyle(.bordered)
                Button("Enter numbers manually") { startManual() }.buttonStyle(.bordered)
                if !status.isEmpty { Text(status).font(.footnote) }

                if !fields.isEmpty { fieldsForm }
                if let r = result, r["confident"] != nil { resultView(r) }
                Text("Processed on your device. Estimates are not official.").font(.caption)
            }.padding()
        }
        .sheet(isPresented: $showScanner) { ScannerView { process($0) } }
        .fileImporter(isPresented: $showFiles, allowedContentTypes: [.pdf, .image]) { handleFile($0) }
        .onChange(of: photo) { item in
            Task {
                if let data = try? await item?.loadTransferable(type: Data.self), let image = UIImage(data: data) { process(image) }
            }
        }
    }

    private var fieldsForm: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Check the numbers").font(.headline)
            fieldRow("units", "Units"); fieldRow("days", "Billing days"); fieldRow("billAmount", "Bill amount (₹)")
            ForEach(itemLabels, id: \.0) { fieldRow("item:\($0.0)", $0.1) }
            Button("Explain my bill") { explain() }.buttonStyle(.borderedProminent)
        }
    }

    private func fieldRow(_ key: String, _ label: String) -> some View {
        HStack {
            Text(label).font(.footnote).frame(width: 150, alignment: .leading)
            TextField("", text: Binding(get: { fields[key] ?? "" }, set: { fields[key] = $0 }))
                .keyboardType(.decimalPad).textFieldStyle(.roundedBorder)
        }
    }

    @ViewBuilder private func resultView(_ r: [String: Any]) -> some View {
        if r["confident"] as? Bool == true, let te = r["telugu"] as? String, let en = r["english"] as? String {
            Text(te)
            Button("🔊 Listen") { speak(te) }.buttonStyle(.bordered)
            Text(en)
            if let c = r["change"] as? [String: Any] { Text(c["te"] as? String ?? ""); Text(c["en"] as? String ?? "") }
            if let f = r["forecast"] as? [String: Any] { Text(f["te"] as? String ?? ""); Text(f["en"] as? String ?? "") }
            if let v = r["validation"] as? [String: Any], !((v["warnings"] as? [Any]) ?? []).isEmpty {
                Text("⚠ Please double-check units and billing days against your bill.")
            }
        } else {
            Text("బిల్లును నమ్మకంగా చదవలేకపోయాను. పై అంకెలను బిల్లుతో సరిచూసి సరిచేయండి.")
            Text("Could not verify the bill. Compare the fields above with your bill and fix them.")
        }
    }

    private func startManual() {
        fields = ["units": "", "days": "", "billAmount": ""]
        itemLabels.forEach { fields["item:\($0.0)"] = "" }
        result = [:]
    }

    private func fill(_ bill: [String: Any]?) {
        fields = [:]
        guard let bill else { return }
        for k in ["units", "days", "billAmount"] { if let v = num(bill[k]) { fields[k] = fmt(v) } }
        for (k, v) in (bill["items"] as? [String: Any] ?? [:]) { if let d = num(v) { fields["item:\(k)"] = fmt(d) } }
    }

    private func process(_ image: UIImage) {
        status = "Reading bill on this device…"
        recognizeBoxes(image) { boxes in
            let history = Bridge.json(HistoryStore.load())
            guard let r = Bridge.run("analyzeBoxesJson", Bridge.json(boxes), history) else { status = "Could not read this image."; return }
            result = r
            fill(r["bill"] as? [String: Any])
            status = r["confident"] as? Bool == true ? "Bill read and verified. Check the numbers below." : "Some numbers could not be verified. Please correct them, then tap Explain."
        }
    }

    private func handleFile(_ outcome: Result<URL, Error>) {
        guard case .success(let url) = outcome else { return }
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        let image = url.pathExtension.lowercased() == "pdf" ? renderPDF(url) : (try? Data(contentsOf: url)).flatMap(UIImage.init(data:))
        if let image { process(image) } else { status = "Could not open this file." }
    }

    private func explain() {
        var bill: [String: Any] = [:], items: [String: Double] = [:]
        for (k, v) in fields {
            guard let n = Double(v) else { continue }
            if k.hasPrefix("item:") { items[String(k.dropFirst(5))] = n } else { bill[k] = n }
        }
        bill["items"] = items
        if let due = num((result?["bill"] as? [String: Any])?["totalDue"]) { bill["totalDue"] = due }
        guard let r = Bridge.run("analyzeBillJson", Bridge.json(bill), Bridge.json(HistoryStore.load())) else { return }
        result = r
        if r["confident"] as? Bool == true { HistoryStore.append(bill) }
    }

    private func speak(_ s: String) {
        let u = AVSpeechUtterance(string: s)
        u.voice = AVSpeechSynthesisVoice(language: "te-IN")
        synth.stopSpeaking(at: .immediate)
        synth.speak(u)
    }
}
