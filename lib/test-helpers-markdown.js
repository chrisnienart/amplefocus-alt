export function stripMarkdownFormatting(markdown) {
  let plainText = markdown.replace(/(\*\*|__)(.*?)\1/g, "$2");
  plainText = plainText.replace(/(\*|_)(.*?)\1/g, "$2");
  plainText = plainText.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
  plainText = plainText.replace(/`([^`]+)`/g, "$1");
  plainText = plainText.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");
  plainText = plainText.replace(/^#{1,6}\s*/gm, "");
  plainText = plainText.replace(/^-{3,}$/gm, "");
  plainText = plainText.replace(/^\s*>+\s?/gm, "");
  plainText = plainText.replace(/^\s*([-+*]|\d+\.)\s+/gm, "");
  plainText = plainText.replace(/```[\s\S]*?```/g, "");
  plainText = plainText.replace(/<\/?[^>]+(>|$)/g, "");
  plainText = plainText.replace(/\\\[([^\]]+?)\\\]/g, "[$1]");
  return plainText.trim();
}
export function _sectionRange(bodyContent, sectionHeadingText, headingIndex = 0) {
  console.debug(`_sectionRange`);
  const sectionRegex = /^#+\s*([^#\n\r]+)/gm;
  let indexes = Array.from(bodyContent.matchAll(sectionRegex));
  indexes = indexes.map((index) => {
    let newIndex = index;
    newIndex[1] = stripMarkdownFormatting(newIndex[1]);
    return newIndex;
  });
  let occurrenceCount = 0;
  const sectionMatch = indexes.find((m) => {
    if (m[1].trim() === sectionHeadingText.trim()) {
      if (occurrenceCount === headingIndex) {
        return true;
      }
      occurrenceCount++;
    }
    return false;
  });
  if (!sectionMatch) {
    console.error("Could not find section", sectionHeadingText, "that was looked up. This might be expected");
    return { startIndex: null, endIndex: null };
  } else {
    const level = sectionMatch[0].match(/^#+/)[0].length;
    const nextMatch = indexes.find((m) => m.index > sectionMatch.index && m[0].match(/^#+/)[0].length <= level);
    const endIndex = nextMatch ? nextMatch.index : bodyContent.length;
    return { startIndex: sectionMatch.index + sectionMatch[0].length + 1, endIndex };
  }
}