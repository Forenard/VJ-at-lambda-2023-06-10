#version 440

out vec4 outColor;

#pragma include "Shader/common.glsl"
#pragma include "Shader/params.glsl"
#pragma include "Shader/font.glsl"

uniform sampler2D Tex2DScene;
uniform sampler2D Tex2DRes;

vec2 uv2luv(vec2 uv)
{
    return (uv - 0.5) * 1.5 + 0.5;
}

vec2 luv2uv(vec2 luv)
{
    return (luv - 0.5) / 1.5 + 0.5;
}

vec4 tex(sampler2D ch, in vec2 q)
{
    ivec2 p = ivec2(q);
    ivec2 r = ivec2(vec2(textureSize(ch, 0)));
    p = (p + r) % r;
    return texelFetch(ch, p, 0);
}

bool vecEQ(vec3 col)
{
    const float eps = 1e-3;
    return (abs(col.r - col.g) < eps && abs(col.g - col.b) < eps && abs(col.b - col.r) < eps);
}

vec3 calcCol(vec2 uv)
{
    vec2 luv = uv2luv(uv);
    // https://www.shadertoy.com/view/DtBXWG
    vec2 px = gl_FragCoord.xy;
    float k = 1. / resolution.y;
    // Uncomment to zoom (tracks mouse incorrectly)
    float sc = 0.6;
    //px = sc * (px - 0.5 * res) + 0.5 * res;
    vec4 col1 = tex(Tex2DScene, px);
    vec4 col2 = tex(Tex2DScene, px - vec2(5));
    // Messy color stuff
    vec4 col = vec4(3. * col1.g - 1.2 * col2.r);
    if(col.g > 0.)
        col.rgb *= 0.8 + 0.2 * cos(2. * PI * (col.g + vec3(0, 1, 2) / 3.));
    col = tanh(vec4(3.5, 1, 1, 1) * col);
    float ab = 2. * abs(col.g - col2.g);
    col = clamp(col, 0., 1.);
    col += vec4(pow(ab, 5.));
    col = mix(col, vec4(1), 0.25 * (1. - col.r));
    col = vec4(vec3(1.0 - col.r), 1.0);
    vec4 bcol = texture(Tex2DScene, uv);
    bool isRD = inUV(luv, vec2(0), vec2(1)) && (getMaster().Info2D.ID == 4);
    vec3 rescol = (isRD ? col : bcol).rgb;
    return saturate(rescol);
}

void main()
{
    Master master = getMaster();
    float LocalTime = master.Info2D.LocalTime;

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 rescol = vec3(0);
    float slt = pow(1.0 / (1.0 + beatButton().y), 15.0);
    float llt = pow(1.0 / (1.0 + LocalTime), 4.0);
    float buv = texture(spectrum_raw, uv.y).r * 0.05 * slt;
    // float buv = texture(spectrum, uv.y).r * 0.1 * slt;
    vec3 vec = cyclicNoise(vec3(uv * 10.0, time));
    vec.xy *= vec.z;
    float sh = 0.05 * llt;
    vec3 uvc = vec3(-sh, 0, sh);
    rescol.r += calcCol(uv + vec2(buv, 0) + vec.xy * uvc.r).r;
    rescol.g += calcCol(uv + vec2(buv, 0) + vec.xy * uvc.g).g;
    rescol.b += calcCol(uv + vec2(buv, 0) + vec.xy * uvc.b).b;
    if(isLive())
    {
        SetAspect(resolution.xy, 2.5, true, false);
        SetAlign(Align_Center_Center);
        SetFontStyle(STYLE_OUTLINE);
        Stack_Char(C_C);
        Stack_Char(C_O);
        Stack_Char(C_D);
        Stack_Char(C_I);
        Stack_Char(C_N);
        Stack_Char(C_G);
        rescol += Render_Char(uv);

        vec2 fres = resolution.y / resolution.xy;
        vec2 w = vec2(0.01) * fres;
        float edge = 0.0;
        vec2 auv = abs(uv - 0.5) - vec2(0.25, 0.25);
        vec2 suv = uv - 0.5;
        edge += float((0.0 < auv.x || 0.0 < auv.y) && (auv.x < w.x && auv.y < w.y));
        bool l0 = suv.y > suv.x, l1 = suv.y > -suv.x;
        float t0 = ((l0 == l1) ? uv.x / fres.x : uv.y / fres.y) * 50.0;
        float t1 = (l0 ? time : -time) * 2.5;
        edge *= float(fract(t0 + t1) < 0.5);
        rescol += edge;
    }

    vec2 suv = (uv - 0.5) * resolution.xy / resolution.y;
    vec2 asuv = abs(suv);
    float as = asuv.x + asuv.y;
    float asf = fract(as * 15.0);
    float ab = 1.0 / (1.0 + beatButton().y);
    float asi = (1.0 - pow(ab, 6.0)) * 1.5;
    rescol += float(int(beatButton().w + 0.5) % 8 == 0) * float(asf < 0.5) * pow(saturate(1.0 - abs(asi - as)), 4.0) * pow(ab, 6.0);
    rescol = saturate(rescol);

    // tlansition merge 
    vec3 backcol = texture(Tex2DRes, uv).rgb;
    float lt = remapc(LocalTime, 0.0, TransitionTime, 0.0, 1.0);
    lt = pow(lt, 3.0);
    float mixa = mix(0.1, 1.0, lt);
    rescol = mix(backcol, rescol, mixa);

    outColor = vec4(rescol, 1.0);
}