declare const PRODUCTION: boolean;
declare const DEBUG: boolean;

declare module '*.glsl' {
	const source: string;
	export default source;
}
