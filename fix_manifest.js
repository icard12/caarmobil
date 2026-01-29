import fs from 'fs';
const content = {
    "name": "CAAR MOBIL",
    "short_name": "CAAR MOBIL",
    "start_url": ".",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#FF4700"
};
fs.writeFileSync('public/manifest.json', JSON.stringify(content, null, 4), 'utf8');
console.log('Manifest written successfully');
