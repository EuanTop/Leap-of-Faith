export const LIGHT_INK='#fff6d4';
export const DARK_INK='#3b1e4e';
const linear=(v:number)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function luminance(r:number,g:number,b:number){return .2126*linear(r)+.7152*linear(g)+.0722*linear(b);}
const light=luminance(255,246,212),dark=luminance(59,30,78);
/** Read the actual post-processed background, not the unfiltered palette or world flag. */
export function regionInk(pixels:Uint8ClampedArray,width:number,height:number,x:number,y:number,w:number,h:number){
 const left=Math.max(0,Math.floor(x*width)),top=Math.max(0,Math.floor(y*height));
 const right=Math.min(width,Math.max(left+2,Math.ceil((x+w)*width))),bottom=Math.min(height,Math.max(top+2,Math.ceil((y+h)*height)));
 let sum=0,count=0;
 for(let j=top;j<bottom;j++)for(let i=left;i<right;i++){const n=(j*width+i)*4;sum+=luminance(pixels[n]!,pixels[n+1]!,pixels[n+2]!);count++;}
 const bg=sum/Math.max(1,count),contrast=(a:number,b:number)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
 return contrast(light,bg)>=contrast(dark,bg)?LIGHT_INK:DARK_INK;
}
