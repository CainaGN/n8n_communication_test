export default async function handler(req, res) {
  const WEBHOOK_URL = process.env.WEBHOOK_URL;

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const n8nResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await n8nResponse.json();
    res.status(200).json(data);

  } catch (error) {
    res.status(500).json({ error: 'Erro ao chamar webhook' });
  }
}
