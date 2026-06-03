import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    MeshBuilder,
    ArcRotateCamera,
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
// Positioned 2 units forward and slightly down so it sits nicely in your room space
const box = MeshBuilder.CreateBox("box", { size: 1 }, scene);
box.position.set(0, 0, 2);

const mat = new StandardMaterial("m", scene);
mat.diffuseColor = new Color3(0.2, 0.6, 1.0);
box.material = mat;

// 5. Default Fallback Camera (Desktop/Mouse Orbit)
const camera = new ArcRotateCamera(
    "cam",
    0,
    Math.PI / 2.5,
    5,
    new Vector3(0, 0, 2),
    scene
);
camera.attachControl(canvas, true);

// 6. WebXR Immersive AR Switch Function
async function enableAR() {
    try {
        // Create the default WebXR experience helper for AR
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-ar',      // Requests camera feed + 3D tracking
                referenceSpaceType: 'local-floor'  // Tracks your position relative to the floor
            }
        });

        // Remove the click listener so it doesn't try to trigger multiple AR sessions
        window.removeEventListener("click", enableAR);
        
        console.log("WebXR AR Session initialized successfully.");
    } catch (e) {
        console.error("WebXR is not supported on this device/browser:", e);
        alert("WebXR Immersive AR is not supported or was denied on this device.");
    }
}

// Activate AR session on first user interaction
window.addEventListener("click", enableAR);

// 7. Render Loop & Window Management
engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());