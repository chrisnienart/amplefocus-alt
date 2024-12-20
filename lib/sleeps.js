import {bellSound} from "./utils.js";

export function _cancellableSleep(endTime, warnTime = 0, markStopped, markStarted, timerController, bell = false) {
  return new Promise((resolve, reject) => {
    if (endTime < 0)
      endTime = 0;
    if (warnTime < 0 || warnTime > endTime)
      warnTime = 0;
    const timeout = setTimeout(() => {
      resolve();
      markStopped();
      console.log("Timer finished naturally");
    }, endTime);
    let bellTimeout;
    if (bell) {
      bellTimeout = setTimeout(() => {
        bellSound();
      }, warnTime);
    }
    timerController.signal.addEventListener("abort", () => {
      console.error("Timer finished forcefully");
      clearTimeout(timeout);
      if (bell)
        clearTimeout(bellTimeout);
      reject(new DOMException("Aborted", "AbortError"));
    });
    try {
      markStarted();
    } catch (err) {
      console.log(err);
    }
  });
}