require('dotenv').config();
const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

const app = express();
// CRITICAL: process.env.PORT is required for deployment
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const studentsData = {};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'rajyadavetah590@gmail.com',
        pass: process.env.EMAIL_APP_PASSWORD 
    }
});

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const MODEL_ID = "gemini-2.5-flash"; 
const GOOGLE_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;

async function generateCareerPathWithAI(studentProfile) {
    const systemPrompt = `Analyze the profile and suggest 3 career paths with detailed 4-phase roadmaps in JSON format.`;
    const userQuery = `Assessment for ${studentProfile.fullName}: Background ${studentProfile.courseBranch}.`;

    const payload = {
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userQuery}` }] }],
        generationConfig: { 
            responseMimeType: "application/json",
            responseSchema: {
                type: "object",
                properties: {
                    careers: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                matchScore: { type: "string" },
                                reasoning: { type: "string" },
                                roadmap: {
                                    type: "object",
                                    properties: {
                                        description: { type: "string" },
                                        phases: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    title: { type: "string" },
                                                    details: { type: "array", items: { type: "string" } }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    try {
        const response = await fetch(`${GOOGLE_API_URL}?key=${GOOGLE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        // SAFE CHECK: Print the full error if the API failed
        if (result.error) {
            console.error("GOOGLE API ERROR:", result.error.message);
            return null;
        }

        // SAFE CHECK: Ensure candidates exist before reading [0]
        if (!result.candidates || result.candidates.length === 0) {
            console.error("AI BLOCKED: No candidates returned. Check safety settings.");
            return null;
        }

        return JSON.parse(result.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error("CRITICAL AI EXCEPTION:", error.message);
        return null;
    }
}

app.post('/api/student-info', (req, res) => {
    const studentId = uuidv4();
    studentsData[studentId] = { studentInfo: req.body };
    res.json({ success: true, studentId });
});

app.post('/api/questions', async (req, res) => {
    const { studentId, answers } = req.body;
    if (!studentsData[studentId]) return res.status(404).json({ success: false });

    studentsData[studentId].questions = answers;
    const fullProfile = { ...studentsData[studentId].studentInfo, ...answers };

    const mailOptions = {
        from: 'CareerPath AI <rajyadavetah590@gmail.com>',
        to: 'rajyadavetah590@gmail.com',
        subject: `Live Lead: ${fullProfile.fullName}`,
        text: `Student Data:\n${JSON.stringify(fullProfile, null, 2)}`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.error("Cloud Mail Error:", err);
    });

    const aiResult = await generateCareerPathWithAI(fullProfile);
    if (aiResult) {
        studentsData[studentId].aiResult = aiResult;
        res.json({ success: true, studentId });
    } else {
        res.status(500).json({ success: false });
    }
});

app.get('/api/results/:studentId', (req, res) => {
    const data = studentsData[req.params.studentId];
    if (!data) return res.status(404).json({ success: false });
    res.json({ success: true, result: data.aiResult, studentInfo: { ...data.studentInfo, ...data.questions } });
});

app.listen(PORT, () => console.log(`🚀 Production server active on port ${PORT}`));