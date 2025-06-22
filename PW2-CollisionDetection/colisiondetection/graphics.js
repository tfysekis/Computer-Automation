/*
 * Author : Ph. Meseure
 * Institute : University of Poitiers
 * Note : Some part of this code have been freely adaptated from Nehe webgl tutorial
*/
var gl;
var shaderProgram;
var mvMatrixStack = [];

/*
 * ModelView Matrix stack handling 
 */
function pushMatrix(matrix)
{
  let copy = mat4.create();
  mat4.set(matrix, copy);
  mvMatrixStack.push(copy);
}

function popMatrix()
{
  if (mvMatrixStack.length == 0)
  {
      throw "Invalid popMatrix!";
  }
  return mvMatrixStack.pop();
}

/*
 * Shader initialization
 */
function initShaders()
{
  let fragshader;
  fragshader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragshader,fragsrc);
  gl.compileShader(fragshader);
  if (!gl.getShaderParameter(fragshader, gl.COMPILE_STATUS))
  {
    alert(gl.getShaderInfoLog(fragshader));
  }
  
  let vertshader;
  vertshader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertshader,vertsrc);
  gl.compileShader(vertshader);
  if (!gl.getShaderParameter(vertshader, gl.COMPILE_STATUS))
  {
    alert(gl.getShaderInfoLog(vertshader));
  }
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertshader);
  gl.attachShader(shaderProgram, fragshader);
  gl.linkProgram(shaderProgram);
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
  {
    alert("Could not initialise shaders");
  }
  
  gl.useProgram(shaderProgram);
  setGlVariables(shaderProgram);
}

/*
 * Webgl initialization
 */
function initWGL(canvas)
{
  try
  {
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  }
  catch (e) {}
  if (!gl)
  {
    alert("Could not initialise WebGL, sorry :-(");
  }
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  initShaders();
}

