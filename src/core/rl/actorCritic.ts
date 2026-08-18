import { RLEnvironment } from './environment';
import { RLTrainingConfig, RLTrainingMetrics, RLTrajectoryPoint } from '../../types';
import { SeededRandom } from '../math/random';

/**
 * Continuous Actor-Critic Reinforcement Learning Agent
 * Learns a parameterized Gaussian policy mu(s) with continuous action clipping
 * and a state-value baseline Critic V(s) to compute Advantage TD errors.
 */
export class ContinuousActorCriticAgent {
  private env: RLEnvironment;
  private config: RLTrainingConfig;
  private rng: SeededRandom;

  private stateDim: number;
  private actionDim: number;
  private actionLow: number;
  private actionHigh: number;

  // Actor parameters: linear + non-linear feature weights
  private actorWeights: number[][]; // [actionDim, stateDim]
  private actorBias: number[];
  private logStd: number[];

  // Critic parameters: linear + non-linear feature weights
  private criticWeights: number[];  // [stateDim]
  private criticBias: number = 0.0;

  constructor(env: RLEnvironment, config: Partial<RLTrainingConfig> = {}) {
    this.env = env;
    this.stateDim = env.stateSpace.dim;
    this.actionDim = env.actionSpace.dim;

    const bounds = env.actionSpace.bounds || { lower: [-1], upper: [1] };
    this.actionLow = bounds.lower[0] ?? -1;
    this.actionHigh = bounds.upper[0] ?? 1;

    this.config = {
      algorithm: 'actor_critic',
      episodes: config.episodes || 100,
      maxStepsPerEpisode: config.maxStepsPerEpisode || env.getMaxSteps(),
      learningRate: config.learningRate || 0.01,
      actorLearningRate: config.actorLearningRate || 0.005,
      criticLearningRate: config.criticLearningRate || 0.02,
      discountFactorGamma: config.discountFactorGamma || 0.95,
      seed: config.seed || 42,
    };

    this.rng = new SeededRandom(this.config.seed);

    // Initialize Actor
    this.actorWeights = Array.from({ length: this.actionDim }, () =>
      Array.from({ length: this.stateDim }, () => this.rng.gaussian(0, 0.1))
    );
    this.actorBias = new Array(this.actionDim).fill(0.0);
    this.logStd = new Array(this.actionDim).fill(-0.5); // Initial std ~ 0.6

    // Initialize Critic
    this.criticWeights = Array.from({ length: this.stateDim }, () => this.rng.gaussian(0, 0.1));
    this.criticBias = 0.0;
  }

  private normalizeState(state: number[]): number[] {
    const bounds = this.env.stateSpace.bounds;
    return state.map((v, i) => {
      const low = bounds.lower[i] ?? 0;
      const high = bounds.upper[i] ?? 100;
      const span = high - low || 1.0;
      return 2.0 * ((v - low) / span) - 1.0;
    });
  }

  /**
   * Critic evaluates expected return V(s)
   */
  public evaluateStateValue(normState: number[]): number {
    let sum = this.criticBias;
    for (let i = 0; i < this.stateDim; i++) {
      sum += this.criticWeights[i] * normState[i];
    }
    return sum;
  }

  /**
   * Actor computes mean continuous action mu(s)
   */
  public computeActionMean(normState: number[]): number[] {
    const means: number[] = [];
    for (let a = 0; a < this.actionDim; a++) {
      let sum = this.actorBias[a];
      for (let i = 0; i < this.stateDim; i++) {
        sum += this.actorWeights[a][i] * normState[i];
      }
      // Tanh squashing scaled to action range
      const tanhVal = Math.tanh(sum);
      const span = (this.actionHigh - this.actionLow) / 2.0;
      const mid = (this.actionHigh + this.actionLow) / 2.0;
      means.push(mid + tanhVal * span);
    }
    return means;
  }

  public selectAction(state: number[], explore: boolean = true): number[] {
    const normState = this.normalizeState(state);
    const means = this.computeActionMean(normState);

    if (!explore) {
      return means;
    }

    const actions: number[] = [];
    for (let a = 0; a < this.actionDim; a++) {
      const std = Math.exp(this.logStd[a]);
      const noise = this.rng.gaussian(0, std);
      const sampled = means[a] + noise;
      actions.push(Math.max(this.actionLow, Math.min(this.actionHigh, sampled)));
    }
    return actions;
  }

  /**
   * Performs online Advantage Actor-Critic (A2C) updates at each step
   */
  public train(onEpisodeDone?: (metrics: RLTrainingMetrics) => void): RLTrainingMetrics[] {
    const history: RLTrainingMetrics[] = [];
    const gamma = this.config.discountFactorGamma;
    const actorLR = this.config.actorLearningRate || 0.005;
    const criticLR = this.config.criticLearningRate || 0.02;

    for (let ep = 1; ep <= this.config.episodes; ep++) {
      let state = this.env.reset();
      let totalReward = 0;
      let steps = 0;
      let totalTdError = 0;

      while (steps < this.config.maxStepsPerEpisode) {
        steps++;
        const normState = this.normalizeState(state);
        const action = this.selectAction(state, true);
        const stepRes = this.env.step(action);

        const nextState = stepRes.state;
        const normNextState = this.normalizeState(nextState);
        const reward = stepRes.reward;
        const done = stepRes.done;

        totalReward += reward;

        // Critic computation: TD Error delta = r + gamma * V(s') - V(s)
        const currentV = this.evaluateStateValue(normState);
        const nextV = done ? 0.0 : this.evaluateStateValue(normNextState);
        const tdTarget = reward + gamma * nextV;
        const tdError = tdTarget - currentV;
        totalTdError += Math.abs(tdError);

        // Critic update: gradient ascent on MSE loss
        for (let i = 0; i < this.stateDim; i++) {
          this.criticWeights[i] += criticLR * tdError * normState[i];
        }
        this.criticBias += criticLR * tdError;

        // Actor update: Policy gradient grad = tdError * grad_theta log pi(a|s)
        const means = this.computeActionMean(normState);
        for (let a = 0; a < this.actionDim; a++) {
          const std = Math.exp(this.logStd[a]);
          const gradLogPi = (action[a] - means[a]) / (std * std);

          for (let i = 0; i < this.stateDim; i++) {
            this.actorWeights[a][i] += actorLR * tdError * gradLogPi * normState[i];
          }
          this.actorBias[a] += actorLR * tdError * gradLogPi;

          // Standard deviation adaptation
          const gradLogStd = ((action[a] - means[a]) ** 2 / (std * std)) - 1.0;
          this.logStd[a] += (actorLR * 0.5) * tdError * gradLogStd;
          this.logStd[a] = Math.max(-2.0, Math.min(1.0, this.logStd[a])); // Clamp std
        }

        state = nextState;
        if (done) break;
      }

      const metrics: RLTrainingMetrics = {
        episode: ep,
        totalReward: Number(totalReward.toFixed(2)),
        episodeLength: steps,
        meanLoss: Number((totalTdError / Math.max(1, steps)).toFixed(4)),
        metrics: {
          criticValue: this.evaluateStateValue(this.normalizeState(state)),
          policyStd: Math.exp(this.logStd[0] || 0),
        },
      };

      history.push(metrics);
      onEpisodeDone?.(metrics);
    }

    return history;
  }

  public rollout(seed?: number): { trajectory: RLTrajectoryPoint[]; totalReward: number } {
    let state = this.env.reset(seed);
    const trajectory: RLTrajectoryPoint[] = [];
    let totalReward = 0;
    let step = 0;

    while (step < this.config.maxStepsPerEpisode) {
      step++;
      const action = this.selectAction(state, false); // Deterministic mean
      const stepRes = this.env.step(action);
      totalReward += stepRes.reward;

      const stateObj: Record<string, number> = {};
      this.env.stateSpace.labels.forEach((label, idx) => {
        stateObj[label] = state[idx];
      });

      trajectory.push({
        step,
        state: stateObj,
        action: { continuousAction: action[0] },
        reward: stepRes.reward,
        cumulativeReward: Number(totalReward.toFixed(2)),
        info: stepRes.info,
      });

      state = stepRes.state;
      if (stepRes.done) break;
    }

    return { trajectory, totalReward: Number(totalReward.toFixed(2)) };
  }
}
