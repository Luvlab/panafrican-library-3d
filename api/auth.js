// Simple admin authentication API
// Authorized admin emails
const ADMIN_EMAILS = [
  'gordoncyrus@gmail.com',
  'nalini@coolhuntparis.com',
  'zugas.pascale@gmail.com'
];

export default async function handler(request, response) {
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
    const { email } = request.body;

    if (!email) {
      return response.status(400).json({ error: 'Email required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(normalizedEmail);

    if (isAdmin) {
      // Generate a simple session token (in production, use JWT or proper auth)
      const token = Buffer.from(`${normalizedEmail}:${Date.now()}`).toString('base64');

      return response.status(200).json({
        success: true,
        isAdmin: true,
        email: normalizedEmail,
        token: token,
        name: getAdminName(normalizedEmail)
      });
    } else {
      return response.status(200).json({
        success: true,
        isAdmin: false,
        message: 'Not an authorized admin'
      });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return response.status(500).json({ error: error.message });
  }
}

function getAdminName(email) {
  const names = {
    'gordoncyrus@gmail.com': 'Gordon Cyrus',
    'nalini@coolhuntparis.com': 'Nalini Cazaux',
    'zugas.pascale@gmail.com': 'Pascale Obolo'
  };
  return names[email] || email;
}
