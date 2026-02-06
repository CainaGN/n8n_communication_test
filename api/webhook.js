export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY; // Adicione esta variável de ambiente no Vercel

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    let body;
    let chatInput = '';

    // Verificar se é FormData (para áudio) ou JSON (para texto)
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const audio = formData.get('audio');

      if (audio) {
        // Converter áudio para base64
        const audioBuffer = await audio.arrayBuffer();
        const audioBase64 = Buffer.from(audioBuffer).toString('base64');

        // Chamar Gemini API para transcrição
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GOOGLE_AI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: 'Transcreva este áudio para texto em português.' },
                  {
                    inline_data: {
                      mime_type: 'audio/webm',
                      data: audioBase64
                    }
                  }
                ]
              }]
            })
          }
        );

        if (!geminiResponse.ok) {
          throw new Error(`Gemini API error: ${geminiResponse.status}`);
        }

        const geminiData = await geminiResponse.json();
        chatInput = geminiData.candidates[0].content.parts[0].text.trim();

        // Extrair outros campos do formData
        body = {
          chatInput,
          sessionId: formData.get('sessionId'),
          platform: formData.get('platform'),
          pracaId: formData.get('pracaId'),
          formulario_contato: formData.get('formulario_contato')
        };
      } else {
        throw new Error('Áudio não encontrado no formData');
      }
    } else {
      // Caso JSON (texto normal)
      body = await req.json();
    }

    // Forward para o WEBHOOK_URL
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.text();
    return new Response(data, { status: 200 });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}