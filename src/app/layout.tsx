import type { Metadata } from "next";
import "./globals.css";
import pageStyles from "./page.module.css";

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
				<div className={pageStyles.wrapper}>
					{children}

					<div className={pageStyles.footer}>
						<p>Made by Kavaeric</p>
					</div>
				</div>
			</body>
		</html>
	);
}
