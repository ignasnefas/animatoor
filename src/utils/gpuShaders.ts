/**
 * GPU-Accelerated Shaders for Performance
 * Uses WebGL 2.0 context for efficient pixelation and dithering
 */

const PIXELATION_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 position;
in vec2 texCoord;

out vec2 vTexCoord;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  vTexCoord = texCoord;
}`;

const PIXELATION_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uPixelSize;
uniform vec2 uTexSize;

in vec2 vTexCoord;
out vec4 fragColor;

void main() {
  vec2 pixelCoord = floor(vTexCoord * uTexSize / uPixelSize) * uPixelSize / uTexSize;
  fragColor = texture(uTexture, pixelCoord);
}`;

const DITHERING_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec2 uTexSize;
uniform float uIntensity;
uniform float uResolution;

in vec2 vTexCoord;
out vec4 fragColor;

// Bayer 4x4 matrix
const mat4 bayerMatrix = mat4(
  0.0, 8.0, 2.0, 10.0,
  12.0, 4.0, 14.0, 6.0,
  3.0, 11.0, 1.0, 9.0,
  15.0, 7.0, 13.0, 5.0
) / 16.0;

vec3 dither(vec3 color, vec2 texCoord) {
  vec2 pixelCoord = texCoord * uTexSize;
  vec2 bayerCoord = mod(pixelCoord, 4.0);
  float threshold = bayerMatrix[int(bayerCoord.x)][int(bayerCoord.y)];
  
  return color + (threshold - 0.5) * uIntensity / 255.0;
}

void main() {
  vec4 texColor = texture(uTexture, vTexCoord);
  vec3 dithered = dither(texColor.rgb, vTexCoord);
  fragColor = vec4(dithered, texColor.a);
}`;

const PALETTE_REDUCTION_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D uTexture;
uniform vec3 uPalette[256];
uniform int uPaletteSize;

in vec2 vTexCoord;
out vec4 fragColor;

vec3 findNearestColor(vec3 color) {
  float minDist = 1e10;
  vec3 nearest = color;
  
  for (int i = 0; i < 256; i++) {
    if (i >= uPaletteSize) break;
    
    vec3 dist = color - uPalette[i];
    float d = dot(dist, dist);
    
    if (d < minDist) {
      minDist = d;
      nearest = uPalette[i];
    }
  }
  
  return nearest;
}

void main() {
  vec4 texColor = texture(uTexture, vTexCoord);
  vec3 reduced = findNearestColor(texColor.rgb);
  fragColor = vec4(reduced, texColor.a);
}`;

/**
 * WebGL shader program manager
 */
class ShaderProgram {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;

  constructor(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string) {
    this.gl = gl;
    this.program = this.createProgram(vertexSource, fragmentSource);
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);

    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create WebGL program');

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      throw new Error('Failed to link WebGL program');
    }

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) throw new Error('Failed to create shader');

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      throw new Error('Failed to compile shader');
    }

    return shader;
  }

  use(): void {
    this.gl.useProgram(this.program);
  }

  getUniformLocation(name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(this.program, name);
  }

  getAttribLocation(name: string): number {
    return this.gl.getAttribLocation(this.program, name);
  }

  dispose(): void {
    this.gl.deleteProgram(this.program);
  }
}

/**
 * GPU Effects Engine - handles GPU-accelerated visual effects
 */
export class GPUEffectsEngine {
  private gl: WebGL2RenderingContext | null = null;
  private pixelationProgram: ShaderProgram | null = null;
  private ditheringProgram: ShaderProgram | null = null;
  private paletteProgram: ShaderProgram | null = null;
  private quad: WebGLVertexArrayObject | null = null;
  private framebuffer: WebGLFramebuffer | null = null;
  private texture: WebGLTexture | null = null;

  /**
   * Initialize GPU effects from canvas
   */
  initializeFromCanvas(canvas: HTMLCanvasElement): boolean {
    try {
      const gl = canvas.getContext('webgl2', {
        preserveDrawingBuffer: true,
        antialias: false,
      });

      if (!gl) return false;

      this.gl = gl;
      this.setupQuad();
      this.createPrograms();
      this.createFramebuffer(canvas.width, canvas.height);

      return true;
    } catch (e) {
      console.warn('GPU effects not available:', e);
      return false;
    }
  }

  private setupQuad(): void {
    if (!this.gl) return;

    const positions = new Float32Array([
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      1, 1, 1, 1,
    ]);

    const vao = this.gl.createVertexArray();
    if (!vao) throw new Error('Failed to create VAO');

    this.gl.bindVertexArray(vao);

    const vbo = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    this.quad = vao;
  }

  private createPrograms(): void {
    if (!this.gl) return;

    this.pixelationProgram = new ShaderProgram(
      this.gl,
      PIXELATION_VERTEX_SHADER,
      PIXELATION_FRAGMENT_SHADER
    );

    this.ditheringProgram = new ShaderProgram(
      this.gl,
      PIXELATION_VERTEX_SHADER,
      DITHERING_FRAGMENT_SHADER
    );

    this.paletteProgram = new ShaderProgram(
      this.gl,
      PIXELATION_VERTEX_SHADER,
      PALETTE_REDUCTION_FRAGMENT_SHADER
    );
  }

  private createFramebuffer(width: number, height: number): void {
    if (!this.gl) return;

    const fb = this.gl.createFramebuffer();
    const tex = this.gl.createTexture();

    if (!fb || !tex) throw new Error('Failed to create framebuffer resources');

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
    this.gl.bindTexture(this.gl.TEXTURE_2D, tex);

    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );

    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      tex,
      0
    );

    this.framebuffer = fb;
    this.texture = tex;
  }

  /**
   * Apply pixelation effect using GPU
   */
  applyPixelation(
    sourceCanvas: HTMLCanvasElement,
    targetCanvas: HTMLCanvasElement,
    pixelSize: number
  ): boolean {
    if (!this.gl || !this.pixelationProgram) return false;

    try {
      const program = this.pixelationProgram;
      program.use();

      const uPixelSize = program.getUniformLocation('uPixelSize');
      const uTexSize = program.getUniformLocation('uTexSize');

      this.gl.uniform2f(uPixelSize, pixelSize, pixelSize);
      this.gl.uniform2f(uTexSize, sourceCanvas.width, sourceCanvas.height);

      // Render using quad
      if (this.quad) {
        this.gl.bindVertexArray(this.quad);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }

      return true;
    } catch (e) {
      console.warn('Pixelation failed:', e);
      return false;
    }
  }

  /**
   * Apply dithering effect using GPU
   */
  applyDithering(
    sourceCanvas: HTMLCanvasElement,
    intensity: number,
    resolution: number
  ): boolean {
    if (!this.gl || !this.ditheringProgram) return false;

    try {
      const program = this.ditheringProgram;
      program.use();

      const uIntensity = program.getUniformLocation('uIntensity');
      const uTexSize = program.getUniformLocation('uTexSize');
      const uResolution = program.getUniformLocation('uResolution');

      this.gl.uniform1f(uIntensity, intensity);
      this.gl.uniform2f(uTexSize, sourceCanvas.width, sourceCanvas.height);
      this.gl.uniform1f(uResolution, resolution);

      if (this.quad) {
        this.gl.bindVertexArray(this.quad);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
      }

      return true;
    } catch (e) {
      console.warn('Dithering failed:', e);
      return false;
    }
  }

  resizeFramebuffer(width: number, height: number): void {
    if (!this.gl || !this.texture) return;

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );
  }

  dispose(): void {
    if (this.pixelationProgram) this.pixelationProgram.dispose();
    if (this.ditheringProgram) this.ditheringProgram.dispose();
    if (this.paletteProgram) this.paletteProgram.dispose();
  }
}

export default GPUEffectsEngine;
