import { Object3D, Vector3 } from "three";

interface Intro
{
    position: Vector3
    rotation: Vector3
    object: number
    id: number
}

class Instance
{
    intro: number
    mesh: Object3D

    constructor(intro: number, mesh: Object3D)
    {
        this.intro = intro
        this.mesh = mesh
    }

    // set the position in game coordinates
    set position(position: Vector3)
    {
        this.mesh.position.set(-(position.x) / 10, position.z / 10, position.y / 10)
    }
}

export { Intro, Instance }