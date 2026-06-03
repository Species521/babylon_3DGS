import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    DeviceOrientationCamera,
    Color4,
    SceneLoader
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

registerBuiltInLoaders();

const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 1. Load the Gaussian Splat
let splat = null;
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    splat = result.meshes[0];
    if (splat) {
        // Position it 5 units in front of the camera's default starting spot
        splat.position.set(0, 0, 5);
        splat.scaling.setAll(12);
        splat.rotation.z = Math.PI; // Flipped upside down
        console.log("Gaussian Splat loaded successfully.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 2. Setup Device Orientation Camera
// This naturally maps your tablet's physical rotation to the view.
const camera = new DeviceOrientationCamera("magicWindowCam", new Vector3(0, 0, 0), scene);

// Allow screen touch movements to handle position (moving closer/further)
camera.attachControl(canvas, true);

// 3. Sensor Activation via standard click
async function initSensors() {
    if (typeof DeviceOrientationEvent !== "undefined" && 
        typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
            await DeviceOrientationEvent.requestPermission();
        } catch (error) {
            console.error("Sensor initialization failed:", error);
        }
    }
    window.removeEventListener("click", initSensors);
}

window.addEventListener("click", initSensors);

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());