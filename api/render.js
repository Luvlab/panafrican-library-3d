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
            temperature: 0.2,
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
  const basePrompt = `You are an architectural visualization renderer. Take this 3D model screenshot and make it look like a real photograph taken with a professional camera.

Keep EXACTLY the same composition — same walls, same objects, same windows, same furniture, same positions. Change NOTHING about what is in the scene. Only improve the realism of what already exists:

- Replace flat 3D materials with photorealistic textures (real wood grain, real fabric, real carpet, real brick)
- Add natural lighting: warm ambient light, soft shadows, sunlight through existing windows
- Add depth of field, ambient occlusion, and subtle atmospheric haze
- Make surfaces look physically accurate (reflections, roughness, subsurface scattering)

This is an interior of a gallery/reading room at MoMA PS1 in New York.`;

  const styleGuides = {
    'photorealistic': `

Render as ultra-photorealistic architectural photography. Shot on a full-frame camera with a 24mm lens. Natural color grading, sharp focus.`,

    'warm-cozy': `

Render with warm golden-hour lighting. Soft, inviting atmosphere. Emphasize warmth and intimacy. Slightly warm color temperature.`,

    'editorial': `

Render as editorial magazine photography. High contrast, dramatic directional lighting. Bold saturated colors. Publication-quality composition.`,

    'sketch': `

Render as a hand-drawn architectural sketch. Pencil and charcoal on paper texture. Conceptual presentation style with visible line work.`
  };

  const styleGuide = styleGuides[style] || styleGuides['photorealistic'];
  const userPrompt = customPrompt ? `\n\n${customPrompt}` : '';

  return basePrompt + styleGuide + userPrompt;
}
