import { Tresor, ITresorOptions } from "@dotvirus/tresor";
import express from "express";
export interface ITresorInject {
    isCached: boolean;
    value: string;
    instance: Tresor;
}
export interface ITresorExpressOptions {
    auth: AuthFunction;
    manualResponse: boolean;
    responseType: "json" | "html";
    shouldCache: (req: express.Request, res: express.Response) => boolean;
    shouldCheckCache: (req: express.Request, res: express.Response) => boolean;
    tresor: Partial<ITresorOptions>;
}
export declare type AuthFunction = (req: express.Request, res: express.Response) => string | null;
declare global {
    namespace Express {
        interface Request {
            $tresor?: ITresorInject;
        }
        interface Response {
            $tresor: {
                cache: (value: object | string) => Promise<string>;
                send: (value: object | string) => Promise<string>;
            };
        }
    }
}
export default class TresorExpress {
    private tresorInstance;
    private options;
    constructor(options?: Partial<ITresorExpressOptions>);
    static html(options?: Partial<Omit<ITresorExpressOptions, "responseType">>): TresorExpress;
    static json(options?: Partial<Omit<ITresorExpressOptions, "responseType">>): TresorExpress;
    $tresor(): Tresor;
    instance(): Tresor;
    private sendCached;
    init(): (req: express.Request<import("express-serve-static-core").ParamsDictionary>, res: express.Response, next: express.NextFunction) => Promise<void>;
    middleware(): (req: express.Request<import("express-serve-static-core").ParamsDictionary>, res: express.Response, next: express.NextFunction) => Promise<void>;
}
export * from "@dotvirus/tresor";
