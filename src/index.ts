import { Level, TerrainRenderVertexList, TerrainGroup } from "./Level"
import { SectionList } from "./Section"
import { OctreeSphere } from "./Octree"

import { Scene, PerspectiveCamera, WebGLRenderer, BufferGeometry, MeshBasicMaterial, Mesh, BufferAttribute, DoubleSide, Color } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 200;

const controls = new OrbitControls(camera, renderer.domElement);

function vertexToVertices(vertexes: TerrainRenderVertexList): Int16Array
{
	const arr = []
	for(let vertex of vertexes.vertexList)
	{
		// divide by 10 so it doesnt become massive
		arr.push(vertex.x / 10)
		arr.push(vertex.z / 10)
		arr.push(vertex.y / 10)
	}

	return Int16Array.from(arr)
}

const faces = []

function processTerrain(terraingroups: TerrainGroup[])
{
	// TODO draw all terraingroups
	//for(let terraingroup of terraingroups)
	//{
	if(terraingroups[0].octreeSphere != null)
	{
		processOctrees(terraingroups[0].GetOctreeSphere())
	}
	//}
}

let baseVertexIndex = 0

// process all octrees and face strips
function processOctrees(octree: OctreeSphere)
{
	for(let sphere of octree.spheres)
	{
		processOctrees(sphere)
	}

	if(octree.strip)
	{
		for(let strip of octree.GetTerrainTextureStrips())
		{
			for(let i = 0; i < strip.stripVertex.length; i++)
			{
				if(strip.vmoObjectIndex != -1)
				{
					continue
				}

				const indice = strip.stripVertex[i]

				// FIXME this still breaks for some levels
				// if vertex resets to 0 again add offset of highest vertex
				if(indice == 0 && faces.length > 0 && i == 0)
				{
					// get higest vertex plus 1
					baseVertexIndex = [...faces].sort((a, b) => a - b).reverse()[0] + 1
				}

				faces.push(baseVertexIndex + indice)
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

	const terrain = level.GetTerrain()
	const vertexes = terrain.GetTerrainVertexList()

	// set the background to the level background color
	scene.background = new Color(level.backColorR / 255, level.backColorG / 255, level.backColorB / 255)

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(vertexToVertices(vertexes), 3))
	//geometry.setAttribute("uv", new BufferAttribute(Float32Array.from(uvs), 2))

	const terrainGroups = terrain.GetTerrainGroups()
	processTerrain(terrainGroups)

	geometry.setIndex(faces)

	const material = new MeshBasicMaterial( { side: DoubleSide, color: 0xFF0000 } );
	material.wireframe = true

	const levelmesh = new Mesh(geometry, material)
	scene.add(levelmesh)
})

function animate() {
	requestAnimationFrame(animate);

	renderer.render(scene, camera);
}
animate();