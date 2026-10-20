// User chat page: conversations, retrieval and streaming answers.
(function () {
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = "rag-conversations";

  let docs = [];
  let conversations = loadConversations();
  let currentId = null;
  let busy = false;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  // Small Markdown renderer: code blocks, inline code, bold, italics, headings, lists, links.
  function renderMarkdown(md) {
    const blocks = [];
    let html = escapeHtml(md).replace(/```[\w-]*\n?([\s\S]*?)(```|$)/g, (_, code) => {
      blocks.push(`<pre><code>${code}</code></pre>`);
      return `\u0000${blocks.length - 1}\u0000`;
    });
    html = html
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,!?])/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    const out = [];
    let list = null;
    for (const line of html.split("\n")) {
      const ul = line.match(/^\s*[-*•]\s+(.*)/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
      const h = line.match(/^(#{1,4})\s+(.*)/);
      const type = ul ? "ul" : ol ? "ol" : null;
      if (list && list !== type) { out.push(`</${list}>`); list = null; }
      if (type) {
        if (!list) { out.push(`<${type}>`); list = type; }
        out.push(`<li>${(ul || ol)[1]}</li>`);
      } else if (h) {
        out.push(`<h${h[1].length + 2}>${h[2]}</h${h[1].length + 2}>`);
      } else if (line.trim()) {
        out.push(`<p>${line}</p>`);
      }
    }
    if (list) out.push(`</${list}>`);
    return out.join("").replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
  }

  // ---------- Conversations (kept in this browser) ----------
  function loadConversations() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; }
  }
  function saveConversations() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch (e) {}
  }
  function current() {
    return conversations.find((c) => c.id === currentId);
  }

  function renderSidebar() {
    $("conversations").innerHTML = conversations.map((c) => `
      <div class="conversation ${c.id === currentId ? "active" : ""}" data-id="${c.id}">
        <span>${escapeHtml(c.title)}</span>
        <button class="delete" data-delete="${c.id}" aria-label="Delete chat">✕</button>
      </div>`).join("");
  }

  $("conversations").addEventListener("click", (e) => {
    if (busy) return;
    const del = e.target.dataset.delete;
    if (del) {
      conversations = conversations.filter((c) => c.id !== del);
      saveConversations();
      if (del === currentId) currentId = null;
      renderSidebar();
      renderThread();
      return;
    }
    const row = e.target.closest(".conversation");
    if (row) {
      currentId = row.dataset.id;
      $("sidebar").classList.remove("open");
      renderSidebar();
      renderThread();
    }
  });

  $("new-chat").addEventListener("click", () => {
    if (busy) return;
    currentId = null;
    $("sidebar").classList.remove("open");
    renderSidebar();
    renderThread();
    $("input").focus();
  });

  $("menu").addEventListener("click", () => $("sidebar").classList.toggle("open"));

  // ---------- Thread ----------
  function sourcesHtml(sources) {
    if (!sources || !sources.length) return "";
    return `<details class="sources"><summary>${sources.length} source passage${sources.length === 1 ? "" : "s"}</summary>` +
      sources.map((s, i) => `<div class="source"><b>[${i + 1}] ${escapeHtml(s.docName)}</b><div>${escapeHtml(s.text)}</div></div>`).join("") +
      `</details>`;
  }

  function messageHtml(m) {
    if (m.role === "user") return `<div class="msg user"><div class="bubble">${escapeHtml(m.content)}</div></div>`;
    return `<div class="msg assistant"><div class="avatar">✦</div><div class="body">
      ${m.note ? `<p class="note">${escapeHtml(m.note)}</p>` : ""}
      <div class="answer">${renderMarkdown(m.content)}</div>${sourcesHtml(m.sources)}</div></div>`;
  }

  function renderThread() {
    const conv = current();
    if (!conv) {
      const names = docs.slice(0, 3).map((d) => d.name.replace(/\.[^.]+$/, ""));
      const suggestions = names.length
        ? [`Summarize ${names[0]}`, ...names.slice(1).map((n) => `What are the key points in ${n}?`), "What topics do the documents cover?"]
        : [];
      $("thread").innerHTML = `
        <div class="welcome">
          <h1>What would you like to know?</h1>
          <p>${docs.length ? "Ask anything about the uploaded documents." : "No documents have been uploaded yet. An admin can add them on the Admin page."}</p>
          <div class="suggestions">${suggestions.map((s) => `<button>${escapeHtml(s)}</button>`).join("")}</div>
        </div>`;
      return;
    }
    $("thread").innerHTML = conv.messages.map(messageHtml).join("");
    scrollToBottom();
  }

  $("thread").addEventListener("click", (e) => {
    if (e.target.matches(".suggestions button")) send(e.target.textContent);
  });

  function scrollToBottom() {
    $("messages").scrollTop = $("messages").scrollHeight;
  }

  // ---------- Asking ----------
  async function send(question) {
    question = question.trim();
    if (!question || busy) return;
    busy = true;
    $("send").disabled = true;
    $("input").value = "";
    autoresize();

    let conv = current();
    if (!conv) {
      conv = { id: String(Date.now()), title: question.slice(0, 60), messages: [] };
      conversations.unshift(conv);
      currentId = conv.id;
      renderSidebar();
    }
    const history = conv.messages.map((m) => ({ role: m.role, content: m.content }));
    conv.messages.push({ role: "user", content: question });

    // Include the previous question so follow-ups like "and what about the second one?" still retrieve well.
    const previous = [...conv.messages].reverse().find((m, i) => i > 0 && m.role === "user");
    const sources = RAG.retrieval.search(docs, previous ? `${question} ${previous.content}` : question);
    const reply = { role: "assistant", content: "", sources };
    renderThread();
    $("thread").insertAdjacentHTML("beforeend", messageHtml(reply));
    const answerEl = $("thread").lastElementChild.querySelector(".answer");
    answerEl.classList.add("typing");
    scrollToBottom();

    if (!docs.length) {
      reply.content = "There are no documents in the knowledge base yet, so I can't answer questions about them. Ask an admin to upload some.";
    } else {
      try {
        await RAG.llm.ask({
          question,
          passages: sources,
          history,
          onToken: (t) => {
            reply.content += t;
            answerEl.innerHTML = renderMarkdown(reply.content);
            scrollToBottom();
          },
        });
        setLlmStatus(true);
      } catch (err) {
        if (err instanceof RAG.llm.LLMUnavailable) {
          setLlmStatus(false);
          reply.note = `${err.message} Showing the most relevant passages instead.`;
          reply.content = sources.length
            ? sources.slice(0, 3).map((s, i) => `**[${i + 1}] ${s.docName}**\n\n${s.text}`).join("\n\n")
            : "I couldn't find anything in the documents that matches your question.";
        } else {
          reply.content = (reply.content ? reply.content + "\n\n" : "") + `_${err.message || "Something went wrong."}_`;
        }
      }
    }

    conv.messages.push(reply);
    saveConversations();
    renderThread();
    busy = false;
    $("send").disabled = !$("input").value.trim();
  }

  function setLlmStatus(connected) {
    $("llm-status").textContent = connected ? "● LLM connected" : "○ LLM not connected";
  }

  // ---------- Composer ----------
  function autoresize() {
    const el = $("input");
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  $("input").addEventListener("input", () => {
    autoresize();
    $("send").disabled = busy || !$("input").value.trim();
  });
  $("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      send($("input").value);
    }
  });
  $("composer").addEventListener("submit", (e) => {
    e.preventDefault();
    send($("input").value);
  });

  // ---------- Start ----------
  (async function init() {
    renderSidebar();
    renderThread();
    try {
      docs = await RAG.loadKnowledgeBase();
    } catch (e) {
      console.error(e);
    }
    const chunks = docs.reduce((n, d) => n + d.chunks.length, 0);
    $("kb-status").textContent = docs.length
      ? `${docs.length} document${docs.length === 1 ? "" : "s"} · ${chunks} chunks`
      : "No documents uploaded";
    renderThread();
  })();
})();
