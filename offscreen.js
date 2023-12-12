// listen for messages from the service worker
chrome.runtime.onMessage.addListener((message, sender) => {
  console.log("[offscreen] message received", message, sender);

  switch (message.type) {
    case "start-recording":
      console.log("offscreen start recording tab");
      startRecording(message.data);
      break;
    case "stop-recording":
      console.log("stop recording tab");
      stopRecording();
      break;
    default:
      console.log("default");
  }

  return true;
});

let recorder;
let data = [];

async function stopRecording() {
  console.log("stop recording");

  if (recorder?.state === "recording") {
    recorder.stop();

    // stop all streams
    recorder.stream.getTracks().forEach((t) => t.stop());
  }
}

async function startRecording(streamId) {
  try {
    if (recorder?.state === "recording") {
      throw new Error("Called startRecording while recording is in progress.");
    }

    console.log("start recording", streamId);

    // use the tabCaptured streamId
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    // get microphone audio
    const microphone = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false },
    });
    // combine the streams
    const mixedContext = new AudioContext();
    const mixedDest = mixedContext.createMediaStreamDestination();

    mixedContext.createMediaStreamSource(microphone).connect(mixedDest);
    mixedContext.createMediaStreamSource(media).connect(mixedDest);

    const combinedStream = new MediaStream([
      media.getVideoTracks()[0],
      mixedDest.stream.getTracks()[0],
    ]);

    recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });

    // listen for data
    recorder.ondataavailable = (event) => {
      console.log("data available", event);
      data.push(event.data);
    };

    // listen for when recording stops
    recorder.onstop = async () => {
      console.log("recording stopped");
      // send the data to the service worker
      console.log("sending data to service worker");

      // convert this into a blog and open window
      const blob = new Blob(data, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      // send message to service worker to open tab
      chrome.runtime.sendMessage({ type: "open-tab", url });
    };

    // start recording
    recorder.start();
  } catch (err) {
    console.log("error", err);
  }
}
