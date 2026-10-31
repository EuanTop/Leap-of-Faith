import * as THREE from 'three';

export const SUN_DIRECTION=new THREE.Vector3(-.62,.70,.35).normalize();
export const LENS_VERTEX_HEADER=`
 attribute vec3 aLensSide,aLensUp;
 attribute vec2 aLensCoord;
 varying vec3 vLensSide,vLensUp,vLensWorld;
 varying vec2 vLensCoord;
`;
export const LENS_VERTEX_BODY=`
 vLensSide=normalize(mat3(modelMatrix)*aLensSide);vLensUp=normalize(mat3(modelMatrix)*aLensUp);vLensCoord=aLensCoord;
 vLensWorld=(modelMatrix*vec4(position,1.)).xyz;
`;
export const LENS_FRAGMENT_HEADER=`
 uniform float uLensPhase;
 varying vec3 vLensSide,vLensUp,vLensWorld;
 varying vec2 vLensCoord;
`;
// A local cylindrical-lens approximation. Snell rays from the actual curved
// crown meet the walking plane; their footprint density forms the caustic.
// This is an art-directed optical approximation, not a path-traced solution
// of the hollow, multiple-interface glass shell.
export const REFRACTION_GLSL=`
 vec3 lensLight(){
  vec3 side=normalize(vLensSide),up=normalize(vLensUp);
  vec3 light=normalize(vec3(-.62,.70,.35));
  float radius=vLensCoord.y,x=vLensCoord.x,core=0.,halo=0.;
  for(int i=0;i<18;i++){
   float angle=(float(i)+.5)/18.*3.14159265;
   // Small, continuous surface imperfections soften otherwise exact bands.
   angle+=.018*sin(vLensWorld.y*.81+vLensWorld.z*.42+float(i)*1.7+sin(uLensPhase)*.35);
   vec3 n=cos(angle)*side+sin(angle)*up;
   float incident=max(0.,dot(n,light));
   vec3 ray=refract(-light,n,1./1.32);
   float vertical=dot(ray,up);
   float travel=(-1.05-radius*sin(angle))/min(vertical,-.08);
   float arrival=radius*cos(angle)+dot(ray,side)*travel;
   float width=.052+.018*sin(float(i)*2.3+vLensWorld.y*.3);
   float offset=x-arrival;
   core+=exp(-pow(offset/width,2.))*incident*step(.01,travel)*step(vertical,-.025);
   halo+=exp(-pow(offset/(width*3.5),2.))*incident*step(.01,travel)*step(vertical,-.025);
  }
  float window=.28+.72*pow(.5+.5*sin(dot(vLensWorld,vec3(.33,.12,.27))+.17*sin(uLensPhase)),2.);
  float veil=.88+.12*sin(vLensWorld.z*1.6+vLensWorld.x*.7+uLensPhase);
  return vec3(.95,.73,.40)*min(core*.58+halo*.09,1.7)*window*veil;
 }
`;
export function refractedFloor(phase:THREE.IUniform<number>){
 const material=new THREE.MeshStandardMaterial({color:'#825199',roughness:.52,metalness:.06,side:THREE.DoubleSide});
 material.onBeforeCompile=(shader:any)=>{
  shader.uniforms.uLensPhase=phase;
  shader.vertexShader=LENS_VERTEX_HEADER+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+LENS_VERTEX_BODY);
  shader.fragmentShader=LENS_FRAGMENT_HEADER+REFRACTION_GLSL+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float sunlight=clamp(dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))*1.6,0.,1.);
   outgoingLight+=lensLight()*(.10+.90*sunlight)*.60;
   #include <opaque_fragment>
  `);
 };
 material.customProgramCacheKey=()=> 'cylindrical-refracted-floor-v1';
 return material;
}

export function createLightDesign(scene:THREE.Scene,renderer:THREE.WebGLRenderer){
 renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.03;
 scene.add(new THREE.HemisphereLight('#f4e6ff','#644079',.90));
 const sun=new THREE.DirectionalLight('#fff0cf',3.1);
 sun.target.position.set(0,5,0);sun.position.copy(SUN_DIRECTION).multiplyScalar(31).add(sun.target.position);
 sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
 Object.assign(sun.shadow.camera,{left:-18,right:18,top:19,bottom:-19,near:2,far:75});
 sun.shadow.bias=-.00015;sun.shadow.normalBias=.022;
 scene.add(sun,sun.target);
 const fill=new THREE.DirectionalLight('#c5a5ff',.58);fill.position.set(14,8,4);scene.add(fill);
 const rim=new THREE.DirectionalLight('#ffe4ac',1.35);rim.position.set(4,15,-18);scene.add(rim);
 const phase={value:0},glows=new THREE.Group();scene.add(glows);
 // Broad local glows sit on the glass; there are no long freestanding beams.
 for(const [position,size,gain] of [
  [new THREE.Vector3(-5.5,4.6,1.2),4.0,.13],
  [new THREE.Vector3(3.0,8.4,4.7),3.6,.12],
  [new THREE.Vector3(4.3,5.1,-4.1),4.4,.10],
 ] as [THREE.Vector3,number,number][]){
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
   uniforms:{uPhase:phase,uGain:{value:gain},uSize:{value:size}},
   vertexShader:`uniform float uSize;varying vec2 vUv;
    void main(){vUv=uv;vec4 center=modelViewMatrix*vec4(0.,0.,0.,1.);center.xy+=position.xy*uSize;gl_Position=projectionMatrix*center;}`,
   fragmentShader:`uniform float uPhase,uGain;varying vec2 vUv;
    void main(){vec2 p=(vUv-.5)*2.;float r=dot(p,p);float veil=exp(-r*5.)*(1.-smoothstep(.5,1.,r));
     gl_FragColor=vec4(1.,.74,.30,veil*uGain*(.92+.08*sin(uPhase)));
     #include <colorspace_fragment>
    }`});
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),material);glow.position.copy(position);glow.renderOrder=6;glows.add(glow);
 }
 return {sun,phase,glows,update(time:number){phase.value=time/28.8*Math.PI*2;}};
}
