// frontend/static/app.js
const $ = id => document.getElementById(id);

// ----- small helpers -----
function show(el, yes = true) { el.style.display = yes ? "" : "none"; }
function setText(id, txt) { const el = $(id); if (el) el.textContent = txt; }

async function safeFetch(url, options = {}, timeout = 10000) {
  // timeout in ms
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ----- Employer UI (no auth) -----
function renderEmpQuestions() {
  const container = $("emp-questions");
  container.innerHTML = "";
  for (let i = 1; i <= 20; i++) {
    const label = document.createElement("label");
    label.style.display = "block";
    label.innerHTML = `Q${i}: <input data-q="Q${i}" type="number" min="1" max="4" value="3" />`;
    container.appendChild(label);
  }
}

// Instead of register/login, store a simple employer name locally
$("emp-register").onclick = async () => {
  const username = $("emp-username").value.trim();
  if (!username) { alert("Enter employer name"); return; }
  localStorage.setItem("emp_name", username);
  $("emp-area").style.display = "block";
  renderEmpQuestions();
  alert("Employer name saved locally. You can now create an assessment.");
};

$("emp-login").onclick = () => {
  // kept for UI compatibility: act like "use saved name"
  const name = localStorage.getItem("emp_name");
  if (!name) { alert("No saved employer name. Use Register to set a name."); return; }
  $("emp-username").value = name;
  $("emp-area").style.display = "block";
  renderEmpQuestions();
  alert("Logged in (local).");
};

$("emp-create").onclick = async () => {
  const employer = $("emp-username").value.trim() || localStorage.getItem("emp_name") || "anonymous";
  const inputs = document.querySelectorAll("#emp-questions [data-q]");
  const answers = {};
  inputs.forEach(inp => { answers[inp.getAttribute("data-q")] = parseInt(inp.value || "0", 10); });

  $("emp-create").disabled = true;
  setText("emp-dashboard", "Creating assessment...");

  try {
    const res = await safeFetch("/employer/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employer, answers })
    }, 10000);

    if (!res) throw new Error("No response (timeout)");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Server error ${res.status}: ${text}`);
    }

    const j = await res.json();
    alert(`Assessment created:\nID: ${j.assessment_id}\nApplicant URL: ${j.applicant_url}\nMax questions: ${j.max_questions}`);
    setText("emp-dashboard", JSON.stringify(j, null, 2));
  } catch (err) {
    console.error(err);
    alert("Failed to create assessment: " + (err.message || err));
    setText("emp-dashboard", "Error creating assessment: " + (err.message || ""));
  } finally {
    $("emp-create").disabled = false;
  }
};

// emp-refresh: not supported server-side; keep as a local display refresher
$("emp-refresh").onclick = () => {
  setText("emp-dashboard", "Local dashboard not implemented server-side. Use the created assessment id to test applicant flow.");
};

// ----- Applicant flow -----
$("app-load").onclick = async () => {
  const id = $("app-assessment-id").value.trim();
  if (!id) { alert("Enter assessment id"); return; }

  setText("app-result", "Loading questions...");
  $("app-load").disabled = true;

  try {
    const res = await safeFetch(`/applicant/${encodeURIComponent(id)}/questions`, {}, 8000);
    if (!res) throw new Error("No response (timeout)");
    if (res.status === 404) { alert("Assessment not found"); setText("app-result", "Assessment not found"); return; }
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Server error ${res.status}: ${txt}`);
    }

    const j = await res.json();
    const qdiv = $("app-questions");
    qdiv.innerHTML = "";
    j.questions.forEach(q => {
      const label = document.createElement("label");
      label.style.display = "block";
      label.innerHTML = `${q.id}: ${q.text} <input data-q="${q.id}" type="number" min="1" max="4" value="3" />`;
      qdiv.appendChild(label);
    });
    show($("app-submit"), true);
    setText("app-result", "Questions loaded. Complete and submit.");
  } catch (err) {
    console.error(err);
    alert("Failed to load questions: " + (err.message || err));
    setText("app-result", "Error: " + (err.message || ""));
  } finally {
    $("app-load").disabled = false;
  }
};

async function pollForPdf(candidateId, displayEl) {
  setText(displayEl, `Waiting for PDF: ${candidateId}.pdf ...`);
  const pdfPath = `/reports/${candidateId}.pdf`;
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      // use HEAD via fetch to check existence; fallback to GET
      const res = await safeFetch(pdfPath, { method: "HEAD" }, 4000);
      if (res && res.ok) {
        // PDF available
        setText(displayEl, "");
        const link = document.createElement("a");
        link.href = pdfPath;
        link.textContent = `Download report: ${candidateId}.pdf`;
        link.target = "_blank";
        const container = $(displayEl);
        container.innerHTML = "";
        container.appendChild(link);
        return;
      }
    } catch (e) {
      // ignore transient errors (timeout/abort)
    }
    // wait before trying again
    await new Promise(r => setTimeout(r, 2000));
  }
  setText(displayEl, "PDF not available yet. Try again in a moment or check server logs.");
}

$("app-submit").onclick = async () => {
  const id = $("app-assessment-id").value.trim();
  if (!id) { alert("Assessment id missing"); return; }
  const inputs = document.querySelectorAll("#app-questions [data-q]");
  const responses = {};
  inputs.forEach(inp => { responses[inp.getAttribute("data-q")] = parseInt(inp.value || "0", 10); });

  $("app-submit").disabled = true;
  setText("app-result", "Submitting responses...");

  try {
    const res = await safeFetch(`/applicant/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses })
    }, 15000);

    if (!res) throw new Error("No response (timeout)");
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Server error ${res.status}: ${txt}`);
    }

    const j = await res.json();
    // server returns candidate_id and status=processing
    setText("app-result", JSON.stringify(j, null, 2));
    if (j.candidate_id) {
      // poll for PDF and show a download link when ready
      await pollForPdf(j.candidate_id, "app-result");
    } else {
      setText("app-result", "Submitted. PDF generation started server-side.");
    }
  } catch (err) {
    console.error(err);
    alert("Failed to submit: " + (err.message || err));
    setText("app-result", "Error: " + (err.message || ""));
  } finally {
    $("app-submit").disabled = false;
  }
};

// ----- Provide a small protective wrapper for other fetches if needed -----
function fetchWithTimeout(resource, options = {}) {
  // kept for backwards compatibility; uses safeFetch internally
  return safeFetch(resource, options, options.timeout || 8000);
}

// initialize UI
(function init() {
  // if employer name was stored, prefill and show area
  const name = localStorage.getItem("emp_name");
  if (name) {
    $("emp-username").value = name;
    $("emp-area").style.display = "block";
    renderEmpQuestions();
  }
})();
