// Nano Banana (Gemini) AI Render API
// Generates photorealistic renders from 3D scene screenshots

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY not configured',
      help: 'Add GEMINI_API_KEY to Vercel Environment Variables: Settings > Environment Variables'
    });
  }

  try {
    const { imageBase64, prompt, style } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data required' });
    }

    // Build the prompt for photorealistic rendering
    const renderPrompt = buildRenderPrompt(prompt, style);

    // Call Gemini API with image input (gemini-2.5-flash-image supports responseModalities IMAGE)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                  }
                },
                {
                  text: renderPrompt
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.4,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Gemini API error:', errorData);
      return res.status(geminiResponse.status).json({
        error: 'Gemini API error',
        details: errorData
      });
    }

    const data = await geminiResponse.json();

    // Extract generated image from response
    if (data.candidates && data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          return res.status(200).json({
            success: true,
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            text: data.candidates[0].content.parts.find(p => p.text)?.text || ''
          });
        }
      }
    }

    // If no image was generated, return text response
    const textResponse = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
    return res.status(200).json({
      success: false,
      error: 'No image generated',
      text: textResponse || 'Unknown error'
    });

  } catch (error) {
    console.error('Render error:', error);
    return res.status(500).json({ error: error.message });
  }
}

function buildRenderPrompt(customPrompt, style) {
  const basePrompt = `Transform this 3D room screenshot into a photorealistic architectural render.

CRITICAL RULES:
- ONLY render what is visible in the input image. Do NOT add, invent, or hallucinate any objects, furniture, windows, shelves, books, or architectural elements that are not already shown in the screenshot.
- Maintain the EXACT same room layout, wall positions, window positions, and furniture arrangement as shown.
- Do NOT add extra windows, doors, bookshelves, or any objects not present in the 3D model screenshot.
- The number and position of windows must match the input EXACTLY.

RENDERING REQUIREMENTS:
- Apply photorealistic lighting with warm, inviting ambiance to the existing scene
- Add realistic material textures (wood grain, fabric, carpet patterns) to existing surfaces
- Include subtle atmospheric effects (soft shadows, ambient occlusion)
- Enhance the existing colors and materials without changing the composition`;

  const styleGuides = {
    'photorealistic': `
STYLE: Ultra-photorealistic
- Professional architectural photography quality
- Sharp details, accurate materials
- Natural color grading`,

    'warm-cozy': `
STYLE: Warm and Cozy
- Golden hour lighting
- Soft, inviting atmosphere
- Emphasize comfort and intimacy`,

    'editorial': `
STYLE: Editorial Magazine
- High contrast, dramatic lighting
- Bold colors, artistic composition
- Publication-ready quality`,

    'sketch': `
STYLE: Architectural Sketch
- Hand-drawn aesthetic
- Pencil/charcoal texture
- Conceptual presentation style`
  };

  const styleGuide = styleGuides[style] || styleGuides['photorealistic'];
  const userPrompt = customPrompt ? `\n\nADDITIONAL INSTRUCTIONS: ${customPrompt}` : '';

  return basePrompt + styleGuide + userPrompt + '\n\nGenerate a single high-quality image.';
}
