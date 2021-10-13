# Logbook

## 11 Oct 2021
- Made a very simple html that shows a box on top of a hiro marker
- Use a VSCode extension 'Live Server' to display the result
- Create a self-signed SSL certificate (following [this website](https://www.akadia.com/services/ssh_test_certificate.html)) so that I can access the live server from mobile devices which required a secure connection
- Add the box programmatically rather than within the html

## 12 Oct 2021
- Add the box using three.js rather than AFrame
- Add a plane using three.js and shaders
- Disable device orientation detection in aframe. This was causing unexpected turning of the objects.
- Tried to access three.js from Node.js so I would be able to use Typescript and other Node features but it didn't go well.
- Implement position / color updates of the plane

## 13 Oct 2021
- Add a slider that moves the plane in y-axis