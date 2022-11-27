import { AdditiveBlending, DoubleSide, Material, SubtractiveBlending } from "three";

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
        
        // TODO fixme
        // material.blending = CustomBlending
        // material.blendEquation = AddEquation
        // material.blendSrc = DstColorFactor
        // material.blendDst = SrcAlphaFactor

        material.blending = SubtractiveBlending
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

    if ((tpageid & 0x1E000) == 0x12000)
    {
        material.transparent = true
        material.blending = AdditiveBlending
    }
}

export { applyTPageFlags }