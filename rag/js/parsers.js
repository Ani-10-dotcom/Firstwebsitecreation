// Reads the text out of an uploaded file, entirely in the browser.
window.RAG = window.RAG || {};

RAG.parsers = (function () {
  const loaded = {};

  function loadScript(url) {
    if (!loaded[url]) {
      loaded[url] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = url;
        s.onload = resolve;
        s.onerror = () => reject(new Error("Could not load " + url));
        document.head.appendChild(s);
      });
    }
    return loaded[url];
  }

  const TEXT_EXT = new Set([
    "txt", "md", "markdown", "csv", "tsv", "json", "xml", "yaml", "yml", "log", "ini",
    "js", "ts", "py", "java", "c", "cpp", "h", "cs", "go", "rb", "php", "sql", "sh", "css",
  ]);
  const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "gif", "bmp", "webp", "tif", "tiff"]);

  function extOf(name) {
    const i = name.lastIndexOf(".");
    return i < 0 ? "" : name.slice(i + 1).toLowerCase();
  }

  async function pdf(file, progress) {
    await loadScript(RAG.config.libs.pdfjs);
    pdfjsLib.GlobalWorkerOptions.workerSrc = RAG.config.libs.pdfjsWorker;
    const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      progress(`Reading page ${i} of ${doc.numPages}`);
      const content = await (await doc.getPage(i)).getTextContent();
      let line = "";
      const lines = [];
      for (const item of content.items) {
        line += item.str;
        if (item.hasEOL) { lines.push(line); line = ""; }
      }
      if (line) lines.push(line);
      pages.push(`[Page ${i}]\n` + lines.join("\n"));
    }
    const text = pages.join("\n\n");
    // A scanned PDF has no text layer. Say so rather than storing nothing.
    if (text.replace(/\[Page \d+\]/g, "").trim().length < 20) {
      throw new Error("This PDF has no selectable text (it is probably scanned). Upload the pages as images to read them with OCR.");
    }
    return text;
  }

  async function docx(file) {
    await loadScript(RAG.config.libs.mammoth);
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  async function spreadsheet(file) {
    await loadScript(RAG.config.libs.xlsx);
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return wb.SheetNames.map((name) =>
      `[Sheet: ${name}]\n` + XLSX.utils.sheet_to_csv(wb.Sheets[name], { blankrows: false })
    ).join("\n\n");
  }

  // .pptx, .odt, .odp: zip archives of XML. Pull the text runs out of each part.
  async function zippedXml(file, partPattern, textTag) {
    await loadScript(RAG.config.libs.jszip);
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const parts = Object.keys(zip.files)
      .filter((p) => partPattern.test(p))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const out = [];
    for (const p of parts) {
      const xml = new DOMParser().parseFromString(await zip.file(p).async("string"), "application/xml");
      const paragraphs = [...xml.getElementsByTagName(textTag)].map((n) => n.textContent.trim()).filter(Boolean);
      if (paragraphs.length) out.push(`[${p.split("/").pop()}]\n` + paragraphs.join("\n"));
    }
    return out.join("\n\n");
  }

  async function html(file) {
    const doc = new DOMParser().parseFromString(await file.text(), "text/html");
    doc.querySelectorAll("script, style, noscript").forEach((n) => n.remove());
    return doc.body ? doc.body.innerText || doc.body.textContent : "";
  }

  // Strips RTF control words. Good enough for plain prose.
  async function rtf(file) {
    return (await file.text())
      .replace(/\\par[d]?/g, "\n")
      .replace(/\{\\\*[^{}]*\}/g, "")
      .replace(/\\'[0-9a-f]{2}/gi, "")
      .replace(/\\[a-z]+-?\d* ?/gi, "")
      .replace(/[{}]/g, "")
      .trim();
  }

  async function image(file, progress) {
    await loadScript(RAG.config.libs.tesseract);
    const result = await Tesseract.recognize(file, "eng", {
      logger: (m) => m.status && progress(`OCR: ${m.status} ${Math.round((m.progress || 0) * 100)}%`),
    });
    return result.data.text;
  }

  async function extractText(file, progress = () => {}) {
    const ext = extOf(file.name);
    if (ext === "pdf" || file.type === "application/pdf") return pdf(file, progress);
    if (ext === "docx") return docx(file);
    if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) return spreadsheet(file);
    if (ext === "pptx") return zippedXml(file, /^ppt\/slides\/slide\d+\.xml$/, "a:p");
    if (ext === "odt" || ext === "odp") return zippedXml(file, /^content\.xml$/, "text:p");
    if (ext === "html" || ext === "htm") return html(file);
    if (ext === "rtf") return rtf(file);
    if (IMAGE_EXT.has(ext) || file.type.startsWith("image/")) return image(file, progress);
    if (TEXT_EXT.has(ext) || file.type.startsWith("text/")) return file.text();
    if (ext === "doc" || ext === "ppt") {
      throw new Error(`Old .${ext} files can't be read in the browser. Save it as .${ext}x and upload again.`);
    }
    // Unknown type: accept it if it decodes as readable text.
    const text = await file.text();
    const readable = text.replace(/[^\x09\x0a\x0d\x20-\x7e -￿]/g, "");
    if (text.length && readable.length / text.length > 0.95 && !text.includes("�")) return text;
    throw new Error(`Unsupported file type: .${ext || "unknown"}`);
  }

  return {
    extractText,
    accept: ".pdf,.docx,.xlsx,.xls,.xlsm,.ods,.pptx,.odt,.odp,.html,.htm,.rtf,.png,.jpg,.jpeg,.gif,.bmp,.webp,.tif,.tiff," +
      [...TEXT_EXT].map((e) => "." + e).join(","),
  };
})();
