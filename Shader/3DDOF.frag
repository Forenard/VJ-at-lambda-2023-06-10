#version 440

out vec4 outColor;

#pragma include "Shader/params.glsl"
#pragma include "Shader/common.glsl"

uniform sampler2D Tex3DScene;

const float GOLDEN_ANGLE = 2.39996323;
const float MAX_BLUR_SIZE = 6.0;
const float RAD_SCALE = 0.5; // Smaller = nicer blur, larger = faster

float getBlurSize(float depth, float focusPoint, float focusScale)
{
    float coc = clamp((1.0 / focusPoint - 1.0 / depth) * focusScale, -1.0, 1.0);
    return abs(coc) * MAX_BLUR_SIZE;
}

float getFocusPoint()
{
    float point = 0.0;
    const float w = 0.05;
    const vec2 cen = vec2(0.5);
    const vec2 p0 = cen;
    const vec2 p1 = cen + vec2(0, w);
    const vec2 p2 = cen + vec2(w, 0);
    const vec2 p3 = cen + vec2(0, -w);
    const vec2 p4 = cen + vec2(-w, 0);
    point += texture(Tex3DScene, p0, 2.0).a;
    point += texture(Tex3DScene, p1, 2.0).a;
    point += texture(Tex3DScene, p2, 2.0).a;
    point += texture(Tex3DScene, p3, 2.0).a;
    point += texture(Tex3DScene, p4, 2.0).a;
    point /= 5.0;
    return point;
}

vec3 depthOfField(vec2 uv, float focusScale, vec2 uPixelSize)
{
    vec4 tex = texture(Tex3DScene, uv);
    float centerDepth = tex.a;
    float focusPoint = getFocusPoint();
    float centerSize = getBlurSize(centerDepth, focusPoint, focusScale);
    vec3 color = tex.rgb;

    float tot = 1.0;
    float radius = RAD_SCALE;
    for(float ang = 0.0; radius < MAX_BLUR_SIZE; ang += GOLDEN_ANGLE)
    {
        vec2 tc = uv + vec2(cos(ang), sin(ang)) * uPixelSize * radius;
        tex = texture(Tex3DScene, tc);
        vec3 sampleColor = tex.rgb;
        float sampleDepth = tex.a;
        float sampleSize = getBlurSize(sampleDepth, focusPoint, focusScale);
        if(sampleDepth > centerDepth)
            sampleSize = clamp(sampleSize, 0.0, centerSize * 2.0);
        float m = smoothstep(radius - 0.5, radius + 0.5, sampleSize);
        color += mix(color / tot, sampleColor, m);
        tot += 1.0;
        radius += RAD_SCALE / radius;
    }
    return color /= tot;
}

void main()
{
    if(is2D())
    {
        outColor = vec4(0);
        return;
    }

    bool DOF = true;
    // TODO:
    float focusScale = 3.0;

    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord / resolution.xy;
    vec3 col = texture(Tex3DScene, uv).rgb;
    if(DOF)
    {
        col = depthOfField(uv, focusScale, 1.0 / resolution.xy);
    }
    outColor = vec4(col, 1);
}