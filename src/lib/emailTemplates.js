// Template Oficial Corporativo WGA Integra 360 (Entregável #4)
// Layout de 2 Colunas (Logo WGA Brasil Integra 360 à esquerda + Conteúdo e Botão ACESSAR RELATÓRIO à direita)
// Suporta variáveis dinâmicas com 100% de retrocompatibilidade:
// {client_name}, {date}, {link}, {report_number}, {technician_name}, {lab_link}, {logo_url}

export const DEFAULT_WGA_LOGO_URL = 'https://gwaapp.vercel.app/icon.png';

export const WGA_INTEGRA_360_EMAIL_SUBJECT = 'Relatório Técnico WGA Integra 360 - {client_name} ({date})';

export const WGA_INTEGRA_360_EMAIL_HTML = `<div style="font-family: Arial, Helvetica, sans-serif; max-width: 680px; margin: 0 auto; background-color: #ffffff; color: #222222;" data-wga-template="integra-360-v2" data-client="{client_name}" data-date="{date}" data-report="{report_number}" data-technician="{technician_name}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; max-width: 680px; background-color: #ffffff;">
    <tr>
      <td width="175" valign="top" style="width: 175px; vertical-align: top; padding: 28px 16px; border: 1px solid #dbeafe; border-right: 3px solid #286fb4; text-align: center; background-color: #ffffff;">
        <img src="{logo_url}" alt="WGA Brasil Integra 360" width="145" style="max-width: 145px; width: 100%; height: auto; display: block; margin: 0 auto; border: 0;" />
      </td>
      <td valign="top" style="vertical-align: top; padding: 12px 24px 16px 24px; font-family: Arial, Helvetica, sans-serif;">
        <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #555555; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.2px;">
          APP WGA INTEGRA
        </h1>
        <div style="margin: 0 0 12px 0; font-size: 15px; font-weight: 700; color: #286fb4; line-height: 1.35; font-family: Arial, Helvetica, sans-serif;">
          Plataforma Digital de Assistência Técnica e Relatórios de Ensaios analíticos
        </div>
        <p style="margin: 0 0 18px 0; font-size: 13.5px; color: #111111; line-height: 1.48; font-family: Arial, Helvetica, sans-serif;">
          Relatórios técnicos, registros de campo e monitoramento operacional são disponibilizados através do APP WGA, permitindo rastreabilidade, transparência e acompanhamento das atividades realizadas em campo.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin: 0 0 22px 0;">
          <tr>
            <td align="center" bgcolor="#286fb4" style="background-color: #286fb4; padding: 14px 20px; text-align: center;">
              <a href="{link}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.4px;">
                ACESSAR RELATÓRIO
              </a>
            </td>
          </tr>
        </table>
        <p style="margin: 0 0 12px 0; font-size: 12.5px; color: #555555; line-height: 1.45; font-family: Arial, Helvetica, sans-serif;">
          &#9888;&#65039; Havendo dificuldades no acesso ao relatório, entre em contato com nosso suporte técnico:
        </p>
        <div style="margin: 0 0 12px 0; font-size: 13.5px; line-height: 1.75; color: #286fb4; font-family: Arial, Helvetica, sans-serif;">
          <div>&#9993; <a href="mailto:suporte@wgabrasil.com.br" style="color: #286fb4; text-decoration: none;">suporte@wgabrasil.com.br</a></div>
          <div>&#9993; <a href="mailto:atendimento@wgabrasil.com.br" style="color: #286fb4; text-decoration: none;">atendimento@wgabrasil.com.br</a></div>
          <div>&#9742; WhatsApp: +55 (11) 9.6348-9922</div>
          <div style="padding-left: 20px;">
            <a href="https://www.wgabrasil.com.br" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: underline;">www.wgabrasil.com.br</a>
          </div>
        </div>
        <p style="margin: 12px 0 14px 0; font-size: 12.5px; color: #555555; line-height: 1.4; font-family: Arial, Helvetica, sans-serif;">
          Ou entre em contato diretamente com nosso time de atendimento a clientes.
        </p>
        <p style="margin: 0; font-size: 11px; color: #666666; line-height: 1.4; font-family: Arial, Helvetica, sans-serif;">
          WGA Brasil. &bull; Gestão em processos &bull; Consultoria Ambiental e Energética em Sistemas de Águas e Processos Industriais
        </p>
      </td>
    </tr>
  </table>
</div>`;

/**
 * Garante que templates legados antigos ("Agradecemos por nos receber...", "Segue abaixo o link...",
 * ou versão v1 de coluna única) sejam atualizados para o layout oficial corporativo de 2 colunas,
 * mas preserva 100% qualquer customização feita pelo administrador nas Configurações de Relatório.
 */
export function resolveEmailBodyTemplate(savedBody) {
    if (!savedBody || typeof savedBody !== 'string' || !savedBody.trim()) {
        return WGA_INTEGRA_360_EMAIL_HTML;
    }
    const trimmed = savedBody.trim();
    if (
        trimmed.includes('Agradecemos por nos receber em nossa última visita técnica') ||
        trimmed.includes('Segue abaixo o link para o relatório da visita técnica') ||
        trimmed.includes('Relatório Técnico — WGA Integra 360') ||
        (trimmed.includes('APP WGA INTEGRA') && !trimmed.includes('<table'))
    ) {
        return WGA_INTEGRA_360_EMAIL_HTML;
    }
    return trimmed;
}

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
        lab_link: vars.lab_link || vars.link || '#',
        logo_url: (vars.logo_url && vars.logo_url.startsWith('http')) ? vars.logo_url : DEFAULT_WGA_LOGO_URL
    };

    return templateStr
        .replace(/\{client_name\}/g, safeVars.client_name)
        .replace(/\{date\}/g, safeVars.date)
        .replace(/\{link\}/g, safeVars.link)
        .replace(/\{report_number\}/g, safeVars.report_number)
        .replace(/\{technician_name\}/g, safeVars.technician_name)
        .replace(/\{lab_link\}/g, safeVars.lab_link)
        .replace(/\{logo_url\}/g, safeVars.logo_url);
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
