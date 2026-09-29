import { readFileSync } from "node:fs";

const welcomePageSource = readFileSync(new URL("../WelcomePage.tsx", import.meta.url), "utf8");
const welcomeStyles = readFileSync(new URL("../../../styles/welcome.css", import.meta.url), "utf8");

test("welcome artwork uses the shared static illustration without cropping or continuous motion", () => {
  expect(welcomePageSource).toMatch(/<SceneIllustration scene="welcome"/);
  expect(welcomePageSource).not.toMatch(/<video/);
  expect(welcomePageSource).not.toMatch(/welcome-icon[^"\n]*rounded-full/);
  expect(welcomeStyles).not.toMatch(/welcome-icon-pulse/);
});
