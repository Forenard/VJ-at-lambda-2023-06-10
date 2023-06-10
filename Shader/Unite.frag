#version 440

out vec4 outColor;

#pragma include "Shader/common.glsl"
#pragma include "Shader/params.glsl"

uniform sampler2D TexUniteProcess;

vec3 tex(vec2 uv, vec2 suv)
{
    vec3 col;
    vec2 sh = suv * 0.0015 * sliders[0];
    col.r = texture(TexUniteProcess, uv - sh).r;
    col.g = texture(TexUniteProcess, uv).g;
    col.b = texture(TexUniteProcess, uv + sh).b;
    return col;
}

void main()
{
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 suv = (gl_FragCoord.xy * 2.0 - resolution.xy) / resolution.y;
    vec3 col = tex(uv, suv), bcol = col;
    // https://www.shadertoy.com/view/ss3SD8
    col = pow(col, vec3(0.5));
    col *= 1.0 - 0.4 * length(suv);
    col = vec3(smoothstep(0.1, 1.1, col.x), smoothstep(0.0, 1.0, col.y), smoothstep(-0.1, 0.9, col.z));
    col = saturate(col);
    col = mix(bcol, col, sliders[0]);
    outColor = vec4(col, 1);
}