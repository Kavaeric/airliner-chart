// [IMPORT] Types/interfaces //
import type { Metadata } from "next";

// [IMPORT] CSS styling //
import "./branding-font-hkgrotesk.css";
import "./branding-font-hknova.css";
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
			<head>
				<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,200,0,0" />
			</head>
			<body>
				<div className={appStyles.wrapper}>
					{children}
				</div>
			</body>
		</html>
	);
}
