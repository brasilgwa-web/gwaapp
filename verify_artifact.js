import fs from 'fs';

const file = 'C:/Users/camil/.gemini/antigravity/brain/848e5e59-882b-4db9-a605-3e7bb97804c9/pwa_icon_512_png_1765671233532.png';

try {
    if (fs.existsSync(file)) {
        const buffer = fs.readFileSync(file);
        const header = buffer.toString('hex', 0, 4).toUpperCase();
        let type = 'unknown';

        if (header.startsWith('89504E47')) {
            type = 'image/png';
        } else if (header.startsWith('FFD8FF')) {
            type = 'image/jpeg';
        }

        console.log(`${file}: ${type} (Header: ${header})`);
    } else {
        console.log(`${file}: NOT FOUND`);
    }
} catch (err) {
    console.log(`${file}: Error reading file - ${err.message}`);
}
