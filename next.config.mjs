/** @type {import('next').NextConfig} */
const nextConfig = {
	serverExternalPackages: ["ssh2-sftp-client", "ssh2"],
	experimental: {
		serverActions: {
			bodySizeLimit: "50mb",
		},
	},
};
export default nextConfig;
