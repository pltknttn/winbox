/**
 * @jest-environment jsdom
 */

describe('WinBox Helper Functions', () => {
    let addListener, removeListener, preventEvent, getByClass, addClass, hasClass, removeClass, setStyle, setAttribute, removeAttribute, setText;

    beforeAll(() => {
        // Dynamically import the module
        const helpers = require('../src/js/helper.js');
        addListener = helpers.addListener;
        removeListener = helpers.removeListener;
        preventEvent = helpers.preventEvent;
        getByClass = helpers.getByClass;
        addClass = helpers.addClass;
        hasClass = helpers.hasClass;
        removeClass = helpers.removeClass;
        setStyle = helpers.setStyle;
        setAttribute = helpers.setAttribute;
        removeAttribute = helpers.removeAttribute;
        setText = helpers.setText;
    });

    describe('addListener', () => {
        test('should add event listener to node', () => {
            const element = document.createElement('div');
            const listener = jest.fn();
            addListener(element, 'click', listener);
            element.click();
            expect(listener).toHaveBeenCalled();
        });

        test('should not throw if node is null', () => {
            expect(() => addListener(null, 'click', jest.fn())).not.toThrow();
        });
    });

    describe('removeListener', () => {
        test('should remove event listener', () => {
            const element = document.createElement('div');
            const listener = jest.fn();
            addListener(element, 'click', listener);
            removeListener(element, 'click', listener);
            element.click();
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('preventEvent', () => {
        test('should call stopPropagation', () => {
            const event = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
            preventEvent(event);
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        test('should call preventDefault when prevent is true', () => {
            const event = { stopPropagation: jest.fn(), preventDefault: jest.fn() };
            preventEvent(event, true);
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('getByClass', () => {
        test('should return element with specified class', () => {
            const div = document.createElement('div');
            div.className = 'test-class';
            document.body.appendChild(div);
            const result = getByClass(document, 'test-class');
            expect(result).toBe(div);
            document.body.removeChild(div);
        });
    });

    describe('addClass', () => {
        test('should add class to element', () => {
            const div = document.createElement('div');
            addClass(div, 'test-class');
            expect(div.classList.contains('test-class')).toBe(true);
        });
    });

    describe('hasClass', () => {
        test('should check if element has class', () => {
            const div = document.createElement('div');
            div.className = 'test-class';
            expect(hasClass(div, 'test-class')).toBe(true);
            expect(hasClass(div, 'other-class')).toBe(false);
        });
    });

    describe('removeClass', () => {
        test('should remove class from element', () => {
            const div = document.createElement('div');
            div.className = 'test-class';
            removeClass(div, 'test-class');
            expect(div.classList.contains('test-class')).toBe(false);
        });
    });

    describe('setStyle', () => {
        test('should set style property', () => {
            const div = document.createElement('div');
            setStyle(div, 'background', '#fff');
            // Browser normalizes #fff to rgb(255, 255, 255)
            expect(div.style.getPropertyValue('background')).toBe('rgb(255, 255, 255)');
        });
    });

    describe('setAttribute', () => {
        test('should set attribute', () => {
            const div = document.createElement('div');
            setAttribute(div, 'data-test', 'value');
            expect(div.getAttribute('data-test')).toBe('value');
        });
    });

    describe('removeAttribute', () => {
        test('should remove attribute', () => {
            const div = document.createElement('div');
            div.setAttribute('data-test', 'value');
            removeAttribute(div, 'data-test');
            expect(div.hasAttribute('data-test')).toBe(false);
        });
    });

    describe('setText', () => {
        test('should set text content', () => {
            const div = document.createElement('div');
            setText(div, 'Hello World');
            expect(div.textContent).toBe('Hello World');
        });

        test('should update existing text node', () => {
            const div = document.createElement('div');
            div.appendChild(document.createTextNode('Old text'));
            setText(div, 'New text');
            expect(div.firstChild.textContent).toBe('New text');
        });
    });
});