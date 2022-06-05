import { Level, TerrainRenderVertexList, TerrainGroup, Vector } from "./Level"
import { SectionList, TextureStore } from "./Section"
import { OctreeSphere } from "./Octree"

import { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry, MeshBasicMaterial, Mesh, BufferAttribute, Color } from "three"

import Stats from "stats.js"
import { GUI } from "dat.gui"
import { Controller } from "./Controller"
import { Buffer } from "buffer"

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new Controller(camera, renderer.domElement)

// TODO refactor, less global state
const uvs = []
const colors = []
let faces = []
const materials = []
let groups = []

let skyDome: Mesh = null;

function vertexToVertices(vertexes: TerrainRenderVertexList): Int16Array
{
	const arr = []
	for(let vertex of vertexes.vertexList)
	{
		// divide by 10 so it doesnt become massive
		arr.push(-(vertex.x) / 10)
		arr.push(vertex.z / 10)
		arr.push(vertex.y / 10)

		uvs.push(vertex.u)
		uvs.push(vertex.v)

		colors.push((vertex.color & 0xff) / 255)
		colors.push(((vertex.color >> 8) & 0xff) / 255)
		colors.push(((vertex.color >> 16) & 0xff) / 255)
	}

	return Int16Array.from(arr)
}

function processTerrainGroup(terraingroup: TerrainGroup)
{
	if(terraingroup.octreeSphere != 0)
	{
		createMaterials(terraingroup)

		processOctrees(terraingroup, terraingroup.GetOctreeSphere())
	}
}

function createMaterials(terraingroup: TerrainGroup)
{
	for(let material of terraingroup.xboxPcMaterialList.materials)
	{
		const texture = TextureStore.textures.find(x => x.section.id == material.texture)

		material.material = new MeshBasicMaterial({map: texture?.texture, vertexColors: true, alphaTest: 1})

		// skydome
		if ((terraingroup.flags & 0x200000) > 0)
		{
			material.material.depthTest = false
			material.material.depthWrite = false
		}

		materials[material.texture] = material
	}
}

// process all octrees and face strips
function processOctrees(terraingroup: TerrainGroup, octree: OctreeSphere)
{
	for(let sphere of octree.spheres)
	{
		processOctrees(terraingroup, sphere)
	}

	if(octree.strip != 0)
	{
		for(let strip of octree.GetTerrainTextureStrips())
		{
			if(strip.vmoObjectIndex != -1)
			{
				continue
			}

			const material = terraingroup.GetMaterial(strip.matIdx)

			groups.push({ start: faces.length, count: strip.stripVertex.length, materialIndex: material.texture })

			for(let i = 0; i < strip.stripVertex.length; i++)
			{

				faces.push(material.vbBaseOffset + strip.stripVertex[i])
			}
		}
	}
}

const urlParams = new URLSearchParams(window.location.search);
const level = urlParams.get("level") ?? "container1.drm";

setOverlay("Downloading...")

// fetch level
fetch(level)
.then(x => x.arrayBuffer())
.then(x => {
	setOverlay("Loading...")

	// load the downloaded file as DRM/SectionList
	const drm = new SectionList(Buffer.from(x))
	
	const level = new Level(drm)
	drm.LoadTextures()

	const terrain = level.GetTerrain()
	const vertexes = terrain.GetTerrainVertexList()

	// set the background to the level background color
	scene.background = new Color(level.backColorR / 255, level.backColorG / 255, level.backColorB / 255)

	const terraingroups = terrain.GetTerrainGroups()
	const intros = terrain.GetIntros()
	const lights = level.GetLights()

	console.log(lights)
	console.log(intros)

	const playerIntro = intros.find(x => x.id == -1)
	camera.position.set(-(playerIntro.position.x) / 10, (playerIntro.position.z / 10) + 50, playerIntro.position.y / 10)

	const vertices = vertexToVertices(vertexes)
	for (let terraingroup of terraingroups)
	{
		faces = []
		groups = []

		processTerrainGroup(terraingroup)

		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new BufferAttribute(vertices, 3))
		geometry.setAttribute("uv", new BufferAttribute(Float32Array.from(uvs), 2))
		geometry.setAttribute("color", new BufferAttribute(Float32Array.from(colors), 3));

		geometry.setIndex([...faces])
		geometry.groups = [...groups]

		const levelmesh = new Mesh(geometry, materials.map(x => x.material))
		levelmesh.position.set(-(terraingroup.globalOffset.x) / 10, terraingroup.globalOffset.z / 10, terraingroup.globalOffset.y / 10)

		if ((terraingroup.flags & 0x200000) > 0)
		{
			skyDome = levelmesh
			skyDome.renderOrder = -10
		}

		scene.add(levelmesh)
	}

	clearOverlay();
})

// fetch levels to display in dat.gui
fetch("levels.json")
.then(x => x.json())
.then(levels => {
	// check
	if(!levels || levels.length == 0)
	{
		return
	}

	// setup datgui
	const gui = new GUI()

	const buttons = {}
	for(let level of levels)
	{
		// TODO this is ugly, fetch new drm instead of reloading page
		buttons[level.name] = ( ) => { location.href = `?level=${level.drm}` } 
		gui.add(buttons, level.name)
	}
})

const stats = new Stats()
stats.showPanel(0); // fps

document.body.appendChild(stats.dom);

function animate() {
	stats.begin()

	controls.update()
	skyDome?.position.copy(camera.position)
	renderer.render(scene, camera);

	stats.end()
}

function setOverlay(text)
{
	(document.querySelector(".overlay") as HTMLElement).style.display = "block";
	(document.querySelector(".overlay .text") as HTMLElement).innerText = text;
}

function clearOverlay()
{
	(document.querySelector(".overlay") as HTMLElement).style.display = "none";
}

renderer.setAnimationLoop(animate)