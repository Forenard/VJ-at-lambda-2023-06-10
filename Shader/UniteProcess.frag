#version 440

out vec4 outColor;

#pragma include "Shader/common.glsl"
#pragma include "Shader/params.glsl"
#pragma include "Shader/font.glsl"

uniform sampler2D Tex2DRes;
uniform sampler2D Tex3DRes;
uniform sampler2D TexUniteProcess;

float GlobalTime;
float LocalTime;
int ID;

vec3 pass(vec2 uv)
{
    return (is2D() ? texture(Tex2DRes, uv).rgb : texture(Tex3DRes, uv).rgb);
}

vec3 back(vec2 uv)
{
    return texture(TexUniteProcess, uv).rgb;
}

// Life Game

float lifegame(float center, float sum)
{
    if(center > 0.5)
    {
        if(sum < 1.5 || sum > 3.5)
        {
            center = 0.0;
        }
        else
        {
            center = 1.0;
        }
    }
    else
    {
        if(abs(sum - 3.0) < 0.5)
        {
            center = 1.0;
        }
        else
        {
            center = 0.0;
        }
    }
    return center;
}

vec3 process1(vec2 uv)
{
    #define UOWNSCALE(_uv) (floor(_uv/cellSize+0.5)*cellSize)
    // pre
    float ch = 0.0;
    SetAspect(resolution.xy, 3.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    // SetFontStyle(STYLE_OUTLINE);
    Stack_Char(C_L);
    Stack_Char(C_I);
    Stack_Char(C_F);
    Stack_Char(C_E);
    ch += Render_Char(uv);
    if(LocalTime < TransitionTime)
    {
        return vec3(ch) + back(uv);
    }

    if(frame_count % 3 != 0)
    {
        return back(uv);
    }
    // main
    const vec2[8] offsets = vec2[8](vec2(-1.0, -1.0), vec2(0.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 0.0), vec2(1.0, 0.0), vec2(-1.0, 1.0), vec2(0.0, 1.0), vec2(1.0, 1.0));

    vec2 cellSize = 4.0 / resolution.xy;
    vec3 sum = vec3(0);
    for(int i = 0; i < 8; i++)
    {
        vec2 offset = offsets[i];
        vec2 pos = uv + offset * cellSize;
        // sum += texture(TexUniteProcess, pos).r > 0.001 ? 1.0 : 0.0;
        sum += texture(TexUniteProcess, UOWNSCALE(pos)).rgb;
    }
    // float center = texture(TexUniteProcess, uv).r > 0.001 ? 1.0 : 0.0;
    vec3 center = texture(TexUniteProcess, UOWNSCALE(uv)).rgb;
    vec3 col = vec3(0.0);
    col.r += lifegame(center.r, sum.r);
    col += lifegame(center.b, sum.b);
    col += (LocalTime < TransitionTime + 0.01 ? ch : 0.0);
    return col;
}

//https://www.shadertoy.com/view/ftlfD8
//pixel XOR Sorting 4x by Kastorp
//sorting network https://www.shadertoy.com/view/XsXGDX

#define D 4 //if FPS<60, use D=2
#define COMP(a,b) length(a.xyz)<length(b.xyz)
#define SW(a,b)  if(COMP(v[a],v[b])) {vec3 t = v[a]; v[a] =v[b]; v[b] = t; }
vec3[2 * D] sort(vec3[2 * D] v)
{
    SW(0, 1);
    SW(2, 3);
    SW(0, 2);
    SW(1, 3);
    SW(1, 2); 
#if D>2
    SW(4, 5);
    SW(6, 7);
    SW(4, 6);
    SW(5, 7);
    SW(5, 6);
    SW(0, 4);
    SW(1, 5);
    SW(1, 4);
    SW(2, 6);
    SW(3, 7);
    SW(3, 6);
    SW(2, 4);
    SW(3, 5);
    SW(3, 4);
#endif
    return v;
}

/*
vec3 process2(vec2 uv,vec2 anc,vec2 size)
{
    // pre
    float ch = 0.0;
    SetAspect(resolution.xy, 3.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    // SetFontStyle(STYLE_OUTLINE);
    Stack_Char(C_P);
    Stack_Char(C_I);
    Stack_Char(C_X);
    Stack_Char(C_E);
    Stack_Char(C_L);
    ch += Render_Char(uv);
    if(LocalTime < TransitionTime)
    {
        return vec3(ch) + back(uv);
    }

    // main
    vec2 RR = resolution.xy;
    vec2 U = gl_FragCoord.xy;
    vec3 O = vec3(0);
    int iFrame = frame_count;

    // if(iFrame < 20 || texelFetch(TexUniteProcess, ivec2(RR - 1.), 0) == vec4(0.))
    // {
    //     return texture(TexUniteProcess, U / RR).xyz;
    // } ??

    float t = 1.;

    ivec2 R = ivec2(RR);
    int l = int(log2(RR.x * RR.y)) - 2, z = (iFrame / 2) % l, zz = 1 << z, ii = (int(U.x) + int(U.y) * R.x), i = ii / zz, s = ((i & D) / D == (iFrame & 1)) ? 0 : 1, m = s * D + (i & (D - 1)), h = min(i - (i & (D - 1)), i - (i & (D - 1)) - s * D);

    vec3[2 * D] P;
    for(int k = 0; k < 2 * D; k++)
    {
        int j = (h + k) * zz + (ii % zz);
        // P[k] = texelFetch(TexUniteProcess, ivec2(j % R.x, j / R.x), 0).xyz * t;
        P[k] = texelFetch(TexUniteProcess, ivec2(U.x, j / R.x), 0).xyz * t;
    }

    if(h >= 0 && (h + D) * zz < ((R.x * R.y) & ((1 << 24) - D * zz)))
        O = sort(P)[m];
    else
        O = P[m];

    return O;
}
*/

vec3 process2(vec2 uv, vec2 anc, vec2 size)
{
    // pre
    float ch = 0.0;
    SetAspect(resolution.xy, 3.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    // SetFontStyle(STYLE_OUTLINE);
    Stack_Char(C_P);
    Stack_Char(C_I);
    Stack_Char(C_X);
    Stack_Char(C_E);
    Stack_Char(C_L);
    ch += Render_Char(uv);
    if(LocalTime < TransitionTime)
    {
        return vec3(ch) + back(uv);
    }

    // main
    vec2 RR = size * resolution.xy - 5.0;
    vec2 U = (uv - anc) * resolution.xy;
    vec3 O = vec3(0);
    ivec2 UD = ivec2(anc * resolution.xy + 0.5);
    int iFrame = frame_count;

    // if(iFrame < 20 || texelFetch(TexUniteProcess, ivec2(RR - 1.), 0) == vec4(0.))
    // {
    //     return texture(TexUniteProcess, U / RR).xyz;
    // } ??

    float t = 1.;

    ivec2 R = ivec2(RR);
    int l = int(log2(RR.x * RR.y)) - 2, z = (iFrame / 2) % l, zz = 1 << z, ii = (int(U.x) + int(U.y) * R.x), i = ii / zz, s = ((i & D) / D == (iFrame & 1)) ? 0 : 1, m = s * D + (i & (D - 1)), h = min(i - (i & (D - 1)), i - (i & (D - 1)) - s * D);

    vec3[2 * D] P;
    for(int k = 0; k < 2 * D; k++)
    {
        int j = (h + k) * zz + (ii % zz);
        ivec2 iuv = ivec2(U.x, j / R.x) + UD;
        // P[k] = texelFetch(TexUniteProcess, ivec2(j % R.x, j / R.x), 0).xyz * t;
        P[k] = texelFetch(TexUniteProcess, iuv, 0).xyz * t;
    }

    if(h >= 0 && (h + D) * zz < ((R.x * R.y) & ((1 << 24) - D * zz)))
        O = sort(P)[m];
    else
        O = P[m];

    return O;
}

vec2 fold(vec2 p, vec2 v)
{
    float g = dot(p, v);
    return (p - (g - abs(g)) * v) * vec2(sign(g), 1);
}
vec2 pmod(vec2 p, float n)
{
    float a = mod(atan(p.y, p.x), TAU / n) - .5 * TAU / n;
    return length(p) * vec2(sin(a), cos(a));
}
vec2 rot(vec2 p, float a)
{
    return p * mat2(cos(a), sin(a), -sin(a), cos(a));
}

vec2 uvfold(vec2 uv, vec3 seed, float ins)
{
    vec2 ha = hash22(seed.xy);
    float a = (ha.x - 0.5) * PI * ins + PI * float(ha.y < 0.5);
    vec2 v = normalize(vec2(cos(a), sin(a)));
    vec2 off = (hash22(seed.yx) - 0.5) * ins;
    uv -= off;
    uv = fold(uv, v);
    uv += off;
    return uv;
}

vec2 uvshrink(vec2 uv, vec3 seed, float ins)
{
    vec2 ha = hash22(seed.xy);
    float ex = mix(0.7, 1.5, ha.x);
    ex = mix(1.0, ex, ins);
    uv *= ex;
    return uv;
}

vec3 process3(vec2 uv)
{
    // uv
    vec2 res = resolution.xy / resolution.y;
    vec2 nuv = (uv * 2.0 - 1.0) * res;
    int count = 8;
    vec4 but = beatButton();
    vec2 buv = vec2(1);
    for(int i = 0; i < count; i++)
    {
        // float lt = LocalTime * 2.0 + float(i);
        // float li = floor(lt);
        // float lf = fract(lt);
        // lf = pow(smoothstep(0.0, 1.0, lf), 0.1);
        float lt = float(i + int(but.w + 0.5));
        float li = floor(lt);
        float lf = 1.0 - pow(1.0 / (1.0 + but.y), 15.0);

        vec3 s3 = hash31(li) * 42.0;
        float ins = ((i == 0) ? 1.0 - lf : (i == count - 1) ? lf : 1.0);
        float th = hash13(s3.yzx);
        if(th < 0.7)
        {
            nuv = uvfold(nuv, s3, ins);
        }
        // else if(th < 0.75)
        else
        {
            nuv = uvshrink(nuv, s3, ins);
            buv = uvshrink(buv, s3, ins);
        }
        // else
        // {
        //     nuv = nuv;
        // }
        // nuv = clamp(nuv, -res, res);
    }
    nuv = (nuv / res + 1.0) * 0.5;
    // nuv = buv.x > 1.5 ? fract(nuv) : nuv;
    nuv = (is2D() ? nuv : fract(nuv));

    // pre
    float ch = 0.0;
    SetAspect(resolution.xy, 3.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(C_G);
    Stack_Char(C_L);
    Stack_Char(C_I);
    Stack_Char(C_T);
    Stack_Char(C_C);
    Stack_Char(C_H);
    ch += Render_Char(uv);
    if(LocalTime < TransitionTime)
    {
        return vec3(ch) + back(uv);
    }

    ch = 0.0;
    SetAspect(resolution.xy, 3.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(C_G);
    Stack_Char(C_L);
    Stack_Char(C_I);
    Stack_Char(C_T);
    Stack_Char(C_C);
    Stack_Char(C_H);
    ch += Render_Char(nuv);
    // main
    return vec3(ch) + pass(nuv);
}

vec3 spectrum_offset(float t)
{
    float t0 = 3.0 * t - 1.5;
    return clamp(vec3(-t0, 1.0 - abs(t0), t0), 0.0, 1.0);
}
// RGB Shift
vec3 process5(vec2 uv, vec3 s3)
{
    vec3 seed = vec3(s3.xy + GlobalTime * 0.3, float(uv.y * 42.0 + s3.z));
    float ofs = (snoise(seed)) * 0.006;
    vec2 ofs2 = (hash13(s3.zyx) < 0.5 ? vec2(ofs, 0.0) : vec2(0.0, ofs));

    // https://www.shadertoy.com/view/lsfGD2
    const int NUM_SAMPLES = 10;
    const float RCP_NUM_SAMPLES_F = 1.0 / float(NUM_SAMPLES);
    vec3 sum = vec3(0.0);
    vec3 wsum = vec3(0.0);
    for(int i = 0; i < NUM_SAMPLES; ++i)
    {
        float t = float(i) * RCP_NUM_SAMPLES_F;
        uv = saturate(uv + ofs2 * t);
        vec3 samplecol = pass(uv);
        vec3 s = spectrum_offset(t);
        samplecol = samplecol * s;
        sum += samplecol;
        wsum += s;
    }
    sum /= wsum;

    return sum.rgb;
}

const float kernel[9] = float[9](-1., -1., -1., -1., 8., -1., -1., -1., -1.);
// laplacian filter
vec3 process6(vec2 uv, vec3 s3)
{
    vec2 p = 1.0 / resolution.xy;
    vec3 edge = vec3(0);
    for(int i = 0; i < 9; i++)
    {
        vec2 d = vec2(i % 3, i / 3) - 1.0;
        edge += kernel[i] * pass(uv + d * p);
    }
    return edge;
}

uniform sampler2D TexF0;
uniform sampler2D TexF1;
uniform sampler2D TexF2;
uniform sampler2D TexF3;
uniform sampler2D TexF4;
uniform sampler2D TexF5;

vec3 face(vec2 uv, int id)
{
    id %= 6;
    if(id == 0)
    {
        return texture(TexF0, uv).rgb;
    }
    else if(id == 1)
    {
        return texture(TexF1, uv).rgb;
    }
    else if(id == 2)
    {
        return texture(TexF2, uv).rgb;
    }
    else if(id == 3)
    {
        return texture(TexF3, uv).rgb;
    }
    else if(id == 4)
    {
        return texture(TexF4, uv).rgb;
    }
    else
    {
        return texture(TexF5, uv).rgb;
    }
}

vec3 process7(vec2 uv, vec2 anc, vec2 size, vec3 s3)
{
    vec3 edge1 = process6(uv, s3);
    uv = (uv - anc) / size;
    int id = int(hash13(s3.yzx) * 6.0) % 6;
    vec2 p = 0.5 / size.x / resolution.xy;
    vec3 edge2 = (1.0 - face(uv, id));
    edge2 += (1.0 - face(uv + vec2(p.x, 0.0), id));
    edge2 += (1.0 - face(uv + vec2(-p.x, 0.0), id));
    edge2 += (1.0 - face(uv + vec2(0.0, p.y), id));
    edge2 += (1.0 - face(uv + vec2(0.0, -p.y), id));
    edge2 *= 0.4;
    return edge2 + edge1 * 0.1;
}

float gaussian(float x)
{
    const float sigma = 5.0;
    return exp(-(x * x) / (2.0 * sigma * sigma));
}
vec3 process8(vec2 uv, vec3 s3)
{
    vec3 col = vec3(0);
    vec2 p = 1.0 / resolution.xy;
    float total = 0.0;
    const int MAX_BLUR_SIZE = 3;
    float rangefactor = 1.0;
    for(int x = -MAX_BLUR_SIZE; x < MAX_BLUR_SIZE; x++)
    {
        for(int y = -MAX_BLUR_SIZE; y < MAX_BLUR_SIZE; y++)
        {
            vec2 offset = vec2(x, y);
            float weight = gaussian(length(offset));
            offset *= rangefactor;
            col += pass(uv + offset * p) * weight;
            total += weight;
        }
    }
    return saturate(col / total);
}

vec3 process4(vec2 uv)
{
    // pre
    float ch = 0.0;
    SetAspect(resolution.xy, 3.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    // SetFontStyle(STYLE_OUTLINE);
    Stack_Char(C_W);
    Stack_Char(C_I);
    Stack_Char(C_N);
    Stack_Char(C_D);
    Stack_Char(C_O);
    Stack_Char(C_W);
    ch += Render_Char(uv);
    if(LocalTime < TransitionTime)
    {
        return vec3(ch) + back(uv);
    }

    vec4 but = beatButton();
    bool iswin = false;
    int uvid = -1;
    vec3 uvs3;
    vec2 uvanc;
    vec2 uvsize;
    int idcount = 8;
    int maxcount = 16;
    float edge = 0.0;
    vec2 fres = resolution.xy / resolution.y;
    vec2 w = vec2(1e-3) / fres;
    for(int i = 0; i < maxcount; i++)
    {
        float lt = float(i + int(but.w + 0.5));
        float li = floor(lt);
        float lf = 1.0 - pow(1.0 / (1.0 + but.y), 15.0);

        vec3 s3 = hash31(float(i + int(but.w + 0.5))) * 42.0;
        float ins = ((i == 0) ? 1.0 - lf : (i == maxcount - 1) ? lf : 1.0);

        float area = mix(0.05, 0.2, hash12(s3.xy));
        float xraito = mix(0.3, 0.7, hash12(s3.yz));
        float yraito = 1.0 - xraito;
        float xsize = sqrt(area * xraito / yraito);
        float ysize = area / xsize;
        vec2 size = vec2(xsize, ysize) * ins;
        int id = int(hash12(s3.zx) * float(idcount)) % idcount;
        if(id == 7)
        {
            float siz = (size.x + size.y) * 0.5;
            size = vec2(siz) / fres;
        }
        vec2 anc = hash22(s3.yx) * (1.0 - size);

        bool inuv = inUV(uv, anc, anc + size);
        if(inuv)
        {
            iswin = true;
            bool isedge = inuv && ((uv.x < anc.x + w.x || uv.x > anc.x + size.x - w.x) || (uv.y < anc.y + w.y || uv.y > anc.y + size.y - w.y));
            uvid = id;
            edge = (isedge ? 1.0 : 0.0);
            uvs3 = s3;
            uvanc = anc;
            uvsize = size;
        }
    }

    vec3 col;
    if(uvid == 0)
    {
        // life
        col = process8(uv, uvs3);
    }
    if(uvid == 1)
    {
        // life
        col = process1(uv);
    }
    else if(uvid == 2)
    {
        // pixel
        col = process2(uv, uvanc, uvsize);
    }
    else if(uvid == 3)
    {
        // ifs
        col = process3(uv);
    }
    else if(4 <= uvid && uvid < 6)
    {
        if(iswin)
        {
        // inv
            uv.x = (hash12(uvs3.xz) < 0.5) ? (uvanc.x * 2.0 + uvsize.x - uv.x) : uv.x;
            uv.y = (hash12(uvs3.yz) < 0.5) ? (uvanc.y * 2.0 + uvsize.y - uv.y) : uv.y;
        }
        col = process5(uv, uvs3);
    }
    else if(uvid == 6)
    {
        if(iswin)
        {
        // inv
            uv.x = (hash12(uvs3.xz) < 0.5) ? (uvanc.x * 2.0 + uvsize.x - uv.x) : uv.x;
            uv.y = (hash12(uvs3.yz) < 0.5) ? (uvanc.y * 2.0 + uvsize.y - uv.y) : uv.y;
        }
        // kernel
        col = process6(uv, uvs3);
    }
    else if(uvid == 7)
    {
        // face
        col = process7(uv, uvanc, uvsize, uvs3);
    }
    else
    {
        // 0-1
        if(iswin)
        {
        // inv
            uv.x = (hash12(uvs3.xz) < 0.5) ? (uvanc.x * 2.0 + uvsize.x - uv.x) : uv.x;
            uv.y = (hash12(uvs3.yz) < 0.5) ? (uvanc.y * 2.0 + uvsize.y - uv.y) : uv.y;
        }

        col = pass(uv);
    }

    return col + edge;
}

vec3 process(vec2 uv, vec3 col)
{
    if(ID == 1)
    {
        col = process3(uv);
    }
    else if(ID == 2)
    {
        col = process4(uv);
    }
    return col;
}

void main()
{
    Master master = getMaster();
    GlobalTime = master.GlobalTime;
    LocalTime = master.InfoUnite.LocalTime;
    ID = master.InfoUnite.ID;

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec3 pcol = pass(uv);
    vec3 col = process(uv, pcol);
    col = saturate(col);

    // tlansition merge 
    vec3 bcol = back(uv);
    // float mixa = remapc(LocalTime, 0.0, TransitionTime, 0.0, 1.0);
    float lt = remapc(LocalTime, 0.0, TransitionTime, 0.0, 1.0);
    lt = pow(lt, 3.0);
    float mixa = mix(0.1, 1.0, lt);
    col = mix(bcol, col, mixa);
    col = saturate(col);

    outColor = vec4(col, 1.0);
}