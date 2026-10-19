/**
 * Core tests covering the behaviour fixed during the code review of ./src.
 */
const Mod = require("../src/js/winbox.js");
const WinBox = Mod.default || Mod;

describe("WinBox core", () => {

    const wins = [];

    function make(params){

        const win = new WinBox(Object.assign({ "title": "core" }, params));
        wins.push(win);
        return win;
    }

    afterEach(() => {

        for(const win of wins){

            if(win.dom){

                win.close();
            }
        }
        wins.length = 0;
    });

    describe("window stack", () => {

        test("close() removes the window from the stack", () => {

            const a = make();
            const b = make();

            expect(WinBox.stack()).toContain(a);
            expect(WinBox.stack()).toContain(b);

            b.close();

            expect(WinBox.stack()).not.toContain(b);
            expect(WinBox.stack()).toContain(a);
        });

        test("close() of an unregistered window does not remove other windows", () => {

            const a = make();
            const b = make();

            // remove the window from the stack manually (e.g. a window that was
            // never registered) - closing it must not touch the other windows
            const stack = WinBox.stack();
            stack.splice(stack.indexOf(b), 1);

            b.close();

            expect(WinBox.stack()).toContain(a);
            expect(WinBox.stack()).not.toContain(b);
        });
    });

    describe("size limits", () => {

        test("the initial size respects minwidth / minheight", () => {

            const win = make({ "width": 100, "height": 80, "minwidth": 200, "minheight": 120 });

            expect(win.width).toBe(200);
            expect(win.height).toBe(120);
        });

        test("resize() clamps to minwidth / minheight and updates the state", () => {

            const win = make({ "width": 300, "height": 200, "minwidth": 200, "minheight": 120 });

            win.resize(50, 40);

            expect(win.width).toBe(200);
            expect(win.height).toBe(120);
            expect(win.dom.style.width).toBe("200px");
            expect(win.dom.style.height).toBe("120px");
        });
    });

    describe("setUrl()", () => {

        test("creates an iframe element", () => {

            const win = make();

            win.setUrl("https://example.com/");

            const iframe = win.body.getElementsByTagName("iframe")[0];

            expect(iframe).toBeTruthy();
            expect(iframe.getAttribute("src")).toBe("https://example.com/");
        });

        test("does not inject markup through the url", () => {

            const win = make();

            win.setUrl('https://example.com/"><script>window.__wb_xss = 1;<\/script>');

            expect(win.body.getElementsByTagName("script").length).toBe(0);
            expect(window.__wb_xss).toBeUndefined();
        });

        test("reuses an existing iframe", () => {

            const win = make();

            win.setUrl("https://example.com/1");
            win.setUrl("https://example.com/2");

            expect(win.body.getElementsByTagName("iframe").length).toBe(1);
            expect(win.body.getElementsByTagName("iframe")[0].getAttribute("src")).toBe("https://example.com/2");
        });
    });

    describe("robustness", () => {

        test("mount(null) does not throw", () => {

            const win = make();

            expect(() => win.mount(null)).not.toThrow();
        });

        test("addControl() on a template without controls does not throw", () => {

            const template = document.createElement("div");
            template.innerHTML = `
                <div class=wb-header>
                    <div class=wb-drag>
                        <div class=wb-title></div>
                    </div>
                </div>
                <div class=wb-body></div>
            `;

            const win = make({ "template": template });

            expect(() => win.addControl({ "class": "wb-like" })).not.toThrow();
        });

        test("fullscreen() does not throw when the API is unavailable", () => {

            const win = make();

            expect(() => win.fullscreen()).not.toThrow();
        });
    });
});
