#pragma once
#ifndef FONT_GLSL
#define FONT_GLSL

#include "Shader/common.glsl"
// Chars Area ------------------------------------------------------------------------------

#define C_0 16
#define C_1 17
#define C_2 18
#define C_3 19
#define C_4 20
#define C_5 21
#define C_6 22
#define C_7 23
#define C_8 24
#define C_9 25

#define C_a 65
#define C_b 66
#define C_c 67
#define C_d 68
#define C_e 69
#define C_f 70
#define C_g 71
#define C_h 72
#define C_i 73
#define C_j 74
#define C_k 75
#define C_l 76
#define C_m 77
#define C_n 78
#define C_o 79
#define C_p 80
#define C_q 81
#define C_r 82
#define C_s 83
#define C_t 84
#define C_u 85
#define C_v 86
#define C_w 87
#define C_x 88
#define C_y 89
#define C_z 90

#define C_A 33
#define C_B 34
#define C_C 35
#define C_D 36
#define C_E 37
#define C_F 38
#define C_G 39
#define C_H 40
#define C_I 41
#define C_J 42
#define C_K 43
#define C_L 44
#define C_M 45
#define C_N 46
#define C_O 47
#define C_P 48
#define C_Q 49
#define C_R 50
#define C_S 51
#define C_T 52
#define C_U 53
#define C_V 54
#define C_W 55
#define C_X 56
#define C_Y 57
#define C_Z 58

#define C_space 0
#define C_left 8
#define C_right 9
#define C_ast 10
#define C_plus 11
#define C_minus 13
#define C_slash 15
#define C_equal 29
#define C_comma 14
#define C_colon 26
#define C_que 31

// Chars Area ------------------------------------------------------------------------------

uniform sampler2D TexFont;
#define TexFont_RES ivec2(68, 68)
#define Font_Size ivec2(84, 84)
#define Font_Baseline ivec2(-18, 24)
#define Char_List_Max 72
int Char_List_Index = 0;
int[Char_List_Max] Char_List;

#define SPACE_F 0.7
#define SPACE_H 0.35
float GetSpace(int c)
{
    bool isH = (0 <= c && c <= 94) || (7073 <= c && c <= 7130);
    return (isH ? SPACE_H : SPACE_F) * float(c >= 0);
}

int Font_Style = 0;
#define STYLE_NORMAL 0
#define STYLE_BOLD 1
#define STYLE_ITALIC 2
#define STYLE_OUTLINE 3
#define STYLE_THIN 4
#define STYLE_OUTLINE_ITALIC 5
void SetFontStyle(int style)
{
    Font_Style = style;
}

vec2 Char_Size;
vec2 UV_Offset = vec2(0);
void SetAspect(vec2 resol, float div, bool fitWidth = true, bool fitBaseLine = true)
{
    float width = resol.x;
    float height = resol.y;
    Char_Size = vec2(1.0 / div);
    if(!fitWidth)
    {
        Char_Size.y *= (width / height);
    }
    else
    {
        Char_Size.x *= (height / width);
    }
    // baseline offset
    vec2 base = Char_Size * vec2(Font_Baseline) / vec2(Font_Size);
    if(!fitBaseLine)
    {
        base.y = 0.0;
    }
    UV_Offset = vec2(-base.x, -base.y);
}

#define Align_Left_Bottom 0
#define Align_Left_Center 1
#define Align_Left_Top 2
#define Align_Center_Bottom 3
#define Align_Center_Center 4
#define Align_Center_Top 5
#define Align_Right_Bottom 6
#define Align_Right_Center 7
#define Align_Right_Top 8
vec2 Origin_Font_Anchor;
vec2 Font_Anchor;
int Current_Align;

void _SetAlignOffSetX(float offset)
{
    vec2 anchor;
    if(Current_Align == Align_Left_Bottom)
    {
        anchor = vec2(0.0, 0.0) + vec2(0.0, 0.0) * Char_Size;
    }
    else if(Current_Align == Align_Left_Center)
    {
        anchor = vec2(0.0, 0.5) + vec2(0.0, -0.5) * Char_Size;
    }
    else if(Current_Align == Align_Left_Top)
    {
        anchor = vec2(0.0, 1.0) + vec2(0.0, -1.0) * Char_Size;
    }
    else if(Current_Align == Align_Center_Bottom)
    {
        anchor = vec2(0.5, 0.0) + vec2(-(offset) * 0.5, 0.0) * Char_Size;
    }
    else if(Current_Align == Align_Center_Center)
    {
        anchor = vec2(0.5, 0.5) + vec2(-(offset) * 0.5, -0.5) * Char_Size;
    }
    else if(Current_Align == Align_Center_Top)
    {
        anchor = vec2(0.5, 1.0) + vec2(-(offset) * 0.5, -1.0) * Char_Size;
    }
    else if(Current_Align == Align_Right_Bottom)
    {
        anchor = vec2(1.0, 0.0) + vec2(-offset, 0.0) * Char_Size;
    }
    else if(Current_Align == Align_Right_Center)
    {
        anchor = vec2(1.0, 0.5) + vec2(-offset, -0.5) * Char_Size;
    }
    else if(Current_Align == Align_Right_Top)
    {
        anchor = vec2(1.0, 1.0) + vec2(-offset, -1.0) * Char_Size;
    }
    else
    {
        anchor = vec2(0.0, 0.0);
    }
    Font_Anchor.x = anchor.x;
}

void SetAlign(int align, float size = 0.0, float space = SPACE_F)
{
    float xoffset = size * space;
    if(align == Align_Left_Bottom)
    {
        Font_Anchor = vec2(0.0, 0.0) + vec2(0.0, 0.0) * Char_Size;
    }
    else if(align == Align_Left_Center)
    {
        Font_Anchor = vec2(0.0, 0.5) + vec2(0.0, -0.5) * Char_Size;
    }
    else if(align == Align_Left_Top)
    {
        Font_Anchor = vec2(0.0, 1.0) + vec2(0.0, -1.0) * Char_Size;
    }
    else if(align == Align_Center_Bottom)
    {
        Font_Anchor = vec2(0.5, 0.0) + vec2(-(xoffset) * 0.5, 0.0) * Char_Size;
    }
    else if(align == Align_Center_Center)
    {
        Font_Anchor = vec2(0.5, 0.5) + vec2(-(xoffset) * 0.5, -0.5) * Char_Size;
    }
    else if(align == Align_Center_Top)
    {
        Font_Anchor = vec2(0.5, 1.0) + vec2(-(xoffset) * 0.5, -1.0) * Char_Size;
    }
    else if(align == Align_Right_Bottom)
    {
        Font_Anchor = vec2(1.0, 0.0) + vec2(-xoffset, 0.0) * Char_Size;
    }
    else if(align == Align_Right_Center)
    {
        Font_Anchor = vec2(1.0, 0.5) + vec2(-xoffset, -0.5) * Char_Size;
    }
    else if(align == Align_Right_Top)
    {
        Font_Anchor = vec2(1.0, 1.0) + vec2(-xoffset, -1.0) * Char_Size;
    }
    else
    {
        Font_Anchor = vec2(0.0, 0.0);
    }
    Origin_Font_Anchor = Font_Anchor;
    Current_Align = align;
}

void OffSetAnchor(vec2 offset)
{
    Font_Anchor += offset * Char_Size;
}

float _median(float r, float g, float b)
{
    return max(min(r, g), min(max(r, g), b));
}
float Print_Char(vec2 uv, int id)
{
    if(id < 0)
        return 0.0;
    uv += UV_Offset;
    vec2 uv0 = Font_Anchor, uv1 = Font_Anchor + Char_Size;
    bool isIn = all(greaterThanEqual(uv, uv0)) && all(lessThan(uv, uv1));
    vec2 uv2 = remap(uv, uv0, uv1, vec2(0), vec2(1));
    vec2 uv3 = uv2 / vec2(TexFont_RES) + vec2(id % TexFont_RES.x, id / TexFont_RES.x) / vec2(TexFont_RES);
    vec4 col = isIn ? texture(TexFont, uv3) : vec4(0);
    // float dist = _median(col.r, col.g, col.b) - 0.5;
    float dist = _median(col.r, col.g, col.b);
    if(Font_Style == STYLE_BOLD || Font_Style == STYLE_OUTLINE || Font_Style == STYLE_OUTLINE_ITALIC)
    {
        dist -= 0.3;
    }
    else if(Font_Style == STYLE_ITALIC || Font_Style == STYLE_THIN)
    {
        dist -= 0.6;
    }
    else
    {
        dist -= 0.5;
    }
    float sig = fwidth(dist);
    float c = smoothstep(-sig, sig, dist) * col.a * float(id != 0);
    if(Font_Style == STYLE_OUTLINE || Font_Style == STYLE_OUTLINE_ITALIC)
    {
        dist -= 0.2;
        sig = fwidth(dist);
        c -= smoothstep(-sig, sig, dist) * col.a * float(id != 0);
    }
    // float c = clamp(dist + 0.5, 0.0, 1.0) * col.a;
    Font_Anchor.x += Char_Size.x * GetSpace(id);
    return c;
}

void Stack_Char(int id)
{
    if(Char_List_Index < Char_List_Max)
    {
        Char_List[Char_List_Index] = id;
        Char_List_Index++;
    }
}

float Render_Char(vec2 uv)
{
    if(Font_Style == STYLE_ITALIC || Font_Style == STYLE_OUTLINE_ITALIC)
    {
        uv.x -= ((uv.y - Font_Anchor.y) / Char_Size.y) * Char_Size.x * 0.4;
    }

    float xoffset = 0.0;
    for(int i = 0; i < Char_List_Index; i++)
    {
        xoffset += GetSpace(Char_List[i]);
    }
    _SetAlignOffSetX(xoffset);

    float c = 0.0;
    for(int i = 0; i < Char_List_Index; i++)
    {
        c += Print_Char(uv, Char_List[i]);
    }
    Char_List_Index = 0;
    return c;
}

int pow10(int y)
{
    int r = 1;
    for(int i = 0; i < y; i++)
    {
        r *= 10;
    }
    return r;
}

int log10(int x)
{
    int r = 0;
    while(x > 0)
    {
        x /= 10;
        r++;
    }
    return r;
}

float Print_Sign(vec2 uv, int value)
{
    float c = (value < 0 ? Print_Char(uv, C_minus) : Print_Char(uv, C_space));
    return c;
}
void Stack_Sign(int value)
{
    int id = (value < 0 ? C_minus : C_space);
    Stack_Char(id);
}

float Print_Sign(vec2 uv, float value)
{
    float c = (value < 0.0 ? Print_Char(uv, C_minus) : Print_Char(uv, C_space));
    return c;
}
void Stack_Sign(float value)
{
    int id = (value < 0.0 ? C_minus : C_space);
    Stack_Char(id);
}

float Print_Number(vec2 uv, int value, int digit = - 1)
{
    float c = 0.0;
    value = abs(value);
    if(value == 0)
        return Print_Char(uv, C_0);
    digit = (digit < 0 ? log10(value) : digit);
    int p10 = pow10(digit - 1);
    for(int i = 0; i < digit; i++)
    {
        int v = value / p10;
        value -= v * p10;
        p10 /= 10;
        c += Print_Char(uv, v + C_0);
    }
    return c;
}
void Stack_Number(int value, int digit = - 1)
{
    value = abs(value);
    if(value == 0)
        Stack_Char(C_0);
    digit = (digit < 0 ? log10(value) : digit);
    int p10 = pow10(digit - 1);
    for(int i = 0; i < digit; i++)
    {
        int v = value / p10;
        value -= v * p10;
        p10 /= 10;
        Stack_Char(v + C_0);
    }
}

float Print_Number(vec2 uv, float value, int fdigit = 3, int idigit = - 1)
{
    float c = 0.0;
    value = abs(value);
    int v = int(value);
    c += Print_Number(uv, v, idigit);
    if(fdigit < 1)
        return c;
    c += Print_Char(uv, C_comma);
    value -= v;
    for(int i = 0; i < fdigit; i++)
    {
        value *= 10.0;
        v = int(value);
        value -= v;
        c += Print_Char(uv, v + C_0);
    }
    return c;
}
void Stack_Number(float value, int fdigit = 3, int idigit = - 1)
{
    value = abs(value);
    int v = int(value);
    Stack_Number(v, idigit);
    if(fdigit < 1)
        return;
    Stack_Char(C_comma);
    value -= v;
    for(int i = 0; i < fdigit; i++)
    {
        value *= 10.0;
        v = int(value);
        value -= v;
        Stack_Char(v + C_0);
    }
}

void Print_Return(float space = 1.0)
{
    Font_Anchor.x = Origin_Font_Anchor.x;
    Font_Anchor.y -= Char_Size.y * space;
}

int getRandomChar(vec2 seed)
{
    // const int kanji_min = 650, kanji_max = 4399;
    const int kanji_min = 0, kanji_max = 4600;
    return int(float(kanji_max - kanji_min) * hash12(seed)) + kanji_min;
}

int getRandomKanji(vec2 seed)
{
    const int kanji_min = 650, kanji_max = 4399;
    // const int kanji_min = 0, kanji_max = 4600;
    return int(float(kanji_max - kanji_min) * hash12(seed)) + kanji_min;
}

#endif