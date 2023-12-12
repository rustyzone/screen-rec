// to save the video to local storage
const saveVideo = (videoUrl) => {
  chrome.storage.local.set({ videoUrl });
};

// on page open, check if there is a video url
chrome.storage.local.get(["videoUrl"], (result) => {
  console.log("video url", result);
  if (result.videoUrl) {
    console.log("play video from storage", result);
    playVideo(result);
  }
});

const playVideo = (message) => {
  const videoElement = document.querySelector("#recorded-video");

  const url = message?.videoUrl || message?.base64;
  // update the saved video url
  saveVideo(url);

  videoElement.src = url;
  videoElement.play();
};

chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message.type) {
    case "play-video":
      console.log("play video", message);
      playVideo(message);
      break;
    default:
      console.log("default");
  }
});
