/* PDF Parser using PDF.js */
async function extractPdfText(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
    }
    return text.trim();
}

/* Call OpenAI, Perplexity, or Gemini API from browser */
async function callAiScan(resumeText, jobDescription, apiKey, provider = "openai") {
    const prompt = `
You are an AI resume coach and hiring expert. Provide human-like, actionable guidance.

Compare this resume with the job description and return:
1) Match score 0-100 (brief rationale)
2) Core strengths aligned to the role (bullets)
3) Matched keywords and related terms found in the resume (bullets)
4) Missing keywords (bullets)
5) Related terms/synonyms to consider (bullets)
6) Improvement suggestions (bullets)
7) Rewritten professional summary (3-4 lines)

Resume:
${resumeText}

Job Description:
${jobDescription}
`;

    if (provider === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const body = {
            contents: [{
                parts: [{ text: prompt }]
            }]
        };

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || "Gemini API request failed");
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    const url = provider === "perplexity" 
        ? "https://api.perplexity.ai/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

    const body = {
        model: provider === "perplexity" ? "sonar-pro" : "gpt-4o-mini",
        messages: [
            { role: "system", content: "You are an AI resume coach and hiring expert. Provide human-like, actionable guidance." },
            { role: "user", content: prompt }
        ]
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "API request failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
}
