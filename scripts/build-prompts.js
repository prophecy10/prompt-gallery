/**
 * Fetches the published Google Sheet (CSV) and rebuilds prompts.json
 * 
 * Expected Google Sheet columns (from the Form):
 *   Timestamp | Category | Prompt | Image URL
 * 
 * The Timestamp column is auto-added by Google Forms.
 */

const fs = require('fs');
const path = require('path');

const SHEET_URL = process.env.SHEET_CSV_URL;

if (!SHEET_URL) {
    console.error('ERROR: SHEET_CSV_URL environment variable is not set.');
    process.exit(1);
}

async function main() {
    console.log('Fetching Google Sheet CSV...');
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
        console.error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
        process.exit(1);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    if (rows.length < 2) {
        console.log('No data rows found. Writing empty array.');
        writePrompts([]);
        return;
    }

    // First row is headers
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const timestampIdx = headers.findIndex(h => h === 'timestamp');
    const categoryIdx = headers.findIndex(h => h.includes('category'));
    const promptIdx = headers.findIndex(h => h.includes('prompt'));
    const imageIdx = headers.findIndex(h => h.includes('image'));

    if (categoryIdx === -1 || promptIdx === -1 || imageIdx === -1) {
        console.error('Could not find required columns. Found headers:', headers);
        console.error('Expected columns containing: category, prompt, image');
        process.exit(1);
    }

    const prompts = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;

        const category = (row[categoryIdx] || '').trim().toLowerCase();
        const prompt = (row[promptIdx] || '').trim();
        const imageUrl = (row[imageIdx] || '').trim();

        // Skip empty rows
        if (!prompt || !imageUrl) continue;

        // Extract date from timestamp or use today
        let date = new Date().toISOString().split('T')[0];
        if (timestampIdx !== -1 && row[timestampIdx]) {
            const parsed = new Date(row[timestampIdx]);
            if (!isNaN(parsed.getTime())) {
                date = parsed.toISOString().split('T')[0];
            }
        }

        prompts.push({
            id: i,
            category: category || 'other',
            prompt: prompt,
            image_url: imageUrl,
            date: date
        });
    }

    // Sort newest first (by date, then by id descending)
    prompts.sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return b.id - a.id;
    });

    // Re-assign IDs after sorting (newest = highest ID)
    prompts.forEach((p, idx) => {
        p.id = prompts.length - idx;
    });

    writePrompts(prompts);
    console.log(`Done! Written ${prompts.length} prompts to prompts.json`);
}

function writePrompts(prompts) {
    const outputPath = path.join(__dirname, '..', 'prompts.json');
    fs.writeFileSync(outputPath, JSON.stringify(prompts, null, 2) + '\n', 'utf8');
}

/**
 * Simple CSV parser that handles quoted fields with commas and newlines
 */
function parseCSV(text) {
    const rows = [];
    let current = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const next = text[i + 1];

        if (inQuotes) {
            if (char === '"' && next === '"') {
                field += '"';
                i++; // skip escaped quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                current.push(field);
                field = '';
            } else if (char === '\n' || (char === '\r' && next === '\n')) {
                current.push(field);
                field = '';
                rows.push(current);
                current = [];
                if (char === '\r') i++; // skip \n in \r\n
            } else {
                field += char;
            }
        }
    }

    // Last field/row
    if (field || current.length > 0) {
        current.push(field);
        rows.push(current);
    }

    return rows;
}

main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
