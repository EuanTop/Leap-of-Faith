// Backtrace material on nested rounded-square streamlines. At half a circuit
// every parcel reaches the opposite side; intermediate colours are transported,
// rather than painted simultaneously into distant pixels.
export function pigmentSource(x:number,y:number,amount:number){
 if(Math.abs(x)+Math.abs(y)<1e-9)return {x,y};
 const radius=Math.max(Math.abs(x),Math.abs(y)),angle=Math.atan2(y,x);
 const a=.24*Math.sin(Math.PI*Math.min(1,radius))+.06,b=.02*Math.sin(Math.PI*radius),c=.08*Math.sin(Math.PI*radius);
 const label=angle+a*Math.sin(2*angle)+b*Math.sin(4*angle)+c*(1-Math.cos(2*angle))-Math.PI*amount;
 let theta=label;
 for(let i=0;i<6;i++){const step=(theta+a*Math.sin(2*theta)+b*Math.sin(4*theta)+c*(1-Math.cos(2*theta))-label)/(1+2*a*Math.cos(2*theta)+4*b*Math.cos(4*theta)+2*c*Math.sin(2*theta));theta-=Math.max(-.65,Math.min(.65,step));}
 const dx=Math.cos(theta),dy=Math.sin(theta),scale=radius/Math.max(Math.abs(dx),Math.abs(dy));
 return {x:dx*scale,y:dy*scale};
}
export const PIGMENT_GLSL=`
vec2 pigmentSource(vec2 point,float amount){
 if(dot(point,point)<.00000001)return point;
 float radius=max(abs(point.x),abs(point.y)),angle=atan(point.y,point.x);
 float a=.24*sin(3.14159265*min(1.,radius))+.06,b=.02*sin(3.14159265*radius),c=.08*sin(3.14159265*radius);
 float label=angle+a*sin(2.*angle)+b*sin(4.*angle)+c*(1.-cos(2.*angle))-3.14159265*amount;
 float theta=label;
 for(int i=0;i<6;i++){float delta=(theta+a*sin(2.*theta)+b*sin(4.*theta)+c*(1.-cos(2.*theta))-label)/(1.+2.*a*cos(2.*theta)+4.*b*cos(4.*theta)+2.*c*sin(2.*theta));theta-=clamp(delta,-.65,.65);}
 vec2 direction=vec2(cos(theta),sin(theta));
 return direction*(radius/max(abs(direction.x),abs(direction.y)));
}`;
