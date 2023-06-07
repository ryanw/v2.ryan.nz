struct Uniforms {
	t: f32,
	scale: vec3<f32>,
}

@group(0) @binding(0)
var heightmap: texture_storage_2d<r32float, write>;

@group(0) @binding(1)
var<uniform> u: Uniforms;

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
	let size = vec2<i32>(textureDimensions(heightmap));
	var coord = vec2<i32>(global_id.xy);

	var h = rnd4(vec4(vec2<f32>(global_id.xy), 0.0, 0.0));
	h *= 2.0;
	h -= 1.0;
	h *= 3.0;
	h *= smoothstep(0.0, 2.0, u.t / 2.0);
	

	textureStore(heightmap, coord, vec4(h) + vec4(u.scale.xyz, 0.0));
}

const SALT: u32 = 0xDEADBEEFu;

fn rnd4(seed: vec4<f32>) -> f32 {
	var useed = bitcast<vec4<u32>>(seed);
	return rnd4u(useed);
}

fn salt(seed: u32) -> u32 {
	return rotr(seed, SALT);
}

fn rnd4u(useed: vec4<u32>) -> f32 {
	var seed = useed;
	seed.x = seed.x ^ rotr(SALT, 19u);
	seed.y = seed.y ^ rotr(SALT, 11u);
	seed.z = seed.z ^ rotr(SALT, 7u);
	seed.w = seed.w ^ rotr(SALT, 23u);
	let uval = pcg4d(seed).x;
	return f32(uval) / f32(0xffffffffu);
}

// https://www.pcg-random.org/
fn pcg(v: u32) -> u32 {
	let state = v * 747796405u + 2891336453u;
	let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
	return (word >> 22u) ^ word;
}



fn pcg2d(v: vec2<u32>) -> vec2<u32> {
    var n = v * 1664525u + 1013904223u;

    n.x += n.y * 1664525u;
    n.y += n.x * 1664525u;

    n = n ^ (n >> vec2<u32>(16u));

    n.x += n.y * 1664525u;
    n.y += n.x * 1664525u;

    n = n ^ (n>>vec2<u32>(16u));

    return n;
}

// http://www.jcgt.org/published/0009/03/02/
fn pcg3d(v: vec3<u32>) -> vec3<u32> {
    var n = v * 1664525u + 1013904223u;

    n.x += n.y*n.z;
    n.y += n.z*n.x;
    n.z += n.x*n.y;

    n ^= n >> vec3<u32>(16u);

    n.x += n.y*n.z;
    n.y += n.z*n.x;
    n.z += n.x*n.y;

    return n;
}

// http://www.jcgt.org/published/0009/03/02/
fn pcg3d16(v: vec3<u32>) -> vec3<u32> {
    var n = v * 12829u + 47989u;

    n.x += n.y*n.z;
    n.y += n.z*n.x;
    n.z += n.x*n.y;

    n.x += n.y*n.z;
    n.y += n.z*n.x;
    n.z += n.x*n.y;

	n >>= vec3<u32>(16u);

    return n;
}

// http://www.jcgt.org/published/0009/03/02/
fn pcg4d(v: vec4<u32>) -> vec4<u32> {
    var n = v * 1664525u + 1013904223u;
    
    n.x += n.y*n.w;
    n.y += n.z*n.x;
    n.z += n.x*n.y;
    n.w += n.y*n.z;
    
    n ^= n >> vec4<u32>(16u);
    
    n.x += n.y*n.w;
    n.y += n.z*n.x;
    n.z += n.x*n.y;
    n.w += n.y*n.z;
    
    return n;
}




// Adapted from MurmurHash3_x86_32 from https://github.com/aappleby/smhasher
// Helper Functions
fn rotl(x: u32, r: u32) -> u32 {
	return (x << r) | (x >> (32u - r));
}

fn rotr(x: u32, r: u32) -> u32 {
	return (x >> r) | (x << (32u - r));
}

fn fmix(u: u32) -> u32 {
	var h = u;
    h ^= h >> 16u;
    h *= 0x85ebca6bu;
    h ^= h >> 13u;
    h *= 0xc2b2ae35u;
    h ^= h >> 16u;
    return h;
}


fn murmur3(seed: vec4<u32>) -> u32 {
	var h = 0u;
	var k = seed.x;
	let c1 = 0xcc9e2d51u;
	let c2 = 0x1b873593u;

	k *= c1;
	k = rotl(k,15u);
	k *= c2;

	h ^= k;
	h = rotl(h,13u);
	h = h*5u+0xe6546b64u;

	k = seed.y;

	k *= c1;
	k = rotl(k,15u);
	k *= c2;

	h ^= k;
	h = rotl(h,13u);
	h = h*5u+0xe6546b64u;

	k = seed.z;

	k *= c1;
	k = rotl(k,15u);
	k *= c2;

	h ^= k;
	h = rotl(h,13u);
	h = h*5u+0xe6546b64u;

	k = seed.w;

	k *= c1;
	k = rotl(k,15u);
	k *= c2;

	h ^= k;
	h = rotl(h,13u);
	h = h*5u+0xe6546b64u;

	h ^= 16u;

	return fmix(h);
}
