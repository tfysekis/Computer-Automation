/*
 * Author : Ph. Meseure
 * Institute : University of Poitiers
*/

// Constructor of the simulation scene
function Simulation(sizex,sizey,sizez,nb)
{
  // rotation angle of the observer
  this.rotview = 0.0;

  // Create a graphics object used to display bounding boxes
  this.box=new WireframeBox();

  // List of polyhedra for graphics use (only one for each type of polyhedron)
  let polyhedra=[];
  for(let i=0;i<PolyhedronTypes.MAX_TYPES;i++)
    polyhedra.push(new Polyhedron(i)); // create each type of polyhedron
    
  // Creation of the scene objects
  this.objects=[];
  for(let i=0;i<nb;i++)
  {
    // Select random color
    color=[Math.random()*0.7+0.3,Math.random()*0.7+0.3,Math.random()*0.7+0.3,1.0];

    // Select the size of the object
    let polysize=Math.random()*sizex/20.0+sizex/30.0;
    
    // Select the shape of the current object among the polyhedra list
    let polytype=Math.floor(Math.random()*PolyhedronTypes.MAX_TYPES);
    if (polytype==PolyhedronTypes.MAX_TYPES) polytype--; // just in case...

    // Select trajectory parameters (an ellipse)
    let startangle=(Math.random())*2.0*Math.PI;
    let radiusx=Math.random()*sizex;
    let radiusz=Math.random()*sizez;
    let angularvel=(Math.random()-0.5)*10; // m/s
    let deviation=(Math.random())*2.0*Math.PI;
    let inclination=(Math.random())*2.0*Math.PI;
        
    // Create object
    let object=new VirtualObject(this,polyhedra[polytype],color,polysize,startangle,
                            radiusx,radiusz,angularvel,deviation,inclination);

    // Add object to the scene's list
    this.objects.push(object);
  }

  // Initialize sorted lists for Sweep & Prune algorithm
  this.sortedX = [...this.objects];
  this.sortedY = [...this.objects];
  this.sortedZ = [...this.objects];

  // Initial bubble sort for each axis
  this.bubbleSort(this.sortedX, 0);
  this.bubbleSort(this.sortedY, 1);
  this.bubbleSort(this.sortedZ, 2);

  // Initialize overlap matrices for each axis
  const n = this.objects.length;
  this.overlapX = Array(n).fill().map(() => Array(n).fill(false));
  this.overlapY = Array(n).fill().map(() => Array(n).fill(false));
  this.overlapZ = Array(n).fill().map(() => Array(n).fill(false));
}

/**
 * Bubble sort implementation for S&P algorithm
 * @param list Array to sort
 * @param axis Axis index (0=X, 1=Y, 2=Z)
 */
Simulation.prototype.bubbleSort = function(list, axis) {
  const n = list.length;
  for(let i = 0; i < n-1; i++) {
    for(let j = 0; j < n-i-1; j++) {
      if(list[j].boxmin[axis] > list[j+1].boxmin[axis]) {
        // Swap elements
        [list[j], list[j+1]] = [list[j+1], list[j]];
      }
    }
  }
}

/**
 * Move each object one step further in time and detect collisions
 * @param elapsed (actual) time elapsed since last call
 */
Simulation.prototype.step = function (elapsed)
{ 
  // Move each object and update their AABBs
  for(let i=0; i<this.objects.length; i++)
  {
    this.objects[i].step(elapsed);
  }
  
  // Re-sort lists using bubble sort (efficient due to temporal coherence)
  this.bubbleSort(this.sortedX, 0);
  this.bubbleSort(this.sortedY, 1);
  this.bubbleSort(this.sortedZ, 2);

  // Reset overlap matrices
  for(let i = 0; i < this.objects.length; i++) {
    for(let j = 0; j < i; j++) {
      this.overlapX[i][j] = false;
      this.overlapY[i][j] = false;
      this.overlapZ[i][j] = false;
    }
  }

  // Check overlaps along X axis
  this.checkAxisOverlaps(this.sortedX, 0, this.overlapX);
  
  // Check overlaps along Y axis
  this.checkAxisOverlaps(this.sortedY, 1, this.overlapY);
  
  // Check overlaps along Z axis
  this.checkAxisOverlaps(this.sortedZ, 2, this.overlapZ);

  // For objects that overlap on all axes, check for collision
  const n = this.objects.length;
  for(let i = 0; i < n; i++) {
    for(let j = 0; j < i; j++) {
      if(this.overlapX[i][j] && this.overlapY[i][j] && this.overlapZ[i][j]) {
        let obj1 = this.objects[i];
        let obj2 = this.objects[j];
        
        // Basic AABB collision check
        if(obj1.compareAABB(obj2)) {
          obj1.collision = true;
          obj2.collision = true;
        }
      }
    }
  }
}

/**
 * Check for overlaps along a given axis
 * @param sortedList Sorted list of objects along the axis
 * @param axis Axis index (0=X, 1=Y, 2=Z)
 * @param overlapMatrix Matrix to store overlap results
 */
Simulation.prototype.checkAxisOverlaps = function(sortedList, axis, overlapMatrix) {
  const n = sortedList.length;
  
  for(let i = 0; i < n-1; i++) {
    const current = sortedList[i];
    const currentMax = current.boxmax[axis];
    
    // Check against subsequent objects until no more overlaps possible
    for(let j = i+1; j < n && sortedList[j].boxmin[axis] <= currentMax; j++) {
      const other = sortedList[j];
      
      // Get original indices of objects in the objects array
      const idx1 = this.objects.indexOf(current);
      const idx2 = this.objects.indexOf(other);
      
      // Store overlap in matrix (always use larger index first)
      if(idx1 > idx2) {
        overlapMatrix[idx1][idx2] = true;
      } else {
        overlapMatrix[idx2][idx1] = true;
      }
    }
  }
}

/**
 * Initialization of graphical elements
 */
Simulation.prototype.initGraphics = function()
{
  let pmatrix=mat4.create();    
  mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pmatrix);
  setProjectionMatrix(pmatrix);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.disable(gl.BLEND);
  setLighting(true);
  setAmbiantLight([0.2,0.2,0.2,1.0]);
  setLightPosition([10.0,20.0,10.0]);
  setLightColor([0.8,0.8,0.8,1.0]);
  setLightSpecular([1.0,1.0,1.0,1.0]);
  setLightAttenuation(1.0,0.0,0.0);
  setNormalizing(true);
}

/**
 * Drawing function
 */
Simulation.prototype.draw = function()
{
  let mvmatrix = mat4.create();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // First compute the view matrix
  mat4.identity(mvmatrix);
  mat4.translate(mvmatrix, [0.0, 0.0, -2.2]);
  mat4.rotate(mvmatrix, Math.PI/6.0, [1, 0, 0]);
  mat4.rotate(mvmatrix, this.rotview, [0, 1, 0]);

  // Display all the objects and possibly their bounding boxes 
  for(let i=0;i<this.objects.length;i++)
  {
    let obj=this.objects[i];
    pushMatrix(mvmatrix);
    {
      obj.draw(mvmatrix);
    }
    mvmatrix=popMatrix();

    // Uncomment this part to display bounding boxes    
    setLighting(false);
    pushMatrix(mvmatrix);
    {
      obj.drawAABB(mvmatrix,this.box);
    }
    mvmatrix=popMatrix();
    setLighting(true);    
  }
}


