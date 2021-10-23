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

## 17 Oct 2021
- Change colour over time
- Neaten the code

## 19 Oct 2021
- Research into other AR / tracking libraries
- Probably best to stick to using AR.js for marker tracking and three.js for rendering.

## 22 Oct 2021
- Change the html to resemble the example from AR.js docs.
- The coordinates of Hiro marker seems to be x=[-.5, .5] y=[-.5, .5] z = 0 exactly.
- The rotation of an object in three.js can be done using Euler angles. The default order of the rotation is XYZ, i.e. rotate around the object's x-axis first, and then around its y-axis and then around its z-axis.
- The rotation can be done more easily with Quaternion
- Spent quite a long time looking into quaternions in general ([Quaternion Wikipedia](https://en.wikipedia.org/wiki/Quaternion), [Notes by Stanford Comp Graphics](https://graphics.stanford.edu/courses/cs348a-17-winter/Papers/quaternion.pdf), [Quaternion and spatial rotation (Wikipedia)](https://en.wikipedia.org/wiki/Quaternions_and_spatial_rotation))
- Add controls for x, y, z axis rotation (using Quaternion) and scale change
- refactor the code

## 23 Oct 2021
- Add translation control along each axis