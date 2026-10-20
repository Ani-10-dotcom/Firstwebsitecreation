# Firstwebsitecreation

Product page for the Leoron by Srushti Gold Outer Lid Pressure Cooker (3 L), in the style of a grocery e-commerce site, plus a document chatbot in `rag/`.

- `index.html` is the whole product site: HTML, CSS and JavaScript in one file, with the product photos embedded.
- Features: image gallery, add to basket, wishlist, specifications and customer reviews.
- Price, reviews and delivery notes are sample content. Replace them with real data.

## Document chatbot (`rag/`)

A retrieval-augmented generation (RAG) app with two pages:

- **`rag/admin.html`, for admins.** Sign in with the admin passphrase (default `admin123`), then upload documents. The browser extracts the text, splits it into chunks and indexes it. Supported: PDF, Word (.docx), Excel (.xlsx, .xls, .ods), CSV, PowerPoint (.pptx), OpenDocument (.odt, .odp), HTML, RTF, Markdown, plain text, code, and images (read with OCR). You can view the extracted text, delete documents, and test which passages a question retrieves.
- **`rag/index.html`, for users.** A chat interface like ChatGPT. Each question is matched against the document chunks (BM25 keyword ranking, in the browser). The best passages go to the LLM, which answers from them and cites them as [1], [2] and so on. The source passages appear under each answer, and conversations are saved in the browser.

### How the pieces fit

| File | Role |
| --- | --- |
| `rag/js/config.js` | Passphrase hash, chunk size, number of passages sent, library URLs |
| `rag/js/parsers.js` | Text extraction for each file type. Libraries load from a CDN only when needed |
| `rag/js/rag.js` | Chunking and BM25 search |
| `rag/js/store.js` | IndexedDB storage, and loading the published knowledge base |
| `rag/js/llm.js` | Calls `/api/chat` and streams the answer |
| `api/chat.js` | Vercel serverless function that sends the question and passages to Claude |

### Connecting the LLM

`api/chat.js` calls Claude through the Anthropic SDK. In the Vercel project settings, add the environment variable `ANTHROPIC_API_KEY`, then redeploy. The key stays on the server and never reaches the browser. The default model is `claude-opus-5-5`; set `ANTHROPIC_MODEL` to use another one.

Until the key is set, the chat still works: it shows the most relevant passages instead of a generated answer.

### Sharing documents with every user

Uploaded documents are stored in the admin's browser (IndexedDB), so other visitors can't see them yet. To publish them:

1. On the admin page, click **Export knowledge base**.
2. Save the file as `rag/data/knowledge-base.json` in this repository and push.

The chat page loads that file for every visitor. To give each admin upload to all users straight away, the knowledge base would need server storage, such as a database or Vercel Blob.

### Changing the admin passphrase

Run `printf 'new-passphrase' | sha256sum` and put the hash in `adminPassHash` in `rag/js/config.js`. The site is static, so this check only keeps casual visitors out. It isn't real access control.

## Run locally

Open `index.html` in a browser. No build step is needed.

For the chatbot, serve the folder (for example `npx serve .`) and open `/rag/`. Opened as a plain file, it works without the LLM. To run it with `/api/chat`, use `npx vercel dev` with `ANTHROPIC_API_KEY` set.

## Deploy

Hosted on Vercel. Every push to `main` redeploys it. The `api/` folder is deployed as serverless functions.
