import { Level, TerrainRenderVertexList, TerrainGroup } from "./Level"
import { SectionList, TextureStore } from "./Section"
import { OctreeSphere } from "./Octree"

import { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry, MeshBasicMaterial, Mesh, BufferAttribute, Color, BackSide } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 200;

const controls = new OrbitControls(camera, renderer.domElement);

const uvs = []
const faces = []
const materials = []
const groups = []

function vertexToVertices(vertexes: TerrainRenderVertexList): Int16Array
{
	const arr = []
	for(let vertex of vertexes.vertexList)
	{
		// divide by 10 so it doesnt become massive
		arr.push(vertex.x / 10)
		arr.push(vertex.z / 10)
		arr.push(vertex.y / 10)

		uvs.push(vertex.u)
		uvs.push(vertex.v)
	}

	return Int16Array.from(arr)
}

function processTerrain(terraingroups: TerrainGroup[])
{
	// TODO draw all terraingroups
	//for(let terraingroup of terraingroups)
	//{
	if(terraingroups[0].octreeSphere != null)
	{
		createMaterials(terraingroups[0])
		processOctrees(terraingroups[0], terraingroups[0].GetOctreeSphere())
	}
	//}
}

function createMaterials(terraingroup: TerrainGroup)
{
	for(let material of terraingroup.xboxPcMaterialList.materials)
	{
		const texture = TextureStore.textures.find(x => x.section.id == material.texture)

		material.material = new MeshBasicMaterial({side: BackSide, map: texture?.texture})
		materials.push(material)
	}
}

// process all octrees and face strips
function processOctrees(terraingroup: TerrainGroup, octree: OctreeSphere)
{
	for(let sphere of octree.spheres)
	{
		processOctrees(terraingroup, sphere)
	}

	if(octree.strip)
	{
		for(let strip of octree.GetTerrainTextureStrips())
		{
			if(strip.vmoObjectIndex != -1)
			{
				continue
			}

			const baseVertexIndex = terraingroup.GetMaterial(strip.matIdx).vbBaseOffset

			groups.push({ start: faces.length, count: strip.stripVertex.length, materialIndex: strip.matIdx })

			for(let i = 0; i < strip.stripVertex.length; i++)
			{

				faces.push(baseVertexIndex + strip.stripVertex[i])
			}
		}
	}
}

const urlParams = new URLSearchParams(window.location.search);
const level = urlParams.get("level");

fetch(level)
.then(x => x.arrayBuffer())
.then(x => {
	// load the downloaded file as DRM/SectionList
	const drm = new SectionList(x)
	
	const level = new Level(drm)
	drm.LoadTextures()

	const terrain = level.GetTerrain()
	const vertexes = terrain.GetTerrainVertexList()

	// set the background to the level background color
	scene.background = new Color(level.backColorR / 255, level.backColorG / 255, level.backColorB / 255)

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(vertexToVertices(vertexes), 3))
	geometry.setAttribute("uv", new BufferAttribute(Float32Array.from(uvs), 2))

	const terrainGroups = terrain.GetTerrainGroups()
	processTerrain(terrainGroups)

	geometry.setIndex(faces)
	geometry.groups = groups

	const levelmesh = new Mesh(geometry, materials.map(x => x.material))
	scene.add(levelmesh)
})

function animate() {
	requestAnimationFrame(animate);

	renderer.render(scene, camera);
}
animate();