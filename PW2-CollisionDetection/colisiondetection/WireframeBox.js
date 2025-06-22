/*
 * Author : Ph. Meseure
 * Institute : University of Poitiers
*/

/**
 * Create a WebGL Buffer object corresponding to a axis-aligned box
 */
function WireframeBox()
{
  /* Constructor */
  /* ----------- */
  // Warning : the faces of this cube are inside-oriented,
  // since only the inside of the cube must be displayed
  this.vertices = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  let vertexdata = [
      // Back face
      -0.5, -0.5,  -0.5,
       0.5, -0.5,  -0.5,
       0.5,  0.5,  -0.5,
       -0.5, 0.5,  -0.5,
  
      // Front face
      -0.5, -0.5,  0.5,
       0.5, -0.5,  0.5,
       0.5,  0.5,  0.5,
       -0.5, 0.5,  0.5
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexdata), gl.STATIC_DRAW);
  
  this.normals = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
  let normals = [
    0.0,  0.0, -1.0, // Back face
    0.0,  0.0, -1.0, 
    0.0,  0.0, -1.0, 
    0.0,  0.0, -1.0, 
    0.0,  0.0,  1.0, // Front face
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0,
    0.0,  0.0,  1.0
  ];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  
  this.indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
  let edges = [
      0,1,  1,2,  2,3,  3,0,   // Back face
      4,5,  5,6,  6,7,  7,4,    // Front face
      0,4,  1,5,  2,6,  3,7  // side edges
  ];
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(edges), gl.STATIC_DRAW);
  this.numindices=edges.length;
}

/**
 * Draw the box in wireframe
 */
WireframeBox.prototype.drawWireframe = function ()
{
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertices);
  setPositionsPointer(3,gl.FLOAT);

  // Not used.... be required.
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normals);
  setNormalsPointer(3,gl.FLOAT);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indices);
  gl.drawElements(gl.LINES, this.numindices, gl.UNSIGNED_SHORT, 0);
}

