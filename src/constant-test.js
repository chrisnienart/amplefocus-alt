import {
  CODE_HEADING,
  DEFAULT_BRANCH,
  MAX_REPLACE_CONTENT_LENGTH,
  ENTRY_LOCATIONS
} from "lib/plugin-constants"

const ENTRY_POINT = { hashie: "cooo", hootie: "hoo" };

const plugin = {
  insertText: async function(app) {
    const entryPoint = ENTRY_POINT;
    // I will stay on line, promises CONSTANT_OBJECT and its buddy CONSTANT_ARRAY
    const heading = CODE_HEADING;
    const branch = DEFAULT_BRANCH;
    const replaceLength = MAX_REPLACE_CONTENT_LENGTH;
    const locations = ENTRY_LOCATIONS;
  }
}
