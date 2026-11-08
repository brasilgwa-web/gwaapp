import test from 'node:test';
import assert from 'node:assert/strict';
import {
    WGA_INTEGRA_360_EMAIL_SUBJECT,
    WGA_INTEGRA_360_EMAIL_HTML,
    renderEmailTemplate,
    formatEmailHtmlBody,
    resolveEmailBodyTemplate
} from '../src/lib/emailTemplates.js';

test('Fase 4.1 - Renderização do Template Oficial WGA Integra 360 (Layout 2 Colunas) com variáveis dinâmicas', () => {
    const vars = {
        client_name: 'Indústria Química Beta S/A',
        date: '04/11/2026',
        link: 'https://drive.google.com/file/d/relatorio-123/view',
        report_number: '2611-000142',
        technician_name: 'Eng. Marcos Oliveira',
        lab_link: 'https://drive.google.com/file/d/laudo-999/view',
        logo_url: 'https://jdkkykervzjrubcjibfu.supabase.co/storage/v1/object/public/public/logos/wga_logo.png'
    };

    const subject = renderEmailTemplate(WGA_INTEGRA_360_EMAIL_SUBJECT, vars);
    const html = renderEmailTemplate(WGA_INTEGRA_360_EMAIL_HTML, vars);

    assert.equal(subject, 'Relatório Técnico WGA Integra 360 - Indústria Química Beta S/A (04/11/2026)');
    assert.match(html, /APP WGA INTEGRA/);
    assert.match(html, /Plataforma Digital de Assistência Técnica e Relatórios de Ensaios analíticos/);
    assert.match(html, /ACESSAR RELATÓRIO/);
    assert.match(html, /suporte@wgabrasil\.com\.br/);
    assert.match(html, /atendimento@wgabrasil\.com\.br/);
    assert.match(html, /\+55 \(11\) 9\.6348-9922/);
    assert.match(html, /www\.wgabrasil\.com\.br/);
    assert.match(html, /Indústria Química Beta S\/A/);
    assert.match(html, /04\/11\/2026/);
    assert.match(html, /2611-000142/);
    assert.match(html, /Eng\. Marcos Oliveira/);
    assert.match(html, /https:\/\/drive\.google\.com\/file\/d\/relatorio-123\/view/);
    assert.match(html, /wga_logo\.png/);
});

test('Fase 4.2 - Retrocompatibilidade 100% com templates customizados legados ({client_name}, {date}, {link}) e upgrade automático', () => {
    const legacyCustomTemplate = '<p>Prezado {client_name}, segue o relatório de {date}: <a href="{link}">Abrir</a></p>';
    const rendered = renderEmailTemplate(legacyCustomTemplate, {
        client_name: 'Condomínio Solar',
        date: '01/11/2026',
        link: 'https://example.com/pdf'
    });

    assert.equal(rendered, '<p>Prezado Condomínio Solar, segue o relatório de 01/11/2026: <a href="https://example.com/pdf">Abrir</a></p>');
    assert.equal(resolveEmailBodyTemplate(''), WGA_INTEGRA_360_EMAIL_HTML);
    assert.equal(resolveEmailBodyTemplate('<p>Segue abaixo o link para o relatório da visita técnica</p>'), WGA_INTEGRA_360_EMAIL_HTML);
});

test('Fase 4.3 - Preservação da estrutura HTML rica vs conversão de quebras de linha em texto simples (formatEmailHtmlBody)', () => {
    const richHtml = WGA_INTEGRA_360_EMAIL_HTML;
    const formattedRich = formatEmailHtmlBody(richHtml);
    // Não deve injetar <br> entre tags <table> e <tr>
    assert.equal(formattedRich, richHtml);

    const plainText = 'Olá cliente,\nSegue seu relatório técnico.\nAtenciosamente, WGA.';
    const formattedPlain = formatEmailHtmlBody(plainText);
    assert.equal(formattedPlain, 'Olá cliente,<br>Segue seu relatório técnico.<br>Atenciosamente, WGA.');
});
