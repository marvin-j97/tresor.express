import chai, { expect } from "chai";
import "mocha";
import chaiHttp from "chai-http";
import app, { limiter100, twentyfourhours } from "./app";

chai.use(chaiHttp);

describe("server", () => {
  before(function() {
    app.listen(7777);
  });
});

describe("In-Memory Cache", () => {
  it("Basic HTML cache", async function() {
    this.timeout(5000);

    let before = +new Date();
    let res = await chai.request(app).get("/memory/slow-html");
    let after = +new Date();

    expect(res.text).to.equal("Hello world!");
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms

    // Trigger cached response 50 times
    for (let i = 0; i < 50; i++) {
      before = +new Date();
      res = await chai.request(app).get("/memory/slow-html");
      after = +new Date();

      expect(res.text).to.equal("Hello world!");
      expect(after - before).to.be.lessThan(20); // Cached response, should be less than 10ms
    }

    // Wait for cache expiration
    await new Promise(r => setTimeout(() => r(), 600));

    before = +new Date();
    res = await chai.request(app).get("/memory/slow-html");
    after = +new Date();

    expect(res.text).to.equal("Hello world!");
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms
  });

  it("Basic JSON cache", async function() {
    this.timeout(5000);

    let before = +new Date();
    let res = await chai.request(app).get("/memory/slow-json");
    let after = +new Date();

    expect(res.body).to.deep.equal({ hello: "world" });
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms

    // Trigger cached response 50 times
    for (let i = 0; i < 50; i++) {
      before = +new Date();
      res = await chai.request(app).get("/memory/slow-json");
      after = +new Date();

      expect(res.body).to.deep.equal({ hello: "world" });
      expect(after - before).to.be.lessThan(20); // Cached response, should be less than 10ms
    }

    // Wait for cache expiration
    await new Promise(r => setTimeout(() => r(), 600));

    before = +new Date();
    res = await chai.request(app).get("/memory/slow-json");
    after = +new Date();

    expect(res.body).to.deep.equal({ hello: "world" });
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms
  });
});

describe("File Cache", () => {
  it("Basic HTML cache", async function() {
    this.timeout(5000);

    let before = +new Date();
    let res = await chai.request(app).get("/file/slow-html");
    let after = +new Date();

    expect(res.text).to.equal("Hello world!");
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms

    // Trigger cached response 50 times
    for (let i = 0; i < 50; i++) {
      before = +new Date();
      res = await chai.request(app).get("/file/slow-html");
      after = +new Date();

      expect(res.text).to.equal("Hello world!");
      expect(after - before).to.be.lessThan(20); // Cached response, should be less than 10ms
    }

    // Wait for cache expiration
    await new Promise(r => setTimeout(() => r(), 600));

    before = +new Date();
    res = await chai.request(app).get("/file/slow-html");
    after = +new Date();

    expect(res.text).to.equal("Hello world!");
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms
  });

  it("Basic JSON cache", async function() {
    this.timeout(5000);

    let before = +new Date();
    let res = await chai.request(app).get("/file/slow-json");
    let after = +new Date();

    expect(res.body).to.deep.equal({ hello: "world" });
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms

    // Trigger cached response 50 times
    for (let i = 0; i < 50; i++) {
      before = +new Date();
      res = await chai.request(app).get("/file/slow-json");
      after = +new Date();

      expect(res.body).to.deep.equal({ hello: "world" });
      expect(after - before).to.be.lessThan(20); // Cached response, should be less than 10ms
    }

    // Wait for cache expiration
    await new Promise(r => setTimeout(() => r(), 600));

    before = +new Date();
    res = await chai.request(app).get("/file/slow-json");
    after = +new Date();

    expect(res.body).to.deep.equal({ hello: "world" });
    expect(after - before).to.be.greaterThan(400); // Rendered page: should take 500 ms
  });
});

describe("Limit test", () => {
  it("Should never go above 100 items", async function() {
    this.timeout(5000);

    for (let i = 0; i < 1000; i++) {
      await chai.request(app).get(`/limit100?q=${i}`);

      expect(
        limiter100
          .instance()
          .adapter()
          .size()
      ).to.be.lessThan(101);
    }

    // Wait for every item to expire
    await new Promise(r => setTimeout(() => r(), 2000));

    expect(
      limiter100
        .instance()
        .adapter()
        .size()
    ).to.equal(0);
  });
});

describe("Clear Tresor", () => {
  it("Items should be empty after clearing", async function() {
    this.timeout(5000);

    for (let i = 0; i < 1000; i++) {
      await chai.request(app).get(`/24hours?q=${i}`);
    }
    expect(
      twentyfourhours
        .instance()
        .adapter()
        .size()
    ).to.be.equal(100);
    await twentyfourhours.instance().clear();
    expect(
      twentyfourhours
        .instance()
        .adapter()
        .size()
    ).to.equal(0);
  });
});

describe("Invalidate route", () => {
  it("Items should be empty after invalidating", async function() {
    this.timeout(5000);

    await chai.request(app).get(`/24hours?q=0`);

    expect(
      twentyfourhours
        .instance()
        .adapter()
        .size()
    ).to.be.equal(1);
    await twentyfourhours.instance().invalidate("/24hours?q=0", null);
    expect(
      twentyfourhours
        .instance()
        .adapter()
        .size()
    ).to.equal(0);
  });
});
