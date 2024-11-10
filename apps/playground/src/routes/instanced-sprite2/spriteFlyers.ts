import {
	InstancedSpriteMesh2,
	createSpritesheet,
	SpriteMaterial2
} from '@threejs-kit/instanced-sprite-mesh';
import { Matrix4, Vector2, type Scene, type Vector3Tuple, type WebGLRenderer } from 'three';

export const initSpriteFlyers = async (renderer: WebGLRenderer, scene: Scene, count: number) => {
	const { texture, spritesheet } = await createSpritesheet()
		.add(
			'/textures/sprites/cacodaemon.png',
			{
				type: 'rowColumn',
				width: 8,
				height: 4
			},
			[
				{ name: 'fly', frameRange: [0, 5] },
				{ name: 'attack', frameRange: [8, 13] },
				{ name: 'idle', frameRange: [16, 19] },
				{ name: 'death', frameRange: [24, 31] }
			]
		)
		.build();

	// const baseMaterial = new MeshStandardMaterial({
	// 	transparent: true,
	// 	alphaTest: 0.01,
	// 	side: DoubleSide,
	// 	map: texture
	// });

	const basematerial = new SpriteMaterial2(count, {
		map: texture
	});

	const sprite = new InstancedSpriteMesh2(basematerial, count, renderer, spritesheet);
	sprite.fps = 7;

	scene.add(sprite);

	sprite.castShadow = true;

	// UPDATING AND MOVING SPRITES
	let dirtyInstanceMatrix = false;

	const tempMatrix = new Matrix4();
	function updatePosition(id: number, position: Vector3Tuple) {
		tempMatrix.makeScale(3, 3, 1);
		tempMatrix.setPosition(...position);
		sprite.setMatrixAt(id, tempMatrix);
		dirtyInstanceMatrix = true;
	}

	const posX: number[] = new Array(count).fill(0);
	const posZ: number[] = new Array(count).fill(0);

	type Agent = {
		action: string;
		velocity: [number, number];
		timer: number;
	};

	const agents: Agent[] = [];

	const { updateAgents } = setupRandomAgents();

	function setupRandomAgents() {
		const spread = 400;
		const minCenterDistance = 0;
		const maxCenterDistance = spread;
		const rndPosition = () => {
			const x = Math.random() * spread - spread / 2;
			const y = Math.random() * spread - spread;

			if (Math.sqrt(x ** 2 + y ** 2) < minCenterDistance) {
				return rndPosition();
			}

			return { x, y };
		};

		for (let i = 0; i < count; i++) {
			const pos = rndPosition();
			posX[i] = pos.x;
			posZ[i] = pos.y;
		}

		for (let i = 0; i < count; i++) {
			agents.push({
				action: 'death',
				timer: 0.1,
				velocity: [0, 1]
			});
		}

		const velocityHelper = new Vector2(0, 0);

		const RUN_SPEED = 4;

		let totalTime = 0;

		const updateAgents = (delta: number) => {
			totalTime += delta;
			for (let i = 0; i < agents.length; i++) {
				// timer
				agents[i].timer -= delta;

				// apply velocity
				posX[i] += agents[i].velocity[0] * delta;
				posZ[i] += agents[i].velocity[1] * delta;

				// roll new behaviour when time runs out or agent gets out of bounds
				if (i > 0) {
					const dist = Math.sqrt((posX[i] || 0) ** 2 + (posZ[i] || 0) ** 2);
					if (agents[i].timer < 0 || dist < minCenterDistance || dist > maxCenterDistance) {
						agents[i].timer = 5 + Math.random() * 5;

						velocityHelper
							.set(Math.random() - 0.5, Math.random() - 0.5)
							.normalize()
							.multiplyScalar(RUN_SPEED);
						agents[i].velocity = velocityHelper.toArray();
						sprite.play(agents[i].action, true, 'FORWARD').at(i);
						sprite.flipX.setAt(i, velocityHelper.x < 0);
					}
				}
			}

			for (let i = 0; i < count; i++) {
				updatePosition(i, [
					posX[i] || 0,
					1 + Math.max(Math.sin(totalTime * 0.1 + i ** 2 * 1000), 0) * 10,
					posZ[i] || 0
				]);
			}
		};

		return { updateAgents };
	}

	const update = (delta: number) => {
		updateAgents(delta);

		sprite.update();

		if (dirtyInstanceMatrix) {
			dirtyInstanceMatrix = false;
		}
	};

	return { update, sprite };
};
