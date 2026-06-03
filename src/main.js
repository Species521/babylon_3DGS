import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    ArcRotateCamera,
    Color4,
    SceneLoader,
    WebXRState
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

// Initialize the loaders
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
        splat.position.set(0, 0, 0);
        
        // Doubled the scaling from 6 to 12
        splat.scaling.setAll(12);
        
        // Flip the splat upside down (180 degrees around the Z axis)
        splat.rotation.z = Math.PI;
        
        console.log("Gaussian Splat loaded, resized, and inverted successfully!");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 2. Camera Configuration
const camera = new ArcRotateCamera(
    "cam",
    0,
    Math.PI / 3,
    8,
    Vector3.Zero(), 
    scene
);
camera.lowerBetaLimit = 0.2;
camera.upperBetaLimit = Math.PI - 0.2;
camera.attachControl(canvas, true);

// 3. Gyroscope Setup (Magic Window Mode)
let xrActive = false;

async function requestGyroPermission() {
    if (typeof DeviceOrientationEvent !== "undefined" && 
        typeof DeviceOrientationEvent.requestPermission === "function") {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if (permission === "granted") {
                initGyroListener();
            }
        } catch (error) {
            console.error("DeviceOrientation permission denied:", error);
        }
    } else {
        initGyroListener();
    }
}

function initGyroListener() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", (event) => {
            if (xrActive) return;
            if (event.alpha === null || event.beta === null || event.gamma === null) return;

            // Convert degrees to radians
            const alpha = (event.alpha * Math.PI) / 180;
            const beta = (event.beta * Math.PI) / 180;
            const gamma = (event.gamma * Math.PI) / 180;

            // Subtly shift the camera's target position based on tilt to break the "locked to screen" feel
            // This simulates slight positional head-tracking/translation purely via rotational data
            camera.target.x = Math.sin(gamma) * 2;
            camera.target.y = Math.sin(beta - (Math.PI / 3)) * 2;

            // Apply smooth orientation to the viewing arcs
            camera.alpha = -alpha;
            camera.beta = Math.max(0.2, Math.min(Math.PI - 0.2, beta));
        });
    }
}

// 4. True Walk-Around via WebXR AR
async function enableAR() {
    await requestGyroPermission();

    const supported = await navigator.xr?.isSessionSupported("immersive-ar").catch(() => false);
    if (!supported) {
        console.warn("Immersive AR tracking not supported on this device/browser.");
        return;
    }

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
                if (splat) {
                    // Reset targeting and anchor the splat out in tracking space
                    camera.target.set(0, 0, 0);
                    splat.position.set(0, 0, 2); 
                }
            } else if (state === WebXRState.NOT_IN_XR) {
                xrActive = false;
                if (splat) splat.position.set(0, 0, 0); 
            }
        });

        window.removeEventListener("click", enableAR);
        console.log("WebXR AR Session initialized successfully.");
    } catch (e) {
        console.error("WebXR error:", e);
    }
}

window.addEventListener("click", enableAR);

// 5. Execution Loops
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());