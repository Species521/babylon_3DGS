import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    ArcRotateCamera,
    Color4,
    GaussianSplattingMesh
} from "@babylonjs/core";

// 1. Initialize Engine and Canvas
const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

// 2. Scene Setup
const scene = new Scene(engine);
// Set the background color (Alpha 0 helps AR look cleaner)
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

// 3. Lighting (Splats don't strictly require standard lights, but good to keep)
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 4. Load the Gaussian Splat
// Since the file is in the 'public' folder, we can reference it relative to the root
const splat = new GaussianSplattingMesh("gaussianSplat", scene);
splat.loadFileAsync("scene.ply").then(() => {
    console.log("Gaussian Splat loaded successfully!");
    
    // Position adjustments if your splat spawns in the wrong spot:
    splat.position.set(0, 0, 2); 
    
    // Note: Splats often need orientation adjustments depending on how they were captured.
    // If it is upside down, uncomment the line below to rotate it 180 degrees:
    // splat.rotation.z = Math.PI;
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

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
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-ar',
                referenceSpaceType: 'local-floor'
            }
        });

        window.removeEventListener("click", enableAR);
        console.log("WebXR AR Session initialized successfully.");
    } catch (e) {
        console.error("WebXR is not supported on this device/browser:", e);
    }
}

// Activate AR session on first user interaction
window.addEventListener("click", enableAR);

// 7. Render Loop & Window Management
engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());