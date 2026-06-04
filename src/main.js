import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    Color4,
    SceneLoader,
    ArcRotateCamera,
    WebXRState,
    PointerEventTypes
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

registerBuiltInLoaders();

const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);
engine.setHardwareScalingLevel(1);
engine.targetFPS = 42;

const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 1. Load the Gaussian Splat — fixed in world space
let splat = null;
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    splat = result.meshes[0];
    if (splat) {
        splat.position.set(0, 0, 2);
        splat.scaling.setAll(8);
        splat.rotation.z = Math.PI;
        console.log("Gaussian Splat loaded successfully.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 2. Fallback camera for desktop/non-XR
const camera = new ArcRotateCamera("cam", 0, Math.PI / 3, 8, new Vector3(0, 0, 5), scene);
camera.pinchPrecision = 100;
camera.inertia = 0.9;
camera.minZ = 0.01;
camera.maxZ = 30;
camera.attachControl(canvas, true);

// 3. Pinch-to-scale in XR
let xrActive = false;
let isPinching = false;
let lastPinchDistance = null;
const PINCH_SCALE_SPEED = 0.04; // tunable

function getPinchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

canvas.addEventListener("touchstart", (e) => {
    if (!xrActive || !splat) return;
    if (e.touches.length === 2) {
        isPinching = true;
        lastPinchDistance = getPinchDistance(e.touches);
    }
});

canvas.addEventListener("touchmove", (e) => {
    if (!xrActive || !splat || !isPinching) return;
    if (e.touches.length === 2) {
        const currentDistance = getPinchDistance(e.touches);
        const delta = currentDistance - lastPinchDistance;
        // Scale all axes uniformly
        const newScale = Math.max(1, splat.scaling.x + delta * PINCH_SCALE_SPEED);
        splat.scaling.setAll(newScale);
        lastPinchDistance = currentDistance;
    }
});

canvas.addEventListener("touchend", (e) => {
    if (e.touches.length < 2) {
        isPinching = false;
        lastPinchDistance = null;
    }
});

// 4. Immersive AR — single camera, full 6DOF via ARCore, dark background
const xr = await scene.createDefaultXRExperienceAsync({
    uiOptions: {
        sessionMode: "immersive-ar",
        referenceSpaceType: "local-floor"
    },
    optionalFeatures: true
});

if (!xr.baseExperience) {
    console.warn("WebXR not supported — falling back to ArcRotateCamera.");
} else {
    xr.baseExperience.onStateChangedObservable.add((state) => {
        if (state === WebXRState.IN_XR) {
            xrActive = true;
            scene.autoClear = true;
            scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);
            const backgroundRemover = xr.baseExperience.featuresManager.getEnabledFeature("xr-background-remover");
            if (backgroundRemover) {
                xr.baseExperience.featuresManager.disableFeature("xr-background-remover");
            }
            engine.setHardwareScalingLevel(1.5);
        } else if (state === WebXRState.NOT_IN_XR) {
            xrActive = false;
            isPinching = false;
            lastPinchDistance = null;
            engine.setHardwareScalingLevel(1);
        }
    });
    console.log("WebXR AR session ready.");
}

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());