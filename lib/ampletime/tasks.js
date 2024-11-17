import {_readDashboard} from "./dashboard.js";
import {_addDurations, _calculateDuration, _durationToSeconds} from "./date-time.js";
import {_entryFromRow, _getEntryName} from "./entries.js";

export async function _getTaskDistribution(app, dash, target, startDate, endDate) {
  console.log(`_getTaskDistribution()`);
  let tableDict = await _readDashboard(app, dash);
  console.log(tableDict);
  let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
  console.log(entries);
  if (!entries)
    return;
  entries = entries.filter((item) => item["Task Name"]);
  let taskDistribution = { "q1": [], "q2": [], "q3": [], "q4": [] };
  for (let entry of entries) {
    let matches = entry["Task Name"].match(/\(([a-zA-Z0-9-]+?)\)/gm);
    let taskUUID = matches[matches.length - 1];
    taskUUID = taskUUID.slice(1, taskUUID.length - 1);
    let task = await app.getTask(taskUUID);
    if (task.urgent && task.important)
      taskDistribution.q1.push(entry);
    else if (!task.urgent && task.important)
      taskDistribution.q2.push(entry);
    else if (task.urgent && !task.important)
      taskDistribution.q3.push(entry);
    else if (!task.urgent && !task.important)
      taskDistribution.q4.push(entry);
  }
  for (let key of Object.keys(taskDistribution)) {
    let durations = await _calculateTaskDurations(taskDistribution[key]);
    let sum = durations.reduce((pv, cv) => _addDurations(pv, cv["Duration"]), "00:00:00");
    taskDistribution[key] = {
      count: taskDistribution[key].length,
      duration: _durationToSeconds(sum) / 60 / 60
    };
  }
  return taskDistribution;
}

export async function _getTaskDurations(app, dash, target, startDate, endDate) {
  console.log(`_getTaskDurations(app, ${_getEntryName(target)}, ${startDate}, ${endDate})`);
  let tableDict = await _readDashboard(app, dash);
  console.log(tableDict);
  let entries = _getEntriesWithinDates(tableDict, target, startDate, endDate);
  console.log(entries);
  if (!entries)
    return;
  let taskDurations = await _calculateTaskDurations(entries);
  console.log(taskDurations);
  return taskDurations;
}

export function _getEntriesWithinDates(tableDict, target, startDate, endDate) {
  console.log(`_getEntriesWithinDates(${tableDict}, ${_getEntryName(target)}, ${startDate}, ${endDate}`);
  let entries = tableDict.filter((row) => {
    let endTime = new Date(row["End Time"]);
    console.log(new Date(row["End Time"]));
    return endTime >= startDate && endTime <= endDate;
  });
  if (target)
    entries = entries.filter((row) => {
      return row["Project Name"] === target.data.projectName && row["Task Name"] === target.data.taskName;
    });
  return entries;
}

export async function _calculateTaskDurations(entries, type = "Project") {
  console.log(`_calculateTaskDurations(${entries})`);
  let taskDurations = {};
  entries.forEach((entry) => {
    let targetName;
    if (type === "Project")
      targetName = entry["Project Name"];
    else if (type === "Task")
      targetName = _getEntryName(_entryFromRow(entry));
    else
      return [];
    let duration = _calculateDuration(entry["Start Time"], entry["End Time"]);
    if (targetName in taskDurations) {
      taskDurations[targetName] = _addDurations(taskDurations[targetName], duration);
    } else {
      taskDurations[targetName] = duration;
    }
  });
  let sortedTasks = Object.entries(taskDurations).sort((a, b) => {
    let aDurationInSeconds = _durationToSeconds(a[1]);
    let bDurationInSeconds = _durationToSeconds(b[1]);
    return bDurationInSeconds - aDurationInSeconds;
  });
  return sortedTasks.map((task) => {
    return {
      "Entry Name": task[0],
      "Duration": task[1]
    };
  });
}