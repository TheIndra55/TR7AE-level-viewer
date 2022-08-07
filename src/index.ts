import { Scene, PerspectiveCamera, WebGLRenderer, Object3D, AmbientLight } from "three"

import Stats from "stats.js"
import { Controller } from "./Controller"

import { ObjectLoader } from "./ObjectLoader"
import { LevelLoader, LoadedTerrain } from "./LevelLoader"
import { Instance, Intro } from "./Instance"

const scene = new Scene();
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new Controller(camera, renderer.domElement)

const urlParams = new URLSearchParams(window.location.search);
const level = urlParams.get("level") ?? "container1.drm";

const light = new AmbientLight(0xffffff, 2.0)
scene.add(light)

class Viewer
{
    private scene: Scene
    private currentLevelMesh: Object3D

    private levelLoader: LevelLoader
    private objectLoader: ObjectLoader

    private instances: Instance[]
    private objectList: {}

    constructor(scene: Scene)
    {
        this.scene = scene

        this.levelLoader = new LevelLoader()
        this.objectLoader = new ObjectLoader()

        this.instances = []

        // possible race condition if level loads before objectlist.txt
        this.loadObjectList()
    }

    loadLevel(level: string)
    {
        const scope = this

        this.levelLoader.load(level, async function (level: LoadedTerrain) {
            scope.currentLevelMesh = level.container
            scope.scene.add(level.container)

            // load all intros
            level.intros.forEach(function(intro) {
                if (intro.object < 1) return

                // insert javascript 'this' meme
                scope.loadInstance.call(scope, intro)
            })
        })
    }

    loadInstance(intro: Intro)
    {
        const scope = this
        const object = this.objectList[intro.object]

        this.objectLoader.load(object + ".drm", function(mesh: Object3D) {
            const instance = new Instance(intro.id, mesh)

            instance.position = intro.position
            instance.rotation = intro.rotation

            scope.instances.push(instance)
            scope.scene.add(instance.mesh)
        })
    }

    async loadObjectList()
    {
        var objectList = await fetch("objectlist.txt").then(x => x.text())
        const regex = /([0-9]{0,4}),([a-z_-]+)$/gm
        
        this.objectList = []
        for (let object of objectList.matchAll(regex))
        {
            this.objectList[Number(object[1])] = object[2]
        }
    }
}

const viewer = new Viewer(scene)
viewer.loadLevel(level)

const stats = new Stats()
stats.showPanel(0); // fps

document.body.appendChild(stats.dom);

function animate() {
    stats.begin()

    controls.update()
    renderer.render(scene, camera);

    stats.end()
}

renderer.setAnimationLoop(animate)