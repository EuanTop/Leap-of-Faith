import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {Vector2} from 'three';
export const POST_STYLES=['original','prism','film','etching'] as const;
export function createFinishing(){
 const pass=new ShaderPass({uniforms:{tDiffuse:{value:null},resolution:{value:new Vector2(900,1200)},style:{value:1},amount:{value:.7}},
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 resolution;uniform float style,amount;varying vec2 vUv;
 float printLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
 float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){
  vec3 c=texture2D(tDiffuse,vUv).rgb;if(style<.5||amount<=0.){gl_FragColor=vec4(c,1.);return;}
  vec2 pixel=vec2(max(1.,resolution.y/1200.))/resolution;
  vec3 dx=texture2D(tDiffuse,vUv+vec2(pixel.x,0)).rgb-texture2D(tDiffuse,vUv-vec2(pixel.x,0)).rgb;
  vec3 dy=texture2D(tDiffuse,vUv+vec2(0,pixel.y)).rgb-texture2D(tDiffuse,vUv-vec2(0,pixel.y)).rgb;
  float edge=smoothstep(.025,.26,length(dx)+length(dy)),l=printLuma(c);
  vec2 paper=vUv*vec2(1200.*resolution.x/resolution.y,1200.);
  float grain=noise(floor(paper))-.5;vec3 result=c;
  if(style<1.5){
   // Saturated, coloured keylines and local print dots; the broad gradient stays smooth.
   result=mix(vec3(l),c,1.18);result=(result-.5)*1.06+.5;
   vec3 ink=mix(vec3(.20,.05,.33),vec3(.36,.78,.79),smoothstep(.25,.8,l));
   result=mix(result,ink,edge*.32);
   float dotInk=step(.76,length(fract(paper/4.)-.5)*1.6);
   result-=dotInk*edge*(1.-l)*.032;result+=grain*.009;
  }else if(style<2.5){
   // A photographic curve and split-toned grain, with no image blur.
   result=c*c*(3.-2.*c);result=mix(result,c,.40);
   result+=vec3(.032,-.010,.050)*(1.-smoothstep(.08,.54,l));
   result+=vec3(.030,.014,-.025)*smoothstep(.55,.95,l);
   result+=grain*.026*(.30+.70*(1.-abs(l-.5)*2.));
   result*=1.-.065*dot(vUv-.5,vUv-.5);
  }else{
   // Two crossed engraved screens and violet ink on warm paper.
   float a=sin((paper.x+paper.y*.47)*1.8),b=sin((paper.x-paper.y*.67)*2.1);
   float hatch=smoothstep(.25,.75,1.-l)*smoothstep(.60,.90,a);
   hatch+=smoothstep(.65,.91,1.-l)*smoothstep(.68,.94,b)*.55;
   float coverage=clamp(edge*.82+hatch*.48+(1.-l)*.10,0.,1.);
   vec3 sheet=vec3(.985,.940,.815)+grain*.017;
   result=mix(sheet,vec3(.235,.105,.295),coverage);result=mix(result,c,.08);
  }
  gl_FragColor=vec4(clamp(mix(c,result,amount),0.,1.),1.);
 }`});
 pass.material.toneMapped=false;
 return {pass,update(style:typeof POST_STYLES[number],amount:number,w:number,h:number){pass.uniforms.style!.value=Math.max(0,POST_STYLES.indexOf(style));pass.uniforms.amount!.value=amount;pass.uniforms.resolution!.value.set(w,h);}};
}
