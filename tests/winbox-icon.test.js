/**
 * Tests for WinBox#setIcon / the `icon` option.
 *
 * The icon source can be a plain string (shortcut for the "Url" type) or an
 * object of the shape:
 *
 *   { IconType: "Url" | "Class" | "Html", Source: ..., Id: ..., IconStyle: {...} }
 */
const Mod = require("../src/js/winbox.js");
const WinBox = Mod.default || Mod;

describe("WinBox.prototype.setIcon", () => {

    const wins = [];
    let realWin;

    function make(params){

        const win = new WinBox(Object.assign({ "title": "icon" }, params));
        wins.push(win);
        return win;
    }

    function iconNode(win){

        return win.dom.getElementsByClassName("wb-icon")[0];
    }

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

    describe("plain string (shortcut for the Url type)", () => {

        test("sets the image as background", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon("demo/wikipedia.svg");

            expect(node.style.backgroundImage).toContain("demo/wikipedia.svg");
            expect(node.style.display).toBe("inline-block");
        });

        test("is applied via the constructor option", () => {

            const win = make({ "icon": "demo/wikipedia.svg" });
            const node = iconNode(win);

            expect(node.style.backgroundImage).toContain("demo/wikipedia.svg");
            expect(node.style.display).toBe("inline-block");
        });
    });

    describe("IconType: Url", () => {

        test("sets the image as background", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "IconType": "Url", "Source": "demo/icon.png" });

            expect(node.style.backgroundImage).toContain("demo/icon.png");
            expect(node.style.display).toBe("inline-block");
        });

        test("is the default type when no type is given", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "Source": "demo/icon.png" });

            expect(node.style.backgroundImage).toContain("demo/icon.png");
        });
    });

    describe("IconType: Class", () => {

        test("applies the classname to the icon node", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "IconType": "Class", "Source": "wb-icon-star" });

            expect(node.classList.contains("wb-icon-star")).toBe(true);
            expect(node.style.display).toBe("inline-block");
        });

        test("accepts an array of classnames", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "IconType": "Class", "Source": ["wb-icon-star", "is-active"] });

            expect(node.classList.contains("wb-icon-star")).toBe(true);
            expect(node.classList.contains("is-active")).toBe(true);
        });

        test("removes the classname again when the icon changes", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "IconType": "Class", "Source": "wb-icon-star" });
            win.setIcon({ "IconType": "Url", "Source": "demo/icon.png" });

            expect(node.classList.contains("wb-icon-star")).toBe(false);
            expect(node.style.backgroundImage).toContain("demo/icon.png");
        });
    });

    describe("IconType: Html", () => {

        test("inserts the markup into the icon node", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "IconType": "Html", "Source": "<span class='star'>*</span>" });

            expect(node.innerHTML).toBe("<span class=\"star\">*</span>");
            expect(node.style.display).toBe("inline-block");
        });

        test("replaces a previous image", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon("demo/icon.png");
            win.setIcon({ "IconType": "Html", "Source": "<b>x</b>" });

            expect(node.innerHTML).toBe("<b>x</b>");
            expect(node.style.backgroundImage).not.toContain("demo/icon.png");
        });
    });

    describe("Id and IconStyle", () => {

        test("sets the id of the icon node", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({ "IconType": "Class", "Source": "wb-icon-star", "Id": "my-icon" });

            expect(node.id).toBe("my-icon");
        });

        test("applies the inline styles", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({
                "IconType": "Url",
                "Source": "demo/icon.png",
                "IconStyle": { "background-size": "17px auto" }
            });

            expect(node.style.getPropertyValue("background-size")).toBe("17px auto");
        });

        test("removes the inline styles when the icon changes", () => {

            const win = make();
            const node = iconNode(win);

            win.setIcon({
                "IconType": "Url",
                "Source": "demo/icon.png",
                "IconStyle": { "background-size": "17px auto" }
            });

            win.setIcon({ "IconType": "Url", "Source": "demo/icon2.png" });

            expect(node.style.getPropertyValue("background-size")).toBe("");
        });
    });

    test("ignores invalid input without throwing", () => {

        const win = make();

        expect(() => win.setIcon(null)).not.toThrow();
        expect(() => win.setIcon(undefined)).not.toThrow();
        expect(() => win.setIcon(42)).not.toThrow();
        expect(() => win.setIcon({})).not.toThrow();
    });

    test("returns the instance (chaining)", () => {

        const win = make();

        expect(win.setIcon("demo/icon.png")).toBe(win);
    });
});
