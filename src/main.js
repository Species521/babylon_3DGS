import {
    Engine,
    Scene,
    HemisphericLight,
    Vector3,
    MeshBuilder,
    ArcRotateCamera,
    DeviceOrientationCamera,
    Color4,
    StandardMaterial,
    Color3
} from "@babylonjs/core";

const canvas = document.getElementById("c");
const engine = new Engine(canvas, true);

const scene = new Scene(engine);
scene.clearColor = new Color4(0.08, 0.08, 0.08, 1);

// light
new HemisphericLight("light", new Vector3(0, 1, 0), scene);

// cube
const box = MeshBuilder.CreateBox("box", { size: 1 }, scene);
box.position.z = 3;

const mat = new StandardMaterial("m", scene);
mat.diffuseColor = new Color3(0.2, 0.6, 1.0);
box.material = mat;

// fallback camera
const camera = new ArcRotateCamera(
    "cam",
    0,
    Math.PI / 2.5,
    8,
    Vector3.Zero(),
    scene
);
camera.attachControl(canvas, true);

// OPTIONAL gyro switch
async function enableGyro() {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== "granted") return;
    }

    const gyroCam = new DeviceOrientationCamera(
        "gyro",
        new Vector3(0, 0, 0),
        scene
    );

    scene.activeCamera = gyroCam;
}

window.addEventListener("click", enableGyro);

// render loop
engine.runRenderLoop(() => {
    scene.render();
});

window.addEventListener("resize", () => engine.resize());