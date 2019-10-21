"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tresor_1 = require("@dotvirus/tresor");
class TresorExpress {
    constructor(options, tresorOptions) {
        this.tresorInstance = new tresor_1.Tresor(tresorOptions);
        this.options = {
            auth: () => null,
            manualResponse: false,
            responseType: "json",
            shouldCache: () => true
        };
        if (options)
            Object.assign(this.options, options);
    }
    instance() {
        return this.tresorInstance;
    }
    sendCached(res, value) {
        if (this.options.responseType === "json")
            res.json(JSON.parse(value));
        else if (this.options.responseType === "html")
            res.send(value);
    }
    init() {
        return this.middleware();
    }
    middleware() {
        return (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const beforeCache = +new Date();
            const auth = this.options.auth(req, res);
            const cached = yield this.tresorInstance.adapter().checkCache({
                path: req.originalUrl,
                auth,
                options: this.tresorInstance.options
            });
            if (cached != null) {
                if (this.tresorInstance.options.onCacheHit) {
                    this.tresorInstance.options.onCacheHit(req.originalUrl, new Date().valueOf() - beforeCache);
                }
                if (this.options.manualResponse === false) {
                    return this.sendCached(res, cached);
                }
                req.$tresor = {
                    isCached: true,
                    value: cached,
                    instance: this.tresorInstance
                };
            }
            else {
                if (this.tresorInstance.options.onCacheMiss)
                    this.tresorInstance.options.onCacheMiss(req.originalUrl, new Date().valueOf() - beforeCache);
            }
            res.$tresor = {
                send: (value) => __awaiter(this, void 0, void 0, function* () {
                    const _value = yield res.$tresor.cache(value);
                    this.sendCached(res, _value);
                    return _value;
                }),
                cache: (value) => __awaiter(this, void 0, void 0, function* () {
                    let _value = value;
                    if (typeof value == "object")
                        _value = JSON.stringify(value);
                    if (this.options.shouldCache(req, res))
                        yield this.instance()
                            .adapter()
                            .addToCache({
                            path: req.originalUrl,
                            auth,
                            options: this.tresorInstance.options
                        }, _value);
                    return _value;
                })
            };
            next();
        });
    }
    static html(options, tresorOptions) {
        let _options = Object.assign(Object.assign({}, options), { responseType: "html" });
        return new TresorExpress(_options, tresorOptions);
    }
    static json(options, tresorOptions) {
        let _options = Object.assign(Object.assign({}, options), { responseType: "json" });
        return new TresorExpress(_options, tresorOptions);
    }
}
exports.default = TresorExpress;
