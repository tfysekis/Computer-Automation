/*
 * Author : Ph. Meseure
 * Institute : University of Poitiers
*/

/**
 * BVHNode class for the bounding volume hierarchy
 */
function BVHNode(triIndices) {
  this.triIndices = triIndices; // array of triangle indices
  this.left = null;
  this.right = null;
  this.boxmin = vec3.create();
  this.boxmax = vec3.create();
}

/**
 * Compute volume of the node's AABB
 */
BVHNode.prototype.computeVolume = function() {
  const dx = this.boxmax[0] - this.boxmin[0];
  const dy = this.boxmax[1] - this.boxmin[1];
  const dz = this.boxmax[2] - this.boxmin[2];
  return dx * dy * dz;
}

/**
 * Check if this is a leaf node
 */
BVHNode.prototype.isLeaf = function() {
  return this.triIndices.length === 1;
}

/**
 * Virtual Object constructor
 * @param _envi: the simulation scene
 * @param _globject: shape of the object, defined as a polyhedron
 * @param _size: size of the object (the given shape is normalized)
 * @param _starangle, _radiusx, _radiusz,_angvel,_deviation,_inclination: parameters of the trajectory (an ellipse)
 */
function VirtualObject(_envi,_globject,_color,_size,_startangle,_radiusx,_radiusz,_angvel,_deviation,_inclination)
{
  this.envi=_envi;
  
  this.globject=_globject; // Open
  this.color=_color;
  this.size=_size;

  
  // Motion parameters
  // Axial rotations
  this.anglex=0.0;
  this.angley=0.0;
  this.anglez=0.0;
  // Rotation velocity along the trajectory
  this.rotvelx=(Math.random()-0.5)*2; // m/s
  this.rotvely=(Math.random()-0.5)*2; // m/s
  this.rotvelz=(Math.random()-0.5)*2; // m/s

  // position of the ellipsoidal trajectory
  this.rotposy=(Math.random()-0.5)*2; // m/s
  this.posangle=_startangle;
  this.radiusx=_radiusx;
  this.radiusz=_radiusz;
  this.angularvelocity=_angvel;
  this.deviation=_deviation;
  this.inclination=_inclination;

  // Boolean mark telling if a collision was detected for the current object  
  this.collision=false;
  
  // Bottom/left/far corner of the axis-aligned bounding box
  this.boxmin=vec3.create();
  // Top/right/near corner of the axis-aligned bounding box
  this.boxmax=vec3.create();

  // Initialize BVH
  this.initBVH();
}

/**
 * Compute a matrix for the global positionning of the object
 * depending on the current state/position values
 * @param mvmatrix: matrix to change to take into account the size and the
 * current position and orientation of the object
 */
VirtualObject.prototype.applyTranformations=function(mvmatrix)
{
  let pos=vec3.create();
  pos[0]=Math.cos(this.posangle)*this.radiusx;
  pos[1]=0.0;
  pos[2]=Math.sin(this.posangle)*this.radiusz;
  
  mat4.rotate(mvmatrix, this.deviation, [0.0, 1.0, 0.0]);
  mat4.rotate(mvmatrix, this.inclination, [0.0, 0.0, 1.0]);
  mat4.translate(mvmatrix,pos);
  mat4.rotate(mvmatrix, this.anglex, [1.0, 0.0, 0.0]);
  mat4.rotate(mvmatrix, this.angley, [0.0, 1.0, 0.0]);
  mat4.rotate(mvmatrix, this.anglez, [0.0, 0.0, 1.0]);
  mat4.uniformscale(mvmatrix,this.size);
}

/**
 * Initialize the BVH tree for this object
 */
VirtualObject.prototype.initBVH = function() {
  if (!this.globject || !this.globject.indices) return;

  // Create array of triangle indices (each triangle is 3 consecutive indices)
  let triIndices = [];
  for (let i = 0; i < this.globject.indices.length; i += 3) {
    triIndices.push(i);
  }

  this.bvhRoot = this.buildBVH(triIndices);
}

/**
 * Build a BVH tree recursively
 */
VirtualObject.prototype.buildBVH = function(triIndices) {
  // Create a node for these triangles
  const node = new BVHNode(triIndices);

  // If this is a leaf node (single triangle), compute its bounds and return
  if (triIndices.length === 1) {
    this.computeNodeBounds(node);
    return node;
  }

  // Compute centroids of all triangles
  const centroids = [];
  for (let i = 0; i < triIndices.length; i++) {
    const triIndex = triIndices[i];
    const centroid = vec3.create();
    
    // Get the three vertices of the triangle
    const v1 = this.globject.positions[this.globject.indices[triIndex]];
    const v2 = this.globject.positions[this.globject.indices[triIndex + 1]];
    const v3 = this.globject.positions[this.globject.indices[triIndex + 2]];
    
    // Compute centroid
    vec3.add(centroid, v1, v2);
    vec3.add(centroid, centroid, v3);
    vec3.scale(centroid, centroid, 1/3);
    
    centroids.push({
      index: triIndex,
      centroid: centroid
    });
  }

  // Find axis with greatest spread
  let maxSpread = -1;
  let splitAxis = 0;
  for (let axis = 0; axis < 3; axis++) {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const c of centroids) {
      min = Math.min(min, c.centroid[axis]);
      max = Math.max(max, c.centroid[axis]);
    }
    const spread = max - min;
    if (spread > maxSpread) {
      maxSpread = spread;
      splitAxis = axis;
    }
  }

  // Sort triangles by centroid along split axis
  centroids.sort((a, b) => a.centroid[splitAxis] - b.centroid[splitAxis]);

  // Split into two groups
  const mid = Math.floor(centroids.length / 2);
  const leftIndices = centroids.slice(0, mid).map(c => c.index);
  const rightIndices = centroids.slice(mid).map(c => c.index);

  // Recursively build children
  node.left = this.buildBVH(leftIndices);
  node.right = this.buildBVH(rightIndices);

  // Compute bounds for this node
  this.computeNodeBounds(node);

  return node;
}

/**
 * Compute bounds for a node
 */
VirtualObject.prototype.computeNodeBounds = function(node) {
  if (node.isLeaf()) {
    // For leaf nodes, compute bounds from the triangle
    const i = node.triIndices[0];  // This is the starting index of the triangle
    const v1 = vec3.create(), v2 = vec3.create(), v3 = vec3.create();
    const posMatrix = mat4.create();
    mat4.identity(posMatrix);
    this.applyTranformations(posMatrix);
    
    // Get the three vertices of the triangle
    mat4.multiplyVec3(posMatrix, this.globject.positions[this.globject.indices[i]], v1);
    mat4.multiplyVec3(posMatrix, this.globject.positions[this.globject.indices[i+1]], v2);
    mat4.multiplyVec3(posMatrix, this.globject.positions[this.globject.indices[i+2]], v3);
    
    // Initialize with first vertex
    vec3.set(node.boxmin, v1[0], v1[1], v1[2]);
    vec3.set(node.boxmax, v1[0], v1[1], v1[2]);
    
    // Expand to include other vertices
    for (let j = 0; j < 3; j++) {
      node.boxmin[j] = Math.min(node.boxmin[j], v2[j], v3[j]);
      node.boxmax[j] = Math.max(node.boxmax[j], v2[j], v3[j]);
    }
  } else {
    // For internal nodes, merge child bounds
    vec3.set(node.boxmin, node.left.boxmin[0], node.left.boxmin[1], node.left.boxmin[2]);
    vec3.set(node.boxmax, node.left.boxmax[0], node.left.boxmax[1], node.left.boxmax[2]);
    
    // Expand to include right child
    for (let axis = 0; axis < 3; axis++) {
      node.boxmin[axis] = Math.min(node.boxmin[axis], node.right.boxmin[axis]);
      node.boxmax[axis] = Math.max(node.boxmax[axis], node.right.boxmax[axis]);
    }
  }
}

/**
 * Update the BVH tree after object movement
 */
VirtualObject.prototype.updateBVH = function() {
  if (!this.bvhRoot) return;
  this.updateNodeBoundsRecursive(this.bvhRoot);
}

/**
 * Update bounds recursively from leaves to root
 */
VirtualObject.prototype.updateNodeBoundsRecursive = function(node) {
  if (!node) return;
  
  if (node.isLeaf()) {
    this.computeNodeBounds(node);
  } else {
    this.updateNodeBoundsRecursive(node.left);
    this.updateNodeBoundsRecursive(node.right);
    this.computeNodeBounds(node);
  }
}

/*
 * Draw the object
 * @param mvmatrix is the view matrix, it is altered to take into account
 * the size and the position/orientation of the object
 */
VirtualObject.prototype.draw=function(mvmatrix)
{
  this.applyTranformations(mvmatrix);
  setModelViewMatrix(mvmatrix);

  setMaterialSpecular([1.0,1.0,1.0,1.0]);
  setMaterialShininess(200.0);

  if (this.collision)
    setMaterialColor([1.0, 0.0, 0.0, 1.0]);
  else
    setMaterialColor(this.color);
  
  this.globject.draw();
}


/*
 * Draw the object's AABB
 * @param mvmatrix is the view matrix, it is altered to take into account
 * the size of the box for display
 * @param box: graphics object to display to represent a box
 */
VirtualObject.prototype.drawAABB=function(mvmatrix, box)
{
  // Compute center of box
  let pos=vec3.create();
  vec3.add(this.boxmin,this.boxmax,pos);
  vec3.scale(pos,0.5);
  mat4.translate(mvmatrix,pos);
  
  // Compute size of box
  let scale=vec3.create();
  vec3.subtract(this.boxmax,this.boxmin,scale);
  mat4.scale(mvmatrix,scale);
  setModelViewMatrix(mvmatrix);

  setMaterialSpecular([1.0,1.0,1.0,1.0]);
  setMaterialShininess(200.0);

  if (this.collision)
    setMaterialColor([1.0, 0.0, 0.0, 1.0]);
  else
    setMaterialColor([1.0,1.0,1.0,1.0]);
    
  box.drawWireframe();
}

/**
 * Compute next step of the animation
 * It roughly only change the state (position/orientation) attributes
 * of the object
 * @param elapsed: time elapsed since last call. Useful to manage velocities
 */
VirtualObject.prototype.step=function(elapsed)
{
  this.anglex+=this.rotvelx*elapsed;
  this.angley+=this.rotvely*elapsed;
  this.anglez+=this.rotvelz*elapsed;
  this.posangle+=this.angularvelocity*elapsed;
  
  this.collision=false;
  this.computeAABB();
}

/**
 * Compute the current Axis-Aligned Bounding box of the object
 * It depends on the current position/orientation of the object
 */
VirtualObject.prototype.computeAABB=function()
{
  let posmatrix = mat4.create();
  mat4.identity(posmatrix);
  this.applyTranformations(posmatrix);

  let positions=this.globject.positions;
  let pos=vec3.create();
  
  // Initialize boxmin and boxmax with the first vertex position
  mat4.multiplyVec3(posmatrix, positions[0], pos);
  vec3.set(pos, this.boxmin);
  vec3.set(pos, this.boxmax);
  
  // Find min and max for all other vertices
  for(let i=1; i<positions.length; i++)
  {
    mat4.multiplyVec3(posmatrix, positions[i], pos);
    // Update min coordinates
    this.boxmin[0] = Math.min(this.boxmin[0], pos[0]);
    this.boxmin[1] = Math.min(this.boxmin[1], pos[1]);
    this.boxmin[2] = Math.min(this.boxmin[2], pos[2]);
    // Update max coordinates
    this.boxmax[0] = Math.max(this.boxmax[0], pos[0]);
    this.boxmax[1] = Math.max(this.boxmax[1], pos[1]);
    this.boxmax[2] = Math.max(this.boxmax[2], pos[2]);
  }
}

/**
 * Compute the axis-aligned bounding box of that object overlap with this' one
 * @param that: other object which bounding box has to be checked for collision
 * @return true if it is the case
 */
VirtualObject.prototype.compareAABB=function(that)
{
  // Check for overlap along all three axes
  return (this.boxmin[0] <= that.boxmax[0] && this.boxmax[0] >= that.boxmin[0] &&
          this.boxmin[1] <= that.boxmax[1] && this.boxmax[1] >= that.boxmin[1] &&
          this.boxmin[2] <= that.boxmax[2] && this.boxmax[2] >= that.boxmin[2]);
}

/**
 * Compare AABBs of two BVH nodes
 */
VirtualObject.prototype.compareNodeAABB = function(node1, node2) {
  return (node1.boxmin[0] <= node2.boxmax[0] && node1.boxmax[0] >= node2.boxmin[0] &&
          node1.boxmin[1] <= node2.boxmax[1] && node1.boxmax[1] >= node2.boxmin[1] &&
          node1.boxmin[2] <= node2.boxmax[2] && node1.boxmax[2] >= node2.boxmin[2]);
}

/**
 * Check if a point is on the positive or negative side of a plane
 * @param planeNormal Normal of the plane
 * @param planePoint Point on the plane
 * @param point Point to check
 * @returns Positive number if point is on positive side, negative if on negative side, 0 if on plane
 */
VirtualObject.prototype.pointPlaneSide = function(planeNormal, planePoint, point) {
  const v = vec3.create();
  vec3.subtract(point, planePoint, v);
  return vec3.dot(planeNormal, v);
}

/**
 * Compute intersection point between a line segment and a plane
 * @param p1 First point of line segment
 * @param p2 Second point of line segment
 * @param planeNormal Normal of the plane
 * @param planePoint Point on the plane
 * @returns Intersection point or null if no intersection
 */
VirtualObject.prototype.lineSegmentPlaneIntersection = function(p1, p2, planeNormal, planePoint) {
  const v = vec3.create();
  vec3.subtract(p2, p1, v);
  
  const d = vec3.dot(planeNormal, v);
  if (Math.abs(d) < 1e-7) return null; // Line is parallel to plane
  
  const p1ToPlane = vec3.create();
  vec3.subtract(planePoint, p1, p1ToPlane);
  const t = vec3.dot(planeNormal, p1ToPlane) / d;
  
  if (t < 0 || t > 1) return null; // Intersection outside segment
  
  const intersection = vec3.create();
  vec3.scale(v, t, intersection);
  vec3.add(p1, intersection, intersection);
  return intersection;
}

/**
 * Möller's triangle-triangle intersection test
 * @param tri1 Array of 3 vertices for first triangle
 * @param tri2 Array of 3 vertices for second triangle
 * @returns true if triangles intersect, false otherwise
 */
VirtualObject.prototype.triangleIntersectionTest = function(tri1, tri2) {
  // Compute normal for first triangle
  const v1 = vec3.create(), v2 = vec3.create(), n1 = vec3.create();
  vec3.subtract(tri1[1], tri1[0], v1); // AB
  vec3.subtract(tri1[2], tri1[0], v2); // AC
  vec3.cross(v1, v2, n1);
  vec3.normalize(n1);
  
  // Check if vertices of second triangle lie on both sides of first triangle's plane
  const d1_0 = this.pointPlaneSide(n1, tri1[0], tri2[0]);
  const d1_1 = this.pointPlaneSide(n1, tri1[0], tri2[1]);
  const d1_2 = this.pointPlaneSide(n1, tri1[0], tri2[2]);
  
  // If all vertices are on same side, no intersection
  if ((d1_0 > 0 && d1_1 > 0 && d1_2 > 0) || (d1_0 < 0 && d1_1 < 0 && d1_2 < 0)) {
    return false;
  }
  
  // Compute normal for second triangle
  const v3 = vec3.create(), v4 = vec3.create(), n2 = vec3.create();
  vec3.subtract(tri2[1], tri2[0], v3);
  vec3.subtract(tri2[2], tri2[0], v4);
  vec3.cross(v3, v4, n2);
  vec3.normalize(n2);
  
  // Check if vertices of first triangle lie on both sides of second triangle's plane
  const d2_0 = this.pointPlaneSide(n2, tri2[0], tri1[0]);
  const d2_1 = this.pointPlaneSide(n2, tri2[0], tri1[1]);
  const d2_2 = this.pointPlaneSide(n2, tri2[0], tri1[2]);
  
  // If all vertices are on same side, no intersection
  if ((d2_0 > 0 && d2_1 > 0 && d2_2 > 0) || (d2_0 < 0 && d2_1 < 0 && d2_2 < 0)) {
    return false;
  }
  
  // Find intersection line direction (cross product of normals)
  const u = vec3.create();
  vec3.cross(n1, n2, u);
  vec3.normalize(u);
  
  // Find intersection points for first triangle
  const intersections1 = [];
  if (d1_0 * d1_1 < 0) {
    const p = this.lineSegmentPlaneIntersection(tri2[0], tri2[1], n1, tri1[0]);
    if (p) intersections1.push(p);
  }
  if (d1_1 * d1_2 < 0) {
    const p = this.lineSegmentPlaneIntersection(tri2[1], tri2[2], n1, tri1[0]);
    if (p) intersections1.push(p);
  }
  if (d1_2 * d1_0 < 0) {
    const p = this.lineSegmentPlaneIntersection(tri2[2], tri2[0], n1, tri1[0]);
    if (p) intersections1.push(p);
  }
  
  // Find intersection points for second triangle
  const intersections2 = [];
  if (d2_0 * d2_1 < 0) {
    const p = this.lineSegmentPlaneIntersection(tri1[0], tri1[1], n2, tri2[0]);
    if (p) intersections2.push(p);
  }
  if (d2_1 * d2_2 < 0) {
    const p = this.lineSegmentPlaneIntersection(tri1[1], tri1[2], n2, tri2[0]);
    if (p) intersections2.push(p);
  }
  if (d2_2 * d2_0 < 0) {
    const p = this.lineSegmentPlaneIntersection(tri1[2], tri1[0], n2, tri2[0]);
    if (p) intersections2.push(p);
  }
  
  // If we don't have two intersection points for each triangle, no intersection
  if (intersections1.length !== 2 || intersections2.length !== 2) {
    return false;
  }
  
  // Project intersection points onto intersection line
  const proj1 = [
    vec3.dot(u, intersections1[0]),
    vec3.dot(u, intersections1[1])
  ];
  const proj2 = [
    vec3.dot(u, intersections2[0]),
    vec3.dot(u, intersections2[1])
  ];
  
  // Sort projections
  const min1 = Math.min(proj1[0], proj1[1]);
  const max1 = Math.max(proj1[0], proj1[1]);
  const min2 = Math.min(proj2[0], proj2[1]);
  const max2 = Math.max(proj2[0], proj2[1]);
  
  // Check if projections overlap
  return !(max1 < min2 || max2 < min1);
}

/**
 * Get triangle vertices in world space
 * @param triIndex Starting index of triangle in indices array
 * @returns Array of 3 vertices in world space
 */
VirtualObject.prototype.getTriangleVertices = function(triIndex) {
  const posMatrix = mat4.create();
  mat4.identity(posMatrix);
  this.applyTranformations(posMatrix);
  
  const vertices = [];
  for(let i = 0; i < 3; i++) {
    const vertexIndex = this.globject.indices[triIndex + i];
    const vertex = vec3.create();
    mat4.multiplyVec3(posMatrix, this.globject.positions[vertexIndex], vertex);
    vertices.push(vertex);
  }
  return vertices;
}

/**
 * Check collision between two BVH nodes
 */
VirtualObject.prototype.checkNodeCollision = function(node1, node2) {
  // First check if nodes overlap
  if (!this.compareNodeAABB(node1, node2)) {
    return false;
  }

  // If both are leaves, check triangle intersection
  if (node1.isLeaf() && node2.isLeaf()) {
    const tri1 = this.getTriangleVertices(node1.triIndices[0]);
    const tri2 = this.getTriangleVertices(node2.triIndices[0]);
    return this.triangleIntersectionTest(tri1, tri2);
  }

  // Compare volumes to decide which tree to descend
  const vol1 = node1.computeVolume();
  const vol2 = node2.computeVolume();

  if (!node1.isLeaf() && (node2.isLeaf() || vol1 > vol2)) {
    // Descend node1's tree
    return this.checkNodeCollision(node1.left, node2) || 
           this.checkNodeCollision(node1.right, node2);
  } else if (!node2.isLeaf()) {
    // Descend node2's tree
    return this.checkNodeCollision(node1, node2.left) || 
           this.checkNodeCollision(node1, node2.right);
  }
  return false;
}
