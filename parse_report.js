import fs from 'fs';

try {
    const rawData = fs.readFileSync('lighthouse_report.json');
    const report = JSON.parse(rawData);

    console.log(`Lighthouse Score: PWA: ${report.categories.pwa ? report.categories.pwa.score : 'N/A'}`);

    const audits = report.audits;
    const failedAudits = [];

    for (const [key, audit] of Object.entries(audits)) {
        if (audit.score !== 1 && audit.score !== null) {
            failedAudits.push({
                id: key,
                title: audit.title,
                description: audit.description,
                score: audit.score,
                displayValue: audit.displayValue
            });
        }
    }

    console.log('--- Failed Audits ---');
    failedAudits.forEach(a => {
        console.log(`[${a.score}] ${a.title}`);
        console.log(`    ${a.description ? a.description.substring(0, 150) : ''}...`);
        if (a.displayValue) console.log(`    Value: ${a.displayValue}`);
        console.log('');
    });

} catch (err) {
    console.error('Error parsing report:', err);
}
