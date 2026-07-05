export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { request, currentMeals } = req.body;
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key missing' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `You are a Mediterranean diet meal planning expert. Update the meal plan based on this request:\n\nREQUEST: ${request}\n\nCURRENT MEALS:\n${JSON.stringify(JSON.parse(currentMeals), null, 2)}\n\nPlease respond with ONLY a valid JSON object (no markdown, no code blocks, just raw JSON). Include the complete meal structure with any changes applied. Only modify the meals mentioned in the request - for all other meals, keep the exact same data. Each meal needs: name, ingredients (array of strings), and notes (step-by-step recipe).`
        }]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    let content = data.content[0].text.trim();

    // Remove markdown code blocks if present
    content = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    let updatedMeals;
    try {
      updatedMeals = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({ error: 'Invalid JSON from Claude', details: e.message, received: content.substring(0, 200) });
    }

    return res.status(200).json({ success: true, meals: updatedMeals });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
