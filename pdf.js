const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
	const browser = await puppeteer.launch({ headless: true });
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

	const urls = [];

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
			printBackground: true,
			preferCSSPageSize: true,
			displayHeaderFooter: false,
			fullPage: true,
			landscape: false,
			scale: 1,
			width: `${width}px`,
		});

		console.log(`PDF saved as: ${filePath}`);
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
