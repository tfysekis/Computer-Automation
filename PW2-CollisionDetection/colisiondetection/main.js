/*
 * Author : Ph. Meseure
 * Institute : University of Poitiers
 * Note : this code has been freely adapted from Nehe webgl tutorials
*/
var lastTime = 0;
var cumulTime= 0;
var simul;


// Callback function called regularly to control animation and make a new display
function tick()
{
  requestAnimFrame(tick);

  let timeNow = new Date().getTime();
  if (lastTime != 0)
  {
    let elapsed = timeNow - lastTime; // in ms, time elapsed since last call
    cumulTime+=elapsed; // accumulated time since last display
    if (cumulTime>30) // 30ms, 33Hz (at most...)
    {
      let elapsedTime=cumulTime/1000.0; // convert elapsed time in seconds..
      simul.step(elapsedTime); // Compute the next step of animation
      simul.draw(); // Display the scene
      cumulTime=0; // reset the accumulated time for next display
    }
  }
  lastTime = timeNow;
}

// Function to initialize and start the animation
function startSimul()
{
  var canvas = document.getElementById("webglcanvas");
  initWGL(canvas);
  simul=new Simulation(1.0,1.0,1.0,10);
  simul.initGraphics();

  tick();
}

