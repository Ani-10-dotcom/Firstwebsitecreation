// Sends the question and the retrieved passages to the LLM endpoint (api/chat.js)
// and streams the answer back as plain text.
window.RAG = window.RAG || {};

RAG.llm = (function () {
  class LLMUnavailable extends Error {}

  async function ask({ question, passages, history, onToken, signal }) {
    let res;
    try {
      res = await fetch(RAG.config.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history,
          passages: passages.map((p) => ({ source: p.docName, text: p.text })),
        }),
        signal,
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new LLMUnavailable("Could not reach the LLM endpoint.");
    }
    // 404/405: the site is served without the serverless function (local file, plain static host).
    if (res.status === 404 || res.status === 405) throw new LLMUnavailable("No LLM endpoint is deployed.");
    if (!res.ok) {
      let message = `LLM request failed (${res.status}).`;
      try { message = (await res.json()).error || message; } catch (e) {}
      if (res.status === 503) throw new LLMUnavailable(message);
      throw new Error(message);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      full += text;
      onToken(text);
    }
    return full;
  }

  return { ask, LLMUnavailable };
})();
