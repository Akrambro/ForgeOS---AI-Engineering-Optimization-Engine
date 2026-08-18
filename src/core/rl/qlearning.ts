import { RLEnvironment } from './environment';
import { RLTrainingConfig, RLTrainingMetrics, RLTrajectoryPoint } from '../../types';
import { SeededRandom } from '../math/random';

/**
 * Tabular Q-Learning Agent with State Discretization & Epsilon-Greedy Policy
 */
export class TabularQLearningAgent {
  private env: RLEnvironment;
  private config: RLTrainingConfig;
  private rng: SeededRandom;
  private qTable: Map<string, number[]> = new Map();
  private numActions: number;
  private stateBins: number[];

  constructor(
    env: RLEnvironment,
    config: Partial<RLTrainingConfig> = {},
    stateBins: number[] = [8, 8, 6, 6, 5]
  ) {
    this.env = env;
    this.numActions = env.actionSpace.discreteCount || 4;
    this.stateBins = stateBins;
    this.config = {
      algorithm: 'q_learning',
      episodes: config.episodes || 100,
      maxStepsPerEpisode: config.maxStepsPerEpisode || env.getMaxSteps(),
      learningRate: config.learningRate || 0.1,
      discountFactorGamma: config.discountFactorGamma || 0.95,
      explorationEpsilon: config.explorationEpsilon ?? 1.0,
      epsilonMin: config.epsilonMin ?? 0.05,
      epsilonDecay: config.epsilonDecay ?? 0.98,
      seed: config.seed || 42,
    };
    this.rng = new SeededRandom(this.config.seed);
  }

  /**
   * Discretize continuous state into string key for tabular lookup
   */
  public discretize(state: number[]): string {
    const indices: number[] = [];
    const bounds = this.env.stateSpace.bounds;

    for (let i = 0; i < state.length; i++) {
      const val = state[i];
      const low = bounds.lower[i] ?? 0;
      const high = bounds.upper[i] ?? 100;
      const numBins = this.stateBins[i] ?? 8;

      const norm = Math.max(0, Math.min(1, (val - low) / (high - low || 1)));
      const binIdx = Math.min(numBins - 1, Math.floor(norm * numBins));
      indices.push(binIdx);
    }

    return indices.join(':');
  }

  public getQValues(stateKey: string): number[] {
    if (!this.qTable.has(stateKey)) {
      this.qTable.set(stateKey, new Array(this.numActions).fill(0.0));
    }
    return this.qTable.get(stateKey)!;
  }

  public selectAction(state: number[], epsilon: number = 0.0): number {
    if (this.rng.uniform(0, 1) < epsilon) {
      // Explore uniformly
      return this.rng.integer(0, this.numActions - 1);
    }

    // Exploit best action
    const stateKey = this.discretize(state);
    const qValues = this.getQValues(stateKey);

    let bestAction = 0;
    let maxQ = -Infinity;
    for (let a = 0; a < this.numActions; a++) {
      if (qValues[a] > maxQ) {
        maxQ = qValues[a];
        bestAction = a;
      }
    }
    return bestAction;
  }

  /**
   * Train the Q-learning agent over specified episodes
   */
  public train(onEpisodeDone?: (metrics: RLTrainingMetrics) => void): RLTrainingMetrics[] {
    const history: RLTrainingMetrics[] = [];
    let epsilon = this.config.explorationEpsilon ?? 1.0;
    const lr = this.config.learningRate;
    const gamma = this.config.discountFactorGamma;

    for (let ep = 1; ep <= this.config.episodes; ep++) {
      let state = this.env.reset();
      let totalReward = 0;
      let steps = 0;
      let totalBellmanError = 0;

      while (steps < this.config.maxStepsPerEpisode) {
        steps++;
        const stateKey = this.discretize(state);
        const action = this.selectAction(state, epsilon);

        const stepRes = this.env.step(action);
        const nextState = stepRes.state;
        const reward = stepRes.reward;
        const done = stepRes.done;

        totalReward += reward;

        // Q-learning update: Q(s,a) <- Q(s,a) + alpha * [r + gamma * max_a' Q(s', a') - Q(s,a)]
        const currentQ = this.getQValues(stateKey);
        const nextStateKey = this.discretize(nextState);
        const nextQ = this.getQValues(nextStateKey);
        const maxNextQ = done ? 0 : Math.max(...nextQ);

        const target = reward + gamma * maxNextQ;
        const tdError = target - currentQ[action];
        currentQ[action] += lr * tdError;

        totalBellmanError += Math.abs(tdError);

        state = nextState;
        if (done) break;
      }

      // Decay epsilon
      epsilon = Math.max(this.config.epsilonMin ?? 0.05, epsilon * (this.config.epsilonDecay ?? 0.98));

      const metrics: RLTrainingMetrics = {
        episode: ep,
        totalReward: Number(totalReward.toFixed(2)),
        episodeLength: steps,
        meanLoss: Number((totalBellmanError / Math.max(1, steps)).toFixed(4)),
        epsilon: Number(epsilon.toFixed(3)),
        metrics: {
          qTableStatesCount: this.qTable.size,
          finalBatteryTemp: state[0] ?? 0,
        },
      };

      history.push(metrics);
      onEpisodeDone?.(metrics);
    }

    return history;
  }

  /**
   * Run a greedy trajectory rollout using the trained policy
   */
  public rollout(seed?: number): { trajectory: RLTrajectoryPoint[]; totalReward: number } {
    let state = this.env.reset(seed);
    const trajectory: RLTrajectoryPoint[] = [];
    let totalReward = 0;
    let step = 0;

    while (step < this.config.maxStepsPerEpisode) {
      step++;
      const action = this.selectAction(state, 0.0); // Greedy
      const stepRes = this.env.step(action);
      totalReward += stepRes.reward;

      // Extract state object labels
      const stateObj: Record<string, number> = {};
      this.env.stateSpace.labels.forEach((label, idx) => {
        stateObj[label] = state[idx];
      });

      trajectory.push({
        step,
        state: stateObj,
        action: { actionIndex: action },
        reward: stepRes.reward,
        cumulativeReward: Number(totalReward.toFixed(2)),
        info: stepRes.info,
      });

      state = stepRes.state;
      if (stepRes.done) break;
    }

    return { trajectory, totalReward: Number(totalReward.toFixed(2)) };
  }

  public getQTableSize(): number {
    return this.qTable.size;
  }

  public exportWeights(): Record<string, number[]> {
    const obj: Record<string, number[]> = {};
    this.qTable.forEach((val, key) => {
      obj[key] = [...val];
    });
    return obj;
  }

  public loadWeights(weights: Record<string, number[]>): void {
    this.qTable.clear();
    Object.entries(weights).forEach(([k, v]) => {
      this.qTable.set(k, [...v]);
    });
  }
}
