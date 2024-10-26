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
        inputBox.spellcheck = o_InputEl.spellcheck;
    }
    Object.assign(inputBox.style, {
        width: "100%",
        height: "100%"
    });
    Object.assign(tooltip.style, {
        position: "absolute",
        display: "none",
        color: "white",
        border: "1px solid #ccc",
        padding: "5px",
        zIndex: "1000",
        borderRadius: "4px"
    });

    function updateSelectWold(cursorPosition) {
        const text = inputBox.value;
        const front = text.slice(0, cursorPosition);
        selectTag = front.split(",").at(-1).trim();
        if (selectTag)
            tooltip.style.display = 'block';
        else
            tooltip.style.display = 'none';
    }

    function createTooltipList(json) {
        const tooltipList = document.createElement('ul');
        tooltipList.style.listStyleType="none"
        for (const tagData of json) {
            const li = document.createElement('li')
            const element = document.createElement('button');
            Object.assign(li.style, {
                position: "center"
            });
            element.innerText = tagData.name;
            li.append(element)
            tooltipList.append(li);
        }
        return tooltipList
    }

    async function updateTooltip(tag) {
        const params = new URLSearchParams({ name: tag })
        const result = await api.fetchApi(
            `/water_miner/database?${params.toString()}`,
            { method: "GET" }
        )
        if (result.status !== 200)
            throw new Error(`Fetch Failed,code:${result.status}`);
        const json = await result.json();
        tooltip.replaceChildren(createTooltipList(json))
    }

    function getTextWidth(text, font) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        return context.measureText(text).width;
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

    inputBox.addEventListener('input', async () => {
        const cursorPosition = inputBox.selectionStart;
        const textBeforeCursor = inputBox.value.slice(0, cursorPosition);
        const textWidth = getTextWidth(textBeforeCursor, window.getComputedStyle(inputBox).font);
        updateSelectWold(cursorPosition);
        tooltip.style.left = `${inputBox.offsetLeft + textWidth}px`;
        tooltip.style.top = `${inputBox.offsetTop + 10}px`;
        await updateTooltip(selectTag);
    });

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