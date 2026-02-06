let examSubmitted = false;

const API_START = "http://localhost:3002/api/test/start";
const API_SUBMIT = "http://localhost:3002/api/test/submit-bulk";

let questions = [];
let currentTestId = null;

/* ================= START EXAM ================= */
function startExam() {
  examSubmitted = false;

  const skill = document.getElementById("skill").value;
  const difficulty = document.getElementById("difficulty").value;

  if (!skill || !difficulty) {
    alert("Please select skill and difficulty");
    return;
  }

  document.getElementById("startBtn").disabled = true;

  const questionsDiv = document.getElementById("questions");
  questionsDiv.style.display = "block";
  questionsDiv.innerHTML = "";

  document.getElementById("resultPanel").style.display = "none";

  fetch(API_START, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject: skill, difficulty })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.questions)) {
        questions = data.questions;
        currentTestId = data.testId;
        renderQuestions();
      } else {
        alert("No questions received");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Server error");
    });
}

/* ================= RENDER QUESTIONS ================= */
function renderQuestions() {
  const container = document.getElementById("questions");

  questions.forEach((q, i) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <h4>Q${i + 1}. ${q.text}</h4>
      ${q.options.map(opt => `
        <label>
          <input type="${q.type === 'multi' ? 'checkbox' : 'radio'}" name="q${i}" value="${opt}" onchange="checkAllAnswered()">
          ${opt}
        </label><br>
      `).join("")}
    `;
    container.appendChild(div);
  });

  const btn = document.createElement("button");
  btn.className = "primary-btn";
  btn.id = "submitBtn";
  btn.innerText = "Submit Exam";
  btn.disabled = true;
  btn.onclick = submitExam;

  container.appendChild(btn);
}

/* ================= CHECK ALL ANSWERED ================= */
function checkAllAnswered() {
  const answered = questions.filter((_, i) =>
    document.querySelector(`input[name="q${i}"]:checked`)
  ).length;

  document.getElementById("submitBtn").disabled =
    answered !== questions.length;
}

/* ================= SUBMIT EXAM ================= */
function submitExam() {
  if (examSubmitted) return;
  examSubmitted = true;

  // Map answers to { questionId: answer }
  const answersMap = {};
  questions.forEach((q, i) => {
    const checked = Array.from(document.querySelectorAll(`input[name="q${i}"]:checked`));
    if (checked.length > 0) {
      answersMap[q.id] = checked.map(c => c.value);
    }
  });

  const skill = document.getElementById("skill").value;
  const difficulty = document.getElementById("difficulty").value;

  fetch(API_SUBMIT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      testId: currentTestId,
      answers: answersMap,
      subject: skill,
      difficulty: difficulty
    })
  })
    .then(res => res.json())
    .then(data => showResult(data.score, data.maxScore));
}

/* ================= SHOW RESULT ================= */
function showResult(score, maxScore) {
  const percent = Math.round((score / maxScore) * 100);

  document.getElementById("questions").style.display = "none";
  document.getElementById("techHeaderCard").style.display = "none";

  const panel = document.getElementById("resultPanel");
  panel.style.display = "flex";

  const card = panel.querySelector(".result-card");
  const circle = document.getElementById("progressCircle");
  const text = document.getElementById("circleText");
  const scoreText = document.getElementById("scoreText");
  const perfText = document.getElementById("performanceText");

  card.classList.remove("glow-red", "glow-yellow", "glow-green");

  let color = "#ef4444";
  let title = "Needs Improvement 😟";
  let msg = "Practice fundamentals and try again.";

  if (percent >= 70) {
    color = "#22c55e";
    title = "Excellent Performance 🎉";
    msg = "You have strong technical skills!";
    card.classList.add("glow-green");
  } else if (percent >= 40) {
    color = "#facc15";
    title = "Average Performance 👍";
    msg = "Good attempt. A little more practice will help.";
    card.classList.add("glow-yellow");
  } else {
    card.classList.add("glow-red");
  }

  circle.style.background =
    `conic-gradient(${color} ${percent * 3.6}deg, #e5e7eb 0deg)`;

  text.innerText = percent + "%";
  scoreText.innerText = `Score: ${score} / ${maxScore}`;
  perfText.innerHTML = `<strong>${title}</strong><br>${msg}`;
}

/* ================= BACK TO TEST ================= */
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("backToTestBtn");
  if (!backBtn) return;

  backBtn.onclick = () => {
    document.getElementById("resultPanel").style.display = "none";
    document.getElementById("techHeaderCard").style.display = "block";

    const q = document.getElementById("questions");
    q.style.display = "block";
    q.innerHTML = "";

    document.getElementById("startBtn").disabled = false;
    examSubmitted = false;

    document.getElementById("technicalTestView")
      .scrollIntoView({ behavior: "smooth" });
  };
});

/* ================================================= */
/* ========== COMMUNICATION TEST (ADDED) ============ */
/* ================================================= */

function loadCommunicationTest() {
  document.querySelector(".main").innerHTML = `
    <h2>Communication Test</h2>

    <div class="card-container">

      <div class="card" onclick="loadWrittenComm()">
        <div class="icon">✍️</div>
        <h3>Written Communication</h3>
        <p>Test your writing, grammar, and clarity</p>
      </div>

      <div class="card" onclick="loadSpokenComm()">
        <div class="icon">🎤</div>
        <h3>Spoken Communication</h3>
        <p>Test your speaking and confidence</p>
      </div>

    </div>
  `;
}

/* ===== Step 3: Written Communication Page ===== */
function loadWrittenComm() {
  document.querySelector(".main").innerHTML = `
    <h2>Written Communication</h2>
    <p>Written communication test will be implemented here.</p>
  `;
}

/* ===== Step 3: Spoken Communication Page ===== */
function loadSpokenComm() {
  document.querySelector(".main").innerHTML = `
    <h2>Spoken Communication</h2>
    <p>Spoken communication test will be implemented here.</p>
  `;
}
function loadResumeUpload() {
  fetch("resume_upload.html")
    .then(res => res.text())
    .then(html => {
      document.querySelector(".main").innerHTML = html;
    })
    .catch(err => console.error("Resume load error", err));
}
function loadTechnicalTest() {
  fetch("technical_test.html")
    .then(res => res.text())
    .then(html => {
      document.querySelector(".main").innerHTML = html;
    })
    .catch(err => console.error("Tech test load error", err));
}
function loadCommunicationTest() {
  fetch("communication_content.html")
    .then(res => res.text())
    .then(html => {
      document.querySelector(".main").innerHTML = html;
    });
}


function setActiveMenu(activeId) {
  document.querySelectorAll(".menu button")
    .forEach(btn => btn.classList.remove("active"));

  const btn = document.getElementById(activeId);
  if (btn) btn.classList.add("active");
}



/* ===== Step 4: Sidebar Button Binding ===== */

