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

    set rotation(rotation: Vector3)
    {
        this.mesh.rotation.setFromVector3(new Vector3(-rotation.x, rotation.z, rotation.y))
    }
}

export { Intro, Instance }