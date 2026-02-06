class ProductTour {
  constructor(steps) {
    this.steps = steps;
    this.currentStep = 0;
    this.isActive = false;
  }

  async init() {
    // 1. Check if User needs tour
    // We rely on UserContext or API directly.
    // Dashboard loads UserContext, let's fetch current user again to be safe or check global object
    try {
      const res = await fetch('http://localhost:3002/api/user/current');
      const data = await res.json();

      if (data.success && !data.user.tourCompleted) {
        this.start();
      }
    } catch (e) {
      console.error("Tour User Check Failed", e);
    }
  }

  createUI() {
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'tour-overlay';
    document.body.appendChild(overlay);

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.id = 'tour-tooltip';
    tooltip.innerHTML = `
      <div class="tour-header">
        <span id="tour-title">Title</span>
        <button class="btn-skip" onclick="tour.skip()">✕</button>
      </div>
      <div class="tour-body" id="tour-text">Description goes here...</div>
      <div class="tour-footer">
        <span class="tour-steps" id="tour-counter">1 / 5</span>
        <div>
          <button class="btn-skip" style="margin-right:8px" onclick="tour.skip()">Skip</button>
          <button class="btn-next" id="tour-next-btn" onclick="tour.next()">Next</button>
        </div>
      </div>
    `;
    document.body.appendChild(tooltip);
  }

  start() {
    if (this.isActive) return;
    this.createUI();
    this.isActive = true;

    // Show Overlay
    document.getElementById('tour-overlay').style.display = 'block';
    setTimeout(() => {
      document.getElementById('tour-overlay').style.opacity = '1';
    }, 10);

    this.showStep(0);
  }

  showStep(index) {
    if (index >= this.steps.length) {
      this.finish();
      return;
    }

    const step = this.steps[index];
    const element = document.querySelector(step.element);

    if (!element) {
      console.warn(`Tour element not found: ${step.element}. Skipping.`);
      this.showStep(index + 1); // Skip missing elements
      return;
    }

    this.currentStep = index;

    // Remove old highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.zIndex = '';
      el.style.position = '';
    });

    // Add Highlight
    element.classList.add('tour-highlight');
    // Force specific styles to pop out
    // Note: CSS classes handle z-index, but we might need computed styles if position is static
    const computed = window.getComputedStyle(element);
    if (computed.position === 'static') {
      element.style.position = 'relative';
    }

    // Update Tooltip Content
    document.getElementById('tour-title').textContent = step.title;
    document.getElementById('tour-text').textContent = step.text;
    document.getElementById('tour-counter').textContent = `${index + 1} / ${this.steps.length}`;
    document.getElementById('tour-next-btn').textContent = index === this.steps.length - 1 ? 'Finish' : 'Next';

    // Position Tooltip
    this.positionTooltip(element);
  }

  positionTooltip(targetElement) {
    const tooltip = document.getElementById('tour-tooltip');
    tooltip.style.display = 'block';
    setTimeout(() => tooltip.style.opacity = '1', 10);

    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 15;

    let top = rect.bottom + margin + window.scrollY;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2) + window.scrollX;

    // Boundary checks
    if (left < 10) left = 10;
    if (left + tooltipRect.width > window.innerWidth) left = window.innerWidth - tooltipRect.width - 10;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  next() {
    this.showStep(this.currentStep + 1);
  }

  async finish() {
    this.cleanup();
    // Save completion
    try {
      await fetch('http://localhost:3002/api/user/complete-tour', { method: 'POST' });
    } catch (e) {
      console.error("Failed to save tour completion", e);
    }
  }

  skip() {
    this.cleanup();
    // Optional: Mark as skipped? For now let's treat skip as "don't show again automatically"
    this.finish();
  }

  cleanup() {
    const overlay = document.getElementById('tour-overlay');
    const tooltip = document.getElementById('tour-tooltip');

    if (overlay) overlay.remove();
    if (tooltip) tooltip.remove();

    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
      el.style.position = '';
    });

    this.isActive = false;
  }
}

// Define Steps
const TOUR_STEPS = [
  {
    element: '#card-resume',
    title: 'Resume Analyzer',
    text: 'Start by uploading your resume. Our AI checks for ATS compatibility and gives you a strength score.'
  },
  {
    element: '#card-tech',
    title: 'Technical Tests',
    text: 'Prove your coding skills. Take domain-specific tests to earn badges and improve your profile.'
  },
  {
    element: '#card-comm',
    title: 'Communication',
    text: 'Good communication is key. Use our AI speech analyzer to test your fluency and clarity.'
  },
  {
    element: '#card-interview',
    title: 'Mock Interview',
    text: 'Practice with Ava, your AI Interviewer. Simulate real rounds and get instant feedback.'
  },
  {
    element: '#card-roadmap',
    title: 'Personalized Roadmap',
    text: 'Get a week-by-week study plan tailored to your target role and graduation year.'
  },
  {
    element: '#card-opportunities',
    title: 'Smart Opportunities',
    text: 'Discover internships, hackathons, and scholarships curated just for you.'
  },
  {
    element: '.score-card',
    title: 'Product Readiness Score',
    text: 'This is your North Star. Improve your resume, skills, and communication to reach "Industry Ready" status.'
  }
];

// Initialize global instance
const tour = new ProductTour(TOUR_STEPS);

// Auto-start on load
document.addEventListener('DOMContentLoaded', () => {
  // Wait for dashboard to render (handled by its own load event, but let's give it a slight buffer or check)
  // Actually dashboard.html calling loadDashboard is async. 
  // We should probably hook into the end of renderDashboard or just wait a bit.
  setTimeout(() => {
    tour.init();
  }, 1500);
});
