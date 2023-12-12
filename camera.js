
const runCode = async () => {

  const camaeraElement = document.querySelector('#camera')

  // first request permission to use camera and microphone
  const permissions = await navigator.permissions.query({
    name: "camera"
  });
  
  // prompt user to enable camera and microphone
  if (permissions.state === 'prompt') {
    //trigger the permissions dialog
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    return;
  }

  if (permissions.state === 'denied') {
    alert('Camera permissions denied')
    return;
  }
  
  const startCamera = async () => {

    const videoElement = document.createElement('video')
    videoElement.setAttribute('style', `
   
    height:200px;
    border-radius: 100px;
    transform: scaleX(-1);
    `)
    videoElement.setAttribute('autoplay', true)
    videoElement.setAttribute('muted', true)

    const cameraStream = 
      await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    
    videoElement.srcObject = cameraStream

    camaeraElement.appendChild(videoElement)
  }

  startCamera()

  
}

runCode()

