-- Add email configuration columns to report_settings
ALTER TABLE report_settings
ADD COLUMN IF NOT EXISTS email_subject_default TEXT DEFAULT 'Relatório de Visita Técnica - {client_name} - {date}',
ADD COLUMN IF NOT EXISTS email_body_default TEXT DEFAULT '<div style="font-family: Arial, sans-serif; color: #333;">
    <h1 style="color: #0056b3; text-align: center;">A água é essencial para a nossa existência</h1>
    <p style="font-size: 16px; line-height: 1.6;">
        Capacitamos operações em todo o mundo para proteger esse recurso tão vital. 
        Estabelecemos parcerias com empresas de diversos setores, trabalhando ao lado delas 
        para desenvolver soluções para suas necessidades específicas de água.
    </p>
    <h2 style="color: #0056b3; text-align: center;">WGA BRASIL</h2>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
    <p>Olá,</p>
    <p>Segue abaixo o link para o relatório da visita técnica realizada em <strong>{date}</strong>.</p>
    <p style="text-align: center; margin: 30px 0;">
        <a href="{link}" style="background-color: #0056b3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Acessar Relatório
        </a>
    </p>
    <p style="font-size: 12px; color: #999; text-align: center;">
        Este é um email automático, por favor não responda.
    </p>
</div>';
