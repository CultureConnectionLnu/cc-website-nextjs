import "./globals.css";
import ModalController from "@/components/Modals/ModalController";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { ClerkProviderWrapper } from "./clerk-provider";

export const metadata = {
	title: "Culture Connection",
	description:
		"We are a fun and active association that strives for inclusiveness, bridging and building communities with our variety of non-alcohol based events.",
	icons: {
		icon: "/cc.svg",
	},
};

export default function RootLayout({ children }) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-white text-gray-900">
				<ReactQueryProvider>
					<ClerkProviderWrapper>
						{children}
						<ModalController />
					</ClerkProviderWrapper>
				</ReactQueryProvider>
			</body>
		</html>
	);
}
