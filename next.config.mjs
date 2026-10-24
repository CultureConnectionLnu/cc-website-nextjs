import createMDX from '@next/mdx'

/** @type {import('next').NextConfig} */
const nextConfig = {
	pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
	serverExternalPackages: ["ssh2-sftp-client", "ssh2"],
	experimental: {
		serverActions: {
			bodySizeLimit: "50mb",
		},
	},
};

const withMDX = createMDX({
	// Add markdown plugins here, as desired
	extension: /\.(md|mdx)$/,
});

// Merge MDX config with Next.js config
export default withMDX(nextConfig);
