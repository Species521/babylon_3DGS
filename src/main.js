import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    DeviceOrientationCamera,
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
// Your preferred dark background
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 2. Load the Gaussian Splat
let splat = null;
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    splat = result.meshes[0];
    if (splat) {
        // Default position for non-AR Magic Window mode
        splat.position.set(0, 0, 5);
        splat.scaling.setAll(12);
        splat.rotation.z = Math.PI; // Flipped upside down
        console.log("Gaussian Splat loaded successfully.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 3. Setup Fallback Device Orientation Camera (Magic Window Mode)
const camera = new DeviceOrientationCamera("magicWindowCam", new Vector3(0, 0, 0), scene);
camera.angularSensibility = 1000;
camera.attachControl(canvas, true);

// 4. Gyro Sensor Permissions
async function requestSensors() {
    if (typeof DeviceOrientationEvent !== "undefined" && 
        typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
            await DeviceOrientationEvent.requestPermission();
        } catch (error) {
            console.error("Sensor initialization failed:", error);
        }
    }
}

// 5. WebXR Positional Tracking WITH Dark Background
async function enableAR() {
    await requestSensors();

    const supported = await navigator.xr?.isSessionSupported("immersive-ar").catch(() => false);
    if (!supported) return;

    try {
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: "immersive-ar",
                referenceSpaceType: "local-floor"
            }
        });

        // FIX: Force Babylon to block the underlying device camera feed.
        // This stops the tablet from rendering the video frames to the screen,
        // recovering a massive amount of performance while keeping tracking active.
        if (xrHelper.baseExperience.featuresManager) {
            scene.onBackgroundCameraLayerChangedObservable.add(() => {
                // Dissociate the video pass layer from rendering behind our scene
                if (scene.backgroundCameraShape) {
                    scene.backgroundCameraShape.isVisible = false;
                }
            });
        }

        xrHelper.baseExperience.onStateChangedObservable.add((state) => {
            if (state === WebXRState.IN_XR) {
                // Ensure the background stays solidly dark inside the XR loop
                scene.autoClear = true;
                scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);
                
                if (splat) {
                    // Place the splat 2 meters ahead of your physical starting spot
                    splat.position.set(0, 0, 2); 
                }
            } else if (state === WebXRState.NOT_IN_XR) {
                if (splat) splat.position.set(0, 0, 5); 
            }
        });

        window.removeEventListener("click", enableAR);
        console.log("Positional tracking active over dark background.");
    } catch (e) {
        console.error("WebXR session initialization error:", e);
    }
}

window.addEventListener("click", enableAR);

// 6. Main Execution Loops
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());