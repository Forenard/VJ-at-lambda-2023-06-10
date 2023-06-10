#version 440

out vec4 outColor;

#pragma include "Shader/params.glsl"
#pragma include "Shader/common.glsl"

uniform sampler2D Tex3DDOF;
uniform sampler2D Tex3DRes;

float getLuma(vec3 color)
{
    const vec3 lumaWeights = vec3(0.299, 0.587, 0.114);
    return dot(color, lumaWeights);
}

float gaussian(float x)
{
    const float sigma = 5.0;
    return exp(-(x * x) / (2.0 * sigma * sigma));
}

vec3 getBloom(vec2 uv, float threshold)
{
    vec3 col = vec3(0);
    float total = 0.0;
    const int MAX_BLUR_SIZE = 4;
    float rangefactor = 4.0;
    for(int x = -MAX_BLUR_SIZE; x < MAX_BLUR_SIZE; x++)
    {
        for(int y = -MAX_BLUR_SIZE; y < MAX_BLUR_SIZE; y++)
        {
            vec2 offset = vec2(x, y);
            float weight = gaussian(length(offset));
            offset *= rangefactor;
            vec3 up = max(vec3(0), texture(Tex3DDOF, uv + offset / resolution.xy, rangefactor).rgb - threshold);
            col += up * weight;
            total += weight;
        }
    }
    return saturate(col / total);
}

void main()
{
    if(is2D())
    {
        outColor = vec4(0);
        return;
    }

    bool Bloom = true;
    float threshold = 0.0;
    float tone = 1.0;
    // float ins = 0.15;
    float ins = 0.1 + pow(1.0 / (1.0 + beatButton().y), 10.0);

    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = fragCoord / resolution.xy;
    vec3 col = texture(Tex3DDOF, uv).rgb;
    if(Bloom)
    {
        col = col * tone + getBloom(uv, threshold) * ins;
    }
    col = saturate(col);

    // do motion blur?
    float ins2 = 0.5;
    vec3 bac = texture(Tex3DRes, uv).rgb;
    col = mix(col, bac, ins2);

    outColor = vec4(col, 1);
}