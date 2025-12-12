import fs from 'fs';

try {
    const rawData = fs.readFileSync('lighthouse_report.json');
    const report = JSON.parse(rawData);

    console.log('--- FAILED AUDITS ---');
    for (const [key, audit] of Object.entries(report.audits)) {
        if (audit.score !== 1 && audit.score !== null) {
            console.log(`[${audit.score}] ${audit.title} (${key})`);
        }
    }

} catch (err) {
    console.error('Error parsing report:', err);
}
