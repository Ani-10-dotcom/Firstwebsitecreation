// Admin page: sign-in, upload and indexing, knowledge base management.
(function () {
  const $ = (id) => document.getElementById(id);
  const SESSION_KEY = "rag-admin-signed-in";

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  }

  async function sha256(text) {
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // ---------- Sign-in ----------
  function showAdmin() {
    $("login").hidden = true;
    $("admin").hidden = false;
    renderDocs();
  }

  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if ((await sha256($("passphrase").value)) === RAG.config.adminPassHash) {
      sessionStorage.setItem(SESSION_KEY, "1");
      showAdmin();
    } else {
      $("login-error").textContent = "Wrong passphrase.";
    }
  });

  $("logout").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  if (sessionStorage.getItem(SESSION_KEY)) showAdmin();

  // ---------- Upload ----------
  const dropzone = $("dropzone");
  $("file-input").accept = RAG.parsers.accept;
  $("file-input").addEventListener("change", (e) => {
    processFiles([...e.target.files]);
    e.target.value = "";
  });
  dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("over"); });
  dropzone.addEventListener("dragleave", () => dropzone.classList.remove("over"));
  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("over");
    processFiles([...e.dataTransfer.files]);
  });

  async function processFiles(files) {
    for (const file of files) {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `<span>${escapeHtml(file.name)}</span><span class="state">Waiting…</span>`;
      $("queue").prepend(row);
      const state = row.querySelector(".state");
      try {
        state.textContent = "Reading…";
        const text = await RAG.parsers.extractText(file, (msg) => (state.textContent = msg));
        if (!text || !text.trim()) throw new Error("No text found in this file.");
        state.textContent = "Indexing…";
        const id = `${file.name}-${file.size}-${file.lastModified}`;
        const chunks = RAG.retrieval.chunkText(text).map((t, i) => ({ id: `${id}#${i}`, text: t }));
        await RAG.store.put({
          id,
          name: file.name,
          type: file.type || file.name.split(".").pop(),
          size: file.size,
          addedAt: new Date().toISOString(),
          text,
          chunks,
        });
        row.classList.add("done");
        state.textContent = `Done: ${chunks.length} chunks`;
      } catch (err) {
        console.error(err);
        row.classList.add("failed");
        state.textContent = err.message || "Failed to read this file.";
      }
      renderDocs();
    }
  }

  // ---------- Document list ----------
  async function renderDocs() {
    const docs = (await RAG.store.all()).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    const chunkCount = docs.reduce((n, d) => n + d.chunks.length, 0);
    $("kb-summary").textContent = docs.length
      ? `${docs.length} document${docs.length === 1 ? "" : "s"}, ${chunkCount} chunks indexed.`
      : "No documents yet. Upload some above.";
    $("doc-rows").innerHTML = docs.length
      ? docs.map((d) => `
        <tr>
          <td class="name">${escapeHtml(d.name)}</td>
          <td class="hide-sm">${new Date(d.addedAt).toLocaleDateString()}</td>
          <td class="hide-sm">${formatSize(d.size)}</td>
          <td><span class="badge">${d.chunks.length}</span></td>
          <td class="actions">
            <button class="btn" data-preview="${escapeHtml(d.id)}">View text</button>
            <button class="btn danger" data-delete="${escapeHtml(d.id)}">Delete</button>
          </td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="empty">Nothing uploaded.</td></tr>`;
    $("export").disabled = $("clear").disabled = !docs.length;
  }

  $("doc-rows").addEventListener("click", async (e) => {
    const del = e.target.dataset.delete;
    const prev = e.target.dataset.preview;
    if (del && confirm("Delete this document from the knowledge base?")) {
      await RAG.store.remove(del);
      $("preview").hidden = true;
      renderDocs();
    }
    if (prev) {
      const doc = (await RAG.store.all()).find((d) => d.id === prev);
      $("preview").hidden = false;
      $("preview").textContent = doc ? doc.text : "";
    }
  });

  $("clear").addEventListener("click", async () => {
    if (confirm("Delete every document from the knowledge base in this browser?")) {
      await RAG.store.clear();
      $("preview").hidden = true;
      renderDocs();
    }
  });

  // ---------- Export / import ----------
  $("export").addEventListener("click", async () => {
    const kb = { version: 1, exportedAt: new Date().toISOString(), documents: await RAG.store.all() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(kb)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-base.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $("import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const kb = JSON.parse(await file.text());
      const docs = (kb.documents || []).filter((d) => d.id && d.name && Array.isArray(d.chunks));
      for (const doc of docs) await RAG.store.put(doc);
      alert(`Imported ${docs.length} document${docs.length === 1 ? "" : "s"}.`);
    } catch (err) {
      alert("That file is not a knowledge base export.");
    }
    renderDocs();
  });

  // ---------- Retrieval test ----------
  $("search-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = $("search-input").value.trim();
    if (!query) return;
    const results = RAG.retrieval.search(await RAG.store.all(), query);
    $("search-results").innerHTML = results.length
      ? results.map((r, i) => `
        <div class="source">
          <b>[${i + 1}] ${escapeHtml(r.docName)} <span class="badge">score ${r.score.toFixed(2)}</span></b>
          <div>${escapeHtml(r.text)}</div>
        </div>`).join("")
      : `<p class="empty">No passages match.</p>`;
  });
})();
