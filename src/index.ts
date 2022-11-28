import { Scene, PerspectiveCamera, WebGLRenderer, Object3D, AmbientLight, MeshBasicMaterial, Color, DoubleSide, Mesh, Vector3, Group, BufferGeometry, Line, LineBasicMaterial } from "three"

import Stats from "stats.js"
import { Controller } from "./Controller"

import { ObjectLoader } from "./ObjectLoader"
import { LevelLoader, LoadedTerrain, StreamPortal } from "./LevelLoader"
import { Instance, Intro } from "./Instance"

import { GUI } from "dat.gui"

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

    private levelLoader: LevelLoader
    private objectLoader: ObjectLoader

    private instances: Instance[]
    private objectList: string[]

    private loadedLevels: LoadedTerrain[]
    private requestedLevels: string[]

    // whether to load connected levels, false for now
    private loadPortals: boolean = false;

    constructor(scene: Scene)
    {
        this.scene = scene

        this.levelLoader = new LevelLoader()
        this.objectLoader = new ObjectLoader()

        this.instances = []
        this.objectList = []
        this.loadedLevels = []
        this.requestedLevels = []

        // possible race condition if level loads before objectlist.txt
        this.loadObjectList()
    }

    loadLevel(level: string)
    {
        const scope = this
        
        scope.requestedLevels.push(level)

        this.levelLoader.load(level, async function (level: LoadedTerrain) {
            scope.finishLoad.call(scope, level)

            scene.background = level.background
        })
    }

    finishLoad(level: LoadedTerrain)
    {
        const scope = this

        scope.loadedLevels.push(level)
        scope.scene.add(level.container)

        // load all intros
        level.intros.forEach(function(intro) {
            if (intro.object < 1) return

            // insert javascript 'this' meme
            scope.loadInstance.call(scope, level, intro)
        })

        // load connected levels
        level.portals.forEach(function(portal) {
            if (!scope.loadPortals)
            {
                return
            }

            // make sure the level is not already loaded or loading
            if (scope.requestedLevels.includes(portal.destination))
            {
                return
            }

            scope.loadConnectedLevel.call(scope, level, portal)
        })
    }

    loadInstance(level: LoadedTerrain, intro: Intro)
    {
        const scope = this
        let object = this.objectList[intro.object]

        // 'player' is used as placeholder in the intro, replace by level playerName
        if (object == "player")
        {
            object = level.playerName
        }

        this.objectLoader.load(object + ".drm", function(mesh: Object3D) {
            const instance = new Instance(intro.id, mesh)

            instance.position = intro.position
            instance.rotation = intro.rotation

            instance.mesh.position.add(level.container.position)

            scope.instances.push(instance)
            scope.scene.add(instance.mesh)
        })
    }

    loadConnectedLevel(parent: LoadedTerrain, portal: StreamPortal)
    {
        const scope = this

        scope.requestedLevels.push(portal.destination)

        this.levelLoader.load(portal.destination + ".drm", function(level: LoadedTerrain) {
            // calculate level position
            const other = level.portals.find(x => x.destination == parent.name)
            const offset = portal.min.sub(other.min)

            // position the level from the portal and parent
            level.container.position.set(-offset.x, offset.z, offset.y)
            level.container.position.divide(new Vector3(10, 10, 10))
            
            level.container.position.add(parent.container.position)

            scope.finishLoad.call(scope, level)
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

    get currentLevel(): LoadedTerrain
    {
        return this.loadedLevels[0]
    }
}

const viewer = new Viewer(scene)
viewer.loadLevel(level)

const stats = new Stats()
stats.showPanel(0); // fps

// TODO refactor
const menu = new GUI()
const options = {showSignals: false, showCollision: false, showMarkUp: false}

let signalMesh: Object3D
let collisionMesh: Object3D
let markUpMesh: Object3D

// toggle functions for menu stuff

function toggleSignals()
{
    // construct mesh if not yet
    if (!signalMesh)
    {
        const material = new MeshBasicMaterial({color: new Color(1, 0, 0), opacity: 0.5, transparent: true, side: DoubleSide})
        signalMesh = new Mesh(viewer.currentLevel.signalMesh, material)

        signalMesh.scale.divide(new Vector3(10, 10, 10))
    }

    // add to scene, or remove if disabled
    options.showSignals ? scene.add(signalMesh) : scene.remove(signalMesh)
}

function toggleCollision()
{
    // construct collision mesh group with all children
    if (!collisionMesh)
    {
        const material = new MeshBasicMaterial({color: new Color(0, 1, 0), opacity: 0.5, transparent: true, side: DoubleSide})

        collisionMesh = new Group()
        for (let terrainGroup of viewer.currentLevel.terrainGroups)
        {
            const mesh = new Mesh(terrainGroup.collision, material)
            mesh.scale.divide(new Vector3(10, 10, 10))
            mesh.position.set(-(terrainGroup.x) / 10, terrainGroup.z / 10, terrainGroup.y / 10)

            collisionMesh.add(mesh)
        }
    }

    // add to scene, or remove if disabled
    options.showCollision ? scene.add(collisionMesh) : scene.remove(collisionMesh)
}

function toggleMarkUp()
{
    if (!markUpMesh)
    {
        const material = new LineBasicMaterial({color: new Color(0, 0, 1)})

        markUpMesh = new Group()
        for (let markUp of viewer.currentLevel.markup)
        {
            const geometry = new BufferGeometry().setFromPoints(markUp.polyLine)
            const line = new Line(geometry, material)

            markUpMesh.add(line)
        }
    }

    // add to scene, or remove if disabled
    options.showMarkUp ? scene.add(markUpMesh) : scene.remove(markUpMesh)
}

// add dat.gui options
menu.add(options, "showSignals").onChange(toggleSignals).name("Signals")
menu.add(options, "showCollision").onChange(toggleCollision).name("Collision")
menu.add(options, "showMarkUp").onChange(toggleMarkUp).name("Markup")

document.body.appendChild(stats.dom);

function animate() {
    stats.begin()

    controls.update()
    renderer.render(scene, camera);

    stats.end()
}

renderer.setAnimationLoop(animate)