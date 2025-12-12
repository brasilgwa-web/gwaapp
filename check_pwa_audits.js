import fs from 'fs';

const pwaAudits = [
    'installable-manifest',
    'service-worker',
    'splash-screen',
    'themed-omnibox',
    'content-width',
    'viewport',
    'maskable-icon',
    'robots-txt',
    'document-title',
    'meta-description'
];

try {
    const rawData = fs.readFileSync('lighthouse_report.json');
    const report = JSON.parse(rawData);

    console.log('--- TARGETED AUDIT CHECK ---');
    pwaAudits.forEach(key => {
        const audit = report.audits[key];
        if (audit) {
            console.log(`${key}: ${audit.score} - ${audit.title}`);
        } else {
            console.log(`${key}: NOT FOUND`);
        }
    });

} catch (err) {
    console.error('Error parsing report:', err);
}
