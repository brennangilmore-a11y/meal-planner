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
          content: `CRITICAL: You must return ONLY valid JSON. No text before or after. No markdown. No explanations.

You are a Mediterranean diet meal planning expert. Update this meal plan based on the user's request.

REQUEST: ${request}

CURRENT MEALS (in JSON format):
${JSON.stringify(JSON.parse(currentMeals), null, 2)}

INSTRUCTIONS:
1. Return ONLY a valid JSON object
2. Do not include any text, explanations, or markdown code blocks
3. Do not wrap in backticks
4. Start with { and end with }
5. Modify ONLY the meals mentioned in the request
6. Keep all other meals exactly the same
7. Each meal must have: name (string), ingredients (array of strings), notes (string with step-by-step recipe)

Return the complete updated meal structure as raw JSON:`
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
    content = content.replace(/^```\n?/, '').replace(/\n?```$/, '').trim();

    // Try to extract JSON if there's extra text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }

    let updatedMeals;
    try {
      updatedMeals = JSON.parse(content);
    } catch (e) {
      return res.status(500).json({ 
        error: 'Invalid JSON from Claude', 
        details: e.message, 
        received: content.substring(0, 300) 
      });
    }

    return res.status(200).json({ success: true, meals: updatedMeals });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
