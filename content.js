

window.cameraId = 'rusty-camera'
window.camera = document.getElementById(cameraId)

// check if camera exists
if(window.camera) {
  console.log('camera found', camera)
  // make sure it is visible
  document.querySelector('#rusty-camera').style.display='block';
} else {
  const camaeraElement = document.createElement('iframe')
  camaeraElement.id = cameraId
  camaeraElement.setAttribute('style', `
  all: initial;
  position: fixed;
  width:200px;
  height:200px;
  top:10px;
  right:10px;
  border-radius: 100px;
  background: black;
  z-index: 999999;
  border:none;
  `)

  // set permiissions on iframe - camera and microphone
  camaeraElement.setAttribute('allow', 'camera; microphone')


  camaeraElement.src = chrome.runtime.getURL('camera.html')
  document.body.appendChild(camaeraElement)
  document.querySelector('#rusty-camera').style.display = 'block';
  
}