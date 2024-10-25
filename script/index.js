import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

function extensionAddMultilineWidget(o_Widget, node, name, options, app) {
    const container = document.createElement('div');
    const tooltip = document.createElement('div');
    const inputBox = document.createElement('textarea');
    const o_InputEl = o_Widget.element;
    let selectTag = "";
    inputBox.className = 'comfy-multiline-input';
    inputBox.value = options.defaultVal;
    inputBox.placeholder = options.placeholder || name;
    if (app.vueAppReady) {
        container.spellcheck = o_InputEl.spellcheck;
    }
    Object.assign(inputBox.style, {
        width: "100%",
        height: "100%"
    });
    Object.assign(tooltip.style, {
        position: "absolute",
        display: "none",
        backgroundColor: "#232355",
        color: "white",
        border: "1px solid #ccc",
        padding: "5px",
        zIndex: "1000",
        borderRadius: "4px"
    });

    function updateSelectWold(cursorPosition) {
        const text = inputBox.value;
        const front = text.slice(0,cursorPosition);
        selectTag = front.split(",").at(-1);
        if (selectTag)
            tooltip.style.display = 'block';
        else
            tooltip.style.display = 'none';
    }

    async function updateTooltip(tag) {
        const body = new FormData()
        body.append("name",tag)
        const res = await fetchApi("/water_miner/database",{
            method:"GET",body
        })
        
    }

    inputBox.addEventListener('focus', () => {
        if (selectTag)
            tooltip.style.display = 'block';
        else
            tooltip.style.display = 'none';
    });

    inputBox.addEventListener('blur', () => {
        tooltip.style.display = 'none';
    });

    inputBox.addEventListener('input', async() => {
        const cursorPosition = inputBox.selectionStart;
        const textBeforeCursor = inputBox.value.slice(0, cursorPosition);
        const textWidth = getTextWidth(textBeforeCursor, window.getComputedStyle(inputBox).font);
        updateSelectWold(cursorPosition);
        tooltip.style.left = `${inputBox.offsetLeft + textWidth}px`;
        tooltip.style.top = `${inputBox.offsetTop + 10}px`;
        updateTooltip(selectTag);
    });

    function getTextWidth(text, font) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        return context.measureText(text).width;
    }

    container.append(inputBox, tooltip)
    const widget = node.addDOMWidget(name, 'extensioncustomtext', container, {
        getValue() {
            return inputBox.value;
        },
        setValue(v) {
            inputBox.value = v;
        }
    })
    widget.inputEl = container;
    inputBox.addEventListener('input', () => {
        widget.callback?.(widget.value);
    })

    return { minWidth: 400, minHeight: 200, widget }

}

function hijackString(app) {
    console.log("injected!");

    const o_WidgetSTRING = app.widgets.STRING;
    app.widgets.STRING = function (node, inputName, inputData, app) {
        let res = o_WidgetSTRING(node, inputName, inputData, app);
        const o_DynamicPromptsConfig = res.widget.dynamicPrompts
        const multiline = !!inputData[1].multiline;
        const defaultVal = inputData[1].default || '';
        if (multiline) {
            res = extensionAddMultilineWidget(res.widget, node, inputName, { defaultVal, ...inputData[1] }, app);
            res.widget.dynamicPrompts = o_DynamicPromptsConfig
        }
        console.log(res);
        return res;
    }
}

const extension = {
    name: "WaterMiner.TagComplete",
    async nodeCreated(nodeData, app) {
        hijackString(app)
        nodeData.widgets = nodeData.widgets.filter(widget => {
            return widget.type !== 'customtext';
        });
    }
}

app.registerExtension(extension);