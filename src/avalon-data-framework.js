{
    'use strict';
    //
    // ATTR is the attribute on <element> as html attribute, thus they all start with "data-".
    //
    const ATTR_URL = "data-url";
    const ATTR_JSON = "data-json";
    const ATTR_AUTO_GET = "data-auto-get";
    const ATTR_LOOP = "data-loop";
    const ATTR_LOOP_DELETE = "data-loop-delete";
    const ATTR_PENETRATE = "data-penetrate";
    const ATTR_ANALYZING = "data-analyzing";
    //
    // PROPERTY is the analysis result or related data attached to the <element> as JavaScript Object Property in form like element["property"].
    //
    const PROPERTY_SPAD = "lzsoft-spad";
    const PROPERTY_SPAD_ELEMENT_SUMMARY = "element-summary"; // GET, PUT, IDENTIFIER.
    const PROPERTY_SPAD_TEMPLATE_MAP = "template-map"; // "value": "{{name:GET:PUT}}".
    const PROPERTY_SPAD_ENTITY_LIST = "entity-list"; // [<entity-element-set>, <entity-element-set>].
    const PROPERTY_SPAD_LOOP_UTIL = "loop-util"; // { appendNewEntity: function(){}, deleteMap: new Map() }
    //
    // KEYWORD is a symbol that used in element data definition, like: value="{{name:GET:PUT}}".
    //
    const KEYWORD_GET = "GET";
    const KEYWORD_PUT = "PUT";
    const KEYWORD_IDENTIFIER = "IDENTIFIER";
    const KEYWORD_STRING = "STRING";
    const KEYWORD_JSON = "JSON";
    const KEYWORD_INTEGER = "INTEGER";
    const KEYWORD_FLOAT = "FLOAT";
    const KEYWORD_BOOLEAN = "BOOLEAN";
    const KEYWORD_DATE = "DATE";
    const KEYWORD_TIME = "TIME";
    const KEYWORD_PARAM = "PARAM";
    const KEYWORD_VAL = "VAL";
    const KEYWORD_DATA_OPEN = "{{";
    const KEYWORD_DATA_CLOSE = "}}";
    const KEYWORD_EVENT_OPEN = "[[";
    const KEYWORD_EVENT_CLOSE = "]]";
    const KEYWORD_PARAM_OPEN = "(";
    const KEYWORD_PARAM_CLOSE = ")";
    const KEYWORD_SPLITTER = ":";
    //
    // EVENT is a symbol that used in element event definition or SPAD event firing, like: onblur="[[GET]]" or SPAD.addEventListener("GETDONE").
    //
    const EVENT_GET = "GET";
    const EVENT_PUT = "PUT";
    const EVENT_GET_DONE = "GETDONE";
    const EVENT_PUT_DONE = "PUTDONE";
    //
    window.customElements.define('avalon-data-framework', class extends HTMLElement {
        validate() {
            let self = this;
            return true;
        }
        analyze(root) {
            let self = this;
            root[PROPERTY_SPAD] = root[PROPERTY_SPAD] || {};
            root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY] = {
                [KEYWORD_GET]: new Set(),
                [KEYWORD_PUT]: new Set(),
                [KEYWORD_IDENTIFIER]: new Set()
            };
            let all = root.querySelectorAll("*");
            for (let e of all) {
                if (!e.hasAttribute(ATTR_ANALYZING)) {
                    let p = e.parentNode;
                    let stamina = 1 + (e.hasAttribute(ATTR_PENETRATE) ? parseInt(e.getAttribute(ATTR_PENETRATE), 10) : 0);
                    while (p && stamina > 0) {
                        if (p.tagName === "AVALON-DATA-FRAMEWORK") {
                            stamina--;
                            if (stamina === 0 && p === self) {
                                analyzeElement(e);
                            }
                        }
                        p = p.parentNode;
                    }
                    if (stamina > 0) { // Abstract node
                        analyzeElement(e);
                    }
                }
            }

            function analyzeElement(e) {
                e.setAttribute(ATTR_ANALYZING, "");
                e[PROPERTY_SPAD] = e[PROPERTY_SPAD] || {};
                // Content
                if (e.children.length === 0) {
                    analyzeTemplate(e, "", e.textContent);
                }
                // Attribute
                let p = 0;
                let al = e.attributes;
                while (p < al.length) {
                    let processed = false;
                    processed = processed || analyzeTemplate(e, al[p].name, al[p].value);
                    processed = processed || analyzeEvent(e, al[p].name, al[p].value);
                    if (!processed) {
                        p++;
                    }
                }
                e.removeAttribute(ATTR_ANALYZING);

                function analyzeEvent(e, name, value) {
                    if (eventDefinitionExist(value)) {
                        let elementEventName = name.substring(2); // "onchange" -> "change"
                        let spadEventList = value.replace(KEYWORD_EVENT_OPEN, "").replace(KEYWORD_EVENT_CLOSE, "").split(KEYWORD_SPLITTER);
                        for (let spadEventName of spadEventList) {
                            e.addEventListener(elementEventName, function() {
                                self.dispatchEvent(new Event(spadEventName));
                            });
                        }
                        e.removeAttribute(name);
                        return true;
                    } else {
                        return false;
                    }

                    function eventDefinitionExist(t) {
                        return value.indexOf(KEYWORD_EVENT_OPEN) > -1 && value.indexOf(KEYWORD_EVENT_CLOSE) > -1 && value.indexOf(KEYWORD_EVENT_OPEN) < value.indexOf(KEYWORD_EVENT_CLOSE);
                    }
                }

                function analyzeTemplate(e, name, template) {
                    if (dataDefinitionExist(template) && onlySingleSourceExist(template)) {
                        let spadDataList = template.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER);
                        let param = "";
                        let val = "";
                        for (let spadDataName of spadDataList) {
                            switch (true) {
                                case spadDataName === KEYWORD_IDENTIFIER:
                                    root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_IDENTIFIER].add(e);
                                    break;
                                case spadDataName === KEYWORD_GET:
                                    root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_GET].add(e);
                                    break;
                                case spadDataName === KEYWORD_PUT:
                                    root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_PUT].add(e);
                                    break;
                                case spadDataName.indexOf(KEYWORD_PARAM) > -1:
                                    param = spadDataName.replace(KEYWORD_PARAM, '').replace(KEYWORD_PARAM_OPEN, '').replace(KEYWORD_PARAM_CLOSE, '');
                                    break;
                                case spadDataName.indexOf(KEYWORD_VAL) > -1:
                                    val = spadDataName.replace(KEYWORD_VAL, '').replace(KEYWORD_PARAM_OPEN, '').replace(KEYWORD_PARAM_CLOSE, '');
                                    break;
                            }
                        }
                        e[PROPERTY_SPAD][PROPERTY_SPAD_TEMPLATE_MAP] = e[PROPERTY_SPAD][PROPERTY_SPAD_TEMPLATE_MAP] || new Map();
                        e[PROPERTY_SPAD][PROPERTY_SPAD_TEMPLATE_MAP].set(name, template);
                        if (e instanceof HTMLTemplateElement && e.hasAttribute(ATTR_LOOP)) {
                            e[PROPERTY_SPAD][PROPERTY_SPAD_ENTITY_LIST] = [];
                            e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL] = {};
                            // template function
                            e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].deleteMap = new Map();
                            e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].appendNewEntity = function(data, outAfter) {
                                let holder = document.createElement("div");
                                holder.innerHTML = e.innerHTML;
                                self.analyze(holder);
                                self.render(holder, data);
                                let childTotal = [];
                                for (let deleter of holder.querySelectorAll('[' + ATTR_LOOP_DELETE + ']')) {
                                    e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].deleteMap.set(deleter, childTotal);
                                    deleter.addEventListener("click", function() {
                                        e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].deleteAllEntity(deleter, true);
                                    });
                                }
                                while (holder.firstChild) {
                                    childTotal.push(holder.firstChild);
                                    e.parentNode.appendChild(holder.firstChild);
                                }
                                e[PROPERTY_SPAD][PROPERTY_SPAD_ENTITY_LIST].push(holder[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY]);
                                if (outAfter) {
                                    self.dispatchEvent(new Event(EVENT_PUT));
                                }
                            };
                            e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].deleteAllEntity = function(deleter, outAfter) {
                                let m = e[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].deleteMap.get(deleter);
                                for (let c of m) {
                                    c.remove();
                                }
                                if (outAfter) {
                                    self.dispatchEvent(new Event(EVENT_PUT));
                                }
                            };
                            // template function
                        }
                        if (name) {
                            // Attribute
                            e.removeAttribute(name);
                            if (param) {
                                e.setAttribute(name, window.location.getParam(param));
                            }
                            if (val) {
                                e.setAttribute(name, val);
                            }
                        } else {
                            // Content
                            e.textContent = "";
                            if (param) {
                                e.textContent = window.location.getParam(param);
                            }
                            if (val) {
                                e.textContent = val;
                            }
                        }
                        return true;
                    } else {
                        return false;
                    }

                    function dataDefinitionExist(t) {
                        return t.indexOf(KEYWORD_DATA_OPEN) > -1 && t.indexOf(KEYWORD_DATA_CLOSE) > -1 && t.indexOf(KEYWORD_DATA_OPEN) < t.indexOf(KEYWORD_DATA_CLOSE);
                    }

                    function onlySingleSourceExist(t) {
                        let passed = true;
                        if (t.indexOf(KEYWORD_DATA_OPEN) !== t.lastIndexOf(KEYWORD_DATA_OPEN)) {
                            passed = false;
                        }
                        if (t.indexOf(KEYWORD_DATA_CLOSE) !== t.lastIndexOf(KEYWORD_DATA_CLOSE)) {
                            passed = false;
                        }
                        if (!passed) {
                            throw new Error("An template definition can only contain one single data template, like {{name:PUT}}, while your definition is " + t);
                        }
                        return passed;
                    }
                }
            }
        }
        eventize() {
            let self = this;
            self.addEventListener(EVENT_GET, async function(e) {
                e.stopPropagation();
                let query = self.gather(self, true);
                if (self.hasAttribute(ATTR_URL)) {
                    done(await window.Lzsoft.Api.Get(self.getAttribute(ATTR_URL), query));
                } else if (self.hasAttribute(ATTR_JSON)) {
                    done(JSON.parse(self.getAttribute(ATTR_JSON)));
                } else {
                    done(null);
                }

                function done(json) {
                    self.render(self, json, false);
                    self.dispatchEvent(new Event(EVENT_GET_DONE));
                }
            });
            self.addEventListener(EVENT_PUT, async function(e) {
                e.stopPropagation();
                let query = self.gather(self, false);
                if (self.hasAttribute(ATTR_URL)) {
                    done(await window.Lzsoft.Api.Put(self.getAttribute(ATTR_URL), query));
                } else if (self.hasAttribute(ATTR_JSON)) {
                    self.setAttribute(ATTR_JSON, JSON.stringify(query));
                    done(query);
                } else {
                    done(query);
                }

                function done(json) {
                    if (json) {
                        self.render(self, json, true);
                    }
                    self.dispatchEvent(new Event(EVENT_PUT_DONE));
                }
            });
            if (self.hasAttribute(ATTR_AUTO_GET)) {
                self.dispatchEvent(new Event(EVENT_GET));
            }
        }
        render(root, data, onlyIdentifier) {
            let self = this;
            let inElements = onlyIdentifier ? root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_IDENTIFIER] : root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_GET];
            for (let e of inElements) {
                let attributeMap = e[PROPERTY_SPAD][PROPERTY_SPAD_TEMPLATE_MAP];
                if (e.tagName === "TEMPLATE" && attributeMap.has(ATTR_LOOP)) {
                    renderArray(e, attributeMap.get(ATTR_LOOP));
                } else {
                    for (let a of attributeMap.keys()) {
                        if (attributeMap.get(a).indexOf(onlyIdentifier ? KEYWORD_SPLITTER + KEYWORD_IDENTIFIER : KEYWORD_SPLITTER + KEYWORD_GET) > -1) {
                            renderProperty(e, a, attributeMap.get(a));
                        }
                    }
                }
            }

            function renderArray(templateElement, templateTemplate) {
                let keywords = templateTemplate.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER);
                let path = keywords.shift();
                let value = getDeepValue(data, path) || []; // which is an array
                for (let es of templateElement[PROPERTY_SPAD][PROPERTY_SPAD_ENTITY_LIST]) {
                    for (let e of es[KEYWORD_GET]) {
                        e.remove();
                    }
                }
                templateElement[PROPERTY_SPAD][PROPERTY_SPAD_ENTITY_LIST] = [];
                for (let v of value) {
                    templateElement[PROPERTY_SPAD][PROPERTY_SPAD_LOOP_UTIL].appendNewEntity(v, false);
                }
            }

            function renderProperty(element, name, template) {
                let keywords = template.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER);
                let path = keywords.shift();
                let value = getDeepValue(data, path);
                switch (true) {
                    case keywords.indexOf(KEYWORD_JSON) > -1:
                        try {
                            value = JSON.stringify(value);
                        } catch (e) {
                            value = "";
                        }
                        break;
                    case keywords.indexOf(KEYWORD_STRING) > -1:
                        value = value.toString();
                        break;
                    case keywords.indexOf(KEYWORD_INTEGER) > -1:
                        value = value || 0;
                        break;
                    case keywords.indexOf(KEYWORD_FLOAT) > -1:
                        value = value || 0;
                        break;
                    case keywords.indexOf(KEYWORD_BOOLEAN) > -1:
                        value = value.toString();
                        break;
                    case keywords.indexOf(KEYWORD_DATE) > -1:
                        {
                            let d = new Date(value);
                            value = d.toLocaleDateString();
                            break;
                        }
                    case keywords.indexOf(KEYWORD_TIME) > -1:
                        {
                            let t = new Date(value);
                            value = t.toLocaleTimeString();
                            break;
                        }
                }
                switch (name) {
                    case "":
                        element.textContent = value || "";
                        break;
                    case "value":
                        element.value = value || "";
                        break;
                    case "checked":
                        if (value) {
                            element.setAttribute("checked", "");
                        } else {
                            element.removeAttribute("checked");
                        }
                        break;
                    default:
                        if (!value && value !== 0) {
                            element.removeAttribute(name);
                        } else {
                            element.setAttribute(name, value);
                        }
                        break;
                }
            }

            function getDeepValue(obj, path) {
                path = path.split('/');
                if (path.length === 1 && path[0] === "") {
                    // Template like {{:GET}}, return the obj itself.
                } else {
                    for (let i = 0; i < path.length; i++) {
                        obj = obj ? obj[path[i]] : obj;
                    }
                }
                return obj;
            }
        }
        gather(root, onlyIdentifier) {
            let self = this;
            let data = {};
            let outElements = onlyIdentifier ? root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_IDENTIFIER] : root[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY][KEYWORD_PUT];
            for (let e of outElements) {
                let attributeMap = e[PROPERTY_SPAD][PROPERTY_SPAD_TEMPLATE_MAP];
                if (e.tagName === "TEMPLATE" && attributeMap.has(ATTR_LOOP)) {
                    gatherArray(e, attributeMap.get(ATTR_LOOP));
                } else {
                    for (let a of attributeMap.keys()) {
                        if (attributeMap.get(a).indexOf(onlyIdentifier ? KEYWORD_SPLITTER + KEYWORD_IDENTIFIER : KEYWORD_SPLITTER + KEYWORD_PUT) > -1) {
                            gatherProperty(e, a, attributeMap.get(a));
                        }
                    }
                }
            }

            function gatherArray(templateElement, templateTemplate) {
                let path = templateTemplate.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER).shift();
                let value = [];
                let elementList = templateElement[PROPERTY_SPAD][PROPERTY_SPAD_ENTITY_LIST];
                for (let elementSummary of elementList) {
                    let holder = document.createElement("div");
                    for (let e of elementSummary[KEYWORD_PUT]) {
                        if (e.getRootNode() === e.ownerDocument) {
                            let ec = e.cloneNode(true);
                            holder.appendChild(ec);
                        } else {
                            elementSummary[KEYWORD_PUT].delete(e);
                        }
                    }
                    if (elementSummary[KEYWORD_PUT].size > 0) {
                        holder[PROPERTY_SPAD] = {};
                        holder[PROPERTY_SPAD][PROPERTY_SPAD_ELEMENT_SUMMARY] = elementSummary;
                        value.push(self.gather(holder, onlyIdentifier));
                    }
                }
                setDeepValue(data, path, value);
            }

            function gatherProperty(element, name, template) {
                let keywords = template.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER);
                let path = keywords.shift();
                let value = null;
                switch (name) {
                    case "":
                        value = element.textContent;
                        break;
                    case "value":
                        value = element.value;
                        break;
                    case "checked":
                        value = element.checked;
                        break;
                    default:
                        value = element.getAttribute(name);
                        break;
                }
                switch (true) {
                    case keywords.indexOf(KEYWORD_JSON) > -1:
                        try {
                            value = JSON.parse(value);
                        } catch (e) {
                            value = null;
                        }
                        break;
                    case keywords.indexOf(KEYWORD_STRING) > -1:
                        value = value.toString();
                        break;
                    case keywords.indexOf(KEYWORD_INTEGER) > -1:
                        value = parseInt(value, 10) || 0;
                        break;
                    case keywords.indexOf(KEYWORD_FLOAT) > -1:
                        value = parseFloat(value) || 0;
                        break;
                    case keywords.indexOf(KEYWORD_BOOLEAN) > -1:
                        value = (value === 'true');
                        break;
                    case keywords.indexOf(KEYWORD_DATE) > -1:
                    case keywords.indexOf(KEYWORD_TIME) > -1:
                        value = new Date(value);
                        break;
                }
                setDeepValue(data, path, value);
            }

            function setDeepValue(obj, path, value) {
                if (typeof path === "string") {
                    path = path.split('/');
                }
                if (path.length > 1) {
                    let p = path.shift();
                    if (obj[p] === null || typeof obj[p] !== 'object') {
                        obj[p] = {};
                    }
                    setDeepValue(obj[p], path, value);
                } else {
                    obj[path[0]] = value;
                }
            }
            return data;
        }
        constructor() {
            super();
        }
        connectedCallback() {
            this.validate();
            this.analyze(this);
            this.eventize();
        }
    });
}
