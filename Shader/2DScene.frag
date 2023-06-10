#version 440

out vec4 outColor;

#pragma include "Shader/params.glsl"
#pragma include "Shader/font.glsl"

uniform sampler2D Tex2DScene;

float GlobalTime;
float LocalTime;

vec2 uv2luv(vec2 uv)
{
    return (uv - 0.5) * 1.5 + 0.5;
}

vec2 luv2uv(vec2 luv)
{
    return (luv - 0.5) / 1.5 + 0.5;
}

/*
time:ランダムな漢字が現れる
fft:?
*/
vec3 layer0(vec2 uv, vec2 res)
{
    SetAspect(res.xy, 12.0, true, false);
    SetAlign(Align_Center_Center);

    const float freq = 20.0;
    float seedx = floor(GlobalTime * freq) / freq;
    // float seedx = floor(high_smooth_integrated.r * 0.05 * freq) / freq;

    SetFontStyle(STYLE_NORMAL);

    float ch = 0.0;
    for(int i = 0; i < 6; i++)
    {
        vec2 seed = vec2(seedx, i);
        int chid = getRandomChar(seed);
        Stack_Char(chid);
    }
    ch += Render_Char(uv);

    return vec3(saturate(ch));
}

/*
time:Lambdaを表示
fft:?
*/
vec3 layer1(vec2 uv, vec2 res)
{
    vec2 nuv = uv;
    SetAspect(res.xy, 6.0, true, false);
    SetAlign(Align_Center_Center);

    const int[6] lambda = int[6](C_L, C_A, C_M, C_B, C_D, C_A);
    int tim = int(LocalTime * 16.0);
    int line = 24;
    float ch = 0.0;

    nuv.y = fract(nuv.y + float(max(0, tim - line)) / 24.0);

    SetFontStyle(STYLE_BOLD);
    for(int i = 0; i < 6; i++)
    {
        int chid = lambda[i];
        Stack_Char(chid);
    }
    ch += Render_Char(nuv);
    nuv.y = fract(nuv.y + 1.0 / 24.0);

    SetFontStyle(STYLE_OUTLINE);
    int maxch = min(tim * 6, line * 6);
    for(int i = 0; i < maxch; i++)
    {
        int id = i % 6;
        Stack_Char(lambda[id]);
        if(id == 5)
        {
            ch += Render_Char(nuv);
            nuv.y = fract(nuv.y + 1.0 / 24.0);
        }
    }
    ch = saturate(ch);

    float ismove = float(frame_count % 8 == 0);
    float bac = texture2D(Tex2DScene, luv2uv(uv + ismove * vec2(36.0, 0) / resolution.x)).r;
    bac *= ismove > 0.5 ? 0.7 : 1.0;
    // TODO: replace with fft
    bool fftb = hash11(float(tim)) > 0.3;
    ch = fftb ? (bac + ismove * ch) : fract(tan(bac + ismove * ch));

    return vec3(saturate(ch));
}
// 16*9 = 144
vec3 layer2(vec2 uv, vec2 res)
{
    vec2 nuv = uv;
    float ltime = LocalTime * 0.5;

    // TODO: replace with fft
    // bool fftb = hash11(floor(LocalTime * 16.0)) > 0.5;
    bool fftb = high.r > 0.5;
    ltime = (ltime > 2.0 && fftb) ? 1.0 : ltime;

    // nuv.y -= floor(max(0.0, ltime) / 9.0 * 2.0 * 32.0) / 32.0;

    nuv.y = 1.0 - nuv.y;
    vec2 ires = res / res.x * 32.0;
    nuv = nuv * ires;
    vec2 iuv = floor(nuv);

    for(int i = 0; i < 4; i++)
    {
        vec2 cuv = (iuv + 0.5) / ires;
        if(hash12(cuv) > 0.6)
        {
            break;
        }
        nuv *= 0.5;
        iuv = floor(nuv);
    }

    float id = (iuv.x + iuv.y * 16.0) / 144.0;
    float c0, c1, c2;
    SetAspect(res.xy, 1.5, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(223);
    c0 = 1.0 - Render_Char(uv);

    SetAspect(res.xy, 1.5, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_NORMAL);
    Stack_Char(223);
    c1 = Render_Char(uv);

    SetAspect(res.xy, 1.5, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_THIN);
    Stack_Char(223);
    c2 = Render_Char(uv);

    float bac = texture2D(Tex2DScene, luv2uv(uv)).r;

    if(id > ltime)
    {
        return vec3(saturate(c1) * 0.2 + bac * 0.8);
    }

    vec2 fuv = fract(nuv);
    fuv.y = 1.0 - fuv.y;

    float ch = 0.0;
    SetAspect(vec2(1), 0.8, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(223);
    ch += Render_Char(fuv);

    vec2 auv = abs(fuv - 0.5) - 0.45;
    float eh = 0.03;
    // ch += float((0.0 < auv.x || 0.0 < auv.y) && (auv.x < eh && auv.y < eh));
    ch = saturate(ch);

    vec2 cen;
    vec3 ha3 = hash31(id);
    float ha = ha3.x;
    if(ha < 0.2)
    {
        cen = vec2(0);
    }
    else if(ha < 0.4)
    {
        cen = vec2(1, 0);
    }
    else if(ha < 0.6)
    {
        cen = vec2(1, 1);
    }
    else if(ha < 0.9)
    {
        cen = vec2(0, 1);
    }
    else
    {
        cen = vec2(0.5);
    }
    float ln = length(fuv - cen) * 5.5;
    float cir = float(fract(ln) < 0.5 && ln < 2.5 + floor(ha3.y * 5.0) * 0.5);

    SetAspect(vec2(1), 0.8, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(223);
    cir = saturate(cir - Render_Char(fuv));

    ch = saturate(ch + cir);
    // bool fftb2 = hash12(vec2(id, floor(LocalTime * 16.0))) > 0.8;
    bool fftb2 = mid.r > 0.5;
    ch += (1.0 - 2.0 * ch) * float(ha3.z < 0.1) * float(fftb2);

    ch *= c0;
    // ch += c1;
    // ch -= c2;
    return vec3(saturate(ch) * 0.2 + bac * 0.8);
}

vec3 layer3(vec2 uv, vec2 res)
{
    float ltime = LocalTime * 2.0;
    // float fr = fract(ltime);
    // float fl = floor(ltime);
    ltime = ltime + sin(ltime * TAU) / TAU;
    // ltime = fl + pow(fr, 2.0);

    vec2 cuv = uv;
    vec2 nuv = uv;

    cuv.y *= res.y / res.x;
    vec3 no = cyclicNoise(vec3(cuv * 5.0, ltime * 0.5)) + 1.0;
    float flux = dot(vec3(1), no) / 8.0;
    flux = clamp((flux - 0.5) * 2.0 + 0.5, 0.0, 1.0);

    const int[4] fluxc = int[4](C_F, C_L, C_U, C_X);
    float ch = 0.0;

    SetAspect(res.xy, 10.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_OUTLINE);
    Stack_Char(fluxc[0]);
    Stack_Char(fluxc[1]);
    Stack_Char(fluxc[2]);
    Stack_Char(fluxc[3]);

    float lh = 0.5 - Char_Size.y * 0.5, rh = 0.5 + Char_Size.y * 0.43;
    nuv.y = remapc(nuv.y, lh, rh, lh, rh);
    ch += Render_Char(nuv);

    SetAspect(res.xy, 10.0, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(fluxc[0]);
    Stack_Char(fluxc[1]);
    Stack_Char(fluxc[2]);
    Stack_Char(fluxc[3]);
    Print_Return(0.26);
    ch += Render_Char(nuv) * float(Font_Anchor.y + Char_Size.y * 0.46 > nuv.y);

    Stack_Char(fluxc[0]);
    Stack_Char(fluxc[1]);
    Stack_Char(fluxc[2]);
    Stack_Char(fluxc[3]);
    Print_Return(-0.26 * 2.0);
    ch += Render_Char(nuv) * float(Font_Anchor.y + Char_Size.y * 0.46 < nuv.y);

    ch *= float(abs(uv.y - 0.5) < ltime / 4.0 / 2.0);

    ch += mix(flux, (1.0 - 2.0 * ch) * flux, saturate(abs(uv.y - 0.5) * 4.0));
    ch = saturate(ch);

    vec2 auv = abs(uv - 0.5);
    bool auvin = auv.x < 0.1 && auv.y < 0.45;
    ch *= float(auvin);

    vec2 fuv = uv;
    SetAspect(res.xy, 12.0, true, false);
    SetAlign(Align_Left_Bottom);
    SetFontStyle(STYLE_OUTLINE_ITALIC);
    for(int i = 0; i < 72; i++)
    {
        Stack_Char(fluxc[i % 4]);
    }
    float fuvyi = fuv.y * 16.0;
    fuv.y = fract(fuvyi) / 16.0;

    fuv.x += (Char_Size.x * SPACE_H * 2.0) * (int(fuvyi) % 2 == 0 ? 2.0 : 1.0);
    float bch = Render_Char(fuv);
    bch += (1.0 - 2.0 * bch) * float(int(fuvyi) % 4 == 0);

    bch *= float(!auvin);
    float bot = floor(16.0 - mod(ltime, 8.0) * 4.0);
    float top = floor(32.0 - mod(ltime, 8.0) * 4.0);
    bch *= float(bot < fuvyi && fuvyi < top);

    ch = saturate(ch + bch);
    return vec3(ch);
}

vec3 layer4(vec2 uv, vec2 res)
{
    float ch = 0.0;
    float ltime = LocalTime * 0.5;
    vec2 auv = pow(saturate(2.0 * (0.5 - abs(uv - 0.5))), vec2(0.5));
    vec2 namp = vec2(0.05, 0.1) * auv.x * auv.y;
    vec2 n = vec2(snoise(vec3(uv * 2.0, ltime)), snoise(vec3(ltime, uv * 2.0))) - 0.5;
    vec2 nuv = namp * n;
    uv += nuv;
    SetAspect(res.xy, 8.0, true, true);
    SetAlign(Align_Left_Bottom);
    SetFontStyle(STYLE_OUTLINE);
    Stack_Char(C_W);
    Stack_Char(C_A);
    Stack_Char(C_V);
    Stack_Char(C_E);
    uv.x = mod(uv.x, 1.0 / 10.0);
    uv.y = mod(uv.y, 1.0 / 14.0);
    ch += float(uv.y < 0.002);
    uv.y += Char_Size.y * 0.45;
    ch += Render_Char(uv);

    return vec3(ch);
}

vec2 _gRes;
// sampler2D gChannel; // Error: sampler2Ds must be uniform
// uniform sampler2D gChannel;

vec4 _sample1(sampler2D channel, vec2 uv, float i, float j)
{
    vec2 px = 1. / _gRes;
    vec2 r = vec2(i, j);

    return texture(channel, uv + px * r);
}

vec2 _diffuse(sampler2D channel, vec2 p)
{
    vec4 diagonals = _sample1(channel, p, 1., 1.) + _sample1(channel, p, 1., -1.) + _sample1(channel, p, -1., -1.) + _sample1(channel, p, -1., 1.);
    vec4 sides = _sample1(channel, p, 1., 0.) + _sample1(channel, p, 0., -1.) + _sample1(channel, p, -1., 0.) + _sample1(channel, p, 0., 1.);
    vec4 center = _sample1(channel, p, 0., 0.);
    return (diagonals * 0.05 + sides * 0.20 - center).xy;
    //return (diagonals + sides * 2. - center * 12.).xy / 21.;
}

vec3 _render(vec2 res, sampler2D channel, vec2 uv)
{
    _gRes = res;
    // gChannel = channel; // l-value required (can't modify a uniform "gChannel")
    vec3 col = vec3(0.0);
    vec2 diff_rate = vec2(1.025, 0.302);
    float feed = 0.031;
    float kill = 0.056;
    float dt = 1.0;

    vec2 ab = _sample1(channel, uv, 0., 0.).xy;
    vec2 delta_ab = diff_rate * _diffuse(channel, uv).xy;
    float reaction = ab.x * ab.y * ab.y;
    delta_ab += vec2(-1., 1.) * reaction;
    delta_ab += vec2(feed * (1. - ab.x), -(kill + feed) * ab.y);
    col.xy = clamp(ab + delta_ab, 0., 1.);

    return vec3(col.x, col.y, 0.0);
}

vec3 layer5(vec2 uv, vec2 res)
{
    vec3 col = vec3(0);
    vec2 guv = luv2uv(uv);
    float ch = texture(Tex2DScene, guv).y;
    // col = (LocalTime < 0.1 ? vec3(1, length(uv - 0.5) < 0.2, 0) : _render(res, Tex2DScene, guv));
    col = (LocalTime < 0.1 ? vec3(1, ch, 0) : _render(res, Tex2DScene, guv));

    float ltime = floor(GlobalTime * 5.0);
    float stmp = 0.0;
    vec2 seed = vec2(42.0, ltime);
    uv += (hash22(seed) - 0.5) * 0.9;
    float size = 3.0 + 5.0 * hash12(seed.yx);
    SetAspect(res.xy, size, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_THIN);
    Stack_Char(hash12(seed + 42.0) < 0.1 ? 223 : getRandomChar(seed));
    stmp += Render_Char(uv);

    col.g += stmp;
    return col;
}

vec3 layer(int id, vec2 uv, vec2 res)
{
    if(id == 0)
    {
        return layer0(uv, res);
    }
    else if(id == 1)
    {
        return layer1(uv, res);
    }
    // else if(id == 2)
    // {
    //     return layer2(uv, res);
    // }
    else if(id == 2)
    {
        return layer3(uv, res);
    }
    else if(id == 3)
    {
        return layer4(uv, res);
    }
    else if(id == 4)
    {
        return layer5(uv, res);
    }
    else
    {
        return layer0(uv, res);
    }
}

vec3 overlay(int id, vec2 uv, vec2 res)
{
    float sen = 0.0;
    vec2 luv = uv2luv(uv);
    vec2 fasp = res / res.y;
    vec2 luvd = (abs(luv - 0.5) - 0.5) * fasp;
    float w = 1e-3;
    sen += float(luvd.x < w && luvd.y < w);
    vec2 suv = remap(uv, vec2(1.0 / 3.0 + 0.5, 0.5 - 1.0 / 3.0), vec2(1.0, 1.0 / 3.0 + 0.5), vec2(0.0), vec2(1.0));
    vec2 fasp2 = vec2(1, 4) / 6.0 * fasp;
    vec2 asuv = (abs(suv - 0.5) - 0.4) * fasp2;
    vec2 asuv2 = abs(asuv);
    float w2 = 2e-2;
    sen += float((0.0 < asuv.x && asuv.x < w) || (0.0 < asuv.y && asuv.y < w)) * float((asuv2.x < w2 && asuv2.y < w2));

    vec2 guv = (suv - vec2(0.5, 0.7)) * fasp2;
    float l0 = length(guv) * 40.0;
    float lf = fract(l0);
    float li = floor(l0) + 1.0;
    float a0 = (atan(guv.y, guv.x) + PI) / TAU;
    float sda = fract(LocalTime * 0.25);
    sen += saturate(float(lf < 0.5) * float(l0 < 4.0) * float(mod(a0 + li * sda, 1.0) < 0.5));

    vec2 guv2 = suv * fasp2 * 52.5 + vec2(0.25, 0);
    vec2 guv2f = fract(guv2);
    vec2 guv2i = floor(guv2);
    vec2 aguv2f = abs(guv2f - 0.5);
    int idy = int(fract(-LocalTime * 0.5) * 29.0) + 3;
    float blc = float(int(guv2i.x) > 1 && int(guv2i.x) < 14) * float(int(guv2i.y) == idy) * float(aguv2f.x < 0.5 && aguv2f.y < 0.5);
    SetAspect(vec2(1), 1.0);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char(getRandomChar(vec2(guv2i.x, idy)));
    sen += blc * (1.0 - Render_Char(guv2f));

    float spec = texture(spectrum, remap(suv.x, 0.1, 0.9, 0.0, 1.0)).r;
    sen += spec * float(inUV(suv, vec2(0.1, 0.1), vec2(0.9, 0.9)));
    // sen += (1.0 - 2.0 * sen) * float(fract((suv.y - suv.x * 0.5) * 15.0) < 0.5) * float(inUV(suv, vec2(0.6, 0.1), vec2(0.9, 0.9)));
    sen += (1.0 - 2.0 * sen) * float(inUV(suv, vec2(0.6, 0.1), vec2(0.9, 0.9)));

    SetAspect(fasp2, 32.0);
    SetAlign(Align_Left_Bottom);
    // SetFontStyle(STYLE_THIN);
    suv.y -= Char_Size.y * 8.0;
    suv.x -= Char_Size.x * 3.0;

    Stack_Char(C_I);
    Stack_Char(C_D);
    Stack_Char(C_minus);
    Stack_Char(C_space);
    Stack_Number(id);
    sen += Render_Char(suv);
    Print_Return(1.0);
    Stack_Char(C_F);
    Stack_Char(C_space);
    Stack_Char(C_minus);
    Stack_Char(C_space);
    Stack_Number(frame_count);
    sen += Render_Char(suv);
    Print_Return(1.0);
    Stack_Char(C_F);
    Stack_Char(C_P);
    Stack_Char(C_minus);
    Stack_Char(C_space);
    Stack_Number(1.0 / time_delta);
    sen += Render_Char(suv);
    Print_Return(1.0);
    Stack_Char(C_L);
    Stack_Char(C_T);
    Stack_Char(C_minus);
    Stack_Char(C_space);
    Stack_Number(LocalTime);
    sen += Render_Char(suv);
    Print_Return(1.0);
    Stack_Char(C_G);
    Stack_Char(C_T);
    Stack_Char(C_minus);
    Stack_Char(C_space);
    Stack_Number(GlobalTime);
    sen += Render_Char(suv);

    float left = 0.0;
    vec2 leuv = remap(uv, vec2(0.0, 0.5 - 1.0 / 3.0), vec2(0.5 - 1.0 / 3.0, 1.0 / 3.0 + 0.5), vec2(0.0), vec2(1.0));
    float lmask = float(inUV(leuv, vec2(0.1), vec2(0.7, 0.6)));
    vec2 leuvs = (leuv - 0.5) * vec2(1, 2) * 0.1;
    vec3 _a, _b;
    float don = (lmask > 0.5 ? domainWarping(vec3(leuvs, snoise(vec3(leuvs + id, GlobalTime * 0.05))), _a, _b) : 1.0);
    left += float(don < 0.02);
    vec2 leuv2 = fract(uv * fasp * 40.0);
    float w3 = w * 40.0;
    float lmask2 = float(inUV(1.0 - leuv, vec2(0.1), vec2(0.7, 0.6)));
    left += (1.0 - lmask) * lmask2 * float(leuv2.x < w3 || leuv2.y < w3);
    SetAspect(fasp2.yx, 3.0);
    SetAlign(Align_Right_Top);
    SetFontStyle(STYLE_OUTLINE_ITALIC);
    vec2 cleuv = vec2(1.0 - leuv.y, leuv.x);
    cleuv.x += Char_Size.x * SPACE_H;
    // cleuv.y += Char_Size.y * SPACE_H;
    Stack_Char(C_2);
    Stack_Char(C_D);
    Stack_Char(C_I);
    Stack_Char(C_M);
    Stack_Char(C_E);
    Stack_Char(C_N);
    Stack_Char(C_S);
    Stack_Char(C_I);
    Stack_Char(C_O);
    Stack_Char(C_N);
    left += Render_Char(cleuv);
    float hlch = 0.0;
    SetAspect(fasp2.yx, 10.0);
    SetAlign(Align_Right_Top);
    SetFontStyle(STYLE_NORMAL);
    // SetFontStyle(STYLE_BOLD);
    cleuv = vec2(leuv.y, 1.0 - leuv.x);
    cleuv.x += Char_Size.x * SPACE_H * 6.0;
    cleuv.y += Char_Size.y * SPACE_H * 3.0;
    Stack_Char(C_S);
    Stack_Char(C_Y);
    Stack_Char(C_S);
    Stack_Char(C_T);
    Stack_Char(C_E);
    Stack_Char(C_M);
    Stack_Char(C_minus);
    Stack_Char(C_M);
    Stack_Char(C_O);
    Stack_Char(C_N);
    Stack_Char(C_O);
    Stack_Char(C_left);
    Stack_Char(C_S);
    Stack_Char(C_P);
    Stack_Char(C_A);
    Stack_Char(C_C);
    Stack_Char(C_E);
    Stack_Char(C_right);
    hlch += Render_Char(cleuv);
    left += hlch;
    // left += float(inUV(leuv, vec2(0.1, 0.6), vec2(0.3, 0.9))) - hlch;

    const int LAYER_COUNT = 5;
    float ch = 0.0;
    const float chspeed = 0.1;
    vec2 cuv = uv;
    const int[16] text0 = int[16](C_M, C_E, C_A, C_N, C_I, C_N, C_G, C_L, C_E, C_S, C_S, 0, 0, 0, 0, 0);
    const int[16] text1 = int[16](C_Y, C_O, C_U, C_space, C_A, C_R, C_E, C_space, C_H, C_E, C_R, C_E, 0, 0, 0, 0);
    // const int[16] text2 = int[16](C_Q, C_U, C_A, C_D, C_T, C_R, C_E, C_E, C_space, C_D, C_I, C_V, C_I, C_D, C_E, 0);
    const int[16] text3 = int[16](C_F, C_L, C_U, C_X, C_space, C_space, C_space, C_space, C_F, C_L, C_U, C_X, C_space, C_space, C_space, C_space);
    const int[16] text4 = int[16](C_W, C_A, C_V, C_E, C_space, C_space, C_space, C_space, C_W, C_A, C_V, C_E, C_space, C_space, C_space, C_space);
    const int[16] text5 = int[16](C_R, C_D, C_space, C_minus, C_space, C_S, C_Y, C_S, C_T, C_E, C_M, 0, 0, 0, 0, 0);
    // const int[LAYER_COUNT][16] texts = int[LAYER_COUNT][16](text0, text1, text2, text3, text4, text5);
    const int[LAYER_COUNT][16] texts = int[LAYER_COUNT][16](text0, text1, text3, text4, text5);

    SetAspect(res.xy, 3.0);
    SetAlign(Align_Left_Top);
    if(cuv.y > 0.5)
    {
        SetFontStyle(STYLE_OUTLINE);
        cuv.x = fract(cuv.x + GlobalTime * chspeed);
    }
    else
    {
        SetFontStyle(STYLE_BOLD);
        cuv.x = fract(cuv.x - GlobalTime * chspeed);
    }

    for(int i = 0; i < 16; i++)
    {
        Stack_Char(texts[id % LAYER_COUNT][i]);
        // Stack_Number((i + int(LocalTime)) % 4);
    }
    // fold
    cuv.y = abs(cuv.y - 0.5) + 0.5;
    ch += Render_Char(cuv);

    float mark = 0.0;
    vec2 muv = uv * fasp * 20.0 + 0.25;
    vec2 muvf = fract(muv);
    vec2 muvi = floor(muv);
    float mtime = floor(LocalTime * 16.0);
    float ma = 0.0;
    vec2 amuvf = abs(muvf - 0.5);
    vec2 aamuvf = abs(amuvf - 0.25);
    float mw = 1e-2;
    mark += float((amuvf.x < mw) || (amuvf.y < mw));
    mark *= float(hash13(vec3(muvi, mtime)) < 0.01);

    float col = saturate(sen + left + ch + mark);
    return vec3(col);
}

float layermask(vec2 uv)
{
    uv = abs(uv - 0.5);
    return float(uv.x < 0.5 && uv.y < 0.5);
}

vec3 uniteLayer(float sht)
{
    Master master = getMaster();
    GlobalTime = master.GlobalTime + sht;
    LocalTime = master.Info2D.LocalTime + sht;

    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 luv = uv2luv(uv);
    vec3 col = vec3(0);
    int layerID = master.Info2D.ID;
    col = (layermask(luv) > 0.5 ? layer(layerID, luv, resolution.xy) : col);
    col = (layermask(luv) < 0.5 ? overlay(layerID, uv, resolution.xy) : col);
    col = saturate(col);
    return col;
}

void main()
{
    // float sht = pow(1.0 / (1.0 + beatButton().y), 10.0) * 0.5;
    // vec3 col = uniteLayer(-sht);
    vec3 col = uniteLayer(0.0);
    outColor = vec4(col, 1.0);
}