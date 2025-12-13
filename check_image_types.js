import fs from 'fs';
import path from 'path';

const files = [
    'public/pwa-192x192.png',
    'public/pwa-512x512.png',
    'public/screenshot-mobile.png',
    'public/screenshot-desktop.png'
];

files.forEach(file => {
    try {
        const buffer = fs.readFileSync(file);
        const header = buffer.toString('hex', 0, 4).toUpperCase();
        let type = 'unknown';

        if (header.startsWith('89504E47')) {
            type = 'image/png';
        } else if (header.startsWith('FFD8FF')) {
            type = 'image/jpeg';
        }

        console.log(`${file}: ${type} (Header: ${header})`);
    } catch (err) {
        console.log(`${file}: Error reading file - ${err.message}`);
    }
});
