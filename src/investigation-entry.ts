import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "./investigation.css";
import "./ui/copilot.css";
import { InvestigationWorkspace } from "./investigation/workspace";

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Investigation requires #app");

const match = /^\/investigation\/([^/?#]+)/.exec(window.location.pathname);
const id = match?.[1] ?? "";
document.title = "Trend Detective Investigation · Error 404";
new InvestigationWorkspace(app, decodeURIComponent(id)).mount();
