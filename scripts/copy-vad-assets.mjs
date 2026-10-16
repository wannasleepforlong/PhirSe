// Copies Silero VAD model, audio worklet and ONNX Runtime WASM files into public/vad/
// so the browser loads them from our own origin. Runs on postinstall.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public", "vad");
fs.mkdirSync(out, { recursive: true });

const sources = [
  ["node_modules/@ricky0123/vad-web/dist", (f) => f.endsWith(".onnx") || f === "vad.worklet.bundle.min.js"],
  ["node_modules/onnxruntime-web/dist", (f) => /^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(f)],
];

let copied = 0;
for (const [dir, keep] of sources) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!keep(f)) continue;
    fs.copyFileSync(path.join(abs, f), path.join(out, f));
    copied++;
  }
}
console.log(`copy-vad-assets: ${copied} files -> public/vad`);
