// check
const checkRecording = async () => {
  const recording = await chrome.storage.local.get(["recording", "type"]);
  const recordingStatus = recording.recording || false;
  const recordingType = recording.type || "";
  console.log("recording status", recordingStatus, recordingType);
  return [recordingStatus, recordingType];
};

// update recording state
const updateRecording = async (state, type) => {
  console.log("update recording", type);
  chrome.storage.local.set({ recording: state, type });
};

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

// listen for changes to the focused / current tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log("tab activated", activeInfo);

  // grab the tab
  const activeTab = await chrome.tabs.get(activeInfo.tabId);
  if (!activeTab) return;
  const tabUrl = activeTab.url;

  // if chrome or extension page, return
  if (
    tabUrl.startsWith("chrome://") ||
    tabUrl.startsWith("chrome-extension://")
  ) {
    console.log("chrome or extension page - exiting");
    return;
  }

  // check if we are recording & if we are recording the scren
  const [recording, recordingType] = await checkRecording();

  console.log("recording check after tab change", {
    recording,
    recordingType,
    tabUrl,
  });

  if (recording && recordingType === "screen") {
    // inject the camera
    injectCamera();
  } else {
    // remove the camera
    removeCamera();
  }
});

const startRecording = async (type) => {
  console.log("start recording", type);
  const currentstate = await checkRecording();
  console.log("current state", currentstate);
  updateRecording(true, type);
  // update the icon
  chrome.action.setIcon({ path: "icons/recording.png" });
  if (type === "tab") {
    recordTabState(true);
  }
  if (type === "screen") {
    recordScreen();
  }
};

const stopRecording = async () => {
  console.log("stop recording");
  updateRecording(false, "");
  // update the icon
  chrome.action.setIcon({ path: "icons/not-recording.png" });
  recordTabState(false);
};

const recordScreen = async () => {
  // create a pinned focused tab - with an index of 0
  const desktopRecordPath = chrome.runtime.getURL("desktopRecord.html");

  const currentTab = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });
  const currentTabId = currentTab[0].id;

  const newTab = await chrome.tabs.create({
    url: desktopRecordPath,
    pinned: true,
    active: true,
    index: 0,
  });

  // wait for 500ms send a message to the tab to start recording
  setTimeout(() => {
    chrome.tabs.sendMessage(newTab.id, {
      type: "start-recording",
      focusedTabId: currentTabId,
    });
  }, 500);
};

const recordTabState = async (start = true) => {
  // setup our offscrene document
  const existingContexts = await chrome.runtime.getContexts({});
  const offscreenDocument = existingContexts.find(
    (c) => c.contextType === "OFFSCREEN_DOCUMENT"
  );

  // If an offscreen document is not already open, create one.
  if (!offscreenDocument) {
    // Create an offscreen document.
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA", "DISPLAY_MEDIA"],
      justification: "Recording from chrome.tabCapture API",
    });
  }

  if (start) {
    // use the tapCapture API to get the stream
    // get the id of the active tab
    const tab = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const tabId = tab[0].id;

    console.log("tab id", tabId);

    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    console.log("stream id", streamId);

    // send this to our offscreen document
    chrome.runtime.sendMessage({
      type: "start-recording",
      target: "offscreen",
      data: streamId,
    });
  } else {
    // stop
    chrome.runtime.sendMessage({
      type: "stop-recording",
      target: "offscreen",
    });
  }
};

const openTabWithVideo = async (message) => {
  console.log("request to open tab with video", message);

  // that message will either have a url or base64 encoded video
  const { url: videoUrl, base64 } = message;

  if (!videoUrl && !base64) return;

  // open tab
  const url = chrome.runtime.getURL("video.html");
  const newTab = await chrome.tabs.create({ url });

  // send message to tab
  setTimeout(() => {
    chrome.tabs.sendMessage(newTab.id, {
      type: "play-video",
      videoUrl,
      base64,
    });
  }, 500);
};

// add listender for messages
chrome.runtime.onMessage.addListener(function (request, sender) {
  console.log("message received", request, sender);

  switch (request.type) {
    case "open-tab":
      openTabWithVideo(request);
      break;
    case "start-recording":
      startRecording(request.recordingType);
      break;
    case "stop-recording":
      stopRecording();
      break;
    default:
      console.log("default");
  }

  return true;
});
