export interface CodeError {
	message: string;
	stack?: string;
	line?: number;
	column?: number;
	source?: string;
}
