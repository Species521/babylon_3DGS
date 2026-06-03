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
        splat.scaling.setAll(3);
        console.log("Gaussian Splat loaded successfully!");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 5. Camera
const camera = new ArcRotateCamera(
    "cam",
    0,
    Math.PI / 2.5,
    5,
    new Vector3(0, 0, 2),
    scene
);
camera.attachControl(canvas, true);

// 6. Device orientation fallback — paused during touch and XR
let xrActive = false;
let touching = false;

canvas.addEventListener("touchstart", () => { touching = true; });
canvas.addEventListener("touchend",   () => { touching = false; });

if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", (event) => {
        if (xrActive || touching) return;
        if (event.alpha === null) return;
        const alpha = (event.alpha * Math.PI) / 180;
        const beta  = (event.beta  * Math.PI) / 180;
        camera.alpha = -alpha;
        camera.beta  = Math.max(0.1, Math.min(Math.PI - 0.1, beta));
    });
}

// 7. WebXR AR
async function enableAR() {
    const supported = await navigator.xr?.isSessionSupported("immersive-ar").catch(() => false);
    if (!supported) {
        console.warn("Immersive AR not supported — using gyro fallback.");
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
                if (splat) {
                    const xrCamera = xrHelper.baseExperience.camera;
                    splat.parent = xrCamera;
                    splat.position.set(0, 0, 2);
                }
            } else if (state === WebXRState.NOT_IN_XR) {
                xrActive = false;
                if (splat) {
                    splat.parent = null;
                    splat.position.set(0, 0, 2);
                }
            }
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