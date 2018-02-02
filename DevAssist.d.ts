export class DevAssist {
  commit(message: string): Promise<string>;
  lint(): Promise<LintResult[]>;
  lintReport(): string;
  compile(): Promise<boolean>;
  logBug(bug: Bug):Promise<number>;
}