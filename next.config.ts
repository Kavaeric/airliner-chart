/** @type {import('next').NextConfig} */
const nextConfig = {
	basePath: "/airliner-chart",
	output: "export",  // enables static exports for GitHub Pages
	reactStrictMode: true,
	trailingSlash: true,
	images: {
    		unoptimized: true
  	}
};

module.exports = nextConfig;
