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
camera.attachControl(canvas, true);

// 3. Accelerometer-based positional tracking
// We double-integrate acceleration to get position displacement.
// Gravity is removed by using accelerationIncludingGravity and subtracting
// a rolling average — imperfect but works for walking-scale movement.

const velocity = new Vector3(0, 0, 0);
const gravity = { x: 0, y: 0, z: 0 };
const GRAVITY_SMOOTH = 0.95;   // how fast gravity estimate updates
const DAMPING = 0.85;           // kills drift quickly when device is still
const SCALE = 0.0005;           // tunable: how much real movement maps to scene units

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

    // Linear acceleration = total - gravity
    const ax = (acc.x - gravity.x) * SCALE;
    const ay = (acc.y - gravity.y) * SCALE;
    const az = (acc.z - gravity.z) * SCALE;

    // Integrate into velocity, then apply damping
    velocity.x = (velocity.x + ax * dt) * DAMPING;
    velocity.y = (velocity.y + ay * dt) * DAMPING;
    velocity.z = (velocity.z + az * dt) * DAMPING;
});

// Apply velocity to camera position each frame
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
    // Also request motion permission on iOS
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