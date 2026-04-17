const axios = require('axios'); 
require('dotenv').config(); 

async function test() { 
  try { 
    const prompt = `You are an AI Architect for a university club.
Task:
Given an event idea, suggest:
1. Best date (avoid exam periods generally assume mid-semester)
2. Best room at ISSATKR (classroom / lab / amphitheater)
3. Estimated budget in TND
4. Suggestions to improve the event

Event:
- Idea: A hackathon
- Participants: 50

Return JSON only:
{
  "title": "",
  "suggested_date": "",
  "room": "",
  "budget_tnd": "",
  "recommendations": []
}`; 

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', { 
      model: 'llama-3.3-70b-versatile', 
      messages: [{ role: 'system', content: 'You are a helpful AI event planner. Respond only in JSON.' }, { role: 'user', content: prompt }], 
      temperature: 0.7,
      response_format: { type: "json_object" }
    }, { 
      headers: { 
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 
        'Content-Type': 'application/json' 
      } 
    }); 

    let txt = response.data.choices[0].message.content; 
    console.log('RAW LLM OUTPUT:'); 
    console.log(txt); 
    console.log('JSON PARSE TEST:'); 
    console.log(JSON.parse(txt)); 
  } catch(e) { 
    console.error('ERROR:', e.message); 
    if (e.response && e.response.data) {
        console.error(e.response.data);
    }
  } 
} 
test();
