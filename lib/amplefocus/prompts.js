import {_formatAsTime, _getCurrentTime} from "../ampletime/date-time.js";
import {_calculateEndTime} from "./amplefocus.js";

export function _generateStartTimeOptions() {
  console.log("Generating start time options...");
  const options = [];
  const now = _getCurrentTime();
  const currentMinutes = now.getMinutes();
  const multipleMinutes = 5
  const roundedMinutes = Math.floor(currentMinutes / multipleMinutes) * multipleMinutes;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  for (let offset = 0; offset <= 5 * multipleMinutes; offset += multipleMinutes) {
    const time = new Date(now.getTime() + offset * 60 * 1e3);
    const label = _formatAsTime(time);
    const value = time;
    options.push({ label, value });
  }
  console.log("Start time options generated.");
  console.log(JSON.stringify(options));
  return options;
}

export async function _promptStartTime(app) {
  const startTimeOptions = _generateStartTimeOptions();
  let result = await app.prompt("When would you like to start? Choose the time of the first work cycle.", {
    inputs: [
      {
        label: "Start Time",
        type: "select",
        options: startTimeOptions,
        value: startTimeOptions[1].value
      }
    ]
  });
  if (result === -1 || result === null)
    return startTimeOptions[0].value;
  return new Date(result);
}

export function _generateCycleOptions(startTime, options) {
  console.log("Generating cycle options...");
  const cycleOptions = [];
  for (let cycles = 1; cycles <= 8; cycles++) {
    const { endTime, totalHours, totalMinutes } = _calculateEndTime(options, startTime, cycles);
    const label = `${cycles} cycles (${totalHours} hours ${totalMinutes} minutes, until ${_formatAsTime(endTime)})`;
    cycleOptions.push({ label, value: cycles });
  }
  console.log("Cycle options generated.");
  return cycleOptions;
}

export async function _promptCycleCount(app, options, startTimeValue) {
  const startTime = startTimeValue;
  console.log("Start time selected:", _formatAsTime(startTime));
  const cycleOptions = _generateCycleOptions(startTime, options);
  let result = await app.prompt(
    "How long should this session be? Choose the number of cycles you want to focus for.",
    {
      inputs: [
        {
          label: "Number of Cycles",
          type: "select",
          options: cycleOptions,
          value: 1
        }
      ]
    }
  );
  if (result === -1 || result === null)
    throw new Error("Number of cycles not selected. Cannot proceed.");
  return result;
}

export async function _promptCompletionEnergyMorale(app, message, promptCompletion) {
  let promptInput = [];
  if (promptCompletion) {
    promptInput.push({
      label: promptCompletion,
      type: "checkbox"
    });
  }
  promptInput.push({
    label: "Energy (how are you feeling physically?)",
    type: "select",
    options: [
      { label: "Low", value: -1 },
      { label: "Medium", value: 0 },
      { label: "High", value: 1 }
    ],
    value: null
  });
  promptInput.push({
    label: "Morale (how are you feeling mentally, with respect to the work?)",
    type: "select",
    options: [
      { label: "Low", value: -1 },
      { label: "Medium", value: 0 },
      { label: "High", value: 1 }
    ],
    value: null
  });
  let result = await app.prompt(
    message,
    {
      inputs: promptInput
    }
  );
  let completion, energy, morale;
  if (result === null) {
    completion = null;
    energy = null;
    morale = null;
  } else if (result.length === 3) {
    completion = null;
    [energy, morale] = result;
  } else if (result.length === 4) {
    [completion, energy, morale] = result;
  }
  return [completion, energy, morale];
}

export async function _promptInput(app, options) {
  const startTime = await _promptStartTime(app);
  if (!startTime) {
    return;
  }
  const cycleCount = await _promptCycleCount(app, options, startTime);
  if (!cycleCount) {
    return;
  }
  return [startTime, cycleCount];
}

export async function _promptCustomizeSettingBySession(app, options, forcePrompt = false) {
  if (!forcePrompt) {
    // Use app.settings[setting] instead of options
    if (!app.settings["Customize setting by session (boolean: true/false)"]) {
      console.log("Using default settings");
      return;
    }
  }

  //modify the prompt input to be based on app.settings dynamically

  let promptInput = [];
  promptInput.push({
    label: "Customize settings",
    type: "checkbox",
    value: app.settings["Customize setting by session (boolean: true/false)"] === "true"
  });
  promptInput.push({
    label: "Load note text",
    type: "checkbox",
    value: app.settings["Load note text (boolean: true/false)"] === "true"
  });
  promptInput.push({
    label: "Work Duration (in minutes)",
    type: "string",
    value: app.settings["Work phase duration (number: in minutes)"]
  });
  promptInput.push({
    label: "Break Duration (in minutes)",
    type: "string",
    value: app.settings["Break phase duration (number: in minutes)"]
  });
  promptInput.push({
    label: "End Cycle Warning Duration (in minutes)",
    type: "string",
    value: app.settings["End cycle warning duration (number: in minutes)"]
  });
  let result = await app.prompt(
      "Update session settings",
      {
        inputs: promptInput
      }
  );
  if (result === null) {
    return;
  } else {
    options.customizeSettingsBySession = result[0];
    options.loadNoteText = result[1];
    options.workDuration = result[2] * 60 * 1e3;
    options.breakDuration = result[3] * 60 * 1e3;
    options.endCycleWarningDuration = result[4] * 60 * 1e3;
    console.log("Customize setting by session (boolean: true/false)", options.customizeSettingsBySession);
    console.log("Load note text (boolean: true/false)", options.loadNoteText);
    console.log("Work phase duration (number: in minutes)", options.workDuration);
    console.log("Break phase duration (number: in minutes)", options.breakDuration);
    console.log("End cycle warning duration (number: in minutes)", options.endCycleWarningDuration);
  }
}