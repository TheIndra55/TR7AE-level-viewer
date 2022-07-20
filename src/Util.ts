import { AddEquation, CustomBlending, DoubleSide, DstAlphaFactor, DstColorFactor, Material, OneFactor, OneMinusDstAlphaFactor, ReverseSubtractEquation, SrcAlphaFactor, ZeroFactor } from "three";

function applyTPageFlags(material: Material, tpageid: number)
{
    if ((tpageid & 0x200000) == 0)
    {
        material.side = DoubleSide
    }

    if ((tpageid & 0x1E000) == 0x12000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = OneFactor
        material.blendDst = ZeroFactor
    }

    if ((tpageid & 0x1E000) == 0x10000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = DstAlphaFactor
        material.blendDst = OneFactor
    }

    if ((tpageid & 0x1E000) == 0xC000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = ZeroFactor
        material.blendDst = OneFactor
    }

    if ((tpageid & 0x1E000) == 0xE000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = DstAlphaFactor
        material.blendDst = OneMinusDstAlphaFactor
    }

    if ((tpageid & 0x1E000) == 0x8000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = DstColorFactor
        material.blendDst = SrcAlphaFactor
    }

    if ((tpageid & 0x1E000) == 0x2000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = SrcAlphaFactor
        material.blendDst = SrcAlphaFactor
    }

    if ((tpageid & 0x1E000) == 0x4000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = SrcAlphaFactor
        material.blendDst = OneFactor
    }

    if ((tpageid & 0x1E000) == 0x6000)
    {
        material.transparent = true

        material.blending = CustomBlending
        material.blendEquation = ReverseSubtractEquation
        material.blendSrc = SrcAlphaFactor
        material.blendDst = OneFactor
    }
}

export { applyTPageFlags }