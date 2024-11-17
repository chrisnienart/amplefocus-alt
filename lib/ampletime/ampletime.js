import {_ensureDashboardNote, _logStartTime, _stopTask, _isTaskRunning} from "./dashboard.js";
import {_getTaskDistribution, _getTaskDurations} from "./tasks.js";
import {_entryFromRow, _getEntryName} from "./entries.js";
import {_makeNoteLink} from "../markdown.js";
import {_getCurrentTimeFormatted, _getFormattedDate} from "./date-time.js";
import {_generateDurationsReport, _generateQuadrantReport} from "./reports.js";

export async function _preStart2(app, options) {
  console.log("_preStart()");
  let dash = await _ensureDashboardNote(app, options);
  let isTaskRunning = await _isTaskRunning(app, dash);
  console.log(`Task running: ${isTaskRunning}`);
  if (isTaskRunning) {
    let runningTaskName = _getEntryName(_entryFromRow(isTaskRunning));
    if (options.alwaysStopRunningTask) {
      await _stopTask(app, dash, options);
    } else {
      let result = await app.prompt(
        `${runningTaskName} is already running. Would you like to stop it first?`,
        {
          inputs: [
            {
              type: "radio",
              options: [
                { label: "Stop current task", value: true },
                { label: "Keep current task (and cancel)", value: false }
              ]
            }
          ]
        }
      );
      if (!result) {
        console.log("Cancelling...");
        return;
      }
      console.log(`Stopping current task...`);
      await _stopTask(app, dash, options);
    }
  }
  return dash;
}

export async function _start(app, options, target) {
  let dash = await _preStart2(app, options);
  if (!dash)
    return;
  let toStart;
  if (target.score !== void 0) {
    let source = await app.findNote({ uuid: target.noteUUID });
    toStart = {
      type: "task",
      data: {
        projectName: _makeNoteLink(source),
        taskName: `${target.content.slice(0, 20)} (${target.uuid})`
      }
    };
  } else {
    toStart = {
      type: "project",
      data: {
        projectName: _makeNoteLink(target),
        taskName: ""
      }
    };
  }
  console.log(`Starting ${toStart.type} ${_getEntryName(toStart)}...`);
  let startDate = /* @__PURE__ */ new Date();
  startDate.setHours(0, 0, 0, 0);
  let endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);
  let runningTaskDuration = await _getTaskDurations(
    app,
    dash,
    toStart,
    startDate,
    endDate
  );
  if (runningTaskDuration.length === 0)
    runningTaskDuration = [{ "Duration": "00:00:00" }];
  let alertAction = await app.alert(
    `${toStart.data.taskName ? toStart.data.taskName : target.name} started successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`,
    {
      actions: [{ label: "Visit Dashboard", icon: "assignment" }]
    }
  );
  if (alertAction === 0) {
    app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
  }
  let currentTime = _getCurrentTimeFormatted();
  const newRow = {
    "Project Name": toStart.data.projectName,
    "Task Name": toStart.data.taskName,
    "Start Time": currentTime,
    "End Time": ""
  };
  await _logStartTime(app, dash, newRow, options);
  console.log(`${target.name} started successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`);
  return true;
}

export async function _stop(app, options) {
  console.log(`_stop(app)`);
  let dash = await _ensureDashboardNote(app, options);
  let isTaskRunning = await _isTaskRunning(app, dash);
  if (!isTaskRunning) {
    console.log("No task is running at the moment.");
    await app.alert(`No task is running at the moment.`);
    return;
  }
  console.log(`Stopping current task...`);
  await _stopTask(app, dash, options);
  let startDate = /* @__PURE__ */ new Date();
  startDate.setHours(0, 0, 0, 0);
  let endDate = new Date(startDate);
  endDate.setHours(23, 59, 59, 999);
  isTaskRunning = _entryFromRow(isTaskRunning);
  let runningTaskDuration = await _getTaskDurations(app, dash, isTaskRunning, startDate, endDate);
  let alertAction = await app.alert(
    `${_getEntryName(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`,
    {
      actions: [{ label: "Visit Dashboard", icon: "assignment" }]
    }
  );
  if (alertAction === 0) {
    app.navigate(`https://www.amplenote.com/notes/${dash.uuid}`);
  }
  console.log(`${_getEntryName(isTaskRunning)} stopped successfully. Logged today: ${runningTaskDuration[0]["Duration"]}`);
  return true;
}

export async function _generateReport(app, options, reportType) {
  console.log(`_generateReport(), reportType: ${reportType}`);
  let startOfDay = /* @__PURE__ */ new Date();
  let endOfDay = /* @__PURE__ */ new Date();
  let reportTitle = options.noteTitleReportDaily;
  let reportParentTag = options.noteTagReports;
  let reportTag = `${reportParentTag}/daily`;
  let dash = await _ensureDashboardNote(app, options);
  if (reportType === "yesterday") {
    startOfDay.setDate(startOfDay.getDate() - 1);
  } else if (reportType === "this week") {
    let day = startOfDay.getDay();
    let difference = (day < 1 ? -6 : 1) - day;
    startOfDay.setDate(startOfDay.getDate() + difference);
    reportTitle = options.noteTitleReportWeekly;
    reportTag = `${reportParentTag}/weekly`;
  } else if (reportType === "last week") {
    let day = startOfDay.getDay();
    let difference = (day < 1 ? -6 : 1) - day;
    startOfDay.setDate(startOfDay.getDate() + difference - 7);
    endOfDay = new Date(startOfDay.getTime());
    endOfDay.setDate(endOfDay.getDate() + 6);
    reportTitle = options.noteTitleReportWeekly;
    reportTag = `${reportParentTag}/weekly`;
  } else if (reportType === "this month") {
    startOfDay.setDate(1);
    reportTitle = options.noteTitleReportMonthly;
    reportTag = `${reportParentTag}/monthly`;
  } else if (reportType === "last month") {
    startOfDay.setMonth(startOfDay.getMonth() - 1);
    startOfDay.setDate(1);
    endOfDay.setDate(1);
    endOfDay.setDate(endOfDay.getDate() - 1);
    reportTitle = options.noteTitleReportMonthly;
    reportTag = `${reportParentTag}/monthly`;
  }
  startOfDay.setHours(0, 0, 0, 0);
  endOfDay.setHours(23, 59, 59, 999);
  reportTitle = `${reportTitle} ${_getFormattedDate(startOfDay)}`;
  let resultsUUID = await app.createNote(`${reportTitle}`, [reportTag]);
  let resultsHandle = await app.findNote({ uuid: resultsUUID });
  console.log(`Created results note with UUID ${resultsUUID}`);
  let taskDurations = await _getTaskDurations(app, dash, null, startOfDay, endOfDay);
  if (taskDurations.length === 0) {
    console.log(`Nothing logged ${reportType}.`);
    await app.alert(`Nothing logged ${reportType}.`);
    return;
  }
  await _generateDurationsReport(app, options, resultsHandle, taskDurations);
  let taskDistribution = await _getTaskDistribution(app, dash, null, startOfDay, endOfDay);
  await _generateQuadrantReport(app, resultsHandle, taskDistribution, options);
  let alertAction = await app.alert(
    `Daily report generated successfully!`,
    {
      actions: [{ label: "Visit Report", icon: "donut_small" }]
    }
  );
  if (alertAction === 0) {
    app.navigate(`https://www.amplenote.com/notes/${resultsHandle.uuid}`);
  }
  console.log(`Success!`);
  return true;
}

export async function _promptTarget(app) {
  return await app.prompt(
    "What are you working on?",
    {
      inputs: [
        { type: "note", label: "Choose a note" }
      ]
    }
  );
}

export async function _loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

