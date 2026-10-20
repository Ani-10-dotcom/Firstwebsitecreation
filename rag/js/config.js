// Settings shared by the admin and user pages.
window.RAG = window.RAG || {};

RAG.config = {
  // SHA-256 of the admin passphrase. The default passphrase is "admin123".
  // Change it with: printf 'your-passphrase' | sha256sum
  // This only hides the admin page from casual visitors: the site is static,
  // so anyone who reads the source can get around it.
  adminPassHash: "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",

  // Chunking: characters per chunk and characters shared between neighbours.
  chunkSize: 900,
  chunkOverlap: 150,

  // How many chunks are sent to the LLM with each question.
  topK: 6,

  // Serverless endpoint that calls the LLM (see api/chat.js).
  apiEndpoint: "/api/chat",

  // Knowledge base published with the site. The user page loads it when present.
  publishedKbUrl: "data/knowledge-base.json",

  // Libraries used to read documents, loaded only when a file needs them.
  libs: {
    pdfjs: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    pdfjsWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
    mammoth: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
    xlsx: "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  },
};
