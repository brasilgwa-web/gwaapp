
export default async function handler(request, response) {
    // CORS configuration
    response.setHeader('Access-Control-Allow-Credentials', true)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')

    if (request.method === 'OPTIONS') {
        return response.status(200).json({})
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html, text } = request.body;
    const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_5KRFpXdk_NVgRqS5Vj521ARdkjSxa8i5U'; // Fallback for testing, but ideally env var

    if (!RESEND_API_KEY) {
        return response.status(500).json({ error: 'Missing Resend API Key' });
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev', // Default testing domain
                to: to,
                subject: subject,
                html: html,
                text: text
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Failed to send email');
        }

        return response.status(200).json(data);
    } catch (error) {
        console.error("Email API Error:", error);
        return response.status(500).json({ error: error.message });
    }
}
