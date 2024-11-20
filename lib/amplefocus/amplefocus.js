import {
  _appendToNote,  _getSessionSubHeading,  _insertSessionOverview,  _sectionContent,  _writeEndTime,
  appendCycle, appendToCycleHeading, appendToHeading, appendToSession, getCycleTarget,  markAddress,
    sessionNoteUUID
} from "./logWriter.js"
import {
  _appendToTopTableCell, _editTopTableCell, _ensureDashboardNote, _getTopTableCell,
  _isTaskRunning, _logStartTime, _readDashboard, _stopTask, writeDashboard
} from "../ampletime/dashboard.js";
import {_formatAsTime, _getCurrentTime, _getISOStringFromDate} from "../ampletime/date-time.js";
import {_formatNoteLink, _makeNoteLink} from "../markdown.js";
import {_promptCompletionEnergyMorale} from "./prompts.js"
import {_cancellableSleep} from "../sleeps.js"

let state;
export function changeState(newState) {
  console.log(`STATE: ${state} => ${newState}`);
  state = newState;
}
export let endTime;
export let currentSessionCycle;
export let sessionCycleCount;
export let sessionStartTime;
export let sessionEndTime;
export let sleepUntil;
export let status;
export let energyValues = [];
export let moraleValues = [];
export let completionValues = [];
export function pauseSession() {
  changeState("PAUSED");
}
export function cancelSession() {
  changeState("NEW");
}
let timerController;
let signal;
export async function stopTimers() {
  if (state !== "RUNNING") {
    console.log("Nothing to stop.");
    return;
  }
  timerController.abort();
}
export function setSignal(newSignal) {
  signal = newSignal;
}
export let runningCriticalCode;
let markSafeToExit;
let starting;
let markStarted;
function markStopped() {
  starting = new Promise((resolve) => {
    markStarted = () => {
      changeState("RUNNING");
      resolve();
    };
  });
}
export function initAmplefocus(app, options) {
  moraleValues = [];
  energyValues = [];
  completionValues = [];
  changeState("NEW");
  timerController = new AbortController();
  runningCriticalCode = new Promise((resolve) => {
    markSafeToExit = () => {
      changeState("SAFE");
      resolve();
    };
  });
  for (let pair of Object.entries(options.settings)) {
    let setting = pair[0];
    let option = pair[1];
    if (app.settings[setting] && setting.includes("duration")) {
      options[option] = app.settings[setting] * 60 * 1e3;
      console.log("convert duration to ms", option, options[option]);
    } else if (app.settings[setting] && setting.includes("boolean")) {
      options[option] = (app.settings[setting] === 'true');
      console.log("convert loadNoteText to boolean", option, options[option]);
    } else {
      options[option] = app.settings[setting];
    }
  }
  markStopped();
}
export async function _preStart(app, options, handlePastCycles) {
  let dash = await _ensureDashboardNote(app, options);
  let isSessionRunning = await _isTaskRunning(app, dash);
  if (isSessionRunning) {
    console.log(`Task running: ${isSessionRunning}`);
    if (options.alwaysStopRunningTask) {
      console.log(`Stopping current task...`);
      await _stopTask(app, dash, options);
      return dash;
    }
    let result = await app.prompt(
      `The previous session was not completed. Abandon it or continue where you left off?`,
      {
        inputs: [
          {
            type: "radio",
            options: [
              { label: "Abandon previous session", value: "abandon" },
              { label: "Pick up where you left off", value: "resume" },
              { label: "Abort", value: "abort" }
            ],
            value: "resume"
          }
        ]
      }
    );
    if (result === "resume") {
      if (options.loadNoteText) {
        await _appendToNote(app, "");
      }
      sessionCycleCount = isSessionRunning["Cycle Count"];
      sessionStartTime = new Date(isSessionRunning["Start Time"]);
      sessionEndTime = _calculateEndTime(options, sessionStartTime, sessionCycleCount).endTime;
      let oldStartTime = new Date(isSessionRunning["Start Time"]);
      if (_calculateEndTime(options, oldStartTime, isSessionRunning["Cycle Count"]).endTime > _getCurrentTime()) {
        console.log("Continuing previous uncompleted session.");
        await _startSession(
          app,
          options,
          dash,
          oldStartTime,
          Number(isSessionRunning["Cycle Count"]),
          Number(isSessionRunning["Cycle Progress"]) + 1,
          true,
          handlePastCycles
        );
      } else {
        console.warn("Session end time is in the past, cancelling...");
        await _startSession(
          app,
          options,
          dash,
          oldStartTime,
          Number(isSessionRunning["Cycle Count"]),
          Number(isSessionRunning["Cycle Count"]) + 1,
          true,
          handlePastCycles
        );
      }
      return false;
    } else if (result === "abandon") {
      console.log(`Stopping current task...`);
      await _stopTask(app, dash, options);
      return dash;
    } else {
      console.log(`Aborting...`);
      return false;
    }
  } else {
    return dash;
  }
}
export async function _focus(app, options, dash, startTime, cycleCount, handlePastCycles = false) {
  sessionCycleCount = cycleCount;
  sessionStartTime = startTime;
  sessionEndTime = _calculateEndTime(options, startTime, cycleCount).endTime;
  const newRow = {
    // "Session ID": Math.max(dash.map(e => e["Session ID"])) + 1,
    "Source Note": _makeNoteLink(await app.findNote({ uuid: app.context.noteUUID })),
    "Start Time": _getISOStringFromDate(startTime),
    "Cycle Count": cycleCount,
    "Cycle Progress": 0,
    "Completion Logs": "",
    "Energy Logs": "",
    "Morale Logs": "",
    "End Time": ""
  };
  console.log("NEWROW", newRow);
  await _logStartTime(app, dash, newRow, options);
  let sessionHeadingText = await _makeSessionHeading(app, startTime, cycleCount);
  markAddress(sessionHeadingText, app.context.noteUUID);
  if (options.loadNoteText) {
    await _insertSessionOverview(app, options, sessionHeadingText);
  }
  await _startSession(app, options, dash, startTime, Number(cycleCount), 1, false, handlePastCycles);
  markSafeToExit();
}
export async function findSessionHeadingName(startTime, app) {
  let hoursMinutes = _getISOStringFromDate(startTime).slice(11, 16);
  let note = await app.findNote({ uuid: app.context.noteUUID });
  let sections = await app.getNoteSections(note);
  let sessionHeading2 = sections.filter(
    (section) => section?.heading?.text.includes(`[${hoursMinutes}`)
  );
  if (sessionHeading2.length === 0) {
    throw "Could not find a section in the current note that corresponds to the currently unfinished session.";
  }
  return sessionHeading2[0].heading.text;
}
export async function _startSession(app, options, dash, startTime, cycles, firstCycle, resume = false, handlePastCycles = false) {
  console.log("Starting focus cycle...");
  if (!firstCycle)
    firstCycle = 1;
  let sessionHeadingName, workEndTime, breakEndTime, prompt, firstCycleStartTime;
  firstCycleStartTime = _calculateEndTime(options, startTime, firstCycle - 1).endTime;
  if (resume) {
    sessionHeadingName = await findSessionHeadingName(startTime, app);
    markAddress(sessionHeadingName, app.context.noteUUID);
    console.log("Found existing heading", sessionHeadingName);
    prompt = false;
  } else {
    sessionHeadingName = await _makeSessionHeading(app, startTime, cycles);
    sessionHeadingName = sessionHeadingName.slice(2);
    console.log("Created new session heading", sessionHeadingName);
    prompt = true;
    status = "Waiting for session to start...";
  }
  workEndTime = /* @__PURE__ */ new Date();
  breakEndTime = firstCycleStartTime;
  console.log("Work end time", workEndTime);
  console.log(`firstCycle: ${firstCycle}, cycles: ${cycles}`, firstCycle, cycles);
  for (let currentCycle = firstCycle - 1; currentCycle <= cycles; currentCycle++) {
    currentSessionCycle = currentCycle;
    console.log("Cycle loop", currentCycle);
    try {
      await _handleWorkPhase(app, workEndTime, currentCycle);
    } catch (error) {
      if (handleAbortSignal(error))
        break;
    }
    if (currentCycle >= 1)
      status = "Take a break...";
    try {
      if (currentCycle >= firstCycle) {
        prompt = true;
      }
      if (options.loadNoteText) {
        await _handleBreakPhase(app, options, dash, breakEndTime, currentCycle, cycles, handlePastCycles, prompt);
      }
    } catch (error) {
      if (handleAbortSignal(error))
        break;
    }
    status = "Working...";
    workEndTime = new Date(breakEndTime.getTime() + options.workDuration);
    breakEndTime = new Date(workEndTime.getTime() + options.breakDuration);
    if (timerController.signal.aborted) {
      timerController = new AbortController();
    }
  }
  status = "Session finished. \u{1F389}";
  if (state !== "PAUSED") {
    await _writeEndTime(app, options, dash);
  } else {
    status = "Session paused...";
  }
}
export async function _makeSessionHeading(app, startTime, cycleCount) {
  const timestamp = startTime.toLocaleTimeString(
    void 0,
    { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }
  );
  const focusNote = await _getFocusNote(app);
  const focusNoteLink = _formatNoteLink(focusNote.name, focusNote.uuid);
  return `# **\\[${timestamp}\\]** ${focusNoteLink} for ${cycleCount} cycles`;
}
export async function _getFocusNote(app) {
  const focusNotes = await app.filterNotes({ tag: "plugins/amplefocus-alt/focus" });
  let focusNote;
  if (focusNotes.length > 0) {
    focusNote = focusNotes[0];
  } else {
    let focusNoteUUID = await app.createNote("Focus", ["plugins/amplefocus-alt/focus"]);
    focusNote = await app.findNote({ uuid: focusNoteUUID });
  }
  return focusNote;
}
export function _calculateEndTime(options, startTime, cycles) {
  console.log("Calculating end time for given start time and cycles...");
  const totalTime = (options.workDuration + options.breakDuration) * cycles;
  const endTime = new Date(startTime.getTime() + totalTime);
  const totalMinutes = Math.floor(totalTime / 6e4) % 60;
  const totalHours = Math.floor(totalTime / 36e5);
  console.log("Start time:", new Date(startTime));
  console.log("Cycles:", cycles);
  console.log("End time calculated:", _formatAsTime(endTime));
  console.log("Total hours:", totalHours);
  console.log("Total minutes:", totalMinutes);
  return { endTime, totalHours, totalMinutes };
}
export function handleAbortSignal(error) {
  if (error.name === "AbortError") {
    if (signal === "cancel") {
      console.log("Session canceled");
      status = "Session cancelled";
      return true;
    } else if (signal === "pause") {
      console.log("Session paused");
      status = "Session paused";
      return true;
    } else if (signal === "end-cycle") {
      console.log("Cycle ended early");
      return false;
    }
  } else {
    throw error;
  }
}
export async function _handleWorkPhase(app, workEndTime, cycleIndex) {
  console.log(`Cycle ${cycleIndex}: Starting work phase...`);
  try {
    await _sleepUntil(app, workEndTime, true);
  } catch (error) {
    throw error;
  }
}
export async function _getPastCycleTarget(app, currentCycle, options) {
  let noteContent = await app.getNoteContent({ uuid: sessionNoteUUID });
  let cycleTarget = await _getSessionSubHeading(app, `Cycle ${currentCycle}`);
  let headingContent = await _sectionContent(noteContent, cycleTarget);
  return getCycleTarget(options, headingContent);
}
export async function _promptCycleEndMetrics(options, app, currentCycle) {
  let completion, energy, morale, cycleTarget;
  if (currentCycle >= 1) {
    cycleTarget = await _getPastCycleTarget(app, currentCycle, options);
    [completion, energy, morale] = await _promptCompletionEnergyMorale(
      app,
      "Work phase completed. Did you complete the target for this cycle?",
      cycleTarget
      // We display the user's goal for the cycle in the prompt so that they don't need to check manually
    );
  } else {
    [completion, energy, morale] = await _promptCompletionEnergyMorale(
      app,
      "Before you start, take a minute to plan your session.\nHow are your energy and morale levels right now?"
    );
    completion = null;
  }
  if (completion === true) {
    completion = 1;
  } else if (completion === false) {
    completion = -1;
  }
  return [completion, energy, morale];
}
export async function _logDashboardCycleEndMetrics(app, dash, energy, morale, completion, options) {
  let tableDict = await _readDashboard(app, dash);
  tableDict = await _appendToTopTableCell(tableDict, "Energy Logs", energy);
  tableDict = await _appendToTopTableCell(tableDict, "Morale Logs", morale);
  tableDict = await _appendToTopTableCell(tableDict, "Completion Logs", completion);
  energyValues = _getTopTableCell(tableDict, "Energy Logs").split(",");
  moraleValues = _getTopTableCell(tableDict, "Morale Logs").split(",");
  completionValues = _getTopTableCell(tableDict, "Completion Logs").split(",");
  await writeDashboard(app, options, dash, tableDict);
}
export async function _handleNextCycleStart(app, nextCycle, options) {
  await appendCycle(app, `Cycle ${nextCycle}`);
  let content = [`- Cycle start:`];
  for (let question of options.cycleStartQuestions) {
    content.push(`  - ${question}`);
  }
  content = content.join("\n");
  await appendToCycleHeading(app, `Cycle ${nextCycle}`, `
${content}`);
}
export async function _handleSessionDebrief(app, options) {
  await appendToSession(app, `
## Session debrief`);
  let content = [];
  for (let question of options.finalQuestions) {
    content.push(`- ${question}`);
  }
  content = content.join("\n");
  await appendToHeading(app, "Session debrief", content);
}
export async function _logDashboardCycleProgress(app, dash, currentCycle, options) {
  let dashTable = await _readDashboard(app, dash);
  dashTable = _editTopTableCell(dashTable, "Cycle Progress", currentCycle);
  await writeDashboard(app, options, dash, dashTable);
}
export async function _handleCycleEndJotEntry(options, app, currentCycle) {
  let content = [`- Cycle debrief:`];
  for (let question of options.cycleEndQuestions) {
    content.push(`  - ${question}`);
  }
  content = content.join("\n");
  await appendToCycleHeading(app, `Cycle ${currentCycle}`, `
${content}`);
}
export async function _logJotPreviousAndNextCycleQuestions(previousCycle, app, dash, options, cycles, currentCycle) {
  if (previousCycle >= 1) {
    await _handleCycleEndJotEntry(options, app, previousCycle);
  }
  if (previousCycle < cycles && options.loadNoteText) {
    await _handleNextCycleStart(app, currentCycle, options);
  }
}
export async function _handleBreakPhase(app, options, dash, breakEndTime, cycleIndex, cycles, handlePastCycles = false, prompt = true) {
  let previousCycle, currentCycle, energy, morale, completion;
  let currentTime = _getCurrentTime();
  previousCycle = cycleIndex;
  currentCycle = cycleIndex + 1;
  await _logDashboardCycleProgress(app, dash, previousCycle, options);
  let currentCycleEndTime = new Date(breakEndTime.getTime() + options.workDuration);
  if (currentCycleEndTime > currentTime || handlePastCycles) {
    if (prompt) {
      if (options.loadNoteText) {
        await _logJotPreviousAndNextCycleQuestions(previousCycle, app, dash, options, cycles, currentCycle);
      }
      [completion, energy, morale] = await _promptCycleEndMetrics(options, app, previousCycle);
      await _logDashboardCycleEndMetrics(app, dash, energy, morale, completion, options);
    }
  } else {
    await _logDashboardCycleEndMetrics(app, dash, null, null, null, options);
  }
  if (previousCycle === cycles) {
    if (options.loadNoteText) {
      await _handleSessionDebrief(app, options);
    }
    await _sleepUntil(app, /* @__PURE__ */ new Date());
    console.log(`Session complete.`);
    app.alert(`Session complete. Debrief and relax.`);
  }
  if (breakEndTime <= currentTime) {
    return;
  }
  if (previousCycle < cycles) {
    console.log(`Cycle ${previousCycle}: Starting break phase...`);
    try {
      await _sleepUntil(app, breakEndTime);
    } catch (error) {
      throw error;
    }
    app.alert(`Cycle ${previousCycle}: Break phase completed. Start working!`);
    console.log(`Cycle ${previousCycle}: Break phase completed.`);
  }
}
export async function _sleepUntil(app, endTime, bell = false) {
  console.log(`Sleeping until ${endTime}...`);
  app.openSidebarEmbed(0.66, {
    ampletime: { project: null },
    amplefocus: {
      sleepUntil: endTime,
      currentCycle: currentSessionCycle,
      cycleCount: sessionCycleCount,
      sessionEnd: sessionEndTime,
      status,
      moraleValues,
      energyValues,
      completionValues
    }
  });
  const sleepTime = endTime.getTime() - _getCurrentTime().getTime();
  sleepUntil = endTime;
  await _cancellableSleep(sleepTime, markStopped, markStarted, timerController, bell);
}

