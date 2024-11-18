import dotenv from "dotenv";
import esbuild from "esbuild";
import * as fs from 'fs';

dotenv.config();

async function build() {
    try {
        let result = await esbuild.build({
            entryPoints: [`lib/plugin.js`],
            bundle: true,
            format: "iife",
            outfile: "build/compiled.js",
            packages: "external",
            platform: "node",
            write: true,
        });

        // Modify the generated file to append "return plugin;"
        const outputPath = "build/compiled.js";
        const content = fs.readFileSync(outputPath, 'utf8');
        const modifiedContent = content.replace(/\s*}\)\(\);/, "\n  return plugin;\n})()");
        fs.writeFileSync(outputPath, modifiedContent);

        console.log("Build completed successfully");
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

build();