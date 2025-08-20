import { useMemo, useRef } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../store/game';
import { COLORS } from '../constants/colors'

type Puff = {
	active: boolean;
	x: number;
	y: number;
	z: number;
	age: number;
	life: number;
	scaleStart: number;
	scaleEnd: number;
	spin: number;
	spinSpeed: number;
	intensity: number; // 0..1 used as instanceColor
};

const POOL_SIZE = 5;

export function DustPuffs() {
    const crabPos = useGame((s) => s.crabPos);
    const puffsRef = useRef<Puff[]>(
        Array.from({ length: POOL_SIZE }, () => ({
            active: false,
            x: 0,
            y: 0,
            z: 0,
            age: 0,
            life: 0.8,
            scaleStart: 0.15,
            scaleEnd: 1.0,
            spin: 0,
            spinSpeed: 0,
            intensity: 0.0,
        }))
    );
	const nextIndexRef = useRef(0);
	const prevPosRef = useRef<THREE.Vector3>(new THREE.Vector3(crabPos.x, 0, crabPos.z));
	const distAccumRef = useRef(0);

	useFrame((_, dt) => {
		const current = new THREE.Vector3(crabPos.x, 0, crabPos.z);
		const prev = prevPosRef.current;
		const deltaVec = current.clone().sub(prev);
		const distance = deltaVec.length();
		const speed = distance / Math.max(dt, 1e-4);
		prevPosRef.current.copy(current);

		// Update existing puffs
		for (let i = 0; i < puffsRef.current.length; i++) {
			const p = puffsRef.current[i];
			if (!p.active) continue;
			p.age += dt;
			if (p.age >= p.life) {
				p.active = false;
				continue;
			}
			// Vertical drift and intensity fade
			p.y += dt * 0.15;
			const t = p.age / p.life;
			// New puffs are darker (lower intensity), older puffs lighten toward sand color
			// p.intensity = 0.5 + 0.5 * Math.min(Math.max(t, 0), 1);
            p.intensity = 1- ((1 - t) * (1 - t));
		}

		// Spawn based on distance traveled and speed threshold
		const SPEED_THRESHOLD = 1.5;
		const STEP_DISTANCE = 1.2; // closer spawn cadence for more frequent puffs
		if (speed > SPEED_THRESHOLD) {
			distAccumRef.current += distance;
			while (distAccumRef.current >= STEP_DISTANCE) {
				distAccumRef.current -= STEP_DISTANCE;
				spawnPuff(current, deltaVec);
			}
		} else {
			// allow small accumulation but don't spawn if slow
			distAccumRef.current = Math.min(distAccumRef.current, STEP_DISTANCE * 0.5);
		}
	});

	function spawnPuff(position: THREE.Vector3, moveDir: THREE.Vector3) {
		const i = nextIndexRef.current;
		nextIndexRef.current = (i + 1) % POOL_SIZE;
		const p = puffsRef.current[i];
		const dir = moveDir.lengthSq() > 1e-6 ? moveDir.clone().normalize() : new THREE.Vector3(0, 0, 1);
		// Offset slightly behind and sideways
		const side = new THREE.Vector3(-dir.z, 0, dir.x);
		const backOffset = -2.0 + (Math.random() * 0.1); // start further behind the crab
		const sideOffset = (Math.random() - 0.5) * 0.35;
		p.x = position.x + dir.x * backOffset + side.x * sideOffset;
		p.y = 0.08;
		p.z = position.z + dir.z * backOffset + side.z * sideOffset;
		p.age = 0;
		p.life = 0.7 + Math.random() * 0.4; // shorter-lived puffs
		p.scaleStart = 0.1 + Math.random() * 0.1;
		p.scaleEnd = 0.8 + Math.random() * 0.6;
		p.spin = Math.random() * Math.PI * 2;
		p.spinSpeed = (Math.random() - 0.5) * 1.5;
		p.intensity = 1.0;
		p.active = true;
	}

	const sandColor = useMemo(() => new THREE.Color(COLORS.SAND.BEACH), []);
	const whiteColor = useMemo(() => new THREE.Color(0xffffff), []); // Pure white for better visibility
	const alphaTex = useMemo(() => {
		const size = 128;
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = size;
		const ctx = canvas.getContext('2d');
		if (ctx) {
			ctx.clearRect(0, 0, size, size);
			// Base soft blob to avoid square edges
			let grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.45);
			grad.addColorStop(0, 'rgba(255,255,255,0.9)');
			grad.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, size, size);

			// Layer extended lobes made of several overlapping soft circles along random directions
			const lobes = 10;
			for (let i = 0; i < lobes; i++) {
				// Random direction and length for this lobe arm
				const angle = Math.random() * Math.PI * 2;
				const length = size * (0.15 + Math.random() * 0.25);
				const steps = 3 + Math.floor(Math.random() * 3); // 3..5 circles per lobe
				const stepLen = length / steps;
				// Start near center with some jitter
				let cx = size / 2 + (Math.random() - 0.5) * size * 0.1;
				let cy = size / 2 + (Math.random() - 0.5) * size * 0.1;
				let radius = size * (0.16 + Math.random() * 0.12);
				for (let j = 0; j < steps; j++) {
					grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
					grad.addColorStop(0, 'rgba(255,255,255,0.85)');
					grad.addColorStop(1, 'rgba(255,255,255,0)');
					ctx.fillStyle = grad;
					ctx.beginPath();
					ctx.arc(cx, cy, radius, 0, Math.PI * 2);
					ctx.fill();
					// Advance along the lobe direction and taper the radius
					cx += Math.cos(angle) * stepLen;
					cy += Math.sin(angle) * stepLen;
					radius *= 0.8 + Math.random() * 0.1;
				}
			}

			// Vignette mask to guarantee smooth falloff at the texture border
			ctx.globalCompositeOperation = 'destination-in';
			grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.48);
			grad.addColorStop(0, 'rgba(255,255,255,1)');
			grad.addColorStop(1, 'rgba(255,255,255,0)');
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, size, size);
			ctx.globalCompositeOperation = 'source-over';
		}
		const tex = new THREE.CanvasTexture(canvas);
		tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
		tex.minFilter = THREE.LinearMipMapLinearFilter;
		tex.magFilter = THREE.LinearFilter;
		tex.generateMipmaps = true;
		tex.flipY = false;
		return tex;
	}, []);

	return (
		<Instances limit={POOL_SIZE} range={puffsRef.current.length}>
			<planeGeometry args={[0.8, 0.8]} />
			<meshBasicMaterial
				color={whiteColor}
				transparent
				opacity={0.7}
				alphaMap={alphaTex}
				depthWrite={false}
				depthTest={true}
			/>
			{puffsRef.current.map((p, idx) => {
				if (!p.active) return null;
				const t = p.age / Math.max(p.life, 1e-6);
				// Start large, shrink over lifetime
				const s = THREE.MathUtils.lerp(p.scaleEnd, p.scaleStart, t);
				// Color blend: start white, fade toward sand color over lifetime
				const col = whiteColor.clone().lerp(sandColor, Math.min(Math.max(t, 0), 1));
				return (
					<Instance key={idx} position={[p.x, p.y, p.z]} rotation={[-Math.PI / 2, 0, p.spin]} scale={[s, s * 0.7, 1]} color={col} />
				);
			})}
		</Instances>
	);
}


