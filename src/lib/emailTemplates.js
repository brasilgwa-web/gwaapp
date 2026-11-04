// Template Oficial Corporativo WGA Integra 360 (Entregável #4)
// Suporta variáveis dinâmicas com 100% de retrocompatibilidade:
// {client_name}, {date}, {link}, {report_number}, {technician_name}, {lab_link}

export const WGA_INTEGRA_360_EMAIL_SUBJECT = 'Relatório Técnico WGA Integra 360 - {client_name} ({date})';

export const WGA_INTEGRA_360_EMAIL_HTML = `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; color: #1e293b;">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%); padding: 24px 28px; color: #ffffff;">
    <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; opacity: 0.85; margin-bottom: 4px;">WGA BRASIL • TRATAMENTO DE ÁGUAS</div>
    <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Relatório Técnico — WGA Integra 360</h1>
  </div>
  <div style="padding: 28px;">
    <p style="margin-top: 0; font-size: 14px; line-height: 1.6;">Olá, <strong>{client_name}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">
      Informamos que o atendimento técnico em campo foi concluído e o seu <strong>Relatório de Atendimento Técnico</strong> já está disponível para consulta e download na plataforma <strong>WGA Integra 360</strong>.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px;">
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 40%;">Relatório Nº</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">{report_number}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Data da Visita</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">{date}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #64748b;">Responsável pelo Atendimento</td>
        <td style="padding: 10px 14px; font-weight: 600; color: #0f172a;">{technician_name}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 28px 0;">
      <a href="{link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 6px;">
        Acessar Relatório Técnico (PDF)
      </a>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #64748b; margin-top: 20px;">
      Em caso de dúvidas técnicas ou necessidade de esclarecimentos adicionais sobre os parâmetros monitorados e recomendações operacionais, nossa equipe de engenharia permanece à disposição.
    </p>
  </div>
  <div style="background-color: #f1f5f9; padding: 16px 28px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center;">
    <strong>WGA Brasil Tratamento de Águas</strong> • Sistema WGA Integra 360<br/>
    atendimento@wgabrasil.com.br • (11) 9.6348-9922
  </div>
</div>`;

/**
 * Substitui de forma segura todas as variáveis dinâmicas suportadas pelo template de email.
 */
export function renderEmailTemplate(templateStr, vars = {}) {
    if (!templateStr || typeof templateStr !== 'string') return '';

    const safeVars = {
        client_name: vars.client_name || 'Cliente',
        date: vars.date || '',
        link: vars.link || '#',
        report_number: vars.report_number || '-',
        technician_name: vars.technician_name || 'Equipe Técnica WGA Brasil',
        lab_link: vars.lab_link || vars.link || '#'
    };

    return templateStr
        .replace(/\{client_name\}/g, safeVars.client_name)
        .replace(/\{date\}/g, safeVars.date)
        .replace(/\{link\}/g, safeVars.link)
        .replace(/\{report_number\}/g, safeVars.report_number)
        .replace(/\{technician_name\}/g, safeVars.technician_name)
        .replace(/\{lab_link\}/g, safeVars.lab_link);
}

/**
 * Garante que templates HTML ricos não tenham suas quebras de linha estruturais corrompidas por <br>,
 * ao mesmo tempo em que converte texto puro com quebras de linha em <br>.
 */
export function formatEmailHtmlBody(bodyStr) {
    if (!bodyStr || typeof bodyStr !== 'string') return '';
    const hasHtmlBlockTags = /<(div|table|p|html|h1|h2|h3|ul|ol|br)\b/i.test(bodyStr);
    if (hasHtmlBlockTags) {
        return bodyStr;
    }
    return bodyStr.replace(/\n/g, '<br>');
}

