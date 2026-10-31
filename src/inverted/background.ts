// One screen-space colour field is shared by the sky and water. Keeping the
// reflection background transparent prevents a second horizon from being composited.
export const BACKGROUND_GLSL = `
// Area coordinate of a rotated rectangle: each colour band keeps the same
// screen coverage as the field turns, including the narrower portrait width.
float backgroundAreaCoordinate(vec2 field,float angle,float aspect) {
 float q=-field.y*cos(angle)+field.x*sin(angle);
 float a=.5*abs(cos(angle)),b=.5*aspect*abs(sin(angle));
 float wide=max(a,b),narrow=min(a,b);
 if(narrow<.0001)return clamp(.5+q/(2.*wide),0.,1.);
 float distance=abs(q),tail=max(0.,wide+narrow-distance);
 float upper=distance<=wide-narrow ? .5+distance/(2.*wide) : 1.-tail*tail/(8.*wide*narrow);
 return q<0. ? 1.-upper : upper;
}
vec3 artworkBackground(float fromTop) {
 float y=clamp(fromTop,0.,1.);
 vec3 night=vec3(.0052,.0024,.0110);
 vec3 violet=vec3(.122,.037,.191);
 vec3 rose=vec3(.491,.191,.296);
 vec3 daylight=vec3(.922,.723,.376);
 // Centre the violet/daylight transition: neither world is confined to an edge.
 float blend=smoothstep(.28,.72,y);
 vec3 c=mix(night,violet,smoothstep(0.,.24,y));
 // Mix perceived colour rather than light energy, which let bright yellow
 // spread visually into most of the transition even with a centred boundary.
 c=mix(sqrt(c),sqrt(daylight),blend);c*=c;
 return mix(c,rose,.14*4.*blend*(1.-blend));
}`;
