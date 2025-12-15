
import nodemailer from 'nodemailer';

export default async function handler(request, response) {
    // CORS configuration
    response.setHeader('Access-Control-Allow-Credentials', true)
    response.setHeader('Access-Control-Allow-Origin', '*')
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (request.method === 'OPTIONS') {
        return response.status(200).json({})
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { to, subject, html, text } = request.body;

    // Credentials provided by user (Should be in process.env in production)
    const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const SMTP_PORT = process.env.SMTP_PORT || 587;
    const SMTP_USER = process.env.SMTP_USER || '9e18bc001@smtp-brevo.com';
    const SMTP_PASS = process.env.SMTP_PASS || '8LQ6B2N73MYRmwCO';

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: '"WGA App" <no-reply@wgabrasil.com.br>', // Generic sender
            to: to,
            subject: subject,
            text: text,
            html: html,
        });

        console.log("Message sent: %s", info.messageId);
        return response.status(200).json({ message: 'Email sent successfully via Brevo SMTP', id: info.messageId });

    } catch (error) {
        console.error("SMTP Error:", error);
        return response.status(500).json({ error: 'Failed to send email via SMTP', details: error.message });
    }
}
