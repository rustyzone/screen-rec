const recordTab = document.querySelector("#tab");
const recordScreen = document.querySelector("#screen");

const injectCamera = async () => {
  // inject the content script into the current page
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("inject into tab", tabId);
  await chrome.scripting.executeScript({
    // content.js is the file that will be injected
    files: ["content.js"],
    target: { tabId },
  });
};

const removeCamera = async () => {
  // inject the content script into the current page
  const tab = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const tabId = tab[0].id;
  console.log("inject into tab", tabId);
  await chrome.scripting.executeScript({
    // content.js is the file that will be injected
    func: () => {
      const camera = document.querySelector("#rusty-camera");
      if (!camera) return;
      document.querySelector("#rusty-camera").style.display = "none";
    },
    target: { tabId },
  });
};

// check chrome storage if recording is on
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  console.log("recording status", recordingStatus, recordingType);
  return [recordingStatus, recordingType];
};

const init = async () => {
  const recordingState = await checkRecording();

  console.log("recording state", recordingState);

  if (recordingState[0] === true) {
    if (recordingState[1] === "tab") {
      recordTab.innerText = "Stop Recording";
    } else {
      recordScreen.innerText = "Stop Recording";
    }
  }

  const updateRecording = async (type) => {
    console.log("start recording", type);

    const recordingState = await checkRecording();

    if (recordingState[0] === true) {
      // stop recording
      chrome.runtime.sendMessage({ type: "stop-recording" });
      removeCamera();
    } else {
      // send message to service worker to start recording
      chrome.runtime.sendMessage({
        type: "start-recording",
        recordingType: type,
      });
      injectCamera();
    }

    // close popup
    window.close();
  };

  recordTab.addEventListener("click", async () => {
    console.log("updateRecording tab clicked");
    updateRecording("tab");
  });

  recordScreen.addEventListener("click", async () => {
    console.log("updateRecording screen clicked");
    updateRecording("screen");
  });
};

init();
