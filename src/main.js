import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    FreeCamera,
    Color4,
    SceneLoader,
    WebXRState
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

// 1. Initialize Loaders
registerBuiltInLoaders();

const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 2. Load the Gaussian Splat
let splat = null;
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    splat = result.meshes[0];
    if (splat) {
        // Set its initial resting position in the scene
        splat.position.set(0, 0, 3);
        splat.scaling.setAll(12);
        splat.rotation.z = Math.PI; // Flipped upside down
        console.log("Gaussian Splat loaded and waiting for anchor initialization.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 3. Simple Fallback Camera
// Replacing DeviceOrientationCamera with FreeCamera stops it from hijacking the 
// tracking matrices when WebXR tries to initialize local-floor boundaries.
const camera = new FreeCamera("fallbackCam", new Vector3(0, 0, 0), scene);
camera.attachControl(canvas, true);

// 4. WebXR Positional Tracking Configuration
async function enableAR() {
    const supported = await navigator.xr?.isSessionSupported("immersive-ar").catch(() => false);
    if (!supported) {
        console.warn("Immersive AR tracking not supported on this device.");
        return;
    }

    try {
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
                referenceSpaceType: "local-floor" // Anchors 0,0,0 directly to your physical floor position
            }
        });

        // Optional: Hide the camera feed for the dark background performance boost.
        // If you want the see-through camera view back, simply delete or comment out this block.
        if (xrHelper.baseExperience.featuresManager) {
            scene.onBackgroundCameraLayerChangedObservable.add(() => {
                if (scene.backgroundCameraShape) {
                    scene.backgroundCameraShape.isVisible = false;
                }
            });
        }

        xrHelper.baseExperience.onStateChangedObservable.add((state) => {
            if (state === WebXRState.IN_XR) {
                // Keep the background dark if the camera feed layer is disabled
                scene.autoClear = true;
                scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);
                
                if (splat) {
                    // Detach any parent configurations and lock it 3 meters forward from your room's baseline setup origin
                    splat.parent = null; 
                    splat.position.set(0, 0, 3); 
                    console.log("Splat locked to physical room space.");
                }
            } else if (state === WebXRState.NOT_IN_XR) {
                if (splat) splat.position.set(0, 0, 3);
            }
        });

        window.removeEventListener("click", enableAR);
    } catch (e) {
        console.error("WebXR tracking initialization error:", e);
    }
}

window.addEventListener("click", enableAR);

// 5. Main Execution Loops
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());