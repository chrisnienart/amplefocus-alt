import dotenv from "dotenv"
import esbuild from "esbuild"

dotenv.config();

async function build() {
    try {
        const result = await esbuild.build({
            entryPoints: [`lib/plugin.js`],
            bundle: true,
            format: "iife",
            outfile: "build/compiled.js",
            packages: "external",
            platform: "node",
            write: true,
        });
        console.log("Build result", result);
    } catch (error) {
        console.error("Build failed:", error);
        process.exit(1);
    }
}

build();