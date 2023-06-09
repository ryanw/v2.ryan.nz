const fs = require('fs/promises');

module.exports = async function(content, map, meta) {
	const callback = this.async();
	const transformedCode = await preprocessShader.bind(this)(content);
	const output = `export default ${JSON.stringify(transformedCode)}`;
	callback(null, output, map, meta);
};


async function preprocessShader(source) {
	const resolvePath = async (filename) => {
		return new Promise((resolve, reject) => {
			this.resolve('/home/ryan/projects/v2.ryan.nz/src/', filename, (_, path) => {
				resolve(path);
			});
		})
	};


	let dst = "";

	const lines = source.split("\n");
	for (const line of lines) {
		if (line.indexOf('@include ') === 0) {
			const moduleName = line.match(/^@include\s+(['"])(.*?)\1\s*;/)?.[2].toString();
			if (moduleName) {
				const filename = await resolvePath(moduleName);
				const libSrc = await fs.readFile(filename, { encoding: 'utf8' });
				if (process.env.NODE_ENV !== 'production') {
					dst += `// Including: ${moduleName}\n`;
				}
				dst += libSrc + '\n';
				if (process.env.NODE_ENV !== 'production') {
					dst += `// End of: ${moduleName}\n`;
				}
			} else {
				console.error("Couldn't find filename in import", line);
				reject();
			}
		}
		else {
			dst += line;
		}
		dst += '\n';
	}

	return dst;
}
