// Type definitions for dev-assist
// Project: dev-assist
// Definitions by: [Ben Bahrman] <[github.com/benbahrman]>

export function commit(message: string): Promise<string>;
export function lint(): Promise<lintResult[]>;
export function lintReport(): string;
export function compile(): Promise<boolean>;
export function logBug(bug: bug):Promise<number>;

export interface bug {
  id: number;
  title: string;
  details: string;
  breaking: boolean;
  fixed: boolean;
}

export interface lintResult {
  file:string;
  errors:number;
  warnings:number;
  exceptions: lintException[];

}

export interface lintException {
  line:number;
  column:number;
  rule: string;
  excerpt: string;
}