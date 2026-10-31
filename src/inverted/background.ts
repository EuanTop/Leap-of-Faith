// One screen-space colour field is shared by the sky and water. Keeping the
// reflection background transparent prevents a second horizon from being composited.
export const BACKGROUND_GLSL = `
vec3 artworkBackground(float fromTop) {
 float y=clamp(fromTop,0.,1.);
 vec3 night=vec3(.0052,.0024,.0110);
 vec3 violet=vec3(.122,.037,.191);
 vec3 rose=vec3(.491,.191,.296);
 vec3 daylight=vec3(.922,.723,.376);
 // Centre the violet/daylight transition: neither world is confined to an edge.
 float blend=smoothstep(.28,.72,y);
 vec3 c=mix(night,violet,smoothstep(0.,.24,y));
 c=mix(c,daylight,blend);
 return mix(c,rose,.14*4.*blend*(1.-blend));
}`;
