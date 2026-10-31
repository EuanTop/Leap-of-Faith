import * as THREE from 'three';

// The grid contains parameters, not a sculpted shape. Both geometry and normals
// are evaluated on the GPU. Signed powers span ellipsoids and rounded cuboids.
const surface=`
uniform float uTime,uPower,uBend,uWave,uFrequency,uLobes;
uniform vec3 uShape;
float sp(float a,float e){return abs(a)<.000001?0.:sign(a)*pow(abs(a),e);}
vec3 form(vec2 q){
 float a=q.x*6.2831853,b=(q.y-.5)*3.14159265;
 vec3 p=vec3(sp(cos(b),uPower)*sp(cos(a),uPower),sp(sin(b),uPower),sp(cos(b),uPower)*sp(sin(a),uPower))*uShape;
 float radius=1.+uLobes*.12*cos(a*6.+uTime*6.2831853/28.8);p.xz*=radius;
 float phase=uTime*6.2831853/28.8;
 float f=sin(a*uFrequency+phase*5.)*sin(b*2.+phase*3.);
 p.x+=uBend*p.y*p.y+uWave*f*(.3+.7*q.y);
 p.z+=uWave*cos(a*3.-phase*4.)*sin(b*2.);
 return p;
}
`;
export interface Form {mesh:THREE.Mesh;time:THREE.IUniform<number>;wave:THREE.IUniform<number>;bend:THREE.IUniform<number>;power:THREE.IUniform<number>;lobes:THREE.IUniform<number>}
const gradient=new THREE.DataTexture(new Uint8Array([145,145,145,190,190,190,225,225,225,255,255,255]),4,1,THREE.RGBFormat);
gradient.needsUpdate=true;gradient.minFilter=THREE.NearestFilter;gradient.magFilter=THREE.NearestFilter;
export function form(color:string,scale:[number,number,number],power=1,wave=0):Form{
 const geo=new THREE.PlaneGeometry(1,1,48,28);
 // Parametric sphere mapping reverses the plane's winding. Match the supplied
 // outward normals, otherwise DoubleSide silently flips them back inward.
 const indices=geo.index!;for(let i=0;i<indices.count;i+=3){const b=indices.getX(i+1);indices.setX(i+1,indices.getX(i+2));indices.setX(i+2,b)}
 const material=new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,emissive:color,emissiveIntensity:.018,side:THREE.DoubleSide});
 const uniforms={uTime:{value:0},uPower:{value:power},uShape:{value:new THREE.Vector3(...scale)},uBend:{value:0},uWave:{value:wave},uFrequency:{value:5},uLobes:{value:0}};
 const alter=(shader:any)=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=surface+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`vec2 q=vec2(uv.x,clamp(uv.y,.001,.999));vec3 p0=form(q);vec3 pu=form(q+vec2(.0005,0.))-p0;vec3 pv=form(q+vec2(0.,.0005))-p0;vec3 objectNormal=normalize(cross(pv,pu));`);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=form(uv);');
 };
 material.onBeforeCompile=alter;material.customProgramCacheKey=()=> 'superquadric-soft-character-v2';
 const mesh=new THREE.Mesh(geo,material);mesh.frustumCulled=false;mesh.castShadow=true;mesh.receiveShadow=true;
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
 depth.onBeforeCompile=(shader:any)=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader=surface+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed=form(uv);')};
 mesh.customDepthMaterial=depth;
 return {mesh,time:uniforms.uTime,wave:uniforms.uWave,bend:uniforms.uBend,power:uniforms.uPower,lobes:uniforms.uLobes};
}

export function cube(color:string,size:[number,number,number],at:[number,number,number],parent:THREE.Object3D){
 const m=new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshToonMaterial({color,gradientMap:gradient}));m.position.set(...at);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
