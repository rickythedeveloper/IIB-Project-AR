# Research

## AR / Tracking APIs
### ARKit (iOS) or ARCore (Android)
- ARKit is a suite of APIs available on iOS native apps
- ARCore is available on Android
- We cannot access those APIs from the browsers

### three.ar.js 
[Github](https://github.com/google-ar/three.ar.js), [Docs](https://github.com/google-ar/three.ar.js/blob/master/API.md)
- Developed by Google AR team
- experimental and not an official product 
- It may support markers (anchors). 
- I was not able to successfully test their examples on my iOS devices.
- Uses WebARonARKit and WebARonARCore
- Not activately maintained (last update in 2018)

### threex.webar by jeromeetienne
[GitHub](https://github.com/jeromeetienne/threex.webar)
- A threex extension for three.js
- Runs on any web browser with WebGL and [getUserMedia](http://caniuse.com/#feat=stream)
- iOS browsers (both Safari & Chrome) don't support [getUserMedia](http://caniuse.com/#feat=stream)

### ar.js
[Github](https://github.com/AR-js-org/AR.js)
- supports marker tracking using either AFRAME or three.js
- actively maintained

### WebXR
- Only works on Chrome on Android devices

## Object Modelling
### Object Capture by Apple
- An API on the new macOS Monterey
- A series of photos taken on an iOS device has to be sent to the Mac to be processed using Object Capture and then converted into a 3D object
