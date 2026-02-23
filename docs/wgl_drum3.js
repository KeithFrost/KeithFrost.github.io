const canvas = document.getElementById("canvas");
const width = window.innerWidth;
const height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const gl = canvas.getContext("webgl2");
if (!gl) { alert("WebGL2 not supported"); }

// Check for float texture support (needed to store unbounded wave values)
const extColorBufferFloat = gl.getExtension("EXT_color_buffer_float");
if (!extColorBufferFloat) { alert("Float framebuffers not supported"); }

// -------------------------------------------------------------------------
// Shader source
// -------------------------------------------------------------------------

// Minimal vertex shader — just a full-screen quad
const vsSource = `#version 300 es
in vec2 aPos;
out vec2 vUV;
void main() {
  vUV = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Simulation shader — reads pts and vels, writes new pts and vels
// We pack pts into one RGBA texture (R=ch0, G=ch1, B=ch2, A=unused)
// and vels into another RGBA texture the same way.
// We use a Multiple Render Target (MRT) draw to write both textures at once.
const simSource = `#version 300 es
precision highp float;

uniform sampler2D uPts;
uniform sampler2D uVels;
uniform float uDt;
uniform vec2 uTexelSize;  // 1/width, 1/height

in vec2 vUV;

layout(location = 0) out vec4 outPts;
layout(location = 1) out vec4 outVels;

void main() {
  vec3 cur  = texture(uPts, vUV).rgb;
  vec3 vel  = texture(uVels, vUV).rgb;

  // Neighbour average for each channel (same neighbour stencil for all channels)
  vec3 up    = texture(uPts, vUV + vec2(0.0,  uTexelSize.y)).rgb;
  vec3 upl   = texture(uPts, vUV + vec2(-uTexelSize.x, uTexelSize.y)).rgb;
  vec3 upr   = texture(uPts, vUV + vec2(uTexelSize.x, uTexelSize.y)).rgb;
  vec3 down  = texture(uPts, vUV + vec2(0.0, -uTexelSize.y)).rgb;
  vec3 downl = texture(uPts, vUV + vec2(-uTexelSize.x, -uTexelSize.y)).rgb;
  vec3 downr = texture(uPts, vUV + vec2(uTexelSize.x, -uTexelSize.y)).rgb;
  vec3 left  = texture(uPts, vUV + vec2(-uTexelSize.x, 0.0)).rgb;
  vec3 right = texture(uPts, vUV + vec2( uTexelSize.x, 0.0)).rgb;

  float c1 = 1.0 / 12.0;
  float c2 = 1.0 / 6.0;
  vec3 navg = c2 * (up + down + left + right) + c1 * (upl + upr + downl + downr);

  // Nonlinear coupling: sin(sum of all channels at this pixel)
  float s = cur.r + cur.g + cur.b;

  // Wave speeds per channel: 0.4 + 0.1*c => 0.4, 0.5, 0.6
  vec3 speed = vec3(0.40, 0.50, 0.60);

  vec3 accel = speed * (navg - cur) - 0.001 * sin(s);

  vec3 newVel = vel + uDt * accel;
  vec3 newPts = cur + newVel * uDt;

  outPts  = vec4(newPts,  1.0);
  outVels = vec4(newVel, 0.0);
}`;

// Display shader — converts pts field to colors via sin(), matching cval()
// cval(x) = floor(128 + 127.9999 * sin(x))  =>  in [0,255]
// In GLSL: color = 0.5 + 0.5*sin(x), giving [0,1]
const displaySource = `#version 300 es
precision highp float;

uniform sampler2D uPts;

in vec2 vUV;
out vec4 fragColor;

void main() {
  vec3 field = texture(uPts, vUV).rgb;
  vec3 color = 0.5 + 0.5 * sin(field);
  fragColor = vec4(color, 1.0);
}`;

// -------------------------------------------------------------------------
// Compile shaders and link programs
// -------------------------------------------------------------------------

function compileShader(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error("Shader compile error: " + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function makeProgram(vsSrc, fsSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Program link error: " + gl.getProgramInfoLog(prog));
  }
  return prog;
}

const simProg     = makeProgram(vsSource, simSource);
const displayProg = makeProgram(vsSource, displaySource);

// -------------------------------------------------------------------------
// Full-screen quad geometry
// -------------------------------------------------------------------------

const quadVerts = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

function bindQuad(prog) {
  const loc = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(loc);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
}

// -------------------------------------------------------------------------
// Float textures and framebuffers — two of each for ping-pong
// -------------------------------------------------------------------------

function makeFloatTexture(data) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0,
                gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// Build initial pts data matching your original initialisation loop.
// Original: pts[i] = 0.25*(above neighbours) + 0.1*(3-c)*random
// We do a simple approximation: just seed with small random noise
// (the original loop was building spatially correlated noise by scanning
// top-to-bottom, treating already-written values as neighbours —
// we replicate that here on the CPU before upload)
const initPts  = new Float32Array(width * height * 4); // RGBA
const initVels = new Float32Array(width * height * 4); // all zeros

// Replicate the original initialisation scan
const tmpPts = new Float32Array(3 * width * height);
for (let y = 1; y < height - 1; y++) {
  for (let x = 1; x < width - 1; x++) {
    for (let c = 0; c < 3; c++) {
      const i  = 3 * (width * y + x) + c;
      const iU = i - 3 * width;  // above
      tmpPts[i] = 0.25 * (
	tmpPts[iU] + tmpPts[iU - 3] + tmpPts[iU + 3] + tmpPts[i - 3])
        + 0.1 * (3 - c) * (Math.random() - 0.5);
    }
  }
}
// Pack into RGBA
for (let p = 0; p < width * height; p++) {
  initPts[p * 4 + 0] = tmpPts[p * 3 + 0];
  initPts[p * 4 + 1] = tmpPts[p * 3 + 1];
  initPts[p * 4 + 2] = tmpPts[p * 3 + 2];
  initPts[p * 4 + 3] = 0.0;
}

// Ping: index 0, Pong: index 1
const ptsTex  = [makeFloatTexture(initPts),  makeFloatTexture(null)];
const velsTex = [makeFloatTexture(null),      makeFloatTexture(null)];

// Framebuffers with MRT: each FBO writes to pts[i] and vels[i] simultaneously
function makeFBO(ptsTex, velsTex) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, ptsTex, 0);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1,
                          gl.TEXTURE_2D, velsTex, 0);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Framebuffer incomplete: " + status);
  }
  return fbo;
}

const fbos = [
  makeFBO(ptsTex[0], velsTex[0]),
  makeFBO(ptsTex[1], velsTex[1]),
];

// -------------------------------------------------------------------------
// Uniform locations
// -------------------------------------------------------------------------

const simUniforms = {
  uPts:       gl.getUniformLocation(simProg, "uPts"),
  uVels:      gl.getUniformLocation(simProg, "uVels"),
  uDt:        gl.getUniformLocation(simProg, "uDt"),
  uTexelSize: gl.getUniformLocation(simProg, "uTexelSize"),
};

const displayUniforms = {
  uPts: gl.getUniformLocation(displayProg, "uPts"),
};

// -------------------------------------------------------------------------
// Render loop
// -------------------------------------------------------------------------

let read = 0;   // which ping-pong buffer to read from
let pTime = 0;
let frameCount = 0;
let elapsed = 0;

function animate(time) {
  const deltaTime = time - pTime;
  if (deltaTime < 200) {
    elapsed += 0.001 * deltaTime;
    frameCount++;
    if (elapsed > 20.0) {
      console.log("fps = " + (frameCount / elapsed));
      frameCount = 0;
      elapsed = 0;
    }
  } else {
    frameCount = 0;
    elapsed = 0;
  }

  let dt = 0.02 * deltaTime;
  if (dt > 1.0 || dt < 0.0) dt = 1.0;
  pTime = time;

  const write = 1 - read;

  // --- Simulation pass: read from 'read', write to 'write' FBO ---
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbos[write]);
  gl.viewport(0, 0, width, height);

  gl.useProgram(simProg);
  bindQuad(simProg);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptsTex[read]);
  gl.uniform1i(simUniforms.uPts, 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, velsTex[read]);
  gl.uniform1i(simUniforms.uVels, 1);

  gl.uniform1f(simUniforms.uDt, dt);
  gl.uniform2f(simUniforms.uTexelSize, 1.0 / width, 1.0 / height);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // --- Display pass: render to screen ---
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, width, height);

  gl.useProgram(displayProg);
  bindQuad(displayProg);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ptsTex[write]);
  gl.uniform1i(displayUniforms.uPts, 0);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Swap ping-pong
  read = write;

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
