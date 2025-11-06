const fs = require('fs');
const path = require('path');

const LOG_FILE_PATH = path.join(__dirname, '..', 'errorTallySync.txt');

function appendLogLines(lines = []) {
    if (!Array.isArray(lines) || lines.length === 0) return;
    const timestamp = new Date().toISOString();
    const content = lines.map(line => `[${timestamp}] ${line}`).join('\n') + '\n';
    try {
        fs.appendFileSync(LOG_FILE_PATH, content, { encoding: 'utf8' });
    } catch (e) {
        // Swallow logging errors to not break the request flow
    }
}

module.exports = {
    appendLogLines,
};


