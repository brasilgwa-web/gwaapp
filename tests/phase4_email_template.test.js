import test from 'node:test';
import assert from 'node:assert/strict';
import {
    WGA_INTEGRA_360_EMAIL_SUBJECT,
    WGA_INTEGRA_360_EMAIL_HTML,
    renderEmailTemplate,
    formatEmailHtmlBody
} from '../src/lib/emailTemplates.js';

test('Fase 4.1 - Renderização do Template Oficial WGA Integra 360 com todas as variáveis dinâmicas', () => {
    const vars = {
        client_name: 'Indústria Química Beta S/A',
        date: '04/11/2026',
        link: 'https://drive.google.com/file/d/relatorio-123/view',
        report_number: '2611-000142',
        technician_name: 'Eng. Marcos Oliveira',
        lab_link: 'https://drive.google.com/file/d/laudo-999/view'
    };

    const subject = renderEmailTemplate(WGA_INTEGRA_360_EMAIL_SUBJECT, vars);
    const html = renderEmailTemplate(WGA_INTEGRA_360_EMAIL_HTML, vars);

    assert.equal(subject, 'Relatório Técnico WGA Integra 360 - Indústria Química Beta S/A (04/11/2026)');
    assert.match(html, /WGA Integra 360/);
    assert.match(html, /Indústria Química Beta S\/A/);
    assert.match(html, /04\/11\/2026/);
    assert.match(html, /2611-000142/);
    assert.match(html, /Eng\. Marcos Oliveira/);
    assert.match(html, /https:\/\/drive\.google\.com\/file\/d\/relatorio-123\/view/);
});

test('Fase 4.2 - Retrocompatibilidade 100% com templates customizados legados ({client_name}, {date}, {link})', () => {
    const legacyCustomTemplate = '<p>Prezado {client_name}, segue o relatório de {date}: <a href="{link}">Abrir</a></p>';
    const rendered = renderEmailTemplate(legacyCustomTemplate, {
        client_name: 'Condomínio Solar',
        date: '01/11/2026',
        link: 'https://example.com/pdf'
    });

    assert.equal(rendered, '<p>Prezado Condomínio Solar, segue o relatório de 01/11/2026: <a href="https://example.com/pdf">Abrir</a></p>');
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

