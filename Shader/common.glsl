#ifndef COMMON_GLSL
#define COMMON_GLSL

#define PI 3.1415926535897932384626433832795
#define TAU 6.283185307179586476925286766559

#define remap(x,a,b,c,d) ((((x)-(a))/((b)-(a)))*((d)-(c))+(c))
#define remapc(x,a,b,c,d) clamp(remap(x,a,b,c,d),min(c,d),max(c,d))

#ifndef saturate
#define saturate(x) clamp(x,0.0,1.0)
#endif

// Hash without Sine by David Hoskins.
// https://www.shadertoy.com/view/4djSRW
//  1 out, 1 in...
float hash11(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
//  1 out, 2 in...
float hash12(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
//  1 out, 3 in...
float hash13(vec3 p3)
{
    p3 = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}
// 1 out 4 in...
float hash14(vec4 p4)
{
    p4 = fract(p4 * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.x + p4.y) * (p4.z + p4.w));
}
//  2 out, 1 in...
vec2 hash21(float p)
{
    vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}
///  2 out, 2 in...
vec2 hash22(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}
///  2 out, 3 in...
vec2 hash23(vec3 p3)
{
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}
//  3 out, 1 in...
vec3 hash31(float p)
{
    vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

///  3 out, 2 in...
vec3 hash32(vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}
///  3 out, 3 in...
vec3 hash33(vec3 p3)
{
    p3 = fract(p3 * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yxx) * p3.zyx);

}
// 4 out, 1 in...
vec4 hash41(float p)
{
    vec4 p4 = fract(vec4(p) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);

}
// 4 out, 2 in...
vec4 hash42(vec2 p)
{
    vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);

}
// 4 out, 3 in...
vec4 hash43(vec3 p)
{
    vec4 p4 = fract(vec4(p.xyzx) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}
// 4 out, 4 in...
vec4 hash44(vec4 p4)
{
    p4 = fract(p4 * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

//	Simplex 3D Noise 
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x)
{
    return mod(((x * 34.0) + 1.0) * x, 289.0);
}
vec4 taylorInvSqrt(vec4 r)
{
    return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
{
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

// Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

  //  x0 = x0 - 0. + 0.0 * C 
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0 / 7.0; // N=7
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);    // mod(j,N)

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

//Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

// Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
// hemisphere hash function based on a hash by Slerpy
vec3 hashHs(vec3 n, vec3 seed)
{
    vec2 h = hash23(seed);
    float a = h.x * 2. - 1.;
    float b = TAU * h.y * 2. - 1.;
    float c = sqrt(1. - a * a);
    vec3 r = vec3(c * cos(b), a, c * sin(b));
    return r;
}

/**
 * hash function
 */
uvec3 pcg3d(uvec3 s)
{
    s = s * 108137495u + 42985068u;
    s.x += s.y * s.z;
    s.y += s.z * s.x;
    s.z += s.x * s.y;
    s ^= s >> 16;
    s.x += s.y * s.z;
    s.y += s.z * s.x;
    s.z += s.x * s.y;
    return s;
}

/**
 * pcg3d but float
 */
vec3 pcg3df(vec3 s)
{
    uvec3 r = pcg3d(floatBitsToUint(s));
    return vec3(r) / float(0xffffffffu);
}

// https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
#define NUM_OCTAVES 5
float fbm(vec3 x)
{
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100);
    for(int i = 0; i < NUM_OCTAVES; ++i)
    {
        v += a * snoise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

// https://iquilezles.org/articles/warp/
float domainWarping(vec3 p, out vec3 q, out vec3 r)
{
    vec3 s0 = vec3(0.2, 4.2, 3.1) * 0.5;
    vec3 s1 = vec3(1.7, 9.2, 2.3) * 0.5;
    vec3 s2 = vec3(8.3, 2.8, 9.8) * 0.5;
    q = vec3(fbm(p + s0), fbm(p + s1), fbm(p + s2));

    vec3 s3 = vec3(4.7, 1.5, 0.9) * 0.5;
    vec3 s4 = vec3(4.1, 2.9, 5.6) * 0.5;
    vec3 s5 = vec3(6.3, 7.9, 2.5) * 0.5;
    vec3 l = p + 4.0 * q;
    r = vec3(fbm(l + s3), fbm(l + s4), fbm(l + s5));

    return fbm(p + 4.0 * r);
}

float deg2rad(float deg)
{
    return deg * PI / 180.0;
}

float rad2deg(float rad)
{
    return rad * 180.0 / PI;
}

vec2 rot2d(vec2 p, float a)
{
    a *= PI / 180.0;
    float c = cos(a);
    float s = sin(a);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec3 randomSphereDir(vec2 rnd)
{
    float s = rnd.x * PI * 2.;
    float t = rnd.y * 2. - 1.;
    return vec3(sin(s), cos(s), t) / sqrt(1.0 + t * t);
}

mat3 getOrthogonalBasis(vec3 z)
{
    z = normalize(z);
    vec3 up = abs(z.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
    vec3 x = normalize(cross(up, z));
    return mat3(x, cross(z, x), z);
}
// 2.0
vec3 cyclicNoise(vec3 p, float pump = 2.0)
{
    vec4 sum = vec4(0.0);
    mat3 basis = getOrthogonalBasis(vec3(-1.0, 2.0, -3.0));
    for(int i = 0; i < 10; i++)
    {
        p *= basis;
        p += sin(p.yzx);
        sum += vec4(cross(cos(p), sin(p.zxy)), 1.0);
        sum *= pump;
        p *= 2.0;
    }
    return sum.xyz / sum.w;
}

bool inUV(vec2 uv, vec2 uv_min, vec2 uv_max)
{
    return all(greaterThanEqual(uv, uv_min)) && all(lessThanEqual(uv, uv_max));
}

float vmin(vec2 v)
{
    return min(v.x, v.y);
}
float vmin(vec3 v)
{
    return min(v.x, min(v.y, v.z));
}
float vmin(vec4 v)
{
    return min(v.x, min(v.y, min(v.z, v.w)));
}

float vmax(vec2 v)
{
    return max(v.x, v.y);
}
float vmax(vec3 v)
{
    return max(v.x, max(v.y, v.z));
}
float vmax(vec4 v)
{
    return max(v.x, max(v.y, max(v.z, v.w)));
}
#endif