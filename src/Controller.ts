import { Camera, Vector3, Clock } from "three"

// workaround for 'The module "./examples/jsm/controls/PointerLockControls" was not found on the file system'
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js"

export class Controller
{
    controls: PointerLockControls

    clock: Clock

    moveForward: boolean
    moveBackward: boolean

    constructor(camera: Camera, domElement)
    {
        this.controls = new PointerLockControls(camera, domElement)
        this.clock = new Clock()

        this.moveBackward = false;
        this.moveForward = false;

        document.addEventListener("click", () => this.controls.lock())

        document.addEventListener("keydown", event => this.keydown(event))
        document.addEventListener("keyup", event => this.keyup(event))
    }

    keydown(event)
    {
        switch(event.code)
        {
            case "KeyW":
                this.moveForward = true

                break
            case "KeyS":
                this.moveBackward = true 

                break;
        }
    }

    keyup(event)
    {
        switch(event.code)
        {
            case "KeyW":
                this.moveForward = false

                break
            case "KeyS":
                this.moveBackward = false   
                
                break
        }
    }

    update()
    {
        const delta = this.clock.getDelta()

        if (this.moveForward || this.moveBackward)
        {
            const vector = new Vector3()
            const speed = (this.moveForward ? 300.0 : -300.0) * delta

            this.controls.getObject().getWorldDirection(vector)

            this.controls.getObject().position.add(vector.multiply(new Vector3(speed, speed, speed)))
        }
    }
}