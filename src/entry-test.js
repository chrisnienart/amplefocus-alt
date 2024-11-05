import { inlineImportsFromGithub } from "lib/plugin-import-inliner"
import { multiLineDeclaration, wrappedFetch } from "./nested-import"

const plugin = {
  insertText: async function(app) {
    const entryPoint = {};
    const codeObject = "";
    // I will stay on line, promises CONSTANT_OBJECT and its buddy CONSTANT_ARRAY
    const inlineImports = await inlineImportsFromGithub(entryPoint, codeObject, [], []);
    wrappedFetch("https://gitclear.com", {});
    multiLineDeclaration("argument", { options: true, moreOptions: [] });
  }
}
