// Retrieval: split documents into chunks and rank them against a question with BM25.
window.RAG = window.RAG || {};

RAG.retrieval = (function () {
  const STOPWORDS = new Set((
    "a an and are as at be been but by can could did do does for from had has have he her his how i if in into " +
    "is it its me my no not of on or our she so than that the their them then there these they this those to " +
    "too us was we were what when where which who whom why will with would you your about also any all just"
  ).split(" "));

  function tokenize(text) {
    return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [])
      .filter((t) => !STOPWORDS.has(t))
      .map(stem);
  }

  // Light suffix stripping so "policies" matches "policy" and "running" matches "run".
  function stem(t) {
    if (t.length <= 4) return t;
    if (t.endsWith("ies")) return t.slice(0, -3) + "y";
    if (t.endsWith("ing") && t.length > 5) return t.slice(0, -3);
    if (t.endsWith("ed") && t.length > 5) return t.slice(0, -2);
    if (t.endsWith("es") && t.length > 5) return t.slice(0, -2);
    if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
    return t;
  }

  // Splits text into chunks of about `size` characters, breaking at paragraph
  // or sentence boundaries where possible, with `overlap` characters repeated
  // between neighbouring chunks so an answer split across a boundary is kept.
  function chunkText(text, size = RAG.config.chunkSize, overlap = RAG.config.chunkOverlap) {
    const clean = text.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    const chunks = [];
    let start = 0;
    while (start < clean.length) {
      let end = Math.min(start + size, clean.length);
      if (end < clean.length) {
        const window = clean.slice(start, end);
        const breakAt = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"));
        if (breakAt > size * 0.5) end = start + breakAt + 1;
      }
      const piece = clean.slice(start, end).trim();
      if (piece) chunks.push(piece);
      if (end >= clean.length) break;
      start = Math.max(end - overlap, start + 1);
    }
    return chunks;
  }

  // Ranks every chunk of every document against the query (BM25, k1=1.5, b=0.75).
  function search(docs, query, k = RAG.config.topK) {
    const qTerms = [...new Set(tokenize(query))];
    if (!qTerms.length) return [];

    const items = [];
    for (const doc of docs) {
      for (const chunk of doc.chunks) {
        const terms = tokenize(chunk.text);
        const tf = new Map();
        for (const t of terms) tf.set(t, (tf.get(t) || 0) + 1);
        items.push({ doc, chunk, tf, len: terms.length });
      }
    }
    if (!items.length) return [];

    const avgLen = items.reduce((s, it) => s + it.len, 0) / items.length;
    const idf = {};
    for (const t of qTerms) {
      const df = items.filter((it) => it.tf.has(t)).length;
      idf[t] = Math.log(1 + (items.length - df + 0.5) / (df + 0.5));
    }

    const k1 = 1.5, b = 0.75;
    return items
      .map((it) => {
        let score = 0;
        for (const t of qTerms) {
          const f = it.tf.get(t) || 0;
          if (f) score += idf[t] * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * it.len) / avgLen));
        }
        return { score, docName: it.doc.name, docId: it.doc.id, chunkId: it.chunk.id, text: it.chunk.text };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  return { tokenize, chunkText, search };
})();
