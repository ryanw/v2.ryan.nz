declare const PRODUCTION: boolean;
declare const DEBUG: boolean;

declare module '*.glsl' {
	const source: string;
	export default source;
}

declare module '*.wgsl' {
	const source: string;
	export default source;
}

declare module '*.html' {
	const source: string;
	export default source;
}

declare module '*.css' {
	const source: string;
	export default source;
}
