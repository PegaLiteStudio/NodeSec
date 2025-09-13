import * as fs from "fs";
import * as path from "path";

// Directories you want to ensure exist
const requiredDirs: string[] = [
    "data",
    "data/agents",
    "data/agent-logs",
    "data/compile-logs",
    "data/key",
    "data/temp",
    "data/themes",
    "data/themes/icons",
    "data/themes/resources",
    "data/themes/screenshots",
];

requiredDirs.forEach((dir) => {
    const fullPath = path.join(process.cwd(), dir); // safer than __dirname
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, {recursive: true});
        console.log(`✅ Created folder: ${dir}`);
    } else {
        console.log(`✔️ Folder exists: ${dir}`);
    }
});

console.log("🎉 Setup complete!");
