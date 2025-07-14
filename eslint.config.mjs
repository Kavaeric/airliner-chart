/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	...(process.env.NODE_ENV === 'production' && {
		basePath: "/airliner-chart",
		output: "export",
		trailingSlash: true,
		images: { unoptimized: true }
	})
};

module.exports = nextConfig;