// api/updateMeal.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { request, currentMeals } = req.body;
  const apiKey = process.env.CLAUDE_API_KEY;

console.log("Environment variables:", Object.keys(process.env).filter(k => k.includes('CLAUDE')));
console.log("API Key exists:", !!apiKey);

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!request || !currentMeals) {
    return res.status(400).json({ error: 'Missing request or currentMeals' });
  }

  try {
    const prompt = `You are a Mediterranean diet meal planning expert. The user is requesting a change to their meal plan.

Current meal structure (as reference):
${JSON.stringify(currentMeals, null, 2)}

User request: ${request}

Please provide the updated meals as ONLY a valid JSON object (no markdown, no code blocks, just raw JSON). 
Include the complete meal structure with any changes applied.
Only include the meals/days that were modified - for any day/meal not mentioned, use the exact same data from the current structure.
Each meal needs: name, ingredients (array), and notes (step-by-step recipe).

Return ONLY the JSON object, nothing else.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-1',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ error: 'Claude API error', details: errorData });
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse the JSON response
    let updatedMeals;
    try {
      updatedMeals = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content);
      return res.status(500).json({ 
        error: 'Failed to parse meal data', 
        rawResponse: content.substring(0, 200) 
      });
    }

    return res.status(200).json({ 
      success: true, 
      meals: updatedMeals 
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
