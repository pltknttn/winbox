/**
 * Tests for WinBox#autoResize / the `autosize` option.
 *
 * jsdom has no layout engine:
 *   - Element.prototype.scrollWidth / scrollHeight are always 0
 *   - document.documentElement.clientWidth / clientHeight default to 1024x768
 *
 * The "intrinsic content size" is therefore mocked with defineProperty, and the
 * viewport size is fixed to 1920x1080 so init() computes a stable root_w/root_h.
 * Everything else (MutationObserver, setInterval, setStyle, parse, clamp…)
 * runs for real.
 */
const Mod = require("../src/js/winbox.js");
const WinBox = Mod.default || Mod;

// small config shared by most tests — explicit so nothing is implicit
const base = {
    "title": "autosize",
    "maxwidth": 1000,
    "maxheight": 1000,
    "minwidth": 150,
    "minheight": 100,
    "border": 0
};

function mockBodySize(win, width, height){

    Object.defineProperty(win.body, "scrollWidth", {
        "get": () => width,
        "configurable": true
    });
    Object.defineProperty(win.body, "scrollHeight", {
        "get": () => height,
        "configurable": true
    });
}

// flush MutationObserver microtasks scheduled by the observer callback
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("WinBox.prototype.autoResize", () => {

    // windows created in the tests — closed automatically after each test so no
    // interval / window listener leaks into the next one
    const wins = [];
    let realWin;

    beforeAll(() => {

        // stable viewport: setup()->init() runs on the first `new WinBox`
        Object.defineProperty(document.documentElement, "clientWidth", {
            "value": 1920,
            "configurable": true
        });
        Object.defineProperty(document.documentElement, "clientHeight", {
            "value": 1080,
            "configurable": true
        });
    });

    beforeEach(() => {

        wins.length = 0;
    });

    afterEach(() => {

        for(const win of wins){

            if(win.dom){

                win.close();
            }
        }
        wins.length = 0;
    });

    function make(params){

        const win = new WinBox(Object.assign({}, base, params));
        wins.push(win);
        return win;
    }

    describe("sizing logic (autoResize called directly)", () => {

        test("grows the window to fit growing content", () => {

            const win = make({
                "width": 300,
                "height": 200,
                "x": 800,
                "y": 400
            });

            mockBodySize(win, 800, 600);
            win.autoResize();

            // target = clamp(content + border*2 + 1, max, min)
            // width  = clamp(800 + 0 + 1, 1000, 150) = 801
            // height = clamp(600 + 35 + 0 + 1, 1000, 100) = 636
            expect(win.width).toBe(801);
            expect(win.height).toBe(636);

            // the centre is preserved: new centre == old centre (modulo rounding)
            const oldCentreX = 800 + 300 / 2;
            const oldCentreY = 400 + 200 / 2;
            expect(Math.abs((win.x + win.width / 2) - oldCentreX)).toBeLessThanOrEqual(1);
            expect(Math.abs((win.y + win.height / 2) - oldCentreY)).toBeLessThanOrEqual(1);
        });

        test("shrinks the window when content shrank to less than half", () => {

            const win = make({
                "width": 800,
                "height": 600,
                "x": 500,
                "y": 300
            });

            mockBodySize(win, 100, 50);
            win.autoResize();

            // width  = clamp(100 + 1, 1000, 150) = 150  -> 800 >= 2*150 -> shrink
            // height = clamp(50 + 36, 1000, 100) = 100  -> 600 >= 2*100 -> shrink
            expect(win.width).toBe(150);
            expect(win.height).toBe(100);
        });

        test("does NOT shrink when content is only a little smaller (>= 2x not met)", () => {

            const win = make({
                "width": 800,
                "height": 600,
                "x": 500,
                "y": 300
            });

            // target width  = 501, current 800 -> 800 >= 2*501 (1002) is false
            // target height = 436, current 600 -> 600 >= 2*436 (872) is false
            mockBodySize(win, 500, 400);
            win.autoResize();

            expect(win.width).toBe(800);
            expect(win.height).toBe(600);
        });

        test("does NOT resize when the content already fits exactly", () => {

            const win = make({
                "width": 801,
                "height": 636,
                "x": 800,
                "y": 400
            });

            // target width  = clamp(800 + 1, 1000, 150) = 801  -> no grow, no shrink
            // target height = clamp(600 + 36, 1000, 100) = 636 -> no grow, no shrink
            mockBodySize(win, 800, 600);
            win.autoResize();

            expect(win.width).toBe(801);
            expect(win.height).toBe(636);
        });

        test("clamps growth to maxwidth / maxheight", () => {

            const win = make({
                "width": 300,
                "height": 200,
                "maxwidth": 500,
                "maxheight": 300
            });

            mockBodySize(win, 5000, 5000);
            win.autoResize();

            // width  = clamp(5001, 500, 150) = 500
            // height = clamp(5036, 300, 100) = 300
            expect(win.width).toBe(500);
            expect(win.height).toBe(300);
        });

        test("clamps shrink-down to minwidth / minheight", () => {

            const win = make({
                "width": 800,
                "height": 600
            });

            mockBodySize(win, 10, 10);
            win.autoResize();

            // width  = clamp(11, 1000, 150) = 150
            // height = clamp(46, 1000, 100) = 100
            expect(win.width).toBe(150);
            expect(win.height).toBe(100);
        });
    });

    describe("bounds / viewport", () => {

        test("moves proportional to the size difference (keep centre)", () => {

            const win = make({
                "width": 300,
                "height": 200,
                "x": 800,
                "y": 400
            });

            mockBodySize(win, 800, 600);
            win.autoResize();

            // new_x = 800 - (801 - 300) / 2 = 800 - 250.5 = 549.5 -> round 550
            // new_y = 400 - (636 - 200) / 2 = 400 - 218   = 182
            expect(win.x).toBe(550);
            expect(win.y).toBe(182);
        });

        test("clamps the position inside the viewport when the window grows near a corner", () => {

            const win = make({
                "width": 100,
                "height": 100,
                "x": 1850,
                "y": 1000
            });

            mockBodySize(win, 800, 600);
            win.autoResize();

            // grows to 801 x 636
            expect(win.width).toBe(801);
            expect(win.height).toBe(636);

            // would be 1850 - 350.5 = 1499.5 / 1000 - 268 = 732, but the window
            // must stay inside the 1920x1080 viewport
            // max_x = 1920 - 801 - 0 = 1119 ; max_y = 1080 - 636 - 0 = 444
            expect(win.x).toBe(1119);
            expect(win.y).toBe(444);
        });
    });

    describe("skip conditions", () => {

        test("skips while fullscreen", () => {

            const win = make({ "width": 300, "height": 200 });
            win.full = true;

            mockBodySize(win, 800, 600);
            win.autoResize();

            expect(win.width).toBe(300);
            expect(win.height).toBe(200);
        });

        test("skips while maximized", () => {

            const win = make({ "width": 300, "height": 200 });
            win.max = true;

            mockBodySize(win, 800, 600);
            win.autoResize();

            expect(win.width).toBe(300);
            expect(win.height).toBe(200);
        });

        test("skips while minimized", () => {

            const win = make({ "width": 300, "height": 200 });
            win.min = true;

            mockBodySize(win, 800, 600);
            win.autoResize();

            expect(win.width).toBe(300);
            expect(win.height).toBe(200);
        });

        test("skips while hidden", () => {

            const win = make({ "width": 300, "height": 200 });
            win.hide();

            mockBodySize(win, 800, 600);
            win.autoResize();

            expect(win.width).toBe(300);
            expect(win.height).toBe(200);
        });

        test("skips while the user is dragging (wb-lock)", () => {

            const win = make({ "width": 300, "height": 200 });
            document.body.classList.add("wb-lock");

            mockBodySize(win, 800, 600);
            win.autoResize();

            expect(win.width).toBe(300);
            expect(win.height).toBe(200);

            document.body.classList.remove("wb-lock");
        });

        test("is a no-op after close (no throw)", () => {

            const win = make({ "width": 300, "height": 200 });
            win.close();

            expect(win.dom).toBeNull();
            expect(() => win.autoResize()).not.toThrow();
        });
    });

    describe("autosize monitoring (autosize option)", () => {

        test("starts monitoring on construction and stops on close", () => {

            const win = make({ "autosize": true });

            // the MutationObserver + interval are created lazily by _startAutosize
            expect(win._autosizeObserver).not.toBeNull();
            expect(win._autosizeTimer).not.toBeNull();

            win.close();

            // both are released on close -> no leak
            expect(win._autosizeObserver).toBeNull();
            expect(win._autosizeTimer).toBeNull();
            expect(win.dom).toBeNull();
            expect(() => win.autoResize()).not.toThrow();
        });

        test("a DOM mutation triggers autoResize (selecting files)", async () => {

            // viewport-sized, no autosize-driven min-size surprises beyond minheight
            const win = make({
                "autosize": true,
                "x": 500,
                "y": 300
            });

            // jsdom reports no content at construction time -> window is at its
            // minimum size after the initial autoResize()
            expect(win.width).toBe(150);
            expect(win.height).toBe(100);

            // 1 file
            mockBodySize(win, 100, 80);
            win.body.appendChild(document.createElement("div"));
            await flush();

            // width already at min (150), height grows 100 -> 116
            expect(win.height).toBe(116);
            expect(win.width).toBe(150);

            // 100 files — content grows, the window follows
            mockBodySize(win, 600, 400);
            win.body.appendChild(document.createElement("div"));
            await flush();

            // clamp(601, 1000, 150) = 601 ; clamp(436, 1000, 100) = 436
            expect(win.width).toBe(601);
            expect(win.height).toBe(436);

            // delete -> content shrinks back to 1 file size and the window
            // shrinks again (601 >= 2*150 -> shrink)
            mockBodySize(win, 100, 80);
            win.body.appendChild(document.createElement("div"));
            await flush();

            expect(win.width).toBe(150);
            expect(win.height).toBe(116);
        });

        test("the interval safety net also triggers autoResize", () => {

            jest.useFakeTimers();

            const win = make({
                "autosize": true,
                "x": 500,
                "y": 300
            });

            // at construction scrollWidth is 0 -> window is at min size
            expect(win.width).toBe(150);

            // content shows up after construction -> only the 400ms interval
            // (not a mutation) can react
            mockBodySize(win, 800, 600);

            jest.advanceTimersByTime(800);

            expect(win.width).toBe(801);
            expect(win.height).toBe(636);

            // closing releases the interval, advancing time must not throw
            win.close();
            jest.advanceTimersByTime(2000);

            expect(() => win.autoResize()).not.toThrow();

            jest.useRealTimers();
        });
    });

    describe("manual resize disables autosize", () => {

        test("a user resize turns autosize off and stops monitoring", () => {

            const win = make({

                "autosize": true
            });

            expect(win.autosize).toBe(true);
            expect(win._autosizeObserver).not.toBeNull();
            expect(win._autosizeTimer).not.toBeNull();

            // mousedown on a resize grip sets _manualResize; the following
            // resize() call is treated as user-driven and releases autosize
            win._manualResize = true;
            win.resize(500, 400);

            expect(win.autosize).toBe(false);
            expect(win._autosizeObserver).toBeNull();
            expect(win._autosizeTimer).toBeNull();

            // the size the user chose is preserved
            expect(win.width).toBe(500);
            expect(win.height).toBe(400);
        });

        test("after a manual resize, content changes no longer resize the window", async () => {

            const win = make({

                "autosize": true
            });

            // simulate the user taking manual control of the window
            win._manualResize = true;
            win.resize(500, 400);

            expect(win.width).toBe(500);

            // content grows far beyond the manual size
            mockBodySize(win, 5000, 5000);

            // a DOM mutation that -- without the manual resize -- would have
            // grown the window to clamp(5001, 1000, 150) x clamp(5036, 1000, 100)
            win.body.appendChild(document.createElement("div"));
            win.body.appendChild(document.createElement("div"));

            // let any queued microtasks (observer, interval) run
            await flush();
            await new Promise((resolve) => setTimeout(resolve, 50));

            // autosize is off and the monitoring is gone -> no reaction
            expect(win.width).toBe(500);
            expect(win.height).toBe(400);
            expect(win.autosize).toBe(false);
        });

        test("a programmatic resize does NOT disable autosize", () => {

            const win = make({

                "autosize": true,
                "width": 300,
                "height": 200
            });

            // resize() called from code (no _manualResize flag) keeps autosize on
            win.resize(450, 350);

            expect(win.autosize).toBe(true);
            expect(win._autosizeObserver).not.toBeNull();
            expect(win._autosizeTimer).not.toBeNull();
            expect(win.width).toBe(450);
            expect(win.height).toBe(350);
        });
    });
});
