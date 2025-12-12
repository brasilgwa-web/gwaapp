import fs from 'fs';

try {
    const rawData = fs.readFileSync('lighthouse_report.json');
    const report = JSON.parse(rawData);

    if (report.categories.pwa) {
        console.log('--- PWA Audit Results ---');
        const pwaRefs = report.categories.pwa.auditRefs;
        pwaRefs.forEach(ref => {
            const audit = report.audits[ref.id];
            if (audit.score !== 1 && audit.score !== null) {
                console.log(`[FAILED] ${audit.title}`);
                console.log(`Explanation: ${audit.description}`);
                if (audit.warnings) console.log(`Warnings: ${audit.warnings}`);
                console.log('---------------------------------------------------');
            } else {
                console.log(`[PASSED] ${audit.title}`);
            }
        });
    } else {
        console.log("No PWA category found in report.");
    }

} catch (err) {
    console.error('Error parsing report:', err);
}
