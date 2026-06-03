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

// 1. Load the Gaussian Splat — fixed in world space, never moved
let splat = null;
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    splat = result.meshes[0];
    if (splat) {
        splat.position.set(0, 0, 5);
        splat.scaling.setAll(12);
        splat.rotation.z = Math.PI;
        console.log("Gaussian Splat loaded successfully.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 2. Setup Device Orientation Camera
const camera = new DeviceOrientationCamera("magicWindowCam", new Vector3(0, 0, 0), scene);
camera.setTarget(new Vector3(0, 0, 5));
camera.minZ = 0.1;
camera.maxZ = 1000;
camera.attachControl(canvas, true);

// 3. Accelerometer-based positional tracking in world space
const velocity = new Vector3(0, 0, 0);
const gravity = { x: 0, y: 0, z: 0 };
const GRAVITY_SMOOTH = 0.95;
const DAMPING = 0.85;
const SCALE = 0.0005;

let lastTime = null;

window.addEventListener("devicemotion", (event) => {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const now = performance.now();
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;

    // Update rolling gravity estimate
    gravity.x = GRAVITY_SMOOTH * gravity.x + (1 - GRAVITY_SMOOTH) * acc.x;
    gravity.y = GRAVITY_SMOOTH * gravity.y + (1 - GRAVITY_SMOOTH) * acc.y;
    gravity.z = GRAVITY_SMOOTH * gravity.z + (1 - GRAVITY_SMOOTH) * acc.z;

    // Device-space linear acceleration (gravity removed)
    const localAcc = new Vector3(
        (acc.x - gravity.x) * SCALE,
        (acc.y - gravity.y) * SCALE,
        (acc.z - gravity.z) * SCALE
    );

    // Rotate into world space using camera's current orientation
    const worldAcc = Vector3.TransformNormal(localAcc, camera.getWorldMatrix());

    // Integrate into velocity then damp
    velocity.x = (velocity.x + worldAcc.x * dt) * DAMPING;
    velocity.y = (velocity.y + worldAcc.y * dt) * DAMPING;
    velocity.z = (velocity.z + worldAcc.z * dt) * DAMPING;
});

// Move camera in true world space — splat stays fixed at (0, 0, 5)
scene.onBeforeRenderObservable.add(() => {
    camera.position.addInPlace(velocity);
});

// 4. Sensor permission (iOS)
async function initSensors() {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
            await DeviceOrientationEvent.requestPermission();
        } catch (error) {
            console.error("Sensor initialization failed:", error);
        }
    }
    if (typeof DeviceMotionEvent !== "undefined" &&
        typeof DeviceMotionEvent.requestPermission === "function") {
        try {
            await DeviceMotionEvent.requestPermission();
        } catch (error) {
            console.error("Motion sensor initialization failed:", error);
        }
    }
    window.removeEventListener("click", initSensors);
}

window.addEventListener("click", initSensors);

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());