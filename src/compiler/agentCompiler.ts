import path from "path";
import fs from "fs";
import fsExtra from "fs-extra";
import unzipper from "unzipper";
import {generateRandomPackage} from "../utils/randomUtils";
import {spawn} from "child_process";
import Agent from "../models/agent.model";

class AgentCompiler {
    private readonly agentID: string;
    private readonly agentName: string;
    private readonly adminID: string;
    private readonly themeID: string;
    private readonly tempFolder: string;
    private readonly baseProject: string;
    private readonly themeFile: string;
    private readonly forbiddenActions: any;
    private readonly variableData: any;
    private readonly agentStorePath: string;

    constructor(agentID: string, agentName: string, adminID: string, themeID: string, forbiddenActions: any, variableData: any) {
        this.agentID = agentID;
        this.agentName = agentName;
        this.adminID = adminID;
        this.themeID = themeID;
        this.forbiddenActions = forbiddenActions;
        this.variableData = variableData;

        this.tempFolder = path.join(__dirname, `../../data/temp/${agentID}`);
        this.baseProject = path.join(__dirname, "../../data/main/base.zip");
        this.themeFile = path.join(__dirname, `../../data/themes/resources/${themeID}.zip`);
        this.agentStorePath = path.join(__dirname, "../../data/agents");
    }

    public addLog(message: string) {
        console.log(message);
        if (connectedUsers[this.adminID]) {
            io.to(connectedUsers[this.adminID]).emit("agent-log-" + this.agentID, message)
        }
        const logsDir = path.join(__dirname, "../../data/compile-logs");
        const logFile = path.join(logsDir, `${this.agentID}.log`);

        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, {recursive: true});
        }

        const logLine = `${message}\n`;
        fs.appendFileSync(logFile, logLine, "utf8");

    }

    public async compileAgent() {
        await this.clearLogs();
        this.addLog(`Compile Request Received [${this.agentName}]`);

        try {
            await this.checkResources();
            await this.validateResources();
            await this.checkVariables();
            await this.copyThemeFiles();
            await this.setUpGradle();
            await this.changePackageName();
            await this.build();
            await this.copyAgentApp();
            await this.cleanUp();
            this.addLog("SUCCESS")

            await Agent.updateOne({agentID: this.agentID}, {$set: {status: "active"}});
        } catch (e: any) {
            this.addLog("ERROR")
            this.addLog(`❌ Compilation failed: ${e.message}`);

            await Agent.updateOne({agentID: this.agentID}, {$set: {status: "error"}});
        }
    }

    private async clearLogs() {
        const logsDir = path.join(__dirname, "../../data/compile-logs");
        const logFile = path.join(logsDir, `${this.agentID}.log`);
        fs.rmSync(logFile, {recursive: true, force: true});
    }

    private async extractZip(zipPath: string, destDir: string) {
        return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
                .pipe(unzipper.Extract({path: destDir}))
                .on("close", resolve)
                .on("error", reject);
        });
    }

    private async checkResources() {
        this.addLog("Checking resources...");
        if (!fs.existsSync(this.baseProject)) {
            throw new Error("Base project not found!");
        }
        if (!fs.existsSync(this.themeFile)) {
            throw new Error(`Theme file (${this.themeID}) not found!`);
        }

        if (fs.existsSync(this.tempFolder)) {
            this.addLog("Removing Temp Data");
            fsExtra.removeSync(this.tempFolder);
        }

        fs.mkdirSync(this.tempFolder, {recursive: true});

        this.addLog("Extracting Theme!");
        await this.extractZip(this.themeFile, path.join(this.tempFolder, "theme"));
        this.addLog("Extracting Base Project!");
        await this.extractZip(this.baseProject, path.join(this.tempFolder, "project"));
        this.addLog("Resources Extracted ✅");
    }

    private async validateResources() {
        this.addLog("Validating Resources!");

        let themeFolder = path.join(this.tempFolder, "theme");

        // Define required folders
        const requiredFolders = ["java", "layout"];

        for (const folder of requiredFolders) {
            const folderPath = path.join(themeFolder, folder);

            // Check if the folder exists
            if (!fs.existsSync(folderPath)) {
                throw new Error(`Folder "${folder}" is missing in theme!`);
            }

            // Check if the folder is empty
            const files = fs.readdirSync(folderPath);
            if (files.length === 0) {
                throw new Error(`Folder "${folder}" is empty!`);
            }
        }

        this.addLog("Resources verified ✅");
    }

    private async checkVariables() {
        this.addLog("Checking variables...");

        let themeVars = path.join(this.tempFolder, "theme", "java", "VARS.java");

        if (!fsExtra.existsSync(themeVars)) {
            this.addLog("Theme variables not found.");
            return;
        }

        let content = fs.readFileSync(themeVars, "utf8");

        // Regex to capture: public static String NAME = "value";
        const regex = /public\s+static\s+String\s+([A-Z0-9_]+)\s*=\s*"(.*?)";/g;
        const variableNames: string[] = [];

        let match;
        while ((match = regex.exec(content)) !== null) {
            const varName = match[1];
            variableNames.push(varName);

            if (this.variableData[varName] !== undefined) {
                const newValue = this.variableData[varName];
                const replacement = `public static String ${varName} = "${newValue}";`;
                content = content.replace(match[0], replacement);
            }
        }

        if (variableNames.length > 0) {
            this.addLog("Variables found: " + variableNames.join(", "));
            this.addLog("Theme variables replaced and saved!");
        } else {
            this.addLog("No variables found in VARS.java.");
        }

        // Write the updated content into the project folder
        let projectFolder = path.join(this.tempFolder, "project");
        const varsDest = path.join(
            projectFolder,
            "app",
            "src",
            "main",
            "java",
            "com",
            "pegalite",
            "coresec",
            "functions",
            "VARS.java"
        );

        fsExtra.writeFileSync(varsDest, content, "utf8");

        // Remove original VARS.java from theme
        fs.rmSync(themeVars, {recursive: true, force: true});
    }

    private async copyThemeFiles() {
        this.addLog("Applying theme...");

        let themeFolder = path.join(this.tempFolder, "theme");
        let projectFolder = path.join(this.tempFolder, "project");

        const drawableSrc = path.join(themeFolder, "drawable");
        const drawableDest = path.join(projectFolder, "app", "src", "main", "res", "drawable");
        if (fsExtra.existsSync(drawableSrc)) {
            fsExtra.mkdirpSync(drawableDest); // ensure folder exists
            fsExtra.copySync(drawableSrc, drawableDest, {overwrite: true});
            this.addLog("Drawable folder applied.");
        }

        // 2️⃣ Copy layout folder if it exists
        const layoutSrc = path.join(themeFolder, "layout");
        const layoutDest = path.join(projectFolder, "app", "src", "main", "res", "layout");
        if (fsExtra.existsSync(layoutSrc)) {
            fsExtra.mkdirpSync(layoutDest);
            fsExtra.copySync(layoutSrc, layoutDest, {overwrite: true});
            this.addLog("Layout folder applied.");
        }

        // 3️⃣ Copy java folder to your package path
        // Example package path: com.pegalite.coresec.ui
        const javaSrc = path.join(themeFolder, "java");
        const javaDest = path.join(
            projectFolder,
            "app",
            "src",
            "main",
            "java",
            "com",
            "pegalite",
            "coresec"
        );

        if (fsExtra.existsSync(javaSrc)) {
            fsExtra.mkdirpSync(javaDest);
            fsExtra.copySync(javaSrc, javaDest, {overwrite: true});
            this.addLog("Java folder applied.");
        }

        // 4️⃣ Copy mipmap folder and all subfolders
        const mipmapSrc = path.join(themeFolder, "mipmap");
        const resDest = path.join(projectFolder, "app", "src", "main", "res");
        if (fsExtra.existsSync(mipmapSrc)) {
            // Loop over all subfolders in theme/mipmap
            const subFolders = fsExtra.readdirSync(mipmapSrc);
            for (const folder of subFolders) {
                const srcPath = path.join(mipmapSrc, folder);
                const destPath = path.join(resDest, folder);
                fsExtra.mkdirpSync(destPath);
                fsExtra.copySync(srcPath, destPath, {overwrite: true});
            }
            this.addLog("Mipmap folders applied.");
        }

        // 5️⃣ Copy values folder and subfolders
        const valuesSrc = path.join(themeFolder, "values");
        const valuesDest = path.join(resDest, "values");
        if (fsExtra.existsSync(valuesSrc)) {
            fsExtra.mkdirpSync(valuesDest);
            fsExtra.copySync(valuesSrc, valuesDest, {overwrite: true});
            this.addLog("Values folder applied.");
        }

        // 6️⃣ Copy AndroidManifest.xml
        const manifestSrc = path.join(themeFolder, "AndroidManifest.xml");
        const manifestDest = path.join(projectFolder, "app", "src", "main", "AndroidManifest.xml");
        if (fsExtra.existsSync(manifestSrc)) {
            fsExtra.copyFileSync(manifestSrc, manifestDest);
            this.addLog("AndroidManifest.xml applied.");
        }

        this.addLog("Theme successfully applied ✅");
    }

    private async setUpGradle() {
        // 1️⃣ Write local.properties
        const localPath = path.join(this.tempFolder, "project", "local.properties");
        const sdkDir = `sdk.dir=${process.env.SDK_PATH}`;
        fs.writeFileSync(localPath, sdkDir, {encoding: "utf8"});
        this.addLog("local.properties created ✅");

        // 2️⃣ Modify build.gradle.kts
        const gradlePath = path.join(this.tempFolder, "project", "app", "build.gradle.kts");
        let gradleContent = fs.readFileSync(gradlePath, "utf8");

        // Replace inside signingConfigs block
        gradleContent = gradleContent.replace(/var path = ".*"/, `var path = "${process.env.KEY_PATH}"`);
        gradleContent = gradleContent.replace(/var storePassword = ".*"/, `var storePassword = "${process.env.STORE_PASS}"`);
        gradleContent = gradleContent.replace(/var keyAlias = ".*"/, `var keyAlias = "${process.env.KEY_ALIAS}"`);
        gradleContent = gradleContent.replace(/var keyPassword = ".*"/, `var keyPassword = "${process.env.KEY_PASS}"`);

        fs.writeFileSync(gradlePath, gradleContent, "utf8");
        this.addLog("build.gradle.kts signing configs applied ✅");
    }

    private async changePackageName() {
        const oldPackage = "com.pegalite.coresec";
        const newPackage = generateRandomPackage();

        this.addLog(`🎯 New random package: ${newPackage}`);

        // Define file paths
        const appPath = path.join(this.tempFolder, "project", "app");
        const gradleFile = path.join(appPath, "build.gradle.kts");
        const manifestFile = path.join(appPath, "src", "main", "AndroidManifest.xml");
        const srcPath = path.join(appPath, "src", "main", "java");

        const replaceInFile = (filePath: string, oldStr: string, newStr: string) => {
            const content = fs.readFileSync(filePath, "utf8");
            const updatedContent = content.replace(new RegExp(oldStr, "g"), newStr);
            fs.writeFileSync(filePath, updatedContent, "utf8");
            this.addLog(`✅ Updated: ${path.basename(filePath)}`);
        };

        // Replace in gradle and manifest files
        replaceInFile(gradleFile, `namespace = "${oldPackage}"`, `namespace = "${newPackage}"`);
        replaceInFile(gradleFile, `applicationId = "${oldPackage}"`, `applicationId = "${newPackage}"`);
        replaceInFile(manifestFile, `package="${oldPackage}"`, `package="${newPackage}"`);

        // Rename directories and files recursively
        const oldPath = path.join(srcPath, ...oldPackage.split("."));
        const newPath = path.join(srcPath, ...newPackage.split("."));

        if (fs.existsSync(oldPath)) {
            // Ensure the new directory exists
            fs.mkdirSync(newPath, {recursive: true});

            // Recursively copy and rename files and folders
            const renameAndCopyFiles = (src: string, dest: string) => {
                const items = fs.readdirSync(src);
                items.forEach(item => {
                    const srcItemPath = path.join(src, item);
                    const destItemPath = path.join(dest, item);

                    if (fs.statSync(srcItemPath).isDirectory()) {
                        // If it's a directory, recurse into it
                        fs.mkdirSync(destItemPath, {recursive: true});
                        renameAndCopyFiles(srcItemPath, destItemPath);
                    } else {
                        // If it's a file, copy and rename it
                        fs.copyFileSync(srcItemPath, destItemPath);
                    }
                });
            };

            // Call the function to copy and rename
            renameAndCopyFiles(oldPath, newPath);

            this.addLog("✅ Renamed and copied package directories");
        }

        const updateJavaFiles = (dir: string) => {
            const files = fs.readdirSync(dir);
            files.forEach((file) => {
                const filePath = path.join(dir, file);
                if (fs.statSync(filePath).isDirectory()) {
                    updateJavaFiles(filePath);
                } else if (file.endsWith(".java") || file.endsWith(".kt")) {
                    replaceInFile(filePath, oldPackage, newPackage);
                }
            });
        };

        updateJavaFiles(newPath);

        fs.rmSync(path.join(srcPath, "com", "pegalite"), {recursive: true, force: true});

        this.addLog(`✅ Package renamed to: ${newPackage}`);
    }

    private async build() {
        return new Promise((resolve: any, reject: any) => {
            this.addLog("⚙️ Cleaning & building APK...");
            const gradleCommand = process.platform === "win32" ? "gradlew.bat" : "./gradlew";

            const buildProcess = spawn(gradleCommand, ["clean", "assembleRelease", "--no-daemon"], {
                cwd: path.join(this.tempFolder, "project"),
                shell: true,
            });

            buildProcess.stdout.on("data", (data) => {
                this.addLog(data.toString());
            });

            buildProcess.stderr.on("data", (data) => {
                this.addLog(data.toString());
            });

            buildProcess.on("close", (code) => {
                this.addLog(`Build process exited with code ${code}`);
                if (code === 0) {
                    this.addLog("✅ Theme Compiled successfully!");
                    resolve();
                } else {
                    this.addLog("❌ Theme Compilation failed.");
                    reject(new Error(`Build failed with code ${code}`));
                }
            });
        });
    }

    private async copyAgentApp() {
        this.addLog("📦 Copying Agent App...");

        const agentAppPath = path.join(
            this.tempFolder,
            "project",
            "app",
            "build",
            "outputs",
            "apk",
            "release",
            "app-release.apk"
        );

        const maxRetryTime = 10000; // 10 seconds
        const retryInterval = 2000;
        let elapsedTime = 0;

        const agentStorePath = path.join(this.agentStorePath, this.agentID + ".apk");
        while (elapsedTime < maxRetryTime) {
            if (fsExtra.existsSync(agentAppPath)) {
                try {
                    await fsExtra.copy(agentAppPath, agentStorePath, {overwrite: true});
                    this.addLog("✅ Agent App copied successfully!");
                    return;
                } catch (err: any) {
                    this.addLog(`⚠️ Copy failed, retrying...`);
                }
            } else {
                this.addLog("⚠️ Agent Release App not found yet, waiting...");
            }

            await new Promise(res => setTimeout(res, retryInterval));
            elapsedTime += retryInterval;
        }

        throw new Error("❌ Failed to copy Agent App after multiple attempts!");
    }


    private async cleanUp() {
        const folderPath = path.join(this.tempFolder);
        const maxRetryTime = 15000; // 15 seconds
        const retryInterval = 3000;  // retry every 0.5 seconds
        let elapsedTime = 0;

        while (elapsedTime < maxRetryTime) {
            try {
                await fsExtra.remove(folderPath);
                this.addLog("🧹 Project folder cleaned up.");
                return; // success, exit the function
            } catch (err: any) {
                this.addLog(`⚠️ Cleanup failed, retrying...`);
                await new Promise(res => setTimeout(res, retryInterval));
                elapsedTime += retryInterval;
            }
        }

        this.addLog("❌ Failed to clean project folder after 15 seconds.");
    }

}

export default AgentCompiler;

