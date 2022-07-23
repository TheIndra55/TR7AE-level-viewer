import { AddEquation, AdditiveBlending, CustomBlending, DoubleSide, DstAlphaFactor, DstColorFactor, Material, MaxEquation, MinEquation, OneFactor, OneMinusDstAlphaFactor, ReverseSubtractEquation, SrcAlphaFactor, SubtractEquation, ZeroFactor } from "three";

function applyTPageFlags(material: Material, tpageid: number)
{
    if ((tpageid & 0x200000) == 0)
    {
        material.side = DoubleSide
    }

    if ((tpageid & 0x1E000) == 0x10000)
    {
        material.depthWrite = false
        material.transparent = true

        material.blending = AdditiveBlending
    }

    if ((tpageid & 0x1E000) == 0x8000)
    {
        material.transparent = true
        
        material.blending = CustomBlending
        material.blendEquation = AddEquation
        material.blendSrc = DstColorFactor
        material.blendDst = SrcAlphaFactor
    }

    if ((tpageid & 0x1E000) == 0x4000)
    {
        material.transparent = true
        material.blending = AdditiveBlending
    }

    if ((tpageid & 0x1E000) == 0x2000)
    {
        material.transparent = true
    }
}

export { applyTPageFlags }