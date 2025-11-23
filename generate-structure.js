const fs = require("fs");
const path = require("path");

const IGNORE = ["node_modules", "dist", "build", ".git", ".vscode"];

function walk(dir, indent = "") {
  let output = "";

  const items = fs.readdirSync(dir).filter(item => {
    return !IGNORE.includes(item);
  });

  items.forEach(item => {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) {
      output += `${indent}📁 ${item}\n`;
      output += walk(full, indent + "   ");
    } else {
      output += `${indent}📄 ${item}\n`;
    }
  });

  return output;
}

const tree = walk(".");
fs.writeFileSync("PROJECT_STRUCTURE.txt", tree);

console.log("DONE → Check PROJECT_STRUCTURE.txt");
