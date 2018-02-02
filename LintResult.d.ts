
export interface LintResult {
  file:string;
  errors:number;
  warnings:number;
  exceptions: LintException[];

}

export interface LintException {
  line:number;
  column:number;
  rule: string;
  excerpt: string;
}