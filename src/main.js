import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    Color4,
    SceneLoader,
    ArcRotateCamera,
    WebXRState
} from "@babylonjs/core";
import { registerBuiltInLoaders } from "@babylonjs/loaders/dynamic";

registerBuiltInLoaders();

const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// 1. Load the Gaussian Splat — fixed in world space
SceneLoader.ImportMeshAsync("", "", "clusterFly_M.ply", scene).then((result) => {
    const splat = result.meshes[0];
    if (splat) {
        splat.position.set(0, 0, 5);
        splat.scaling.setAll(48);
        splat.rotation.z = Math.PI;
        console.log("Gaussian Splat loaded successfully.");
    }
}).catch((err) => {
    console.error("Error loading Gaussian Splat:", err);
});

// 2. Fallback camera for desktop/non-XR
const camera = new ArcRotateCamera("cam", 0, Math.PI / 3, 8, new Vector3(0, 0, 5), scene);
camera.pinchPrecision = 50;
camera.attachControl(canvas, true);

// 3. Immersive AR — single camera, full 6DOF via ARCore, dark background
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
            // Force dark background, kill camera passthrough
            scene.autoClear = true;
            scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);
            // Disable the background remover feature if active
            const backgroundRemover = xr.baseExperience.featuresManager.getEnabledFeature("xr-background-remover");
            if (backgroundRemover) {
                xr.baseExperience.featuresManager.disableFeature("xr-background-remover");
            }
        }
    });
    console.log("WebXR AR session ready.");
}

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());