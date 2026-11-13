import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { latLngToVector3 } from "../lib/geo";
import type { InvestigationGeometry } from "./context";
import { geometryCenter } from "./context";

interface OrbitingSatellite {
  name: string;
  radius: number;
  inclination: number; // in radians
  nodeAngle: number;   // longitude of ascending node
  speed: number;
  phase: number;
  color: THREE.Color;
  group: THREE.Group;
  orbitLine: THREE.Line;
  spotlight: THREE.Mesh;
  beamCone: THREE.Mesh;
}

export class InvestigationGlobe {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private frame = 0;
  private satellites: OrbitingSatellite[] = [];
  private pulseRings: THREE.Mesh[] = [];
  private earthGroup = new THREE.Group();
  private isLoaded = false;
  private loaderEl: HTMLElement | null = null;

  constructor(parent: HTMLElement, geometry: InvestigationGeometry) {
    // 1. Loading Indicator Overlay
    this.loaderEl = document.createElement("div");
    this.loaderEl.className = "globe-loading-indicator";
    this.loaderEl.innerHTML = `
      <div class="globe-loader-spinner"></div>
      <div class="globe-loader-radar"></div>
    `;
    parent.append(this.loaderEl);

    // 2. Canvas
    const canvas = document.createElement("canvas");
    canvas.className = "investigation-globe__canvas";
    canvas.style.opacity = "0";
    canvas.style.transition = "opacity 0.4s ease-out";
    parent.append(canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x040914, 1);

    this.camera.position.set(0, 0.8, 2.9);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.35;
    this.controls.maxDistance = 5;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.35;

    this.scene.add(this.earthGroup);

    this.buildEarth();
    this.buildGraticuleMatrix();
    this.buildAtmosphere();
    this.buildAerospaceSatellites();
    this.buildTargetPinpoint(geometry);
    this.buildLighting();

    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize);
    this.resize();

    this.render = this.render.bind(this);
    this.render();

    // Mark loaded and fade in
    setTimeout(() => {
      this.isLoaded = true;
      canvas.style.opacity = "1";
      if (this.loaderEl) {
        this.loaderEl.style.opacity = "0";
        setTimeout(() => this.loaderEl?.remove(), 300);
      }
    }, 200);
  }

  private buildEarth(): void {
    const loader = new THREE.TextureLoader();
    const dayTexture = loader.load(
      "/textures/earth_daymap.jpg",
      () => {
        this.renderer.render(this.scene, this.camera);
      },
      undefined,
      () => {
        loader.load("/earth/day/blue-marble-july-2k.jpg", (tex) => {
          dayMaterial.map = tex;
          dayMaterial.needsUpdate = true;
        });
      }
    );

    // Deep Aerospace Earth (High Contrast White / Blue / Gray / Slate)
    const dayMaterial = new THREE.MeshStandardMaterial({
      map: dayTexture,
      roughness: 0.65,
      metalness: 0.15,
      color: 0xf8fafc,
    });

    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), dayMaterial);
    globe.name = "earth-surface";
    this.earthGroup.add(globe);
  }

  /**
   * Segmented Graticule Matrix (متقسمة)
   * High-tech latitude & longitude telemetry rings around the globe.
   */
  private buildGraticuleMatrix(): void {
    const graticuleGroup = new THREE.Group();
    graticuleGroup.name = "graticule-matrix";

    const standardMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
    });

    const majorMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.45,
    });

    const segments = 90;
    const r = 1.0025;

    // Latitude parallels (-75° to +75° every 15°)
    for (let latDeg = -75; latDeg <= 75; latDeg += 15) {
      const isMajor = latDeg === 0;
      const phi = (90 - latDeg) * (Math.PI / 180);
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const y = r * cosPhi;
      const ringR = r * sinPhi;

      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(ringR * Math.cos(theta), y, ringR * Math.sin(theta)));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geom, isMajor ? majorMat : standardMat);
      graticuleGroup.add(line);
    }

    // Longitude meridians (every 15°)
    for (let lonDeg = 0; lonDeg < 180; lonDeg += 15) {
      const isMajor = lonDeg === 0;
      const rad = lonDeg * (Math.PI / 180);

      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = r * Math.sin(theta) * Math.cos(rad);
        const y = r * Math.cos(theta);
        const z = r * Math.sin(theta) * Math.sin(rad);
        points.push(new THREE.Vector3(x, y, z));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geom, isMajor ? majorMat : standardMat);
      graticuleGroup.add(line);
    }

    this.earthGroup.add(graticuleGroup);
  }

  private buildAtmosphere(): void {
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.4);
          gl_FragColor = vec4(0.22, 0.74, 0.98, 1.0) * intensity * 0.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });

    const atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(1.04, 48, 36), atmoMat);
    this.scene.add(atmoMesh);
  }

  /**
   * NASA Aerospace Satellites & Ground Light Projections.
   * Palette: White, Silver/Gray, Black, Deep Blue, and Cyan only.
   * Distribution:
   * 1. Polar Orbit (North-South / "بالطول")
   * 2. Equatorial Orbit (East-West / "بالعرض")
   * 3. Inclined 55° (Oblique Mid-Latitude)
   * 4. Sun-Synchronous Retrograde 98°
   */
  private buildAerospaceSatellites(): void {
    const specs = [
      {
        name: "Polar Orbiter (Terra/Aqua)",
        radius: 1.28,
        inclinationDeg: 90, // Exactly Polar ("بالطول")
        nodeDeg: 25,
        speed: 0.006,
        phase: 0.5,
        colorHex: 0xffffff, // Crisp White
        lightColor: 0x38bdf8, // Cyan Beam
      },
      {
        name: "Equatorial Observer",
        radius: 1.38,
        inclinationDeg: 0, // Exactly Equatorial ("بالعرض")
        nodeDeg: 0,
        speed: 0.0045,
        phase: 2.2,
        colorHex: 0x93c5fd, // Light Blue
        lightColor: 0x0284c7, // Blue Beam
      },
      {
        name: "Mid-Inclination Orbiter",
        radius: 1.22,
        inclinationDeg: 52, // 52° Oblique
        nodeDeg: 120,
        speed: 0.0075,
        phase: 3.8,
        colorHex: 0xe2e8f0, // Silver
        lightColor: 0x38bdf8, // Cyan Beam
      },
      {
        name: "Retrograde Observer",
        radius: 1.32,
        inclinationDeg: 98.2, // 98.2° Retrograde
        nodeDeg: 220,
        speed: 0.0055,
        phase: 5.1,
        colorHex: 0xffffff, // Pure White
        lightColor: 0x60a5fa, // Sky Blue
      },
    ];

    specs.forEach((s) => {
      const incRad = (s.inclinationDeg * Math.PI) / 180;
      const nodeRad = (s.nodeDeg * Math.PI) / 180;
      const color = new THREE.Color(s.colorHex);
      const lightCol = new THREE.Color(s.lightColor);

      // 1. Orbital Path Ring (Dashed/Transparent Blue/Silver)
      const orbitPoints: THREE.Vector3[] = [];
      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const u = (i / segments) * Math.PI * 2;
        // Incline and rotate by node
        const x0 = s.radius * Math.cos(u);
        const y0 = s.radius * Math.sin(u) * Math.sin(incRad);
        const z0 = s.radius * Math.sin(u) * Math.cos(incRad);

        const x = x0 * Math.cos(nodeRad) - z0 * Math.sin(nodeRad);
        const y = y0;
        const z = x0 * Math.sin(nodeRad) + z0 * Math.cos(nodeRad);

        orbitPoints.push(new THREE.Vector3(x, y, z));
      }

      const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitLine = new THREE.Line(
        orbitGeom,
        new THREE.LineBasicMaterial({
          color: s.lightColor,
          transparent: true,
          opacity: 0.22,
        })
      );
      this.scene.add(orbitLine);

      // 2. Satellite 3D Body Group (Aerospace Silver/White/Slate)
      const satGroup = new THREE.Group();

      // Bus body (Aerospace Titanium / Silver)
      const bus = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.016, 0.02),
        new THREE.MeshStandardMaterial({
          color: 0xd1d5db, // Silver gray
          metalness: 0.9,
          roughness: 0.25,
        })
      );
      satGroup.add(bus);

      // Solar Panel Wings (Deep Navy / Blue Solar Cells with silver trim)
      const wings = new THREE.Mesh(
        new THREE.BoxGeometry(0.092, 0.002, 0.026),
        new THREE.MeshStandardMaterial({
          color: 0x091b3a, // Deep solar blue
          metalness: 0.5,
          roughness: 0.3,
        })
      );
      satGroup.add(wings);

      // Optical Beacon LED (White/Cyan)
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 12, 12),
        new THREE.MeshBasicMaterial({ color: s.colorHex })
      );
      beacon.position.y = 0.01;
      satGroup.add(beacon);

      // 3. Scanning Light Cone pointing from satellite to Earth (ضوء القمر الصناعي)
      const groundDistance = s.radius - 1.0;
      const coneGeom = new THREE.ConeGeometry(0.065, groundDistance, 24, 1, true);
      // Vertex is at (0, h/2, 0) and base is at (0, -h/2, 0)
      coneGeom.rotateX(Math.PI);
      coneGeom.translate(0, -groundDistance / 2, 0);

      const beamMat = new THREE.MeshBasicMaterial({
        color: s.lightColor,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beamCone = new THREE.Mesh(coneGeom, beamMat);
      satGroup.add(beamCone);

      this.scene.add(satGroup);

      // 4. Ground Spotlight / Footprint illuminating the Earth (ضوء على الأرض)
      const spotGeom = new THREE.RingGeometry(0.025, 0.065, 32);
      const spotMat = new THREE.MeshBasicMaterial({
        color: s.lightColor,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const spotlight = new THREE.Mesh(spotGeom, spotMat);
      this.earthGroup.add(spotlight);

      this.satellites.push({
        name: s.name,
        radius: s.radius,
        inclination: incRad,
        nodeAngle: nodeRad,
        speed: s.speed,
        phase: s.phase,
        color,
        group: satGroup,
        orbitLine,
        spotlight,
        beamCone,
      });
    });
  }

  /**
   * Selected Study Location Pinpoint on Globe.
   */
  private buildTargetPinpoint(geometry: InvestigationGeometry): void {
    const center = geometryCenter(geometry);
    const pos = latLngToVector3(center.lat, center.lon, 1.002);
    const normal = pos.clone().normalize();

    // 1. High-Tech Pin Beam
    const pinHeight = 0.16;
    const pinGeom = new THREE.CylinderGeometry(0.0035, 0.0035, pinHeight, 12);
    pinGeom.translate(0, pinHeight / 2, 0);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const pin = new THREE.Mesh(pinGeom, pinMat);

    pin.position.copy(pos);
    pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    this.earthGroup.add(pin);

    // 2. Beacon Head Sphere (Cyan / White)
    const beaconSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    beaconSphere.position.copy(pos.clone().add(normal.clone().multiplyScalar(pinHeight)));
    this.earthGroup.add(beaconSphere);

    // 3. Surface Radar Rings
    for (let i = 0; i < 2; i++) {
      const ringGeom = new THREE.RingGeometry(0.018, 0.042, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.position.copy(pos.clone().add(normal.clone().multiplyScalar(0.003)));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      ring.userData = { phase: i * Math.PI };
      this.earthGroup.add(ring);
      this.pulseRings.push(ring);
    }

    // Orient camera towards target
    const camTarget = pos.clone().multiplyScalar(2.65);
    this.camera.position.set(camTarget.x, camTarget.y + 0.35, camTarget.z);
    this.controls.target.set(0, 0, 0);
  }

  private buildLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(4, 3, 5);
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rim.position.set(-4, -2, -4);
    this.scene.add(rim);
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    this.controls.dispose();
    this.renderer.dispose();
    this.loaderEl?.remove();
  }

  private resize(): void {
    const canvas = this.renderer.domElement;
    const parent = canvas.parentElement;
    if (!parent) return;
    const { width, height } = parent.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    this.camera.aspect = Math.max(1, width) / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  private render(): void {
    this.frame = requestAnimationFrame(this.render);

    const time = performance.now() * 0.001;

    // Advance and orient satellites, light beams, and ground spotlights
    this.satellites.forEach((sat) => {
      const u = sat.phase + time * sat.speed * 60;

      // Incline and rotate by node
      const x0 = sat.radius * Math.cos(u);
      const y0 = sat.radius * Math.sin(u) * Math.sin(sat.inclination);
      const z0 = sat.radius * Math.sin(u) * Math.cos(sat.inclination);

      const x = x0 * Math.cos(sat.nodeAngle) - z0 * Math.sin(sat.nodeAngle);
      const y = y0;
      const z = x0 * Math.sin(sat.nodeAngle) + z0 * Math.cos(sat.nodeAngle);

      sat.group.position.set(x, y, z);

      // Orient satellite body facing forward and nadir down
      const pos = new THREE.Vector3(x, y, z);
      const down = pos.clone().negate().normalize();
      sat.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);

      // Position the spotlight on the ground directly beneath satellite (surface radius ~ 1.002)
      const groundPos = pos.clone().normalize().multiplyScalar(1.002);
      sat.spotlight.position.copy(groundPos);
      sat.spotlight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), groundPos.clone().normalize());

      // Pulse spotlight opacity
      const spotPulse = 0.35 + 0.2 * Math.sin(time * 3 + sat.phase);
      (sat.spotlight.material as THREE.MeshBasicMaterial).opacity = spotPulse;
    });

    // Pulse target radar rings
    this.pulseRings.forEach((ring) => {
      const p = (time * 2 + ring.userData.phase) % (Math.PI * 2);
      const scale = 1 + (p / (Math.PI * 2)) * 2.2;
      const opacity = Math.max(0, 0.7 - p / (Math.PI * 2));
      ring.scale.set(scale, scale, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = opacity;
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
