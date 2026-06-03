import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    ArcRotateCamera,
    Color4,
    GaussianSplattingMesh,
    SceneLoader // Required to manually register the plugin
} from "@babylonjs/core";

// Import the specific loader class explicitly so Vite cannot tree-shake it
import { PLYFileLoader } from "@babylonjs/loaders/PLY/plyFileLoader";

// Manually register the PLY plugin into Babylon's global scene loader
if (SceneLoader) {
    SceneLoader.RegisterPlugin(new PLYFileLoader());
}

// 1. Initialize Engine and Canvas
const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

// 2. Scene Setup
const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

// 3. Lighting
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 4. Load the Gaussian Splat
const splat = new GaussianSplattingMesh("gaussianSplat", scene);

// Use the clean text string path
splat.loadFileAsync("clusterFly_M.ply").then(() => {
    console.log("Gaussian Splat loaded successfully!");
    
    // Position adjustments 
    splat.position.set(0, 0, 2); 
    
    // Rotate 180 degrees if the splat appears upside down
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