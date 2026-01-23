import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const FILES_TO_CONVERT = [
    { src: 'DOCUMENTACAO_TECNICA.md', dest: 'Documentacao_Tecnica.html', title: 'WGA Brasil - Documentação Técnica' },
    { src: 'MANUAL_USUARIO.md', dest: 'Manual_Usuario.html', title: 'WGA Brasil - Manual do Usuário' }
];

// GitHub-like CSS for formatting
const STYLES = `
<style>
    body {
        font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
        line-height: 1.6;
        color: #24292f;
        background-color: #ffffff;
        max-width: 896px;
        margin: 0 auto;
        padding: 2rem;
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
    h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }
    h3 { font-size: 1.25em; }
    p { margin-top: 0; margin-bottom: 16px; }
    code { font-family: ui-monospace,SFMono-Regular,SF Mono,Menlo,Consolas,Liberation Mono,monospace; background-color: #f6f8fa; padding: 0.2em 0.4em; border-radius: 6px; font-size: 85%; }
    pre { background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 6px; }
    pre code { background-color: transparent; padding: 0; }
    blockquote { padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; margin: 0 0 16px 0; }
    table { display: block; width: 100%; overflow: auto; border-spacing: 0; border-collapse: collapse; margin-bottom: 16px; }
    table tr { background-color: #fff; border-top: 1px solid #c6cbd1; }
    table tr:nth-child(2n) { background-color: #f6f8fa; }
    table th, table td { padding: 6px 13px; border: 1px solid #dfe2e5; }
    table th { font-weight: 600; }
    img { max-width: 100%; box-sizing: content-box; background-color: #fff; }
    hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; }
    a { color: #0969da; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .header { text-align: center; margin-bottom: 2rem; padding-bottom: 2rem; border-bottom: 1px solid #eaecef; }
    .footer { margin-top: 4rem; text-align: center; font-size: 0.8rem; color: #6a737d; }
</style>
`;

// Ensure docs dir exists
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR);
}

// Convert files
FILES_TO_CONVERT.forEach(file => {
    const srcPath = path.join(ROOT_DIR, file.src);
    const destPath = path.join(DOCS_DIR, file.dest);

    if (fs.existsSync(srcPath)) {
        const markdown = fs.readFileSync(srcPath, 'utf-8');
        const htmlContent = marked(markdown);

        const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.title}</title>
    ${STYLES}
</head>
<body>
    <div class="content">
        ${htmlContent}
    </div>
    <div class="footer">
        <p>Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
</body>
</html>
        `;

        fs.writeFileSync(destPath, fullHtml);
        console.log(`✅ Gerado: ${destPath}`);
    } else {
        console.error(`❌ Arquivo não encontrado: ${srcPath}`);
    }
});
