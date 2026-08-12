import fs from 'fs';
const data = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));
console.log(Object.keys(data));
if (data.components && data.components.schemas) {
  const table = Object.keys(data.components.schemas).find(k => k.toLowerCase().includes('print'));
  if (table) {
    console.log("Table found:", table);
    console.log("Columns:", Object.keys(data.components.schemas[table].properties));
  } else {
    console.log("No print table in schemas.");
  }
}
