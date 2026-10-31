import {BACKGROUND_GLSL} from './background.ts';
// The reflection is rendered from the scene; wave slopes bend its projective lookup.
// All temporal frequencies are integers of the artwork loop, including the wakes.
export const LAKE_VERTEX = `
uniform mat4 textureMatrix;
varying vec4 vReflection;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.);
  vWorld = world.xyz;
  vReflection = textureMatrix * vec4(position, 1.);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

export const LAKE_FRAGMENT = `
uniform sampler2D tDiffuse;
uniform float phase, wind, trail;
uniform vec3 color;
uniform vec2 swimmer;
uniform float viewportHeight;
${BACKGROUND_GLSL}
uniform vec4 wakes[8]; // world x, z, heading, age
varying vec4 vReflection;
varying vec3 vWorld;

vec2 waveSlope(vec2 p, vec2 k, float amplitude, float clock, float bend) {
  vec2 b = vec2(-k.y, k.x) * .37;
  float domain = dot(b, p) - phase * 2.;
  float a = dot(k, p) + clock + bend * sin(domain);
  return amplitude * cos(a) * (k + bend * cos(domain) * b);
}

void main() {
  vec2 p = vWorld.xz;
  // Broad swells and a slower cross-current: no parallel diagonal stripe overlay.
  vec2 slope = waveSlope(p, vec2(.52, .83), .115, phase * 3., 1.1);
  slope += waveSlope(p, vec2(-1.13, .41), .047, -phase * 4., .7);
  slope += waveSlope(p, vec2(.24, 1.91), .019, phase * 7., .9);
  // Shorter capillary folds break reflected vertical edges into flowing ribbons.
  // Their height stays small; the oblique camera makes their slopes legible.
  slope += waveSlope(p, vec2(.15, 12.7), .0038, -phase * 9., 1.25);
  slope += waveSlope(p, vec2(-.40, 22.3), .0012, phase * 11., .8);
  float breeze = .68 + .32 * sin(dot(p, vec2(.11, -.17)) + phase);
  slope *= wind * breeze;

  // Disturb the reflected image where the duck has actually passed.
  for (int i=0; i<8; i++) {
    vec4 wake = wakes[i];
    vec2 delta = p - wake.xy;
    float r = max(length(delta), .001);
    vec2 direction = vec2(sin(wake.z), cos(wake.z));
    float behind = (1. - smoothstep(-.65, .2, dot(delta / r, direction)));
    float front = r - (.14 + wake.w * .42);
    float packet = exp(-front * front * 8.) * exp(-wake.w * .60) * behind;
    slope += delta / r * sin(front * 17.) * packet * .065 * trail;
  }
  // Keep the symbolic swan legible while waves travel around it.
  vec2 fromSwimmer = p - swimmer;
  slope *= 1. - .76 * exp(-dot(fromSwimmer, fromSwimmer) / 12.);
  vec3 normal = normalize(vec3(-slope.x, 1., -slope.y));
  vec3 view = normalize(cameraPosition - vWorld);
  float fresnel = .0204 + .9796 * pow(1. - max(dot(normal, view), 0.), 5.);

  vec2 uv = vReflection.xy / vReflection.w;
  // Slopes stretch and compress the image, rather than merely sliding it sideways.
  float proximity = (1. - smoothstep(12., 70., distance(vWorld, cameraPosition)));
  vec2 bend = slope * vec2(.060, .034) * mix(.45, 1., proximity);
  bend.x += slope.y * .010;
  vec2 reflectedUV = uv + bend;
  vec2 spread = vec2(.0010, .0004) * ( .35 + length(slope) * 3. );
  vec4 sampleColour = texture2D(tDiffuse, reflectedUV) * .66;
  sampleColour += texture2D(tDiffuse, reflectedUV + spread) * .17;
  sampleColour += texture2D(tDiffuse, reflectedUV - spread) * .17;
  float coverage=clamp(sampleColour.a,0.,1.);
  vec3 reflected=sampleColour.rgb/max(coverage,.001);
  float fromTop=1.-gl_FragCoord.y/viewportHeight;
  vec3 background=artworkBackground(fromTop);
  float reflectance=mix(.72,.95,fresnel);
  vec3 col=mix(background,reflected,coverage*reflectance);

  // Sparse, broken lilac wave crests pick up the same local reflected illumination.
  float crest = pow(max(0., sin(dot(p, vec2(.24, 1.91)) + phase * 7.
                    + .9 * sin(dot(p, vec2(-.707, .089)) - phase * 2.))), 20.);
  float broken = smoothstep(.28, .82, sin(p.x * .73 + sin(p.y * .23) + phase * 2.));
  float light = smoothstep(.035, .34, dot(reflected, vec3(.2126, .7152, .0722)));
  col += vec3(.18, .14, .08) * crest * broken * (.12 + light) * wind * .22 * smoothstep(.52,.78,fromTop);

  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
