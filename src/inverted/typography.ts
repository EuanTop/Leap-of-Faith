export const LIGHT_INK='#fff6d4';
export const DARK_INK='#3b1e4e';
const linear=(v:number)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function luminance(r:number,g:number,b:number){return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);}
/** Continuous local contrast response, independent of render order and frame rate. */
export function regionInkMix(pixels:Uint8ClampedArray,width:number,height:number,x:number,y:number,w:number,h:number){
 const left=Math.max(0,Math.floor(x*width)),top=Math.max(0,Math.floor(y*height));
 const right=Math.min(width,Math.max(left+2,Math.ceil((x+w)*width))),bottom=Math.min(height,Math.max(top+2,Math.ceil((y+h)*height)));
 let sum=0,count=0;
 for(let j=top;j<bottom;j++)for(let i=left;i<right;i++){const n=(j*width+i)*4;sum+=luminance(pixels[n]!,pixels[n+1]!,pixels[n+2]!);count++;}
 const bg=sum/Math.max(1,count),u=Math.max(0,Math.min(1,(bg-.09)/.39));
 return u*u*u*(10+u*(-15+6*u));
}
export function inkAtBlend(value:number,alpha=1){
 const u=Math.max(0,Math.min(1,value));
 if(alpha===1&&u===0)return LIGHT_INK;if(alpha===1&&u===1)return DARK_INK;
 const rgb=[255,246,212].map((v,i)=>Math.round(v*(1-u)+[59,30,78][i]!*u));
 return alpha===1?`rgb(${rgb.join(',')})`:`rgba(${rgb.join(',')},${alpha})`;
}
export function regionInk(pixels:Uint8ClampedArray,width:number,height:number,x:number,y:number,w:number,h:number){return inkAtBlend(regionInkMix(pixels,width,height,x,y,w,h));}
