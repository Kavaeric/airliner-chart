// [IMPORT] Types/interfaces //
import type { Metadata } from "next";

// [IMPORT] CSS styling //
import "./branding.css";
import "./globals.css";
import appStyles from "./App.module.css";

export const metadata: Metadata = {
	title: "Airliner Chart",
	description: "I want a seat on an airliner!",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				<div className={appStyles.wrapper}>
					{children}

					<div className={appStyles.footer}>
						<p>Made by Kavaeric</p>
					</div>
				</div>
			</body>
		</html>
	);
}
