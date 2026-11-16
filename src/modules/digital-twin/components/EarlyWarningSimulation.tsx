// import { useEffect, useRef, useState } from "react";
// import * as THREE from "three";
// import {
//   AlertTriangle,
//   CheckCircle2,
//   CloudRain,
//   Camera,
//   Maximize2,
//   Settings2,
//   Pause,
//   Play,
//   RotateCcw,
//   Waves,
// } from "lucide-react";

// type SimulationStatus = "NORMAL" | "RISING" | "ALERT" | "RELEASING" | "STABLE";

// const DURATION = 32;

// const captions: Array<[number, string]> = [
//   [0, "Normal operation. The demonstration reservoir starts at 680.0 m with the gates closed."],
//   [3, "Heavy rainfall begins. Simulated inflow increases and the reservoir level rises."],
//   [12, "The selected rainfall scenario is evaluated against an illustrative reference. An alert sequence is shown only if the model level reaches it."],
//   [14, "If the illustrative reference is reached, the animation shows a simulated sensor signal reaching the control room."],
//   [17, "When the illustrative alert sequence is active, simulated notification paths are shown to the listed authorities."],
//   [21, "The gate model follows the selected automatic or manual demonstration setting; no physical equipment is controlled."],
//   [30, "The scenario ends. The displayed reservoir response depends on the selected rainfall and gate settings, and is not a safety assessment."],
// ];

// const clamp = (value: number) => Math.min(1, Math.max(0, value));
// const segment = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
// const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
// const peakWaterLevel = (rainfallIntensity: number) =>
//   680 + (rainfallIntensity / 100) * 6.15;

// const automaticGateOpening = (t: number) =>
//   ease(segment(t, 22, 25)) * (1 - ease(segment(t, 30, 32)));

// const waterLevel = (
//   t: number,
//   rainfallIntensity: number,
//   gateMode: "AUTO" | "MANUAL",
//   manualGate: number,
// ) => {
//   const rise = peakWaterLevel(rainfallIntensity) - 680;
//   const peak = t < 5 ? 680 : t < 12 ? 680 + rise * ease(segment(t, 5, 12)) : 680 + rise;
//   if (t < 22) return peak;

//   const releaseControl = gateMode === "AUTO"
//     ? (peakWaterLevel(rainfallIntensity) >= 684 ? 1 : 0)
//     : manualGate / 100;
//   const releaseProgress = ease(segment(t, 22, 30));
//   return peak - rise * 0.9 * releaseControl * releaseProgress;
// };

// function createStreakTexture() {
//   const canvas = document.createElement("canvas");
//   canvas.width = canvas.height = 256;
//   const context = canvas.getContext("2d");
//   if (!context) return new THREE.CanvasTexture(canvas);
//   context.fillStyle = "#2a8fe0";
//   context.fillRect(0, 0, 256, 256);
//   for (let i = 0; i < 90; i += 1) {
//     context.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.22})`;
//     context.lineWidth = 1 + Math.random() * 2;
//     const x = Math.random() * 256;
//     const y = Math.random() * 256;
//     const length = 10 + Math.random() * 40;
//     context.beginPath();
//     context.moveTo(x, y);
//     context.lineTo(x + length, y);
//     context.stroke();
//   }
//   const texture = new THREE.CanvasTexture(canvas);
//   texture.wrapS = THREE.RepeatWrapping;
//   texture.wrapT = THREE.RepeatWrapping;
//   return texture;
// }

// export default function EarlyWarningSimulation() {
//   const stageRef = useRef<HTMLDivElement | null>(null);
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const [playing, setPlaying] = useState(true);
//   const [speed, setSpeed] = useState(1);
//   const [quality, setQuality] = useState("auto");
//   const [loop, setLoop] = useState(true);
//   const [time, setTime] = useState(0);
//   const [status, setStatus] = useState<SimulationStatus>("NORMAL");
//   const [level, setLevel] = useState(680);
//   const [inflow, setInflow] = useState(380);
//   const [outflow, setOutflow] = useState(300);
//   const [caption, setCaption] = useState(captions[0][1]);
//   const [webglError, setWebglError] = useState(false);
//   const [completedRecipients, setCompletedRecipients] = useState([false, false, false]);
//   const [rainfallIntensity, setRainfallIntensity] = useState(70);
//   const [gateMode, setGateMode] = useState<"AUTO" | "MANUAL">("AUTO");
//   const [manualGate, setManualGate] = useState(0);
//   const [cameraPreset, setCameraPreset] = useState<"overview" | "reservoir" | "gates">("overview");
//   const controlsRef = useRef({
//     playing: true,
//     speed: 1,
//     loop: true,
//     quality: "auto",
//     seek: null as number | null,
//     restart: false,
//     rainfallIntensity: 70,
//     gateMode: "AUTO" as "AUTO" | "MANUAL",
//     manualGate: 0,
//     cameraPreset: "overview" as "overview" | "reservoir" | "gates",
//   });

//   useEffect(() => {
//     controlsRef.current.playing = playing;
//     controlsRef.current.speed = speed;
//     controlsRef.current.loop = loop;
//     controlsRef.current.quality = quality;
//     controlsRef.current.rainfallIntensity = rainfallIntensity;
//     controlsRef.current.gateMode = gateMode;
//     controlsRef.current.manualGate = manualGate;
//     controlsRef.current.cameraPreset = cameraPreset;
//   }, [playing, speed, loop, quality, rainfallIntensity, gateMode, manualGate, cameraPreset]);

//   useEffect(() => {
//     const stage = stageRef.current;
//     const canvas = canvasRef.current;
//     if (!stage || !canvas) return;

//     let renderer: THREE.WebGLRenderer;
//     try {
//       renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
//     } catch {
//       setWebglError(true);
//       return;
//     }

//     renderer.shadowMap.enabled = true;
//     renderer.shadowMap.type = THREE.PCFSoftShadowMap;
//     const scene = new THREE.Scene();
//     const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 200);
//     const dayColor = new THREE.Color(0x1d4682);
//     const stormColor = new THREE.Color(0x0a1426);
//     const backgroundColor = new THREE.Color();
//     scene.fog = new THREE.Fog(0x1d4682, 50, 110);

//     const hemisphere = new THREE.HemisphereLight(0xbcd8ff, 0x12305e, 0.95);
//     const sun = new THREE.DirectionalLight(0xffffff, 1.1);
//     sun.position.set(12, 22, 16);
//     sun.castShadow = true;
//     sun.shadow.mapSize.set(2048, 2048);
//     const shadowCamera = sun.shadow.camera as THREE.OrthographicCamera;
//     shadowCamera.left = -30;
//     shadowCamera.right = 30;
//     shadowCamera.top = 30;
//     shadowCamera.bottom = -30;
//     shadowCamera.far = 90;
//     const alertLight = new THREE.PointLight(0xff3d2e, 0, 22);
//     alertLight.position.set(-5, 8, 4);
//     scene.add(hemisphere, sun, alertLight);

//     const material = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) =>
//       new THREE.MeshStandardMaterial({ color, ...options });
//     const addBox = (
//       width: number, height: number, depth: number,
//       x: number, y: number, z: number, color: THREE.ColorRepresentation,
//       options: THREE.MeshStandardMaterialParameters = {},
//     ) => {
//       const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, options));
//       mesh.position.set(x, y, z);
//       mesh.castShadow = true;
//       mesh.receiveShadow = true;
//       scene.add(mesh);
//       return mesh;
//     };
//     const addLabel = (text: string, width: number, x: number, y: number, z: number) => {
//       const labelCanvas = document.createElement("canvas");
//       labelCanvas.width = 640;
//       labelCanvas.height = 112;
//       const context = labelCanvas.getContext("2d");
//       if (!context) return;
//       context.fillStyle = "rgba(5,20,50,.82)";
//       context.strokeStyle = "#4cc2ff";
//       context.lineWidth = 4;
//       context.beginPath();
//       if (context.roundRect) context.roundRect(4, 4, 632, 104, 22);
//       else context.rect(4, 4, 632, 104);
//       context.fill();
//       context.stroke();
//       context.fillStyle = "#fff";
//       context.font = "600 44px Segoe UI,Arial,sans-serif";
//       context.textAlign = "center";
//       context.textBaseline = "middle";
//       context.fillText(text, 320, 58);
//       const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), depthTest: false, transparent: true }));
//       sprite.scale.set(width, (width * 112) / 640, 1);
//       sprite.position.set(x, y, z);
//       sprite.renderOrder = 9;
//       scene.add(sprite);
//     };

//     // Diorama base and terrain.
//     addBox(42, 1, 27, 4, -0.5, -3, 0x0a1f4a);
//     const edge = new THREE.LineSegments(
//       new THREE.EdgesGeometry(new THREE.BoxGeometry(42, 1, 27)),
//       new THREE.LineBasicMaterial({ color: 0x3fc8ff }),
//     );
//     edge.position.set(4, -0.5, -3);
//     scene.add(edge);
//     addBox(14, 7, 10, -9, 3.5, -11.5, 0x1b4a3a);
//     addBox(3, 7, 13, -15.5, 3.5, -5, 0x1b4a3a);
//     addBox(26, 0.8, 10, 12, 0.4, -11.5, 0x14392c);
//     addBox(26, 0.8, 4, 12, 0.4, 10, 0x14392c);
//     for (let i = 0; i < 34; i += 1) {
//       const upstream = i < 12;
//       const x = upstream ? -14 + Math.random() * 10 : 2 + Math.random() * 20;
//       const z = upstream ? -8 - Math.random() * 6 : (i % 3 ? -8 - Math.random() * 6 : 8.5 + Math.random() * 3);
//       const tree = new THREE.Group();
//       const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), material(0x5b3b22));
//       trunk.position.y = 0.35;
//       const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 8), material(0x1f7a4d));
//       crown.position.y = 1.4;
//       crown.castShadow = true;
//       tree.add(trunk, crown);
//       tree.position.set(x, upstream ? 7 : 0.8, z);
//       tree.scale.setScalar(0.8 + Math.random() * 0.6);
//       scene.add(tree);
//     }

//     // Reservoir and illustrative alert reference.
//     const waterTexture = createStreakTexture();
//     waterTexture.repeat.set(4, 4);
//     const water = new THREE.Mesh(new THREE.BoxGeometry(12, 1, 13), material(0x1f8fe0, { transparent: true, opacity: 0.74, roughness: 0.15, metalness: 0.1 }));
//     water.position.x = -8;
//     scene.add(water);
//     const surfaceMaterial = material(0x5cc4ff, { map: waterTexture, roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.92 });
//     const surface = new THREE.Mesh(new THREE.PlaneGeometry(12, 13, 30, 30), surfaceMaterial);
//     surface.rotation.x = -Math.PI / 2;
//     surface.position.x = -8;
//     scene.add(surface);
//     const surfacePositions = surface.geometry.attributes.position;
//     const alertReference = addBox(0.05, 0.05, 13, -2.04, 5.2, 0, 0xffb020, { emissive: 0xffb020, emissiveIntensity: 1 });
//     addLabel("Illustrative alert reference", 4.4, -3.6, 5.75, 6.9);

//     // Dam and gates.
//     addBox(2, 6, 13, -1, 3, 0, 0x8b97ad);
//     addBox(2.8, 0.3, 13.6, -1, 6.15, 0, 0xc3cddd);
//     const gateZ = [-4.5, -1.5, 1.5, 4.5];
//     const gatePanels: THREE.Mesh[] = [];
//     gateZ.forEach((z) => {
//       addBox(0.14, 1.9, 1.8, 0.03, 1.3, z, 0x06122c);
//       gatePanels.push(addBox(0.18, 2, 1.9, 0.14, 1.4, z, 0x35507f));
//     });
//     const jetCount = 480;
//     const jetGeometry = new THREE.BufferGeometry();
//     const jetPositions = new Float32Array(jetCount * 3);
//     const jetVelocity: number[] = [];
//     const jetDepth: number[] = [];
//     for (let i = 0; i < jetCount; i += 1) {
//       jetVelocity.push(2.4 + Math.random() * 1.8);
//       jetDepth.push((Math.random() - 0.5) * 1.6);
//     }
//     jetGeometry.setAttribute("position", new THREE.BufferAttribute(jetPositions, 3));
//     const jets = new THREE.Points(jetGeometry, new THREE.PointsMaterial({ color: 0xe2f6ff, size: 0.2, transparent: true, opacity: 0, depthWrite: false }));
//     jets.frustumCulled = false;
//     scene.add(jets);

//     // Downstream river.
//     const riverTexture = createStreakTexture();
//     riverTexture.repeat.set(6, 3);
//     const river = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), material(0x2a9be0, { map: riverTexture, roughness: 0.2, metalness: 0.1 }));
//     river.rotation.x = -Math.PI / 2;
//     river.position.set(11, 0.12, 0);
//     river.receiveShadow = true;
//     scene.add(river);

//     // Sensor and control room.
//     const sensorMaterial = material(0x2ee6a6, { emissive: 0x2ee6a6, emissiveIntensity: 1.4 });
//     const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), sensorMaterial);
//     sensor.position.set(-5, 7.6, 4);
//     scene.add(sensor);
//     const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7.5, 10), material(0x9fb4d8));
//     pole.position.set(-5, 3.75, 4);
//     pole.castShadow = true;
//     scene.add(pole);
//     const sensorRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.04, 8, 40), new THREE.MeshBasicMaterial({ color: 0xff4a3d, transparent: true, opacity: 0 }));
//     sensorRing.position.copy(sensor.position);
//     sensorRing.rotation.x = Math.PI / 2;
//     scene.add(sensorRing);
//     addLabel("Reservoir water level sensor", 4.6, -5, 8.6, 4);

//     addBox(4, 2.2, 2.6, 7, 1.9, -9.5, 0xcdd6e6);
//     addBox(4.5, 0.3, 3.1, 7, 3.15, -9.5, 0x5d6f93);
//     for (let i = 0; i < 3; i += 1) addBox(0.8, 0.7, 0.05, 5.9 + i * 1.1, 2.1, -8.18, 0x2aa8ff, { emissive: 0x2aa8ff, emissiveIntensity: 0.9 });
//     const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 5.2, 8), material(0x9fb4d8));
//     antenna.position.set(4, 3.4, -9.5);
//     antenna.castShadow = true;
//     scene.add(antenna);
//     const antennaLightMaterial = material(0xff5a3c, { emissive: 0xff5a3c, emissiveIntensity: 0 });
//     const antennaLight = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), antennaLightMaterial);
//     antennaLight.position.set(4, 6.1, -9.5);
//     scene.add(antennaLight);
//     addLabel("Control room (PLC & SCADA)", 5.2, 7, 4.5, -9.5);

//     const recipients = [
//       ["Gram Panchayat", 11, -13, 2, 1.4, 1.6, 0xd9b36a],
//       ["Municipal", 15, -10.5, 2.2, 1.8, 1.8, 0xb9c4d8],
//       ["Government authorities", 19, -12.5, 2.4, 2.2, 2, 0xe7e1d2],
//     ] as const;
//     const recipientMaterials: THREE.MeshStandardMaterial[] = [];
//     const recipientPositions: THREE.Vector3[] = [];
//     recipients.forEach((recipient) => {
//       const [, x, z, width, height, depth, color] = recipient;
//       addBox(width, height, depth, x, 0.8 + height / 2, z, color);
//       addBox(width + 0.3, 0.2, depth + 0.3, x, 0.9 + height, z, 0x5d6f93);
//       const indicatorMaterial = material(0x556677, { emissive: 0x000000, emissiveIntensity: 1 });
//       const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), indicatorMaterial);
//       indicator.position.set(x, 1.35 + height, z);
//       scene.add(indicator);
//       recipientMaterials.push(indicatorMaterial);
//       recipientPositions.push(indicator.position.clone());
//       addLabel(recipient[0], 4, x, 2.5 + height, z);
//     });

//     // Animated communication paths.
//     const curves = [new THREE.QuadraticBezierCurve3(sensor.position.clone(), new THREE.Vector3(-0.5, 13, -3), antennaLight.position.clone())];
//     recipientPositions.forEach((target, index) => {
//       curves.push(new THREE.QuadraticBezierCurve3(antennaLight.position.clone(), new THREE.Vector3((antennaLight.position.x + target.x) / 2, antennaLight.position.y + 4 + index, (antennaLight.position.z + target.z) / 2), target.clone()));
//     });
//     const beamMeshes: Array<{ geometry: THREE.TubeGeometry; indexCount: number }> = [];
//     const signalPoints: THREE.Mesh[] = [];
//     curves.forEach((curve, index) => {
//       const geometry = new THREE.TubeGeometry(curve, 48, 0.07, 6, false);
//       const beam = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: index ? 0x4cc2ff : 0xffb020, transparent: true, opacity: 0.85 }));
//       beam.frustumCulled = false;
//       scene.add(beam);
//       beamMeshes.push({ geometry, indexCount: geometry.index?.count ?? 0 });
//       geometry.setDrawRange(0, 0);
//       const point = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshBasicMaterial({ color: index ? 0xdff6ff : 0xffe0a0 }));
//       point.visible = false;
//       scene.add(point);
//       signalPoints.push(point);
//     });

//     // Rain and storm cloud.
//     const rainCount = 1800;
//     const rainGeometry = new THREE.BufferGeometry();
//     const rainPositions = new Float32Array(rainCount * 6);
//     const rainData = Array.from({ length: rainCount }, () => ({
//       x: -14 + Math.random() * 12,
//       z: -6 + Math.random() * 12.4,
//       phase: Math.random(),
//       speed: 0.8 + Math.random() * 0.6,
//     }));
//     rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
//     const rainMaterial = new THREE.LineBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0 });
//     const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
//     rain.frustumCulled = false;
//     scene.add(rain);
//     const cloudMaterial = material(0xd0d6e0, { transparent: true, roughness: 1 });
//     const cloud = new THREE.Group();
//     [[-3, 0, 0, 2.6], [0, 0.6, 0.4, 3.2], [3.2, 0, -0.3, 2.7], [5.6, -0.3, 0.5, 2], [-5.2, -0.4, 0.6, 1.9], [1.4, -0.2, 1.6, 2.4], [-1.8, -0.3, -1.8, 2.3]].forEach(([x, y, z, radius]) => {
//       const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), cloudMaterial);
//       puff.position.set(x, y, z);
//       puff.scale.y = 0.62;
//       cloud.add(puff);
//     });
//     scene.add(cloud);

//     let elapsed = 0;
//     let previousFrame = 0;
//     let uiAccumulator = 0;
//     let pointerX = 0;
//     let pointerY = 0;
//     let cameraX = 0;
//     let cameraY = 0;
//     let animationFrame = 0;
//     if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
//       controlsRef.current.playing = false;
//       setPlaying(false);
//     }
//     let lastCaption = -1;
//     let lastQuality = controlsRef.current.quality;
//     let disposed = false;

//     const onPointerMove = (event: PointerEvent) => {
//       const bounds = stage.getBoundingClientRect();
//       pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
//       pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
//     };
//     const resize = () => {
//       const width = stage.clientWidth;
//       const height = stage.clientHeight;
//       if (!width || !height) return;
//       const requested = controlsRef.current.quality === "auto" ? 0 : Number(controlsRef.current.quality);
//       const pixelRatio = requested ? Math.min(4, requested / width) : Math.min(window.devicePixelRatio || 1, 2);
//       renderer.setPixelRatio(pixelRatio);
//       renderer.setSize(width, height, false);
//       camera.aspect = width / height;
//       camera.updateProjectionMatrix();
//     };
//     const resizeObserver = new ResizeObserver(resize);
//     resizeObserver.observe(stage);
//     stage.addEventListener("pointermove", onPointerMove);
//     resize();

//     const renderAt = (t: number, delta: number, updateUi: boolean) => {
//       const intensity = controlsRef.current.rainfallIntensity;
//       const mode = controlsRef.current.gateMode;
//       const manualOpening = controlsRef.current.manualGate;
//       const currentLevel = waterLevel(t, intensity, mode, manualOpening);
//       const peakLevel = peakWaterLevel(intensity);
//       const alertTriggered = peakLevel >= 684 && t >= 12;
//       const waterHeight = 3 + (currentLevel - 680) * 0.55;
//       const rainStrength = segment(t, 3.5, 5) * (1 - segment(t, 24, 27)) * (intensity / 100);
//       const gateOpening = mode === "AUTO"
//         ? (alertTriggered ? automaticGateOpening(t) : 0)
//         : manualOpening / 100;
//       water.scale.y = waterHeight;
//       water.position.y = waterHeight / 2;
//       surface.position.y = waterHeight + 0.01;
//       for (let i = 0; i < surfacePositions.count; i += 1) {
//         const x = surfacePositions.getX(i);
//         const y = surfacePositions.getY(i);
//         surfacePositions.setZ(i, Math.sin(x * 1.3 + t * 2.4) * (0.03 + 0.09 * rainStrength) + Math.cos(y * 1.1 + t * 2) * (0.03 + 0.08 * rainStrength));
//       }
//       surfacePositions.needsUpdate = true;
//       waterTexture.offset.x = -t * 0.012;
//       riverTexture.offset.x -= delta * (0.04 + gateOpening * 0.5);
//       (alertReference.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 4);

//       const storm = segment(t, 2, 6) * (1 - segment(t, 25, 30)) * (intensity / 100);
//       backgroundColor.copy(dayColor).lerp(stormColor, storm);
//       scene.background = backgroundColor;
//       (scene.fog as THREE.Fog).color.copy(backgroundColor);
//       const flash = ((t > 7 && t < 7.12) || (t > 9.6 && t < 9.7) || (t > 13.4 && t < 13.5)) ? 1.6 : 0;
//       hemisphere.intensity = 0.95 - 0.35 * storm + flash;
//       sun.intensity = 1.1 - 0.6 * storm;
//       cloud.position.set(-26 + 17 * ease(segment(t, 1.8, 4.5)), 12, 0);
//       cloudMaterial.color.setHex(0xd0d6e0).lerp(new THREE.Color(0x4f586b), storm);
//       cloudMaterial.opacity = segment(t, 1.8, 3.5) * (1 - 0.9 * segment(t, 26, 30)) * (intensity / 100);
//       cloud.visible = cloudMaterial.opacity > 0.01;

//       rainMaterial.opacity = 0.65 * rainStrength;
//       rain.visible = rainStrength > 0.01;
//       if (rain.visible) {
//         for (let i = 0; i < rainCount; i += 1) {
//           const item = rainData[i];
//           const y = 13 - ((item.phase + t * 0.9 * item.speed) % 1) * (13 - waterHeight);
//           const offset = i * 6;
//           rainPositions[offset] = item.x;
//           rainPositions[offset + 1] = y;
//           rainPositions[offset + 2] = item.z;
//           rainPositions[offset + 3] = item.x - 0.08;
//           rainPositions[offset + 4] = y + 0.55;
//           rainPositions[offset + 5] = item.z;
//         }
//         (rainGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
//       }

//       const alertActive = alertTriggered && t < 29;
//       const sensorColor = alertActive ? 0xff4a3d : 0x2ee6a6;
//       sensorMaterial.color.setHex(sensorColor);
//       sensorMaterial.emissive.setHex(sensorColor);
//       sensorMaterial.emissiveIntensity = alertActive ? 1.2 + Math.sin(t * 10) * 0.8 : 1.4;
//       const ringPhase = (t * 1.1) % 1;
//       sensorRing.scale.setScalar(0.6 + ringPhase * 2.4);
//       (sensorRing.material as THREE.MeshBasicMaterial).opacity = alertActive ? (1 - ringPhase) * 0.9 : 0;
//       alertLight.intensity = alertActive ? 1.5 + Math.sin(t * 10) : 0;

//       const communicationEnabled = alertTriggered ? 1 : 0;
//       const progress = [
//         communicationEnabled * segment(t, 14, 17),
//         communicationEnabled * segment(t, 17, 19),
//         communicationEnabled * segment(t, 17.4, 19.6),
//         communicationEnabled * segment(t, 17.8, 20.2),
//       ];
//       beamMeshes.forEach((beam, index) => {
//         beam.geometry.setDrawRange(0, Math.floor(progress[index] * beam.indexCount / 6) * 6);
//         const point = signalPoints[index];
//         point.visible = progress[index] > 0 && progress[index] < 1;
//         if (point.visible) point.position.copy(curves[index].getPoint(progress[index]));
//       });
//       antennaLightMaterial.emissiveIntensity = t > 16.5 && t < 21 && Math.sin(t * 12) > 0 ? 2 : 0;
//       recipientMaterials.forEach((recipientMaterial, index) => {
//         const isOn = progress[index + 1] >= 1 && t < 30.5;
//         recipientMaterial.color.setHex(isOn ? 0x2ee68a : 0x556677);
//         recipientMaterial.emissive.setHex(isOn ? 0x2ee68a : 0x000000);
//       });
//       gatePanels.forEach((panel) => { panel.position.y = 1.4 + gateOpening * 2.2; });
//       const jetMaterial = jets.material as THREE.PointsMaterial;
//       jetMaterial.opacity = gateOpening > 0.04 ? Math.min(0.95, gateOpening * 1.5) : 0;
//       jets.visible = jetMaterial.opacity > 0;
//       if (jets.visible) {
//         for (let i = 0; i < jetCount; i += 1) {
//           const progressValue = (t * 1.3 + i / jetCount) % 1;
//           const y = Math.max(0.16, 1.3 + 1.4 * progressValue - 6 * progressValue * progressValue);
//           const offset = i * 3;
//           jetPositions[offset] = 0.3 + jetVelocity[i] * progressValue;
//           jetPositions[offset + 1] = y;
//           jetPositions[offset + 2] = gateZ[i % 4] + jetDepth[i];
//         }
//         (jetGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
//       }

//       cameraX += (pointerX - cameraX) * 0.05;
//       cameraY += (pointerY - cameraY) * 0.05;
//       const preset = controlsRef.current.cameraPreset;
//       const view = preset === "reservoir"
//         ? { x: -7, y: 10, z: 19, tx: -6, ty: 3.2, tz: -1 }
//         : preset === "gates"
//           ? { x: 5, y: 7, z: 17, tx: 1, ty: 2, tz: 0 }
//           : { x: 3, y: 9.5, z: 27, tx: 3, ty: 2.6, tz: -2 };
//       const dolly = ease(segment(t, 12, 16)) * -2.5 + ease(segment(t, 21, 26)) * 1.5;
//       camera.position.set(view.x + Math.sin(t * 0.18) * (preset === "overview" ? 2.5 : 0.7) + cameraX * 4, view.y + cameraY * 2.5, view.z + dolly);
//       camera.lookAt(view.tx + cameraX * 1.2, view.ty, view.tz);
//       renderer.render(scene, camera);

//       if (updateUi) {
//         setLevel(currentLevel);
//         setInflow(Math.round(180 + (intensity / 100) * 1070 * segment(t, 4, 8) * (1 - segment(t, 24, 28))));
//         setOutflow(Math.round(300 + 880 * gateOpening));
//         setStatus(!alertTriggered
//           ? (t < 5 ? "NORMAL" : t < 30 ? "RISING" : "STABLE")
//           : t < 22 ? "ALERT" : t < 30 ? "RELEASING" : "STABLE");
//         setCompletedRecipients([progress[1] >= 1 && t < 30.5, progress[2] >= 1 && t < 30.5, progress[3] >= 1 && t < 30.5]);
//       }
//       const captionIndex = captions.reduce((found, item, index) => (t >= item[0] ? index : found), 0);
//       if (captionIndex !== lastCaption) {
//         lastCaption = captionIndex;
//         setCaption(captions[captionIndex][1]);
//       }
//     };

//     const animate = (timestamp: number) => {
//       if (disposed) return;
//       if (!previousFrame) previousFrame = timestamp;
//       const delta = Math.min(0.1, (timestamp - previousFrame) / 1000);
//       previousFrame = timestamp;
//       const controls = controlsRef.current;
//       if (controls.restart) {
//         elapsed = 0;
//         lastCaption = -1;
//         controls.restart = false;
//       }
//       if (controls.seek !== null) {
//         elapsed = controls.seek;
//         controls.seek = null;
//         lastCaption = -1;
//       }
//       if (controls.quality !== lastQuality) {
//         lastQuality = controls.quality;
//         resize();
//       }
//       if (controls.playing) {
//         elapsed += delta * controls.speed;
//         if (elapsed >= DURATION + 3) {
//           if (controls.loop) elapsed = 0;
//           else {
//             elapsed = DURATION;
//             controls.playing = false;
//             setPlaying(false);
//           }
//         }
//       }
//       const currentTime = Math.min(elapsed, DURATION);
//       uiAccumulator += delta;
//       const updateUi = uiAccumulator >= 0.1;
//       if (updateUi) {
//         uiAccumulator = 0;
//         setTime(currentTime);
//       }
//       renderAt(currentTime, delta, updateUi);
//       animationFrame = window.requestAnimationFrame(animate);
//     };
//     animationFrame = window.requestAnimationFrame(animate);

//     const onFullscreenChange = () => resize();
//     document.addEventListener("fullscreenchange", onFullscreenChange);

//     return () => {
//       disposed = true;
//       window.cancelAnimationFrame(animationFrame);
//       resizeObserver.disconnect();
//       stage.removeEventListener("pointermove", onPointerMove);
//       document.removeEventListener("fullscreenchange", onFullscreenChange);
//       scene.traverse((object) => {
//         const mesh = object as THREE.Mesh;
//         if (mesh.geometry) mesh.geometry.dispose();
//         if (mesh.material) {
//           const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
//           materials.forEach((item) => {
//             Object.values(item).forEach((value) => {
//               if (value instanceof THREE.Texture) value.dispose();
//             });
//             item.dispose();
//           });
//         }
//       });
//       waterTexture.dispose();
//       riverTexture.dispose();
//       renderer.dispose();
//     };
//   }, []);

//   const togglePlayback = () => {
//     const next = !controlsRef.current.playing;
//     if (next && time >= DURATION) {
//       controlsRef.current.seek = 0;
//       setTime(0);
//     }
//     controlsRef.current.playing = next;
//     setPlaying(next);
//   };
//   const restart = () => {
//     controlsRef.current.restart = true;
//     controlsRef.current.playing = true;
//     controlsRef.current.seek = 0;
//     setTime(0);
//     setPlaying(true);
//     setCompletedRecipients([false, false, false]);
//   };

//   const resetScenario = () => {
//     setRainfallIntensity(70);
//     setGateMode("AUTO");
//     setManualGate(0);
//     setCameraPreset("overview");
//     restart();
//   };

//   const toggleFullscreen = async () => {
//     if (!stageRef.current) return;
//     if (document.fullscreenElement) await document.exitFullscreen();
//     else if (stageRef.current.requestFullscreen) await stageRef.current.requestFullscreen();
//   };

//   return (
//     <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
//       <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
//         <div className="flex items-center gap-3">
//           <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700"><Waves size={21} /></div>
//           <div>
//             <h2 className="font-bold text-[#102B3D]">3D Early Warning & Dam Automation Simulation</h2>
//             <p className="mt-1 text-xs text-slate-500">Illustrative sequence: rainfall, sensor alert, SCADA communication and gate release</p>
//           </div>
//         </div>
//         <span className="flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
//           <span className="h-2 w-2 rounded-full bg-amber-500" /> SIMULATION MODE
//         </span>
//       </div>

//       <div ref={stageRef} className="relative aspect-video min-h-[300px] overflow-hidden bg-[#07163a] text-white max-sm:aspect-[4/5] sm:min-h-[380px]">
//         <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
//         <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-sky-400/50 bg-[#08183acc] px-3 py-2 backdrop-blur sm:left-5 sm:top-5 sm:px-4">
//           <strong className="block text-sm tracking-[0.18em] sm:text-base">CHETAS</strong>
//           <span className="hidden text-[10px] text-sky-100/80 sm:block">Control Systems · Water Management</span>
//         </div>
//         {status === "ALERT" && (
//           <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-orange-400 bg-red-950/90 px-3 py-2 text-center text-xs font-bold text-orange-200 sm:top-5 sm:text-sm">
//             <AlertTriangle size={16} /> Illustrative early warning event
//           </div>
//         )}
//         <div className="absolute right-3 top-3 w-[min(48%,245px)] rounded-xl border border-sky-400/50 bg-[#08183acc] p-3 backdrop-blur sm:right-5 sm:top-5 sm:w-[245px] sm:p-4">
//           <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-200">Simulated SCADA overview · demo values</p>
//           <div className="mt-2 flex items-end justify-between gap-2">
//             <div><p className="text-[10px] text-sky-200">Water level</p><p className="text-xl font-bold tabular-nums sm:text-2xl">{level.toFixed(2)} m</p></div>
//             <span className={`rounded px-2 py-1 text-[9px] font-bold sm:text-[10px] ${status === "ALERT" ? "bg-red-700" : status === "RISING" ? "bg-amber-700" : status === "RELEASING" ? "bg-blue-700" : "bg-emerald-700"}`}>{status}</span>
//           </div>
//           <div className="mt-2 flex justify-between gap-2 text-[9px] text-sky-100 sm:text-[10px]">
//             <span>Inflow {inflow} m³/s</span><span>Outflow {outflow} m³/s</span>
//           </div>
//           <div className="mt-1.5 flex justify-between text-[9px] text-sky-100/80 sm:text-[10px]">
//             <span>Gate position</span>
//             <strong>{Math.round((gateMode === "AUTO"
//               ? (peakWaterLevel(rainfallIntensity) >= 684 ? automaticGateOpening(time) : 0)
//               : manualGate / 100) * 100)}%</strong>
//           </div>
//           <div className="mt-3 grid gap-1 text-[9px] text-sky-100 sm:text-[10px]">
//             {(["Gram Panchayat", "Municipal", "Government authorities"] as const).map((name, index) => (
//               <span key={name} className={completedRecipients[index] ? "text-emerald-300" : "text-sky-100/70"}>
//                 {completedRecipients[index] ? "✓" : "○"} {name}
//               </span>
//             ))}
//           </div>
//         </div>
//         <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 sm:bottom-5 sm:left-5 sm:right-auto sm:gap-2">
//           {["1 · Rain & rising water", "2 · Sensor alert", "3 · SCADA & gate release"].map((step, index) => {
//             const active = (index === 0 && time >= 3.5 && time < 12) || (index === 1 && time >= 12 && time < 21) || (index === 2 && time >= 21);
//             const done = (index === 0 && time >= 12) || (index === 1 && time >= 21);
//             return <span key={step} className={`rounded-full border px-2 py-1 text-[9px] sm:px-3 sm:text-[10px] ${active ? "border-sky-300 bg-blue-700 text-white" : done ? "border-blue-400 bg-blue-950 text-white" : "border-blue-400/40 bg-[#08183acc] text-blue-100/70"}`}>{step}</span>;
//           })}
//         </div>
//         {time >= 29.5 && <div className="absolute bottom-3 right-3 rounded-lg border border-emerald-400/70 bg-emerald-950/90 px-3 py-2 text-xs text-emerald-100 sm:bottom-5 sm:right-5"><CheckCircle2 className="mr-1 inline" size={14} /> Simulation sequence completed</div>}
//         {webglError && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center text-sm text-red-100">3D graphics (WebGL) is unavailable in this browser. Try an up-to-date Chrome, Edge, Firefox or Safari browser.</div>}
//       </div>

//       <div className="grid gap-4 border-t border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 sm:p-5">
//         <div className="rounded-lg border border-slate-200 bg-white p-4">
//           <div className="flex items-center justify-between gap-3">
//             <label htmlFor="rainfall-intensity" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
//               <CloudRain size={17} className="text-sky-600" /> Rainfall intensity
//             </label>
//             <span className="text-sm font-bold tabular-nums text-sky-700">{rainfallIntensity}%</span>
//           </div>
//           <input
//             id="rainfall-intensity"
//             type="range"
//             min="0"
//             max="100"
//             step="5"
//             value={rainfallIntensity}
//             onChange={(event) => setRainfallIntensity(Number(event.target.value))}
//             className="mt-3 w-full accent-sky-600"
//           />
//           <div className="mt-2 flex justify-between text-[11px] text-slate-400">
//             <span>Low rainfall</span><span>High rainfall</span>
//           </div>
//           <p className="mt-2 text-xs leading-5 text-slate-500">Changes simulated rainfall, inflow and reservoir rise. It does not represent a forecast.</p>
//           <div className="mt-3 flex flex-wrap gap-2">
//             {[25, 50, 70, 100].map((value) => (
//               <button key={value} type="button" onClick={() => setRainfallIntensity(value)} className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${rainfallIntensity === value ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
//                 {value === 25 ? "Light" : value === 50 ? "Moderate" : value === 70 ? "Heavy" : "Extreme"} · {value}%
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="rounded-lg border border-slate-200 bg-white p-4">
//           <div className="flex items-center justify-between gap-3">
//             <label htmlFor="gate-mode" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
//               <Settings2 size={17} className="text-sky-600" /> Gate operation
//             </label>
//             <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800">SIMULATED</span>
//           </div>
//           <select id="gate-mode" value={gateMode} onChange={(event) => setGateMode(event.target.value as "AUTO" | "MANUAL")} className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
//             <option value="AUTO">Automatic sequence</option>
//             <option value="MANUAL">Manual demonstration control</option>
//           </select>
//           {gateMode === "MANUAL" ? (
//             <>
//               <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
//                 <label htmlFor="manual-gate">Illustrative gate opening</label>
//                 <strong className="tabular-nums text-sky-700">{manualGate}%</strong>
//               </div>
//               <input id="manual-gate" type="range" min="0" max="100" step="5" value={manualGate} onChange={(event) => setManualGate(Number(event.target.value))} className="mt-2 w-full accent-sky-600" />
//               <p className="mt-2 text-xs leading-5 text-slate-500">This slider moves the model gates only. It cannot operate physical equipment.</p>
//             </>
//           ) : (
//             <p className="mt-3 text-xs leading-5 text-slate-500">The demonstration opens the model gates during the release phase when the illustrative alert sequence is reached.</p>
//           )}
//         </div>

//         <div className="rounded-lg border border-slate-200 bg-white p-4 sm:col-span-2">
//           <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Camera size={17} className="text-sky-600" /> Camera viewpoints</div>
//           <div className="mt-3 flex flex-wrap gap-2">
//             {([{ id: "overview", label: "Full overview" }, { id: "reservoir", label: "Reservoir view" }, { id: "gates", label: "Spillway & gates" }] as const).map((view) => (
//               <button key={view.id} type="button" onClick={() => setCameraPreset(view.id)} aria-pressed={cameraPreset === view.id} className={`rounded-md border px-3 py-2 text-xs font-semibold transition ${cameraPreset === view.id ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
//                 {view.label}
//               </button>
//             ))}
//             <span className="self-center text-xs text-slate-400">Move pointer over the 3D scene to look around.</span>
//           </div>
//         </div>
//       </div>

//       <div className="border-t border-slate-200 px-4 py-4 sm:px-5">
//         <p className="min-h-12 text-sm leading-6 text-slate-700" aria-live="polite">{caption}</p>
//         <div className="mt-3 flex flex-wrap items-center gap-2">
//           <button type="button" onClick={togglePlayback} className="inline-flex items-center gap-2 rounded-lg bg-[#007EBA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006B9C]">{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause" : time >= DURATION ? "Replay" : "Play"}</button>
//           <button type="button" onClick={restart} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RotateCcw size={15} /> Restart</button>
//           <button type="button" onClick={resetScenario} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Reset scenario</button>
//           <input aria-label="Animation timeline" type="range" min="0" max={DURATION} step="0.1" value={time} onChange={(event) => { const next = Number(event.target.value); controlsRef.current.seek = next; setTime(next); }} className="min-w-[140px] flex-1 accent-sky-600" />
//           <span className="min-w-12 text-right text-xs tabular-nums text-slate-500">0:{String(Math.floor(time)).padStart(2, "0")}</span>
//           <label className="flex items-center gap-1.5 text-xs text-slate-600">Speed
//             <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
//               <option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option>
//             </select>
//           </label>
//           <label className="flex items-center gap-1.5 text-xs text-slate-600">Quality
//             <select value={quality} onChange={(event) => setQuality(event.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
//               <option value="auto">Auto</option><option value="1920">Full HD</option><option value="3840">4K</option>
//             </select>
//           </label>
//           <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={loop} onChange={(event) => setLoop(event.target.checked)} /> Loop</label>
//           <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Maximize2 size={14} /> Fullscreen</button>
//         </div>
//       </div>
//       <div className="border-t border-amber-100 bg-amber-50/70 px-4 py-3 sm:px-5">
//         <p className="text-xs leading-5 text-amber-900"><strong>Demonstration only:</strong> All values, rainfall scenarios, alert references, communications and gate movements are simulated. The controls affect only this 3D model. Nothing here is connected to dam telemetry, PLC or SCADA, represents approved operating limits, or may be used to assess dam safety or operate real equipment.</p>
//       </div>
//     </section>
//   );
// }


import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import * as THREE from "three";
import {
  Activity,
  AlertTriangle,
  Bell,
  Box,
  Camera,
  CheckCircle2,
  CloudRain,
  Map as MapIcon,
  Maximize2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Users,
  Waves,
} from "lucide-react";

/* ====================================================================== */
/* Constants, types and helpers                                           */
/* ====================================================================== */

const DT = 0.1; // simulation step (sim-seconds)
const DURATION = 48; // 1 sim-second = 15 simulated minutes -> 12 hours
const QUAKE_T = 22;
const K_LEVEL = 0.00078; // metres of level change per (m3/s x sim-second)
const MIN_POOL = 678;
const LEVEL_TRIGGERS = [682, 683, 684, 685];

const ALERTS = [
  { name: "Normal", color: "#2ee6a6", action: "Routine monitoring" },
  { name: "Watch", color: "#3fc8ff", action: "Telemetry rate raised, duty engineer notified" },
  { name: "Warning", color: "#ffb020", action: "Pre-release started, local authorities notified" },
  { name: "Alert", color: "#ff7a2e", action: "Sirens on, gates hold the reservoir level" },
  { name: "Emergency", color: "#ff3b3b", action: "Full release, evacuation ordered" },
] as const;

const VILLAGES = [
  { id: "V1", name: "Rampur Gram Panchayat", short: "Rampur", authority: "Gram Panchayat", km: 3, pop: 3800, att: 1.0, lag: 0.5 },
  { id: "V2", name: "Sagarpur Municipal Ward", short: "Sagarpur", authority: "Municipal", km: 7, pop: 12500, att: 0.8, lag: 1.2 },
  { id: "V3", name: "Taluka Headquarters", short: "Taluka HQ", authority: "Government authorities", km: 12, pop: 21000, att: 0.55, lag: 2.0 },
] as const;

const RULES = [
  { id: "R1", when: "Level ≥ 682.0 m, rain ≥ 35 mm/h or PGA ≥ 0.03 g", then: "Raise telemetry rate and notify the duty engineer" },
  { id: "R2", when: "Level ≥ 683.0 m, rain ≥ 60 mm/h, PGA ≥ 0.10 g or risk ≥ 45", then: "Pre-release gates and notify local authorities" },
  { id: "R3", when: "Level ≥ 684.0 m, PGA ≥ 0.25 g or risk ≥ 65", then: "Sound sirens and hold the level with gate control" },
  { id: "R4", when: "Level ≥ 685.0 m or risk ≥ 85", then: "Open gates fully and order evacuation" },
  { id: "R5", when: "Earthquake with PGA ≥ 0.10 g", then: "Draw the reservoir down to 679.5 m, start inspection" },
  { id: "R6", when: "Primary SCADA link lost", then: "Fail over to the satellite backup" },
] as const;

type GateMode = "AUTO" | "MANUAL";
type ViewMode = "twin" | "map";
type CameraPreset = "overview" | "reservoir" | "gates";
type LogKind = "info" | "watch" | "warn" | "alert" | "action" | "ok";

interface Params {
  rain: number; // 0-100 %
  quake: number; // 0 = off, else magnitude
  startLevel: number;
  gateMode: GateMode;
  manualGate: number; // 0-100 %
  commsOk: boolean;
  gateFault: boolean;
}

interface Frame {
  t: number;
  level: number;
  qin: number;
  qout: number;
  gate: number;
  target: number;
  rainMm: number;
  cumRain: number;
  pga: number; // instantaneous shaking (g)
  wave: number;
  piezo: number;
  seepage: number;
  tilt: number;
  risk: number;
  alert: number;
  comm: number[];
  notified: boolean[];
  depth: number[];
  evac: number[];
  popRisk: number;
  sirens: boolean;
}

interface LogEvent {
  t: number;
  kind: LogKind;
  text: string;
}

interface Sim {
  params: Params;
  frames: Frame[];
  events: LogEvent[];
  rules: (number | null)[];
  peakPga: number;
  summary: {
    peakLevel: number;
    tPeak: number;
    peakOutflow: number;
    maxAlert: number;
    firstWarning: number | null;
    maxPopRisk: number;
    maxDepth: number;
    evacuatedPct: number;
  };
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const gauss = (t: number, c: number, s: number) => Math.exp(-Math.pow((t - c) / s, 2));
const clock = (t: number) => {
  const m = Math.round(t * 15);
  return `T+${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

const DEFAULT_PARAMS: Params = {
  rain: 95,
  quake: 0,
  startLevel: 680,
  gateMode: "AUTO",
  manualGate: 0,
  commsOk: true,
  gateFault: false,
};

const PRESETS: Array<{ id: string; label: string; desc: string; p: Params }> = [
  { id: "monsoon", label: "Monsoon flood", desc: "Heavy rain, automatic gates", p: DEFAULT_PARAMS },
  { id: "quake", label: "M6.2 earthquake", desc: "Seismic event, dry weather", p: { ...DEFAULT_PARAMS, rain: 0, quake: 6.2 } },
  { id: "compound", label: "Rain and M5.8 quake", desc: "Compound hazard", p: { ...DEFAULT_PARAMS, rain: 70, quake: 5.8, startLevel: 680.5 } },
  { id: "stress", label: "Stress test", desc: "Extreme rain, gate and link faults", p: { ...DEFAULT_PARAMS, rain: 100, startLevel: 681, commsOk: false, gateFault: true } },
];

/* ====================================================================== */
/* Simulation engine (deterministic, closed-loop)                         */
/* ====================================================================== */

function simulate(p: Params): Sim {
  const n = Math.round(DURATION / DT) + 1;
  const peakPga = p.quake > 0 ? 0.02 * Math.pow(10, (p.quake - 4) * 0.45) : 0;
  const frames: Frame[] = [];
  const events: LogEvent[] = [];
  const rules: (number | null)[] = [null, null, null, null, null, null];
  const log = (t: number, kind: LogKind, text: string) => {
    events.push({ t, kind, text });
  };
  const cap = p.gateFault ? 0.75 : 1;
  const rawQout: number[] = [];

  let level = p.startLevel;
  let gate = 0;
  let alert = 0;
  let lastChange = 0;
  let cumRain = 0;
  let gateOpened = false;
  let gateFull = false;
  let gateClosed = false;
  let quakeLogged = false;
  let piezoLogged = false;
  let seepLogged = false;
  let interlockLogged = false;
  let peakLevel = level;
  let tPeak = 0;
  let peakOutflow = 0;

  log(
    0,
    "info",
    `Scenario started: rainfall ${p.rain}%, ${p.quake > 0 ? `M${p.quake.toFixed(1)} earthquake` : "no earthquake"}, reservoir at ${p.startLevel.toFixed(1)} m`,
  );
  if (p.gateFault) log(0.4, "warn", "Gate 3 actuator fault: release capacity limited to 75%");
  if (!p.commsOk) log(0.4, "warn", "Primary SCADA link down: satellite backup on standby");

  for (let i = 0; i < n; i += 1) {
    const t = i * DT;
    const rainMm = (p.rain / 100) * 95 * gauss(t, 10, 4.5);
    cumRain += rainMm * 0.25 * DT;
    const qin = 300 + (p.rain / 100) * 1000 * gauss(t, 14, 5.5);

    const dq = t - QUAKE_T;
    const quakeNow = peakPga > 0 && dq >= 0;
    const env = quakeNow ? (1 - Math.exp(-dq / 0.15)) * Math.exp(-dq / 2.0) : 0;
    const slow = quakeNow ? (1 - Math.exp(-dq / 0.8)) * Math.exp(-dq / 14) : 0;
    const shake = peakPga * env;
    const noise = Math.sin(i * 12.9898) * 43758.5453;
    const wave = shake * ((noise - Math.floor(noise)) * 2 - 1);

    const pulse = peakPga * 400 * slow;
    const piezo = 210 + (level - 680) * 7 + pulse;
    const seepage =
      14 + Math.max(0, level - 681) * 3.2 + (quakeNow && peakPga > 0.1 ? (peakPga - 0.1) * 220 * (1 - Math.exp(-dq / 3)) : 0);
    const tilt = 0.4 + 18 * peakPga * (quakeNow ? 1 - Math.exp(-dq / 1.5) : 0) + Math.max(0, level - 680) * 0.35;
    const levelFrac = clamp((level - 680) / 6.5);
    const risk = Math.round(
      100 *
        (0.35 * levelFrac +
          0.25 * clamp((quakeNow ? peakPga : 0) / 0.4) +
          0.2 * clamp((seepage - 14) / 80) +
          0.2 * clamp((piezo - 210) / 150)),
    );

    /* rule engine: candidate alert level */
    let cand = 0;
    let reason = "";
    const up = (v: number, why: string) => {
      if (v > cand) {
        cand = v;
        reason = why;
      }
    };
    LEVEL_TRIGGERS.forEach((trigger, k) => {
      if (level >= trigger) up(k + 1, `reservoir at ${level.toFixed(2)} m`);
    });
    if (rainMm >= 35) up(1, `rainfall ${rainMm.toFixed(0)} mm/h`);
    if (rainMm >= 60) up(2, `rainfall nowcast ${rainMm.toFixed(0)} mm/h`);
    if (quakeNow) {
      if (peakPga >= 0.03) up(1, `seismic event M${p.quake.toFixed(1)}`);
      if (peakPga >= 0.1) up(2, `seismic event M${p.quake.toFixed(1)} (PGA ${peakPga.toFixed(2)} g)`);
      if (peakPga >= 0.25) up(3, `strong shaking M${p.quake.toFixed(1)} (PGA ${peakPga.toFixed(2)} g)`);
    }
    if (risk >= 45) up(2, `structural risk index ${risk}`);
    if (risk >= 65) up(3, `structural risk index ${risk}`);
    if (risk >= 85) up(4, `structural risk index ${risk}`);

    if (cand > alert) {
      alert = cand;
      lastChange = t;
      log(t, alert >= 3 ? "alert" : alert === 2 ? "warn" : "watch", `Alert level raised to ${ALERTS[alert].name}: ${reason}`);
    } else if (cand < alert && t - lastChange >= 3) {
      alert -= 1;
      lastChange = t;
      log(t, "ok", `Alert level lowered to ${ALERTS[alert].name}`);
    }
    for (let k = 0; k < 4; k += 1) {
      if (rules[k] === null && alert >= k + 1) rules[k] = t;
    }

    /* gate control */
    let target = 0;
    if (p.gateMode === "MANUAL") {
      target = p.manualGate / 100;
    } else {
      // flood-driven release only: a seismic-only alert must not drain the reservoir
      const floodDriven = level >= 681 || rainMm >= 30;
      if (alert >= 2 && floodDriven) target = Math.max(clamp((level - 683) / 2.6), 0.1);
      if (alert >= 3 && floodDriven) target = Math.max(target, 0.3);
      if (alert >= 4) target = 1;
      // after the storm, return the reservoir to its normal pool
      if (p.rain > 0 && t > 12 && rainMm < 5 && level > 680.5) target = Math.max(target, 0.1);
      if (quakeNow && peakPga >= 0.1 && dq >= 1.5 && level > 679.5) {
        target = Math.max(target, 0.35);
        if (rules[4] === null) {
          rules[4] = t;
          log(t, "action", "Seismic protocol: drawdown to 679.5 m started, structural inspection requested");
        }
      }
    }
    if (level <= MIN_POOL) {
      if (gate > 0.02 && !interlockLogged) {
        interlockLogged = true;
        log(t, "info", `Minimum pool interlock (${MIN_POOL.toFixed(1)} m): gates closing`);
      }
      target = 0;
    }
    gate += clamp(target - gate, -0.25 * DT, 0.25 * DT);

    if (gate > 0.02 && !gateOpened) {
      gateOpened = true;
      log(t, "action", `Gates opening (${p.gateMode === "AUTO" ? "automatic control" : "operator command"}), target ${(target * 100).toFixed(0)}%`);
    }
    if (gate >= 0.98 && !gateFull) {
      gateFull = true;
      log(t, "action", "Gates fully open");
    }
    if (gateOpened && gate < 0.02 && !gateClosed && t > 1) {
      gateClosed = true;
      log(t, "ok", "Gates closed");
    }

    const head = 0.7 + 0.3 * clamp((level - 676) / 10);
    const qout = 300 + gate * 1000 * cap * head;
    rawQout.push(qout);
    peakOutflow = Math.max(peakOutflow, qout);

    if (quakeNow && !quakeLogged) {
      quakeLogged = true;
      log(QUAKE_T, peakPga >= 0.1 ? "alert" : "watch", `Seismograph SG-1 triggered: peak ground acceleration ${peakPga.toFixed(3)} g`);
    }
    if (pulse > 40 && !piezoLogged) {
      piezoLogged = true;
      log(t, "warn", `Piezometer PZ-1: pore-pressure spike of ${pulse.toFixed(0)} kPa`);
    }
    if (seepage > 40 && !seepLogged) {
      seepLogged = true;
      log(t, "warn", `Seepage monitor SP-1: ${seepage.toFixed(0)} L/s, above 40 L/s limit`);
    }

    frames.push({
      t,
      level,
      qin,
      qout,
      gate,
      target,
      rainMm,
      cumRain,
      pga: shake,
      wave,
      piezo,
      seepage,
      tilt,
      risk,
      alert,
      comm: [0, 0, 0, 0],
      notified: [false, false, false],
      depth: [0, 0, 0],
      evac: [0, 0, 0],
      popRisk: 0,
      sirens: false,
    });

    if (level > peakLevel) {
      peakLevel = level;
      tPeak = t;
    }
    level = clamp(level + (qin - qout) * K_LEVEL * DT, 670, 690);
  }

  /* pass 2: communications, downstream flooding, evacuation */
  const tC = rules[1];
  const d0 = p.commsOk ? 1.6 : 3.6;
  const tN = tC === null ? [Infinity, Infinity, Infinity] : [tC + d0 + 2, tC + d0 + 2.4, tC + d0 + 2.8];

  if (rules[0] !== null && !p.commsOk) {
    rules[5] = rules[0];
    log(rules[0], "warn", "Primary SCADA link unavailable: failing over to satellite backup");
  }
  if (tC !== null) {
    log(tC, "info", `Sensor alarm sent to control room via ${p.commsOk ? "primary fibre link" : "satellite backup"}`);
    log(tC + d0, "action", "Control room (PLC/SCADA) received the alarm; automated notifications started");
    VILLAGES.forEach((v, k) => log(tN[k], "ok", `${v.authority} notified (${v.short})`));
  }
  if (rules[2] !== null) log(rules[2], "alert", "Sirens activated in downstream communities; District Collector briefed");
  if (rules[3] !== null) log(rules[3], "alert", "Evacuation order issued; response teams dispatched");

  const ev = [0, 0, 0];
  const reported = [false, false, false];
  const done = [false, false, false];
  let maxPopRisk = 0;
  let maxDepth = 0;
  let maxAlert = 0;

  frames.forEach((f, i) => {
    const t = f.t;
    f.comm = tC === null ? [0, 0, 0, 0] : [seg(t, tC, tC + d0), seg(t, tC + d0, tC + d0 + 2), seg(t, tC + d0 + 0.4, tC + d0 + 2.4), seg(t, tC + d0 + 0.8, tC + d0 + 2.8)];
    f.notified = tN.map((x) => t >= x);
    f.sirens = f.alert >= 3;
    const rate = rules[3] !== null && t >= (rules[3] ?? Infinity) ? 0.12 : 0.06;
    let pop = 0;
    VILLAGES.forEach((v, k) => {
      const q = rawQout[Math.max(0, i - Math.round(v.lag / DT))];
      const depth = Math.max(0, ((q - 700) / 600) * v.att);
      f.depth[k] = depth;
      if (t >= tN[k] + 1) ev[k] = Math.min(1, ev[k] + rate * DT);
      f.evac[k] = ev[k];
      if (depth > 0.3) pop += v.pop * (1 - ev[k]) * clamp((depth - 0.3) / 1.2);
      maxDepth = Math.max(maxDepth, depth);
      if (depth > 0.3 && !reported[k]) {
        reported[k] = true;
        log(t, "alert", `Floodwater reaches ${v.short}: ${depth.toFixed(1)} m`);
      }
      if (ev[k] >= 1 && !done[k]) {
        done[k] = true;
        log(t, "ok", `Evacuation complete at ${v.short}`);
      }
    });
    f.popRisk = Math.round(pop);
    maxPopRisk = Math.max(maxPopRisk, f.popRisk);
    maxAlert = Math.max(maxAlert, f.alert);
  });

  log(tPeak, "info", `Peak reservoir level ${peakLevel.toFixed(2)} m`);
  events.sort((a, b) => a.t - b.t);

  const totalPop = VILLAGES.reduce((s, v) => s + v.pop, 0);
  const last = frames[frames.length - 1];
  const evacuated = VILLAGES.reduce((s, v, k) => s + v.pop * last.evac[k], 0);

  return {
    params: p,
    frames,
    events,
    rules,
    peakPga,
    summary: {
      peakLevel,
      tPeak,
      peakOutflow,
      maxAlert,
      firstWarning: rules[1],
      maxPopRisk,
      maxDepth,
      evacuatedPct: Math.round((evacuated / totalPop) * 100),
    },
  };
}

/* ====================================================================== */
/* Small UI primitives                                                    */
/* ====================================================================== */

const LOG_COLOR: Record<LogKind, string> = {
  info: "#8ea6c8",
  watch: "#3fc8ff",
  warn: "#ffb020",
  alert: "#ff6a4d",
  action: "#b794ff",
  ok: "#2ee6a6",
};

function Panel({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-[#17305a] bg-[#0a1630] ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-[#17305a] px-3.5 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          {icon}
          {title}
        </h3>
        {right}
      </div>
      <div className="p-3.5">{children}</div>
    </div>
  );
}

function SliderField({
  id,
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
  hint,
  icon,
}: {
  id: string;
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-slate-200">
          {icon}
          {label}
        </label>
        <span className="font-mono text-sm font-semibold tabular-nums text-sky-300">{display}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-sky-400"
      />
      {hint && <p className="mt-1 text-xs leading-5 text-slate-400">{hint}</p>}
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onChange,
  tone = "amber",
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  tone?: "amber" | "red";
}) {
  const on = tone === "red" ? "bg-red-500" : "bg-amber-500";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg border border-[#17305a] bg-[#071126] p-2.5 text-left transition hover:border-sky-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
    >
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? on : "bg-slate-600"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        <span className="block text-xs leading-5 text-slate-400">{hint}</span>
      </span>
    </button>
  );
}

/* ====================================================================== */
/* SVG time-series chart                                                  */
/* ====================================================================== */

interface ChartSeries {
  name: string;
  color: string;
  values: number[];
  kind?: "line" | "area" | "bars";
}
interface Threshold {
  value: number;
  label: string;
  color: string;
}

function TimeChart({
  title,
  unit,
  series,
  thresholds = [],
  yMin,
  yMax,
  time,
  decimals = 1,
}: {
  title: string;
  unit: string;
  series: ChartSeries[];
  thresholds?: Threshold[];
  yMin: number;
  yMax: number;
  time: number;
  decimals?: number;
}) {
  const W = 640;
  const H = 190;
  const L = 46;
  const R = 14;
  const T = 10;
  const B = 24;
  const x = (t: number) => L + (t / DURATION) * (W - L - R);
  const y = (v: number) => T + (1 - (clamp(v, yMin, yMax) - yMin) / (yMax - yMin)) * (H - T - B);
  const idx = Math.min(series[0].values.length - 1, Math.round(time / DT));
  const gid = `g-${title.replace(/\W/g, "")}`;
  const linePath = (values: number[]) =>
    values
      .filter((_, i) => i % 2 === 0)
      .map((v, i) => `${i ? "L" : "M"}${x(i * 2 * DT).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");

  return (
    <div className="rounded-lg border border-[#17305a] bg-[#071126] p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h4 className="text-sm font-semibold text-slate-100">
          {title} <span className="font-normal text-slate-400">({unit})</span>
        </h4>
        <div className="flex flex-wrap gap-x-3 text-xs">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-slate-300">
              <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
              <b className="font-mono tabular-nums text-slate-100">{s.values[idx].toFixed(decimals)}</b>
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`${title} over time`}>
        <defs>
          {series.map((s, k) => (
            <linearGradient key={k} id={`${gid}-${k}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.45" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {[0, 1, 2, 3, 4].map((k) => {
          const v = yMin + ((yMax - yMin) * k) / 4;
          return (
            <g key={k}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#17305a" strokeWidth="1" />
              <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="#8ea6c8">
                {v.toFixed(yMax - yMin < 10 ? 1 : 0)}
              </text>
            </g>
          );
        })}
        {[0, 12, 24, 36, 48].map((tt) => (
          <text key={tt} x={x(tt)} y={H - 6} textAnchor="middle" fontSize="10" fill="#8ea6c8">
            {clock(tt)}
          </text>
        ))}
        {thresholds
          .filter((th) => th.value >= yMin && th.value <= yMax)
          .map((th) => (
            <g key={th.label}>
              <line x1={L} x2={W - R} y1={y(th.value)} y2={y(th.value)} stroke={th.color} strokeWidth="1" strokeDasharray="5 4" opacity="0.8" />
              <text x={W - R - 2} y={y(th.value) - 3} textAnchor="end" fontSize="9" fill={th.color}>
                {th.label}
              </text>
            </g>
          ))}
        {series.map((s, k) => {
          if (s.kind === "bars") {
            const step = 4;
            const bw = Math.max(1, ((W - L - R) / (s.values.length / step)) * 0.8);
            return (
              <g key={s.name}>
                {s.values.map((v, i) =>
                  i % step === 0 ? (
                    <rect key={i} x={x(i * DT) - bw / 2} y={y(v)} width={bw} height={Math.max(0, y(yMin) - y(v))} fill={s.color} opacity="0.75" />
                  ) : null,
                )}
              </g>
            );
          }
          const d = linePath(s.values);
          return (
            <g key={s.name}>
              {s.kind === "area" && <path d={`${d} L${x(DURATION)} ${y(yMin)} L${x(0)} ${y(yMin)}Z`} fill={`url(#${gid}-${k})`} />}
              <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
            </g>
          );
        })}
        <line x1={x(time)} x2={x(time)} y1={T} y2={H - B} stroke="#fff" strokeOpacity="0.55" strokeDasharray="3 3" />
        {series.map((s) => (
          <circle key={s.name} cx={x(time)} cy={y(s.values[idx])} r="3.5" fill={s.color} stroke="#071126" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

/* ====================================================================== */
/* Tactical map (SVG geospatial view)                                     */
/* ====================================================================== */

interface MapLayers {
  inundation: boolean;
  sensors: boolean;
  evac: boolean;
  comms: boolean;
}

type AssetStatus = "ok" | "watch" | "warn" | "alarm";
interface Asset {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "sensor" | "control" | "village";
  reading: string;
  status: AssetStatus;
  detail: string;
}

const STATUS_COLOR: Record<AssetStatus, string> = { ok: "#2ee6a6", watch: "#3fc8ff", warn: "#ffb020", alarm: "#ff4a3d" };
const RIVER: Array<[number, number]> = [
  [430, 300],
  [520, 318],
  [592, 340],
  [680, 318],
  [760, 300],
  [850, 336],
  [940, 362],
];
const VILLAGE_POS: Array<[number, number]> = [
  [592, 378],
  [704, 276],
  [862, 380],
];
const ASSEMBLY_POS: Array<[number, number]> = [
  [560, 460],
  [740, 190],
  [910, 450],
];
const CONTROL_POS: [number, number] = [470, 232];
const EPICENTRE: [number, number] = [250, 530];

function TacticalMap({
  frame,
  sim,
  time,
  layers,
  selected,
  onSelect,
}: {
  frame: Frame;
  sim: Sim;
  time: number;
  layers: MapLayers;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([500, 300]);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const vw = 1000 / zoom;
  const vh = 600 / zoom;
  const vx = clamp(center[0] - vw / 2, 0, 1000 - vw);
  const vy = clamp(center[1] - vh / 2, 0, 600 - vh);

  const quakeOn = sim.peakPga > 0;
  const dq = time - QUAKE_T;
  const alertColor = ALERTS[frame.alert].color;

  const assets: Asset[] = [
    {
      id: "LS-1",
      label: "Level sensor LS-1",
      x: 388,
      y: 300,
      kind: "sensor",
      reading: `${frame.level.toFixed(2)} m`,
      status: frame.alert >= 3 ? "alarm" : frame.alert === 2 ? "warn" : frame.alert === 1 ? "watch" : "ok",
      detail: "Reservoir water level (radar), 1 Hz telemetry",
    },
    {
      id: "RG-1",
      label: "Rain gauge RG-1",
      x: 210,
      y: 165,
      kind: "sensor",
      reading: `${frame.rainMm.toFixed(0)} mm/h`,
      status: frame.rainMm >= 60 ? "alarm" : frame.rainMm >= 35 ? "warn" : "ok",
      detail: `Catchment rainfall, ${frame.cumRain.toFixed(0)} mm accumulated`,
    },
    {
      id: "PZ-1",
      label: "Piezometer PZ-1",
      x: 425,
      y: 270,
      kind: "sensor",
      reading: `${frame.piezo.toFixed(0)} kPa`,
      status: frame.piezo > 320 ? "alarm" : frame.piezo > 260 ? "warn" : "ok",
      detail: "Pore pressure in the dam body",
    },
    {
      id: "SG-1",
      label: "Seismograph SG-1",
      x: 448,
      y: 330,
      kind: "sensor",
      reading: `${frame.pga.toFixed(3)} g`,
      status: frame.pga >= 0.1 ? "alarm" : frame.pga >= 0.03 ? "warn" : "ok",
      detail: "Ground acceleration at the dam abutment",
    },
    {
      id: "SP-1",
      label: "Seepage monitor SP-1",
      x: 440,
      y: 362,
      kind: "sensor",
      reading: `${frame.seepage.toFixed(0)} L/s`,
      status: frame.seepage > 60 ? "alarm" : frame.seepage > 40 ? "warn" : "ok",
      detail: "Combined drainage gallery seepage",
    },
    {
      id: "CR",
      label: "Control room (PLC and SCADA)",
      x: CONTROL_POS[0],
      y: CONTROL_POS[1],
      kind: "control",
      reading: ALERTS[frame.alert].name,
      status: frame.alert >= 3 ? "alarm" : frame.alert === 2 ? "warn" : frame.alert === 1 ? "watch" : "ok",
      detail: ALERTS[frame.alert].action,
    },
    ...VILLAGES.map((v, k): Asset => ({
      id: v.id,
      label: v.name,
      x: VILLAGE_POS[k][0],
      y: VILLAGE_POS[k][1],
      kind: "village",
      reading: `${frame.depth[k].toFixed(1)} m flood depth`,
      status: frame.depth[k] > 0.3 && frame.evac[k] < 1 ? "alarm" : frame.notified[k] ? "warn" : "ok",
      detail: `${v.km} km downstream, ${v.pop.toLocaleString("en-IN")} people, ${Math.round(frame.evac[k] * 100)}% evacuated`,
    })),
  ];
  const sel = assets.find((a) => a.id === selected) ?? null;

  const depthPerSeg = [
    Math.max(0, ((frame.qout - 700) / 600) * 1.2),
    frame.depth[0],
    frame.depth[0],
    frame.depth[1],
    frame.depth[1],
    frame.depth[2],
  ];

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current || !svgRef.current) return;
    const scale = vw / svgRef.current.clientWidth;
    const dx = (e.clientX - drag.current.x) * scale;
    const dy = (e.clientY - drag.current.y) * scale;
    drag.current = { x: e.clientX, y: e.clientY };
    setCenter(([cx, cy]) => [clamp(cx - dx, vw / 2, 1000 - vw / 2), clamp(cy - dy, vh / 2, 600 - vh / 2)]);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const zoomBtn = "flex h-8 w-8 items-center justify-center rounded-md border border-sky-400/40 bg-[#08183acc] text-base font-bold text-sky-100 hover:border-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300";

  return (
    <div className="absolute inset-0 bg-[#06152e]">
      <svg
        ref={svgRef}
        viewBox={`${vx} ${vy} ${vw} ${vh}`}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={(e) => {
          if (e.target === e.currentTarget) onSelect(null);
        }}
        role="img"
        aria-label="Tactical map of the dam, reservoir, downstream river and communities"
      >
        <defs>
          <pattern id="tm-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="#12305a" strokeWidth="1" />
          </pattern>
          <radialGradient id="tm-rain">
            <stop offset="0%" stopColor="#8fb8ff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#8fb8ff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1000" height="600" fill="#06152e" />
        <rect width="1000" height="600" fill="url(#tm-grid)" />
        {[0, 1, 2].map((k) => (
          <ellipse key={k} cx={250 + k * 20} cy={140 + k * 8} rx={180 - k * 45} ry={95 - k * 25} fill="none" stroke="#1a4b3c" strokeWidth="1.5" opacity="0.7" />
        ))}
        {[0, 1, 2].map((k) => (
          <ellipse key={k} cx={800 - k * 15} cy={470} rx={150 - k * 40} ry={70 - k * 18} fill="none" stroke="#1a4b3c" strokeWidth="1.5" opacity="0.7" />
        ))}

        {/* rain cells */}
        {frame.rainMm > 5 &&
          [0, 1, 2].map((k) => (
            <circle
              key={k}
              cx={170 + k * 90 + Math.sin(time * 0.4 + k) * 18}
              cy={120 + k * 28}
              r={80 + k * 14}
              fill="url(#tm-rain)"
              opacity={clamp(frame.rainMm / 70)}
            />
          ))}

        {/* reservoir */}
        <polygon
          points="430,238 330,206 220,232 120,190 60,262 108,340 56,420 190,452 304,404 430,364"
          fill="#1f8fe0"
          opacity={0.1 + 0.3 * clamp((frame.level - 679) / 7)}
          stroke="#5cc4ff"
          strokeDasharray="6 5"
          strokeWidth="1.5"
        />
        <polygon
          points="430,262 330,238 230,256 140,222 96,272 134,330 88,388 196,420 304,382 430,340"
          fill="#1f8fe0"
          opacity="0.6"
          stroke="#5cc4ff"
          strokeWidth="2"
        />
        <text x="190" y="330" fontSize="14" fill="#cfe9ff" opacity="0.85">
          Reservoir {frame.level.toFixed(2)} m
        </text>

        {/* river and inundation */}
        {RIVER.slice(0, -1).map((pt, i) => (
          <g key={i}>
            {layers.inundation && depthPerSeg[i] > 0.05 && (
              <line
                x1={pt[0]}
                y1={pt[1]}
                x2={RIVER[i + 1][0]}
                y2={RIVER[i + 1][1]}
                stroke={depthPerSeg[i] > 1 ? "#ff4a3d" : "#ffb020"}
                strokeOpacity="0.45"
                strokeWidth={10 + depthPerSeg[i] * 34}
                strokeLinecap="round"
              />
            )}
            <line x1={pt[0]} y1={pt[1]} x2={RIVER[i + 1][0]} y2={RIVER[i + 1][1]} stroke="#2a9be0" strokeWidth="7" strokeLinecap="round" />
          </g>
        ))}

        {/* dam */}
        <line x1="430" y1="246" x2="430" y2="354" stroke="#aab6cc" strokeWidth="14" strokeLinecap="butt" />
        {[0, 1, 2, 3].map((k) => (
          <rect
            key={k}
            x="423"
            y={262 + k * 24}
            width="14"
            height="14"
            fill={k === 2 && sim.params.gateFault ? "#ff4a3d" : frame.gate > 0.05 ? "#5cc4ff" : "#35507f"}
          />
        ))}
        <text x="442" y="250" fontSize="12" fill="#e5ecf7">
          Dam, gates {Math.round(frame.gate * 100)}%
        </text>

        {/* evacuation routes */}
        {layers.evac &&
          VILLAGE_POS.map((vp, k) => (
            <g key={k}>
              <line
                x1={vp[0]}
                y1={vp[1]}
                x2={ASSEMBLY_POS[k][0]}
                y2={ASSEMBLY_POS[k][1]}
                stroke="#2ee6a6"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                strokeDashoffset={-time * 24}
                opacity={frame.evac[k] > 0 && frame.evac[k] < 1 ? 0.95 : 0.35}
              />
              <rect x={ASSEMBLY_POS[k][0] - 9} y={ASSEMBLY_POS[k][1] - 9} width="18" height="18" rx="4" fill="#0f3d2e" stroke="#2ee6a6" strokeWidth="1.5" />
              <text x={ASSEMBLY_POS[k][0]} y={ASSEMBLY_POS[k][1] + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2ee6a6">
                A
              </text>
            </g>
          ))}

        {/* communications */}
        {layers.comms && (
          <g fill="none" strokeWidth="2" strokeLinecap="round">
            <line x1="388" y1="300" x2={CONTROL_POS[0]} y2={CONTROL_POS[1]} stroke="#3fc8ff" strokeOpacity="0.25" strokeDasharray="4 5" />
            <line x1="388" y1="300" x2={CONTROL_POS[0]} y2={CONTROL_POS[1]} stroke="#ffb020" pathLength={1} strokeDasharray={`${frame.comm[0]} 1`} />
            {VILLAGE_POS.map((vp, k) => (
              <g key={k}>
                <line x1={CONTROL_POS[0]} y1={CONTROL_POS[1]} x2={vp[0]} y2={vp[1]} stroke="#3fc8ff" strokeOpacity="0.2" strokeDasharray="4 5" />
                <line x1={CONTROL_POS[0]} y1={CONTROL_POS[1]} x2={vp[0]} y2={vp[1]} stroke="#4cc2ff" pathLength={1} strokeDasharray={`${frame.comm[k + 1]} 1`} />
              </g>
            ))}
          </g>
        )}

        {/* earthquake */}
        {quakeOn && (
          <g>
            <circle cx={EPICENTRE[0]} cy={EPICENTRE[1]} r="6" fill="#b794ff" />
            <text x={EPICENTRE[0] + 12} y={EPICENTRE[1] + 4} fontSize="12" fill="#d7c6ff">
              Epicentre M{sim.params.quake.toFixed(1)}
            </text>
            {dq > 0 &&
              dq < 7 &&
              [0, 1, 2].map((k) => {
                const d = dq - k * 0.9;
                return d > 0 ? <circle key={k} cx={EPICENTRE[0]} cy={EPICENTRE[1]} r={d * 85} fill="none" stroke="#b794ff" strokeWidth="2" opacity={clamp(1 - d / 6) * 0.8} /> : null;
              })}
          </g>
        )}

        {/* assets */}
        {assets
          .filter((a) => a.kind !== "sensor" || layers.sensors)
          .map((a) => {
            const color = STATUS_COLOR[a.status];
            const isSel = a.id === selected;
            const village = a.kind === "village";
            const idx = village ? VILLAGES.findIndex((v) => v.id === a.id) : -1;
            return (
              <g
                key={a.id}
                role="button"
                tabIndex={0}
                aria-label={`${a.label}: ${a.reading}`}
                className="cursor-pointer focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(a.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onSelect(a.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {isSel && <circle cx={a.x} cy={a.y} r="20" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />}
                {village && frame.sirens && (
                  <circle cx={a.x} cy={a.y} r={12 + ((time * 3) % 1) * 24} fill="none" stroke="#ff4a3d" strokeWidth="2" opacity={1 - ((time * 3) % 1)} />
                )}
                {a.kind === "control" ? (
                  <rect x={a.x - 11} y={a.y - 11} width="22" height="22" rx="4" fill="#0b1730" stroke={color} strokeWidth="2.5" />
                ) : village ? (
                  <rect x={a.x - 10} y={a.y - 10} width="20" height="20" rx="10" fill="#0b1730" stroke={color} strokeWidth="2.5" />
                ) : (
                  <circle cx={a.x} cy={a.y} r="8" fill={color} stroke="#06152e" strokeWidth="2" />
                )}
                {a.kind === "control" && (
                  <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
                    CR
                  </text>
                )}
                {village && (
                  <text x={a.x} y={a.y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
                    {a.id}
                  </text>
                )}
                <text x={a.x + (village ? 0 : 12)} y={a.y + (village ? 26 : 4)} textAnchor={village ? "middle" : "start"} fontSize="11" fill="#e5ecf7" paintOrder="stroke" stroke="#06152e" strokeWidth="3">
                  {village ? VILLAGES[idx].short : a.id}
                </text>
              </g>
            );
          })}
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 max-w-[260px] rounded-lg border border-sky-400/40 bg-[#08183acc] p-3 text-xs backdrop-blur">
        {sel ? (
          <>
            <div className="flex items-center gap-2 font-semibold text-slate-100">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLOR[sel.status] }} />
              {sel.label}
            </div>
            <p className="mt-1 font-mono text-sm text-sky-200">{sel.reading}</p>
            <p className="mt-1 leading-5 text-slate-300">{sel.detail}</p>
          </>
        ) : (
          <p className="leading-5 text-slate-300">Select a sensor, the control room or a community to see its live reading. Drag to pan.</p>
        )}
      </div>

      <div className="absolute right-3 top-14 flex flex-col gap-1.5 sm:top-3 sm:right-[270px]">
        <button type="button" className={zoomBtn} aria-label="Zoom in" onClick={() => setZoom((z) => clamp(z + 0.5, 1, 3))}>
          +
        </button>
        <button type="button" className={zoomBtn} aria-label="Zoom out" onClick={() => setZoom((z) => clamp(z - 0.5, 1, 3))}>
          −
        </button>
        <button
          type="button"
          className={zoomBtn}
          aria-label="Reset view"
          onClick={() => {
            setZoom(1);
            setCenter([500, 300]);
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div
        className="pointer-events-none absolute bottom-14 left-3 rounded-md border px-2.5 py-1 text-xs font-semibold sm:bottom-16"
        style={{ borderColor: alertColor, color: alertColor, background: "#08183acc" }}
      >
        {ALERTS[frame.alert].name}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* Main component                                                         */
/* ====================================================================== */

function createStreakTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);
  context.fillStyle = "#2a8fe0";
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i += 1) {
    context.strokeStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.22})`;
    context.lineWidth = 1 + Math.random() * 2;
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const length = 10 + Math.random() * 40;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + length, y);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export default function EarlyWarningSimulation() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [params, setParams] = useState<Params>(DEFAULT_PARAMS);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("auto");
  const [loop, setLoop] = useState(true);
  const [time, setTime] = useState(0);
  const [view, setView] = useState<ViewMode>("twin");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("overview");
  const [layers, setLayers] = useState<MapLayers>({ inundation: true, sensors: true, evac: true, comms: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"hydro" | "structure" | "downstream" | "sensors">("hydro");
  const [webglError, setWebglError] = useState(false);

  const patch = (next: Partial<Params>) => setParams((prev) => ({ ...prev, ...next }));
  const sim = useMemo(() => simulate(params), [params]);
  const simRef = useRef(sim);
  useEffect(() => {
    simRef.current = sim;
  }, [sim]);

  const controlsRef = useRef({
    playing: true,
    speed: 1,
    loop: true,
    quality: "auto",
    seek: null as number | null,
    cameraPreset: "overview" as CameraPreset,
    view: "twin" as ViewMode,
  });
  useEffect(() => {
    const c = controlsRef.current;
    c.playing = playing;
    c.speed = speed;
    c.loop = loop;
    c.quality = quality;
    c.cameraPreset = cameraPreset;
    c.view = view;
  }, [playing, speed, loop, quality, cameraPreset, view]);

  const frame = sim.frames[Math.min(sim.frames.length - 1, Math.round(time / DT))];

  /* ---------------------------------------------------------------- */
  /* Three.js digital twin                                            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 200);
    const dayColor = new THREE.Color(0x1d4682);
    const stormColor = new THREE.Color(0x0a1426);
    const backgroundColor = new THREE.Color();
    scene.fog = new THREE.Fog(0x1d4682, 50, 110);

    const hemisphere = new THREE.HemisphereLight(0xbcd8ff, 0x12305e, 0.95);
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(12, 22, 16);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const shadowCamera = sun.shadow.camera as THREE.OrthographicCamera;
    shadowCamera.left = -30;
    shadowCamera.right = 30;
    shadowCamera.top = 30;
    shadowCamera.bottom = -30;
    shadowCamera.far = 90;
    const alertLight = new THREE.PointLight(0xff3d2e, 0, 22);
    alertLight.position.set(-5, 8, 4);
    scene.add(hemisphere, sun, alertLight);

    const material = (color: THREE.ColorRepresentation, options: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, ...options });
    const addBox = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      color: THREE.ColorRepresentation,
      options: THREE.MeshStandardMaterialParameters = {},
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material(color, options));
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    const addLabel = (text: string, width: number, x: number, y: number, z: number) => {
      const labelCanvas = document.createElement("canvas");
      labelCanvas.width = 640;
      labelCanvas.height = 112;
      const context = labelCanvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "rgba(5,20,50,.82)";
      context.strokeStyle = "#4cc2ff";
      context.lineWidth = 4;
      context.beginPath();
      if (context.roundRect) context.roundRect(4, 4, 632, 104, 22);
      else context.rect(4, 4, 632, 104);
      context.fill();
      context.stroke();
      context.fillStyle = "#fff";
      context.font = "600 44px Segoe UI,Arial,sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 320, 58);
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), depthTest: false, transparent: true }),
      );
      sprite.scale.set(width, (width * 112) / 640, 1);
      sprite.position.set(x, y, z);
      sprite.renderOrder = 9;
      scene.add(sprite);
    };

    // Terrain
    addBox(42, 1, 27, 4, -0.5, -3, 0x0a1f4a);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(42, 1, 27)),
      new THREE.LineBasicMaterial({ color: 0x3fc8ff }),
    );
    edge.position.set(4, -0.5, -3);
    scene.add(edge);
    addBox(14, 7, 10, -9, 3.5, -11.5, 0x1b4a3a);
    addBox(3, 7, 13, -15.5, 3.5, -5, 0x1b4a3a);
    addBox(26, 0.8, 10, 12, 0.4, -11.5, 0x14392c);
    addBox(26, 0.8, 4, 12, 0.4, 10, 0x14392c);
    for (let i = 0; i < 34; i += 1) {
      const upstream = i < 12;
      const x = upstream ? -14 + Math.random() * 10 : 2 + Math.random() * 20;
      const z = upstream ? -8 - Math.random() * 6 : i % 3 ? -8 - Math.random() * 6 : 8.5 + Math.random() * 3;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), material(0x5b3b22));
      trunk.position.y = 0.35;
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 8), material(0x1f7a4d));
      crown.position.y = 1.4;
      crown.castShadow = true;
      tree.add(trunk, crown);
      tree.position.set(x, upstream ? 7 : 0.8, z);
      tree.scale.setScalar(0.8 + Math.random() * 0.6);
      scene.add(tree);
    }

    // Reservoir
    const waterTexture = createStreakTexture();
    waterTexture.repeat.set(4, 4);
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(12, 1, 13),
      material(0x1f8fe0, { transparent: true, opacity: 0.74, roughness: 0.15, metalness: 0.1 }),
    );
    water.position.x = -8;
    scene.add(water);
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 13, 30, 30),
      material(0x5cc4ff, { map: waterTexture, roughness: 0.15, metalness: 0.15, transparent: true, opacity: 0.92 }),
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.x = -8;
    scene.add(surface);
    const surfacePositions = surface.geometry.attributes.position;
    const alertReference = addBox(0.05, 0.05, 13, -2.04, 5.2, 0, 0xffb020, { emissive: 0xffb020, emissiveIntensity: 1 });
    addLabel("Illustrative alert reference", 4.4, -3.6, 5.75, 6.9);

    // Dam and gates
    addBox(2, 6, 13, -1, 3, 0, 0x8b97ad);
    addBox(2.8, 0.3, 13.6, -1, 6.15, 0, 0xc3cddd);
    const gateZ = [-4.5, -1.5, 1.5, 4.5];
    const gatePanels: THREE.Mesh[] = [];
    gateZ.forEach((z) => {
      addBox(0.14, 1.9, 1.8, 0.03, 1.3, z, 0x06122c);
      gatePanels.push(addBox(0.18, 2, 1.9, 0.14, 1.4, z, 0x35507f));
    });
    const jetCount = 480;
    const jetGeometry = new THREE.BufferGeometry();
    const jetPositions = new Float32Array(jetCount * 3);
    const jetVelocity: number[] = [];
    const jetDepth: number[] = [];
    for (let i = 0; i < jetCount; i += 1) {
      jetVelocity.push(2.4 + Math.random() * 1.8);
      jetDepth.push((Math.random() - 0.5) * 1.6);
    }
    jetGeometry.setAttribute("position", new THREE.BufferAttribute(jetPositions, 3));
    const jets = new THREE.Points(
      jetGeometry,
      new THREE.PointsMaterial({ color: 0xe2f6ff, size: 0.2, transparent: true, opacity: 0, depthWrite: false }),
    );
    jets.frustumCulled = false;
    scene.add(jets);

    // River
    const riverTexture = createStreakTexture();
    riverTexture.repeat.set(6, 3);
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 14),
      material(0x2a9be0, { map: riverTexture, roughness: 0.2, metalness: 0.1 }),
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(11, 0.12, 0);
    river.receiveShadow = true;
    scene.add(river);

    // Earthquake ripple on the ground
    const quakeRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xb794ff, transparent: true, opacity: 0, side: THREE.DoubleSide }),
    );
    quakeRing.rotation.x = -Math.PI / 2;
    quakeRing.position.set(-1, 0.2, -3);
    scene.add(quakeRing);

    // Sensor and control room
    const sensorMaterial = material(0x2ee6a6, { emissive: 0x2ee6a6, emissiveIntensity: 1.4 });
    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 20), sensorMaterial);
    sensor.position.set(-5, 7.6, 4);
    scene.add(sensor);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 7.5, 10), material(0x9fb4d8));
    pole.position.set(-5, 3.75, 4);
    pole.castShadow = true;
    scene.add(pole);
    const sensorRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.04, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xff4a3d, transparent: true, opacity: 0 }),
    );
    sensorRing.position.copy(sensor.position);
    sensorRing.rotation.x = Math.PI / 2;
    scene.add(sensorRing);
    addLabel("Reservoir water level sensor", 4.6, -5, 8.6, 4);

    addBox(4, 2.2, 2.6, 7, 1.9, -9.5, 0xcdd6e6);
    addBox(4.5, 0.3, 3.1, 7, 3.15, -9.5, 0x5d6f93);
    for (let i = 0; i < 3; i += 1) {
      addBox(0.8, 0.7, 0.05, 5.9 + i * 1.1, 2.1, -8.18, 0x2aa8ff, { emissive: 0x2aa8ff, emissiveIntensity: 0.9 });
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 5.2, 8), material(0x9fb4d8));
    antenna.position.set(4, 3.4, -9.5);
    antenna.castShadow = true;
    scene.add(antenna);
    const antennaLightMaterial = material(0xff5a3c, { emissive: 0xff5a3c, emissiveIntensity: 0 });
    const antennaLight = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), antennaLightMaterial);
    antennaLight.position.set(4, 6.1, -9.5);
    scene.add(antennaLight);
    addLabel("Control room (PLC & SCADA)", 5.2, 7, 4.5, -9.5);

    const recipients = [
      ["Gram Panchayat", 11, -13, 2, 1.4, 1.6, 0xd9b36a],
      ["Municipal", 15, -10.5, 2.2, 1.8, 1.8, 0xb9c4d8],
      ["Government authorities", 19, -12.5, 2.4, 2.2, 2, 0xe7e1d2],
    ] as const;
    const recipientMaterials: THREE.MeshStandardMaterial[] = [];
    const recipientPositions: THREE.Vector3[] = [];
    recipients.forEach((recipient) => {
      const [, x, z, width, height, depth, color] = recipient;
      addBox(width, height, depth, x, 0.8 + height / 2, z, color);
      addBox(width + 0.3, 0.2, depth + 0.3, x, 0.9 + height, z, 0x5d6f93);
      const indicatorMaterial = material(0x556677, { emissive: 0x000000, emissiveIntensity: 1 });
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 14), indicatorMaterial);
      indicator.position.set(x, 1.35 + height, z);
      scene.add(indicator);
      recipientMaterials.push(indicatorMaterial);
      recipientPositions.push(indicator.position.clone());
      addLabel(recipient[0], 4, x, 2.5 + height, z);
    });

    // Communication paths
    const curves = [
      new THREE.QuadraticBezierCurve3(sensor.position.clone(), new THREE.Vector3(-0.5, 13, -3), antennaLight.position.clone()),
    ];
    recipientPositions.forEach((target, index) => {
      curves.push(
        new THREE.QuadraticBezierCurve3(
          antennaLight.position.clone(),
          new THREE.Vector3(
            (antennaLight.position.x + target.x) / 2,
            antennaLight.position.y + 4 + index,
            (antennaLight.position.z + target.z) / 2,
          ),
          target.clone(),
        ),
      );
    });
    const beamMeshes: Array<{ geometry: THREE.TubeGeometry; indexCount: number }> = [];
    const signalPoints: THREE.Mesh[] = [];
    curves.forEach((curve, index) => {
      const geometry = new THREE.TubeGeometry(curve, 48, 0.07, 6, false);
      const beam = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: index ? 0x4cc2ff : 0xffb020, transparent: true, opacity: 0.85 }),
      );
      beam.frustumCulled = false;
      scene.add(beam);
      beamMeshes.push({ geometry, indexCount: geometry.index?.count ?? 0 });
      geometry.setDrawRange(0, 0);
      const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 12, 12),
        new THREE.MeshBasicMaterial({ color: index ? 0xdff6ff : 0xffe0a0 }),
      );
      point.visible = false;
      scene.add(point);
      signalPoints.push(point);
    });

    // Rain and storm cloud
    const rainCount = 1800;
    const rainGeometry = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 6);
    const rainData = Array.from({ length: rainCount }, () => ({
      x: -14 + Math.random() * 12,
      z: -6 + Math.random() * 12.4,
      phase: Math.random(),
      speed: 0.8 + Math.random() * 0.6,
    }));
    rainGeometry.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
    const rainMaterial = new THREE.LineBasicMaterial({ color: 0xcfe9ff, transparent: true, opacity: 0 });
    const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
    rain.frustumCulled = false;
    scene.add(rain);
    const cloudMaterial = material(0xd0d6e0, { transparent: true, roughness: 1 });
    const cloud = new THREE.Group();
    [
      [-3, 0, 0, 2.6],
      [0, 0.6, 0.4, 3.2],
      [3.2, 0, -0.3, 2.7],
      [5.6, -0.3, 0.5, 2],
      [-5.2, -0.4, 0.6, 1.9],
      [1.4, -0.2, 1.6, 2.4],
      [-1.8, -0.3, -1.8, 2.3],
    ].forEach(([x, y, z, radius]) => {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), cloudMaterial);
      puff.position.set(x, y, z);
      puff.scale.y = 0.62;
      cloud.add(puff);
    });
    scene.add(cloud);

    const sensorColors = [0x2ee6a6, 0x3fc8ff, 0xffb020, 0xff4a3d, 0xff4a3d];
    let elapsed = 0;
    let previousFrame = 0;
    let uiAccumulator = 0;
    let pointerX = 0;
    let pointerY = 0;
    let cameraX = 0;
    let cameraY = 0;
    let animationFrame = 0;
    let lastQuality = controlsRef.current.quality;
    let disposed = false;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      controlsRef.current.playing = false;
      setPlaying(false);
    }

    const onPointerMove = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      const requested = controlsRef.current.quality === "auto" ? 0 : Number(controlsRef.current.quality);
      const pixelRatio = requested ? Math.min(4, requested / width) : Math.min(window.devicePixelRatio || 1, 2);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);
    stage.addEventListener("pointermove", onPointerMove);
    resize();

    const renderAt = (t: number, delta: number) => {
      const current = simRef.current;
      const frames = current.frames;
      const fi = Math.min(frames.length - 1, t / DT);
      const i0 = Math.floor(fi);
      const i1 = Math.min(frames.length - 1, i0 + 1);
      const a = fi - i0;
      const f = frames[i0];
      const f1 = frames[i1];
      const currentLevel = f.level + (f1.level - f.level) * a;
      const gateOpening = f.gate + (f1.gate - f.gate) * a;
      const rainStrength = clamp(f.rainMm / 60);
      const shake = f.pga;
      const alertLevel = f.alert;
      const waterHeight = 3 + (currentLevel - 680) * 0.55;

      water.scale.y = waterHeight;
      water.position.y = waterHeight / 2;
      surface.position.y = waterHeight + 0.01;
      for (let i = 0; i < surfacePositions.count; i += 1) {
        const x = surfacePositions.getX(i);
        const y = surfacePositions.getY(i);
        surfacePositions.setZ(
          i,
          Math.sin(x * 1.3 + t * 2.4) * (0.03 + 0.09 * rainStrength + shake * 1.2) +
            Math.cos(y * 1.1 + t * 2) * (0.03 + 0.08 * rainStrength + shake * 1.0),
        );
      }
      surfacePositions.needsUpdate = true;
      waterTexture.offset.x = -t * 0.012;
      riverTexture.offset.x -= delta * (0.04 + gateOpening * 0.5);
      (alertReference.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 4);

      const storm = clamp(f.rainMm / 70);
      backgroundColor.copy(dayColor).lerp(stormColor, storm);
      scene.background = backgroundColor;
      (scene.fog as THREE.Fog).color.copy(backgroundColor);
      const flash = f.rainMm > 45 && Math.sin(t * 7.3) * Math.sin(t * 3.1) > 0.93 ? 1.6 : 0;
      hemisphere.intensity = 0.95 - 0.35 * storm + flash;
      sun.intensity = 1.1 - 0.6 * storm;
      const raining = current.params.rain > 0;
      cloud.position.set(-26 + 17 * ease(seg(t, 1.8, 4.5)), 12, 0);
      cloudMaterial.color.setHex(0xd0d6e0).lerp(new THREE.Color(0x4f586b), storm);
      cloudMaterial.opacity = raining ? clamp(f.rainMm / 25) : 0;
      cloud.visible = cloudMaterial.opacity > 0.01;

      rainMaterial.opacity = 0.65 * rainStrength;
      rain.visible = rainStrength > 0.01;
      if (rain.visible) {
        for (let i = 0; i < rainCount; i += 1) {
          const item = rainData[i];
          const y = 13 - ((item.phase + t * 0.9 * item.speed) % 1) * (13 - waterHeight);
          const offset = i * 6;
          rainPositions[offset] = item.x;
          rainPositions[offset + 1] = y;
          rainPositions[offset + 2] = item.z;
          rainPositions[offset + 3] = item.x - 0.08;
          rainPositions[offset + 4] = y + 0.55;
          rainPositions[offset + 5] = item.z;
        }
        (rainGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      const flashing = alertLevel >= 3;
      sensorMaterial.color.setHex(sensorColors[alertLevel]);
      sensorMaterial.emissive.setHex(sensorColors[alertLevel]);
      sensorMaterial.emissiveIntensity = flashing ? 1.2 + Math.sin(t * 10) * 0.8 : 1.4;
      const ringPhase = (t * 1.1) % 1;
      sensorRing.scale.setScalar(0.6 + ringPhase * 2.4);
      (sensorRing.material as THREE.MeshBasicMaterial).opacity = alertLevel >= 2 ? (1 - ringPhase) * 0.9 : 0;
      alertLight.intensity = flashing ? 1.5 + Math.sin(t * 10) : 0;

      beamMeshes.forEach((beam, index) => {
        const p = f.comm[index];
        beam.geometry.setDrawRange(0, Math.floor((p * beam.indexCount) / 6) * 6);
        const point = signalPoints[index];
        point.visible = p > 0 && p < 1;
        if (point.visible) point.position.copy(curves[index].getPoint(p));
      });
      antennaLightMaterial.emissiveIntensity = f.comm[0] > 0 && !f.notified[2] && Math.sin(t * 12) > 0 ? 2 : 0;
      recipientMaterials.forEach((recipientMaterial, index) => {
        const isOn = f.notified[index];
        recipientMaterial.color.setHex(isOn ? 0x2ee68a : 0x556677);
        recipientMaterial.emissive.setHex(isOn ? 0x2ee68a : 0x000000);
      });
      gatePanels.forEach((panel, index) => {
        const faulty = current.params.gateFault && index === 2;
        panel.position.y = 1.4 + gateOpening * 2.2 * (faulty ? 0.25 : 1);
      });
      const jetMaterial = jets.material as THREE.PointsMaterial;
      jetMaterial.opacity = gateOpening > 0.04 ? Math.min(0.95, gateOpening * 1.5) : 0;
      jets.visible = jetMaterial.opacity > 0;
      if (jets.visible) {
        for (let i = 0; i < jetCount; i += 1) {
          const progressValue = (t * 1.3 + i / jetCount) % 1;
          const y = Math.max(0.16, 1.3 + 1.4 * progressValue - 6 * progressValue * progressValue);
          const offset = i * 3;
          jetPositions[offset] = 0.3 + jetVelocity[i] * progressValue;
          jetPositions[offset + 1] = y;
          jetPositions[offset + 2] = gateZ[i % 4] + jetDepth[i];
        }
        (jetGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      }

      const dq = t - QUAKE_T;
      const ringOn = current.peakPga > 0 && dq > 0 && dq < 6;
      quakeRing.visible = ringOn;
      if (ringOn) {
        quakeRing.scale.setScalar(1 + dq * 7);
        (quakeRing.material as THREE.MeshBasicMaterial).opacity = (1 - dq / 6) * 0.8;
      }

      cameraX += (pointerX - cameraX) * 0.05;
      cameraY += (pointerY - cameraY) * 0.05;
      const preset = controlsRef.current.cameraPreset;
      const viewPoint =
        preset === "reservoir"
          ? { x: -7, y: 10, z: 19, tx: -6, ty: 3.2, tz: -1 }
          : preset === "gates"
            ? { x: 5, y: 7, z: 17, tx: 1, ty: 2, tz: 0 }
            : { x: 3, y: 9.5, z: 27, tx: 3, ty: 2.6, tz: -2 };
      const dolly = ease(seg(t, 12, 16)) * -2.5 + ease(seg(t, 21, 26)) * 1.5;
      const jitter = shake * 14;
      camera.position.set(
        viewPoint.x + Math.sin(t * 0.18) * (preset === "overview" ? 2.5 : 0.7) + cameraX * 4 + (Math.random() - 0.5) * jitter,
        viewPoint.y + cameraY * 2.5 + (Math.random() - 0.5) * jitter,
        viewPoint.z + dolly,
      );
      camera.lookAt(viewPoint.tx + cameraX * 1.2, viewPoint.ty, viewPoint.tz);
      if (controlsRef.current.view === "twin") renderer.render(scene, camera);
    };

    const animate = (timestamp: number) => {
      if (disposed) return;
      if (!previousFrame) previousFrame = timestamp;
      const delta = Math.min(0.1, (timestamp - previousFrame) / 1000);
      previousFrame = timestamp;
      const controls = controlsRef.current;
      if (controls.seek !== null) {
        elapsed = controls.seek;
        controls.seek = null;
      }
      if (controls.quality !== lastQuality) {
        lastQuality = controls.quality;
        resize();
      }
      if (controls.playing) {
        elapsed += delta * controls.speed;
        if (elapsed >= DURATION + 3) {
          if (controls.loop) elapsed = 0;
          else {
            elapsed = DURATION;
            controls.playing = false;
            setPlaying(false);
          }
        }
      }
      const currentTime = Math.min(elapsed, DURATION);
      uiAccumulator += delta;
      if (uiAccumulator >= 0.1) {
        uiAccumulator = 0;
        setTime(currentTime);
      }
      renderAt(currentTime, delta);
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);

    const onFullscreenChange = () => resize();
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      stage.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((item) => {
            Object.values(item).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            item.dispose();
          });
        }
      });
      waterTexture.dispose();
      riverTexture.dispose();
      renderer.dispose();
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Handlers                                                         */
  /* ---------------------------------------------------------------- */
  const seekTo = (t: number) => {
    controlsRef.current.seek = t;
    setTime(t);
  };
  const togglePlayback = () => {
    const next = !controlsRef.current.playing;
    if (next && time >= DURATION) seekTo(0);
    controlsRef.current.playing = next;
    setPlaying(next);
  };
  const restart = () => {
    controlsRef.current.playing = true;
    seekTo(0);
    setPlaying(true);
  };
  const applyPreset = (p: Params) => {
    setParams(p);
    restart();
  };
  const toggleFullscreen = async () => {
    if (!stageRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (stageRef.current.requestFullscreen) await stageRef.current.requestFullscreen();
  };

  /* ---------------------------------------------------------------- */
  /* Derived data for charts and panels                               */
  /* ---------------------------------------------------------------- */
  const chartData = useMemo(() => {
    const f = sim.frames;
    const col = (fn: (x: Frame) => number) => f.map(fn);
    const max = (arr: number[]) => arr.reduce((m, v) => Math.max(m, v), -Infinity);
    return {
      level: col((x) => x.level),
      qin: col((x) => x.qin),
      qout: col((x) => x.qout),
      rain: col((x) => x.rainMm),
      gate: col((x) => x.gate * 100),
      wave: col((x) => x.wave),
      piezo: col((x) => x.piezo),
      seepage: col((x) => x.seepage),
      risk: col((x) => x.risk),
      depth: VILLAGES.map((_, k) => col((x) => x.depth[k])),
      evac: VILLAGES.map((_, k) => col((x) => x.evac[k] * 100)),
      popRisk: col((x) => x.popRisk),
      flowMax: Math.max(1600, Math.ceil(max(col((x) => Math.max(x.qin, x.qout))) / 200) * 200),
      depthMax: Math.max(1, Math.ceil(max(f.flatMap((x) => x.depth)) * 2) / 2),
      piezoMax: Math.max(300, Math.ceil(max(col((x) => x.piezo)) / 50) * 50),
      seepMax: Math.max(60, Math.ceil(max(col((x) => x.seepage)) / 20) * 20),
      popMax: Math.max(1000, Math.ceil(max(col((x) => x.popRisk)) / 1000) * 1000),
      waveMax: Math.max(0.1, Math.ceil(sim.peakPga * 1.15 * 20) / 20),
    };
  }, [sim]);

  const alertMeta = ALERTS[frame.alert];
  const visibleEvents = sim.events.filter((e) => e.t <= time).reverse();
  const latest = visibleEvents[0];
  const gateModeLabel = params.gateMode === "AUTO" ? "Automatic control" : "Manual control";
  const estimatedPga = params.quake > 0 ? 0.02 * Math.pow(10, (params.quake - 4) * 0.45) : 0;
  const eventTicks = sim.events.filter((e) => e.kind === "alert" || e.kind === "warn");

  const kpis: Array<{ label: string; value: string; sub: string; color: string }> = [
    { label: "Reservoir level", value: `${frame.level.toFixed(2)} m`, sub: `${frame.level >= 684 ? "+" : ""}${(frame.level - 684).toFixed(2)} m vs alert ref.`, color: frame.level >= 684 ? "#ff7a2e" : frame.level >= 683 ? "#ffb020" : "#e5f2ff" },
    { label: "Inflow", value: `${frame.qin.toFixed(0)} m³/s`, sub: `${frame.cumRain.toFixed(0)} mm rain so far`, color: "#3fc8ff" },
    { label: "Outflow", value: `${frame.qout.toFixed(0)} m³/s`, sub: `gates ${(frame.gate * 100).toFixed(0)}% (target ${(frame.target * 100).toFixed(0)}%)`, color: "#ffb020" },
    { label: "Ground shaking", value: `${frame.pga.toFixed(3)} g`, sub: sim.peakPga > 0 ? `event peak ${sim.peakPga.toFixed(2)} g` : "no seismic event", color: frame.pga >= 0.1 ? "#ff4a3d" : "#b794ff" },
    { label: "Structural risk", value: `${frame.risk} / 100`, sub: `seepage ${frame.seepage.toFixed(0)} L/s`, color: frame.risk >= 65 ? "#ff4a3d" : frame.risk >= 45 ? "#ffb020" : "#2ee6a6" },
    { label: "People at risk", value: frame.popRisk.toLocaleString("en-IN"), sub: `${Math.round((VILLAGES.reduce((s, v, k) => s + v.pop * frame.evac[k], 0) / VILLAGES.reduce((s, v) => s + v.pop, 0)) * 100)}% evacuated`, color: frame.popRisk > 0 ? "#ff4a3d" : "#2ee6a6" },
  ];

  const pill = (active: boolean): string =>
    `rounded-md border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400 ${
      active ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-[#17305a] bg-[#071126] text-slate-300 hover:border-sky-500/60"
    }`;

  /* ---------------------------------------------------------------- */
  /* Render                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <section className="overflow-hidden rounded-xl border border-[#17305a] bg-[#050b18] text-slate-100 shadow-lg">
      {/* header */}
      <div className="flex flex-col justify-between gap-3 border-b border-[#17305a] bg-[#08122a] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
            <ShieldAlert size={21} />
          </div>
          <div>
            <h2 className="font-bold text-white">Multi-hazard early warning command center</h2>
            <p className="mt-0.5 text-xs text-slate-400">Rainfall flood and earthquake response with automated gate and notification logic</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-[#17305a] bg-[#071126] px-3 py-1.5 font-mono text-sm tabular-nums text-slate-100">{clock(time)}</span>
          <span
            className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-bold"
            style={{ borderColor: alertMeta.color, color: alertMeta.color, background: `${alertMeta.color}1a` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: alertMeta.color }} />
            {alertMeta.name}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Simulation mode
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-3 sm:p-4 xl:grid-cols-[290px_minmax(0,1fr)_320px]">
        {/* ---------------- left: scenario ---------------- */}
        <aside className="order-2 space-y-4 xl:order-1">
          <Panel title="Scenario presets" icon={<Settings2 size={16} className="text-sky-300" />}>
            <div className="grid gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.p)}
                  className="rounded-lg border border-[#17305a] bg-[#071126] px-3 py-2 text-left transition hover:border-sky-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"
                >
                  <span className="block text-sm font-semibold text-slate-100">{preset.label}</span>
                  <span className="block text-xs text-slate-400">{preset.desc}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Hazards" icon={<CloudRain size={16} className="text-sky-300" />}>
            <div className="space-y-5">
              <SliderField
                id="rain"
                label="Extreme rainfall"
                display={params.rain === 0 ? "Off" : `${Math.round((params.rain / 100) * 95)} mm/h peak`}
                min={0}
                max={100}
                step={5}
                value={params.rain}
                onChange={(v) => patch({ rain: v })}
                hint="Sets catchment rainfall and the resulting inflow hydrograph."
              />
              <SliderField
                id="quake"
                label="Earthquake"
                display={params.quake === 0 ? "Off" : `M${params.quake.toFixed(1)}`}
                min={3.9}
                max={7.5}
                step={0.1}
                value={params.quake === 0 ? 3.9 : params.quake}
                onChange={(v) => patch({ quake: v < 4 ? 0 : v })}
                hint={params.quake > 0 ? `Estimated peak ground acceleration ${estimatedPga.toFixed(2)} g at the dam. Slide to the left end to switch off.` : "Drag past M4.0 to add a seismic event at T+05:30."}
              />
              <SliderField
                id="start-level"
                label="Starting reservoir level"
                display={`${params.startLevel.toFixed(1)} m`}
                min={678}
                max={682}
                step={0.5}
                value={params.startLevel}
                onChange={(v) => patch({ startLevel: v })}
                hint="A fuller reservoir leaves less buffer for the storm."
              />
            </div>
          </Panel>

          <Panel title="Operations and faults" icon={<Activity size={16} className="text-sky-300" />}>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Gate control</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className={pill(params.gateMode === "AUTO")} aria-pressed={params.gateMode === "AUTO"} onClick={() => patch({ gateMode: "AUTO" })}>
                    Automatic
                  </button>
                  <button type="button" className={pill(params.gateMode === "MANUAL")} aria-pressed={params.gateMode === "MANUAL"} onClick={() => patch({ gateMode: "MANUAL" })}>
                    Manual
                  </button>
                </div>
              </div>
              {params.gateMode === "MANUAL" ? (
                <SliderField
                  id="manual-gate"
                  label="Gate opening"
                  display={`${params.manualGate}%`}
                  min={0}
                  max={100}
                  step={5}
                  value={params.manualGate}
                  onChange={(v) => patch({ manualGate: v })}
                  hint="Moves the model gates only. The minimum pool interlock still closes them at 678.0 m."
                />
              ) : (
                <p className="text-xs leading-5 text-slate-400">The rule engine pre-releases, holds the level and opens fully on Emergency.</p>
              )}
              <ToggleField label="Primary SCADA link failed" hint="Alarms fail over to the slower satellite backup." checked={!params.commsOk} onChange={(v) => patch({ commsOk: !v })} />
              <ToggleField label="Gate 3 actuator fault" hint="Limits release capacity to 75%." checked={params.gateFault} onChange={(v) => patch({ gateFault: v })} tone="red" />
            </div>
          </Panel>
        </aside>

        {/* ---------------- centre: stage + analytics ---------------- */}
        <div className="order-1 min-w-0 space-y-4 xl:order-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg border border-[#17305a] bg-[#0a1630] px-3 py-2.5">
                <p className="text-xs text-slate-400">{k.label}</p>
                <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums" style={{ color: k.color }}>
                  {k.value}
                </p>
                <p className="truncate text-[11px] text-slate-400">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-[#17305a] bg-[#0a1630]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#17305a] px-3 py-2">
              <div className="flex gap-2">
                <button type="button" className={`${pill(view === "twin")} inline-flex items-center gap-1.5`} aria-pressed={view === "twin"} onClick={() => setView("twin")}>
                  <Box size={14} /> 3D digital twin
                </button>
                <button type="button" className={`${pill(view === "map")} inline-flex items-center gap-1.5`} aria-pressed={view === "map"} onClick={() => setView("map")}>
                  <MapIcon size={14} /> Tactical map
                </button>
              </div>
              {view === "twin" ? (
                <div className="flex items-center gap-2">
                  <Camera size={14} className="text-sky-300" />
                  {([["overview", "Overview"], ["reservoir", "Reservoir"], ["gates", "Gates"]] as const).map(([id, label]) => (
                    <button key={id} type="button" className={pill(cameraPreset === id)} aria-pressed={cameraPreset === id} onClick={() => setCameraPreset(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  {([["inundation", "Flood extent"], ["sensors", "Sensors"], ["evac", "Evacuation"], ["comms", "Comms"]] as const).map(([id, label]) => (
                    <button key={id} type="button" className={pill(layers[id])} aria-pressed={layers[id]} onClick={() => setLayers((prev) => ({ ...prev, [id]: !prev[id] }))}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div ref={stageRef} className="relative aspect-video min-h-[320px] overflow-hidden bg-[#07163a] text-white max-sm:aspect-[4/5]">
              <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
              {view === "map" && <TacticalMap frame={frame} sim={sim} time={time} layers={layers} selected={selected} onSelect={setSelected} />}

              {view === "twin" && (
                <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-sky-400/50 bg-[#08183acc] px-3 py-2 backdrop-blur sm:left-4 sm:top-4">
                  <strong className="block text-sm tracking-[0.18em]">CHETAS</strong>
                  <span className="hidden text-[10px] text-sky-100/80 sm:block">Control Systems · Water Management</span>
                </div>
              )}
              {frame.alert >= 3 && (
                <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-orange-400 bg-red-950/90 px-3 py-2 text-center text-xs font-bold text-orange-200 sm:top-4 sm:text-sm">
                  <AlertTriangle size={16} /> {alertMeta.name}: {alertMeta.action}
                </div>
              )}
              {view === "twin" && (
                <div className="pointer-events-none absolute right-3 top-3 w-[min(48%,230px)] rounded-xl border border-sky-400/50 bg-[#08183acc] p-3 backdrop-blur sm:right-4 sm:top-4">
                  <p className="text-[10px] font-semibold text-sky-200">Simulated SCADA overview, demo values</p>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-sky-200">Water level</p>
                      <p className="font-mono text-xl font-bold tabular-nums">{frame.level.toFixed(2)} m</p>
                    </div>
                    <span className="rounded px-2 py-1 text-[10px] font-bold" style={{ background: alertMeta.color, color: "#04101f" }}>
                      {alertMeta.name}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-sky-100">
                    <span>In {frame.qin.toFixed(0)}</span>
                    <span>Out {frame.qout.toFixed(0)} m³/s</span>
                  </div>
                  <div className="mt-2 grid gap-0.5 text-[10px]">
                    {VILLAGES.map((v, k) => (
                      <span key={v.id} className={frame.notified[k] ? "text-emerald-300" : "text-sky-100/70"}>
                        {frame.notified[k] ? "✓" : "○"} {v.authority}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {time >= DURATION - 0.5 && (
                <div className="absolute bottom-3 right-3 z-10 rounded-lg border border-emerald-400/70 bg-emerald-950/90 px-3 py-2 text-xs text-emerald-100">
                  <CheckCircle2 className="mr-1 inline" size={14} /> Scenario complete
                </div>
              )}
              {webglError && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 p-6 text-center text-sm text-red-100">
                  3D graphics (WebGL) is unavailable in this browser. The tactical map still works; try an up-to-date Chrome, Edge, Firefox or Safari for the 3D twin.
                </div>
              )}
            </div>

            {/* playback */}
            <div className="border-t border-[#17305a] px-3 py-3">
              <p className="min-h-10 text-sm leading-5 text-slate-200" aria-live="polite">
                {latest ? (
                  <>
                    <span className="mr-2 font-mono text-xs" style={{ color: LOG_COLOR[latest.kind] }}>
                      {clock(latest.t)}
                    </span>
                    {latest.text}
                  </>
                ) : (
                  "Waiting for the first event."
                )}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" onClick={togglePlayback} className="inline-flex items-center gap-2 rounded-lg bg-[#007EBA] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0092d6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                  {playing ? "Pause" : time >= DURATION ? "Replay" : "Play"}
                </button>
                <button type="button" onClick={restart} className="inline-flex items-center gap-2 rounded-lg border border-[#17305a] bg-[#071126] px-3 py-2 text-sm font-semibold text-slate-200 hover:border-sky-500/60">
                  <RotateCcw size={15} /> Restart
                </button>
                <div className="relative min-w-[160px] flex-1">
                  <input aria-label="Animation timeline" type="range" min="0" max={DURATION} step="0.1" value={time} onChange={(e) => seekTo(Number(e.target.value))} className="w-full accent-sky-400" />
                  {eventTicks.map((e, i) => (
                    <i key={i} className="pointer-events-none absolute -bottom-1 h-2 w-0.5" style={{ left: `calc(${(e.t / DURATION) * 100}% * 0.96 + 2%)`, background: LOG_COLOR[e.kind] }} />
                  ))}
                </div>
                <span className="min-w-14 text-right font-mono text-xs tabular-nums text-slate-300">{clock(time)}</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  Speed
                  <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-md border border-[#17305a] bg-[#071126] px-2 py-1.5">
                    <option value={0.5}>0.5x</option>
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  Quality
                  <select value={quality} onChange={(e) => setQuality(e.target.value)} className="rounded-md border border-[#17305a] bg-[#071126] px-2 py-1.5">
                    <option value="auto">Auto</option>
                    <option value="1920">Full HD</option>
                    <option value="3840">4K</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-300">
                  <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> Loop
                </label>
                <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-lg border border-[#17305a] bg-[#071126] px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-500/60">
                  <Maximize2 size={14} /> Fullscreen
                </button>
              </div>
            </div>
          </div>

          {/* analytics */}
          <Panel
            title="Situational analytics"
            icon={<Activity size={16} className="text-sky-300" />}
            right={
              <div className="flex flex-wrap gap-1.5">
                {([["hydro", "Hydrology"], ["structure", "Structure"], ["downstream", "Downstream"], ["sensors", "Sensors"]] as const).map(([id, label]) => (
                  <button key={id} type="button" className={pill(tab === id)} aria-pressed={tab === id} onClick={() => setTab(id)}>
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {tab === "hydro" && (
              <div className="grid gap-3 lg:grid-cols-2">
                <TimeChart
                  title="Reservoir level"
                  unit="m"
                  time={time}
                  yMin={676}
                  yMax={687}
                  decimals={2}
                  series={[{ name: "Level", color: "#3fc8ff", values: chartData.level, kind: "area" }]}
                  thresholds={LEVEL_TRIGGERS.map((v, k) => ({ value: v, label: ALERTS[k + 1].name, color: ALERTS[k + 1].color }))}
                />
                <TimeChart
                  title="Inflow and outflow"
                  unit="m³/s"
                  time={time}
                  yMin={0}
                  yMax={chartData.flowMax}
                  decimals={0}
                  series={[
                    { name: "Inflow", color: "#3fc8ff", values: chartData.qin },
                    { name: "Outflow", color: "#ffb020", values: chartData.qout },
                  ]}
                />
                <TimeChart title="Rainfall intensity" unit="mm/h" time={time} yMin={0} yMax={100} decimals={0} series={[{ name: "Rain", color: "#8fb8ff", values: chartData.rain, kind: "bars" }]} thresholds={[{ value: 35, label: "Watch", color: "#3fc8ff" }, { value: 60, label: "Warning", color: "#ffb020" }]} />
                <TimeChart title="Gate opening" unit="%" time={time} yMin={0} yMax={100} decimals={0} series={[{ name: gateModeLabel, color: "#b794ff", values: chartData.gate, kind: "area" }]} />
              </div>
            )}
            {tab === "structure" && (
              <div className="grid gap-3 lg:grid-cols-2">
                <TimeChart
                  title="Ground motion"
                  unit="g"
                  time={time}
                  yMin={-chartData.waveMax}
                  yMax={chartData.waveMax}
                  decimals={3}
                  series={[{ name: "Acceleration", color: "#b794ff", values: chartData.wave }]}
                />
                <TimeChart title="Pore pressure (PZ-1)" unit="kPa" time={time} yMin={180} yMax={chartData.piezoMax} decimals={0} series={[{ name: "Piezometer", color: "#3fc8ff", values: chartData.piezo, kind: "area" }]} />
                <TimeChart title="Seepage (SP-1)" unit="L/s" time={time} yMin={0} yMax={chartData.seepMax} decimals={0} series={[{ name: "Seepage", color: "#2ee6a6", values: chartData.seepage, kind: "area" }]} thresholds={[{ value: 40, label: "Limit", color: "#ffb020" }]} />
                <TimeChart
                  title="Structural risk index"
                  unit="0-100"
                  time={time}
                  yMin={0}
                  yMax={100}
                  decimals={0}
                  series={[{ name: "Risk", color: "#ff7a2e", values: chartData.risk, kind: "area" }]}
                  thresholds={[{ value: 45, label: "Warning", color: "#ffb020" }, { value: 65, label: "Alert", color: "#ff7a2e" }, { value: 85, label: "Emergency", color: "#ff3b3b" }]}
                />
              </div>
            )}
            {tab === "downstream" && (
              <div className="grid gap-3 lg:grid-cols-2">
                <TimeChart
                  title="Flood depth by community"
                  unit="m"
                  time={time}
                  yMin={0}
                  yMax={chartData.depthMax}
                  decimals={1}
                  series={VILLAGES.map((v, k) => ({ name: v.short, color: ["#ff7a2e", "#ffb020", "#3fc8ff"][k], values: chartData.depth[k] }))}
                  thresholds={[{ value: 0.3, label: "Impact", color: "#ff4a3d" }]}
                />
                <TimeChart
                  title="Evacuation progress"
                  unit="%"
                  time={time}
                  yMin={0}
                  yMax={100}
                  decimals={0}
                  series={VILLAGES.map((v, k) => ({ name: v.short, color: ["#ff7a2e", "#ffb020", "#3fc8ff"][k], values: chartData.evac[k] }))}
                />
                <div className="lg:col-span-2">
                  <TimeChart title="People in flood-affected areas, not yet evacuated" unit="people" time={time} yMin={0} yMax={chartData.popMax} decimals={0} series={[{ name: "At risk", color: "#ff4a3d", values: chartData.popRisk, kind: "area" }]} />
                </div>
              </div>
            )}
            {tab === "sensors" && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-slate-400">
                    <tr>
                      <th className="py-2 pr-3 font-medium">Sensor</th>
                      <th className="py-2 pr-3 font-medium">Measures</th>
                      <th className="py-2 pr-3 font-medium">Reading</th>
                      <th className="py-2 font-medium">State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: "LS-1", what: "Reservoir level", value: `${frame.level.toFixed(2)} m`, st: frame.alert >= 3 ? 3 : frame.alert },
                      { id: "RG-1", what: "Rainfall", value: `${frame.rainMm.toFixed(0)} mm/h`, st: frame.rainMm >= 60 ? 3 : frame.rainMm >= 35 ? 2 : 0 },
                      { id: "PZ-1", what: "Pore pressure", value: `${frame.piezo.toFixed(0)} kPa`, st: frame.piezo > 320 ? 3 : frame.piezo > 260 ? 2 : 0 },
                      { id: "SG-1", what: "Ground acceleration", value: `${frame.pga.toFixed(3)} g`, st: frame.pga >= 0.1 ? 3 : frame.pga >= 0.03 ? 2 : 0 },
                      { id: "SP-1", what: "Seepage flow", value: `${frame.seepage.toFixed(0)} L/s`, st: frame.seepage > 60 ? 3 : frame.seepage > 40 ? 2 : 0 },
                      { id: "TM-1", what: "Crest displacement", value: `${frame.tilt.toFixed(1)} mm`, st: frame.tilt > 12 ? 3 : frame.tilt > 6 ? 2 : 0 },
                    ].map((row) => {
                      const state = row.st >= 3 ? "Alarm" : row.st === 2 ? "Warning" : row.st === 1 ? "Watch" : "Normal";
                      const color = row.st >= 3 ? "#ff4a3d" : row.st === 2 ? "#ffb020" : row.st === 1 ? "#3fc8ff" : "#2ee6a6";
                      return (
                        <tr key={row.id} className="border-t border-[#17305a]">
                          <td className="py-2 pr-3 font-mono text-slate-100">{row.id}</td>
                          <td className="py-2 pr-3 text-slate-300">{row.what}</td>
                          <td className="py-2 pr-3 font-mono tabular-nums text-slate-100">{row.value}</td>
                          <td className="py-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color }}>
                              <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                              {state}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* ---------------- right: response ---------------- */}
        <aside className="order-3 space-y-4">
          <Panel title="Alert level" icon={<Bell size={16} className="text-sky-300" />}>
            <ol className="space-y-1.5">
              {ALERTS.map((a, i) => {
                const active = i === frame.alert;
                const passed = i < frame.alert;
                return (
                  <li
                    key={a.name}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm"
                    style={{
                      borderColor: active ? a.color : "#17305a",
                      background: active ? `${a.color}22` : "#071126",
                      opacity: active || passed ? 1 : 0.55,
                    }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span className="font-semibold text-slate-100">{a.name}</span>
                    {active && <span className="ml-auto truncate text-xs text-slate-300">{clock(time)}</span>}
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs leading-5 text-slate-300">{alertMeta.action}</p>
          </Panel>

          <Panel title="Automated response rules" icon={<Radio size={16} className="text-sky-300" />}>
            <ul className="space-y-2">
              {RULES.map((rule, i) => {
                const firedAt = sim.rules[i];
                const fired = firedAt !== null && firedAt <= time;
                const standby = i === 5 && params.commsOk;
                return (
                  <li key={rule.id} className={`rounded-lg border p-2.5 ${fired ? "border-sky-400/60 bg-sky-500/10" : "border-[#17305a] bg-[#071126]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-sky-300">{rule.id}</span>
                      <span className={`text-[11px] font-semibold ${fired ? "text-emerald-300" : "text-slate-400"}`}>
                        {fired ? `Triggered ${clock(firedAt as number)}` : standby ? "Standby" : "Armed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-300">
                      <span className="text-slate-400">If</span> {rule.when}
                    </p>
                    <p className="text-xs leading-5 text-slate-100">
                      <span className="text-slate-400">Then</span> {rule.then}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel title="Downstream communities" icon={<Users size={16} className="text-sky-300" />}>
            <ul className="space-y-3">
              {VILLAGES.map((v, k) => (
                <li key={v.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-100">{v.short}</span>
                    <span className={`text-xs font-semibold ${frame.notified[k] ? "text-emerald-300" : "text-slate-400"}`}>{frame.notified[k] ? "Notified" : "Not notified"}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {v.km} km downstream, {v.pop.toLocaleString("en-IN")} people, flood depth{" "}
                    <b className={`font-mono ${frame.depth[k] > 0.3 ? "text-red-300" : "text-slate-200"}`}>{frame.depth[k].toFixed(1)} m</b>
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-white/10">
                    <div className="h-full rounded bg-emerald-400 transition-[width]" style={{ width: `${frame.evac[k] * 100}%` } as CSSProperties} />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">{Math.round(frame.evac[k] * 100)}% evacuated</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Event log" icon={<Activity size={16} className="text-sky-300" />} right={<span className="text-xs text-slate-400">{visibleEvents.length} events</span>}>
            <ol className="max-h-80 space-y-2 overflow-auto pr-1">
              {visibleEvents.length === 0 && <li className="text-xs text-slate-400">No events yet.</li>}
              {visibleEvents.map((e, i) => (
                <li key={`${e.t}-${i}`} className="border-l-2 pl-2.5 text-xs leading-5" style={{ borderColor: LOG_COLOR[e.kind] }}>
                  <span className="mr-1.5 font-mono tabular-nums" style={{ color: LOG_COLOR[e.kind] }}>
                    {clock(e.t)}
                  </span>
                  <span className="text-slate-200">{e.text}</span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Scenario summary" icon={<Waves size={16} className="text-sky-300" />}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <dt className="text-slate-400">Peak level</dt>
              <dd className="text-right font-mono text-slate-100">{sim.summary.peakLevel.toFixed(2)} m</dd>
              <dt className="text-slate-400">Peak outflow</dt>
              <dd className="text-right font-mono text-slate-100">{sim.summary.peakOutflow.toFixed(0)} m³/s</dd>
              <dt className="text-slate-400">Highest alert</dt>
              <dd className="text-right font-semibold" style={{ color: ALERTS[sim.summary.maxAlert].color }}>{ALERTS[sim.summary.maxAlert].name}</dd>
              <dt className="text-slate-400">First warning</dt>
              <dd className="text-right font-mono text-slate-100">{sim.summary.firstWarning === null ? "None" : clock(sim.summary.firstWarning)}</dd>
              <dt className="text-slate-400">Max flood depth</dt>
              <dd className="text-right font-mono text-slate-100">{sim.summary.maxDepth.toFixed(1)} m</dd>
              <dt className="text-slate-400">Max people at risk</dt>
              <dd className="text-right font-mono text-slate-100">{sim.summary.maxPopRisk.toLocaleString("en-IN")}</dd>
              <dt className="text-slate-400">Evacuated by end</dt>
              <dd className="text-right font-mono text-slate-100">{sim.summary.evacuatedPct}%</dd>
            </dl>
          </Panel>
        </aside>
      </div>

      <div className="border-t border-amber-400/20 bg-amber-500/5 px-4 py-3 sm:px-5">
        <p className="text-xs leading-5 text-amber-100/90">
          <strong>Demonstration only:</strong> All readings, rainfall and seismic scenarios, thresholds, communities and rule responses are simulated and illustrative. One animation second stands for 15 minutes of simulated time. The controls change only this model. Nothing here is connected to dam telemetry, PLC or SCADA, represents approved operating limits, or may be used to assess dam safety or operate real equipment.
        </p>
      </div>
    </section>
  );
}
