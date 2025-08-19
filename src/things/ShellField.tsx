import { memo, useEffect, useMemo, useRef } from 'react';
import { Instances, Instance, useGLTF, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGame } from '../store/game';
// import shellModelUrl from '../models/ShellNaut.glb';
import shellModelUrl from '../models/ShellOil.glb';
import * as THREE from 'three';
import { COLORS } from '../constants/colors';
import { useSoundEvents } from '../sounds';

export const ShellField = memo(function ShellField() {
	const shells = useGame((s) => s.shells);
	const crabPos = useGame((s) => s.crabPos);
	const markCollected = useGame((s) => s.markCollected);
	const addScore = useGame((s) => s.addScore);
	const gamePhase = useGame((s) => s.gamePhase);
	const isPaused = useGame((s) => s.isPaused);
	const { playSound } = useSoundEvents();
	const gltf = useGLTF(shellModelUrl) as any;
	const collectedThisFrame = useRef<Set<number>>(new Set());
	// Ensure shadows are off for performance
	useEffect(() => {
		if (!gltf?.scene) return;
		gltf.scene.traverse((obj: any) => {
			if (obj.isMesh) {
				obj.castShadow = false;
				obj.receiveShadow = true;
			}
		});
	}, [gltf]);
	// Deterministic per-id random helpers
	const randFromId = (id: number, salt = 0) => {
		const x = Math.sin(id * 127.1 + salt * 311.7) * 43758.5453;
		return x - Math.floor(x);
	};

	function GlowMaterial({ baseOpacity, phase }: { baseOpacity: number; phase: number }) {
		const ref = useRef<THREE.ShaderMaterial>(null);
		const uniforms = useMemo(
			() => ({
				uTime: { value: 0 },
				uPhase: { value: phase },
				uBaseOpacity: { value: baseOpacity },
			}),
			[phase, baseOpacity]
		);
		useFrame((_, dt) => {
			uniforms.uTime.value += dt;
		});
		return (
			<shaderMaterial
				ref={ref}
				transparent
				depthWrite={false}
				depthTest={false}
				blending={THREE.AdditiveBlending}
				vertexShader={`
					varying vec2 vUv;
					void main() {
						vUv = uv;
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
					}
				`}
				fragmentShader={`
					uniform float uTime;
					uniform float uPhase;
					uniform float uBaseOpacity;
					varying vec2 vUv;
					void main() {
						vec2 p = vUv - 0.5;
						float d = length(p) * 2.0;
						float falloff = smoothstep(1.0, 0.0, d);
						float pulse = 0.85 + 0.15 * sin(uTime * 4.5 + uPhase);
						float alpha = uBaseOpacity * pulse * falloff;
						gl_FragColor = vec4(0.75, 0.32, 0.9, alpha);
					}
				`}
				uniforms={uniforms as any}
			/>
		);
	}

	const visibleShells = useMemo(() => shells.filter((s) => !s.collected), [shells]);

	// Check for shell collection
	useFrame(() => {
		// Skip shell collection if paused
		if (isPaused) return;
		
		// Clear the set at the start of each frame
		collectedThisFrame.current.clear();
		
		visibleShells.forEach((shell) => {
			// Skip if already collected this frame
			if (collectedThisFrame.current.has(shell.id)) {
				return;
			}
			
			const distance = Math.sqrt(
				Math.pow(crabPos.x - shell.x, 2) + Math.pow(crabPos.z - shell.z, 2)
			);
			
			if (distance < 1.8) { // Collection radius
				collectedThisFrame.current.add(shell.id);
				markCollected(shell.id);
				if (gamePhase === 'playing') {
					addScore(1); // Add 1 points for each shell collected
					playSound('shellCollection').catch(console.error);
					console.log(`Shell ${shell.id} collected! Score increased by 1.`);
				}
			}
		});
	});

	return (
		<>
			<Instances limit={100} range={visibleShells.length}>
				{/* Use the geometry/material from the GLB if available */}
				{gltf?.scene ? (
					<primitive object={(gltf.scene.children[0] as any)?.geometry || (gltf.scene as any)} attach="geometry" />
				) : (
					<icosahedronGeometry args={[0.2, 0]} />
				)}
				{/* Use the original material from the GLB instead of overriding with color */}
				{gltf?.scene ? (
					<primitive object={(gltf.scene.children[0] as any)?.material || (gltf.scene as any)} attach="material" />
				) : (
					<meshStandardMaterial color={COLORS.SHELLS.NAUTILUS} roughness={1} />
				)}
				{visibleShells.map((s) => {
					const rYaw = randFromId(s.id);
					const rTilt = randFromId(s.id+1);
					const rScale = randFromId(s.id, 1);
					const yaw = rYaw * Math.PI * 2; // random 0..2pi around Y
					const tilt = rTilt * 0.24 - 0.12; // random 0..2pi around Y
					const scale = 0.55 + rScale * 0.6; // 0.85..1.15
					return (
						<Instance
							key={s.id}
							position={[s.x, -0.001*scale, s.z]}
							rotation={[tilt, yaw, Math.PI / 2]}
							scale={scale}
						/>
					);
				})}
			</Instances>
			{/* Soft additive glow billboard per shell */}
			{visibleShells.map((s) => {
				const rScale = randFromId(s.id, 1);
				const glowScale = 2.8 + rScale * 0.3;
				const rPhase = randFromId(s.id, 2) * Math.PI * 2;
				return (
					<Billboard key={`g-${s.id}`} position={[s.x, 0.16, s.z]}>
						<mesh scale={[glowScale, glowScale * 0.5, 1]} renderOrder={1000}>
							<planeGeometry args={[0.9, 0.9]} />
							<GlowMaterial baseOpacity={0.25} phase={rPhase} />
						</mesh>
					</Billboard>
				);
			})}
		</>
	);
});


