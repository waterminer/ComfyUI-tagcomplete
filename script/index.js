import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

function extensionAddMultilineWidget(node, name, options, app) {
    const emptyTooltipList = document.createElement('div');
    Object.assign(emptyTooltipList, { length: 0 });
    const container = document.createElement('div');
    const tooltip = document.createElement('div');
    const inputBox = document.createElement('textarea');
    let selectTag = "";
    inputBox.className = 'comfy-multiline-input';
    inputBox.value = options.defaultVal;
    inputBox.placeholder = options.placeholder || name;
    let tooltipListLen = 0
    if (app.vueAppReady) {
        api.fetchApi("/settings/Comfy.TextareaWidget.Spellcheck").then(res => {
            return res.json();
        }).then(json => {
            inputBox.spellcheck = json;
        });
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
        padding: "0px",
        zIndex: "1000",
        borderRadius: "4px"
    });

    function updateSelectWold(cursorPosition) {
        const text = inputBox.value;
        const front = text.slice(0, cursorPosition);
        selectTag = front.split(",").at(-1).trim().replace(/\s/g, '_');
        if (tooltipListLen !== 0)
            tooltip.style.display = 'block';
        else
            tooltip.style.display = 'none';
    }
    function insertText(tagData) {
        let front = inputBox.value.slice(0, inputBox.selectionStart);
        let frontArr = front.split(',');
        frontArr.pop();
        front = frontArr.join();
        if (frontArr.length !== 0) {
            front = front + ',';
        }
        const behind = inputBox.value.slice(inputBox.selectionStart)
        inputBox.value = `${front}${tagData.name.replace(/_/g, ' ')},${behind}`
        tooltip.style.display = 'none'
        tooltip.replaceChildren(emptyTooltipList)
    }
    function createTooltipList(json) {
        const tooltipList = document.createElement('ul');
        const first_chose = json.at(0);
        inputBox.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                event.preventDefault();
                insertText(first_chose)
            }
        }, { once: true })
        Object.assign(tooltipList, {
            length: 0
        })
        Object.assign(tooltipList.style, {
            listStyleType: "none",
            padding: "0px",
            margin: "0px"
        })
        for (const tagData of json) {
            const li = document.createElement('li')
            const element = document.createElement('button');
            tooltipList.length += 1
            let textColor = "#ca0000"
            switch (tagData.category) {
                case 0:
                    textColor = '#009be6'
                    break;
                case 1:
                    textColor = '#ff8a8b'
                    break;
                case 3:
                    textColor = '#a800aa'
                    break;
                case 4:
                    textColor = '#00ab2c'
                    break;
                case 5:
                    textColor = '#fd9200'
                    break;
                default:
                    break;
            }
            Object.assign(element.style, {
                width: "100%",
                color: textColor,
                textAlign: 'left'
            })
            if(tagData.alias){
                element.innerText = `${tagData.alias}->${tagData.name}`;
            }else{
                element.innerText = `${tagData.name}`;
            }
            element.addEventListener('click', (event) => {
                insertText(tagData)
            })
            li.append(element);
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
        const TooltipList = createTooltipList(json)
        tooltipListLen = TooltipList.length;
        if (tooltipListLen === 0) {
            tooltip.style.display = 'none';
        }
        tooltip.replaceChildren(TooltipList);
    }

    function getTextWidth(text, font) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = font;
        return context.measureText(text).width;
    }

    inputBox.addEventListener('focus', () => {
        if (tooltipListLen === 0)
            tooltip.style.display = 'none';
        else
            tooltip.style.display = 'block';
    });

    inputBox.addEventListener('blur', () => {
        setTimeout(() => {
            if (!tooltip.contains(document.activeElement)) {
                tooltip.style.display = 'none';
            }
        }, 100);
    });

    inputBox.addEventListener('input', async () => {
        const cursorPosition = inputBox.selectionStart;
        const textBeforeCursor = inputBox.value.slice(0, cursorPosition);
        const textWidth = getTextWidth(textBeforeCursor, window.getComputedStyle(inputBox).font);
        updateSelectWold(cursorPosition);
        tooltip.style.left = `${inputBox.offsetLeft + textWidth}px`;
        tooltip.style.top = `${inputBox.offsetTop + 14}px`;
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
        let res = undefined
        const multiline = !!inputData[1].multiline;
        const defaultVal = inputData[1].default || '';
        if (multiline) {
            res = extensionAddMultilineWidget(node, inputName, { defaultVal, ...inputData[1] }, app);
            if (inputData[1].dynamicPrompts != undefined) {
                res.widget.dynamicPrompts = inputData[1].dynamicPrompts
            }
        } else {
            res = o_WidgetSTRING(node, inputName, inputData, app);
        }
        return res;
    }
}

const extension = {
    name: "WaterMiner.TagComplete",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (!g_execute) {
            hijackString(app)
            g_execute = true
        }
    }
}
let g_execute = false
app.registerExtension(extension);