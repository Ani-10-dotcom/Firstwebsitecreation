// Knowledge base storage in the browser's IndexedDB.
// Each document: { id, name, type, size, addedAt, text, chunks: [{ id, text }] }
window.RAG = window.RAG || {};

RAG.store = (function () {
  const DB_NAME = "rag-knowledge-base";
  const STORE = "documents";
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function run(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const result = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(result && "result" in result ? result.result : undefined);
      tx.onerror = () => reject(tx.error);
    });
  }

  return {
    all: () => run("readonly", (s) => s.getAll()).then((docs) => docs || []),
    put: (doc) => run("readwrite", (s) => s.put(doc)),
    remove: (id) => run("readwrite", (s) => s.delete(id)),
    clear: () => run("readwrite", (s) => s.clear()),
  };
})();

// Documents the user page can search: the ones in this browser plus the
// knowledge base published with the site (data/knowledge-base.json).
RAG.loadKnowledgeBase = async function () {
  const byId = new Map();
  try {
    const res = await fetch(RAG.config.publishedKbUrl, { cache: "no-cache" });
    if (res.ok) {
      const kb = await res.json();
      for (const doc of kb.documents || []) byId.set(doc.id, doc);
    }
  } catch (e) {
    // No published knowledge base (or opened from file://). Use local documents only.
  }
  for (const doc of await RAG.store.all()) byId.set(doc.id, doc);
  return [...byId.values()];
};
