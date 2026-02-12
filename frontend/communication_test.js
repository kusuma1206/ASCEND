/**
 * Communication Test Logic
 * Rule-based, No AI Inference, STT via Browser.
 */

let testId = null;
let tasks = [];
let currentTaskIndex = 0;
let isRecording = false;
let recognition = null;
let timerInterval = null;
let startTime = 0;
let currentDuration = 0;
let fullTranscript = "";

// 1. Initialization
async function initTest() {
  try {
    // Use UserContext if available, otherwise localStorage/guest
    const userId = (typeof UserContext !== 'undefined') ? UserContext.getUserId() : (localStorage.getItem('userId') || 'guest');

    const response = await fetch('/api/comm/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!response.ok) throw new Error('Server returned ' + response.status);

    const data = await response.json();
    testId = data.testId;
    tasks = data.tasks || [];

    if (tasks.length === 0) {
      alert("No tasks loaded from server. Please check backend.");
      return;
    }

    renderTask();
  } catch (err) {
    console.error('Failed to init test:', err);
    alert('Could not initialize test session. Server may be down or database not ready.');
  }
}

// 2. Render Current Task
function renderTask() {
  // HARD STATE RESET (Step 5)
  resetState();

  const task = tasks[currentTaskIndex];
  document.getElementById('task-counter').innerText = `Task ${currentTaskIndex + 1} of ${tasks.length}`;
  document.getElementById('progress-inner').style.width = `${((currentTaskIndex) / tasks.length) * 100}%`;

  document.getElementById('task-type').innerText = task.type;
  document.getElementById('prompt-text').innerText = task.prompt;
  document.getElementById('min-time-label').innerText = `${task.minDuration} seconds`;
  document.getElementById('example-content').innerText = task.strongResponse;
  document.getElementById('status-msg').innerText = `Speak for at least ${task.minDuration} seconds to submit.`;

  document.getElementById('submit-btn').classList.remove('ready');
  document.getElementById('submit-btn').innerText = (currentTaskIndex === tasks.length - 1) ? 'Finish Test' : 'Next Task';
}

function resetState() {
  stopRecording();
  fullTranscript = "";
  currentDuration = 0;
  document.getElementById('live-transcript').innerText = "Click the microphone to begin speaking...";
  document.getElementById('timer-val').innerText = "0";
  document.getElementById('mic-btn').classList.remove('active');
  clearInterval(timerInterval);
}

// 3. Microphone & STT Management
function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('Speech recognition is not supported in this browser. Please use Chrome.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('mic-btn').classList.add('active');
    document.getElementById('live-transcript').innerText = "";
    startTimer();
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        fullTranscript += event.results[i][0].transcript + ' ';
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    document.getElementById('live-transcript').innerText = fullTranscript + interimTranscript;
  };

  recognition.onerror = (event) => {
    console.error('STT Error:', event.error);
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) recognition.start(); // Keep it alive until manual stop
  };

  recognition.start();
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    recognition.onend = null;
    recognition.stop();
  }
  document.getElementById('mic-btn').classList.remove('active');
  clearInterval(timerInterval);
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    currentDuration = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer-val').innerText = currentDuration;

    const task = tasks[currentTaskIndex];
    if (currentDuration >= task.minDuration) {
      document.getElementById('submit-btn').classList.add('ready');
      document.getElementById('status-msg').innerText = "You have met the minimum time. You can submit now.";
      document.getElementById('status-msg').style.color = "#10B981";
    }
  }, 1000);
}

// 4. Submission
async function nextTask() {
  const task = tasks[currentTaskIndex];
  if (currentDuration < task.minDuration) {
    alert(`Please speak for at least ${task.minDuration} seconds.`);
    return;
  }

  stopRecording();

  // Save Response
  try {
    await fetch('/api/comm/submit-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        testId,
        taskId: task.id,
        transcript: fullTranscript,
        duration: currentDuration
      })
    });

    if (currentTaskIndex < tasks.length - 1) {
      currentTaskIndex++;
      renderTask();
    } else {
      showFinalResult();
    }
  } catch (err) {
    console.error('Submit task error:', err);
    alert('Failed to save task result.');
  }
}

// 5. Final Results
async function showFinalResult() {
  document.getElementById('test-view').style.display = 'none';
  document.getElementById('result-view').style.display = 'block';

  try {
    const response = await fetch(`/api/comm/result/${testId}`);
    const data = await response.json();

    document.getElementById('final-score').innerText = `${data.totalScore} / ${data.maxScore}`;
    document.getElementById('final-label').innerText = data.performanceLabel;
    document.getElementById('final-feedback').innerText = data.overallFeedback;

    // Color label based on performance
    const colors = {
      'Excellent': '#10B981',
      'Good': '#3B82F6',
      'Average': '#F59E0B',
      'Poor': '#EF4444'
    };
    document.getElementById('final-label').style.color = colors[data.performanceLabel] || 'white';

  } catch (err) {
    console.error('Result fetch error:', err);
    document.getElementById('final-label').innerText = "Error loading result";
  }
}

// Start sequence
window.onload = initTest;
