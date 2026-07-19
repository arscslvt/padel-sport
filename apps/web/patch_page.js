const fs = require('fs');
const file = 'app/tournament/[tournamentId]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startTag = '{currentLiveMatches.length > 0 && (';
const endTagStr = '        {completedTodayMatches.length > 0 && (';

// Find the block to extract. It starts at `startTag` within `<div className="mt-8">`
// Wait, the easiest way is to use regex or string locations.

const extractStart = content.indexOf('{currentLiveMatches.length > 0 && (');
if (extractStart === -1) throw new Error("Could not find start");

const extractEndStr = '<h3 className="font-medium font-heading">Match della categoria</h3>';
const extractEndIndex = content.indexOf(extractEndStr);
if (extractEndIndex === -1) throw new Error("Could not find end");

// We extract everything from `extractStart` up to just before `extractEndStr`
// Let's go up a bit from extractStart to grab the preceding whitespace/indentation.
let blockStart = content.lastIndexOf('        {currentLiveMatches.length > 0 && (');
let blockEnd = content.lastIndexOf('        <div className="mb-4"', extractEndIndex);

const extractedBlock = content.substring(blockStart, blockEnd);

// Remove the extracted block from the original content
content = content.slice(0, blockStart) + content.slice(blockEnd);

// Now, insert the extractedBlock before `<div className="sticky top-20`
const insertPointStr = '<div className="sticky top-20';
const insertPoint = content.indexOf(insertPointStr);
if (insertPoint === -1) throw new Error('Could not find insert point');

// To properly space it out, we can wrap the extracted block in a div or just insert it directly
const insertBlock = `      <div className="mb-8">
${extractedBlock}
      </div>

      `;

content = content.slice(0, insertPoint) + insertBlock + content.slice(insertPoint);

fs.writeFileSync(file, content);
console.log('Done!');
