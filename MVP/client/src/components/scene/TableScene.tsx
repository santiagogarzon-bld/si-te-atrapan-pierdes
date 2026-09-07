import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Card, PlayerView, RoomView } from "../../types";

interface Props {
  game?: PlayerView | null;
  room?: RoomView | null;
  reducedMotion: boolean;
  view: "home" | "lobby" | "game";
  resetKey: number;
}
const colors = [
  "#e99452",
  "#a4aaa9",
  "#e7bb78",
  "#b393c9",
  "#84ab8d",
  "#d98083",
];
const previewPlayers = ["Zorro", "Mapache", "Oso", "Conejo"].map((name, i) => ({
  playerId: `preview-${i}`,
  name,
  connected: true,
}));

export function TableScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute(
      "aria-label",
      "Mesa 3D con personajes del bosque. Arrastra para girar la cámara.",
    );
    renderer.domElement.setAttribute("role", "img");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.18;
    controls.minAzimuthAngle = -0.65;
    controls.maxAzimuthAngle = 0.65;
    const reset = () => {
      camera.position.set(0, 8.7, 12.5);
      controls.target.set(0, 1.1, 0);
      controls.update();
    };
    reset();
    scene.add(new THREE.HemisphereLight(0xe3f7ed, 0x7e6954, 2));
    const sun = new THREE.DirectionalLight(0xffe4ba, 3);
    sun.position.set(-4, 10, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -9,
      right: 9,
      top: 9,
      bottom: -9,
      near: 0.5,
      far: 30,
    });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.035;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xc1eee5, 2);
    rim.position.set(5, 5, -4);
    scene.add(rim);
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    const mat = (color: string) => {
      if (!materials.has(color))
        materials.set(
          color,
          new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
        );
      return materials.get(color)!;
    };
    const mesh = (
      geometry: THREE.BufferGeometry,
      color: string,
      parent: THREE.Object3D,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      const m = new THREE.Mesh(geometry, mat(color));
      m.position.set(x, y, z);
      m.castShadow = true;
      m.receiveShadow = true;
      parent.add(m);
      return m;
    };
    const ball = (
      parent: THREE.Object3D,
      color: string,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy = sx,
      sz = sx,
    ) => {
      const m = mesh(
        new THREE.SphereGeometry(1, 20, 14),
        color,
        parent,
        x,
        y,
        z,
      );
      m.scale.set(sx, sy, sz);
      return m;
    };
    const box = (
      parent: THREE.Object3D,
      color: string,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      radius = 0.06,
    ) =>
      mesh(new RoundedBoxGeometry(w, h, d, 3, radius), color, parent, x, y, z);
    const cylinder = (
      parent: THREE.Object3D,
      color: string,
      radius: number,
      height: number,
      x: number,
      y: number,
      z: number,
    ) =>
      mesh(
        new THREE.CylinderGeometry(radius, radius, height, 64),
        color,
        parent,
        x,
        y,
        z,
      );

    // A hand-built diorama: all assets are geometry, with no external downloads.
    cylinder(scene, "#b6c9a1", 6.15, 0.36, 0, -0.26, 0);
    cylinder(scene, "#d4d8b0", 5.98, 0.08, 0, -0.04, 0);
    const floor = mesh(
      new THREE.PlaneGeometry(200, 200),
      "#dce6d4",
      scene,
      0,
      -0.47,
      0,
    );
    floor.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 11; i++) {
      const angle = (i / 10) * Math.PI * 1.1 + Math.PI * 0.43;
      const x = Math.cos(angle) * (5.4 + (i % 2) * 0.4),
        z = Math.sin(angle) * 5.5;
      if (z > 2.2) continue;
      const tree = new THREE.Group();
      tree.position.set(x, 0, z);
      scene.add(tree);
      const size = 0.85 + (i % 3) * 0.23;
      cylinder(tree, "#8f7458", 0.15, 1.3, 0, 0.6, 0);
      for (let j = 0; j < 3; j++)
        mesh(
          new THREE.ConeGeometry((1.1 - j * 0.23) * size, 1.4 * size, 7),
          ["#789b7f", "#8aaf8d", "#a1bd91"][j],
          tree,
          0,
          1.2 + j * 0.66 * size,
          0,
        );
    }
    for (let i = 0; i < 28; i++) {
      const angle = i * 2.4,
        radius = 4.6 + Math.sin(i * 7) * 0.65;
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius;
      ball(
        scene,
        i % 3 ? "#a8bb8b" : "#e4dbc0",
        x,
        0.06,
        z,
        0.16 + (i % 3) * 0.05,
        0.1,
        0.19,
      );
      if (i % 4 === 0) {
        cylinder(scene, "#eee1c4", 0.045, 0.22, x + 0.2, 0.12, z);
        ball(scene, "#d88361", x + 0.2, 0.25, z, 0.17, 0.09, 0.17);
      }
    }
    cylinder(scene, "#74604b", 0.55, 1.25, 0, 0.63, 0);
    for (let i = 0; i < 4; i++) {
      const leg = box(scene, "#8f6a47", 0, 0.35, 0, 0.28, 0.3, 3.1);
      leg.rotation.y = (i * Math.PI) / 2;
    }
    cylinder(scene, "#876044", 2.95, 0.24, 0, 1.42, 0);
    cylinder(scene, "#c1915d", 3, 0.19, 0, 1.6, 0);
    cylinder(scene, "#386e60", 2.72, 0.07, 0, 1.73, 0);
    const trim = mesh(
      new THREE.TorusGeometry(2.48, 0.014, 6, 120),
      "#89ab87",
      scene,
      0,
      1.772,
      0,
    );
    trim.rotation.x = Math.PI / 2;
    // Inlaid table emblem.
    const emblem = mesh(
      new THREE.RingGeometry(0.55, 0.57, 64),
      "#82a68a",
      scene,
      0,
      1.774,
      0,
    );
    emblem.rotation.x = -Math.PI / 2;
    const textures: THREE.Texture[] = [];
    function cardTexture(card?: Card) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 352;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = card ? "#fff5dc" : "#ce714a";
      ctx.fillRect(0, 0, 256, 352);
      ctx.strokeStyle = card ? "#d3bfa0" : "#f5cca1";
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, 228, 324);
      ctx.fillStyle = card?.type === "B" ? "#397e78" : "#b95a3c";
      if (card) {
        const value = card.type === "NUMBER" ? String(card.value) : card.type;
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(value, 28, 58);
        ctx.save();
        ctx.translate(228, 294);
        ctx.rotate(Math.PI);
        ctx.fillText(value, 0, 0);
        ctx.restore();
        ctx.textAlign = "center";
        ctx.font = "bold 108px Georgia";
        ctx.fillText(value, 128, 212);
      } else {
        ctx.strokeStyle = "#f5cca1";
        ctx.save();
        ctx.translate(128, 176);
        ctx.rotate(Math.PI / 4);
        ctx.strokeRect(-56, -56, 112, 112);
        ctx.restore();
        ctx.fillStyle = "#fff0c8";
        ctx.font = "bold 55px Georgia";
        ctx.textAlign = "center";
        ctx.fillText("LT", 128, 195);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture);
      return texture;
    }
    const backTexture = cardTexture();
    const backMaterial = new THREE.MeshStandardMaterial({
      map: backTexture,
      roughness: 0.85,
    });
    function cardModel(parent: THREE.Object3D, faceMaterial = backMaterial) {
      const group = new THREE.Group();
      parent.add(group);
      box(group, "#f1e2c5", 0, 0, 0, 0.53, 0.025, 0.75, 0.035);
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(0.49, 0.71),
        faceMaterial,
      );
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.015;
      group.add(face);
      return group;
    }
    const deck = new THREE.Group();
    deck.position.set(-0.72, 1.8, 0.05);
    deck.rotation.y = -0.16;
    scene.add(deck);
    for (let i = 0; i < 7; i++) cardModel(deck).position.y = i * 0.023;
    const topMaterial = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    const top = cardModel(scene, topMaterial);
    top.position.set(0.5, 1.81, 0.1);
    top.rotation.y = 0.14;
    const chipColors = ["#e6b66a", "#c67454", "#edd8ac"];
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3 + i; j++)
        cylinder(
          scene,
          chipColors[i],
          0.105,
          0.04,
          1.5 + i * 0.23,
          1.8 + j * 0.043,
          0.1 + i * 0.18,
        );
    const mug = cylinder(scene, "#eadfc3", 0.18, 0.32, -1.5, 1.93, -0.45);
    cylinder(scene, "#634735", 0.145, 0.015, -1.5, 2.1, -0.45);
    const handle = mesh(
      new THREE.TorusGeometry(0.12, 0.045, 8, 16),
      "#eadfc3",
      scene,
      -1.72,
      1.95,
      -0.45,
    );
    handle.rotation.y = Math.PI / 2;
    mug.castShadow = true;

    const actors: {
      group: THREE.Group;
      body: THREE.Group;
      head: THREE.Group;
      hand: THREE.Group;
      ring: THREE.Mesh;
      cards: THREE.Group[];
      label: HTMLDivElement;
      eyes: THREE.Mesh[];
      id: string;
    }[] = [];
    for (let index = 0; index < 6; index++) {
      const group = new THREE.Group();
      scene.add(group);
      const color = colors[index];
      cylinder(group, "#9a7854", 0.51, 0.17, 0, 0.65, 0);
      for (const x of [-0.32, 0.32])
        for (const z of [-0.25, 0.25])
          box(group, "#8d6a4a", x, 0.3, z, 0.11, 0.6, 0.11);
      const body = new THREE.Group();
      group.add(body);
      ball(body, color, 0, 1.15, 0, 0.46, 0.62, 0.38);
      ball(body, "#f5deba", 0, 1.17, 0.31, 0.3, 0.39, 0.1);
      for (const x of [-0.25, 0.25])
        ball(body, color, x, 0.72, 0.33, 0.19, 0.17, 0.29);
      const head = new THREE.Group();
      head.position.y = 2.02;
      body.add(head);
      ball(head, color, 0, 0, 0, 0.61, 0.55, 0.48);
      if (index === 2) {
        for (const x of [-0.42, 0.42]) {
          ball(head, color, x, 0.39, -0.01, 0.22);
          ball(head, "#d19565", x, 0.4, 0.15, 0.12, 0.12, 0.035);
        }
      } else if (index === 3) {
        for (const x of [-0.28, 0.28]) {
          const ear = ball(head, color, x, 0.65, -0.03, 0.17, 0.5, 0.15);
          ear.rotation.z = x * -0.5;
          ball(head, "#e3bad0", x, 0.71, 0.09, 0.08, 0.31, 0.04);
        }
      } else {
        for (const x of [-0.4, 0.4]) {
          const ear = mesh(
            new THREE.ConeGeometry(0.24, 0.54, 3),
            color,
            head,
            x,
            0.45,
            0,
          );
          ear.rotation.z = x * -0.5;
          mesh(
            new THREE.ConeGeometry(0.125, 0.3, 3),
            "#e9c6a5",
            head,
            x,
            0.46,
            0.1,
          );
        }
      }
      if (index === 1)
        for (const x of [-0.25, 0.25]) {
          const patch = ball(head, "#53575a", x, 0.01, 0.4, 0.25, 0.2, 0.09);
          patch.rotation.z = x;
        }
      ball(head, "#f6e3c6", 0, -0.18, 0.4, 0.35, 0.22, 0.2);
      ball(head, "#343c35", 0, -0.09, 0.6, 0.1, 0.075, 0.065);
      const eyes = [-0.23, 0.23].map((x) => {
        const eye = ball(head, "#293d35", x, 0.055, 0.462, 0.065, 0.085, 0.055);
        ball(head, "#ffffff", x - 0.015, 0.081, 0.506, 0.019);
        return eye;
      });
      for (const x of [-0.37, 0.37])
        ball(head, "#dd9a83", x, -0.13, 0.438, 0.1, 0.048, 0.035);
      box(
        body,
        ["#527f75", "#dba951", "#a66954", "#6e849a", "#d2a552", "#738f77"][
          index
        ],
        0,
        1.64,
        0.1,
        0.83,
        0.16,
        0.65,
        0.07,
      );
      const hand = new THREE.Group();
      hand.position.set(0, 1.8, 0.45);
      body.add(hand);
      for (const x of [-0.4, 0.4]) {
        const arm = ball(hand, color, x, 0, 0.12, 0.17, 0.3, 0.17);
        arm.rotation.z = x * 1.2;
      }
      const cards: THREE.Group[] = [];
      for (let i = 0; i < 5; i++) {
        const card = cardModel(hand);
        card.position.set((i - 1) * 0.16, 0.02, 0.24 + Math.abs(i - 1) * 0.04);
        card.rotation.set(1.03, 0, (i - 1) * -0.19);
        card.scale.setScalar(0.62);
        cards.push(card);
      }
      const ring = mesh(
        new THREE.TorusGeometry(0.72, 0.035, 8, 48),
        "#ffce78",
        group,
        0,
        0.06,
        0,
      );
      ring.rotation.x = Math.PI / 2;
      const label = document.createElement("div");
      label.className = "scene-name";
      host.appendChild(label);
      actors.push({
        group,
        body,
        head,
        hand,
        ring,
        cards,
        label,
        eyes,
        id: "",
      });
    }
    const sparkGeometry = new THREE.BufferGeometry();
    const sparks = new Float32Array(90);
    for (let i = 0; i < 90; i++)
      sparks[i] = Math.sin(i * 73.1) * (i % 3 === 1 ? 1.2 : 5);
    sparkGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(sparks, 3),
    );
    const sparkMaterial = new THREE.PointsMaterial({
      color: "#fff6bd",
      size: 0.045,
      transparent: true,
      opacity: 0.7,
    });
    const particles = new THREE.Points(sparkGeometry, sparkMaterial);
    particles.position.y = 2;
    scene.add(particles);
    let lastRoster = "",
      lastCard = "",
      lastReset = -1,
      lastEvent = "",
      flightStart = -10;
    const flightOrigin = new THREE.Vector3();
    const projection = new THREE.Vector3();
    let width = 1,
      height = 1;
    const resize = () => {
      width = host.clientWidth;
      height = host.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.fov = width / height < 0.85 ? 46 : 36;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    let lastFrame = 0,
      lastShadow = 0;
    renderer.setAnimationLoop((ms) => {
      if (document.hidden || ms - lastFrame < 1000 / 30) return;
      lastFrame = ms;
      if (ms - lastShadow > 120) {
        renderer.shadowMap.needsUpdate = true;
        lastShadow = ms;
      }
      const p = latest.current,
        time = ms / 1000;
      const roster = p.game?.players ?? p.room?.players ?? previewPlayers;
      const rosterKey = `${p.view}:${roster.map((player) => player.playerId).join()}`;
      if (p.resetKey !== lastReset) {
        reset();
        lastReset = p.resetKey;
      }
      if (rosterKey !== lastRoster) {
        lastRoster = rosterKey;
        actors.forEach((actor, i) => {
          const player = roster[i];
          actor.group.visible = !!player;
          actor.label.hidden = !player;
          if (!player) return;
          actor.id = player.playerId;
          const selfIndex = p.game
            ? roster.findIndex(
                (player) => player.playerId === p.game!.self.playerId,
              )
            : 0;
          const angle =
            (p.game ? 0 : Math.PI) +
            ((i - Math.max(0, selfIndex)) / roster.length) * Math.PI * 2 +
            (p.view === "home" ? 0.25 : 0);
          actor.group.position.set(
            Math.sin(angle) * 3.55,
            0,
            Math.cos(angle) * 3.55,
          );
          actor.group.rotation.y = angle + Math.PI;
          actor.label.textContent =
            player.name +
            (p.game?.self.playerId === player.playerId ? " · tú" : "");
        });
      }
      const card = p.game?.game.topCard ?? {
        id: "preview",
        type: "NUMBER" as const,
        value: 7,
      };
      if (card.id !== lastCard) {
        lastCard = card.id;
        const old = topMaterial.map;
        topMaterial.map = cardTexture(card);
        topMaterial.needsUpdate = true;
        if (old) {
          old.dispose();
          textures.splice(textures.indexOf(old), 1);
        }
      }
      top.visible = !p.game || !!p.game.game.topCard;
      deck.visible = !p.game || p.game.game.deckCount > 0;
      const log = p.game?.game.publicLog;
      const event = log?.[log.length - 1];
      const eventKey = event ? `${log!.length}:${JSON.stringify(event)}` : "";
      if (eventKey !== lastEvent) {
        if (lastEvent && event?.type === "CARD_PLAYED") {
          const actor = actors.find((a) => a.id === event.playerId);
          flightOrigin.copy(actor?.group.position ?? new THREE.Vector3());
          flightOrigin.y = 2;
          flightStart = time;
        }
        lastEvent = eventKey;
      }
      const progress = p.reducedMotion
        ? 1
        : Math.min(1, (time - flightStart) / 0.65);
      const ease = 1 - Math.pow(1 - progress, 3);
      top.position.lerpVectors(
        flightOrigin,
        new THREE.Vector3(0.5, 1.81, 0.1),
        ease,
      );
      top.position.y += Math.sin(progress * Math.PI) * 1.6;
      top.rotation.y = 0.14 + (1 - ease) * 2;
      actors.forEach((actor, i) => {
        const player = roster[i];
        if (!player) return;
        const current = p.game
          ? p.game.game.currentPlayerId === player.playerId
          : p.view === "home" && i === 0;
        const alive = !("alive" in player) || Boolean(player.alive);
        actor.ring.visible = current;
        actor.body.position.y = alive
          ? p.reducedMotion
            ? 0
            : Math.sin(time * 1.9 + i * 1.7) * 0.025
          : -0.35;
        actor.head.rotation.z = p.reducedMotion
          ? 0
          : Math.sin(time * 0.85 + i * 2) * 0.045;
        actor.hand.rotation.x = p.reducedMotion
          ? 0
          : Math.sin(time * 1.5 + i) * 0.045;
        const blink = !p.reducedMotion && (time + i * 1.3) % 4.5 < 0.13;
        actor.eyes.forEach((eye) => {
          eye.scale.y = blink ? 0.01 : 0.085;
        });
        actor.cards.forEach((c, n) => {
          c.visible =
            alive && n < ("handCount" in player ? Number(player.handCount) : 3);
        });
        projection.copy(actor.group.position);
        projection.y = 3.15;
        projection.project(camera);
        actor.label.style.transform = `translate(-50%, -50%) translate(${(projection.x * 0.5 + 0.5) * width}px, ${(-projection.y * 0.5 + 0.5) * height}px)`;
        actor.label.className = `scene-name ${current ? "active" : ""} ${!player.connected || !alive ? "away" : ""}`;
        actor.label.hidden = p.view === "home";
      });
      if (!p.reducedMotion) particles.rotation.y = time * 0.025;
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener(
        "webglcontextlost",
        onContextLost,
      );
      const geometries = new Set<THREE.BufferGeometry>();
      const allMaterials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => allMaterials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      allMaterials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      actors.forEach((a) => a.label.remove());
    };
  }, []);
  return (
    <div className={`table-scene scene-${props.view}`} ref={mount}>
      {failed && (
        <div className="scene-fallback">
          <span>♠</span>
          <strong>La mesa está lista</strong>
          <p>
            La vista 3D requiere WebGL 2. Puedes seguir jugando con los
            controles de cartas.
          </p>
        </div>
      )}
    </div>
  );
}
