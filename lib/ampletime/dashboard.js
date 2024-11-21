import {_createTableHeader, _dictToMarkdownTable, _markdownTableToDict} from "../markdown.js";
import {_getCurrentTimeFormatted} from "./date-time.js";
import {_insertRowToDict} from "../data-structures.js";

export async function _ensureDashboardNote(app, options) {
  console.debug(`_ensureDashboardNote`);
  let dash = await app.findNote(
    { name: options.noteTitleDashboard, tags: [options.noteTagDashboard] }
  );
  if (!dash) {
    dash = await _createDashboardNote(
      app,
      options.noteTitleDashboard,
      options.noteTagDashboard
    );
  }
  const sections = await app.getNoteSections(dash);
  const timeEntriesSection = sections.find(
    (section) => section.heading && section.heading.text === options.sectionTitleDashboardEntries
  );
  if (!timeEntriesSection) {
    await app.insertNoteContent(
      dash,
      `## ${options.sectionTitleDashboardEntries}
`,
      { atEnd: true }
    );
    let tableHeader = await _createTableHeader(options.dashboardColumns);
    await app.insertNoteContent(dash, tableHeader, { atEnd: true });
  }
  return dash;
}

export async function _createDashboardNote(app, noteTitle, noteTag) {
  console.log(`_createDashboardNote(app, ${noteTitle}, ${noteTag}`);
  await app.createNote(noteTitle, [noteTag]);
  return await app.findNote({
    name: noteTitle,
    tags: [noteTag]
  });
}

export async function _isTaskRunning(app, dash) {
  const table = await _readDashboard(app, dash);
  if (!table)
    return false;
  const runningTask = table.find((row) => row["Start Time"] && !row["End Time"]);
  if (Boolean(runningTask))
    return runningTask;
  return false;
}

export async function _stopTask(app, dash, options) {
  let tableDict = await _readDashboard(app, dash);
  tableDict = _editTopTableCell(tableDict, "End Time", _getCurrentTimeFormatted());
  await writeDashboard(app, options, dash, tableDict);
  return true;
}

export function _editTopTableCell(tableDict, key, value) {
  tableDict[0][key] = value;
  return tableDict;
}

export function _appendToTopTableCell(tableDict, key, value) {
  let existing = _getTopTableCell(tableDict, key);
  if (!existing) {
    tableDict = _editTopTableCell(tableDict, key, `${value}`);
  } else {
    tableDict = _editTopTableCell(tableDict, key, existing + "," + value);
  }
  return tableDict;
}

export function _getTopTableCell(tableDict, key) {
  return tableDict[0][key];
}

export async function _readDashboard(app, dash) {
  let content = await app.getNoteContent(dash);
  return _markdownTableToDict(content);
}

export async function writeDashboard(app, options, dash, tableDict) {
  let updatedTableMarkdown = _dictToMarkdownTable(tableDict);
  const section = { heading: { text: options.sectionTitleDashboardEntries } };
  await app.replaceNoteContent(dash, updatedTableMarkdown, { section });
}

export async function _logStartTime(app, dash, newRow, options) {
  let tableDict = await _readDashboard(app, dash);
  tableDict = _insertRowToDict(tableDict, newRow);
  await writeDashboard(app, options, dash, tableDict);
  return true;
}

