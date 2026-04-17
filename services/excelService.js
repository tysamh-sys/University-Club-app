const xlsx = require("xlsx");

let cachedData = null;

// 📊 read Excel file with caching to prevent Node.js event loop blocking
const readExcelFile = (filePath) => {
  if (cachedData) return cachedData; // Instantly return loaded data without freezing the app

  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    cachedData = xlsx.utils.sheet_to_json(sheet);
    return cachedData;
  } catch(error) {
    console.error("Error reading Excel data:", error);
    return [];
  }
};

module.exports = {
  readExcelFile
};