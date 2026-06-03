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
        // Place the splat directly in front of the initial camera view
        splat.position.set(0, 0, 0);
        splat.scaling.setAll(6);
        console.log("Gaussian Splat loaded successfully!");
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
    Vector3.Zero(), // Target the center where the splat spawns
    scene
);
camera.lowerBetaLimit = 0.2;
camera.upperBetaLimit = Math.PI - 0.2;

// Enable standard touch controls alongside the gyro so the user isn't locked out
camera.attachControl(canvas, true);

// 3. Gyroscope Setup (Magic Window Mode)
let xrActive = false;

async function requestGyroPermission() {
    // Check if iOS requires explicit permission activation
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
        // Android or non-iOS browsers
        initGyroListener();
    }
}

function initGyroListener() {
    if (window.DeviceOrientationEvent) {
        window.addEventListener("deviceorientation", (event) => {
            if (xrActive) return;
            if (event.alpha === null || event.beta === null) return;

            // Convert degrees to radians
            const alpha = (event.alpha * Math.PI) / 180;
            const rawBeta = ((event.beta + 90) * Math.PI) / 180;
            const beta = Math.max(0.2, Math.min(Math.PI - 0.2, rawBeta));

            // Smoothly apply orientation to the camera arcs
            camera.alpha = -alpha;
            camera.beta = beta;
        });
    }
}

// 4. True Walk-Around via WebXR AR
async function enableAR() {
    // Request gyro sensor access first for the fallback mode
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
                    splat.position.set(0, 0, 2); // Anchor 2 meters out in AR space
                }
            } else if (state === WebXRState.NOT_IN_XR) {
                xrActive = false;
                if (splat) splat.position.set(0, 0, 0); // Bring back to origin
            }
        });

        window.removeEventListener("click", enableAR);
        console.log("WebXR AR Session initialized successfully.");
    } catch (e) {
        console.error("WebXR error:", e);
    }
}

// Trigger permissions and potential WebXR initialization on user click
window.addEventListener("click", enableAR);

// 5. Execution Loops
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());