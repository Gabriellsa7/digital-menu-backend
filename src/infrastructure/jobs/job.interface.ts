export interface IJob {
  name: string;
  run(): Promise<void>;
}
