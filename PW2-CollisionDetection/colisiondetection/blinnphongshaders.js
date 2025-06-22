var fragsrc=
"precision mediump float;\n"
// Lighting
+"uniform bool uLighting;\n"
+"uniform vec4 uAmbiantLight;\n"
+"uniform vec3 uLightPos;\n"
+"uniform vec4 uLightColor;\n"
+"uniform vec4 uLightSpecular;\n"
+"uniform float uConstantAttenuation;\n"
+"uniform float uLinearAttenuation;\n"
+"uniform float uQuadraticAttenuation;\n"

// Material
+"uniform vec4 uMaterialColor;\n"
+"uniform vec4 uMaterialSpecular;\n"
+"uniform float uMaterialShininess;\n"

+"void pointLight(in vec3 normal, in vec3 eye, in vec3 pos,\n"
+"                out vec4 ambient,out vec4 diffuse,out vec4 specular)\n"
+"{\n"
+"   float nDotVP;       // normal . light direction\n"
+"   float nDotHV;       // normal . light half vector\n"
+"   float pf;           // power factor\n"
+"   float attenuation;  // computed attenuation factor\n"
+"   float d;            // distance from surface to light source\n"
+"   vec3  VP;           // direction from surface to light position\n"
+"   vec3  halfVector;   // direction of maximum highlights\n"

  // Compute vector from surface to light position
+"   VP = uLightPos - pos;\n"

  // Compute distance between surface and light position
+"   d = length(VP);\n"

  // Normalize the vector from surface to light position
+"   VP /= d;\n"

  // Compute attenuation
+"   attenuation = 1.0 / (uConstantAttenuation +\n"
+"       uLinearAttenuation * d +\n"
+"       uQuadraticAttenuation * d * d);\n"

+"   halfVector = normalize(VP + eye);\n"

+"   nDotVP = max(0.0, dot(normal, VP));\n"
+"   nDotHV = max(0.0, dot(normal, halfVector));\n"

+"   if (nDotVP == 0.0) {\n"
+"       pf = 0.0;\n"
+"   } else {\n"
+"       pf = pow(nDotHV, uMaterialShininess);\n"
+"   }\n"
+"   ambient  = uAmbiantLight * attenuation; ambient.a=uAmbiantLight.a;\n"
+"   diffuse  = uLightColor * nDotVP * attenuation; diffuse.a=uLightColor.a;\n"
+"   specular = uLightSpecular * pf * attenuation; specular.a=uLightSpecular.a;\n"
+"}"


// vertex (and fragment) position in observer's space
+"varying vec4 position;\n"
// vertex normal in world space
+"varying vec3 normal;\n"

+"void main()"
+"{"
+"  vec4 amb;\n"
+"  vec4 dif;\n"
+"  vec4 spec;\n;"

+"  vec3 ecpos3=vec3(position)/position.w;"
+"  vec3 eye=-normalize(ecpos3);"
+"  vec3 norm=normalize(normal);"

+"  if (uLighting) {\n"
+"    pointLight(norm,eye,ecpos3,amb,dif,spec);\n"
+"    gl_FragColor=(amb+dif)*uMaterialColor+spec*uMaterialSpecular;\n"
+"  } else {\n"
+"    gl_FragColor=uMaterialColor;\n"
+"  }\n"
+"}\n";

var vertsrc=
  // Matrices
 "uniform mat4 uModelViewMatrix;\n"
+"uniform mat4 uProjectionMatrix;\n"
+"uniform mat3 uNormalMatrix;\n"

  // Material
+"uniform bool uNormalizing;\n"

  // Vertex attributes
+"attribute vec3 aVertexPosition;\n"
+"attribute vec3 aVertexNormal;\n"

 // Vertex (and fragment) position in observer's space
+"varying vec4 position;\n"
 // Vertex normal in world space
+"varying vec3 normal;\n"

+"void main() {\n"
+"  position=uModelViewMatrix*vec4(aVertexPosition, 1.0);\n"
+"  normal = uNormalMatrix * aVertexNormal;\n"
+"  if (uNormalizing) normal=normalize(normal);\n"
+"  gl_Position= uProjectionMatrix*position;\n"
+"}\n";


/*
 * Get shaders variables
 */
function setGlVariables(shaderProgram)
{
  // Variables for matrices 
  shaderProgram.uProjectionMatrix = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
  shaderProgram.uModelViewMatrix = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
  shaderProgram.uNormalMatrix = gl.getUniformLocation(shaderProgram, "uNormalMatrix");

  // Variables for light source
  shaderProgram.uLighting = gl.getUniformLocation(shaderProgram, "uLighting");
  shaderProgram.uAmbiantLight = gl.getUniformLocation(shaderProgram, "uAmbiantLight");
  shaderProgram.uLightPosition = gl.getUniformLocation(shaderProgram, "uLightPos");
  shaderProgram.uLightColor = gl.getUniformLocation(shaderProgram, "uLightColor");  
  shaderProgram.uLightSpecular = gl.getUniformLocation(shaderProgram, "uLightSpecular");
  shaderProgram.uConstantAttenuation = gl.getUniformLocation(shaderProgram, "uConstantAttenuation");
  shaderProgram.uLinearAttenuation = gl.getUniformLocation(shaderProgram, "uLinearAttenuation");
  shaderProgram.uQuadraticAttenuation = gl.getUniformLocation(shaderProgram, "uQuadraticAttenuation");

  // Variables for material
  shaderProgram.uNormalizing = gl.getUniformLocation(shaderProgram, "uNormalizing");
  shaderProgram.uMaterialColor = gl.getUniformLocation(shaderProgram, "uMaterialColor");
  shaderProgram.uMaterialSpecular = gl.getUniformLocation(shaderProgram, "uMaterialSpecular");
  shaderProgram.uMaterialShininess = gl.getUniformLocation(shaderProgram, "uMaterialShininess");

  // vertex attributes
  shaderProgram.aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.aVertexPosition);

  shaderProgram.aVertexNormal = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.aVertexNormal);
}

/* Matrix functions */
/* ================ */
function setModelViewMatrix(matrix)
{
  gl.uniformMatrix4fv(shaderProgram.uModelViewMatrix, false, matrix);
  
  let normal_matrix = mat3.create();
  mat4.toInverseMat3(matrix, normal_matrix);
  mat3.transpose(normal_matrix);
  gl.uniformMatrix3fv(shaderProgram.uNormalMatrix, false, normal_matrix);
}

function setProjectionMatrix(matrix)
{
  gl.uniformMatrix4fv(shaderProgram.uProjectionMatrix, false, matrix);
}


/* Source light function */
/* ===================== */
function setLighting(state)
{
  gl.uniform1i(shaderProgram.uLighting,state);
}

function setAmbiantLight(amblight)
{
  gl.uniform4fv(shaderProgram.uAmbiantLight,amblight);
}

function setLightPosition(lightpos)
{
  gl.uniform3fv(shaderProgram.uLightPosition,lightpos);
}

function setLightColor(lightcolor)
{
  gl.uniform4fv(shaderProgram.uLightColor,lightcolor);
}

function setLightSpecular(lightspec)
{
  gl.uniform4fv(shaderProgram.uLightSpecular,lightspec);
}

function setLightAttenuation(constant,linear,quadratic)
{
  gl.uniform1f(shaderProgram.uConstantAttenuation,constant);
  gl.uniform1f(shaderProgram.uLinearAttenuation,linear);
  gl.uniform1f(shaderProgram.uQuadraticAttenuation,quadratic);
}

/* Material functions */
/* ================== */
function setNormalizing(state)
{
  gl.uniform1i(shaderProgram.uNormalizing,state);
}

function setMaterialColor(matcolor)
{
  gl.uniform4fv(shaderProgram.uMaterialColor,matcolor);
}

function setMaterialSpecular(matspec)
{
  gl.uniform4fv(shaderProgram.uMaterialSpecular,matspec);
}

function setMaterialShininess(shininess)
{
  gl.uniform1f(shaderProgram.uMaterialShininess,shininess);
}

/* Attributes handling */
/* =================== */
function setPositionsPointer(size,dtype)
{
  gl.vertexAttribPointer(shaderProgram.aVertexPosition,size,dtype,false,0,0);
}

function setNormalsPointer(size,dtype)
{
  gl.vertexAttribPointer(shaderProgram.aVertexNormal,
    size, dtype, false, 0, 0);
}
  
