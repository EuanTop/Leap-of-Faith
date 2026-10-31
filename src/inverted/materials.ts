import * as T from 'three';
export function stone(color:string){
 const m=new T.MeshStandardMaterial({color,roughness:.84,metalness:.025});
 m.onBeforeCompile=s=>{
  s.vertexShader='varying vec3 vStone;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStone=(modelMatrix*vec4(position,1.)).xyz;');
  s.fragmentShader='varying vec3 vStone;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float broad=sin(vStone.x*2.7+sin(vStone.y*1.8))*sin(vStone.z*2.2+vStone.y*.7);diffuseColor.rgb*=1.+broad*.045;
  `);
 };m.customProgramCacheKey=()=> 'inverted-soft-stone-v1';return m;
}
export const wall=stone('#493451'),trim=stone('#735477'),edge=stone('#83698c');
export const iron=new T.MeshStandardMaterial({color:'#38243b',roughness:.48,metalness:.38});
export const glow=new T.MeshBasicMaterial({color:new T.Color('#ffd18c').multiplyScalar(2.8)});
export const glass=new T.MeshPhysicalMaterial({color:'#e5c7fa',roughness:.13,transmission:.76,thickness:.12,ior:1.4,transparent:true,opacity:.66,depthWrite:false,side:T.DoubleSide,clearcoat:1,envMapIntensity:.85});
