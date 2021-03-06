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
- Add translation control along each parent axis

## 25 Oct 2021
- modelViewMatrix transforms the position of a vertex on the model to the coordinates relative to the camera / view.
- in AR.js, camera is always positioned at the origin in the world. Right-hand direction on the camera is x, up is y and out of the page is z.
- we could use a technique where we know the exact dimensions and distance / orientation difference between two markers, but this may not work out so well. if the surface is not perfectly flat (like in a compressor surface), then we are more interested in the relationship between the markers when perceived by the camera rather than the actual accurate measurements.

## 26 Oct 2021
- thought a bit more about change of reference of position vector / quaternion using quaternions. ([this](https://stackoverflow.com/questions/18818102/convert-quaternion-representing-rotation-from-one-coordinate-system-to-another) may be a little useful as well as the above Wikipedia pages)

## 1 Nov 2021
- the change of reference of a position vector or a quaternion is done by simply applying the inverse of the orientation quaternion. i.e. to change from coordinate system 0 to 1, then first get quaternion q_{01|0}, and apply q_{01|0}^{-1} to convert the position vector / quaternion in coordinate system 0 to the values in coordinate system 1.

## 2 Nov 2021
- managed to fetch the example simulation data (vertices, indices and data values)

## 3 Nov 2021
- show the data for one time step on a marker

## 5 / 6 Nov 2021
- use multiple markers to show the results / box

## 8 Nov
- put indicators on markers (green and red)
- stabalise objects by averaging their positions with weights

## 9 Nov
- use all time steps of the example sim to make a nice animation
- add yellow to indicator color for visible but not nearest markers

## 10/11
- make a python script to convert the xy coordinates data for airfoil to an stl file for 3d printing

## 11/11
- modify the python script to close the surface of the 3d model

## 12/11
- 3d print the wing section
- record a demo of how the simulation result fits the physical model

## 15/11
- seems like marker 5 indicator is super unstable when we cover markers 3 and 5 and the camera is near marker 1.
- marker 4 indicator is unstable when covering marker 4 and the camera is near marker 0 / 2.
- fixed this bug. The problem was that some of the world frame quaternions stored for weighting were facing the other direction with negative rotation.
They represent the same operation but the nature of averaging meant that this was poorly managed.
Used the sign of w to correct it.

## 16/11
- refactoring things (Arena class, put things into functions)

## 17/11
- started working on calibration
- had a problem with quaternion rotation close to 180 degrees, in which case i didnt quite know how to clean the quaternion.

## 18/11
- based on [this paper](http://www.acsu.buffalo.edu/%7Ejohnc/ave_quat07.pdf), devise a way to average quaternions
- the code for calibration is done
- add confidence indicator lines between markers to show how accurate the relative positions seem
- film a demo video on calibration
- the error can be around 1/10 of marker size within a reasonable time

## 19/11
- connect scan and show functions together
- we can now scan the markers and then show the simulation results without hard-coding the marker positions and quaternions!!!!

## 23/01
- fix bug on marker indicators when markers aren't on the same plane
- successfully tested the scanning process for a cuboid

## 24/01
- make typescript work
- convert all `js` files to `ts` files

## 25/01
- big refactor
- start on getting rid of aframe (#32)

## 26/01
- got rid of aframe
- start working on interactivity
- put a ring near a marker, havent implemented the rotation UI

## 27/01
- implement the rotation UI for a test box

## 28/01
- implement translation arrows

## 29/01
- various small improvements to the control UI
- merge into master
- put every object on its own closest marker to increase stability

## 30/01
- refactor
- implement detection box

## 31/01
- implement zooming pinch

## 01/02
- use npm modules of threejs and arjs
- show vtk bunny (legacy format)

## 02/02
- dynamic positioning of object controls
- closest intersection for control

## 03/02
- uploading file
- refactor

## 04/02 - 06/02
- working on our own vtk loader

## 07/02
- working on vts file (structured grid)
- struggling to generate mesh from points

## 08/02
- refine VTSLoader
- show property options

## 02/03
- had a look at [ear clipping](https://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf) for Lines in vtp files, but Lines may not form a closed polygon, so i don't know what to do.