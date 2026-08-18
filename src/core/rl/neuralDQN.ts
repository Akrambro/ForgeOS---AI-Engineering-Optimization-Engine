import { RLEnvironment } from './environment';
import { ExperienceReplayBuffer } from './replayBuffer';
import { RLTrainingConfig, RLTrainingMetrics, RLTrajectoryPoint } from '../../types';
import { SeededRandom } from '../math/random';

/**
 * 2-layer Multilayer Perceptron (MLP) for Deep Q-Network
 */
class QNetwork {
  public inputDim: number;
  public hiddenDim: number;
  public outputDim: number;

  public W1: number[][]; // [hidden, input]
  public b1: number[];   // [hidden]
  public W2: number[][]; // [output, hidden]
  public b2: number[];   // [output]

  constructor(inputDim: number, hiddenDim: number, outputDim: number, rng: SeededRandom) {
    this.inputDim = inputDim;
    this.hiddenDim = hiddenDim;
    this.outputDim = outputDim;

    // Xavier / He initialization
    const scale1 = Math.sqrt(2.0 / inputDim);
    this.W1 = Array.from({ length: hiddenDim }, () =>
      Array.from({ length: inputDim }, () => rng.gaussian(0, scale1))
    );
    this.b1 = new Array(hiddenDim).fill(0.0);

    const scale2 = Math.sqrt(2.0 / hiddenDim);
    this.W2 = Array.from({ length: outputDim }, () =>
      Array.from({ length: hiddenDim }, () => rng.gaussian(0, scale2))
    );
    this.b2 = new Array(outputDim).fill(0.0);
  }

  public forward(x: number[]): { h: number[]; q: number[] } {
    // Hidden layer with ReLU activation
    const h: number[] = new Array(this.hiddenDim).fill(0);
    for (let j = 0; j < this.hiddenDim; j++) {
      let sum = this.b1[j];
      for (let i = 0; i < this.inputDim; i++) {
        sum += this.W1[j][i] * x[i];
      }
      h[j] = Math.max(0, sum); // ReLU
    }

    // Output linear Q-values
    const q: number[] = new Array(this.outputDim).fill(0);
    for (let k = 0; k < this.outputDim; k++) {
      let sum = this.b2[k];
      for (let j = 0; j < this.hiddenDim; j++) {
        sum += this.W2[k][j] * h[j];
      }
      q[k] = sum;
    }

    return { h, q };
  }

  public clone(): QNetwork {
    const copy = new QNetwork(this.inputDim, this.hiddenDim, this.outputDim, new SeededRandom(1));
    copy.W1 = this.W1.map(row => [...row]);
    copy.b1 = [...this.b1];
    copy.W2 = this.W2.map(row => [...row]);
    copy.b2 = [...this.b2];
    return copy;
  }
}

/**
 * Deep Q-Network (DQN) Agent with Target Network & Replay Memory
 */
export class DeepQNetworkAgent {
  private env: RLEnvironment;
  private config: RLTrainingConfig;
  private rng: SeededRandom;
  private qNetwork: QNetwork;
  private targetNetwork: QNetwork;
  private replayBuffer: ExperienceReplayBuffer;

  private stateDim: number;
  private actionDim: number;

  constructor(env: RLEnvironment, config: Partial<RLTrainingConfig> = {}) {
    this.env = env;
    this.stateDim = env.stateSpace.dim;
    this.actionDim = env.actionSpace.discreteCount || 4;

    this.config = {
      algorithm: 'dqn',
      episodes: config.episodes || 80,
      maxStepsPerEpisode: config.maxStepsPerEpisode || env.getMaxSteps(),
      learningRate: config.learningRate || 0.01,
      discountFactorGamma: config.discountFactorGamma || 0.95,
      explorationEpsilon: config.explorationEpsilon ?? 1.0,
      epsilonMin: config.epsilonMin ?? 0.05,
      epsilonDecay: config.epsilonDecay ?? 0.96,
      batchSize: config.batchSize || 32,
      replayBufferSize: config.replayBufferSize || 2000,
      targetUpdateInterval: config.targetUpdateInterval || 10,
      seed: config.seed || 42,
    };

    this.rng = new SeededRandom(this.config.seed);
    const hiddenUnits = Math.max(16, this.stateDim * 4);
    this.qNetwork = new QNetwork(this.stateDim, hiddenUnits, this.actionDim, this.rng);
    this.targetNetwork = this.qNetwork.clone();
    this.replayBuffer = new ExperienceReplayBuffer(this.config.replayBufferSize, this.config.seed);
  }

  /**
   * Normalizes raw state to [-1, 1] range based on environment bounds
   */
  private normalizeState(state: number[]): number[] {
    const bounds = this.env.stateSpace.bounds;
    return state.map((v, i) => {
      const low = bounds.lower[i] ?? 0;
      const high = bounds.upper[i] ?? 100;
      const span = high - low || 1.0;
      return 2.0 * ((v - low) / span) - 1.0;
    });
  }

  public selectAction(state: number[], epsilon: number = 0.0): number {
    if (this.rng.uniform(0, 1) < epsilon) {
      return this.rng.integer(0, this.actionDim - 1);
    }

    const normState = this.normalizeState(state);
    const { q } = this.qNetwork.forward(normState);

    let maxIdx = 0;
    let maxVal = -Infinity;
    for (let a = 0; a < this.actionDim; a++) {
      if (q[a] > maxVal) {
        maxVal = q[a];
        maxIdx = a;
      }
    }
    return maxIdx;
  }

  /**
   * Performs one gradient descent update step on a sampled batch
   */
  private trainBatch(): number {
    const batch = this.replayBuffer.sample(this.config.batchSize || 32);
    if (batch.length < 8) return 0.0;

    const lr = this.config.learningRate;
    const gamma = this.config.discountFactorGamma;
    let totalLoss = 0;

    for (const exp of batch) {
      const sNorm = this.normalizeState(exp.state);
      const sNextNorm = this.normalizeState(exp.nextState);
      const act = typeof exp.action === 'number' ? exp.action : exp.action[0];

      // Forward pass online network
      const { h, q } = this.qNetwork.forward(sNorm);

      // Forward pass target network for next state
      const { q: nextQ } = this.targetNetwork.forward(sNextNorm);
      const maxNextQ = exp.done ? 0 : Math.max(...nextQ);

      const target = exp.reward + gamma * maxNextQ;
      const error = target - q[act];
      totalLoss += 0.5 * Math.pow(error, 2);

      // Backpropagation gradients
      // dLoss/dq[act] = -(target - q[act]) = -error
      const gradQ = new Array(this.actionDim).fill(0);
      gradQ[act] = -error;

      // Update W2 and b2
      const gradH: number[] = new Array(this.qNetwork.hiddenDim).fill(0);
      for (let j = 0; j < this.qNetwork.hiddenDim; j++) {
        this.qNetwork.W2[act][j] -= lr * gradQ[act] * h[j];
        gradH[j] += gradQ[act] * this.qNetwork.W2[act][j];
      }
      this.qNetwork.b2[act] -= lr * gradQ[act];

      // Update W1 and b1 with ReLU derivative
      for (let j = 0; j < this.qNetwork.hiddenDim; j++) {
        const reluDeriv = h[j] > 0 ? 1 : 0;
        const delta = gradH[j] * reluDeriv;
        for (let i = 0; i < this.stateDim; i++) {
          this.qNetwork.W1[j][i] -= lr * delta * sNorm[i];
        }
        this.qNetwork.b1[j] -= lr * delta;
      }
    }

    return totalLoss / batch.length;
  }

  public train(onEpisodeDone?: (metrics: RLTrainingMetrics) => void): RLTrainingMetrics[] {
    const history: RLTrainingMetrics[] = [];
    let epsilon = this.config.explorationEpsilon ?? 1.0;

    for (let ep = 1; ep <= this.config.episodes; ep++) {
      let state = this.env.reset();
      let totalReward = 0;
      let steps = 0;
      let totalLoss = 0;

      while (steps < this.config.maxStepsPerEpisode) {
        steps++;
        const action = this.selectAction(state, epsilon);
        const stepRes = this.env.step(action);

        this.replayBuffer.push({
          state,
          action,
          reward: stepRes.reward,
          nextState: stepRes.state,
          done: stepRes.done,
        });

        totalReward += stepRes.reward;
        state = stepRes.state;

        // Perform gradient updates
        const loss = this.trainBatch();
        totalLoss += loss;

        if (stepRes.done) break;
      }

      // Update target network periodically
      if (ep % (this.config.targetUpdateInterval || 10) === 0) {
        this.targetNetwork = this.qNetwork.clone();
      }

      // Epsilon decay
      epsilon = Math.max(this.config.epsilonMin ?? 0.05, epsilon * (this.config.epsilonDecay ?? 0.96));

      const metrics: RLTrainingMetrics = {
        episode: ep,
        totalReward: Number(totalReward.toFixed(2)),
        episodeLength: steps,
        meanLoss: Number((totalLoss / Math.max(1, steps)).toFixed(4)),
        epsilon: Number(epsilon.toFixed(3)),
        metrics: {
          replayBufferSize: this.replayBuffer.size(),
          finalBatteryTemp: state[0] ?? 0,
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
      const action = this.selectAction(state, 0.0);
      const stepRes = this.env.step(action);
      totalReward += stepRes.reward;

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
}
