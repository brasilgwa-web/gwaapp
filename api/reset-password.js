import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { userId, newPassword } = req.body;

    // Validate inputs
    if (!userId || !newPassword) {
        return res.status(400).json({ error: 'userId e newPassword são obrigatórios' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Get service role key from environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase configuration');
        return res.status(500).json({ error: 'Configuração do servidor incompleta. Verifique as variáveis de ambiente.' });
    }

    try {
        // Create admin client with service role key
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Update user password using Admin API
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        });

        if (error) {
            console.error('Error updating password:', error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({
            success: true,
            message: 'Senha atualizada com sucesso'
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
