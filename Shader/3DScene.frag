#version 440

out vec4 outColor;

// #define DEBUG
// #define TAA
// Dont touch----------------------------------------------------------------------------------

// Include----------------------------------------------------------------------------------
#pragma include "Shader/params.glsl"
#pragma include "Shader/font.glsl"

#define LoopMax 256
#define DistMin 1e-3
#define LenMax 1000.0
#define NormalEPS 1e-3

#define iTime time
#define iResolution resolution

// Global----------------------------------------------------------------------------------
float GlobalTime;
int MatID;
vec3 CP;

struct Mat
{
    int mat;// 0:Emission,1:Standard
    vec3 color;
    float roughness;
    float metallic;
    vec3 nmap;// just normalize(normal + nmap)
};
#define EMISSION 0
#define STANDARD 1
#define Mat() Mat(EMISSION,vec3(0),0.0,0.0,vec3(0))
#define MAT_SKY Mat()

struct SubdivResult
{
    int depth;
    vec3 size;
    vec3 cell;
    vec3 hash;
};
struct GridResult
{
    SubdivResult subdiv;
    vec3 normal;// maybe not use
    float d;
};

// last grid result
GridResult GRes;

uniform sampler2D Tex3DScene;
uniform sampler2D Tex2DRes;

// SDF-------------------------------------------------------------------------------------
float sdBox(vec3 p, vec3 b)
{
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdBox(vec3 p, float s)
{
    return sdBox(p, vec3(s));
}

float sdSphere(vec3 p, float s)
{
    return length(p) - s;
}

float sdPlane(vec3 p, vec3 n, float h)
{
    return dot(p, n) + h;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r)
{
    vec3 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

// SDF Modifier----------------------------------------------------------------------------

mat2 rot(float a)
{
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

vec2 pmod(vec2 p, float n)
{
    float a = mod(atan(p.y, p.x), TAU / n) - .5 * TAU / n;
    return length(p) * vec2(sin(a), cos(a));
}

vec3 bfold(vec3 p)
{
    if(p.x < p.y)
        p.xy = p.yx;
    if(p.x < p.z)
        p.xz = p.zx;
    if(p.y < p.z)
        p.yz = p.zy;
    return p;
}

void rotCenter(inout vec3 p, inout vec3 rd)
{
    vec4 but = beatButton();
    int bcount = int(but.w + 0.5);
    float blt = pow(1.0 / (1.0 + but.y), 10.0);
    vec2 rto = hash21(float(bcount) * 42.0) * 180.0;
    vec2 rfrom = hash21(float(bcount - 1) * 42.0) * 180.0;
    vec2 rot2 = mix(rfrom, rto, blt);
    p.xz = rot2d(p.xz, rot2.x);
    p.xy = rot2d(p.xy, rot2.y);
    rd.xz = rot2d(rd.xz, rot2.x);
    rd.xy = rot2d(rd.xy, rot2.y);
}

// LIVE CODING SPACE vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

// bool ENABLE_CENTER = true;
bool ENABLE_CENTER = (int(beatButton().w + 0.5) % 2 == 0);

vec4 BTN = beatButton();
float BC = BTN.w;
float BT = pow(1.0 / (1.0 + BTN.y), 5.0);
int FID = 0;

float city(vec3 p)
{
    float s=p.y=1.0-abs(p.y),k=10.0;
    int id=0;
    for(int i=0;i<10;i++)
    {
        p.xz*=rot(PI*0.25);
        p=k*sliders[1]-abs(mod(p,2.0*k)-k);
        k*=0.5;
        float d=vmin(p);
        if(s<d)
        {
            id=i;
        }
        s=max(s,d);
    }
    FID=id;
    return s;
}

float sdf(vec3 p)
{
    float d=city(p);
    return d;
}

float origin(vec3 p)
{
    vec3 _d;
    rotCenter(p, _d);
    return sdBox(p, 1.0 - DistMin);
}

float lambda(vec3 p)
{
    return min(sdf(p),origin(p));
}

Mat lambdaMat(vec3 p)
{
    Mat mat = Mat();
    int b=int(BC*0.5+0.5)%10;
    mat.mat = (FID==b)?EMISSION:STANDARD;
    mat.color = vec3(1.0);
    mat.metallic = 0.5;
    return mat;
}

// LIVE CODING SPACE ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

SubdivResult subdivision(vec3 p)
{
    SubdivResult result;
    vec3 bsize = vec3(0.5);
    float th = 0.5;
    float dh = hash13(hash31(beatButton().w) * 42.0);
    int depth = 1 + int(dh * 3.0);

    result.size = bsize;
    result.depth = 0;
    for(int i = 0; i < depth; i++)
    {
        result.cell = (floor(p / result.size) + 0.5) * result.size;
        result.hash = hash33(vec3(hash23(result.cell), beatButton().w) * 42.0);
        if(i == depth - 1 || result.hash.x < th)
        {
            break;
        }
        result.size *= 0.5;
        result.depth++;
    }

    return result;
}

GridResult gridTraversal(vec3 rp, vec3 rd)
{
    GridResult result;
    result.subdiv = subdivision(rp);
    vec3 src = -(rp - result.subdiv.cell) / rd;
    vec3 dst = abs(0.5 * result.subdiv.size / rd);
    vec3 bd = src + dst;
    vec3 bn = src - dst;
    result.d = min(min(bd.x, bd.y), bd.z);
    result.normal = -sign(rd) * step(bn.yzx, bn.xyz) * step(bn.zxy, bn.xyz);
    return result;
}

float gridSDF(vec3 p)
{
    float d = LenMax;
    d = min(d, sdBox(p, vec3(1.0)));
    return d;
}

float gridBox(vec3 p, vec3 rd)
{
    const float th = 0.5;
    vec3 bsize = vec3(0.5);
    GridResult result = gridTraversal(p, rd);
    GRes = result;
    // std sdf
    vec3 scale = 4.0 * bsize / result.subdiv.size;
    vec3 cp = (p - result.subdiv.cell) * scale;
    float sdfscale = 1.0 / max(scale.x, max(scale.y, scale.z));
    float d = result.d;
    d = min(d, gridSDF(cp));
    d *= sdfscale;
    // exist
    bool exist = result.subdiv.hash.y < th;
    d = exist ? d : result.d;
    d += DistMin * 1.0;// TODO:maybe 1.0 for just box
    return d;
}

float room(vec3 p)
{
    return -sdBox(p, vec3(4.1, 2, 4.1));
}

float screenID(vec3 p, int id)
{
    p.xz = rot2d(p.xz, float(id) * 90.0);
    const float x = 3.5;
    const float y = x * 9.0 / 16.0;
    vec2 edge = vec2(x, y);

    float d0 = sdBox(p, vec3(x, y, 4.0));
    float d1 = sdPlane(p, vec3(0, 0, -1), 4.0);
    return max(d0, d1);
}

float screen(vec3 p)
{
    float d = LenMax;
    for(int i = 0; i < 4; i++)
    {
        d = min(d, screenID(p, i));
    }
    return d;
}

#define ENABLE_ROTATE  false
float hoge(vec3 p)
{
    vec3 _d;
    if(ENABLE_ROTATE)
    {
        rotCenter(p, _d);
    }
    return lambda(p);
}

float modifire(vec3 p, vec3 rp)
{
    // if(ENABLE_ROTATE)
    // {
    //     return hoge(rp);
    // }
    // else
    // {
    //     return hoge(p);
    // }
    return hoge(p);
}

float center(vec3 p, vec3 rd)
{
    float d = LenMax;
    vec3 np = p, nrd = rd;
    rotCenter(np, nrd);
    d = min(d, gridBox(np, nrd));
    d = max(d, modifire(p, np));
    return d;
}

float pillarR(vec3 p)
{
    // round
    float size = 0.1;
    p.xz = abs(p.xz);
    p -= vec3(1.5, 0, 1.5);
    p.xz = rot2d(p.xz, (p.y - GlobalTime * 0.5) * 60.0);
    return sdBox(p, vec3(size, 3, size));
}

// https://www.shadertoy.com/view/ttB3DV
float profileSquare(vec2 p, vec2 dim)
{
    vec2 d = abs(p) - dim;
    return length(max(d, vec2(0))) + min(max(d.x, d.y), 0.0);
}
vec3 closestPointOnCylinder(vec3 p, vec2 dim)
{
    return vec3(normalize(p.xy) * dim.x, clamp(p.z, -dim.y / 2.0, dim.y / 2.0));
}
float pillarT(vec3 p)
{
    p = p.xzy;
    float radius = 2.0;
    float height = 4.0;
    float coils = PI;
    float freq = 1.0;
    vec3 pc = closestPointOnCylinder(p, vec2(radius, height));
    float distToCyl = distance(p, pc);
    float distToCoil = asin(sin(p.z * coils + freq * atan(p.x, p.y) - GlobalTime * 0.5)) / coils;
    vec2 springCoords = vec2(distToCyl, distToCoil);
    float profile = profileSquare(springCoords, vec2(0.05)) - 0.02;
    return profile * (max(radius / 2.0 - abs(length(p.xy) - radius), 0.0) * 0.3 + 0.7);
}

float pillar(vec3 p)
{
    return pillarR(p);
}

float dai(vec3 p)
{
    float d = LenMax;
    float h = 0.25;
    p.y = abs(p.y);
    d = min(d, sdBox(p - vec3(0, 2.0 - 0.5 * h, 0), vec3(2.0, 0.5 * h, 2.0)) - 0.05);
    return d;
}

float sphere(vec3 p)
{
    float d = LenMax;
    p.xz = abs(p.xz);
    d = sdSphere(p - vec3(2 - 0.15, -2 + 0.25 + 0.3, 2 - 0.15), 0.25);
    return d;
}

float sdf(vec3 p, vec3 rd)
{
    #define opSDFMin(sdf) (id = ((dt = sdf) < d ? (d = dt, mid): id)), mid++
    #define opSDFMax(sdf) (id = ((dt = sdf) > d ? (d = dt, mid): id)), mid++
    int id = -1, mid = 0;

    float dt, d = LenMax;
    opSDFMin(room(p));
    opSDFMin(screen(p));
    if(ENABLE_CENTER)
    {
        opSDFMin(center(p, rd));
    }
    else
    {
        opSDFMin(hoge(p));
    }
    opSDFMin(pillar(p));
    opSDFMin(dai(p));
    opSDFMin(sphere(p));

    MatID = id;
    return d;
}

vec3 getNormal(vec3 p, vec3 rd)
{
    const float h = NormalEPS;
    const vec2 k = vec2(1, -1);
    return normalize(k.xyy * sdf(p + k.xyy * h, rd) + k.yyx * sdf(p + k.yyx * h, rd) + k.yxy * sdf(p + k.yxy * h, rd) + k.xxx * sdf(p + k.xxx * h, rd));
}

// Material-------------------------------------------------------------------------------- 

/*
struct Mat
{
    int mat;// 0:Emission,1:Standard
    vec3 color;
    float roughness;
    float metallic;
    vec3 nmap;// just normalize(normal + nmap)
};
*/
Mat roomMat(vec3 p)
{
    Mat res = Mat();
    res.mat = STANDARD;
    res.metallic = 0.9;
    res.roughness = 0.5;
    float freq = 4.0;
    vec3 np = p * freq;
    float _time = GlobalTime * 0.5;
    vec2 rnd0 = vec2(snoise(np + vec3(0, -_time, 0)), snoise(vec3(np.yz + 42.0, _time)));
    res.nmap = randomSphereDir(rnd0) * 0.05;
    res.color = vec3(1);
    return res;
}

Mat screenMat(vec3 p)
{
    Mat res = Mat();
    res.mat = EMISSION;

    float a = atan(p.x, p.z) + PI + PI / 4.0;
    float len = length(p.xz);
    a = mod(a, PI * 0.5) + PI / 4.0;
    p.xz = len * vec2(cos(a), sin(a));

    const float x = 3.5;
    const float y = x * 9.0 / 16.0;
    vec2 edge = vec2(x, y);

    vec2 uv = remapc(p.xy, -edge, edge, vec2(0), vec2(1));
    uv.x = 1.0 - uv.x;
    res.color = texture(Tex2DRes, uv).rgb;
    return res;
}

// TODO:change material via GRes
/*
struct SubdivResult
{
    int depth;
    vec3 size;
    vec3 cell;
    vec3 hash;
};
struct GridResult
{
    SubdivResult subdiv;
    vec3 normal;// maybe not use
    float d;
};
*/

// TODO:poor
Mat centerMat(vec3 p, vec3 rd)
{
    rotCenter(p, rd);
    // is this poor?
    const int num = 3;
    Mat[num] mats = Mat[num](Mat(), Mat(), Mat());
    mats[0].mat = EMISSION;
    mats[0].metallic = 0.0;
    mats[0].color = vec3(1.0, 0.1, 0.1);

    mats[1].mat = EMISSION;
    mats[1].metallic = 0.0;
    mats[1].color = vec3(1.0);

    mats[2].mat = STANDARD;
    mats[2].metallic = 1.0;
    mats[2].roughness = 0.0;
    mats[2].color = vec3(1.0);

    // rot
    vec4 but = beatButton();
    int bcount = int(but.w + 0.5);
    float blt = pow(1.0 / (1.0 + but.y), 10.0);

    vec4 seed4 = vec4(GRes.subdiv.cell * 42.0, but.w);
    vec4 hash4 = hash44(seed4);
    int id = int(hash4.x * float(num)) % num;
    Mat mat = mats[id];

    mat.color = (hash11(but.w) < 0.8 ? vec3(mat.color.r) : vec3(mat.color.r, 0.1, 0.1));

    vec2 uv;
    int uvi = 0;
    float amp = 1.0;
    vec3 cell = GRes.subdiv.cell;
    vec3 size = GRes.subdiv.size;
    vec3 pc = clamp((p - cell) / size, -1.0, 1.0);
    const ivec3 order = ivec3(0, 2, 1);
    for(int i = 0; i < 3; i++)
    {
        int oi = order[i];
        float ni = GRes.normal[oi];
        if(abs(ni) < 0.5)
        {
            uv[uvi++] = pc[oi];
        }
        else
        {
            amp = sign(ni);
        }
    }

    uv = clamp(uv * 0.5 + 0.5, 0.0, 1.0);
    uv = (hash4.y < 0.5 ? uv : uv.yx);
    uv.x = fract(uv.x + blt * 0.5);

    SetAspect(vec2(1), 1.5, true, false);
    SetAlign(Align_Center_Center);
    SetFontStyle(STYLE_BOLD);
    Stack_Char((hash11(but.w * 4.2 + .42) < 0.1) ? 223 : getRandomKanji(hash4.xy * 42.0));
    // Stack_Char(getRandomChar(hash4.xy * 42.0));
    // Stack_Char(223);
    float ch = Render_Char(uv);
    ch = (hash4.z < 0.5) ? 1.0 - ch : ch;
    ch = (hash4.w < 0.3) ? ch * float(fract((uv.x + uv.y + GlobalTime * 0.1 + blt) * 8.0) < 0.5) : ch;

    bool isemi = (mats[id].mat == EMISSION) && (ch > 0.1);
    mat.mat = (isemi ? EMISSION : STANDARD);
    mat.nmap = hash4.xyz * ch;
    return mat;
}

Mat pillarMat(vec3 p)
{
    Mat res = Mat();
    res.mat = STANDARD;
    res.color = vec3(1.0);
    res.metallic = 0.9;
    res.roughness = 0.5;
    return res;
}

Mat daiMat(vec3 p)
{
    Mat res = Mat();
    res.mat = STANDARD;
    res.color = vec3(1.0);
    res.metallic = 0.5;
    res.roughness = 0.5;
    return res;
}

Mat sphereMat(vec3 p)
{
    Mat res = Mat();
    res.mat = STANDARD;
    res.color = vec3(1.0);
    res.metallic = 1.0;
    res.roughness = 0.5;
    return res;
}

Mat mat(vec3 p, vec3 rd)
{
    #define ifMat(mat) if(MatID == mid++)return mat
    int mid = 0;

    ifMat(roomMat(p));
    ifMat(screenMat(p));
    if(ENABLE_CENTER)
    {
        ifMat(centerMat(p, rd));
    }
    else
    {
        ifMat(lambdaMat(p));
    }
    ifMat(pillarMat(p));
    ifMat(daiMat(p));
    ifMat(sphereMat(p));

    return Mat();
}

// Lights----------------------------------------------------------------------------

float Fd_Burley(float ndotv, float ndotl, float ldoth, float roughness)
{
    float fd90 = 0.5 + 2.0 * ldoth * ldoth * roughness;
    float lightScatter = (1.0 + (fd90 - 1.0) * pow(1.0 - ndotl, 5.0));
    float viewScatter = (1.0 + (fd90 - 1.0) * pow(1.0 - ndotv, 5.0));
    float diffuse = lightScatter * viewScatter;
    return diffuse;
}
float V_SmithGGXCorrelated(float ndotl, float ndotv, float alpha)
{
    float lambdaV = ndotl * (ndotv * (1.0 - alpha) + alpha);
    float lambdaL = ndotv * (ndotl * (1.0 - alpha) + alpha);
    return 0.5 / (lambdaV + lambdaL + 0.0001);
}
float D_GGX(float perceptualRoughness, float ndoth, vec3 normal, vec3 halfDir)
{
    vec3 ncrossh = cross(normal, halfDir);
    float a = ndoth * perceptualRoughness;
    float k = perceptualRoughness / (dot(ncrossh, ncrossh) + a * a);
    float d = k * k / PI;
    return min(d, 65504.0);
}
#define _DielectricF0 0.04
vec3 F_Schlick(vec3 f0, float cos)
{
    return f0 + (1.0 - f0) * pow(1.0 - cos, 5.0);
}
// vec3 BRDF(vec3 albedo, float metallic, float perceptualRoughness, vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor, vec3 indirectDiffuse, vec3 indirectSpecular)
// {
//     vec3 halfDir = normalize(lightDir + viewDir);
//     float ndotv = abs(dot(normal, viewDir));
//     float ndotl = max(0, dot(normal, lightDir));
//     float ndoth = max(0, dot(normal, halfDir));
//     float ldoth = max(0, dot(lightDir, halfDir));
//     float reflectivity = mix(_DielectricF0, 1, metallic);
//     vec3 f0 = mix(_DielectricF0, albedo, metallic);
//     float diffuseTerm = Fd_Burley(ndotv, ndotl, ldoth, perceptualRoughness) * ndotl;
//     vec3 diffuse = albedo * (1 - reflectivity) * lightColor * diffuseTerm; // Indirect Diffuse
//     diffuse += albedo * (1 - reflectivity) * indirectDiffuse;

//     float alpha = perceptualRoughness * perceptualRoughness;
//     float V = V_SmithGGXCorrelated(ndotl, ndotv, alpha);
//     float D = D_GGX(perceptualRoughness, ndotv, normal, halfDir);
//     vec3 F = F_Schlick(f0, ldoth);
//     vec3 specular = V * D * F * ndotl * lightColor;
//     specular *= PI;// maybe not needed?
//     specular = max(0, specular); // Indirect Specular
//     float surfaceReduction = 1.0 / (alpha * alpha + 1.0);
//     float f90 = saturate((1 - perceptualRoughness) + reflectivity);
//     specular += surfaceReduction * indirectSpecular * mix(f0, f90, pow(1 - ndotv, 5));
//     vec3 color = diffuse + specular;
//     return color;
// }

vec3 BDRF_Indirect(vec3 albedo, float metallic, float perceptualRoughness, vec3 normal, vec3 viewDir, vec3 indirectDiffuse, vec3 indirectSpecular)
{
    float ndotv = abs(dot(normal, viewDir));
    float reflectivity = mix(_DielectricF0, 1.0, metallic);
    vec3 diffuse = albedo * (1.0 - reflectivity) * indirectDiffuse;

    float alpha = perceptualRoughness * perceptualRoughness;
    float surfaceReduction = 1.0 / (alpha * alpha + 1.0);
    vec3 f0 = mix(vec3(_DielectricF0), albedo, metallic);
    float f90 = saturate((1.0 - perceptualRoughness) + reflectivity);
    vec3 specular = surfaceReduction * indirectSpecular * mix(f0, vec3(f90), pow(1.0 - ndotv, 5.0));

    vec3 color = diffuse + specular;
    return color;
}

vec3 BDRF_Direct(vec3 albedo, float metallic, float perceptualRoughness, vec3 normal, vec3 viewDir, vec3 lightDir, vec3 lightColor)
{
    vec3 halfDir = normalize(lightDir + viewDir);
    float ndotv = abs(dot(normal, viewDir));
    float ndotl = max(0.0, dot(normal, lightDir));
    float ndoth = max(0.0, dot(normal, halfDir));
    float ldoth = max(0.0, dot(lightDir, halfDir));
    float reflectivity = mix(_DielectricF0, 1.0, metallic);
    vec3 f0 = mix(vec3(_DielectricF0), albedo, metallic);
    float diffuseTerm = Fd_Burley(ndotv, ndotl, ldoth, perceptualRoughness) * ndotl;
    vec3 diffuse = albedo * (1.0 - reflectivity) * lightColor * diffuseTerm; // Indirect Diffuse

    float alpha = perceptualRoughness * perceptualRoughness;
    float V = V_SmithGGXCorrelated(ndotl, ndotv, alpha);
    float D = D_GGX(perceptualRoughness, ndotv, normal, halfDir);
    vec3 F = F_Schlick(f0, ldoth);
    vec3 specular = V * D * F * ndotl * lightColor;
    specular *= PI;// maybe not needed?
    specular = max(vec3(0), specular); // Indirect Specular

    vec3 color = diffuse + specular;
    return color;
}

// for indirectDiffuse
vec3 getAmbientColor()
{
    return vec3(0.1);
}

#define LightCount 2
// 0:screen
// 1:center

float lightSDF(vec3 p, vec3 rd, int id)
{
    #define ifLightSDF(sdf) if(id == mid++)return sdf
    int mid = 0;

    ifLightSDF(screen(p));
    if(ENABLE_CENTER)
    {
        ifLightSDF(center(p, rd));
    }
    else
    {
        ifLightSDF(hoge(p));
    }

    return LenMax;
}

// only for emission material
vec3 lightCol(vec3 p, vec3 rd, int id)
{
    #define ifLightColor(matFunc) if(id == mid++)return (tmpmat = matFunc).color*float(tmpmat.mat==EMISSION)
    Mat tmpmat = Mat();
    int mid = 0;

    ifLightColor(screenMat(p));
    if(ENABLE_CENTER)
    {
        ifLightColor(centerMat(p, rd));
    }
    else
    {
        ifLightColor(lambdaMat(p));
    }

    return vec3(0);
}

vec3 lightDirection(vec3 p, vec3 rd, int id)
{
    const float h = NormalEPS;
    const vec2 k = vec2(1, -1);
    return -normalize(k.xyy * lightSDF(p + k.xyy * h, rd, id) + k.yyx * lightSDF(p + k.yyx * h, rd, id) + k.yxy * lightSDF(p + k.yxy * h, rd, id) + k.xxx * lightSDF(p + k.xxx * h, rd, id));
}

float lightAttenuation(float dist)
{
    const float lightRange = 5.0;
    dist = max(dist, 0.0);
    return pow(clamp(1.0 - (1.0 / lightRange) * dist, 0.0, 1.0), 2.0);
}

// do approximate light
#define LightSample 8
void calcLight(int id, vec3 rp, out vec3 lightRp, out vec3 lightDir, out vec3 lightColor)
{
    const float maxdiff = 0.25;
    const float distFactor = 0.5;

    float attsum = 0.0;
    vec3 colsum = vec3(0);
    vec3 rd, ro;
    rd = vec3(0, 1, 0);
    ro = rp;
    // lightDir = lightDirection(rp, rd, id);

    for(int j = 0; j < LightSample; j++)
    {
        rd = lightDirection(rp, rd, id);
        float diff = clamp(1.0 - float(j) / float(LightSample), 0.0, 1.0) * maxdiff;
        // j,rd,id
        vec2 rnd = hash23(vec3(float(j) + GlobalTime, hash13(rp * 42.0) * 42.0, float(id) * 42.0));
        rd = normalize(rd + diff * randomSphereDir(rnd));
        float dist = lightSDF(rp, rd, id);
        vec3 col = lightCol(rp, rd, id);
        float att = lightAttenuation(dist);
        // weight
        colsum += col * att;
        attsum += att;
        rp += rd * dist * distFactor;
    }
    lightRp = rp;
    lightDir = normalize(lightRp - ro);
    lightColor = colsum / attsum;
    float len = length(lightRp - ro);
    lightColor *= lightAttenuation(len);
}

float calcAO(vec3 p, vec3 rd, vec3 n, float d)
{
    return clamp(sdf(p + n * d, rd) / d, 0., 1.);
}

// Tracer----------------------------------------------------------------------------

Mat calcIntersect(vec3 rd, vec3 ro, out vec3 rp, out float dist, out float len)
{
    len = 0.0;
    rp = ro;
    for(int i; i < LoopMax; i++)
    {
        dist = sdf(rp, rd);
        len += dist;
        rp = ro + rd * len;
        if(dist < DistMin)
        {
            return mat(rp, rd);
        }
    }
    // return mat(rp, rd);
    return MAT_SKY;
}

vec4 tracer(vec3 rd, vec3 ro)
{
	// first raycast
    vec3 rp;
    float dist, len;
    Mat mat = calcIntersect(rd, ro, rp, dist, len);
    if(mat.mat == EMISSION)
    {
        return vec4(mat.color * 3.0, length(rp - ro));
    }

    // shading
    vec3 normal = normalize(getNormal(rp, rd) + mat.nmap);
    vec3 nrp = rp + normal * DistMin * 10.0;
    // indirect light
    vec3 indirectDiffuse = getAmbientColor();
    vec3 ro_s = nrp;
    vec3 rd_s = reflect(rd, normal);
    vec3 rp_s;
    float dist_s, len_s;
    Mat mat_s = calcIntersect(rd_s, ro_s, rp_s, dist_s, len_s);
    vec3 indirectSpecular = mat_s.color * float(mat_s.mat == EMISSION);
    // bdrf
    vec3 indirect = BDRF_Indirect(mat.color, mat.metallic, mat.roughness, normal, rd, indirectDiffuse, indirectSpecular);
    vec3 direct = vec3(0);
    int lcount = (ENABLE_CENTER ? LightCount : LightCount - 1);
    for(int i = 0; i < LightCount; i++)
    {
        // direct light
        vec3 lightRp, lightDir, lightColor;
        calcLight(i, nrp, lightRp, lightDir, lightColor);
        // direct += lightDir;
        direct += BDRF_Direct(mat.color, mat.metallic, mat.roughness, normal, rd, lightDir, lightColor);
    }
    vec3 color = indirect + direct * 1.5;
    // vec3 color = direct;
    // some post process
    float ao = calcAO(rp, rd, normal, 0.1);
    color *= ao;
    color = clamp(color, 0.0, 1.0);
    return vec4(color, length(rp - ro));
}

// Root----------------------------------------------------------------------------
void setParameters(vec2 coord)
{
    GlobalTime = time;
    #ifdef TAA
    GlobalTime += (hash12(hash23(vec3(GlobalTime, coord)))) * 0.005;
    #endif
}

void getUVandSeed(out vec2 uv, out vec2 suv, out float seed, inout vec2 fragCoord)
{
    // CRT
    uv = fragCoord / iResolution.xy;
    vec2 taa = vec2(0);
    #ifdef TAA
    taa = hash23(vec3(GlobalTime, fragCoord)) - 0.5;
    #endif
    seed = hash12(taa * 42.0 - 0.42) * 42.0;
    suv = (2.0 * (fragCoord + taa) - iResolution.xy) / min(iResolution.x, iResolution.y);
}

void getRORD(out vec3 ro, out vec3 rd, out vec3 dir, vec2 suv)
{
    // Parameter
    float fov;
    vec3 ta;
    float fisheye = 0.0;
    bool pars = true;
    float ortho = 2.5;

    vec3 trd, tro;
    float ttime = GlobalTime * 0.005;
    vec3 tseed = vec3(ttime, ttime + 42.42, -ttime + 42.42);
    float tins = domainWarping(tseed, trd, tro);
    tro = normalize(tro - 0.5);
    tro *= 0.25;
    float troins = 1.0;

    // sequence
    int sid = int(cameraButton().w + 0.5) % 4;
    if(sid == 0)
    {
        fov = 90.0;
        ro = vec3(0, 0, -3.0);
        ro.xz = rot2d(ro.xz, GlobalTime * 5.0);
        ta = vec3(0, 0, 0);
    }
    else if(sid == 1)
    {
        fov = 90.0;
        fisheye = 1.0;
        ro = vec3(-3.5, -1.5, -3.5 + 7.0 * fract(GlobalTime * 0.05));
        ta = vec3(0, -0.5, 0);
    }
    else if(sid == 2)
    {
        pars = false;
        fov = 90.0;
        ro = vec3(0, -0.5, -2.75);
        ro.xz = rot2d(ro.xz, GlobalTime * 5.0);
        ta = vec3(0, 0, 0);
    }
    else
    {
        troins = 3.0;
        fov = 100.0;
        fisheye = 0.5;
        ro = vec3(0, 0, -3.0);
        ta = vec3(0, 0, 0);
    }

    // calc dir
    dir = normalize(ta - ro);

    // tebure
    ro = ro + tro * troins;

    // calc rd
    float cr = 0.0;
    vec3 cw = normalize(dir);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    float zf = 1.0 / tan(fov * PI / 360.0);
    zf -= zf * length(suv) * fisheye;
    if(pars)
    {
        rd = normalize(-cu * suv.x + cv * suv.y + cw * zf);
    }
    else
    {
        rd = dir;
        ro += suv.x * cu * ortho + suv.y * cv * ortho;
    }
}

void main()
{
    if(is2D())
    {
        outColor = vec4(0);
        return;
    }

    vec2 fragCoord = gl_FragCoord.xy;

    // Set some parameters
    setParameters(fragCoord);

    // Get UV and Seed
    float seed;
    vec2 uv, suv;
    getUVandSeed(uv, suv, seed, fragCoord);

    // Camera
    vec3 ro, rd, dir;
    getRORD(ro, rd, dir, suv);
    CP = ro;

    // Tracer
    vec4 col = tracer(rd, ro);

    #ifdef TAA
    const float bl = 0.5;
    col = texture(Tex3DScene, uv) * bl + col * bl;
    #endif

    // Output
    outColor = col;

    // Debug for some value printf
    #ifdef DEBUG
    float debugCh = 0.0;
    SetAspect(iResolution.xy, 24.0);
    SetAlign(Align_Left_Top);
    // OffSetAnchor(vec2(0,0));
    // ro
    Stack_Char(C_R);
    Stack_Char(C_O);
    Stack_Char(C_comma);
    Stack_Char(C_x);
    Stack_Char(C_colon);
    Stack_Sign(ro.x);
    Stack_Number(ro.x);
    debugCh += Render_Char(uv);
    Print_Return();

    // debugCh += Print_Char(uv, C_R);
    // debugCh += Print_Char(uv, C_O);
    // debugCh += Print_Char(uv, C_comma);
    // debugCh += Print_Char(uv, C_x);
    // debugCh += Print_Char(uv, C_colon);
    // debugCh += Print_Sign(uv, ro.x);
    // debugCh += Print_Number(uv, ro.x);

    Stack_Char(C_R);
    Stack_Char(C_O);
    Stack_Char(C_comma);
    Stack_Char(C_y);
    Stack_Char(C_colon);
    Stack_Sign(ro.y);
    Stack_Number(ro.y);
    debugCh += Render_Char(uv);
    Print_Return();
    Stack_Char(C_R);
    Stack_Char(C_O);
    Stack_Char(C_comma);
    Stack_Char(C_z);
    Stack_Char(C_colon);
    Stack_Sign(ro.z);
    Stack_Number(ro.z);
    debugCh += Render_Char(uv);
    Print_Return();
    // dir
    Stack_Char(C_D);
    Stack_Char(C_I);
    Stack_Char(C_comma);
    Stack_Char(C_x);
    Stack_Char(C_colon);
    Stack_Sign(dir.x);
    Stack_Number(dir.x);
    debugCh += Render_Char(uv);
    Print_Return();
    Stack_Char(C_D);
    Stack_Char(C_I);
    Stack_Char(C_comma);
    Stack_Char(C_y);
    Stack_Char(C_colon);
    Stack_Sign(dir.y);
    Stack_Number(dir.y);
    debugCh += Render_Char(uv);
    Print_Return();
    Stack_Char(C_D);
    Stack_Char(C_I);
    Stack_Char(C_comma);
    Stack_Char(C_z);
    Stack_Char(C_colon);
    Stack_Sign(dir.z);
    Stack_Number(dir.z);
    debugCh += Render_Char(uv);
    Print_Return();

    // SetAspect(iResolution.xy, 4.0);
    // SetAlign(Align_Center_Center);
    // Stack_Char(C_0);
    // Stack_Char(C_g);
    // debugCh += Render_Char(uv);

    debugCh = clamp(debugCh, 0.0, 1.0);
    outColor.rgb += debugCh;
    // outColor.rgb -= 10.0 * vec3(abs(uv.y - 0.5) < 0.001 || abs(uv.x - 0.5) < 0.001, 0, 0);
    #endif

    // clamp
    // outColor.rgb = clamp(outColor.rgb, 0.0, 1.0);
}