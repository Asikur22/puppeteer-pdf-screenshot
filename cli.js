#!/usr/bin/env node

const puppeteer = require("puppeteer");
const path = require("path");
const { exec } = require("child_process");
const notifier = require("node-notifier");

var args = process.argv.slice(2);

var urls = args.filter((arg) => isValidUrl(arg));

if (urls.length === 0) {
	console.log("Invalid URL");
	return;
}

(async () => {
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();

	// Set your desired viewport size
	const width = 1920;
	const height = 1080;

	// Set browser (viewport) width and height
	await page.setViewport({
		width: width,
		height: height,
		deviceScaleFactor: 1, // optional (for retina screens)
	});

	for (const url of urls) {
		await page.goto(url, { waitUntil: "load" });

		// Optional: wait additional time
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Get the <h1> text
		let title = await page.$eval("h1", (el) => el.innerText.trim());

		// Sanitize the filename
		title = title.replace(/[<>:"/\\|?*]+/g, "");

		// Fallback if title is empty
		if (!title) title = "output";

		const filePath = path.join(__dirname, `pdf/${title}.pdf`);

		// Inject CSS
		await page.addStyleTag({
			content: `
			header#header {
				display: none;
			}
			footer.footer {
				display: none;
			}
			.wp-block-misha-codemirror pre {
				width: 1200px;
				white-space: pre-wrap;
			}
		`,
		});

		// Scroll to bottom before screenshot
		await autoScroll(page);

		// Optional: wait additional time
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Take PDF
		await page.pdf({
			path: filePath,
			// format: "A4",
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: false,
			fullPage: true,
			landscape: false,
			scale: 1,
			width: `${width}px`,
		});

		console.log(`PDF saved as: ${filePath}`);

		notifier.notify(
			{
				title: "PDF Generation Complete",
				message: filePath,
				actions: " Open PDF ",
				sound: "Pop",
				timeout: 10,
				open: "file://" + filePath,
			},
			function (error, response, metadata) {
				metadata.file = filePath;
			}
		);
	}

	// Close the browser
	await browser.close();
})();

// Helper function to scroll down the page
async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			let totalHeight = 0;
			const distance = 100;
			const timer = setInterval(() => {
				const scrollHeight = document.body.scrollHeight;
				window.scrollBy(0, distance);
				totalHeight += distance;

				if (totalHeight >= scrollHeight) {
					clearInterval(timer);
					resolve();
				}
			}, 50);
		});
	});
}

function isValidUrl(string) {
	try {
		new URL(string);
		return true;
	} catch (err) {
		return false;
	}
}

// Show Notification
notifier.on("click", (notifierObject, options, event) => {
	if (!event.file) {
		return;
	}

	// Open file after download (works on macOS, Windows, Linux)
	const openCmd = {
		win32: `start "" "${event.file}"`,
		darwin: `open "${event.file}"`,
		linux: `xdg-open "${event.file}"`,
	}[process.platform];

	if (openCmd) {
		exec(openCmd, (err) => {
			if (err) console.error("Failed to open file:", err);
		});
	} else {
		console.log("Unsupported OS. Open the file manually:", filePath);
	}
});
