let globalCareers = []; // Local storage for the AI's 3 results

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    // Navigation Hamburger
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger) hamburger.addEventListener('click', () => navLinks.classList.toggle('active'));

    if (path.includes('get-started.html')) {
        initGetStartedForm();
    } else if (path.includes('questions.html')) {
        initQuestionsForm();
    } else if (path.includes('results.html')) {
        initResultsPage();
    }
});

function initGetStartedForm() {
    const form = document.getElementById('student-info-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const studentInfo = Object.fromEntries(formData.entries());

        const res = await fetch('/api/student-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentInfo)
        });
        const data = await res.json();
        if (data.success) {
            sessionStorage.setItem('studentId', data.studentId);
            window.location.href = 'questions.html';
        }
    });
}

function initQuestionsForm() {
    const form = document.getElementById('questions-form');
    const studentId = sessionStorage.getItem('studentId');
    if (!form || !studentId) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const answers = Object.fromEntries(formData.entries());

        const res = await fetch('/api/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId, answers })
        });
        const data = await res.json();
        if (data.success) {
            window.location.href = `results.html?studentId=${data.studentId}`;
        }
    });
}

function initResultsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('studentId');
    const container = document.getElementById('results-container');
    const loading = document.getElementById('loading-message');

    if (!studentId) return;
    loading.style.display = 'block';

    fetch(`/api/results/${studentId}`)
        .then(res => res.json())
        .then(data => {
            loading.style.display = 'none';
            if (data.success) {
                globalCareers = data.result.careers; //
                renderInitialLayout(data.studentInfo, container);
                renderRoadmap(0); // Show top match by default
                container.style.display = 'block';
            }
        });
}

function renderInitialLayout(studentInfo, container) {
    container.innerHTML = `
        <h1 class="text-center section-heading">Your Personalized Career Guide</h1>
        
        <div class="card p-6 mb-8" style="border-left: 5px solid var(--primary-color);">
            <h3>User Profile</h3>
            <p><strong>Name:</strong> ${studentInfo.fullName}</p>
            <p><strong>Course:</strong> ${studentInfo.courseBranch}</p>
        </div>

        <h2 class="mb-4">Select a Path to View Detailed Roadmap:</h2>
        <div class="testimonials-grid mb-8" id="career-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            ${globalCareers.map((c, index) => `
                <div class="card p-5 career-selector-card" onclick="renderRoadmap(${index})" style="cursor:pointer; transition: 0.3s;" id="card-${index}">
                    <h4 style="color: var(--accent-color);">${c.title}</h4>
                    <p><strong>Match: ${c.matchScore}</strong></p>
                    <p class="small text-muted">${c.reasoning}</p>
                </div>
            `).join('')}
        </div>

        <div id="active-roadmap-container" class="card roadmap-content p-8">
            </div>
    `;
}

function renderRoadmap(index) {
    const career = globalCareers[index]; //
    const container = document.getElementById('active-roadmap-container');
    
    // UI Feedback: Highlight the selected card
    document.querySelectorAll('.career-selector-card').forEach(c => {
        c.style.boxShadow = 'var(--shadow-soft)';
        c.style.transform = 'scale(1)';
    });
    const activeCard = document.getElementById(`card-${index}`);
    activeCard.style.boxShadow = '0 0 15px var(--accent-color)';
    activeCard.style.transform = 'scale(1.02)';

    container.innerHTML = `
        <h2 style="color: var(--primary-color);">Roadmap for ${career.title}</h2>
        <p class="text-muted mb-6">${career.roadmap.description}</p>
        
        ${career.roadmap.phases.map(p => `
            <div class="roadmap-phase mb-6" style="border-bottom: 1px solid #eee; padding-bottom: 15px;">
                <h4 style="color: var(--text-dark); border-left: 4px solid var(--accent-color); padding-left: 10px;">${p.title}</h4>
                <ul style="margin-top: 10px; padding-left: 20px;">
                    ${p.details.map(d => `<li style="margin-bottom: 5px;">${d}</li>`).join('')}
                </ul>
            </div>
        `).join('')}
    `;
}