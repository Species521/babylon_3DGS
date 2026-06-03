import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    DeviceOrientationCamera,
    TransformNode,
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
        // Place splat at origin
        splat.position.set(0, 0, 0);
        
        // Double the size (set to 12)
        splat.scaling.setAll(12);
        
        // Flip the splat upside down
        splat.rotation.z = Math.PI;
        
        console.log("Gaussian Splat configured successfully.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 3. Setup Spatial Magic Window Rigging
// Create an anchor node to offset the camera so it looks at the splat
const cameraAnchor = new TransformNode("cameraAnchor", scene);
cameraAnchor.position.set(0, 0, -8); // Push the camera platform back 8 units

// Native Device Orientation Camera setup
const camera = new DeviceOrientationCamera("magicWindowCam", Vector3.Zero(), scene);

// Attach camera to our anchor node
camera.parent = cameraAnchor;

// Ensure camera points directly at the splat origin
camera.setTarget(Vector3.Zero());
camera.attachControl(canvas, true);

// 4. Gyro Sensor Permissions Initialization
let xrActive = false;

async function requestSensors() {
    if (typeof DeviceOrientationEvent !== "undefined" && 
        typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === "granted") {
                console.log("Device orientation tracking activated.");
            }
        } catch (error) {
            console.error("Sensor initialization failed:", error);
        }
    }
}

// 5. Native WebXR AR Switch
async function enableAR() {
    // Trigger sensor check for fallback magic window mode
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

        xrHelper.baseExperience.onStateChangedObservable.add((state) => {
            if (state === WebXRState.IN_XR) {
                xrActive = true;
                if (splat) splat.position.set(0, 0, 2); 
            } else if (state === WebXRState.NOT_IN_XR) {
                xrActive = false;
                if (splat) splat.position.set(0, 0, 0); 
            }
        });

        window.removeEventListener("click", enableAR);
    } catch (e) {
        console.error("WebXR session initialization error:", e);
    }
}

window.addEventListener("click", enableAR);

// 6. Main Execution Loops
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());