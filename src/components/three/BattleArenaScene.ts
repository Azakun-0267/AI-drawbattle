import * as THREE from 'three';
import { BattleModeType, BattleParticipant, Move } from '../../types';
import { sound } from '../../utils/sound';

export interface DamageEvent {
  targetId: string;
  damage: number;
  isCritical: boolean;
  position: THREE.Vector3;
}

export interface AttackAnimationState {
  attackerId: string;
  targetId?: string;
  move: Move;
  progress: number; // 0 to 1
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  phase: 'windup' | 'strike' | 'return';
  onHit: () => void;
  onComplete?: () => void;
}

export interface ActiveProjectile {
  mesh: THREE.Object3D;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  speed: number;
  color: number;
  trajectory?: 'straight' | 'mortar' | 'spread';
  arcHeight?: number;
  onHit: () => void;
}

export interface ParticleEffect {
  particles: THREE.Points;
  velocities: Float32Array;
  lifetime: number;
  maxLifetime: number;
}

export interface TemporaryVisualEffect {
  mesh: THREE.Object3D;
  lifetime: number;
  maxLifetime: number;
  update?: (delta: number, progress: number) => void;
}

export class BattleArenaScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  // Arena bounds (Expanded width & strict boundary clamping)
  public readonly FIELD_SIZE = 240;
  public readonly ARENA_LIMIT = 92; // cannot leave arena boundaries

  // Monster entities
  private monsterMeshes: Map<string, THREE.Group> = new Map();
  private monsterMaterials: Map<string, THREE.MeshBasicMaterial> = new Map();
  private monsterShadows: Map<string, THREE.Mesh> = new Map();
  private monsterBases: Map<string, THREE.Group> = new Map();
  private decoyMeshes: Map<string, THREE.Group[]> = new Map();
  private hazardVisuals: Map<string, THREE.Group> = new Map(); // v2.8 persistent poison pools etc.

  // Attack animations & Projectiles
  private activeAttacks: AttackAnimationState[] = [];
  private activeProjectiles: ActiveProjectile[] = [];
  private particleEffects: ParticleEffect[] = [];
  private temporaryEffects: TemporaryVisualEffect[] = [];

  // Tactical Range Visuals
  private movementRangeMesh: THREE.Mesh | null = null;
  private attackRangeGroup: THREE.Group | null = null;
  private mortarReticleGroup: THREE.Group | null = null;
  private mortarTrajectoryLine: THREE.Line | null = null;
  private teleportReticleGroup: THREE.Group | null = null;
  private teleportTrajectoryLine: THREE.Line | null = null;
  private targetReticleGroup: THREE.Group | null = null;
  public currentSelectedMove: Move | null = null;

  // Active state for turn & range
  public activeParticipantId: string | null = null;
  public turnMaxDistance: number = 0;
  public turnRemainingDistance: number = 0;
  public turnStartPos: THREE.Vector3 = new THREE.Vector3();
  public selectedMoveRange: number | null = null;
  public selectedMoveColor: number = 0x38bdf8;
  public targetParticipantId: string | null = null;

  // Camera control
  public cameraAngleX = 0; // horizontal yaw rotation
  public cameraAngleY = 0.48; // pitch elevation (radians)
  public cameraDistance = 32; // zoom distance
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  // Raycaster for ground click
  private raycaster = new THREE.Raycaster();
  private groundPlane: THREE.Mesh | null = null;

  // Player controls (Manual WASD / arrow keys & UI buttons ONLY)
  public moveInput = { forward: false, backward: false, left: false, right: false };
  public rotateInput = { left: false, right: false };
  // Manual input is enabled ONLY for the local human's active monster.
  // This prevents WASD/D-pad input from ever moving a CPU participant during its turn.
  private manualControlEnabled = false;
  // In online battles the camera is permanently owned by the local player.
  // Turn changes must never move the camera to another player's perspective.
  private localViewParticipantId: string | null = null;

  // Current participants reference
  private currentParticipants: BattleParticipant[] = [];
  // v3.1 field obstacles. Ticks are decremented once per battle turn.
  private arenaObstacles: { mesh: THREE.Mesh; x:number; z:number; rotation:number; halfWidth:number; halfDepth:number; ticks:number }[] = [];

  // Callbacks
  private onDamageDealt?: (event: DamageEvent) => void;
  private onBattleLog?: (text: string, type: 'attack' | 'damage' | 'faint' | 'info' | 'critical' | 'chaos') => void;
  public onMoveDistanceChanged?: (remaining: number, max: number) => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onDamageDealt?: (event: DamageEvent) => void;
      onBattleLog?: (text: string, type: 'attack' | 'damage' | 'faint' | 'info' | 'critical' | 'chaos') => void;
      onMoveDistanceChanged?: (remaining: number, max: number) => void;
    }
  ) {
    this.container = container;
    this.onDamageDealt = callbacks.onDamageDealt;
    this.onBattleLog = callbacks.onBattleLog;
    this.onMoveDistanceChanged = callbacks.onMoveDistanceChanged;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Bright airy sky
    this.scene.fog = new THREE.FogExp2(0xa0d8ef, 0.007);

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 400);
    this.camera.position.set(0, 22, 34);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Build arena
    this.setupLights();
    this.buildArenaField();
    this.setupTacticalRings();

    // Event listeners
    this.bindEvents();

    // Start loop
    this.clock.start();
    this.animate();
  }

  private setupLights() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x446633, 0.9);
    hemiLight.position.set(0, 100, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.25);
    dirLight.position.set(40, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -90;
    dirLight.shadow.camera.right = 90;
    dirLight.shadow.camera.top = 90;
    dirLight.shadow.camera.bottom = -90;
    this.scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xddeeff, 0.45);
    this.scene.add(ambLight);
  }

  private buildArenaField() {
    // Ground Plane (Wider arena)
    const groundGeo = new THREE.PlaneGeometry(this.FIELD_SIZE, this.FIELD_SIZE);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.82,
      metalness: 0.05,
    });
    this.groundPlane = new THREE.Mesh(groundGeo, groundMat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // Grid helper across ground
    const grid = new THREE.GridHelper(this.FIELD_SIZE, 60, 0x14532d, 0x166534);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // Central circular battle arena platform (Expanded)
    const circleGeo = new THREE.CircleGeometry(64, 64);
    const circleMat = new THREE.MeshStandardMaterial({
      color: 0xedf7ed,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const centerCircle = new THREE.Mesh(circleGeo, circleMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.y = 0.03;
    centerCircle.receiveShadow = true;
    this.scene.add(centerCircle);

    // Inner glowing ring
    const ringGeo = new THREE.RingGeometry(63.2, 64.2, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const innerRing = new THREE.Mesh(ringGeo, ringMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.04;
    this.scene.add(innerRing);

    // Center divider
    const dividerGeo = new THREE.PlaneGeometry(128, 1.0);
    const dividerMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.rotation.x = -Math.PI / 2;
    divider.position.y = 0.045;
    this.scene.add(divider);

    const centerHubGeo = new THREE.CircleGeometry(8.5, 32);
    const centerHubMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide });
    const centerHub = new THREE.Mesh(centerHubGeo, centerHubMat);
    centerHub.rotation.x = -Math.PI / 2;
    centerHub.position.y = 0.05;
    this.scene.add(centerHub);

    // Boundary Barrier Energy Ring (Clear indication of field bounds)
    const boundaryPoints = [
      new THREE.Vector3(-this.ARENA_LIMIT, 0.1, -this.ARENA_LIMIT),
      new THREE.Vector3(this.ARENA_LIMIT, 0.1, -this.ARENA_LIMIT),
      new THREE.Vector3(this.ARENA_LIMIT, 0.1, this.ARENA_LIMIT),
      new THREE.Vector3(-this.ARENA_LIMIT, 0.1, this.ARENA_LIMIT),
      new THREE.Vector3(-this.ARENA_LIMIT, 0.1, -this.ARENA_LIMIT),
    ];
    const boundaryLineGeo = new THREE.BufferGeometry().setFromPoints(boundaryPoints);
    const boundaryLineMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 3,
      transparent: true,
      opacity: 0.85,
    });
    const boundaryLine = new THREE.Line(boundaryLineGeo, boundaryLineMat);
    this.scene.add(boundaryLine);

    // Pillars around arena
    const pillarPositions: [number, number][] = [
      [-this.ARENA_LIMIT, -this.ARENA_LIMIT],
      [this.ARENA_LIMIT, -this.ARENA_LIMIT],
      [-this.ARENA_LIMIT, this.ARENA_LIMIT],
      [this.ARENA_LIMIT, this.ARENA_LIMIT],
      [-this.ARENA_LIMIT, 0],
      [this.ARENA_LIMIT, 0],
      [0, -this.ARENA_LIMIT],
      [0, this.ARENA_LIMIT],
      [-60, -60],
      [60, -60],
      [-60, 60],
      [60, 60],
    ];

    pillarPositions.forEach(([x, z]) => {
      const pillarGroup = new THREE.Group();
      pillarGroup.position.set(x, 0, z);

      const baseGeo = new THREE.CylinderGeometry(1.8, 2.4, 2.0, 8);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 1.0;
      base.castShadow = true;
      pillarGroup.add(base);

      const colGeo = new THREE.CylinderGeometry(1.1, 1.1, 9, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 6.0;
      col.castShadow = true;
      pillarGroup.add(col);

      const crystalGeo = new THREE.OctahedronGeometry(1.6);
      const crystalMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 11.5;
      pillarGroup.add(crystal);

      this.scene.add(pillarGroup);
    });

    // Impassable Perimeter Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const wallConfigs = [
      { w: this.FIELD_SIZE, h: 4.5, d: 3.0, x: 0, z: -this.ARENA_LIMIT - 3 },
      { w: this.FIELD_SIZE, h: 4.5, d: 3.0, x: 0, z: this.ARENA_LIMIT + 3 },
      { w: 3.0, h: 4.5, d: this.FIELD_SIZE, x: -this.ARENA_LIMIT - 3, z: 0 },
      { w: 3.0, h: 4.5, d: this.FIELD_SIZE, x: this.ARENA_LIMIT + 3, z: 0 },
    ];
    wallConfigs.forEach(c => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), wallMat);
      wall.position.set(c.x, 2.25, c.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
    });
  }

  /**
   * Initializes Tactical 3D Overlays on the field:
   * - Movement Range Area Ring
   * - Attack Range Circle
   * - Target Lock-on Reticle
   */
  private setupTacticalRings() {
    // 1. Movement Range Boundary (Cyan/Blue perimeter with glowing area)
    const moveRingGeo = new THREE.RingGeometry(0.1, 1, 64);
    const moveRingMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });
    this.movementRangeMesh = new THREE.Mesh(moveRingGeo, moveRingMat);
    this.movementRangeMesh.rotation.x = -Math.PI / 2;
    this.movementRangeMesh.position.y = 0.06;
    this.movementRangeMesh.visible = false;
    this.scene.add(this.movementRangeMesh);

    // 2. Main Attack Range Group (Dynamically populated with directional laser/cone/reticle/aura)
    this.attackRangeGroup = new THREE.Group();
    this.attackRangeGroup.position.y = 0.07;
    this.attackRangeGroup.visible = false;
    this.scene.add(this.attackRangeGroup);

    // 3. Mortar Artillery Target Reticle & Parabolic Ballistic Arc
    this.mortarReticleGroup = new THREE.Group();
    this.mortarReticleGroup.position.y = 0.08;
    this.mortarReticleGroup.visible = false;
    this.buildMortarReticle();
    this.scene.add(this.mortarReticleGroup);

    const mortarLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const mortarLineMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 1.2,
      gapSize: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    this.mortarTrajectoryLine = new THREE.Line(mortarLineGeo, mortarLineMat);
    this.mortarTrajectoryLine.visible = false;
    this.scene.add(this.mortarTrajectoryLine);

    // 4. Teleport Strike Reticle & Jump Tracer
    this.teleportReticleGroup = new THREE.Group();
    this.teleportReticleGroup.position.y = 0.08;
    this.teleportReticleGroup.visible = false;
    this.buildTeleportReticle();
    this.scene.add(this.teleportReticleGroup);

    const teleportLineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const teleportLineMat = new THREE.LineDashedMaterial({
      color: 0xa855f7,
      dashSize: 0.9,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.9,
    });
    this.teleportTrajectoryLine = new THREE.Line(teleportLineGeo, teleportLineMat);
    this.teleportTrajectoryLine.visible = false;
    this.scene.add(this.teleportTrajectoryLine);

    // 5. Target Lock-on Reticle
    const reticleGroup = new THREE.Group();
    const reticleRingGeo = new THREE.RingGeometry(2.2, 2.5, 32);
    const reticleRingMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const reticleRing = new THREE.Mesh(reticleRingGeo, reticleRingMat);
    reticleRing.rotation.x = -Math.PI / 2;
    reticleGroup.add(reticleRing);

    // 4 Pointer notches
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const notchGeo = new THREE.ConeGeometry(0.4, 0.8, 4);
      const notchMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const notch = new THREE.Mesh(notchGeo, notchMat);
      notch.position.set(Math.cos(angle) * 3.0, 0.4, Math.sin(angle) * 3.0);
      notch.rotation.y = -angle + Math.PI / 2;
      notch.rotation.z = Math.PI / 2;
      reticleGroup.add(notch);
    }

    reticleGroup.position.y = 0.1;
    reticleGroup.visible = false;
    this.scene.add(reticleGroup);
    this.targetReticleGroup = reticleGroup;
  }

  private buildMortarReticle() {
    if (!this.mortarReticleGroup) return;
    const outerGeo = new THREE.RingGeometry(3.6, 4.0, 32);
    const outerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    this.mortarReticleGroup.add(outerMesh);

    const innerGeo = new THREE.RingGeometry(1.2, 1.5, 32);
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    this.mortarReticleGroup.add(innerMesh);

    const lineMat = new THREE.LineBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.9 });
    const hPoints = [new THREE.Vector3(-4.5, 0, 0), new THREE.Vector3(4.5, 0, 0)];
    const vPoints = [new THREE.Vector3(0, 0, -4.5), new THREE.Vector3(0, 0, 4.5)];
    const hLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hPoints), lineMat);
    const vLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(vPoints), lineMat);
    this.mortarReticleGroup.add(hLine, vLine);

    const fillGeo = new THREE.CircleGeometry(3.6, 32);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
    const fillMesh = new THREE.Mesh(fillGeo, fillMat);
    fillMesh.rotation.x = -Math.PI / 2;
    this.mortarReticleGroup.add(fillMesh);
  }

  private buildTeleportReticle() {
    if (!this.teleportReticleGroup) return;
    const riftGeo = new THREE.RingGeometry(1.4, 1.8, 24);
    const riftMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const riftMesh = new THREE.Mesh(riftGeo, riftMat);
    riftMesh.rotation.x = -Math.PI / 2;
    this.teleportReticleGroup.add(riftMesh);

    const coreGeo = new THREE.RingGeometry(0.3, 0.6, 6);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xe879f9, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.rotation.x = -Math.PI / 2;
    this.teleportReticleGroup.add(coreMesh);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const bracketPoints = [
        new THREE.Vector3(Math.cos(angle - 0.25) * 2.4, 0, Math.sin(angle - 0.25) * 2.4),
        new THREE.Vector3(Math.cos(angle) * 2.0, 0, Math.sin(angle) * 2.0),
        new THREE.Vector3(Math.cos(angle + 0.25) * 2.4, 0, Math.sin(angle + 0.25) * 2.4),
      ];
      const bracketLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(bracketPoints),
        new THREE.LineBasicMaterial({ color: 0xc084fc })
      );
      this.teleportReticleGroup.add(bracketLine);
    }
  }

  /**
   * Initializes participants directly as moving monster entities!
   */
  public setLocalViewParticipant(participantId: string) {
    this.localViewParticipantId = participantId;
    const p = this.currentParticipants.find(x => x.id === participantId);
    if (p) {
      // Put the camera behind the local monster. P2/P4 therefore start from
      // their own forward-facing side instead of seeing their monster backwards.
      this.cameraAngleX = p.rotation;
    }
  }

  public syncParticipants(participants: BattleParticipant[]) { this.currentParticipants = participants; }

  public initParticipants(participants: BattleParticipant[], mode: BattleModeType) {
    this.currentParticipants = participants;

    // Clear old meshes
    this.monsterMeshes.forEach(m => this.scene.remove(m));
    this.monsterShadows.forEach(m => this.scene.remove(m));
    this.monsterBases.forEach(m => this.scene.remove(m));
    this.decoyMeshes.forEach(list => list.forEach(g => this.scene.remove(g)));
    this.decoyMeshes.clear();
    this.monsterMeshes.clear();
    this.monsterMaterials.clear();
    this.monsterShadows.clear();
    this.monsterBases.clear();

    this.activeAttacks = [];
    this.activeProjectiles = [];
    this.temporaryEffects.forEach(e => this.scene.remove(e.mesh));
    this.temporaryEffects = [];

    const layout = this.getSpawnLayout(participants.length, mode);

    participants.forEach((p, idx) => {
      const spawn = layout[idx];
      p.position = { x: spawn.x, y: 0, z: spawn.z };
      p.rotation = spawn.rot;
      p.turnStartPosition = { x: spawn.x, y: 0, z: spawn.z };

      // 1. Build Monster Entity (You are the monster!)
      const monsterGroup = this.createMonsterMesh(p);
      monsterGroup.position.set(p.position.x, 0, p.position.z);
      this.scene.add(monsterGroup);
      this.monsterMeshes.set(p.id, monsterGroup);

      // 2. Ground shadow that moves with monster
      const shadowGeo = new THREE.CircleGeometry(2.4, 24);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(p.position.x, 0.05, p.position.z);
      this.scene.add(shadow);
      this.monsterShadows.set(p.id, shadow);

      // 3. Dynamic Elemental Foot-Ring (follows monster)
      const baseGroup = this.createMonsterBaseMesh(p.monster.type, p.team, p.isPlayer);
      baseGroup.position.set(p.position.x, 0.06, p.position.z);
      this.scene.add(baseGroup);
      this.monsterBases.set(p.id, baseGroup);
    });

    if (participants.length > 0) {
      this.setActiveTurn(participants[0].id, 18, 18, participants[0].position);
    }
  }

  private getSpawnLayout(count: number, mode: BattleModeType): { x: number; z: number; rot: number }[] {
    if (mode === '1vs1') {
      return [
        { x: 0, z: 28, rot: 0 },
        { x: 0, z: -28, rot: Math.PI },
      ];
    }
    if (mode === '2vs2') {
      return [
        { x: -16, z: 28, rot: 0 },
        { x: 16, z: 28, rot: 0 },
        { x: -16, z: -28, rot: Math.PI },
        { x: 16, z: -28, rot: Math.PI },
      ];
    }
    // 4-Player FFA (Cross / 4 Corners)
    return [
      { x: 0, z: 32, rot: 0 },
      { x: 0, z: -32, rot: Math.PI },
      { x: -32, z: 0, rot: Math.PI / 2 },
      { x: 32, z: 0, rot: -Math.PI / 2 },
    ];
  }

  /**
   * 2D Monster Billboard Mesh with dynamic glow aura
   */
  private createMonsterMesh(p: BattleParticipant): THREE.Group {
    const group = new THREE.Group();

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(p.monster.imageSrc);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const baseHeight = 5.4;
    const baseWidth = baseHeight * Math.max(0.6, Math.min(1.8, p.monster.aspectRatio || 1));
    const planeGeo = new THREE.PlaneGeometry(baseWidth, baseHeight);

    const planeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.02,
      depthWrite: false,
    });

    this.monsterMaterials.set(p.id, planeMat);

    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.name = 'monsterPlane';
    planeMesh.position.y = baseHeight / 2 + 0.3;
    group.add(planeMesh);

    return group;
  }

  /**
   * Creates glowing ground base ring for the monster
   */
  private createMonsterBaseMesh(type: string, team: number, isPlayer: boolean): THREE.Group {
    const group = new THREE.Group();
    const elemColor = this.getElementColor(type);

    // Inner glowing ring
    const ringGeo = new THREE.RingGeometry(2.2, 2.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: elemColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.name = 'baseRing';
    group.add(ring);

    // v2.9.1: team identity must be readable instantly. The outer base NEVER changes
    // color just because this is the local player; it always represents the actual team.
    const teamColors = [0x38bdf8, 0xfb7185, 0xfacc15, 0xc084fc];
    const teamColor = teamColors[Math.abs(team) % teamColors.length];
    const teamFill = new THREE.Mesh(
      new THREE.CircleGeometry(3.45, 40),
      new THREE.MeshBasicMaterial({ color: teamColor, side: THREE.DoubleSide, transparent: true, opacity: 0.13, depthWrite: false })
    );
    teamFill.rotation.x = -Math.PI / 2;
    teamFill.position.y = -0.01;
    teamFill.name = 'teamFill';
    group.add(teamFill);

    const outerGeo = new THREE.RingGeometry(2.85, 3.45, 40);
    const outerMat = new THREE.MeshBasicMaterial({
      color: teamColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.rotation.x = -Math.PI / 2;
    outer.name = 'outerRing';
    group.add(outer);

    return group;
  }

  private getElementColor(type: string): number {
    switch (type) {
      case '炎': return 0xef4444;
      case '水': return 0x0ea5e9;
      case '草': return 0x22c55e;
      case '雷': return 0xeab308;
      case '闇': return 0x8b5cf6;
      case '光': return 0x38bdf8;
      case '地': return 0xd97706;
      case '風': return 0x14b8a6;
      default: return 0xffffff;
    }
  }

  /**
   * Sets the active participant whose turn it is:
   * Sets up movement range ring centered at starting location!
   */
  public setActiveTurn(
    participantId: string,
    maxDistance: number,
    remainingDistance: number,
    startPos?: { x: number; y: number; z: number }
  ) {
    this.activeParticipantId = participantId;
    this.turnMaxDistance = maxDistance;
    this.turnRemainingDistance = remainingDistance;

    // Reset all manual inputs on every new turn to prevent unintended movement!
    this.moveInput = { forward: false, backward: false, left: false, right: false };
    this.rotateInput = { left: false, right: false };

    const p = this.currentParticipants.find(x => x.id === participantId);
    if (p) {
      if (startPos) {
        this.turnStartPos.set(startPos.x, 0, startPos.z);
      } else {
        this.turnStartPos.set(p.position.x, 0, p.position.z);
      }
    }

    this.updateMovementRangeVisual();
  }

  /**
   * Updates remaining mobility distance and redraws boundary ring
   */
  public setManualControlEnabled(enabled: boolean) {
    this.manualControlEnabled = enabled;
    if (!enabled) this.moveInput = { forward: false, backward: false, left: false, right: false };
  }

  public updateMovementRemaining(remaining: number) {
    this.turnRemainingDistance = Math.max(0, remaining);
    this.updateMovementRangeVisual();
  }

  private updateMovementRangeVisual() {
    if (!this.movementRangeMesh) return;

    if (!this.activeParticipantId || this.turnMaxDistance <= 0) {
      this.movementRangeMesh.visible = false;
      return;
    }

    this.movementRangeMesh.visible = true;
    this.movementRangeMesh.position.set(this.turnStartPos.x, 0.055, this.turnStartPos.z);

    // Scale mesh geometry radius
    const currentRadius = Math.max(0.5, this.turnRemainingDistance);
    this.movementRangeMesh.geometry.dispose();
    this.movementRangeMesh.geometry = new THREE.RingGeometry(
      Math.max(0.2, currentRadius - 0.5),
      currentRadius,
      64
    );

    // Color changes: cyan (fresh) -> amber (half) -> red/gray (exhausted)
    const mat = this.movementRangeMesh.material as THREE.MeshBasicMaterial;
    const ratio = this.turnRemainingDistance / (this.turnMaxDistance || 1);
    if (ratio > 0.5) {
      mat.color.setHex(0x06b6d4); // bright cyan
      mat.opacity = 0.4;
    } else if (ratio > 0.2) {
      mat.color.setHex(0xf59e0b); // warning amber
      mat.opacity = 0.45;
    } else {
      mat.color.setHex(0xf43f5e); // danger red
      mat.opacity = 0.5;
    }
  }

  /**
   * Determines if a move targets self or is a buff/heal/utility skill
   */
  public isSelfMove(move: Move | null): boolean {
    if (!move) return false;
    return (
      move.targetScope === 'self' ||
      (move.category === 'status' && (!move.targetScope || move.targetScope === 'self')) ||
      move.effectType === 'stealth_cloak' ||
      move.effectType === 'decoy_clone' ||
      move.effectType === 'buff_aura' ||
      (Boolean(move.healRatio) && (!move.targetScope || move.targetScope === 'self'))
    );
  }

  /**
   * Sets selected move and projects directional range visuals (laser runway, 3-way fan, teleport rift, mortar crosshairs, etc.)
   */
  public setSelectedMove(
    moveOrRange: Move | number | null,
    category?: string,
    elemColor?: number
  ) {
    let move: Move | null = null;
    if (typeof moveOrRange === 'object') {
      move = moveOrRange;
    } else if (typeof moveOrRange === 'number') {
      move = {
        id: 'temp_move',
        name: 'Move',
        type: '炎',
        category: (category as any) || 'attack',
        power: 50,
        accuracy: 100,
        range: moveOrRange,
        description: '',
        effectType: moveOrRange >= 900 ? 'explosion' : moveOrRange <= 12 ? 'dash_strike' : 'projectile',
      };
    }

    this.currentSelectedMove = move;

    if (!this.attackRangeGroup) return;

    // Reset extra reticles
    if (this.mortarReticleGroup) this.mortarReticleGroup.visible = false;
    if (this.mortarTrajectoryLine) this.mortarTrajectoryLine.visible = false;
    if (this.teleportReticleGroup) this.teleportReticleGroup.visible = false;
    if (this.teleportTrajectoryLine) this.teleportTrajectoryLine.visible = false;

    if (!move) {
      this.attackRangeGroup.visible = false;
      this.selectedMoveRange = null;
      return;
    }

    this.selectedMoveRange = move.range;
    const color = elemColor ?? this.getElementColor(move.type);
    this.selectedMoveColor = color;

    // Clear previous geometries inside attackRangeGroup
    while (this.attackRangeGroup.children.length > 0) {
      const child = this.attackRangeGroup.children[0];
      this.attackRangeGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      } else if (child instanceof THREE.Line) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }

    this.attackRangeGroup.visible = true;
    this.buildRangeVisuals(move, color);
  }

  /** v2.9: Single source of truth for preview, hitbox and cast VFX. */
  public getMoveAreaSpec(move: Move) {
    const raw = Math.max(1, Number(move.range || 1));
    const poison = /毒|ポイズン|胞子/.test(move.name);
    if (move.targetScope === 'single_ally' || move.targetScope === 'all_allies') return {shape:'disk', range:Math.max(12,raw), radius:Math.max(12,raw), center:0, halfWidth:0, halfDeg:180};
    if (this.isSelfMove(move)) return {shape:'self', range:3.5, radius:3.5, center:0, halfWidth:0, halfDeg:180};
    if (move.effectType==='explosion'||move.effectType==='spin_slash'||move.targetScope==='all_field') { const r=Math.max(18,Math.min(raw,48)); return {shape:'disk',range:r,radius:r,center:0,halfWidth:0,halfDeg:180}; }
    if (poison || move.effectType==='ground_mortar') { const reach=Math.max(24,raw), radius=Math.max(8,Math.min(14,reach*.34)), center=reach*.68; return {shape:'landing',range:reach,radius,center,halfWidth:0,halfDeg:180}; }
    if (move.effectType==='line_beam'||move.effectType==='beam') { const r=Math.max(30,raw); return {shape:'rect',range:r,radius:0,center:r/2,halfWidth:4.8,halfDeg:0}; }
    if (move.effectType==='dash_strike'||move.effectType==='teleport_strike') { const r=Math.max(22,raw); return {shape:'rect',range:r,radius:0,center:r/2,halfWidth:5.5,halfDeg:0}; }
    if (move.effectType==='spread_3way'||move.effectType==='vortex_pull') { const r=Math.max(26,raw); return {shape:'sector',range:r,radius:0,center:0,halfWidth:0,halfDeg:38}; }
    if (move.effectType==='knockback_wave') { const r=Math.max(22,raw); return {shape:'sector',range:r,radius:0,center:0,halfWidth:0,halfDeg:55}; }
    const r=Math.max(24,raw); return {shape:'sector',range:r,radius:0,center:0,halfWidth:0,halfDeg:34};
  }

  private buildRangeVisuals(move: Move, color: number) {
    if (!this.attackRangeGroup) return;
    const addDisk=(r:number,c=color,opacity=.20)=>{ const m=new THREE.Mesh(new THREE.CircleGeometry(r,64),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.y=.01; this.attackRangeGroup!.add(m); };
    const addRing=(r:number,c=color)=>{ const m=new THREE.Mesh(new THREE.RingGeometry(Math.max(.1,r-.45),r,64),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity:.92,depthWrite:false})); m.rotation.x=-Math.PI/2; m.position.y=.02; this.attackRangeGroup!.add(m); };
    const addSector=(r:number,halfDeg:number,c=color)=>{ const half=THREE.MathUtils.degToRad(halfDeg); const sh=new THREE.Shape(); sh.moveTo(0,0); for(let i=0;i<=64;i++){const a=-half+(half*2*i/64); sh.lineTo(Math.sin(a)*r,Math.cos(a)*r);} sh.lineTo(0,0); const g=new THREE.ShapeGeometry(sh); g.rotateX(Math.PI/2); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity:.22,depthWrite:false})); m.position.y=.01; this.attackRangeGroup!.add(m); const pts=[new THREE.Vector3(0,.025,0)]; for(let i=0;i<=64;i++){const a=-half+(half*2*i/64);pts.push(new THREE.Vector3(Math.sin(a)*r,.025,Math.cos(a)*r));} pts.push(new THREE.Vector3(0,.025,0)); this.attackRangeGroup!.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:c,transparent:true,opacity:.95}))); };
    const addRect=(len:number,halfWidth:number,c=color)=>{ const g=new THREE.PlaneGeometry(halfWidth*2,len); g.rotateX(Math.PI/2); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity:.23,depthWrite:false})); m.position.set(0,.01,len/2); this.attackRangeGroup!.add(m); const pts=[new THREE.Vector3(-halfWidth,.025,0),new THREE.Vector3(-halfWidth,.025,len),new THREE.Vector3(halfWidth,.025,len),new THREE.Vector3(halfWidth,.025,0),new THREE.Vector3(-halfWidth,.025,0)]; this.attackRangeGroup!.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:c,transparent:true,opacity:.95}))); };

    const spec=this.getMoveAreaSpec(move);
    if(spec.shape==='self'){ addDisk(spec.radius, move.effectType==='stealth_cloak'?0xa855f7:0x10b981,.24); addRing(spec.radius, move.effectType==='stealth_cloak'?0xa855f7:0x10b981); return; }
    if(spec.shape==='disk'){ addDisk(spec.radius, move.targetScope==='single_ally'||move.targetScope==='all_allies'?0x34d399:color,.24); addRing(spec.radius, move.targetScope==='single_ally'||move.targetScope==='all_allies'?0x34d399:color); return; }
    if(spec.shape==='landing'){ const c=/毒|ポイズン|胞子/.test(move.name)?0x22c55e:color; const g=new THREE.Group(); const d=new THREE.Mesh(new THREE.CircleGeometry(spec.radius,64),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity:.30,depthWrite:false})); d.rotation.x=-Math.PI/2;d.position.set(0,.01,spec.center);g.add(d);const rg=new THREE.Mesh(new THREE.RingGeometry(Math.max(.1,spec.radius-.55),spec.radius,64),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,transparent:true,opacity:.98,depthWrite:false}));rg.rotation.x=-Math.PI/2;rg.position.set(0,.02,spec.center);g.add(rg);this.attackRangeGroup.add(g);return; }
    if(spec.shape==='rect'){ addRect(spec.range,spec.halfWidth); return; }
    addSector(spec.range,spec.halfDeg);
  }

  public setTargetParticipant(targetId: string | null) {
    this.targetParticipantId = targetId;
    if (!this.targetReticleGroup) return;

    if (!targetId) {
      this.targetReticleGroup.visible = false;
      return;
    }

    const target = this.currentParticipants.find(p => p.id === targetId && !p.isFainted);
    if (!target) {
      this.targetReticleGroup.visible = false;
      return;
    }

    this.targetReticleGroup.visible = true;
    this.targetReticleGroup.position.set(target.position.x, 0.08, target.position.z);

    // Check if target is inside range
    const active = this.currentParticipants.find(p => p.id === this.activeParticipantId);
    if (active && this.selectedMoveRange !== null) {
      const isSelf = this.isSelfMove(this.currentSelectedMove);
      const dist = Math.hypot(active.position.x - target.position.x, active.position.z - target.position.z);
      const inRange = isSelf || this.selectedMoveRange >= 900 || dist <= this.selectedMoveRange;

      const targetColor = inRange ? 0x10b981 : 0xf43f5e;
      this.targetReticleGroup.traverse(child => {
        if (child instanceof THREE.Mesh && child.material) {
          (child.material as THREE.MeshBasicMaterial).color.setHex(targetColor);
        }
      });
    }
  }

  /**
   * Main update loop
   */
  private update(participants: BattleParticipant[]) {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.currentParticipants = participants;

    // 1. Process Active Participant Movement
    const active = participants.find(p => p.id === this.activeParticipantId);
    if (active && !active.isFainted && this.manualControlEnabled) {
      this.handleActiveMonsterMovement(active, delta);
    }

    // 2. Update Monster Meshes & Bases
    participants.forEach(p => {
      const monsterGroup = this.monsterMeshes.get(p.id);
      const shadow = this.monsterShadows.get(p.id);
      const base = this.monsterBases.get(p.id);

      if (!monsterGroup) return;

      // Position update
      monsterGroup.position.set(p.position.x, 0, p.position.z);
      if (shadow) shadow.position.set(p.position.x, 0.05, p.position.z);
      if (base) {
        base.position.set(p.position.x, 0.06, p.position.z);
        const outer = base.getObjectByName('outerRing');
        if (outer) outer.rotation.z += delta * 1.5;
      }

      if (p.isFainted) {
        // 撃破されたキャラは戦場から完全に消す。死体・当たり判定・リングを残さない。
        monsterGroup.visible = false;
        if (shadow) shadow.visible = false;
        if (base) base.visible = false;
        const deadDecoys = this.decoyMeshes.get(p.id);
        deadDecoys?.forEach(d => d.visible = false);
        return;
      }
      // 敵の透明化は完全不可視。本人と味方にだけ半透明で見える。
      const localViewer = this.localViewParticipantId ? participants.find(x => x.id === this.localViewParticipantId) : null;
      const hiddenFromViewer = Boolean(localViewer && p.team !== localViewer.team && (p.stealthTurns || 0) > 0);
      if (hiddenFromViewer) {
        monsterGroup.visible = false;
        if (shadow) shadow.visible = false;
        if (base) base.visible = false;
        const hiddenDecoys = this.decoyMeshes.get(p.id);
        hiddenDecoys?.forEach(d => d.visible = false);
        return;
      }
      monsterGroup.visible = true;
      const stealthedForTeam = Boolean(p.stealthTurns && p.stealthTurns > 0);
      // ステルス中は本人/味方にもモデルだけ半透明。足元リングと影は位置バレ防止で完全非表示。
      if (shadow) shadow.visible = !stealthedForTeam;
      if (base) base.visible = !stealthedForTeam;

      // Gentle floating bob
      const plane = monsterGroup.getObjectByName('monsterPlane');
      if (plane) {
        plane.position.y = 3.0 + Math.sin(elapsed * 3.5 + p.position.x) * 0.2;
        // Billboard faces camera yaw
        plane.rotation.y = this.cameraAngleX;
      }

      // Stealth invisibility opacity sync
      const mat = this.monsterMaterials.get(p.id);
      if (mat) {
        const isStealthed = Boolean(p.stealthTurns && p.stealthTurns > 0);
        const targetOpacity = isStealthed ? 0.25 : 1.0;
        mat.opacity += (targetOpacity - mat.opacity) * 0.15;
      }

      // Decoy position & rotation sync
      const decoys = this.decoyMeshes.get(p.id);
      if (decoys && decoys.length > 0) {
        decoys.forEach(d => d.visible = true);
        const offsets = [-3.8, 3.8];
        decoys.forEach((clone, idx) => {
          const offX = offsets[idx % 2];
          const offZ = idx === 0 ? -1.2 : 1.2;
          clone.position.set(p.position.x + offX, 0, p.position.z + offZ);
          clone.rotation.y = this.cameraAngleX;
          clone.children.forEach(c => {
            c.position.y = 3.0 + Math.sin(elapsed * 3.5 + p.position.x + idx) * 0.2;
          });
        });
      }
    });

    // 3. Update Attack Range Visuals (Follows active monster & aims towards direction/target)
    if (this.attackRangeGroup && this.attackRangeGroup.visible && active) {
      this.attackRangeGroup.position.set(active.position.x, 0.07, active.position.z);

      const isSelf = this.isSelfMove(this.currentSelectedMove);
      if (isSelf) {
        this.attackRangeGroup.rotation.y = 0;
        const selfRing = this.attackRangeGroup.getObjectByName('selfRing');
        if (selfRing) {
          selfRing.scale.setScalar(1.0 + Math.sin(elapsed * 4) * 0.05);
        }
      } else {
        // 攻撃エリアは敵を自動追尾しない。モンスターが現在向いている方向だけに追従する。
        const target = this.currentParticipants.find(p => p.id === this.targetParticipantId && !p.isFainted);
        this.attackRangeGroup.rotation.y = active.rotation;

        // Dynamic Range Indicator Coloring (element color vs out-of-range red tint)
        if (target && this.selectedMoveRange !== null && this.selectedMoveRange < 900) {
          const dist = Math.hypot(active.position.x - target.position.x, active.position.z - target.position.z);
          const inRange = dist <= this.selectedMoveRange;
          const displayColor = inRange ? this.selectedMoveColor : 0xf43f5e;
          this.attackRangeGroup.traverse((child) => {
            if (child.name === 'coreLine') return;
            if (child instanceof THREE.Mesh && child.material) {
              const mat = child.material as THREE.MeshBasicMaterial;
              if (mat.color) mat.color.setHex(displayColor);
            } else if (child instanceof THREE.Line && child.material) {
              const mat = child.material as THREE.LineBasicMaterial;
              if (mat.color) mat.color.setHex(displayColor);
            }
          });
        }
      }
    }

    // 3b. Update Ground Mortar Targeting Crosshair & Parabolic Ballistic Trajectory
    if (this.mortarReticleGroup && this.mortarReticleGroup.visible && active) {
      const target = this.currentParticipants.find((p) => p.id === this.targetParticipantId && !p.isFainted);
      let targetX = active.position.x;
      let targetZ = active.position.z + (this.selectedMoveRange ? this.selectedMoveRange * 0.7 : 20);

      // 迫撃地点もロックオン追尾せず、向いている方向の先に固定。
      targetX = active.position.x + Math.sin(active.rotation) * (this.selectedMoveRange ? this.selectedMoveRange * 0.7 : 20);
      targetZ = active.position.z + Math.cos(active.rotation) * (this.selectedMoveRange ? this.selectedMoveRange * 0.7 : 20);

      this.mortarReticleGroup.position.set(targetX, 0.08, targetZ);
      this.mortarReticleGroup.rotation.y += delta * 1.5;

      if (this.mortarTrajectoryLine) {
        const curvePoints: THREE.Vector3[] = [];
        const curveSteps = 24;
        const startX = active.position.x;
        const startZ = active.position.z;
        for (let i = 0; i <= curveSteps; i++) {
          const t = i / curveSteps;
          const px = startX + (targetX - startX) * t;
          const pz = startZ + (targetZ - startZ) * t;
          const py = 1.8 * (1 - t) + 4 * 14.0 * t * (1 - t) + 0.3 * t;
          curvePoints.push(new THREE.Vector3(px, py, pz));
        }
        this.mortarTrajectoryLine.geometry.dispose();
        this.mortarTrajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        (this.mortarTrajectoryLine.material as THREE.LineDashedMaterial).dashSize = 1.0 + Math.sin(elapsed * 6) * 0.3;
        this.mortarTrajectoryLine.computeLineDistances();
      }
    }

    // 3c. Update Teleport Strike Landing Marker & Leap Vector
    if (this.teleportReticleGroup && this.teleportReticleGroup.visible && active) {
      const target = this.currentParticipants.find((p) => p.id === this.targetParticipantId && !p.isFainted);
      if (target && target.id !== active.id) {
        const dx = target.position.x - active.position.x;
        const dz = target.position.z - active.position.z;
        const dist = Math.hypot(dx, dz);
        const normDx = dist > 0.01 ? dx / dist : 0;
        const normDz = dist > 0.01 ? dz / dist : 1;

        const landX = target.position.x + normDx * 3.5;
        const landZ = target.position.z + normDz * 3.5;

        this.teleportReticleGroup.position.set(landX, 0.08, landZ);
        this.teleportReticleGroup.rotation.y += delta * 2.5;

        if (this.teleportTrajectoryLine) {
          const tPoints = [
            new THREE.Vector3(active.position.x, 1.2, active.position.z),
            new THREE.Vector3((active.position.x + landX) / 2, 4.0, (active.position.z + landZ) / 2),
            new THREE.Vector3(landX, 0.3, landZ),
          ];
          this.teleportTrajectoryLine.geometry.dispose();
          this.teleportTrajectoryLine.geometry = new THREE.BufferGeometry().setFromPoints(tPoints);
          this.teleportTrajectoryLine.computeLineDistances();
        }
      }
    }

    // 4. Update Target Reticle (rotates over target)
    if (this.targetReticleGroup && this.targetReticleGroup.visible) {
      this.targetReticleGroup.rotation.y += delta * 2.0;
    }

    // 5. Update Attack Animations
    this.updateAttackAnimations(delta);

    // 6. Update Projectiles
    this.updateProjectiles(delta);

    // 7. Update Effects & Particles
    this.updateEffectsAndParticles(delta);

    // 8. Persistent field zones (poison pools etc.)
    this.updateHazardVisuals();

    // 9. Camera Follow Player Monster (Never switch to enemy perspective!)
    this.updateCameraFollow();
  }

  private updateHazardVisuals() {
    const wanted=new Set<string>();
    for(const owner of this.currentParticipants){
      for(const st of (owner.statuses??[]).filter(x=>x.startsWith('毒沼@'))){
        const parts=st.slice(3).split(',').map(Number); const [x,z,r,turns]=parts;
        if(![x,z,r,turns].every(Number.isFinite)||turns<=0) continue;
        const key=`${owner.id}:${st}`; wanted.add(key);
        if(!this.hazardVisuals.has(key)){
          const g=new THREE.Group();
          const disk=new THREE.Mesh(new THREE.CircleGeometry(r,48),new THREE.MeshBasicMaterial({color:0x22c55e,side:THREE.DoubleSide,transparent:true,opacity:.28,depthWrite:false}));
          disk.rotation.x=-Math.PI/2; disk.position.y=.035; g.add(disk);
          const ring=new THREE.Mesh(new THREE.RingGeometry(Math.max(.1,r-.35),r,48),new THREE.MeshBasicMaterial({color:0x86efac,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));
          ring.rotation.x=-Math.PI/2; ring.position.y=.045; g.add(ring);
          g.position.set(x,0,z); this.scene.add(g); this.hazardVisuals.set(key,g);
        }
      }
    }
    for(const [key,g] of this.hazardVisuals){ if(!wanted.has(key)){ this.scene.remove(g); g.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose(); const mat=(m as any).material;if(mat?.dispose)mat.dispose();}); this.hazardVisuals.delete(key); } }
  }

  /** 可視化されている攻撃エリア内かを判定。距離だけでは命中しない。 */
  public isParticipantInMoveArea(actor: BattleParticipant, target: BattleParticipant, move: Move): boolean {
    if (target.isFainted || target.id === actor.id) return false;
    const dx=target.position.x-actor.position.x, dz=target.position.z-actor.position.z;
    const dist=Math.hypot(dx,dz), spec=this.getMoveAreaSpec(move), pad=1.25;
    if ((move.targetScope==='single_ally'||move.targetScope==='all_allies') && target.team!==actor.team) return false;
    const fx=Math.sin(actor.rotation), fz=Math.cos(actor.rotation), forward=dx*fx+dz*fz, side=Math.abs(dx*fz-dz*fx);
    if(spec.shape==='self'||spec.shape==='disk') return dist<=spec.radius+pad;
    if(spec.shape==='landing') return Math.hypot(side,forward-spec.center)<=spec.radius+pad;
    if(forward< -pad || forward>spec.range+pad) return false;
    if(spec.shape==='rect') return side<=spec.halfWidth+pad;
    return side<=Math.tan(THREE.MathUtils.degToRad(spec.halfDeg))*Math.max(0,forward)+pad;
  }

  /**
   * Handles direct monster movement (Joystick, WASD, or Click-to-Move)
   */
  private handleActiveMonsterMovement(active: BattleParticipant, delta: number) {
    const moveSpeed = 16; // Units per second
    // ←→は移動距離を一切消費せず、その場で向きだけ変更できる。
    const rotateSpeed = 2.8;
    if (this.rotateInput.left) active.rotation += rotateSpeed * delta;
    if (this.rotateInput.right) active.rotation -= rotateSpeed * delta;
    let dx = 0;
    let dz = 0;

    // A. Keyboard (WASD/Arrows) or On-screen D-pad Button Input ONLY
    if (this.moveInput.forward) dz -= 1;
    if (this.moveInput.backward) dz += 1;
    if (this.moveInput.left) dx -= 1;
    if (this.moveInput.right) dx += 1;

    if (dx !== 0 || dz !== 0) {
      const len = Math.hypot(dx, dz);
      dx /= len;
      dz /= len;

      // Transform input by camera yaw angle
      const cosA = Math.cos(this.cameraAngleX);
      const sinA = Math.sin(this.cameraAngleX);
      const worldDx = dx * cosA + dz * sinA;
      const worldDz = -dx * sinA + dz * cosA;

      const stepDist = moveSpeed * delta;
      const actualStep = Math.min(stepDist, this.turnRemainingDistance);

      if (actualStep > 0) {
        const nextX = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, active.position.x + worldDx * actualStep));
        const nextZ = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, active.position.z + worldDz * actualStep));

        const blocked = this.isBlockedByObstacle(nextX, nextZ);
        if (!blocked) {
          active.position.x = nextX;
          active.position.z = nextZ;
          active.rotation = Math.atan2(worldDx, worldDz);
        }

        this.turnRemainingDistance = Math.max(0, this.turnRemainingDistance - (blocked ? 0 : actualStep));
        active.remainingMoveDistance = this.turnRemainingDistance;

        this.updateMovementRangeVisual();
        if (this.onMoveDistanceChanged) {
          this.onMoveDistanceChanged(this.turnRemainingDistance, this.turnMaxDistance);
        }

        // Spawn light footstep dust
        if (Math.random() < 0.25) {
          this.spawnFootstepDust(active.position);
        }
      }
    }
  }

  /**
   * Smoothly moves a bot monster towards a tactical coordinate
   */
  private isBlockedByObstacle(x:number,z:number) {
    for (const o of this.arenaObstacles) {
      const dx=x-o.x,dz=z-o.z,c=Math.cos(-o.rotation),sn=Math.sin(-o.rotation);
      const lx=dx*c-dz*sn,lz=dx*sn+dz*c;
      if (Math.abs(lx) <= o.halfWidth + 1.8 && Math.abs(lz) <= o.halfDepth + 1.8) return true;
    }
    return false;
  }

  public spawnBarrierWall(actor: BattleParticipant, move: Move) {
    const dist=Math.max(9,Math.min(18,move.range || 14));
    const x=actor.position.x+Math.sin(actor.rotation)*dist;
    const z=actor.position.z+Math.cos(actor.rotation)*dist;
    const width=18, depth=2.2;
    const geo=new THREE.BoxGeometry(width,5,depth);
    const mat=new THREE.MeshStandardMaterial({color: move.type==='光'?0x67e8f9:0x78716c,transparent:true,opacity:.88,roughness:.75,metalness:.08});
    const mesh=new THREE.Mesh(geo,mat); mesh.position.set(x,2.5,z); mesh.rotation.y=actor.rotation; mesh.castShadow=true; mesh.receiveShadow=true;
    this.scene.add(mesh);
    this.arenaObstacles.push({mesh,x,z,rotation:actor.rotation,halfWidth:width/2,halfDepth:depth/2,ticks:6});
  }

  public tickArenaObstacles() {
    this.arenaObstacles.forEach(o=>o.ticks--);
    const dead=this.arenaObstacles.filter(o=>o.ticks<=0); dead.forEach(o=>{this.scene.remove(o.mesh);o.mesh.geometry.dispose();const m=o.mesh.material as THREE.Material;m.dispose();});
    this.arenaObstacles=this.arenaObstacles.filter(o=>o.ticks>0);
  }

  public moveBotTo(
    botId: string,
    targetPos: { x: number; z: number },
    maxMoveDist: number,
    onStep: (remaining: number) => void
  ): Promise<void> {
    return new Promise(resolve => {
      const bot = this.currentParticipants.find(p => p.id === botId);
      if (!bot) {
        resolve();
        return;
      }

      // Clamp destination within arena limit
      const clampedTargetX = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, targetPos.x));
      const clampedTargetZ = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, targetPos.z));

      const dx = clampedTargetX - bot.position.x;
      const dz = clampedTargetZ - bot.position.z;
      const totalDist = Math.hypot(dx, dz);
      const distToTravel = Math.min(totalDist, maxMoveDist);

      if (distToTravel <= 0.2) {
        resolve();
        return;
      }

      const dirX = dx / totalDist;
      const dirZ = dz / totalDist;
      let traveled = 0;
      const speed = 15;

      const interval = setInterval(() => {
        const step = 0.03 * speed;
        traveled += step;

        if (traveled >= distToTravel) {
          bot.position.x = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, bot.position.x + dirX * (distToTravel - (traveled - step))));
          bot.position.z = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, bot.position.z + dirZ * (distToTravel - (traveled - step))));
          clearInterval(interval);
          onStep(Math.max(0, maxMoveDist - distToTravel));
          resolve();
        } else {
          const nx=Math.max(-this.ARENA_LIMIT,Math.min(this.ARENA_LIMIT,bot.position.x+dirX*step)); const nz=Math.max(-this.ARENA_LIMIT,Math.min(this.ARENA_LIMIT,bot.position.z+dirZ*step));
          if(this.isBlockedByObstacle(nx,nz)){ resolve(); return; }
          bot.position.x=nx; bot.position.z=nz;
          onStep(Math.max(0, maxMoveDist - traveled));
        }
      }, 30);
    });
  }

  /**
   * Spawns little dust puffs under moving monster
   */
  private spawnFootstepDust(pos: { x: number; y: number; z: number }) {
    const geo = new THREE.BufferGeometry();
    const count = 6;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = 0.2 + Math.random() * 0.3;
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 1.5;

      velocities[i * 3] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = Math.random() * 2 + 1;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.6,
      transparent: true,
      opacity: 0.6,
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particleEffects.push({
      particles: points,
      velocities,
      lifetime: 0,
      maxLifetime: 0.4,
    });
  }

  /**
   * Triggers a turn-based action from attacker to target:
   */
  private flashExactMoveArea(attacker: BattleParticipant, move: Move) {
    if (!this.attackRangeGroup) return;
    const oldMove=this.currentSelectedMove, oldRange=this.selectedMoveRange, oldColor=this.selectedMoveColor;
    const temp=new THREE.Group();
    // Clone the currently selected canonical preview so the cast flash is literally the same geometry.
    this.attackRangeGroup.children.forEach(child=>{
      const c=child.clone();
      const anyC=c as any;
      if(anyC.material) anyC.material=Array.isArray(anyC.material)?anyC.material.map((m:any)=>m.clone()):anyC.material.clone();
      temp.add(c);
    });
    temp.position.set(attacker.position.x,.10,attacker.position.z);
    temp.rotation.y=this.isSelfMove(move)?0:attacker.rotation;
    temp.traverse(o=>{const mat=(o as any).material;if(mat){const mats=Array.isArray(mat)?mat:[mat];mats.forEach((m:any)=>{m.transparent=true;m.opacity=Math.min(.55,(m.opacity??.5)*1.8);m.depthWrite=false;});}});
    this.scene.add(temp);
    this.temporaryEffects.push({mesh:temp as any,lifetime:0,maxLifetime:.65,update:(_d,progress)=>{temp.traverse(o=>{const mat=(o as any).material;if(mat){const mats=Array.isArray(mat)?mat:[mat];mats.forEach((m:any)=>m.opacity=Math.max(0,.55*(1-progress)));}});}});
  }

  public executeTurnAction(
    attacker: BattleParticipant,
    target: BattleParticipant | undefined,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    const attackerMesh = this.monsterMeshes.get(attacker.id);
    const targetMesh = target ? this.monsterMeshes.get(target.id) : undefined;
    if (!attackerMesh) {
      onHit();
      onComplete();
      return;
    }

    const startPos = new THREE.Vector3(attacker.position.x, 0, attacker.position.z);
    this.flashExactMoveArea(attacker, move);
    const areaSpec = this.getMoveAreaSpec(move);
    const castDistance = areaSpec.shape === 'landing' ? areaSpec.center : Math.max(6, areaSpec.range * 0.82);
    // Human casts always follow the actor's facing. This is the same axis used by the preview/hitbox.
    // Do not fall back to world -Z when there is no selected target.
    const facingTarget = startPos.clone().add(new THREE.Vector3(Math.sin(attacker.rotation) * castDistance, 0, Math.cos(attacker.rotation) * castDistance));
    const targetPos = attacker.isBot && targetMesh ? targetMesh.position.clone() : facingTarget;

    // Handle Chaos / Support / Attack
    if (move.category === 'chaos') {
      this.executeChaosVisual(attacker, target, move, () => {
        onHit();
        setTimeout(onComplete, 600);
      });
      return;
    }

    if (move.category === 'status') {
      sound.playBuff();
      this.spawnStatusAura(startPos, this.getElementColor(move.type));
      setTimeout(() => {
        onHit();
        onComplete();
      }, 500);
      return;
    }

    // Standard & Advanced Attack Types
    sound.playAttack();

    if (move.effectType === 'stealth_cloak') {
      this.executeStealthVisual(attacker, () => {
        onHit();
        setTimeout(onComplete, 400);
      });
      return;
    }

    if (move.effectType === 'decoy_clone') {
      this.executeDecoyVisual(attacker, () => {
        onHit();
        setTimeout(onComplete, 500);
      });
      return;
    }

    if (move.effectType === 'teleport_strike') {
      this.executeTeleportStrike(attacker, target, move, onHit, onComplete);
      return;
    }

    if (move.effectType === 'line_beam') {
      this.spawnLineBeam(startPos, targetPos, move, onHit, onComplete);
      return;
    }

    if (move.effectType === 'spread_3way') {
      this.spawn3WayProjectile(startPos, targetPos, move, onHit, onComplete);
      return;
    }

    if (move.effectType === 'ground_mortar') {
      this.spawnMortarProjectile(startPos, targetPos, move, onHit, onComplete);
      return;
    }

    if (move.effectType === 'vortex_pull') {
      this.executeVortexPull(attacker, target, move, onHit, onComplete);
      return;
    }

    if (move.effectType === 'knockback_wave') {
      this.executeKnockbackWave(attacker, target, move, onHit, onComplete);
      return;
    }

    if (move.effectType === 'explosion') {
      // v3.0: explosions are stationary casts. Do not route them through the melee
      // leap/return animation state machine; that could leave large AoE casts waiting
      // for an animation transition instead of resolving. Flash -> explode -> resolve.
      setTimeout(() => {
        this.spawnArenaExplosion(this.getElementColor(move.type), startPos);
        onHit();
        setTimeout(onComplete, 420);
      }, 220);
    } else if (move.targetScope === 'all_enemies') {
      const attackAnim: AttackAnimationState = {
        attackerId: attacker.id,targetId:target?.id,move,progress:0,startPos:startPos.clone(),
        targetPos:startPos.clone().add(new THREE.Vector3(0,0,-1.5)),phase:'strike',onHit,onComplete,
      };
      this.activeAttacks.push(attackAnim);
    } else if (move.effectType === 'projectile' || move.effectType === 'beam') {
      // Projectile shot
      const attackAnim: AttackAnimationState = {
        attackerId: attacker.id,
        targetId: target?.id,
        move,
        progress: 0,
        startPos: startPos.clone(),
        targetPos: startPos.clone().add(targetPos.clone().sub(startPos).normalize().multiplyScalar(2.0)),
        phase: 'strike',
        onHit: () => {},
      };
      this.activeAttacks.push(attackAnim);

      this.spawn3DProjectile(startPos, targetPos, move, () => {
        onHit();
        setTimeout(onComplete, 350);
      });
    } else {
      // Melee dash strike directly from attacker position to target!
      const strikePos = targetPos.clone().sub(targetPos.clone().sub(startPos).normalize().multiplyScalar(3.0));
      const attackAnim: AttackAnimationState = {
        attackerId: attacker.id,
        targetId: target?.id,
        move,
        progress: 0,
        startPos: startPos.clone(),
        targetPos: strikePos,
        phase: 'strike',
        onHit: () => {
          this.spawnImpactSparks(targetPos, this.getElementColor(move.type));
          onHit();
        },
        onComplete,
      };
      this.activeAttacks.push(attackAnim);
    }
  }

  /**
   * Stealth Cloaking Visual (translucent ghostly hologram)
   */
  private executeStealthVisual(attacker: BattleParticipant, callback: () => void) {
    const startPos = new THREE.Vector3(attacker.position.x, 2.5, attacker.position.z);
    this.spawnImpactSparks(startPos, 0x9333ea, 45); // Purple void sparks

    const mat = this.monsterMaterials.get(attacker.id);
    if (mat) {
      mat.opacity = 0.25; // Translucent camouflage
    }

    // Spawn stealth distortion bubble
    const bubbleGeo = new THREE.SphereGeometry(3.5, 24, 24);
    const bubbleMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.7,
      wireframe: true,
    });
    const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubble.position.copy(startPos);
    this.scene.add(bubble);

    this.temporaryEffects.push({
      mesh: bubble,
      lifetime: 0,
      maxLifetime: 0.6,
      update: (delta, progress) => {
        bubble.scale.setScalar(1 + progress * 0.8);
        bubbleMat.opacity = Math.max(0, 0.7 * (1 - progress));
      },
    });

    callback();
  }

  /**
   * Decoy Clone Summon (Spawns 2 holographic mirror duplicates)
   */
  private executeDecoyVisual(attacker: BattleParticipant, callback: () => void) {
    const centerPos = new THREE.Vector3(attacker.position.x, 0, attacker.position.z);
    this.spawnImpactSparks(centerPos, 0x38bdf8, 40);

    // Clean up existing decoys if any
    this.clearDecoys(attacker.id);

    const clones: THREE.Group[] = [];
    const offsets = [-3.8, 3.8];

    offsets.forEach((offset, idx) => {
      const cloneGroup = new THREE.Group();
      const textureLoader = new THREE.TextureLoader();
      const texture = textureLoader.load(attacker.monster.imageSrc);
      texture.colorSpace = THREE.SRGBColorSpace;

      const baseHeight = 5.4;
      const baseWidth = baseHeight * Math.max(0.6, Math.min(1.8, attacker.monster.aspectRatio || 1));
      const planeGeo = new THREE.PlaneGeometry(baseWidth, baseHeight);
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.65,
        color: idx === 0 ? 0x93c5fd : 0xc084fc, // Holographic tint
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(planeGeo, planeMat);
      mesh.position.y = baseHeight / 2 + 0.3;
      cloneGroup.add(mesh);

      cloneGroup.position.set(centerPos.x + offset, 0, centerPos.z + (idx === 0 ? -1 : 1));
      this.scene.add(cloneGroup);
      clones.push(cloneGroup);

      this.spawnImpactSparks(cloneGroup.position, 0x38bdf8, 20);
    });

    this.decoyMeshes.set(attacker.id, clones);
    callback();
  }

  public clearDecoys(participantId: string) {
    const existing = this.decoyMeshes.get(participantId);
    if (existing) {
      existing.forEach(g => this.scene.remove(g));
      this.decoyMeshes.delete(participantId);
    }
  }

  public destroyOneDecoy(participantId: string): boolean {
    const list = this.decoyMeshes.get(participantId);
    if (list && list.length > 0) {
      const decoy = list.pop()!;
      this.spawnImpactSparks(decoy.position, 0x38bdf8, 45); // Glass shatter sparks
      this.scene.remove(decoy);
      return true;
    }
    return false;
  }

  /**
   * Teleport Strike: vanish in void singularity, instantly reappear behind target & slash!
   */
  private executeTeleportStrike(
    attacker: BattleParticipant,
    target: BattleParticipant | undefined,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    const attackerMesh = this.monsterMeshes.get(attacker.id);
    if (!attackerMesh || !target) {
      onHit();
      onComplete();
      return;
    }

    const startPos = attackerMesh.position.clone();
    this.spawnImpactSparks(startPos, 0x7c3aed, 40);

    // 1. Vanish phase (scale down to zero rapidly)
    attackerMesh.visible = false;

    setTimeout(() => {
      // 2. Reappear behind target
      const targetMesh = this.monsterMeshes.get(target.id);
      const targetPos = targetMesh ? targetMesh.position.clone() : new THREE.Vector3(target.position.x, 0, target.position.z);

      // Vector from target to original attacker pos
      const toStart = startPos.clone().sub(targetPos).normalize();
      // Position behind target
      const behindPos = targetPos.clone().sub(toStart.multiplyScalar(2.4));
      behindPos.x = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, behindPos.x));
      behindPos.z = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, behindPos.z));
      behindPos.y = 0;

      attackerMesh.position.copy(behindPos);
      attacker.position.x = behindPos.x;
      attacker.position.z = behindPos.z;
      attackerMesh.visible = true;

      // Warp reappearance burst
      this.spawnImpactSparks(behindPos, 0xa855f7, 50);

      // 3. Fast Cross-slash visual
      const slashGroup = new THREE.Group();
      const slashGeo = new THREE.PlaneGeometry(6, 1.2);
      const slashMat = new THREE.MeshBasicMaterial({
        color: this.getElementColor(move.type),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const slash1 = new THREE.Mesh(slashGeo, slashMat);
      slash1.rotation.z = Math.PI / 4;
      const slash2 = new THREE.Mesh(slashGeo, slashMat);
      slash2.rotation.z = -Math.PI / 4;
      slashGroup.add(slash1, slash2);
      slashGroup.position.copy(targetPos);
      slashGroup.position.y = 3;
      this.scene.add(slashGroup);

      this.temporaryEffects.push({
        mesh: slashGroup,
        lifetime: 0,
        maxLifetime: 0.35,
        update: (delta, progress) => {
          slashGroup.scale.setScalar(1 + progress * 0.8);
          slashMat.opacity = Math.max(0, 0.9 * (1 - progress));
        },
      });

      onHit();
      setTimeout(onComplete, 400);
    }, 250);
  }

  /**
   * Piercing Line Beam (straight laser pillar traversing full arena path)
   */
  private spawnLineBeam(
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    const dir = targetPos.clone().sub(startPos).normalize();
    const beamLength = 48; // Long piercing laser
    const beamCenter = startPos.clone().add(dir.clone().multiplyScalar(beamLength / 2));
    beamCenter.y = 3.0;

    const beamGroup = new THREE.Group();

    // Core laser beam
    const beamGeo = new THREE.CylinderGeometry(0.75, 0.75, beamLength, 16, 1, true);
    const color = this.getElementColor(move.type);
    const beamMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);

    // Orient cylinder along dir vector
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    beamGroup.add(beam);

    // Outer glow aura
    const outerGeo = new THREE.CylinderGeometry(1.8, 1.8, beamLength, 16, 1, true);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    beamGroup.add(outer);

    beamGroup.position.copy(beamCenter);
    this.scene.add(beamGroup);

    this.spawnImpactSparks(targetPos, color, 45);
    onHit();

    this.temporaryEffects.push({
      mesh: beamGroup,
      lifetime: 0,
      maxLifetime: 0.5,
      update: (delta, progress) => {
        beam.scale.set(1 + progress * 0.5, 1, 1 + progress * 0.5);
        beamMat.opacity = Math.max(0, 0.95 * (1 - progress));
        outerMat.opacity = Math.max(0, 0.5 * (1 - progress));
      },
    });

    setTimeout(onComplete, 450);
  }

  /**
   * 3-Way Spread / Fan Projectiles
   */
  private spawn3WayProjectile(
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    const baseDir = targetPos.clone().sub(startPos).normalize();
    const angles = [-0.35, 0, 0.35]; // ~20 degrees left, center, right
    const dist = Math.max(12, startPos.distanceTo(targetPos));
    const color = this.getElementColor(move.type);

    let hits = 0;
    angles.forEach((angle, idx) => {
      // Rotate baseDir around Y axis
      const spreadDir = baseDir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const dest = startPos.clone().add(spreadDir.multiplyScalar(dist));
      dest.y = 2.8;

      const projGroup = new THREE.Group();
      const sphereGeo = new THREE.SphereGeometry(1.0, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({
        color,
        blending: THREE.AdditiveBlending,
      });
      projGroup.add(new THREE.Mesh(sphereGeo, sphereMat));
      projGroup.position.copy(startPos);
      projGroup.position.y = 2.8;
      this.scene.add(projGroup);

      this.activeProjectiles.push({
        mesh: projGroup,
        startPos: projGroup.position.clone(),
        targetPos: dest,
        progress: 0,
        speed: 2.8,
        color,
        trajectory: 'spread',
        onHit: () => {
          this.spawnImpactSparks(dest, color, 25);
          hits++;
          if (idx === 1 || hits === 1) {
            onHit();
          }
        },
      });
    });

    setTimeout(onComplete, 450);
  }

  /**
   * Mortar / Long-range Parabolic Ground Artillery
   */
  private spawnMortarProjectile(
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    const color = this.getElementColor(move.type);
    const mortarGroup = new THREE.Group();

    // Glowing core comet
    const cometGeo = new THREE.SphereGeometry(1.6, 16, 16);
    const cometMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      blending: THREE.AdditiveBlending,
    });
    mortarGroup.add(new THREE.Mesh(cometGeo, cometMat));

    const coronaGeo = new THREE.SphereGeometry(2.6, 16, 16);
    const coronaMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    mortarGroup.add(new THREE.Mesh(coronaGeo, coronaMat));

    mortarGroup.position.copy(startPos);
    mortarGroup.position.y = 3.0;
    this.scene.add(mortarGroup);

    const dest = targetPos.clone();
    dest.y = 0.5;

    this.activeProjectiles.push({
      mesh: mortarGroup,
      startPos: mortarGroup.position.clone(),
      targetPos: dest,
      progress: 0,
      speed: 1.6,
      color,
      trajectory: 'mortar',
      arcHeight: 22, // High arc launch
      onHit: () => {
        // Massive ground impact explosion & shockwaves
        this.spawnArenaExplosion(color, dest);
        this.spawnImpactSparks(dest, color, 60);
        onHit();
      },
    });

    setTimeout(onComplete, 850);
  }

  /**
   * Vortex Gravity Pull
   */
  private executeVortexPull(
    attacker: BattleParticipant,
    target: BattleParticipant | undefined,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    if (!target) {
      onHit();
      onComplete();
      return;
    }

    const vortexPos = new THREE.Vector3(attacker.position.x, 1.5, attacker.position.z);
    this.spawnArenaExplosion(0x6366f1, vortexPos);
    this.spawnImpactSparks(vortexPos, 0x818cf8, 40);

    // Pull target 5 meters towards attacker
    const targetMesh = this.monsterMeshes.get(target.id);
    const dir = vortexPos.clone().sub(new THREE.Vector3(target.position.x, 0, target.position.z)).normalize();
    const newX = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, target.position.x + dir.x * 5.5));
    const newZ = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, target.position.z + dir.z * 5.5));

    target.position.x = newX;
    target.position.z = newZ;
    if (targetMesh) {
      targetMesh.position.x = newX;
      targetMesh.position.z = newZ;
    }

    onHit();
    setTimeout(onComplete, 400);
  }

  /**
   * Knockback Wave (repels target backwards)
   */
  private executeKnockbackWave(
    attacker: BattleParticipant,
    target: BattleParticipant | undefined,
    move: Move,
    onHit: () => void,
    onComplete: () => void
  ) {
    if (!target) {
      onHit();
      onComplete();
      return;
    }

    const startPos = new THREE.Vector3(attacker.position.x, 2, attacker.position.z);
    const targetPos = new THREE.Vector3(target.position.x, 2, target.position.z);
    const dir = targetPos.clone().sub(startPos).normalize();

    this.spawnArenaExplosion(0x10b981, targetPos);
    this.spawnImpactSparks(targetPos, 0x34d399, 45);

    // Repel target 6 meters backwards
    const newX = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, target.position.x + dir.x * 6.5));
    const newZ = Math.max(-this.ARENA_LIMIT, Math.min(this.ARENA_LIMIT, target.position.z + dir.z * 6.5));

    target.position.x = newX;
    target.position.z = newZ;
    const targetMesh = this.monsterMeshes.get(target.id);
    if (targetMesh) {
      targetMesh.position.x = newX;
      targetMesh.position.z = newZ;
    }

    onHit();
    setTimeout(onComplete, 400);
  }

  /**
   * Visual hit reaction: slight hop back and hit flash
   */
  public triggerHitReaction(targetId: string) {
    const mesh = this.monsterMeshes.get(targetId);
    if (!mesh) return;

    const originalY = mesh.position.y;
    mesh.position.y = originalY + 0.8;
    setTimeout(() => {
      if (mesh) mesh.position.y = originalY;
    }, 150);
  }

  private spawnColumnPillar(pos: THREE.Vector3, color: number) {
    const group = new THREE.Group();
    const cylinderGeo = new THREE.CylinderGeometry(2.8, 2.8, 14, 24, 1, true);
    const cylinderMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const column = new THREE.Mesh(cylinderGeo, cylinderMat);
    column.position.y = 7;
    group.add(column);

    group.position.copy(pos);
    this.scene.add(group);
    this.spawnImpactSparks(pos, color);

    this.temporaryEffects.push({
      mesh: group,
      lifetime: 0,
      maxLifetime: 1.0,
      update: (delta, progress) => {
        column.rotation.y += delta * 6;
        column.scale.set(1 + progress * 0.4, 1 + progress * 0.2, 1 + progress * 0.4);
        cylinderMat.opacity = Math.max(0, 0.75 * (1 - progress));
      },
    });
  }

  private spawnStatusAura(pos: THREE.Vector3, color: number) {
    const ringGeo = new THREE.RingGeometry(1.5, 3.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(pos.x, 0.4, pos.z);
    this.scene.add(ringMesh);

    this.spawnImpactSparks(pos, color, 30);

    this.temporaryEffects.push({
      mesh: ringMesh,
      lifetime: 0,
      maxLifetime: 0.8,
      update: (delta, progress) => {
        ringMesh.position.y += delta * 3.5;
        ringMesh.scale.setScalar(1 + progress * 0.6);
        ringMat.opacity = Math.max(0, 0.85 * (1 - progress));
      },
    });
  }

  private executeChaosVisual(attacker: BattleParticipant, target: BattleParticipant | undefined, move: Move, callback: () => void) {
    sound.playChaos();
    const startPos = new THREE.Vector3(attacker.position.x, 0, attacker.position.z);
    const targetPos = target
      ? new THREE.Vector3(target.position.x, 0, target.position.z)
      : startPos.clone().add(new THREE.Vector3(0, 0, -10));

    if (move.chaosType === 'god_eraser') {
      const eraserGroup = new THREE.Group();
      const eraserBodyGeo = new THREE.BoxGeometry(4, 2, 8);
      const eraserMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const eraserMesh = new THREE.Mesh(eraserBodyGeo, eraserMat);
      eraserGroup.add(eraserMesh);

      const sleeveGeo = new THREE.BoxGeometry(4.2, 2.2, 4.5);
      const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6 });
      const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
      sleeve.position.z = -1.8;
      eraserGroup.add(sleeve);

      eraserGroup.position.set(targetPos.x, 14, targetPos.z);
      eraserGroup.rotation.x = Math.PI / 4;
      this.scene.add(eraserGroup);

      this.temporaryEffects.push({
        mesh: eraserGroup,
        lifetime: 0,
        maxLifetime: 1.6,
        update: (delta, progress) => {
          if (progress < 0.4) {
            eraserGroup.position.y = 14 - (progress / 0.4) * 11;
          } else {
            eraserGroup.position.y = 3;
            eraserGroup.position.x = targetPos.x + Math.sin(progress * 30) * 2.5;
          }
        },
      });

      setTimeout(() => {
        this.spawnImpactSparks(targetPos, 0xffffff, 40);
        callback();
      }, 700);
    } else {
      this.spawnArenaExplosion(0xa855f7, targetPos);
      callback();
    }
  }

  private spawn3DProjectile(startPos: THREE.Vector3, targetPos: THREE.Vector3, move: Move, onHit: () => void) {
    const color = this.getElementColor(move.type);
    const group = new THREE.Group();

    const sphereGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color });
    const core = new THREE.Mesh(sphereGeo, sphereMat);
    group.add(core);

    const glowGeo = new THREE.SphereGeometry(1.8, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    group.position.copy(startPos);
    group.position.y = 3.0;
    this.scene.add(group);

    const dest = targetPos.clone();
    dest.y = 3.0;

    this.activeProjectiles.push({
      mesh: group,
      startPos: group.position.clone(),
      targetPos: dest,
      progress: 0,
      speed: 2.5,
      color,
      onHit: () => {
        this.spawnImpactSparks(dest, color);
        onHit();
      },
    });
  }

  private spawnImpactSparks(pos: THREE.Vector3, color: number, count = 30) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 2.5;
      positions[i * 3 + 2] = pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 10 + Math.random() * 15;

      velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      velocities[i * 3 + 1] = Math.cos(phi) * speed + 5;
      velocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color,
      size: 0.8,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geo, mat);
    this.scene.add(particles);

    this.particleEffects.push({
      particles,
      velocities,
      lifetime: 0,
      maxLifetime: 0.6,
    });
  }

  private spawnArenaExplosion(color: number, worldPos?: THREE.Vector3) {
    const ringGeo = new THREE.RingGeometry(1, 4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.set(worldPos?.x ?? 0, 0.5, worldPos?.z ?? 0);
    this.scene.add(shockwave);

    this.temporaryEffects.push({
      mesh: shockwave,
      lifetime: 0,
      maxLifetime: 0.8,
      update: (delta, progress) => {
        const scale = 1 + progress * 10;
        shockwave.scale.set(scale, scale, 1);
        ringMat.opacity = Math.max(0, 0.9 * (1 - progress));
      },
    });
  }

  private updateAttackAnimations(delta: number) {
    for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
      const atk = this.activeAttacks[i];
      const monsterGroup = this.monsterMeshes.get(atk.attackerId);
      if (!monsterGroup) {
        this.activeAttacks.splice(i, 1);
        continue;
      }

      atk.progress += delta * (atk.phase === 'strike' ? 4.8 : 3.6);

      if (atk.phase === 'strike') {
        // Dynamic leap & spin on dash/melee attack
        if (atk.move.effectType === 'dash_strike' || atk.move.effectType === 'spin_slash') {
          const hopY = Math.sin(atk.progress * Math.PI) * 3.2;
          monsterGroup.position.lerpVectors(atk.startPos, atk.targetPos, Math.min(1, atk.progress));
          monsterGroup.position.y = hopY;
          if (atk.move.effectType === 'spin_slash') {
            monsterGroup.rotation.y += delta * 20;
          }
        } else {
          monsterGroup.position.lerpVectors(atk.startPos, atk.targetPos, Math.min(1, atk.progress));
        }

        if (atk.progress >= 1) {
          atk.onHit();
          atk.phase = 'return';
          atk.progress = 0;
        }
      } else if (atk.phase === 'return') {
        const hopY = Math.sin(atk.progress * Math.PI) * 1.6;
        monsterGroup.position.lerpVectors(atk.targetPos, atk.startPos, Math.min(1, atk.progress));
        monsterGroup.position.y = hopY;
        if (atk.progress >= 1) {
          monsterGroup.position.copy(atk.startPos);
          monsterGroup.position.y = 0;
          if (atk.onComplete) atk.onComplete();
          this.activeAttacks.splice(i, 1);
        }
      }
    }
  }

  private updateProjectiles(delta: number) {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const proj = this.activeProjectiles[i];
      proj.progress += delta * proj.speed;

      if (proj.trajectory === 'mortar') {
        // High parabolic arc for mortar / artillery
        const height = proj.arcHeight || 18;
        const arcY = 4 * height * proj.progress * (1 - proj.progress);
        proj.mesh.position.lerpVectors(proj.startPos, proj.targetPos, Math.min(1, proj.progress));
        proj.mesh.position.y = Math.max(0.5, proj.mesh.position.y + arcY);
      } else {
        proj.mesh.position.lerpVectors(proj.startPos, proj.targetPos, Math.min(1, proj.progress));
      }

      proj.mesh.rotation.y += delta * 12;
      proj.mesh.rotation.x += delta * 8;

      if (proj.progress >= 1) {
        proj.onHit();
        this.scene.remove(proj.mesh);
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  private updateEffectsAndParticles(delta: number) {
    for (let i = this.temporaryEffects.length - 1; i >= 0; i--) {
      const eff = this.temporaryEffects[i];
      eff.lifetime += delta;
      const progress = Math.min(1, eff.lifetime / eff.maxLifetime);

      if (eff.update) eff.update(delta, progress);

      if (eff.lifetime >= eff.maxLifetime) {
        this.scene.remove(eff.mesh);
        this.temporaryEffects.splice(i, 1);
      }
    }

    for (let i = this.particleEffects.length - 1; i >= 0; i--) {
      const effect = this.particleEffects[i];
      effect.lifetime += delta;

      const posAttr = effect.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let p = 0; p < positions.length / 3; p++) {
        positions[p * 3] += effect.velocities[p * 3] * delta;
        positions[p * 3 + 1] += (effect.velocities[p * 3 + 1] - 9.8 * effect.lifetime) * delta;
        positions[p * 3 + 2] += effect.velocities[p * 3 + 2] * delta;
      }
      posAttr.needsUpdate = true;

      const mat = effect.particles.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - effect.lifetime / effect.maxLifetime);

      if (effect.lifetime >= effect.maxLifetime) {
        this.scene.remove(effect.particles);
        effect.particles.geometry.dispose();
        mat.dispose();
        this.particleEffects.splice(i, 1);
      }
    }
  }

  private updateCameraFollow() {
    // プレイヤー生存中は自分を追従。死亡後は生存者を映す観戦カメラへ自動移行。
    const ownPlayer = this.localViewParticipantId
      ? this.currentParticipants.find(p => p.id === this.localViewParticipantId)
      : this.currentParticipants.find(p => p.isPlayer);
    const player = ownPlayer && !ownPlayer.isFainted
      ? ownPlayer
      : this.currentParticipants.find(p => !p.isFainted && ownPlayer && p.team === ownPlayer.team)
        || this.currentParticipants.find(p => !p.isFainted);
    if (!player) return;

    const targetPos = new THREE.Vector3(player.position.x, 2.5, player.position.z);

    const offsetX = Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;
    const offsetY = Math.sin(this.cameraAngleY) * this.cameraDistance + 4.0;
    const offsetZ = Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY) * this.cameraDistance;

    const desiredCamPos = new THREE.Vector3(
      targetPos.x + offsetX,
      targetPos.y + offsetY,
      targetPos.z + offsetZ
    );

    this.camera.position.lerp(desiredCamPos, 0.12);
    this.camera.lookAt(targetPos);
  }

  public getScreenCoordinates(pos: { x: number; y: number; z: number }, heightOffset = 6.0): { x: number; y: number; visible: boolean } {
    const v = new THREE.Vector3(pos.x, pos.y + heightOffset, pos.z);
    v.project(this.camera);

    const isVisible = v.z < 1.0;
    const halfWidth = this.container.clientWidth / 2;
    const halfHeight = this.container.clientHeight / 2;

    return {
      x: (v.x * halfWidth) + halfWidth,
      y: -(v.y * halfHeight) + halfHeight,
      visible: isVisible,
    };
  }

  private bindEvents() {
    const el = this.container;

    const onMouseDown = (e: MouseEvent) => {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isMouseDown) return;
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.cameraAngleX -= deltaX * 0.007;
      this.cameraAngleY = Math.max(0.14, Math.min(1.2, this.cameraAngleY + deltaY * 0.007));
    };

    const onMouseUp = () => {
      this.isMouseDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.cameraDistance = Math.max(16, Math.min(65, this.cameraDistance + e.deltaY * 0.03));
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    // Keyboard (WASD & Arrow Keys)
    const onKeyDown = (e: KeyboardEvent) => {
      if (!this.manualControlEnabled) return;
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.moveInput.forward = true;
      if (key === 's' || key === 'arrowdown') this.moveInput.backward = true;
      if (key === 'a') this.moveInput.left = true;
      if (key === 'd') this.moveInput.right = true;
      if (key === 'arrowleft') { this.rotateInput.left = true; e.preventDefault(); }
      if (key === 'arrowright') { this.rotateInput.right = true; e.preventDefault(); }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') this.moveInput.forward = false;
      if (key === 's' || key === 'arrowdown') this.moveInput.backward = false;
      if (key === 'a') this.moveInput.left = false;
      if (key === 'd') this.moveInput.right = false;
      if (key === 'arrowleft') this.rotateInput.left = false;
      if (key === 'arrowright') this.rotateInput.right = false;
    };

    const onBlur = () => {
      // Clear movement inputs when browser window or tab loses focus
      this.moveInput = { forward: false, backward: false, left: false, right: false };
      this.rotateInput = { left: false, right: false };
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Resize
    const onResize = () => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.update(this.currentParticipants);
    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.renderer.dispose();
    // React may already have detached/replaced the arena subtree during a screen
    // transition. Never call removeChild unless this exact canvas is still owned
    // by this container; otherwise browsers throw NotFoundError and React's commit
    // can collapse into a blank screen.
    const canvas = this.renderer.domElement;
    if (canvas && canvas.parentNode === this.container) {
      this.container.removeChild(canvas);
    } else if (canvas?.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }
}
