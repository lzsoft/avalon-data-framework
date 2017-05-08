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
                    while (self.dataDefinitionExist(processingTemplate)) {
                        let currentTemplate = self.extractFirstTemplate(processingTemplate);
                        let keywords = self.extractDef(currentTemplate);
                        let param = "";
                        let val = "";
                        let segment = "";
                        for (let k of keywords) {
                            switch (true) {
                                case k === KEYWORD_IDENTIFIER:
                                    root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_IDENTIFIER].add(e);
                                    break;
                                case k === KEYWORD_GET:
                                    root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_GET].add(e);
                                    break;
                                case k === KEYWORD_PUT:
                                    root[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY][KEYWORD_PUT].add(e);
                                    break;
                                case k.includes(KEYWORD_PARAM):
                                    param = window.location.getParam(k.replace(KEYWORD_PARAM, '').replace(KEYWORD_PARAM_OPEN, '').replace(KEYWORD_PARAM_CLOSE, ''));
                                    break;
                                case k.includes(KEYWORD_VAL):
                                    val = k.replace(KEYWORD_VAL, '').replace(KEYWORD_PARAM_OPEN, '').replace(KEYWORD_PARAM_CLOSE, '');
                                    break;
                                case k.includes(KEYWORD_SEGMENT):
                                    segment = window.location.getPathLastSegment();
                                    break;
                            }
                        }
                        if (name) {
                            // Attribute
                            e.removeAttribute(name);
                            if (param) {
                                e.setAttribute(name, processingTemplate.replace(currentTemplate, param));
                            }
                            if (val || val === 0) {
                                e.setAttribute(name, processingTemplate.replace(currentTemplate, val));
                            }
                            if (segment) {
                                e.setAttribute(name, processingTemplate.replace(currentTemplate, segment));
                            }
                        } else {
                            // Content
                            e.textContent = "";
                            if (param) {
                                e.textContent = processingTemplate.replace(currentTemplate, param);
                            }
                            if (val || val === 0) {
                                e.textContent = processingTemplate.replace(currentTemplate, val);
                            }
                            if (segment) {
                                e.textContent = processingTemplate.replace(currentTemplate, segment);
                            }
                        }
                        processingTemplate = processingTemplate.replace(currentTemplate, '');
                    }
                    // If e is a <template> for looping
                    if (e instanceof HTMLTemplateElement && e.hasAttribute(ATTR_LOOP)) {
                        e[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST] = [];
                        e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL] = {};
                        // template function
                        e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteMap = new Map();
                        e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].appendNewEntity = function(data, outAfter) {
                            let holder = document.createElement("div");
                            holder.innerHTML = e.innerHTML;
                            self.analyze(holder);
                            self.render(holder, data);
                            let childTotal = [];
                            for (let deleter of holder.querySelectorAll('[' + ATTR_LOOP_DELETE + ']')) {
                                e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteMap.set(deleter, childTotal);
                                deleter.addEventListener("click", function() {
                                    e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteAllEntity(deleter, true);
                                });
                            }
                            while (holder.firstChild) {
                                childTotal.push(holder.firstChild);
                                e.parentNode.appendChild(holder.firstChild);
                            }
                            e[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST].push(holder[PROPERTY_ADF][PROPERTY_ADF_ELEMENT_SUMMARY]);
                            if (outAfter) {
                                self.dispatchEvent(new Event(EVENT_PUT));
                            }
                        };
                        e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteAllEntity = function(deleter, outAfter) {
                            let m = e[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].deleteMap.get(deleter);
                            for (let c of m) {
                                c.remove();
                            }
                            if (outAfter) {
                                self.dispatchEvent(new Event(EVENT_PUT));
                            }
                        };
                        // template function
                    }
                    //
                    if (processingTemplate !== template) {
                        e[PROPERTY_ADF][PROPERTY_ADF_TEMPLATE_MAP].set(name, template);
                        return true;
                    } else {
                        return false;
                    }
                }
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
                    self.render(self, json, false);
                    self.removeAttribute(ATTR_LOADING);
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
                        if (attributeMap.get(a).includes(KEYWORD_SPLITTER + KEYWORD_GET)) {
                            renderProperty(e, a, attributeMap.get(a));
                        }
                    }
                }
            }

            function renderArray(templateElement, templateTemplate) {
                let keywords = self.extractDef(self.extractFirstTemplate(templateTemplate));
                let path = keywords.shift();
                let value = getDeepValue(data, path) || []; // which is an array
                for (let es of templateElement[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST]) {
                    for (let e of es[KEYWORD_GET]) {
                        e.remove();
                    }
                }
                templateElement[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST] = [];
                for (let v of value) {
                    templateElement[PROPERTY_ADF][PROPERTY_ADF_LOOP_UTIL].appendNewEntity(v, false);
                }
            }

            function renderProperty(element, name, template) {
                let processingTemplate = template;
                while (self.dataDefinitionExist(processingTemplate)) {
                    let currentTemplate = self.extractFirstTemplate(processingTemplate);
                    let keywords = self.extractDef(currentTemplate);
                    let path = keywords.shift();
                    let value = getDeepValue(data, path);
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
                            value = value.toString();
                            break;
                        case keywords.includes(KEYWORD_DATE):
                            value = (new Date(value)).toLocaleDateString();
                            break;
                        case keywords.includes(KEYWORD_TIME):
                            value = (new Date(value)).toLocaleTimeString();
                            break;
                    }
                    processingTemplate = processingTemplate.replace(currentTemplate, value || '');
                }
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
                        if (attributeMap.get(a).includes(onlyIdentifier ? KEYWORD_SPLITTER + KEYWORD_IDENTIFIER : KEYWORD_SPLITTER + KEYWORD_PUT)) {
                            gatherProperty(e, a, attributeMap.get(a));
                        }
                    }
                }
            }

            function gatherArray(templateElement, templateTemplate) {
                let path = self.extractDef(self.extractFirstTemplate(templateTemplate)).shift();
                let value = [];
                let elementList = templateElement[PROPERTY_ADF][PROPERTY_ADF_ENTITY_LIST];
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

            function gatherProperty(element, name, template) {
                let keywords = self.extractDef(self.extractFirstTemplate(template));
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
            this.validate();
            this.analyze(this);
            this.eventize();
        }
        connectedCallback() {
            if (this.hasAttribute(ATTR_AUTO_GET)) {
                this.dispatchEvent(new Event(EVENT_GET));
            }
        }
        extractFirstTemplate(template) {
            return template.substring(template.indexOf(KEYWORD_DATA_OPEN), template.indexOf(KEYWORD_DATA_CLOSE) + 2);
        }
        extractDef(extractedTemplate) {
            return extractedTemplate.replace(KEYWORD_DATA_OPEN, "").replace(KEYWORD_DATA_CLOSE, "").split(KEYWORD_SPLITTER);
        }
        dataDefinitionExist(template) {
            return template.includes(KEYWORD_DATA_OPEN) && template.includes(KEYWORD_DATA_CLOSE) && template.indexOf(KEYWORD_DATA_OPEN) < template.indexOf(KEYWORD_DATA_CLOSE);
        }
    });
}
