import {_formatAsTime, _getCurrentTime} from "../ampletime/date-time.js";
import {_calculateEndTime} from "./amplefocus.js";

export function _generateStartTimeOptions(customOption = false) {
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
  if(customOption) {
    options.push({
      label: "Custom",
      value: "Custom"
    });
  }
  console.log("Start time options generated.");
  console.log(JSON.stringify(options));
  return options;
}

function parseCustomTime(value) {
  console.log("Parsing custom time input:", value);
  const [time, period] = value.split(/\s/);
  let [hours, minutes] = time.split(":").map(Number);
  
  // Convert to 24h format
  if (period?.toLowerCase() === "pm" && hours < 12) hours += 12;
  if (period?.toLowerCase() === "am" && hours === 12) hours = 0;
  
  // Create date using current day with custom time
  const customDate = new Date();
  customDate.setHours(hours);
  customDate.setMinutes(minutes);
  customDate.setSeconds(0);
  customDate.setMilliseconds(0);
  
  return customDate;
}

export async function _promptStartTime(app) {
  const startTimeOptions = _generateStartTimeOptions(true);
  const result = await app.prompt("When would you like to start? /n TO enter a time manually, choose \"custom\" in the dropdown and enter the time below in (HH:MM) format.", {
    inputs: [
      {
        label: "Select time", 
        type: "select",
        options: startTimeOptions,
        value: startTimeOptions[1].value
      },
      {
        label: "Manual entry",
        type: "string",
        placeholder: "Format: HH:MM (12h)",
        value: startTimeOptions[1].label
      }
    ]
  });

  if (result[0] === -1 || result[0] === null) return startTimeOptions[0].value;

  let startTime;
  if (result[0] === "Custom") {
    startTime = parseCustomTime(result[1]);
  } else {
    startTime = new Date(result[0]);
  }

  console.log(`Session start time set to: ${_formatAsTime(startTime)}`);
  return startTime;
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
  const result = await app.prompt(
    "Session length - choose cycles or enter custom (1-20):",
    {
      inputs: [
        {
          label: "Select from presets",
          type: "select",
          options: cycleOptions,
          value: 1
        },
        {
          label: "Or enter custom number",
          type: "number",
          placeholder: "1-20 cycles",
          min: 1,
          max: 20,
          required: false
        }
      ]
    }
  );

  if (result === -1 || result === null) 
    throw new Error("Number of cycles not selected. Cannot proceed.");

  // Validate custom input
  const customCycles = parseInt(result[1]);
  if (!isNaN(customCycles)) {
    return Math.min(20, Math.max(1, customCycles));
  }

  // Fallback to dropdown selection
  return result[0];
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
    if (app.settings["Customize setting by session (boolean: true/false)"] === "false") {
      console.log("Using default settings");
      return;
    }
  }
  let promptInput = [];
  let saveSettingsAsDefault = false;
  promptInput.push({
    label: "Save session settings as new default?",
    type: "checkbox",
    value: forcePrompt
  });
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
    saveSettingsAsDefault = result[0];
    options.customizeSettingsBySession = result[1];
    options.loadNoteText = result[2];
    options.workDuration = result[3] * 60 * 1e3;
    options.breakDuration = result[4] * 60 * 1e3;
    options.endCycleWarningDuration = result[5] * 60 * 1e3;
    if (saveSettingsAsDefault) {
      console.log("Saving session settings as new default...");
      await app.setSetting("Customize setting by session (boolean: true/false)", options.customizeSettingsBySession);
      await app.setSetting("Load note text (boolean: true/false)", options.loadNoteText);
      await app.setSetting("Work phase duration (number: in minutes)", options.workDuration / 60 / 1e3);
      await app.setSetting("Break phase duration (number: in minutes)", options.breakDuration / 60 / 1e3);
      await app.setSetting("End cycle warning duration (number: in minutes)", options.endCycleWarningDuration / 60 / 1e3);
    }
    console.log("Customize setting by session (boolean: true/false)", options.customizeSettingsBySession);
    console.log("Load note text (boolean: true/false)", options.loadNoteText);
    console.log("Work phase duration (number: in minutes)", options.workDuration / 60 / 1e3);
    console.log("Break phase duration (number: in minutes)", options.breakDuration / 60 / 1e3);
    console.log("End cycle warning duration (number: in minutes)", options.endCycleWarningDuration / 60 / 1e3);
  }
}
