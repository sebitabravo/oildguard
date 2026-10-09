import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import * as THREE from "three";
import { t, type DictKey, useLang } from "../../i18n";
import { createStage } from "../../twin/render/stage";
import { createMaterials } from "../../twin/render/materials";
import { createLabel, setLabelActive, setLabelText } from "../../twin/render/labels";
import { build930E, type AnchorName, type Truck930E } from "../../twin/truck930e/build930E";
import { wheelOmega } from "../../twin/truck930e/spec";
import { buildPit, type PitBuild } from "../../twin/pit/buildPit";
import { buildShovel } from "../../twin/pit/shovel";
import { createDust } from "../../twin/pit/dust";
import { getFleetStore, getPitWorld, normalizeMineCam, readMineUrl } from "./mineWorld";
import { HAUL_STATE_CSS, type HaulState } from "./cycle";
import type { PlmState, TruckTick } from "../../twin/fleet/fleetSim";
import { buildMineHudStatus, buildMineHudTitle, buildMineSceneLabelText, type MineSceneLabelId } from "./mineSceneCopy";
import { buildMineSceneAccessibilityCopy } from "../sceneAccessibility";
import { useThrottledSceneAccessibility } from "../useThrottledSceneAccessibility";

interface TruckSceneProps {
  paused: boolean;
  stepTick: number;
  onPhase: (state: PlmState) => void;
  dock?: ComponentChildren;
  badge?: ComponentChildren;
}

type CamPreset = "pit" | "hero" | "cab" | "side" | "wheel" | "chase" | "shovel" | "crusher" | "ramp" | "free";
type Vec3 = [number, number, number];
type FleetTruckModel = { id: string; model: Truck930E; ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial> };

const CAM_PRESETS: CamPreset[] = ["pit", "hero", "cab", "side", "wheel", "chase", "shovel", "crusher", "ramp"];
const CAM_LABEL_KEYS: Record<CamPreset, DictKey> = {
  pit: "mine.camera.pit",
  hero: "mine.camera.hero",
  cab: "mine.camera.cab",
  side: "mine.camera.side",
  wheel: "mine.camera.wheel",
  chase: "mine.camera.chase",
  shovel: "mine.camera.shovel",
  crusher: "mine.camera.crusher",
  ramp: "mine.camera.ramp",
  free: "mine.camera.free",
};

function haulState(state: PlmState): HaulState {
  if (state === "loading") return "LOAD";
  if (state === "hauling" || state === "maneuvering" || state === "final_zone") return "HAUL";
  if (state === "dumping") return "DUMP";
  return "WAIT";
}

function selectedTick(trucks: TruckTick[], selectedId: string | null): TruckTick | undefined {
  return trucks.find((truck) => truck.id === selectedId) ?? trucks[0];
}

function selectedCam(raw: string | null): CamPreset {
  const camera = normalizeMineCam(raw);
  return camera && camera !== "custom" ? camera : "pit";
}

export default function TruckScene({ paused, stepTick, onPhase, dock, badge }: TruckSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const pendingStepRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const onPhaseRef = useRef(onPhase);
  onPhaseRef.current = onPhase;
  const [lang] = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  const urlRef = useRef<ReturnType<typeof readMineUrl> | null>(null);
  if (!urlRef.current) urlRef.current = readMineUrl();
  const url = urlRef.current;
  const [presetUi, setPresetUi] = useState<CamPreset>(() => selectedCam(url.cam));
  const presetRef = useRef<CamPreset>(selectedCam(url.cam));
  const setPreset = (preset: CamPreset) => {
    presetRef.current = preset;
    setPresetUi(preset);
  };
  const [hud, setHud] = useState({ state: "empty" as PlmState, selected: "OG-03", trucks: 5, queued: 0, recal: false, onGrade: false, cycle: 0 });
  const accessibilityCopy = buildMineSceneAccessibilityCopy(
    { truckId: hud.selected, state: hud.state, cycle: hud.cycle },
    lang,
  );
  const publishedAccessibilityCopy = useThrottledSceneAccessibility(accessibilityCopy);

  useEffect(() => {
    if (stepTick > 0) pendingStepRef.current += 1;
  }, [stepTick]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const fleet = getFleetStore();
    fleet.setPaused(pausedRef.current);
    const world = getPitWorld(url.seed);
    const stage = createStage(host, {
      preset: "outdoor",
      cameraPosition: [80, 305, 515],
      cameraTarget: [80, -35, 15],
      near: 0.5,
      far: 7000,
      sun: { shadowBox: 700, target: [0, 0, 0] },
      fog: { density: 0.00032, color: 0xcdbb9c },
      minDistance: 12,
      maxDistance: 1600,
      maxPolarAngle: Math.PI * 0.49,
    });
    const { scene, camera, controls, sun, renderer } = stage;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", accessibilityCopy.label);
    renderer.domElement.setAttribute("aria-describedby", "mine-scene-description");
    scene.environmentIntensity = 0.42;
    const mats = createMaterials();
    const pit: PitBuild = buildPit(mats, world);
    scene.add(pit.group);
    const shovel = buildShovel(mats);
    shovel.group.position.set(world.shovel.pos[0], -45, world.shovel.pos[1]);
    scene.add(shovel.group);
    const dust = createDust(700, 0xb9a785);
    scene.add(dust.points);

    let freeCamera = false;
    const onControlStart = () => {
      if (!freeCamera) {
        freeCamera = true;
        setPreset("free");
      }
    };
    controls.addEventListener("start", onControlStart);

    const trucks: FleetTruckModel[] = [];
    for (let i = 0; i < 5; i++) {
      const id = `OG-${String(i + 1).padStart(2, "0")}`;
      const model = build930E(mats);
      model.group.name = `FleetTruck-${id}`;
      scene.add(model.group);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x2fbf71, transparent: true, opacity: 0.44, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(9.2, 9.9, 48), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(3.2, 0.12, 0);
      model.group.add(ring);
      trucks.push({ id, model, ring });
    }

    const interestLabels = [
      { id: "shovel", pos: pit.anchors.shovel.clone().add(new THREE.Vector3(0, 20, 0)) },
      { id: "crusher", pos: pit.anchors.crusher.clone().add(new THREE.Vector3(0, 20, 0)) },
      { id: "ramp", pos: pit.anchors.rampMid.clone().add(new THREE.Vector3(0, 9, 0)) },
    ] satisfies { id: MineSceneLabelId; pos: THREE.Vector3 }[];
    const labelledInterest = interestLabels.map((item) => {
      const label = createLabel({ text: buildMineSceneLabelText(item.id, langRef.current), tone: "accent" });
      label.name = item.id;
      label.position.copy(item.pos);
      scene.add(label);
      return { ...item, label };
    });

    let lastPlm: PlmState | null = null;
    let lastSelected = "";
    let lastState = "";
    let frameCount = 0;
    const camGoal = new THREE.Vector3();
    const targetGoal = new THREE.Vector3();
    const scratch = new THREE.Vector3();
    const focusAnchor: AnchorName = "cab";
    const liveInitial = fleet.live();
    const initialSelected = selectedTick(liveInitial.trucks, fleet.getSnapshot().selectedId);
    if (initialSelected) onPhaseRef.current(initialSelected.plm);

    const stopFrame = stage.onFrame((dt) => {
      if (pausedRef.current !== fleet.getSnapshot().paused) fleet.setPaused(pausedRef.current);
      if (pendingStepRef.current > 0) {
        fleet.step(pendingStepRef.current);
        pendingStepRef.current = 0;
      } else {
        fleet.tick(dt);
      }
      const snapshot = fleet.live();
      const selectedId = fleet.getSnapshot().selectedId;
      const selected = selectedTick(snapshot.trucks, selectedId);
      if (selected) {
        const selectionChanged = selected.id !== lastSelected;
        const stateChanged = selected.plm !== lastPlm;
        if (stateChanged || selectionChanged) {
          lastPlm = selected.plm;
          lastSelected = selected.id;
          onPhaseRef.current(selected.plm);
        }
        if (stateChanged || selectionChanged || selected.plm !== lastState) {
          lastState = selected.plm;
          setHud({ state: selected.plm, selected: selected.id, trucks: snapshot.trucks.length, queued: snapshot.queued, recal: selected.recal, onGrade: selected.onGrade, cycle: selected.cycles });
        } else {
          setHud((previous) => {
            if (previous.recal === selected.recal && previous.onGrade === selected.onGrade && previous.queued === snapshot.queued && previous.cycle === selected.cycles) return previous;
            return { ...previous, recal: selected.recal, onGrade: selected.onGrade, queued: snapshot.queued, cycle: selected.cycles };
          });
        }
      }

      const liveIds = new Set(snapshot.trucks.map((truck) => truck.id));
      for (const truck of trucks) {
        const tick = snapshot.trucks.find((item) => item.id === truck.id);
        if (!tick || !liveIds.has(truck.id)) continue;
        const rig = truck.model.group;
        rig.position.set(tick.x, tick.y, tick.z);
        rig.rotation.order = "YXZ";
        rig.rotation.set((tick.pitchDeg * Math.PI) / 180, tick.heading, 0, "YXZ");
        rig.updateMatrixWorld(true);
        truck.model.setBodyTilt(tick.tiltDeg);
        truck.model.setPayload(tick.payloadFrac);
        truck.model.setSteer(tick.steer);
        truck.model.setWheelSpin(wheelOmega(tick.speedMps));
        truck.model.setModeTint(tick.recal ? "rest" : "moving");
        truck.model.advance(dt);
        truck.ring.material.color.setHex(tick.recal ? 0x2fbf71 : tick.onGrade ? 0xf5a623 : 0x3a7bd5);
        const headingX = Math.cos(tick.heading);
        const headingZ = -Math.sin(tick.heading);
        if (tick.speedMps > 2) {
          scratch.set(tick.x - headingX * 3.4, tick.y + 0.1, tick.z - headingZ * 3.4);
          dust.emit(scratch, new THREE.Vector3(-headingX * 1.3, 0, -headingZ * 1.3), Math.max(1, Math.floor(dt * 7)), Math.min(0.25, tick.speedMps / 55));
        }
      }
      dust.update(dt);
      if (snapshot.shovel.truckId) {
        const phase = snapshot.shovel.swing;
        shovel.setCycle(phase, world.shovel.yawPile, world.shovel.yawTruck);
      } else {
        shovel.setCycle((snapshot.clockS % 18) / 18, world.shovel.yawPile, world.shovel.yawTruck);
      }

      if (barRef.current && selected) {
        const progress = selected.plm === "loading" ? snapshot.shovel.swing : selected.plm === "dumping" ? Math.min(1, selected.tiltDeg / 45) : 0;
        barRef.current.style.width = `${Math.round(progress * 100)}%`;
      }
      for (const item of labelledInterest) {
        setLabelText(item.label, buildMineSceneLabelText(item.id, langRef.current));
        setLabelActive(item.label, item.id === "shovel" ? snapshot.shovel.truckId !== null : item.id === "crusher" ? snapshot.crusherTruckId !== null : false);
      }

      const preset = presetRef.current;
      if (preset !== "free") {
        targetGoal.set(0, -45, 0);
        let cameraOffset: Vec3 = [0, 330, 480];
        if (preset === "hero" || preset === "chase" || preset === "cab" || preset === "side" || preset === "wheel") {
          const model = trucks.find((entry) => entry.id === (selected?.id ?? "OG-03")) ?? trucks[2];
          if (preset === "cab") model.model.getAnchors()[focusAnchor].getWorldPosition(targetGoal);
          else if (preset === "wheel") model.model.getAnchors().rearRightWheelMotor.getWorldPosition(targetGoal);
          else targetGoal.copy(model.model.group.position).add(new THREE.Vector3(4, 4, 0));
          cameraOffset = preset === "side" ? [5, 24, -46] : preset === "wheel" ? [-12, 7, 14] : preset === "cab" ? [13, 7, -11] : [27, 22, -30];
          scratch.set(...cameraOffset).applyAxisAngle(new THREE.Vector3(0, 1, 0), selected?.heading ?? 0);
          camGoal.copy(targetGoal).add(scratch);
        } else if (preset === "shovel") {
          targetGoal.copy(pit.anchors.shovel);
          camGoal.copy(targetGoal).add(new THREE.Vector3(70, 54, 85));
        } else if (preset === "crusher") {
          targetGoal.copy(pit.anchors.crusher);
          camGoal.copy(targetGoal).add(new THREE.Vector3(70, 68, 80));
        } else if (preset === "ramp") {
          targetGoal.copy(pit.anchors.rampMid);
          camGoal.copy(targetGoal).add(new THREE.Vector3(230, 160, 245));
        } else {
          targetGoal.copy(pit.anchors.pitCenter).add(new THREE.Vector3(80, 10, 15));
          camGoal.copy(targetGoal).add(new THREE.Vector3(0, 330, 500));
        }
        const blend = 1 - Math.exp(-3.2 * dt);
        camera.position.lerp(camGoal, blend);
        controls.target.lerp(targetGoal, blend);
      }

      sun.target.position.copy(selected ? new THREE.Vector3(selected.x, 0, selected.z) : pit.anchors.pitCenter);
      sun.position.set(sun.target.position.x + 260, 420, sun.target.position.z + 190);
      sun.target.updateMatrixWorld();
      frameCount += 1;
      if (url.debug && frameCount > 2 && debugRef.current) {
        const info = renderer.info.render;
        const text = `trucks ${snapshot.trucks.length} · calls ${info.calls} · triangles ${info.triangles} · terrain ${pit.stats.terrainTriangles}`;
        if (debugRef.current.textContent !== text) debugRef.current.textContent = text;
      }
    });

    const unsubscribe = fleet.subscribe(() => {
      const snap = fleet.getSnapshot();
      const focus = selectedTick(snap.fleet.trucks, snap.selectedId);
      if (!focus) return;
      setHud({ state: focus.plm, selected: focus.id, trucks: snap.fleet.trucks.length, queued: snap.fleet.queued, recal: focus.recal, onGrade: focus.onGrade, cycle: focus.cycles });
    });

    return () => {
      stopFrame();
      unsubscribe();
      controls.removeEventListener("start", onControlStart);
      for (const truck of trucks) {
        truck.model.dispose();
        truck.ring.material.dispose();
      }
      for (const item of labelledInterest) item.label.removeFromParent();
      shovel.dispose();
      dust.dispose();
      pit.dispose();
      stage.dispose();
      mats.dispose();
    };
  }, []);

  useEffect(() => {
    const canvas = hostRef.current?.querySelector("canvas");
    if (!canvas) return;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", publishedAccessibilityCopy.label);
    canvas.setAttribute("aria-describedby", "mine-scene-description");
  }, [publishedAccessibilityCopy.label, publishedAccessibilityCopy.caption]);

  useEffect(() => {
    const fleet = getFleetStore();
    fleet.setPaused(paused);
  }, [paused]);

  const css = HAUL_STATE_CSS[haulState(hud.state)];
  const moving = !hud.recal;
  const statusLabel = buildMineHudStatus(hud.recal, moving, lang);
  const recalLabelKey = hud.recal
    ? "mine.hud.recalReady"
    : hud.onGrade
      ? "mine.hud.recalGated"
      : "mine.hud.recalStandby";

  return (
    <div className="og-scene og-scene--mine">
      <div ref={hostRef} className="og-scene__host" />
      <p id="mine-scene-description" className="og-visually-hidden" aria-live="polite" aria-atomic="true">
        {publishedAccessibilityCopy.caption}
      </p>
      <div className="og-overlay">
        <div className="og-hud og-hud--tl" style={{ width: 390, ["--tone" as string]: css }}>
          <div className="og-hud__title">
            <span className="og-dot" />
            <span className="og-num">{buildMineHudTitle(hud.selected, hud.state, hud.cycle, lang)}</span>
            <span className={`og-badge ${hud.recal ? "og-badge--ok" : "og-badge--ghost"}`}>{statusLabel}</span>
          </div>
          <div className="og-progress"><div ref={barRef} className="og-progress__bar" /></div>
          <div className="og-hud__row"><span className="og-hud__meta">{t("hud.camera", lang)}</span><div className="og-seg og-seg--sm">
            {CAM_PRESETS.map((id) => <button key={id} type="button" className="og-seg__btn" aria-pressed={presetUi === id} onClick={() => setPreset(id)}>{t(CAM_LABEL_KEYS[id], lang)}</button>)}
          </div></div>
        </div>
        <div className="og-stack og-stack--tr">
          <div className={`og-badge ${hud.recal ? "og-badge--ok" : "og-badge--ghost"}`} style={{ height: "auto", minHeight: 24, padding: "4px 10px", whiteSpace: "normal" }}>
            {t(recalLabelKey, lang)}
          </div>
          {badge}
        </div>
        <div className="og-stack og-stack--bl">
          <div className="og-hud og-hud--caption og-num">{t("mine.hud.fleet", lang, { trucks: hud.trucks, queued: hud.queued })}</div>
          <div className="og-hud og-hud--caption">{t("mine.hud.seeded", lang, { seed: url.seed })}</div>
          {url.debug && <div ref={debugRef} className="og-hud og-hud--caption og-num" />}
        </div>
        {dock && <div className="og-dock og-dock--right">{dock}</div>}
      </div>
    </div>
  );
}
