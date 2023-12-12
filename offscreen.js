let db;

const openDatabase = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("RecordingsDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore("recordings", {
        autoIncrement: true,
        keyPath: "id",
      });
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

// Use this function to save a recorded chunk to IndexedDB
const saveChunkToDB = (chunk) => {
  const transaction = db.transaction(["recordings"], "readwrite");
  const objectStore = transaction.objectStore("recordings");

  const request = objectStore.add({ chunk });

  request.onerror = (event) => {
    console.error("Error adding chunk to IndexedDB:", event.target.error);
  };
};

// Use this function to retrieve all recorded chunks from IndexedDB
const getAllChunksFromDB = () => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["recordings"], "readonly");
    const objectStore = transaction.objectStore("recordings");

    const chunks = [];

    const request = objectStore.openCursor();

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        chunks.push(cursor.value.chunk);
        cursor.continue();
      } else {
        resolve(chunks);
      }
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
};

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target === "offscreen") {
    switch (message.type) {
      case "start-recording":
        startRecording(message.data);
        break;
      case "stop-recording":
        stopRecording();
        break;
      default:
        throw new Error("Unrecognized message:", message.type);
    }
  }
});

let recorder;
// let data = [];

async function startRecording(streamId) {
  try {
    if (recorder?.state === "recording") {
      throw new Error("Called startRecording while recording is in progress.");
    }

    console.log("start recording", streamId);

    await openDatabase(); // Open the IndexedDB database

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

    const mixedContext = new AudioContext();
    const mixedDest = mixedContext.createMediaStreamDestination();

    mixedContext.createMediaStreamSource(microphone).connect(mixedDest);
    mixedContext.createMediaStreamSource(media).connect(mixedDest);

    const combinedStream = new MediaStream([
      media.getVideoTracks()[0],
      mixedDest.stream.getTracks()[0],
    ]);

    recorder = new MediaRecorder(combinedStream, { mimeType: "video/webm" });

    // TODO make this an option
    // Continue to play the captured audio to the user.
    // const output = new AudioContext();
    // const source = output.createMediaStreamSource(media);
    // source.connect(output.destination);

    recorder.ondataavailable = (event) => {
      // data.push(event.data);
      // Save the chunk to IndexedDB
      saveChunkToDB(event.data);
    };
    recorder.onstop = async () => {
      const chunks = await getAllChunksFromDB();
      const blob = new Blob(chunks, { type: "video/webm" });
      // TODO - handle the upload now and begin to process the video blob and parse the transcript for AI analysis
      // Create a URL for the blob
      const videoUrl = URL.createObjectURL(blob);

      // send message to service worker to open tab
      console.log("open tab", videoUrl);
      chrome.runtime.sendMessage({ type: "open-tab", url: videoUrl });

      // Clear state ready for next recording
      recorder = undefined;

      // clear IndexedDB
      const transaction = db.transaction(["recordings"], "readwrite");
      const objectStore = transaction.objectStore("recordings");
      objectStore.clear();
    };
    recorder.start();
  } catch (error) {
    console.error("error", error);
  }
}

async function stopRecording() {
  if (recorder && recorder.stream) {
    recorder.stop();
    // Stopping the tracks makes sure the recording icon in the tab is removed.
    recorder.stream.getTracks().forEach((t) => t.stop());
  }
}
