import fs from 'fs';

const inputFile = 'results.ndjson';
const outputFile = 'summary.html';

function loadNDJSON(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  return lines.map((line) => JSON.parse(line));
}

function generateHTML(data) {
  const total = data.length;
  const passed = data.filter((d) => d.result === 'PASS').length;
  const failed = total - passed;

  // Group by zip
  const byZip = {};
  for (const d of data) {
    const zip = d.zip || 'UNKNOWN_ZIP';
    if (!byZip[zip]) byZip[zip] = [];
    byZip[zip].push(d);
  }

  const zipSections = Object.entries(byZip)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([zip, items]) => {
      const zipTotal = items.length;
      const zipPassed = items.filter((d) => d.result === 'PASS').length;
      const zipFailed = zipTotal - zipPassed;

      const rows = items
        .map(
          (d) => `
        <tr class="${d.result.toLowerCase()}">
          <td>${d.file}</td>
          <td><a href="${d.url}" target="_blank">Open</a></td>
          <td>${d.isRenderable}</td>
          <td>${d.status}</td>
          <td class="res-${d.result.toLowerCase()}">${d.result}</td>
          <td>${d.notes}</td>
        </tr>
      `,
        )
        .join('');

      return `
  <details open>
    <summary>
      <span class="zip-name">${zip}</span>
      <span class="zip-counts">
        Total: <strong>${zipTotal}</strong>,
        Passed: <span class="pass-count">${zipPassed}</span>,
        Failed: <span class="fail-count">${zipFailed}</span>
      </span>
    </summary>
    <table class="results-table">
      <thead>
        <tr>
          <th>File</th>
          <th>URL</th>
          <th>Renderable?</th>
          <th>Status</th>
          <th>Result</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </details>`;
    })
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Media Verification Summary</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f6f7fb; }
    h1 { margin-bottom: 5px; }
    .summary-box { margin-bottom: 20px; padding: 10px 15px; background: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .summary-box p { margin: 4px 0; }
    .summary-box .total { font-weight: bold; }
    .pass-count { color: #1b7f3b; font-weight: 600; }
    .fail-count { color: #b3261e; font-weight: 600; }

    details { margin-bottom: 16px; background: #ffffff; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); padding: 6px 10px 10px; }
    summary { cursor: pointer; display: flex; justify-content: space-between; align-items: center; padding: 4px 2px 8px; }
    summary::-webkit-details-marker { display: none; }
    summary::before {
      content: "▸";
      margin-right: 6px;
      font-size: 11px;
      transition: transform 0.15s ease;
    }
    details[open] summary::before { transform: rotate(90deg); }

    .zip-name { font-weight: 600; }
    .zip-counts { font-size: 13px; color: #555; }

    table.results-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    table.results-table th, table.results-table td {
      padding: 6px 8px;
      border: 1px solid #ddd;
      text-align: left;
      vertical-align: top;
    }
    table.results-table th { background-color: #f4f4f4; }

    tr.pass { background: #e9ffe9; }
    tr.fail { background: #ffe9e9; }

    .res-pass { color: #1b7f3b; font-weight: bold; }
    .res-fail { color: #b3261e; font-weight: bold; }

    a { color: #1565c0; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>

  <h1>Media Verification Summary</h1>
  <div class="summary-box">
    <p class="total">Total files: ${total}</p>
    <p>Passed: <span class="pass-count">${passed}</span></p>
    <p>Failed: <span class="fail-count">${failed}</span></p>
  </div>

  ${zipSections}

</body>
</html>
`;
}

// -------------------------------------------------------------

const data = loadNDJSON(inputFile);
const html = generateHTML(data);
fs.writeFileSync(outputFile, html, 'utf-8');
console.log(`✅ HTML report generated: ${outputFile}`);
