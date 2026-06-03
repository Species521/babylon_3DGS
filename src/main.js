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

registerBuiltInLoaders();

// 1. Initialize Engine and Canvas
const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

// 2. Scene Setup
const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

// 3. Lighting
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 4. Load the Gaussian Splat
let splat = null;
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    splat = result.meshes[0];
    if (splat) {
        splat.position.set(0, 0, 2);
        splat.scaling.setAll(6);
        console.log("Gaussian Splat loaded successfully!");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 5. Camera — no touch control, gyro only
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
// No attachControl — gyro drives everything

// 6. Gyro/accelerometer orientation
let xrActive = false;

if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (event) => {
        if (xrActive) return;
        if (event.alpha === null || event.beta === null) return;

        const alpha = (event.alpha * Math.PI) / 180;
        const rawBeta = ((event.beta + 90) * Math.PI) / 180;
        const beta = Math.max(0.2, Math.min(Math.PI - 0.2, rawBeta));

        camera.alpha = -alpha;
        camera.beta = beta;
    });
}

// 7. WebXR AR
async function enableAR() {
    const supported = await navigator.xr?.isSessionSupported("immersive-ar").catch(() => false);
    if (!supported) {
        console.warn("Immersive AR not supported on this device/browser.");
        window.removeEventListener("click", enableAR);
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
                if (splat) splat.parent = null;
            } else if (state === WebXRState.NOT_IN_XR) {
                xrActive = false;
                if (splat) {
                    splat.parent = null;
                    splat.position.set(0, 0, 2);
                }
            }
        });

        scene.onBeforeRenderObservable.add(() => {
            if (!xrActive || !splat) return;
            const xrCamera = xrHelper.baseExperience.camera;
            const forward = xrCamera.getDirection(Vector3.Forward());
            const worldPos = xrCamera.globalPosition;
            splat.position.copyFrom(worldPos.add(forward.scale(2)));
        });

        window.removeEventListener("click", enableAR);
        console.log("WebXR AR Session initialized successfully.");
    } catch (e) {
        console.error("WebXR error:", e);
    }
}

window.addEventListener("click", enableAR);

// 8. Render Loop & Window Management
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());