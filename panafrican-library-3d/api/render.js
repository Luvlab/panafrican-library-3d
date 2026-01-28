// Vercel Serverless Function for AI Photorealistic Rendering using Gemini
export default async function handler(request, response) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, style, customPrompt } = request.body;

    if (!imageBase64) {
      return response.status(400).json({ error: 'No image provided' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return response.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Style-specific prompts for the Panafrican Library
    const stylePrompts = {
      photo: 'Transform this 3D render into a photorealistic photograph of the Panafrican Library reading room at MoMA PS1. Natural lighting through industrial windows, authentic textures on brick walls, rich colors on the kilim rugs and bean bags, warm ambient lighting from Ethiopian lamps, disco ball reflections. The space should feel lived-in and welcoming, like an actual cultural institution.',
      warm: 'Transform this 3D render into a warm, inviting photograph of the Panafrican Library. Golden hour sunlight streaming through the tall windows, casting long shadows. Emphasize the rich earth tones, terracotta, ochre, and burgundy of the African-inspired textiles. The atmosphere should feel cozy and intimate, like a treasured community gathering space.',
      editorial: 'Transform this 3D render into a high-end architectural photography shot for Dezeen or Architectural Digest. Clean, professional lighting showcasing the unique blend of PS1 industrial architecture with Panafrican design elements. Sharp details on the vintage furniture, art posters, and curated book displays. Magazine-quality composition.',
      sketch: 'Transform this 3D render into an artistic architectural sketch of the Panafrican Library. Hand-drawn quality with visible line work, subtle watercolor washes in warm African palette colors. Capture the essence of the space - the tall windows, layered textiles, and cultural artifacts - in an expressive, artistic style.'
    };

    const basePrompt = stylePrompts[style] || stylePrompts.photo;
    const fullPrompt = customPrompt
      ? `${basePrompt} Additional direction: ${customPrompt}`
      : basePrompt;

    // Use Gemini 2.0 Flash for image generation
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: fullPrompt },
              {
                inline_data: {
                  mime_type: 'image/png',
                  data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
                }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ['image', 'text'],
            responseMimeType: 'image/png'
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return response.status(500).json({ error: 'AI generation failed', details: errorText });
    }

    const result = await geminiResponse.json();

    // Extract the generated image from the response
    if (result.candidates && result.candidates[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          return response.status(200).json({
            success: true,
            imageBase64: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          });
        }
      }
    }

    // If no image was generated, return error
    return response.status(500).json({
      error: 'No image generated',
      details: JSON.stringify(result)
    });

  } catch (error) {
    console.error('Render API error:', error);
    return response.status(500).json({ error: error.message });
  }
}
