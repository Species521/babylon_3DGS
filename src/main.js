import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    MeshBuilder,
    ArcRotateCamera,
    DeviceOrientationCamera,
    Color4,
    StandardMaterial,
    Color3
} from "@babylonjs/core";

// 1. Initialize Engine and Canvas
const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

// 2. Scene Setup
const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

// 3. Lighting
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 4. Create the Blue Cube
const box = MeshBuilder.CreateBox("box", { size: 1 }, scene);
box.position.z = 3;

const mat = new StandardMaterial("m", scene);
mat.diffuseColor = new Color3(0.2, 0.6, 1.0);
box.material = mat;

// 5. Default Fallback Camera (Desktop/Mouse Orbit)
const camera = new ArcRotateCamera(
    "cam",
    0,
    Math.PI / 2.5,
    8,
    Vector3.Zero(),
    scene
);
camera.attachControl(canvas, true);

// 6. Mobile Gyroscope Switch Function
async function enableGyro() {
    // Request permission for iOS 13+ devices
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") return;
    }

    // Create the gyro camera slightly back from the scene center
    const gyroCam = new DeviceOrientationCamera(
        "gyro",
        new Vector3(0, 0, -5),
        scene
    );

    // Attach the hardware orientation sensors to the canvas controls
    gyroCam.attachControl(canvas, true);

    // Switch the active camera view
    scene.activeCamera = gyroCam;

    // Optional: Remove listener after activation so it doesn't run on every single click
    window.removeEventListener("click", enableGyro);
}

// Activate gyro on first user interaction
window.addEventListener("click", enableGyro);

// 7. Render Loop & Window Management
engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());