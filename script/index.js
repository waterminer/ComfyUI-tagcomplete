import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

function extensionAddMultilineWidget(o_Widget, node, name, options, app) {
    const container = document.createElement('div')
    const tooltip = document.createElement('div')
    const inputBox = document.createElement('textarea')
    const o_InputEl = o_Widget.element
    inputBox.className = 'comfy-multiline-input'
    inputBox.value = options.defaultVal
    inputBox.placeholder = options.placeholder || name
    if (app.vueAppReady) {
        container.spellcheck = o_InputEl.spellcheck
    }
    Object.assign(tooltip, {
        
    });
    container.append(inputBox, tooltip)
    const widget = node.addDOMWidget(name, 'customtext', container, {
        getValue() {
            return inputBox.value
        },
        setValue(v) {
            inputBox.value = v
        }
    })
    widget.inputEl = container
    inputBox.addEventListener('input', () => {
        widget.callback?.(widget.value)
    })

    return { minWidth: 400, minHeight: 200, widget }

}

const extension = {
    name: "WaterMiner.TagComplete",
    async beforeRegisterNodeDef(_, _, app) {
        const o_WidgetSTRING = app.widgets.STRING;
        app.widgets.STRING = function (node, inputName, inputData, app) {
            let res = o_WidgetSTRING(node, inputName, inputData, app);
            const o_DynamicPromptsConfig = res.widget.dynamicPrompts
            const multiline = !!inputData[1].multiline;
            const defaultVal = inputData[1].default || ''
            if (multiline) {
                res = extensionAddMultilineWidget(res.widget, node, inputName, { defaultVal, ...inputData[1] }, app);
                res.widget.dynamicPrompts = o_DynamicPromptsConfig
            }
            console.log(res);
            return res;
        }
    }
}

app.registerExtension(extension);