/*
 * Author : Ph. Meseure
 * Institute : University of Poitiers
 */

/*
* This class aims at building geometric polyhedral objects
* Cubes, tetrahedra and octahedra can be created. Singles triangles too.
* It creates vertices and triangles of a selected polyhedron.
* A created polyhedron is centered and has a normalized size
*/

const EQUITRIANGLE=-1;
const PolyhedronTypes = {
  CUBOID:0,
  TETRAHEDRON:1,
  OCTAHEDRON:2,
  MAX_TYPES:3
};

// Constructor, with the type of the polyhedron to create
function Polyhedron(_type)
{
  // Vertex and faces and WebGL buffers
  this.positions=[];
  this.normals=[];
  this.triangles=[];
  switch(_type)
  {
    case PolyhedronTypes.CUBOID:
      createCuboid(this,1.0,1.0,1.0); break;
    case PolyhedronTypes.TETRAHEDRON:
      createTetrahedron(this,1.0); break;
    case PolyhedronTypes.OCTAHEDRON:
      createOctahedron(this,1.0); break;
    default:
      createEquiTriangle(this,1.0);
  }
  this.createBuffersWithArrays();
}

// Prepare vertex and triangle list to create WebGL buffer object
// Edges are all considered sharp, so vertices must be duplicated
Polyhedron.prototype.createBuffersWithArrays=function()
{
  /* this.positions contains only one single instance of each vertex
     of the current polyhedron (as vec3). However, to represent a polyhedron
     for WegGL, each vertex must be duplicated because its normal is different
     for each face to which it belongs. This function aims at creating
     the array with duplicated vertices and a triangle array full of vertex
     indices taking into account this duplication */
  let pos=[]; // new unpacked array for positions
  let faces=[];   // new unpacked array for triangles
  for(let i=0;i<this.triangles.length;i+=3) // for all faces
  {
    for(let j=0;j<3;j++) // for all vertices of each face
    {
      let ind=this.triangles[i+j];
      let p=this.positions[ind]; // get position as a vec3 in packed array
      let l=pos.length;
      for(let k=0;k<3;k++) pos.push(p[k]);
          // push back position in the unpacked position array
      faces.push(l/3);
          // create a triangle with vertex indices toward the unpacked array
    }
  }
  // Here pos is much larger than positions due to vertex duplication
  // but faces has the same size as triangles ! (only changes of indices...)
  
  // Compute face normals and store them in an index
  let normals=this.computeNormals(pos,faces);
  
  // Create webgl buffers
  this.createBuffers(pos,normals,faces);
}

// Method to compute a normal for each triangle
// (and more precisely for its three vertices)
Polyhedron.prototype.computeNormals=function(pos)
{
  let normals=[];
  for(let i=0;i<this.triangles.length;i+=3)
  {
    let ind0=this.triangles[i];
    let ind1=this.triangles[i+1];
    let ind2=this.triangles[i+2];
    
    let p0=this.positions[ind0];
    let p1=this.positions[ind1];
    let p2=this.positions[ind2];

    let p01=vec3.create();
    let p02=vec3.create();
    let normal=vec3.create();

    // if ABC is the triangle, the normal is the normalization of AB*AC    
    vec3.subtract(p1,p0,p01);
    vec3.subtract(p2,p0,p02);    
    vec3.cross(p01,p02,normal);
    vec3.normalize(normal);

    for(let j=0;j<3;j++) // for the three vertices
      for(let k=0;k<3;k++) // For the 3 coordinates of the normal
      {
        normals.push(normal[k]);
      }
  }
  return normals;
}

// Create WebGL position, normal and triangle buffers
Polyhedron.prototype.createBuffers=function(pos,normals,faces)  
{
  this.normalbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

  this.positionbuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionbuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

  this.trianglebuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.trianglebuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(faces), gl.STATIC_DRAW);
}

// Method to display the polyhedron in its orginal centered and normalized frame
Polyhedron.prototype.draw=function()
{
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionbuffer);
  setPositionsPointer(3,gl.FLOAT);

  gl.bindBuffer(gl.ARRAY_BUFFER, this.normalbuffer);
  setNormalsPointer(3,gl.FLOAT);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.trianglebuffer);
  gl.drawElements(gl.TRIANGLES, this.triangles.length, gl.UNSIGNED_SHORT, 0);
  
//  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,0);
//  gl.bindBuffer(gl.ARRAY_BUFFER,0);
}


// Method to create a cube
function createCuboid(poly,sizex,sizey,sizez)
{
  /* Constructor */
  /* ----------- */
  let p=vec3.create([-sizex,  -sizey, -sizez]); //0
  poly.positions.push(p);
  p=vec3.create([sizex,  -sizey, -sizez]); // 1
  poly.positions.push(p);
  p=vec3.create([sizex,  sizey, -sizez]); // 2
  poly.positions.push(p);
  p=vec3.create([-sizex,  sizey, -sizez]); // 3
  poly.positions.push(p);
  p=vec3.create([-sizex,  -sizey, sizez]); // 4
  poly.positions.push(p);
  p=vec3.create([sizex,  -sizey, sizez]); // 5
  poly.positions.push(p);
  p=vec3.create([sizex,  sizey, sizez]); // 6
  poly.positions.push(p);
  p=vec3.create([-sizex,  sizey, sizez]); // 7
  poly.positions.push(p);
  
  poly.triangles = [
    // Back face
    0,2,1,  0,3,2,
    // Bottom face
    0,1,5,  0,5,4,
    // Front face
    4,5,6,  4,6,7,
    // Top face
    2,3,7,  2,7,6,
    // Right face
    1,2,6,   1,6,5,
    // Left face
    0,4,7,  0,7,3
  ];  
}

// Method to create a equilateral triangle
function createEquiTriangle(poly,size)
{
  let p=vec3.create([size, 0.0, 0.0]); //0
  poly.positions.push(p);
  p=vec3.create([-size/2.0, size*Math.sqrt(3.0)/2.0, 0.0]); //1
  poly.positions.push(p);
  p=vec3.create([-size/2.0, -size*Math.sqrt(3.0)/2.0, 0.0]); //2
  poly.positions.push(p);
  
/*  poly.positions = [
    // Front triangle
    size, 0.0, 0.0,
    -size/2.0, size*Math.sqrt(3.0)/2.0, 0.0,
    -size/2.0, -size*Math.sqrt(3.0)/2.0, 0.0,
    // back triangle
    size, 0.0, 0.0,
    -size/2.0, size*Math.sqrt(3.0)/2.0, 0.0,
    -size/2.0, -size*Math.sqrt(3.0)/2.0, 0.0
  ]; */
  poly.triangles=[
    0,1,2,
    0,2,1
  ];
}

// Method to create a tetrahedron
function createTetrahedron(poly,size)
{
  let p=vec3.create([0.0, size, 0.0]); // 0 = apex
  poly.positions.push(p);
  p=vec3.create([0.0, -size/2.0, size*Math.sqrt(3.0)/2.0]); // 1 (bottom front)
  poly.positions.push(p);
  p=vec3.create([-size*Math.sqrt(3.0)/2.0, -size/2.0, -size/2.0]); // 2 (left)
  poly.positions.push(p);
  p=vec3.create([size*Math.sqrt(3.0)/2.0, -size/2.0, -size/2.0]); // 3 (right)
  poly.positions.push(p);
  
  poly.triangles=[
    0,2,1,
    0,1,3,
    1,2,3,
    0,3,2
  ];
}

// Method to create an octahedron
function createOctahedron(poly,size)
{
  let p=vec3.create([0.0,size,0.0]); // 0 = apex/top
  poly.positions.push(p);
  p=vec3.create([-size,0.0,0.0]); // 1 (left)
  poly.positions.push(p);
  p=vec3.create([0.0,0.0,size]); // 2 (front)
  poly.positions.push(p);
  p=vec3.create([size,0.0,0.0]); // 3 (right)
  poly.positions.push(p);
  p=vec3.create([0.0,0.0,-size]); // 4 (back)
  poly.positions.push(p);
  p=vec3.create([0.0,-size,0.0]); // 5 = bottom
  poly.positions.push(p);
  
  poly.triangles=[
    0,1,2,
    0,2,3,
    0,3,4,
    0,4,1,
    5,1,4,
    5,4,3,
    5,3,2,
    5,2,1
  ];
}