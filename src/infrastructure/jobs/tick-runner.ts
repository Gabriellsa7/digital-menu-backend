import { Logger } from 'traceability';
import { IJob } from './job.interface';

export class TickRunner {
  private timer?: NodeJS.Timeout;
  private readonly running = new Set<string>();

  constructor(
    private readonly jobs: IJob[],
    private readonly intervalMilliseconds: number,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMilliseconds);
    this.timer.unref();
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  async tick(): Promise<void> {
    await Promise.all(this.jobs.map((job) => this.runJob(job)));
  }

  private async runJob(job: IJob): Promise<void> {
    if (this.running.has(job.name)) {
      return;
    }
    this.running.add(job.name);
    try {
      await job.run();
    } catch (error) {
      Logger.error(`Job ${job.name} failed`, {
        eventName: 'job.failed',
        job: job.name,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.running.delete(job.name);
    }
  }
}
