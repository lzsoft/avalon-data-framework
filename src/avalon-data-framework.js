{
    'use strict';
    //
    // ATTR is the attribute on <element> as html attribute, thus they all start with "data-".
    //
    const ATTR_URL = "data-url";
    const ATTR_JSON = "data-json";
    const ATTR_AUTO_GET = "data-auto-get";
    const ATTR_GET_AFTER_PUT = "data-get-after-put";
    const ATTR_LOOP = "data-loop";
    const ATTR_LOOP_DELETE = "data-loop-delete";
    const ATTR_PENETRATE = "data-penetrate";
    const ATTR_ANALYZING = "data-analyzing";
    const ATTR_LOADING = "data-loading";
    //
    // PROPERTY is the analysis result or related data attached to the <element> as JavaScript Object Property in form like element["property"].
    //
    const PROPERTY_ADF = "tingting-adf";
    const PROPERTY_ADF_ELEMENT_SUMMARY = "element-summary"; // GET, PUT, IDENTIFIER.
    const PROPERTY_ADF_TEMPLATE_MAP = "template-map"; // "value": "{{name:GET:PUT}}".
    const PROPERTY_ADF_ENTITY_LIST = "entity-list"; // [<entity-element-set>, <entity-element-set>].
    const PROPERTY_ADF_LOOP_UTIL = "loop-util"; // { appendNewEntity: function(){}, deleteMap: new Map() }
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
    const KEYWORD_SEGMENT = "SEGMENT";
    const KEYWORD_GET_ALIAS = "GETALIAS";
    const KEYWORD_PUT_ALIAS = "PUTALIAS";
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
            return true;
        }
        analyze(root) {
            let self = this;
            root[PROPERTY_ADF] = root[PROPERTY_ADF] || {};
            root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY] = {
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
                e[PROPERTY_ADF] = e[PROPERTY_ADF] || {};
                e[PROPERTY_ADF][PROPERTY_ADF_TEMPLATE_MAP] = e[PROPERTY_ADF][PROPERTY_ADF_TEMPLATE_MAP] || new Map();
                // If e is a <template> for looping
                if (e instanceof HTMLTemplateElement && e.hasAttribute(ATTR_LOOP)) {
                    e[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST] = [];
                    e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL] = {};
                    // template function
                    e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteMap = new Map();
                    e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].appendNewEntity = function(data) {
                        let holder = document.createElement("div");
                        holder.innerHTML = e.innerHTML;
                        self.analyze(holder);
                        self.render(holder, data);
                        let childTotal = [];
                        while (holder.firstChild) {
                            childTotal.push(holder.firstChild);
                            e.parentNode.appendChild(holder.firstChild);
                        }
                        for (let deleter of holder.querySelectorAll('[' + ATTR_LOOP_DELETE + ']')) {
                            e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteMap.set(deleter, childTotal);
                            deleter.addEventListener("click", function() {
                                e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteAllEntity(deleter, true);
                            });
                        }
                        e[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST].push(holder[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY]);
                    };
                    e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteAllEntity = function(deleter) {
                        let m = e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteMap.get(deleter);
                        for (let c of m) {
                            c.remove();
                        }
                    };
                    // template function
                }
                // Content
                if (e.children.length === 0) {
                    analyzeTemplate(e, "", e.textContent);
                }
                // Attribute
                let p = 0;
                let al = Array.from(e.attributes);
                while (p < al.length) {
                    analyzeTemplate(e, al[p].name, al[p].value);
                    analyzeEvent(e, al[p].name, al[p].value);
                    p++;
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
                        return value.includes(KEYWORD_EVENT_OPEN) && value.includes(KEYWORD_EVENT_CLOSE) && value.indexOf(KEYWORD_EVENT_OPEN) < value.indexOf(KEYWORD_EVENT_CLOSE) && value.indexOf(KEYWORD_EVENT_OPEN) === 0;
                    }
                }

                function analyzeTemplate(e, name, template) {
                    let processingTemplate = template;
                    let processed = false;
                    let fields = [];
                    while (dataDefinitionExist(processingTemplate)) {
                        processed = true;
                        let currentTemplate = extractFirstTemplate(processingTemplate);
                        let keywords = extractDef(currentTemplate);
                        let path = keywords.shift();
                        let predefined = "";
                        for (let k of keywords) {
                            // Predefined Keywords
                            switch (true) {
                                case k.includes(KEYWORD_PARAM):
                                    predefined = window.location.getParam(k.replace(KEYWORD_PARAM, '').replace(KEYWORD_PARAM_OPEN, '').replace(KEYWORD_PARAM_CLOSE, ''));
                                    break;
                                case k.includes(KEYWORD_VAL):
                                    predefined = k.replace(KEYWORD_VAL, '').replace(KEYWORD_PARAM_OPEN, '').replace(KEYWORD_PARAM_CLOSE, '') || 0;
                                    break;
                                case k.includes(KEYWORD_SEGMENT):
                                    predefined = window.location.getPathLastSegment();
                                    break;
                            }
                        }
                        if (keywords.includes(KEYWORD_IDENTIFIER)) {
                            root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_IDENTIFIER].add(e);
                        }
                        if (keywords.includes(KEYWORD_GET)) {
                            root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_GET].add(e);
                        }
                        if (keywords.includes(KEYWORD_PUT)) {
                            root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_PUT].add(e);
                        }
                        fields.push({
                            path: path,
                            template: predefined || currentTemplate,
                            keywords: keywords
                        });
                        if (predefined) {
                            processingTemplate = processingTemplate.replace(currentTemplate, predefined);
                            template = template.replace(currentTemplate, predefined);
                        } else {
                            processingTemplate = processingTemplate.replace(currentTemplate, '');
                        }
                    }
                    if (processed) {
                        if (name) {
                            e.setAttribute(name, processingTemplate);
                        } else {
                            e.textContent = processingTemplate;
                        }
                        e[PROPERTY_ADF][PROPERTY_ADF_TEMPLATE_MAP].set(name, { template: template, fields: fields });
                    }
                }
            }

            function extractFirstTemplate(template) {
                return template.substring(template.indexOf(KEYWORD_DATA_OPEN), template.indexOf(KEYWORD_DATA_CLOSE) + 2);
            }

            function extractDef(extractedTemplate) {
                return extractedTemplate.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER);
            }

            function dataDefinitionExist(template) {
                return template.includes(KEYWORD_DATA_OPEN) && template.includes(KEYWORD_DATA_CLOSE) && template.indexOf(KEYWORD_DATA_OPEN) < template.indexOf(KEYWORD_DATA_CLOSE);
            }
        }
        eventize() {
            let self = this;
            self.addEventListener(EVENT_GET, async function(e) {
                e.stopPropagation();
                if (!self.hasAttribute(ATTR_LOADING)) {
                    try {
                        self.setAttribute(ATTR_LOADING, "");
                        let query = self.gather(self, true);
                        if (self.hasAttribute(ATTR_URL)) {
                            done(await window.tingting.api.get(self.getAttribute(ATTR_URL), query));
                        } else if (self.hasAttribute(ATTR_JSON)) {
                            done(JSON.parse(self.getAttribute(ATTR_JSON)));
                        } else {
                            done(null);
                        }
                    } catch (e) {
                        self.removeAttribute(ATTR_LOADING);
                    }
                }

                function done(json) {
                    self.render(self, json, false);
                    self.removeAttribute(ATTR_LOADING);
                    self.dispatchEvent(new CustomEvent(EVENT_GET_DONE, { detail: json }));
                }
            });
            self.addEventListener(EVENT_PUT, async function(e) {
                e.stopPropagation();
                if (!self.hasAttribute(ATTR_LOADING)) {
                    try {
                        self.setAttribute(ATTR_LOADING, "");
                        let query = self.gather(self, false);
                        if (self.hasAttribute(ATTR_URL)) {
                            done(await window.tingting.api.put(self.getAttribute(ATTR_URL), query));
                        } else if (self.hasAttribute(ATTR_JSON)) {
                            self.setAttribute(ATTR_JSON, JSON.stringify(query));
                            done(query);
                        } else {
                            done(null);
                        }
                    } catch (e) {
                        self.removeAttribute(ATTR_LOADING);
                    }
                }

                function done(json) {
                    self.removeAttribute(ATTR_LOADING);
                    if (self.hasAttribute(ATTR_GET_AFTER_PUT)) {
                        self.dispatchEvent(new Event(EVENT_GET));
                    } else {
                        self.render(self, json, false);
                    }
                    self.dispatchEvent(new CustomEvent(EVENT_PUT_DONE, { detail: json }));
                }
            });
        }
        render(root, data) {
            let self = this;
            let inElements = root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_GET];
            for (let e of inElements) {
                let attributeMap = e[PROPERTY_ADF][PROPERTY_ADF_TEMPLATE_MAP];
                if (e.tagName === "TEMPLATE" && attributeMap.has(ATTR_LOOP)) {
                    renderArray(e, attributeMap.get(ATTR_LOOP));
                } else {
                    for (let a of attributeMap.keys()) {
                        renderProperty(e, a, attributeMap.get(a));
                    }
                }
            }

            function renderArray(element, templateInfo) {
                let keywords = templateInfo.fields[0].keywords;
                if (keywords.includes(KEYWORD_GET)) {
                    let path = templateInfo.fields[0].path;
                    let value = getDeepValue(data, path) || []; // which is an array
                    for (let es of element[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST]) {
                        for (let e of es[KEYWORD_GET]) {
                            e.remove();
                        }
                    }
                    element[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST] = [];
                    for (let v of value) {
                        element[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].appendNewEntity(v);
                    }
                }
            }

            function renderProperty(element, name, templateInfo) {
                let processingTemplate = templateInfo.template;
                let processed = false;
                for (let f of templateInfo.fields) {
                    let keywords = f.keywords;
                    if (keywords.includes(KEYWORD_GET)) {
                        processed = true;
                        let currentTemplate = f.template;
                        let path = f.path;
                        let value = getDeepValue(data, path);
                        if (value) {
                            switch (true) {
                                case keywords.includes(KEYWORD_JSON):
                                    try {
                                        value = JSON.stringify(value);
                                    } catch (e) {
                                        value = "";
                                    }
                                    break;
                                case keywords.includes(KEYWORD_STRING):
                                    value = value.toString();
                                    break;
                                case keywords.includes(KEYWORD_INTEGER):
                                    value = value || 0;
                                    break;
                                case keywords.includes(KEYWORD_FLOAT):
                                    value = value || 0;
                                    break;
                                case keywords.includes(KEYWORD_BOOLEAN):
                                    // value = value
                                    break;
                                case keywords.includes(KEYWORD_DATE):
                                    value = (new Date(value)).toLocaleDateString();
                                    break;
                                case keywords.includes(KEYWORD_TIME):
                                    value = (new Date(value)).toLocaleTimeString();
                                    break;
                            }
                            processingTemplate = processingTemplate.replace(currentTemplate, value);
                        } else {
                            processingTemplate = processingTemplate.replace(currentTemplate, '');
                        }
                    }
                }
                if (processed) {
                    switch (name) {
                        case "":
                            element.textContent = processingTemplate;
                            break;
                        case "value":
                            element.value = processingTemplate;
                            break;
                        case "checked":
                            if (processingTemplate) {
                                element.setAttribute("checked", "");
                            } else {
                                element.removeAttribute("checked");
                            }
                            break;
                        default:
                            if (!processingTemplate && processingTemplate !== 0) {
                                element.removeAttribute(name);
                            } else {
                                element.setAttribute(name, processingTemplate);
                            }
                            break;
                    }
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
            let outElements = onlyIdentifier ? root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_IDENTIFIER] : root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_PUT];
            for (let e of outElements) {
                let attributeMap = e[PROPERTY_ADF][PROPERTY_ADF_TEMPLATE_MAP];
                if (e.tagName === "TEMPLATE" && attributeMap.has(ATTR_LOOP)) {
                    gatherArray(e, attributeMap.get(ATTR_LOOP));
                } else {
                    for (let a of attributeMap.keys()) {
                        gatherProperty(e, a, attributeMap.get(a));
                    }
                }
            }

            function gatherArray(element, templateInfo) {
                let keywords = templateInfo.fields[0].keywords;
                if (keywords.includes(onlyIdentifier ? KEYWORD_IDENTIFIER : KEYWORD_PUT)) {
                    let path = templateInfo.fields[0].path;
                    let value = [];
                    let elementList = element[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST];
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
                            holder[PROPERTY_ADF] = {};
                            holder[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY] = elementSummary;
                            value.push(self.gather(holder, onlyIdentifier));
                        }
                    }
                    setDeepValue(data, path, value);
                }
            }

            function gatherProperty(element, name, templateInfo) {
                let keywords = templateInfo.fields[0].keywords;
                if (keywords.includes(onlyIdentifier ? KEYWORD_IDENTIFIER : KEYWORD_PUT)) {
                    let path = templateInfo.fields[0].path;
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
                        case keywords.includes(KEYWORD_JSON):
                            try {
                                value = JSON.parse(value);
                            } catch (e) {
                                value = null;
                            }
                            break;
                        case keywords.includes(KEYWORD_STRING):
                            value = value.toString();
                            break;
                        case keywords.includes(KEYWORD_INTEGER):
                            value = parseInt(value, 10) || 0;
                            break;
                        case keywords.includes(KEYWORD_FLOAT):
                            value = parseFloat(value) || 0;
                            break;
                        case keywords.includes(KEYWORD_BOOLEAN):
                            value = (value === 'true');
                            break;
                        case keywords.includes(KEYWORD_DATE):
                        case keywords.includes(KEYWORD_TIME):
                            value = new Date(value);
                            break;
                    }
                    setDeepValue(data, path, value);
                }
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
            if (this.hasAttribute(ATTR_AUTO_GET)) {
                this.dispatchEvent(new Event(EVENT_GET));
            }
        }
    });
}