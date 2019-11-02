import { Tresor, ITresorOptions } from "@dotvirus/tresor";
import express from "express";

// Injected cached content in request
// (only relevant when using manualResponse)
export interface ITresorInject {
  isCached: boolean;
  value: string;
  instance: Tresor;
}

export interface ITresorExpressOptions {
  // Authentication cache items will be signed with (default = () => null), null = no authentication
  auth: AuthFunction;
  // If true, cached content is not automatically sent to client, but rather exposed in request (default = false)
  manualResponse: boolean;
  // Response type (default = "json")
  responseType: "json" | "html";
  // Whether content should be cached at all (default = () => true)
  shouldCache: (req: express.Request, res: express.Response) => boolean;
  // Whether to check cache at all
  shouldCheckCache: (req: express.Request, res: express.Response) => boolean;
  // Tresor options
  tresor: Partial<ITresorOptions>;
}

// Returns a string (like a session token or user ID) that identifies some sort of authenticated entity
// Cached items are signed with that string
// Returns null for unauthenticated caches
export type AuthFunction = (
  req: express.Request,
  res: express.Response
) => string | null;

declare global {
  namespace Express {
    export interface Request {
      $tresor?: ITresorInject;
    }
    export interface Response {
      $tresor: {
        cache: (value: object | string) => Promise<string>;
        send: (value: object | string) => Promise<string>;
      };
    }
  }
}

export default class TresorExpress {
  private tresorInstance: Tresor;
  private options: ITresorExpressOptions;

  constructor(options?: Partial<ITresorExpressOptions>) {
    this.options = {
      auth: () => null,
      manualResponse: false,
      responseType: "json",
      shouldCache: () => true,
      shouldCheckCache: () => true,
      tresor: new Tresor().getOpts()
    };

    if (options) Object.assign(this.options, options);
    this.tresorInstance = new Tresor(this.options.tresor);
  }

  static html(options?: Partial<Omit<ITresorExpressOptions, "responseType">>) {
    let _options = {
      ...options,
      responseType: "html" as "html"
    };

    return new TresorExpress(_options);
  }

  static json(options?: Partial<Omit<ITresorExpressOptions, "responseType">>) {
    let _options = {
      ...options,
      responseType: "json" as "json"
    };

    return new TresorExpress(_options);
  }

  public $tresor() {
    return this.tresorInstance;
  }

  public instance() {
    return this.tresorInstance;
  }

  private sendCached(res: express.Response, value: string) {
    if (this.options.responseType === "json") res.json(JSON.parse(value));
    else if (this.options.responseType === "html") res.send(value);
  }

  public init() {
    return this.middleware();
  }

  public middleware() {
    return async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const beforeCache = +new Date();

      let auth = null as string | null;
      let cached = null as string | null;
      if (this.options.shouldCheckCache) {
        auth = this.options.auth(req, res);
        cached = await this.tresorInstance.checkCache(req.originalUrl, auth);
      }

      if (cached != null) {
        const onHit = this.tresorInstance.getOpts().onCacheHit;
        if (onHit) {
          onHit(req.originalUrl, new Date().valueOf() - beforeCache);
        }

        if (this.options.manualResponse === false) {
          return this.sendCached(res, cached);
        }

        req.$tresor = {
          isCached: true,
          value: cached,
          instance: this.tresorInstance
        };
      } else {
        const onMiss = this.tresorInstance.getOpts().onCacheMiss;
        if (this.options.shouldCheckCache && onMiss) {
          onMiss(req.originalUrl, new Date().valueOf() - beforeCache);
        }

        req.$tresor = {
          isCached: false,
          value: "",
          instance: this.tresorInstance
        };
      }

      res.$tresor = {
        send: async (value: object | string) => {
          const _value = await res.$tresor.cache(value);
          this.sendCached(res, _value);
          return _value;
        },
        cache: async (value: object | string) => {
          let _value = value as string;

          if (typeof value == "object") _value = JSON.stringify(value);

          if (this.options.shouldCache(req, res))
            await this.instance().addToCache(req.originalUrl, auth, _value);
          return _value;
        }
      };

      next();
    };
  }
}

export * from "@dotvirus/tresor";
