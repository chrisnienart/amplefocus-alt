import { fetchWithRetry } from "lib/plugin-import-inliner"

export async function wrappedFetch(url, options) {
  return fetchWithRetry(url, options)
}

export async function multiLineDeclaration(argument, { options = false,
    moreOptions = [] } = {}) {
  return moreOptions;
}
