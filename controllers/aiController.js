const axios = require("axios");

// POST /ai/architect
const architectAgent = async (req, res) => {
  try {
    const { idea, participants } = req.body;

    if (!idea) {
      return res.status(400).json({
        message: "Idea is required"
      });
    }

    // 🧠 Prompt (the brain of your agent)
    const prompt = `
You are an AI Architect for a university club.

Task:
Given an event idea, suggest:

1. Best date (avoid exam periods generally assume mid-semester). MUST BE A STRICT FUTURE DATE STRING in YYYY-MM-DD format (e.g. "2026-11-15").
2. Best room at ISSATKR (classroom / lab / amphitheater)
3. Estimated budget in TND
4. Suggestions to improve the event

Event:
- Idea: ${idea}
- Participants: ${participants || 30}

Return JSON only:
{
  "title": "",
  "suggested_date": "2026-11-15",
  "room": "",
  "budget_tnd": "",
  "recommendations": []
}
`;

    // 🤖 Call AI (Groq example - fast & free tier friendly)
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful AI event planner. You must respond in valid JSON ONLY." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    // 📦 AI response text
    const aiText = response.data.choices[0].message.content;

    return res.status(200).json({
      message: "Architect plan generated",
      data: JSON.parse(aiText)
    });

  } catch (error) {
    return res.status(500).json({
      message: "AI Architect error",
      error: error.message
    });
  }
};

// POST /ai/liaison
const liaisonAgent = async (req, res) => {
  try {
    const { event, audience, tone } = req.body;

    if (!event) {
      return res.status(400).json({
        message: "Event is required"
      });
    }

    // 🧠 Prompt for marketing AI
    const prompt = `
You are a Marketing & Branding AI for a university club.

Task: Generate marketing content for the event.

Event: ${event}
Audience: ${audience || "students"}
Tone: ${tone || "professional"}

Return ONLY JSON:
{
  "instagram_caption": "",
  "sponsor_email": {
    "subject": "",
    "body": ""
  },
  "color_palette": ["", "", ""]
}

Rules:
- Instagram caption must be engaging and short
- Email must be professional for sponsors
- Colors must match tech/cyber style (blue, neon, dark, etc.)
`;

    // 🤖 Call Groq API
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a creative marketing assistant. You must respond ONLY in valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiText = response.data.choices[0].message.content;

    return res.status(200).json({
      message: "Liaison content generated",
      data: JSON.parse(aiText)
    });

  } catch (error) {
    return res.status(500).json({
      message: "Liaison Agent error",
      error: error.message
    });
  }
};

const { readExcelFile } = require("../services/excelService");

// POST /ai/ingest-excel
const ingestExcel = async (req, res) => {
  try {
    const data = readExcelFile("./data/dataset.xlsx");

    const documents = data.map((row) => {
      return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("\n");
    });

    // Data is processed and ready to be routed. Avoid logging enormous arrays to prevent memory stalling.
    console.log(`Ingested ${documents.length} rows successfully.`);

    return res.json({
      message: "Excel ingested successfully",
      count: documents.length
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// POST /ai/archivist
const archivistAgent = async (req, res) => {
  try {
    const { question } = req.body;
    console.log(`🔍 Archivist hit with question: "${question}"`);

    const data = readExcelFile("./data/dataset.xlsx");
    console.log(`📊 Excel loaded: ${data.length} rows found.`);

    const axios = require("axios");

    // ============================================
    // STEP 1: The NLP Router (LLM Pre-Processing)
    // ============================================
    const routerPrompt = `
You are an intelligent networking router for a University Club Database.
Classify the user's question into ONE of these intents:
1. "direct_lookup": The user asks for a specific Event ID or an exact number (e.g. "Event 10").
2. "aggregation": The user asks a dataset-wide query that must NOT return multiple rows (e.g. "Give me all data", "How many events", "Total budget").
3. "search": The user asks a general question requiring keyword matching. Extract the best semantic keywords.

Return ONLY valid JSON:
If direct_lookup: {"intent": "direct_lookup", "event_id": 10}
If aggregation: {"intent": "aggregation"}
If search: {"intent": "search", "keywords": ["word1", "word2"]}

Question: "${question}"
`;

    const routerResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: routerPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
    );

    const routing = JSON.parse(routerResponse.data.choices[0].message.content);
    console.log(`🚦 Router Decision:`, routing);

    // ============================================
    // STEP 2: Intelligent Data Processing (Node.js)
    // ============================================
    let context = "";
    let usedDataCount = 0;

    if (routing.intent === "direct_lookup" && routing.event_id) {
        const found = data.find(r => String(r.Event_ID) === String(routing.event_id));
        if (found) {
            context = Object.entries(found).map(([k, v]) => `${k}: ${v}`).join("\n");
            usedDataCount = 1;
        }
    } else if (routing.intent === "aggregation") {
        // Node.js calculates stats instantly without freezing the LLM or frontend
        context = `[SYSTEM AGGREGATION DETECTED]\nTotal Events Recorded: ${data.length}\nNote: Do not list all events. Provide a high-level summary confirming the total volume or summary back to the user based on the math provided.`;
        usedDataCount = data.length;
    } else {
        // Semantic Search
        const keywords = routing.keywords || [];
        if (keywords.length > 0) {
            const results = data.map(row => {
                const textText = Object.values(row).join(" ").toLowerCase();
                const score = keywords.reduce((acc, word) => acc + (textText.includes(String(word).toLowerCase()) ? 1 : 0), 0);
                return { row, score };
            }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).map(r => r.row);
            
            context = results.slice(0, 5).map(row => {
                return Object.entries(row).map(([k, v]) => `${k}: ${v}`).join("\n");
            }).join("\n\n");
            usedDataCount = results.length;
        }
    }

    // ============================================
    // STEP 3: Handle Zero Results Short-Circuit
    // ============================================
    if (usedDataCount === 0 && routing.intent !== "aggregation") {
        console.log(`⚡ Short-circuiting: No records found.`);
        return res.json({
            answer: "I couldn't find any specific club records matching your query in our archives.",
            used_data: 0
        });
    }

    // ============================================
    // STEP 4: The Generative Answer (LLM Call 2)
    // ============================================
    const finalResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are the Archivist AI of a university club. Answer the user politely. Use the provided context directly to answer the exact scope of the question factually."
          },
          {
            role: "user",
            content: `Context:\n${context}\n\nQuestion:\n${question}`
          }
        ],
        temperature: 0.7
      },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
    );

    console.log(`🤖 AI Answer length: ${finalResponse.data.choices[0].message.content.length}`);

    return res.json({
      answer: finalResponse.data.choices[0].message.content,
      used_data: usedDataCount
    });

  } catch (err) {
    console.error("Archivist Error:", err);
    return res.status(500).json({ error: err.message });
  }
};
module.exports = {
  architectAgent,liaisonAgent, ingestExcel, archivistAgent
};