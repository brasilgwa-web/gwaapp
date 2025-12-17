-- V1.2 Part 7: AI Settings Table for storing AI prompt configuration

CREATE TABLE IF NOT EXISTS ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write (for now, allow all authenticated for simplicity)
CREATE POLICY "Enable all access for authenticated users" ON ai_settings 
FOR ALL USING (auth.role() = 'authenticated');

-- Insert default AI prompt
INSERT INTO ai_settings (setting_key, setting_value, description) VALUES
(
    'technical_analysis_prompt',
    'Você é um engenheiro químico sênior especializado em tratamento de água e efluentes da WGA Brasil.

DADOS DA VISITA TÉCNICA:
Cliente: {{client_name}}
Endereço: {{client_address}}

RESULTADOS ANALÍTICOS:
{{results}}

DOSAGENS APLICADAS:
{{dosages}}

OBSERVAÇÕES DO TÉCNICO:
{{observations}}

INSTRUÇÕES:
1. Analise os resultados acima de forma técnica e profissional
2. Identifique anomalias (valores fora da faixa, especialmente 🔴 e 🟡)
3. Sugira ações corretivas específicas quando necessário
4. Se tudo estiver OK, elogie a manutenção preventiva
5. Use linguagem técnica mas acessível
6. Seja conciso e direto (máximo 200 palavras)

FORMATO:
- Inicie com um resumo geral (1-2 frases)
- Liste anomalias encontradas se houver
- Finalize com recomendações práticas

Responda em português brasileiro:',
    'Prompt usado para gerar análise técnica automática via Gemini AI'
)
ON CONFLICT (setting_key) DO NOTHING;
