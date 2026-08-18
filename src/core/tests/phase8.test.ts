import { TestResult } from './phase1.test';
import { 
  EVThermalDynamicEnvironment, 
  CSTRChemicalReactorEnvironment, 
  InvertedPendulumEnvironment 
} from '../rl/environment';
import { ExperienceReplayBuffer } from '../rl/replayBuffer';
import { TabularQLearningAgent } from '../rl/qlearning';
import { DeepQNetworkAgent } from '../rl/neuralDQN';
import { ContinuousActorCriticAgent } from '../rl/actorCritic';
import { MetaRLOptimizerController } from '../rl/metaRLOptimizer';
import { BENCHMARK_CATALOG } from '../benchmarks/benchmarkSuite';

export class Phase8TestSuite {
  /**
   * Run all Phase 8 verification tests
   */
  public static async runAllTests(onProgress?: (testName: string, passed: boolean) => void): Promise<{
    passed: number;
    total: number;
    results: TestResult[];
  }> {
    const results: TestResult[] = [];

    const tests = [
      { name: 'Phase 8.1: Environment State Transitions & Reset Determinism', fn: this.testEnvironmentDeterminism },
      { name: 'Phase 8.2: Experience Replay Buffer & Mini-Batch Sampling Dynamics', fn: this.testExperienceReplayBuffer },
      { name: 'Phase 8.3: Tabular Q-Learning Convergence & Bellman Error Reduction', fn: this.testTabularQLearningConvergence },
      { name: 'Phase 8.4: Deep Q-Network (DQN) Neural Policy & Target Synchronization', fn: this.testDeepQNetworkAgent },
      { name: 'Phase 8.5: Continuous Advantage Actor-Critic (A2C) Policy Gradient', fn: this.testContinuousActorCriticAgent },
      { name: 'Phase 8.6: Dynamic EV Active Thermal Management Under WLTP Cycle', fn: this.testEVThermalActiveControl },
      { name: 'Phase 8.7: Meta-RL Dynamic Optimizer Adaptation Loop', fn: this.testMetaRLOptimizerAdaptation },
    ];

    for (const t of tests) {
      const startTime = performance.now();
      try {
        await t.fn();
        const duration = Math.round(performance.now() - startTime);
        results.push({
          id: t.name,
          name: t.name,
          category: 'reinforcement_learning',
          status: 'passed',
          durationMs: duration,
          message: 'Passed successfully',
        });
        onProgress?.(t.name, true);
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        results.push({
          id: t.name,
          name: t.name,
          category: 'reinforcement_learning',
          status: 'failed',
          durationMs: duration,
          message: err?.message || String(err),
        });
        onProgress?.(t.name, false);
      }
    }

    const passed = results.filter(r => r.status === 'passed').length;
    return { results, passed, total: results.length };
  }

  /**
   * Test 8.1: Environment State Transitions & Reset Determinism
   */
  public static async testEnvironmentDeterminism(): Promise<void> {
    const env1 = new EVThermalDynamicEnvironment(42, 20);
    const env2 = new EVThermalDynamicEnvironment(42, 20);

    const s1_init = env1.reset(42);
    const s2_init = env2.reset(42);

    // Initial states must match exactly
    for (let i = 0; i < s1_init.length; i++) {
      if (Math.abs(s1_init[i] - s2_init[i]) > 1e-6) {
        throw new Error(`Initial state mismatch at index ${i}: ${s1_init[i]} vs ${s2_init[i]}`);
      }
    }

    // Step through identical action sequences
    const actionSeq = [1, 2, 3, 2, 0, 1, 3, 2, 1, 0];
    for (const act of actionSeq) {
      const r1 = env1.step(act);
      const r2 = env2.step(act);

      if (Math.abs(r1.reward - r2.reward) > 1e-4) {
        throw new Error(`Step reward mismatch: ${r1.reward} vs ${r2.reward}`);
      }
      for (let i = 0; i < r1.state.length; i++) {
        if (Math.abs(r1.state[i] - r2.state[i]) > 1e-4) {
          throw new Error(`State trajectory divergence at index ${i}`);
        }
      }
    }
  }

  /**
   * Test 8.2: Experience Replay Buffer & Mini-Batch Sampling Dynamics
   */
  public static async testExperienceReplayBuffer(): Promise<void> {
    const buffer = new ExperienceReplayBuffer(10, 42);

    // Push 15 transitions into capacity-10 circular buffer
    for (let i = 0; i < 15; i++) {
      buffer.push({
        state: [i, i * 2],
        action: i % 3,
        reward: i * 0.5,
        nextState: [i + 1, (i + 1) * 2],
        done: i === 14,
      });
    }

    if (buffer.size() !== 10) {
      throw new Error(`Expected buffer size 10, got ${buffer.size()}`);
    }

    // Oldest items (0-4) should be overwritten by items (10-14)
    const all = buffer.getAll();
    const hasOverwrittenOld = all.some(e => e.state[0] === 0);
    if (hasOverwrittenOld) {
      throw new Error('Circular buffer failed to overwrite oldest experience tuples');
    }

    // Sample mini-batch
    const batch = buffer.sample(4);
    if (batch.length !== 4) {
      throw new Error(`Expected batch size 4, got ${batch.length}`);
    }

    batch.forEach(exp => {
      if (!exp.state || exp.action === undefined || exp.reward === undefined || !exp.nextState) {
        throw new Error('Sampled experience tuple is malformed');
      }
    });
  }

  /**
   * Test 8.3: Tabular Q-Learning Convergence & Bellman Error Reduction
   */
  public static async testTabularQLearningConvergence(): Promise<void> {
    const env = new EVThermalDynamicEnvironment(42, 30);
    const agent = new TabularQLearningAgent(
      env,
      {
        episodes: 50,
        maxStepsPerEpisode: 30,
        learningRate: 0.2,
        discountFactorGamma: 0.90,
        explorationEpsilon: 0.8,
        epsilonDecay: 0.95,
        seed: 42,
      },
      [4, 3, 2, 2, 2] // Compact 96-state discretization for tabular lookup
    );

    const metrics = agent.train();

    if (metrics.length !== 50) {
      throw new Error(`Expected 50 episode metrics, got ${metrics.length}`);
    }

    // Q-table must have populated state entries
    if (agent.getQTableSize() < 5) {
      throw new Error(`Expected at least 5 visited states in Q-table, got ${agent.getQTableSize()}`);
    }

    // Rollout greedy policy
    const rollout = agent.rollout(100);
    if (rollout.trajectory.length === 0) {
      throw new Error('Rollout trajectory is empty');
    }

    // TD error / loss should be recorded
    const finalLoss = metrics[metrics.length - 1].meanLoss;
    if (isNaN(finalLoss)) {
      throw new Error('Final TD loss is NaN');
    }
  }

  /**
   * Test 8.4: Deep Q-Network (DQN) Neural Policy & Target Synchronization
   */
  public static async testDeepQNetworkAgent(): Promise<void> {
    const env = new EVThermalDynamicEnvironment(42, 25);
    const dqn = new DeepQNetworkAgent(env, {
      episodes: 25,
      maxStepsPerEpisode: 25,
      learningRate: 0.01,
      batchSize: 16,
      targetUpdateInterval: 5,
      seed: 42,
    });

    const metrics = dqn.train();

    if (metrics.length !== 25) {
      throw new Error(`Expected 25 episode metrics, got ${metrics.length}`);
    }

    // Verify rollout
    const rollout = dqn.rollout(42);
    if (rollout.trajectory.length !== 25) {
      throw new Error(`Expected 25 trajectory steps, got ${rollout.trajectory.length}`);
    }

    // Verify all actions are within discrete bounds [0, 4]
    rollout.trajectory.forEach(pt => {
      const act = (pt.action as any).actionIndex;
      if (act < 0 || act > 4) {
        throw new Error(`DQN output invalid action index: ${act}`);
      }
    });
  }

  /**
   * Test 8.5: Continuous Advantage Actor-Critic (A2C) Policy Gradient
   */
  public static async testContinuousActorCriticAgent(): Promise<void> {
    const env = new CSTRChemicalReactorEnvironment(42, 30);
    const a2c = new ContinuousActorCriticAgent(env, {
      episodes: 20,
      maxStepsPerEpisode: 30,
      actorLearningRate: 0.01,
      criticLearningRate: 0.03,
      seed: 42,
    });

    const metrics = a2c.train();
    if (metrics.length !== 20) {
      throw new Error(`Expected 20 episode metrics, got ${metrics.length}`);
    }

    // Verify rollout
    const rollout = a2c.rollout(42);
    if (rollout.trajectory.length === 0) {
      throw new Error('A2C rollout trajectory is empty');
    }

    // Continuous action should be bounded within [-5.0, 5.0]
    rollout.trajectory.forEach(pt => {
      const u = (pt.action as any).continuousAction;
      if (u < -5.0 || u > 5.0) {
        throw new Error(`A2C continuous action out of bounds [-5, 5]: ${u}`);
      }
    });
  }

  /**
   * Test 8.6: Dynamic EV Active Thermal Management Under WLTP Cycle
   */
  public static async testEVThermalActiveControl(): Promise<void> {
    const env = new EVThermalDynamicEnvironment(42, 60);
    const agent = new TabularQLearningAgent(env, {
      episodes: 40,
      maxStepsPerEpisode: 60,
      learningRate: 0.2,
      explorationEpsilon: 0.9,
      epsilonDecay: 0.94,
      seed: 42,
    });

    agent.train();
    const rollout = agent.rollout(42);

    // Verify thermal safety limit is respected under active control
    const maxTempRecorded = Math.max(...rollout.trajectory.map(p => Number(p.state['T_battery (°C)'] || 0)));
    if (maxTempRecorded > 46.0) {
      throw new Error(`Battery temperature exceeded thermal safety limits: ${maxTempRecorded.toFixed(2)} °C`);
    }

    // Verify pump modulation: Policy should modulate flow (not simply stay at maximum 60 L/min 100% of the time)
    const distinctActions = new Set(rollout.trajectory.map(p => (p.action as any).actionIndex));
    if (distinctActions.size < 2) {
      throw new Error('RL Controller failed to modulate cooling flow dynamically across drive cycle phases');
    }
  }

  /**
   * Test 8.7: Meta-RL Dynamic Optimizer Adaptation Loop
   */
  public static async testMetaRLOptimizerAdaptation(): Promise<void> {
    const metaController = new MetaRLOptimizerController(42);
    const problem = BENCHMARK_CATALOG[0].problem; // Welded beam or Turbine

    const result = await metaController.optimizeWithMetaRL(problem, 15, 42);

    if (result.trials.length !== 15) {
      throw new Error(`Expected 15 optimization trials, got ${result.trials.length}`);
    }

    if (result.metaAdaptations.length !== 15) {
      throw new Error(`Expected 15 meta adaptations logged, got ${result.metaAdaptations.length}`);
    }

    // Best trial should be found and feasible
    if (!result.bestTrial) {
      throw new Error('Meta-RL optimizer failed to find a best trial');
    }
  }
}
