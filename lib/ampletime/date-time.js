export function _getCurrentTimeFormatted() {
    return _getISOStringFromDate(_getCurrentTime());
}

export function _getCurrentTime() {
    const now = /* @__PURE__ */ new Date();
    return now;
}

export function _getISOStringFromDate(dateObject) {
    let timezoneOffset = dateObject.getTimezoneOffset() * 6e4;
    let newDate = new Date(dateObject - timezoneOffset);
    return newDate.toISOString().slice(0, -1);
}

export function _durationToSeconds(duration) {
    let [hours, minutes, seconds] = duration.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}

export function _calculateDuration(startTime, endTime) {
    console.debug(`_calculateDuration(${startTime}, ${endTime})`);
    let start = new Date(startTime);
    let end = new Date(endTime);
    let durationMillis = end - start;
    let hours = Math.floor(durationMillis / 36e5);
    let minutes = Math.floor((durationMillis - hours * 36e5) / 6e4);
    let seconds = Math.floor((durationMillis - hours * 36e5 - minutes * 6e4) / 1e3);
    hours = hours.toString().padStart(2, "0");
    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
}

export function _addDurations(duration1, duration2) {
    console.debug(`_addDurations(${duration1}, ${duration2})`);
    const seconds1 = _durationToSeconds(duration1);
    const seconds2 = _durationToSeconds(duration2);
    const totalSeconds = seconds1 + seconds2;
    return _secondsToDuration(totalSeconds);
}

export function _secondsToDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds].map((v) => v < 10 ? "0" + v : v).join(":");
}

export function _getFormattedDate(date) {
    const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    let daySuffix;
    if (day > 3 && day < 21)
    daySuffix = "th";
    else {
    switch (day % 10) {
        case 1:
        daySuffix = "st";
        break;
        case 2:
        daySuffix = "nd";
        break;
        case 3:
        daySuffix = "rd";
        break;
        default:
        daySuffix = "th";
    }
    }
    const year = date.getFullYear();
    return `${month} ${day}${daySuffix}, ${year}`;
}

export function _formatAsTime(date) {
    const options = { hour: "2-digit", minute: "2-digit", hour12: true };
    return date.toLocaleTimeString(void 0, options);
}