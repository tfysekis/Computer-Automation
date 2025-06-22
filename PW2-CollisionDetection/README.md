# Collision Detection Implementation Report

## What We Implemented

### Task 1: Basic Collision Detection
We started with implementing the basic AABB (Axis-Aligned Bounding Box) collision detection. This involved:
- Computing the bounding boxes in `computeAABB()`
- Making sure the boxes were visible (they show up as white wireframes)
- Writing the overlap test in `compareAABB()`
- Adding collision detection in the main simulation loop

This part worked well, though the boxes were bigger than needed sometimes.

### Task 2: Sweep and Prune
For better performance, we implemented the Sweep & Prune algorithm:
- Made three sorted lists (one for each axis)
- Used bubble sort to keep them updated
- Created overlap matrices to track collisions

The sorting helped reduce the number of checks needed, making things faster when there are lots of objects.

### Task 3: BVH Implementation
This was tricky. We built a binary tree for each object where:
- Each node holds a subset of triangles
- Leaf nodes have just one triangle
- Used the median split approach to keep the tree balanced

We had some issues with object movement at first because we were updating the BVH wrong, but fixed it by properly handling the transformations.

### Task 4: Möller's Triangle Intersection
The most challenging part. We implemented:
- Checking if vertices are on different sides of triangles
- Finding where edges intersect the other triangle's plane
- Testing if the intersection segments overlap

This gives much more accurate collisions than just using bounding boxes, though it's more complex and slower.

## Problems We Ran Into
1. Objects sometimes moved differently than in the original code
2. Had to fix some BVH update issues
3. Collision detection occasionally missed some intersections
4. Performance could be better with many objects

## What Works and What Doesn't
Works:
- Basic AABB collision detection
- Sweep and Prune optimization
- BVH structure and updates
- Möller's algorithm for triangle intersection
- Visual feedback (objects turn red on collision)

Doesn't Work:
- Detecting when one object is completely inside another (but this wasn't required)
- Some edge cases in triangle intersection might be missed
- Movement patterns aren't exactly like the original

## Note to Teacher
We implemented all four main tasks, though there might be some minor issues with the exact triangle intersection test. The code follows the general approach discussed in class, using bounding volume hierarchies and Möller's algorithm for the final intersection test. 