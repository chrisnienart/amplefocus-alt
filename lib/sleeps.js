import {bellSound} from "./utils.js";

export function _cancellableSleep(ms, markStopped2, markStarted2, timerController2, bell = false) {
  return new Promise((resolve, reject) => {
    const bellTime = ms * 0.94;
    if (ms < 0)
      ms = 0;
    const timeout = setTimeout(() => {
      resolve();
      markStopped2();
      console.log("Timer finished naturally");
    }, ms);
    let bellTimeout;
    if (bell) {
      bellTimeout = setTimeout(() => {
        bellSound();
      }, bellTime);
    }
    timerController2.signal.addEventListener("abort", () => {
      console.error("Timer finished forcefully");
      clearTimeout(timeout);
      if (bell)
        clearTimeout(bellTimeout);
      reject(new DOMException("Aborted", "AbortError"));
    });
    try {
      markStarted2();
    } catch (err) {
      console.log(err);
    }
  });
}